// CameraAndDetection.jsx
import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Hands } from "@mediapipe/hands";
import socket from "../../src/config/socket.connect";
import { toast } from "react-toastify";
import { submitExam } from "../../src/Redux/ExamLog/action";

/**
 Props:
  - studentExamId, user, dispatch, navigate
  - setAlertLog (fn), alertCountsRef (ref), lockedRef (ref)
*/
export  function CameraAndDetection({
  studentExamId,
  user,
  dispatch,
  navigate,
  setAlertLog = () => {},
  alertCountsRef = { current: {} },
  lockedRef = { current: false },
  headless = false,
}) {
  const videoRef = useRef(null);
  const mpCameraRef = useRef(null);
  const peerRef = useRef(null);
  const micCtxRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micSourceRef = useRef(null);
  const faceMeshRef = useRef(null);
  const handsRef = useRef(null);

  const [isMuted, setIsMuted] = useState(true);
  const [status, setStatus] = useState("init"); // init / running / error / stopped

  const MAX_SAME_ALERTS = 5;

  // helpers (same behavior as your original)
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
    return inter / union;
  };
  const boxFromLandmarks = (landmarks) => {
    if (!landmarks || landmarks.length === 0) return null;
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
    for (const p of landmarks) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
  };

  useEffect(() => {
    if (!studentExamId || !user?.email) return;
    if (lockedRef.current) {
      setStatus("stopped");
      return;
    }

    let lastFaceSeenAt = Date.now();
    const ALERT_COOLDOWN_MS = 8000;
    const alertCooldowns = {};
    const lastState = { handObstruction: false, multipleFaces: false, noFace: false };

    const recordAlert = (type, issue) => {
      const now = Date.now();
      const last = alertCooldowns[type] || 0;
      if (now - last < ALERT_COOLDOWN_MS) return false;
      alertCooldowns[type] = now;
      const iso = new Date(now).toISOString();
      alertCountsRef.current[type] = (alertCountsRef.current[type] || 0) + 1;
      localStorage.setItem("exam_alert_counts", JSON.stringify(alertCountsRef.current));
      setAlertLog((s) => [ { type, issue, timestamp: iso }, ...s ].slice(0,10));
      toast.warn(`${type}: ${issue}`);
      socket.emit(type, { studentExamId, email: user.email, issue, timestamp: iso });
      if (alertCountsRef.current[type] >= MAX_SAME_ALERTS) {
        autoSubmitAndLock(type);
      }
      return true;
    };

    const autoSubmitAndLock = async (reason) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      localStorage.setItem("exam_locked", "true");
      toast.error("Too many violations — auto-submitting the exam.");
      try { await dispatch(submitExam({ studentExamId })); } catch (e) { console.warn("auto submit failed", e); }
      socket.emit("auto_submit", { studentExamId, email: user.email, reason, timestamp: new Date().toISOString() });
      cleanupAll();
      navigate("/");
    };

    const createPeerConnection = () => {
      try {
        const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        peerRef.current = peer;
        peer.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("webrtc_candidate", { candidate: e.candidate, email: user.email, studentExamId, name: user.name, rollNumber: user.rollNumber });
          }
        };
      } catch (err) {
        console.warn("peer create failed", err);
      }
    };

    const createAndSendOffer = async () => {
      if (!peerRef.current) createPeerConnection();
      const p = peerRef.current;
      const offer = await p.createOffer();
      await p.setLocalDescription(offer);
      socket.emit("webrtc_offer", { offer, email: user.email, studentExamId, name: user.name, rollNumber: user.rollNumber });
    };

    const initDetection = async (videoEl) => {
      try {
        faceMeshRef.current = new FaceMesh({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
        faceMeshRef.current.setOptions({ maxNumFaces: 2, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

        handsRef.current = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsRef.current.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });

        let lastFaces = [];
        let lastHands = [];
        faceMeshRef.current.onResults((res) => { lastFaces = res.multiFaceLandmarks || []; });
        handsRef.current.onResults((res) => { lastHands = res.multiHandLandmarks || []; });

        mpCameraRef.current = new Camera(videoEl, {
          onFrame: async () => {
            await faceMeshRef.current.send({ image: videoEl });
            await handsRef.current.send({ image: videoEl });

            const now = Date.now();
            if (lastFaces.length > 0) lastFaceSeenAt = now;

            if (now - lastFaceSeenAt >= 5000) {
              if (!lastState.noFace) recordAlert("eye_off", "No face detected for 5s"), (lastState.noFace = true);
            } else {
              lastState.noFace = false;
            }

            if (lastFaces.length > 1) {
              if (!lastState.multipleFaces) recordAlert("multiple_faces", `${lastFaces.length} faces detected`), (lastState.multipleFaces = true);
            } else lastState.multipleFaces = false;

            if (lastFaces.length > 0 && lastHands.length > 0) {
              const faceBox = boxFromLandmarks(lastFaces[0]);
              const hasObstruction = lastHands.some((hl) => overlap(faceBox, boxFromLandmarks(hl)) > 0.12);
              if (hasObstruction) {
                if (!lastState.handObstruction) recordAlert("hand_obstruction", "Hand obstructing the face"), (lastState.handObstruction = true);
              } else lastState.handObstruction = false;
            } else lastState.handObstruction = false;

            if (micAnalyserRef.current) {
              const arr = new Uint8Array(micAnalyserRef.current.fftSize);
              micAnalyserRef.current.getByteTimeDomainData(arr);
              let sum = 0;
              for (let i = 0; i < arr.length; i++) {
                const v = (arr[i] - 128) / 128;
                sum += v * v;
              }
              const level = Math.sqrt(sum / arr.length);
              if (level > 0.12) {
                recordAlert("loud_voice", "Abnormal voice/background music detected");
                if (now - lastFaceSeenAt > 2000) recordAlert("voice_no_face", "Speech detected but face not visible");
              }
            }
          },
          width: 640,
          height: 480,
        });

        // start camera & mic streams
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: { channelCount: 1, sampleRate: 48000, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });

        // attach stream to video element
        videoEl.srcObject = stream;
        videoEl.muted = isMuted;
        videoEl.playsInline = true;
        await videoEl.play().catch(() => {});

        // setup audio analyser
        try {
          micCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          micSourceRef.current = micCtxRef.current.createMediaStreamSource(stream);
          micAnalyserRef.current = micCtxRef.current.createAnalyser();
          micAnalyserRef.current.fftSize = 512;
          micSourceRef.current.connect(micAnalyserRef.current);
        } catch (e) {
          console.warn("Mic analyser setup failed:", e);
        }

        // add tracks to peer
        createPeerConnection();
        stream.getTracks().forEach((track) => {
          // avoid duplicate senders
          const exists = peerRef.current.getSenders().some((s) => s.track && s.track.id === track.id);
          if (!exists) peerRef.current.addTrack(track, stream);
        });

        // start mediapipe camera loop
        await mpCameraRef.current.start();
        setStatus("running");
        await createAndSendOffer();
      } catch (err) {
        console.error("Camera init error:", err);
        setStatus("error");
        socket.emit("camera_off", { studentExamId, email: user?.email });
      }
    };

    // wire socket events
    socket.on("webrtc_answer", async ({ answer, studentExamId: sid }) => {
      if (!peerRef.current || sid !== studentExamId) return;
      try { await peerRef.current.setRemoteDescription(answer); } catch (e) { console.warn(e); }
    });
    socket.on("webrtc_candidate", ({ candidate, studentExamId: sid }) => {
      if (sid === studentExamId && candidate && peerRef.current) {
        peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      }
    });
    socket.on("request_offer", ({ studentExamId: sid }) => {
      if (sid === studentExamId && peerRef.current) createAndSendOffer();
    });

    // start everything
    // const el = videoRef.current;
    // if (el) initDetection(el);

      // Use an off-DOM video element when headless
   let el = videoRef.current;
    if (headless) {
      el = document.createElement("video");
      el.setAttribute("muted", "");
      el.muted = true;
      el.playsInline = true;
    }
    if (el) initDetection(el);

    // cleanup helper
    const cleanupAll = () => {
      try { socket.off("webrtc_answer"); socket.off("webrtc_candidate"); socket.off("request_offer"); } catch {}
      try { mpCameraRef.current?.stop?.(); } catch {}
      try {
        const stream = videoRef.current?.srcObject;
        if (stream) stream.getTracks().forEach((t) => t.stop());
      } catch {}
      try { peerRef.current?.close?.(); } catch {}
      try { micSourceRef.current?.disconnect?.(); } catch {}
      try { micCtxRef.current?.close?.(); } catch {}
      try { faceMeshRef.current = null; handsRef.current = null; } catch {}
      setStatus("stopped");
    };

    // return cleanup
    return () => {
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentExamId, user?.email, isMuted]);

  // local UI controls: toggle mute (affects video element only)
  const toggleMute = () => {
    setIsMuted((m) => {
      const newVal = !m;
      if (videoRef.current) videoRef.current.muted = newVal;
      return newVal;
    });
  };

  // Render nothing when headless
  if (headless) return null;

  return (
    <div className="w-full">
      <div className="relative bg-black/30 rounded overflow-hidden border border-slate-700">
        <video ref={videoRef} id="camera-feed" autoPlay muted={isMuted} playsInline className="w-full h-48 object-cover bg-black" />
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status === "running" ? "bg-green-400" : status === "error" ? "bg-red-500" : "bg-yellow-400"}`} title={status}></div>
          <button onClick={toggleMute} className="px-2 py-1 text-xs bg-white/10 rounded">
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
    </div>
      <div className="text-xs mt-2 text-gray-300">
        Camera status: <span className="font-semibold">{status}</span>
      </div>
    </div>
      );
}
