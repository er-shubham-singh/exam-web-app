import * as faceapi from "face-api.js";
import React, { useEffect, } from "react";
import {
  submitExam,
} from "../../src/Redux/ExamLog/action";
import { initExamLogSocket, cleanupExamLogSocket } from "../../src/Redux/ExamLog/examLog.socket";
import socket from "../../src/config/socket.connect";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import {  toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Small helpers preserved from original
const overlap = (a, b) => {
  if (!a || !b) return 0;
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - inter || 1;
  return inter / union; // IoU
};

const boxFromLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length === 0) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
};

const MAX_SAME_ALERTS = 5;

export function CameraAndDetection({ studentExamId, user, dispatch, navigate, setAlertLog, alertCountsRef, lockedRef }) {
  // The large useEffect in original file is implemented here verbatim
  useEffect(() => {
    if (!studentExamId || !user?.email) return;
    if (lockedRef.current) return; // do not start if locked

    const peer = new RTCPeerConnection({ iceServers:[{ urls:"stun:stun.l.google.com:19302"}] })
    const peerRef = { current: peer };

    const videoEl = document.getElementById("camera-feed");
    let mpCamera; // MediaPipe Camera
    const initOnceRef = { started: false };
    let faceMesh, hands;
    let lastFaceSeenAt = Date.now();

    let micAnalyser = null;
    let micSource = null;
    let micCtx = null;

    const ALERT_COOLDOWN_MS = 8000; // 8 seconds cooldown per-type
    const alertCooldowns = {};
    const lastState = {
      handObstruction: false,
      multipleFaces: false,
      noFace: false,
    };

    const createAndSendOffer = async (p) => {
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      socket.emit("webrtc_offer", {
        offer,
        email: user.email,
        studentExamId,
        name: user.name,
        rollNumber: user.rollNumber,
      });
    };

    const autoSubmitAndLock = async (reason) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      localStorage.setItem("exam_locked", "true");

      toast.error("Too many violations detected. Your exam will be auto-submitted and you will be logged out.");

      try {
        await dispatch(submitExam({ studentExamId }));
      } catch (err) {
        console.error("Auto submit failed:", err);
      }

      socket.emit("auto_submit", { studentExamId, email: user.email, reason, timestamp: new Date().toISOString() });

      try { peer.close(); } catch {}
      try { mpCamera?.stop?.(); } catch {}
      navigate("/");
    };

    const recordAlert = (type, issue) => {
      const now = Date.now();
      const last = alertCooldowns[type] || 0;

      if (now - last < ALERT_COOLDOWN_MS) {
        return false;
      }
      alertCooldowns[type] = now;

      const iso = new Date(now).toISOString();
      alertCountsRef.current[type] = (alertCountsRef.current[type] || 0) + 1;
      localStorage.setItem("exam_alert_counts", JSON.stringify(alertCountsRef.current));

      const entry = { type, issue, timestamp: iso };
      setAlertLog((s) => [entry, ...s].slice(0, 10));
      toast.warn(`${type}: ${issue}`);

      socket.emit(type, { studentExamId, email: user.email, issue, timestamp: iso });

      if (alertCountsRef.current[type] >= MAX_SAME_ALERTS) {
        autoSubmitAndLock(type);
      }
      return true;
    };

    async function initCameraAndDetection() {
      if (initOnceRef.started) return;
      initOnceRef.started = true;

      try {
        faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 2,
          refineLandmarks: true,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        let lastFaces = [];
        let lastHands = [];

        faceMesh.onResults((res) => {
          lastFaces = res.multiFaceLandmarks || [];
        });

        hands.onResults((res) => {
          lastHands = res.multiHandLandmarks || [];
        });

        mpCamera = new Camera(videoEl, {
          onFrame: async () => {
            await faceMesh.send({ image: videoEl });
            await hands.send({ image: videoEl });

            const now = Date.now();

            if (lastFaces.length > 0) {
              lastFaceSeenAt = now;
            }

            if (now - lastFaceSeenAt >= 5000) {
              if (!lastState.noFace) {
                if (recordAlert("eye_off", "No face detected for 5s")) {
                  lastState.noFace = true;
                }
              }
            } else {
              lastState.noFace = false;
            }

            if (lastFaces.length > 1) {
              if (!lastState.multipleFaces) {
                if (recordAlert("multiple_faces", `${lastFaces.length} faces detected`)) {
                  lastState.multipleFaces = true;
                }
              }
            } else {
              lastState.multipleFaces = false;
            }

            if (lastFaces.length > 0 && lastHands.length > 0) {
              const faceBox = boxFromLandmarks(lastFaces[0]);
              const hasObstruction = lastHands.some((hl) => {
                const handBox = boxFromLandmarks(hl);
                return overlap(faceBox, handBox) > 0.12;
              });

              if (hasObstruction) {
                if (!lastState.handObstruction) {
                  if (recordAlert("hand_obstruction", "Hand obstructing the face")) {
                    lastState.handObstruction = true;
                  }
                }
              } else {
                lastState.handObstruction = false;
              }
            } else {
              lastState.handObstruction = false;
            }

            if (micAnalyser) {
              const arr = new Uint8Array(micAnalyser.fftSize);
              micAnalyser.getByteTimeDomainData(arr);
              let sum = 0;
              for (let i = 0; i < arr.length; i++) {
                const v = (arr[i] - 128) / 128;
                sum += v * v;
              }
              const level = Math.sqrt(sum / arr.length);

              if (level > 0.12) {
                recordAlert("loud_voice", "Abnormal voice/background music detected");

                if (now - lastFaceSeenAt > 2000) {
                  recordAlert("voice_no_face", "Speech detected but face not visible");
                }
              }
            }
          },
          width: 640,
          height: 480,
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: {
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        await videoEl.play().catch(() => {});

        try {
          micCtx = new (window.AudioContext || window.webkitAudioContext)();
          micSource = micCtx.createMediaStreamSource(stream);
          micAnalyser = micCtx.createAnalyser();
          micAnalyser.fftSize = 512;
          micSource.connect(micAnalyser);
        } catch (e) {
          console.warn("Mic analyser setup failed:", e);
          micAnalyser = null;
        }

        await mpCamera.start();

        stream.getTracks().forEach((track) => {
          const exists = peer.getSenders().some((s) => s.track && s.track.id === track.id);
          if (!exists) peer.addTrack(track, stream);
        });

        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc_candidate", {
              candidate: e.candidate,
              email: user.email,
              studentExamId,
              name: user.name,
              rollNumber: user.rollNumber,
            });
          }
        };

        await createAndSendOffer(peer);

      } catch (err) {
        console.error("❌ Camera/mic access failed:", err);
        socket.emit("camera_off", { studentExamId, email: user?.email });
      }
    }

    socket.on("webrtc_answer", async ({ answer }) => {
      try { await peer.setRemoteDescription(answer); } catch (e) { console.warn(e); }
    });

    socket.on("webrtc_candidate", ({ candidate, studentExamId: sid }) => {
      if (sid === studentExamId && candidate) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      }
    });

    socket.on("request_offer", ({ studentExamId: sid }) => {
      if (sid === studentExamId && peerRef.current) {
        createAndSendOffer(peerRef.current);
      }
    });

    initCameraAndDetection();

    return () => {
      socket.off("webrtc_answer");
      socket.off("webrtc_candidate");
      socket.off("request_offer");

      try { mpCamera?.stop?.(); } catch {}
      try {
        const stream = document.getElementById("camera-feed")?.srcObject;
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch {}
      try { peer.close(); } catch {}

      try { micSource?.disconnect?.(); } catch {}
      try { micCtx?.close?.(); } catch {}
    };
  }, [studentExamId, user, dispatch, navigate, setAlertLog, alertCountsRef, lockedRef]);

  return null; // This component manages side-effects only; UI remains in parent
}
