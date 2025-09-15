import * as faceapi from "face-api.js";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStudentPaper,
  startExam,
  submitExam,
  updateAnswer,
  runCode,
   fetchCodingAttempts
} from "../../Redux/ExamLog/action";
import { initExamLogSocket, cleanupExamLogSocket } from "../../Redux/ExamLog/examLog.socket";
import socket from "../../config/socket.connect";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LeaveExamModal from "../../Modal/LeaveModalExam";
import { useCallback } from "react";

// Simple AABB overlap for two boxes
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

// Build a bounding box from normalized landmarks
const boxFromLandmarks = (landmarks) => {
  if (!landmarks || landmarks.length === 0) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  // normalize [0..1] box
  return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) };
};

const MAX_SAME_ALERTS = 5; // after 5 similar alerts -> auto submit + logout

const ExamPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
const [debugText, setDebugText] = useState('');
  const { user } = useSelector((s) => s.user);

  // ✅ unified exam slice
  const { paper, loading, error, currentExam, answers: savedAnswers } = useSelector(
    (s) => s.exam
  );
  const [codingState, setCodingState] = useState({}); // { [questionId]: { code, language } }
const codingAttempts = useSelector((s) => s.exam.codingAttempts || {}); // shape from reducer
const codingLoading = useSelector((s) => s.exam.codingLoading);
const codingError = useSelector((s) => s.exam.codingError);

  const peerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [studentExamId, setStudentExamId] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingLeaveRef = useRef(null); // "refresh" | "back" | "route" etc.

  // alert counters (persist short-term so refresh doesn't reset)
  const alertCountsRef = useRef(JSON.parse(localStorage.getItem("exam_alert_counts") || "{}"));
  const [alertLog, setAlertLog] = useState([]); // recent alerts to show on UI
  const lockedRef = useRef(localStorage.getItem("exam_locked") === "true"); // once locked cannot rejoin

  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem("exam_alert_counts", JSON.stringify(alertCountsRef.current));
  }, [alertLog]);

  useEffect(() => {
    localStorage.setItem("exam_locked", lockedRef.current ? "true" : "false");
  }, [lockedRef.current]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("⏳ Loading FaceAPI models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        console.log("✅ FaceAPI models loaded successfully");
      } catch (err) {
        console.error("❌ Error loading FaceAPI models:", err);
      }
    };

    loadModels();
  }, []);

  /* ---------------- INIT SOCKET ---------------- */
  useEffect(() => {
    initExamLogSocket(dispatch);
    return () => cleanupExamLogSocket();
  }, [dispatch]);

  /* ---------------- FETCH PAPER + START EXAM ---------------- */
  useEffect(() => {
    if (lockedRef.current) {
      // Already locked due to prior auto-submit -> block rejoin
      toast.error("You have been locked out of this exam and cannot rejoin.");
      return;
    }

    if (!user?.category || !user?.domainId) return;

    const loadPaper = async () => {
      try {
        const selectedPaper = await dispatch(
          fetchStudentPaper({
            category: user.category,
            domainId: user.domainId,
          })
        );

        if (selectedPaper) {
          setTimeLeft(selectedPaper.duration ? selectedPaper.duration * 60 : 1800);

          // ✅ Create submission in DB via Redux action
          const submission = await dispatch(
            startExam({ student: user.id, exam: selectedPaper._id })
          );

          if (submission?._id) {
            setStudentExamId(submission._id);

            socket.emit("join_exam", {
              email: user.email,
              studentExamId: submission._id,
              name: user.name,
              rollNumber: user.rollNumber,
            });
          }
        }
      } catch (err) {
        console.error("Exam start failed:", err);
      }
    };

    loadPaper();
  }, [dispatch, user]);

  /* ---------------- CAMERA STREAM WITH WEBRTC + ALERT FIXES ---------------- */
  useEffect(() => {
    if (!studentExamId || !user?.email) return;
    if (lockedRef.current) return; // do not start if locked

    const peer = new RTCPeerConnection({ iceServers:[{ urls:"stun:stun.l.google.com:19302"}] })
    peerRef.current = peer;

    const videoEl = document.getElementById("camera-feed");
    let mpCamera; // MediaPipe Camera
    const initOnceRef = { started: false };
    let faceMesh, hands;
    let lastFaceSeenAt = Date.now();

    // mic analyser
    let micAnalyser = null;
    let micSource = null;
    let micCtx = null;

    // --- cooldown & edge-state structures
    const ALERT_COOLDOWN_MS = 8000; // 8 seconds cooldown per-type
    const alertCooldowns = {}; // { [type]: timestamp }
    const lastState = {
      handObstruction: false,
      multipleFaces: false,
      noFace: false,
    };

    // --- helper: create and send an offer (used now and on mentor refresh) ---
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

      // cleanup and force navigation (user cannot rejoin)
      try { peer.close(); } catch {}
      try { mpCamera?.stop?.(); } catch {}
      navigate("/");
    };

    // updated recordAlert that respects per-type cooldown and logs to UI + server
    const recordAlert = (type, issue) => {
      const now = Date.now();
      const last = alertCooldowns[type] || 0;

      if (now - last < ALERT_COOLDOWN_MS) {
        // suppressed due to cooldown
        return false;
      }
      alertCooldowns[type] = now;

      const iso = new Date(now).toISOString();
      alertCountsRef.current[type] = (alertCountsRef.current[type] || 0) + 1;
      localStorage.setItem("exam_alert_counts", JSON.stringify(alertCountsRef.current));

      const entry = { type, issue, timestamp: iso };
      setAlertLog((s) => [entry, ...s].slice(0, 10));
      toast.warn(`${type}: ${issue}`);

      // emit to server
      socket.emit(type, { studentExamId, email: user.email, issue, timestamp: iso });

      // threshold check
      if (alertCountsRef.current[type] >= MAX_SAME_ALERTS) {
        autoSubmitAndLock(type);
      }
      return true;
    };

    async function initCameraAndDetection() {
      if (initOnceRef.started) return;
      initOnceRef.started = true;

      try {
        // ---- 1) Setup MediaPipe FaceMesh & Hands
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

        // ---- 2) Per-frame processing
        let lastFaces = [];
        let lastHands = [];

        faceMesh.onResults((res) => {
          lastFaces = res.multiFaceLandmarks || [];
        });

        hands.onResults((res) => {
          lastHands = res.multiHandLandmarks || [];
        });

        // ---- 3) Camera driver (feeds frames to FaceMesh & Hands)
        mpCamera = new Camera(videoEl, {
          onFrame: async () => {
            await faceMesh.send({ image: videoEl });
            await hands.send({ image: videoEl });

            const now = Date.now();

            // update last face seen
            if (lastFaces.length > 0) {
              lastFaceSeenAt = now;
            }

            // ----- NO FACE (edge + cooldown) -----
            // consider no-face if no detection for 5s
            if (now - lastFaceSeenAt >= 5000) {
              if (!lastState.noFace) {
                // transition false -> true
                if (recordAlert("eye_off", "No face detected for 5s")) {
                  lastState.noFace = true;
                }
              }
            } else {
              // face present -> clear state
              lastState.noFace = false;
            }

            // ----- MULTIPLE FACES (edge) -----
            if (lastFaces.length > 1) {
              if (!lastState.multipleFaces) {
                if (recordAlert("multiple_faces", `${lastFaces.length} faces detected`)) {
                  lastState.multipleFaces = true;
                }
              }
            } else {
              lastState.multipleFaces = false;
            }

            // ----- HAND OBSTRUCTION (edge + cooldown) -----
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

            // ----- MIC LEVEL (loud voice / music) -----
            if (micAnalyser) {
              const arr = new Uint8Array(micAnalyser.fftSize);
              micAnalyser.getByteTimeDomainData(arr);
              let sum = 0;
              for (let i = 0; i < arr.length; i++) {
                const v = (arr[i] - 128) / 128;
                sum += v * v;
              }
              const level = Math.sqrt(sum / arr.length);

              // tuned threshold: avoid tiny noises; detect shouting/music
              if (level > 0.12) {
                // general loud/background music alert (cooldown-protected)
                recordAlert("loud_voice", "Abnormal voice/background music detected");

                // speech present but face missing -> suspicious
                if (now - lastFaceSeenAt > 2000) {
                  recordAlert("voice_no_face", "Speech detected but face not visible");
                }
              }
            }
          },
          width: 640,
          height: 480,
        });

        // ---- 4) Get video + audio stream
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
        videoEl.muted = true; // student should not hear themselves
        videoEl.playsInline = true;
        await videoEl.play().catch(() => {});

        // ---- setup local mic analyser for level detection
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

        // Start MediaPipe camera after real stream
        await mpCamera.start();

        // ---- 5) Send video + audio tracks to WebRTC peer
        stream.getTracks().forEach((track) => {
          const exists = peer.getSenders().some((s) => s.track && s.track.id === track.id);
          if (!exists) peer.addTrack(track, stream);
        });

        // ---- 6) ICE -> mentor
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

        // ---- 7) Initial offer
        await createAndSendOffer(peer);

      } catch (err) {
        console.error("❌ Camera/mic access failed:", err);
        socket.emit("camera_off", { studentExamId, email: user?.email });
      }
    }

    // mentor answers
    socket.on("webrtc_answer", async ({ answer }) => {
      try { await peer.setRemoteDescription(answer); } catch (e) { console.warn(e); }
    });

    // mentor ICE back
    socket.on("webrtc_candidate", ({ candidate, studentExamId: sid }) => {
      if (sid === studentExamId && candidate) {
        peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.warn);
      }
    });

    // 🔁 when mentor refreshes, they’ll emit request_offer → re-send offer
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
  }, [studentExamId, user, dispatch, navigate]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSubmit = async () => {
    if (!studentExamId) {
      alert("Missing student exam ID");
      return;
    }

    try {
      const result = await dispatch(
        submitExam({ studentExamId }) // ✅ new API expects studentExamId
      );

      socket.emit("submit_exam", {
        email: user.email,
        studentExamId,
      });

      toast.success("Exam submitted successfully.");
      // lock user so they cannot rejoin
      lockedRef.current = true;
      localStorage.setItem("exam_locked", "true");
      // small delay so the toast is visible, then go Home
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      console.error("❌ Submission failed:", err);
      toast.error("Submission failed. Please try again.");
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /* ---------------- RESTRICTIONS ---------------- */
  useEffect(() => {
    const recordLocalAlertAndEmit = (type, issue) => {
      const nowIso = new Date().toISOString();
      alertCountsRef.current[type] = (alertCountsRef.current[type] || 0) + 1;
      localStorage.setItem("exam_alert_counts", JSON.stringify(alertCountsRef.current));
      setAlertLog((s) => [{ type, issue, timestamp: nowIso }, ...s].slice(0,10));
      socket.emit(type, { studentExamId, email: user.email, issue, timestamp: nowIso });
      toast.warn(`${type}: ${issue}`);
      if (alertCountsRef.current[type] >= MAX_SAME_ALERTS) {
        (async () => {
          try { await dispatch(submitExam({ studentExamId })); } catch {}
          socket.emit("auto_submit", { studentExamId, email: user.email, reason: type, timestamp: nowIso });
          lockedRef.current = true; localStorage.setItem("exam_locked", "true");
          navigate("/");
        })();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        recordLocalAlertAndEmit("tab_switch", "Tab switched or hidden");
      }
    };

    const handleBlur = () => {
      recordLocalAlertAndEmit("tab_switch", "Window minimized or lost focus");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      socket.emit("tab_switch", {
        studentExamId,
        email: user.email,
        issue: "Close/refresh",
        timestamp: new Date().toISOString(),
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [studentExamId, dispatch, navigate, user.email]);

  /* ---------------- ANSWER HANDLERS ---------------- */
  const handleMCQChange = (qId, letter) => {
    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: letter,
      })
    );

    socket.emit("answer_update", { studentExamId, questionId: qId, answer: letter });
  };

  const handleTheoryChange = (qId, value) => {
    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: value,
      })
    );
  };

  const handleTheoryBlur = (qId) => {
    if (savedAnswers[qId]) {
      socket.emit("answer_update", { studentExamId, questionId: qId, answer: savedAnswers[qId] });
    }
  };

  // update local editor state + persist via updateAnswer (so server keeps latest code)
const handleCodingChange = useCallback(
  (qId, newCode) => {
    setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), code: newCode } }));
    // optimistic persist
    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: { ...(codingState[qId] || {}), code: newCode }, // server will store {code, language}
      })
    );
  },
  [dispatch, studentExamId, codingState]
);

const handleCodingLanguageChange = useCallback(
  (qId, lang) => {
    setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), language: lang } }));
    // persist change
    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: { ...(codingState[qId] || {}), language: lang },
      })
    );
  },
  [dispatch, studentExamId, codingState]
);

// run code: calls runCode action which calls your backend -> judge
// run code: calls runCode action which calls your backend -> judge
const handleRunCode = useCallback(
  async (q, mode = "evaluation") => {
    if (!studentExamId) {
      toast.error("Exam not started yet");
      return;
    }
    const qId = q._id;
    const state = codingState[qId] || {};
    const code = (state.code ?? "").trim();
    const language = state.language ?? (q.coding?.defaultLanguage || "javascript");
    const stdin = state.stdin ?? "";

    if (!code) {
      toast.error("Write some code before running.");
      return;
    }

    const runToastId = toast.info(
      mode === "debug" ? "Running with custom input..." : "Running test cases...",
      { autoClose: false }
    );

    try {
      // dispatch runCode with explicit mode
      const resp = await dispatch(
        runCode({ studentExamId, questionId: qId, code, language, stdin, mode })
      );

      toast.dismiss(runToastId);
      toast.success("Run completed");

      // If evaluation, refresh attempts list
      if (mode === "evaluation") {
        await dispatch(fetchCodingAttempts({ studentExamId, questionId: qId }));
      }

      // NORMALIZE response into stdout/stderr and attempt (if present)
      // resp can be:
      // 1) debug: { success: true, debug: true, runner: { stdout, stderr, results } }
      // 2) evaluation persisted: { success: true, attempt: {..., result: { stdout, stderr, results }}}
      // 3) older shapes - try to be permissive
      let stdout = "";
      let stderr = "";
      let attempt = null;

      if (resp) {
        if (resp.debug && resp.runner) {
          // debug-mode response
          stdout = String(resp.runner.stdout ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stdout || "").join("\n") : "")).trim();
          stderr = String(resp.runner.stderr ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stderr || "").join("\n") : "")).trim();
          attempt = null;
        } else if (resp.attempt) {
          attempt = resp.attempt;
          const r = attempt.result || attempt.codingResult || {};
          stdout = String(r.stdout ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stdout || "").join("\n") : "")).trim();
          stderr = String(r.stderr ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stderr || "").join("\n") : "")).trim();
        } else if (resp.result) {
          // some endpoints return { result: { stdout, stderr, ... } }
          const r = resp.result;
          stdout = String(r.stdout ?? (Array.isArray(r.tests) ? r.tests.map(t => t.stdout || "").join("\n") : "")).trim();
          stderr = String(r.stderr ?? "").trim();
        } else {
          // fallback: inspect nested shapes
          stdout = String(resp.stdout ?? resp.runner?.stdout ?? "").trim();
          stderr = String(resp.stderr ?? resp.runner?.stderr ?? "").trim();
          attempt = resp.attempt || null;
        }
      }

      // Build display text
      const outText = `Stdout:\n${stdout || "(empty)"}\n\nStderr:\n${stderr || "(empty)"}`;

      // Show overlay for debug runs OR if we have an attempt for evaluation
      if (mode === "debug" || attempt) {
        setDebugText(outText);
        setShowDebugOverlay(true);
      }
    } catch (err) {
      toast.dismiss(runToastId);
      console.error("Run failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Run failed");
    }
  },
  [dispatch, studentExamId, codingState]
);



      // coding handler
      useEffect(() => {
  if (!paper || !studentExamId) return;

  const initial = {};
  paper.questions.forEach((q) => {
    if (q.type === "CODING") {
      // savedAnswers[q._id] is expected to be { code, language } (if previously saved)
      const saved = savedAnswers[q._id] || {};
      const starter =
        (q.coding && Array.isArray(q.coding.starterCodes) && q.coding.starterCodes[0]) || null;
      initial[q._id] = {
        code: saved.code ?? (starter ? starter.code : ""),
        language: saved.language ?? (q.coding?.defaultLanguage || (q.coding?.allowedLanguages?.[0] || "javascript")),
      };
    }
  });
  setCodingState((s) => ({ ...initial, ...s }));
  // Also fetch attempts for coding questions
  paper.questions.forEach((q) => {
    if (q.type === "CODING") {
      dispatch(fetchCodingAttempts({ studentExamId, questionId: q._id })).catch(() => {});
    }
  });
}, [paper, savedAnswers, studentExamId, dispatch]);

  useEffect(() => {
    const onKey = (e) => {
      const isRefreshKey =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      if (isRefreshKey) {
        e.preventDefault();
        pendingLeaveRef.current = "refresh";
        setLeaveOpen(true);
      }
    };

    // back/forward navigation (history)
    const onPopState = (e) => {
      e.preventDefault();
      pendingLeaveRef.current = "back";
      setLeaveOpen(true);
      // push state back so we stay until a decision is made
      history.pushState(null, "", document.URL);
    };
    // seed a state so back can be trapped correctly
    history.pushState(null, "", document.URL);

    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const confirmLeave = () => {
    setLeaveOpen(false);
    const reason = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    if (reason === "refresh") {
      // do an actual reload
      window.location.reload();
    } else if (reason === "back") {
      // go back
      window.history.back();
    } else if (reason === "route") {
      navigate("/"); // or a stored target
    }
  };

  const stayHere = () => {
    setLeaveOpen(false);
  };

  // mic toggle (allow user to mute/unmute their mic)
  const toggleMic = () => {
    try {
      const stream = document.getElementById("camera-feed")?.srcObject;
      if (!stream) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;
      audioTrack.enabled = !audioTrack.enabled;
      setLocalAudioEnabled(audioTrack.enabled);
      socket.emit("mic_toggled", { studentExamId, email: user.email, enabled: audioTrack.enabled, timestamp: new Date().toISOString() });
      toast.info(`Microphone ${audioTrack.enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      console.warn("Toggle mic failed:", e);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {showDebugOverlay && (
  <div
    className="fixed right-4 top-14 z-50 w-full max-w-[540px] max-h-[85vh] overflow-auto
               bg-slate-800/95 border border-red-700 rounded-lg shadow-xl p-3 text-sm text-slate-100
               break-words whitespace-pre-wrap"
    style={{ backdropFilter: "blur(4px)" }}
    role="dialog"
    aria-modal="false"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="font-semibold text-white">Run / Debug Output</div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setShowDebugOverlay(false); /* optionally clear debugText: setDebugText('') */ }}
          className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
        >
          Close
        </button>
      </div>
    </div>

    <div className="max-h-[72vh] overflow-auto">
      <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
        {debugText}
      </pre>
    </div>
  </div>
)}

      <ToastContainer position="top-right" pauseOnFocusLoss={false} />
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Exam Portal</h2>
          <p>
            {user?.name} | {user?.category} - {user?.domain}
          </p>
          <p>Roll: {user?.rollNumber}</p>
        </div>
        <div className="text-lg font-semibold">
          Time Left:{" "}
          <span className="text-red-400">
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <video
            id="camera-feed"
            autoPlay
            muted   // ✅ required for autoplay
            playsInline
            className="w-32 h-24 rounded-md border"
          />
          <div className="flex gap-2">
            <button onClick={toggleMic} className="px-3 py-1 bg-slate-700 rounded">{localAudioEnabled ? "Mute Mic" : "Unmute Mic"}</button>
            <button onClick={() => { setAlertLog([]); alertCountsRef.current = {}; localStorage.removeItem("exam_alert_counts"); }} className="px-3 py-1 bg-slate-700 rounded">Clear Alerts</button>
          </div>
        </div>
      </header>

      {loading && <p>Loading paper...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && paper && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-4">{paper.title}</h3>
          {paper.questions.map((q, i) => (
            <div key={q._id} className="mb-4">
              <p className="font-semibold mb-2">
                {i + 1}. {q.questionText}
              </p>

              {/* MCQ */}
              {(q.type === "MCQ" || q.options?.length > 0) &&
                q.options?.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <label key={idx} className="block">
                      <input
                        type="radio"
                        name={`q${i}`}
                        value={letter}
                        checked={savedAnswers[q._id] === letter}
                        onChange={() => handleMCQChange(q._id, letter)}
                      />{" "}
                      {letter}. {opt}
                    </label>
                  );
                })}

              {/* Theory */}
              {q.type === "THEORY" && (
                <textarea
                  className="w-full bg-slate-700 p-2 rounded"
                  placeholder="Write your answer..."
                  value={savedAnswers[q._id] || ""}
                  onChange={(e) => handleTheoryChange(q._id, e.target.value)}
                  onBlur={() => handleTheoryBlur(q._id)}
                />
              )}
{/* CODING */}
{q.type === "CODING" && (
  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
      {/* Left meta */}
      <div className="flex-1 text-sm text-gray-300">
        <div><strong>Time limit:</strong> <span className="text-white">{q.coding?.timeLimitMs ?? 2000} ms</span></div>
        <div><strong>Marks:</strong> <span className="text-white">{q.marks}</span></div>
        <div className="mt-3 text-xs text-slate-400">
          <strong>Starter (preview):</strong>
          <div className="mt-2">
            <pre
              className="p-2 bg-slate-800 rounded max-h-36 overflow-auto text-xs text-slate-300 whitespace-pre-wrap break-words"
              title="Starter code (read-only preview)"
            >
              { (q.coding?.starterCodes?.[0]?.code) ? q.coding?.starterCodes?.[0]?.code : "// No starter code" }
            </pre>
          </div>
        </div>
      </div>

      {/* Attempts indicator */}
      <div className="w-full md:w-48 flex flex-col items-start md:items-end gap-2">
        <div className="text-xs text-gray-300 text-right">
          {(() => {
            const info = codingAttempts[q._id] || {};
            const remaining = typeof info.remaining === "number"
              ? info.remaining
              : (q.coding?.maxRunAttempts ?? 3) - (info.attempts?.length || 0);
            const maxAttempts = typeof info.maxAttempts === "number" ? info.maxAttempts : (q.coding?.maxRunAttempts ?? 3);
            return (
              <>
                <div>Attempts</div>
                <div className="mt-1 inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-white">{remaining}</span>
                  <span className="text-xs text-slate-400">/ {maxAttempts}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>

    {/* Editor area + controls */}
    <div className="grid md:grid-cols-3 gap-3 mb-3">
      <div className="md:col-span-2">
        <label className="block text-xs text-gray-400 mb-1">Code</label>
        <textarea
          rows={12}
          value={codingState[q._id]?.code ?? ""}
          onChange={(e) => handleCodingChange(q._id, e.target.value)}
          className="w-full p-3 rounded bg-slate-800 text-sm font-mono border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={q.coding?.starterCodes?.[0]?.code || "Write your code here..."}
        />
      </div>

      {/* Right column: language, stdin, buttons */}
      <div className="md:col-span-1 flex flex-col gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Language</label>
          <select
            value={(codingState[q._id]?.language) || (q.coding?.defaultLanguage || "javascript")}
            onChange={(e) => handleCodingLanguageChange(q._id, e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-sm border border-slate-600"
          >
            {(q.coding?.allowedLanguages || ["javascript"]).map((lang) => (
              <option value={lang} key={lang}>{lang}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Test Input (stdin)</label>
          <textarea
            rows={6}
            value={codingState[q._id]?.stdin ?? ""}
            onChange={(e) => setCodingState((s) => ({ ...s, [q._id]: { ...(s[q._id]||{}), stdin: e.target.value } }))}
            className="w-full p-2 rounded bg-slate-800 text-sm border border-slate-600 focus:outline-none"
            placeholder={"Paste test input here (e.g. \\n3\\n[{\"name\":\"A\",\"price\":100}, ...])"}
          />
          <div className="text-xs text-slate-400 mt-1">This input is only for quick local testing (sent to runner if handleRunCode supports it).</div>
        </div>

<div className="flex flex-wrap gap-2 mt-auto">
  {/* Debug Run */}
  <button
    onClick={() => handleRunCode(q, "debug")}
    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded shadow"
  >
    Run with Custom Input
  </button>

  {/* Evaluation Run */}
  <button
    onClick={() => handleRunCode(q, "evaluation")}
    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded shadow"
    disabled={
      codingLoading ||
      (() => {
        const info = codingAttempts[q._id] || {};
        const remaining =
          typeof info.remaining === "number"
            ? info.remaining
            : (q.coding?.maxRunAttempts ?? 3) -
              (info.attempts?.length || 0);
        return remaining <= 0;
      })()
    }
  >
    {codingLoading ? (
      <svg
        className="animate-spin h-4 w-4 text-white"
        viewBox="0 0 24 24"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
      </svg>
    ) : null}
    <span className="text-sm font-semibold text-white">Run Test Cases</span>
  </button>

  {/* Save Code */}
  <button
    onClick={() => {
      dispatch(
        updateAnswer({
          studentExamId,
          questionId: q._id,
          answer: {
            ...(codingState[q._id] || {}),
            code: codingState[q._id]?.code || "",
          },
        })
      );
      toast.info("Code saved");
    }}
    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
  >
    Save
  </button>

  {/* Refresh Attempts */}
  <button
    onClick={() =>
      dispatch(fetchCodingAttempts({ studentExamId, questionId: q._id })).catch(
        () => {}
      )
    }
    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded"
  >
    Refresh Attempts
  </button>
</div>

      </div>
    </div>

    {/* Error / run summary - inside card, scrollable, never overflow page */}
    <div className="mt-3">
      {(() => {
        const info = codingAttempts[q._id] || {};
        const errMsg = info.error || null;
        const attempts = info.attempts || [];
        if (!errMsg && !attempts.length) return <div className="text-sm text-slate-400">No runs yet</div>;

        return (
          <div className="space-y-3">
            {/* Error banner */}
            {errMsg && (
              <div className="p-3 bg-red-800 border border-red-700 rounded text-sm">
                <div className="flex items-start gap-3">
                  <div className="text-white font-semibold">Run Error</div>
                  <div className="flex-1 text-slate-200 text-xs break-words">
                    {String(errMsg)}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleRunCode(q)} className="px-2 py-1 bg-white/10 rounded text-xs text-white">Retry</button>

                  <button onClick={() => {
                    const copy = { ...(codingAttempts[q._id] || {}) };
                    delete copy.error;
                    dispatch({ type: 'FETCH_CODING_ATTEMPTS_SUCCESS', payload: { questionId: q._id, data: { attempts: copy.attempts || [], remaining: copy.remaining, maxAttempts: copy.maxAttempts } } });
                  }} className="px-2 py-1 bg-white/10 rounded text-xs text-white">Dismiss</button>

                  {/* View full in overlay */}
                  <button onClick={() => { setDebugText(String(info.error || 'No details')); setShowDebugOverlay(true); }} className="px-2 py-1 bg-white/10 rounded text-xs text-white">View Full</button>
                </div>
              </div>
            )}

            {/* Attempts list (scrollable if long) */}
            {attempts.length > 0 && (
              <div className="max-h-56 overflow-auto space-y-2">
                {attempts.slice().reverse().map((at, idx) => {
                  const res = at.result || at.codingResult || {};
                  const passed = (res?.summary?.passedCount ?? res?.passedCount ?? 0);
                  const total = (res?.summary?.totalCount ?? res?.totalCount ?? (q.coding?.testCases?.length ?? 0));
                  const atDate = at.submittedAt || at.createdAt || null;
                  return (
                    <div key={idx} className="p-2 bg-slate-800 rounded border border-slate-700 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-200">Run #{at.attemptNumber ?? (attempts.length - idx)}</div>
                          {atDate && <div className="text-xs text-slate-400">{new Date(atDate).toLocaleString()}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-300">Passed</div>
                          <div className="font-semibold text-white">{passed}/{total}</div>
                        </div>
                      </div>

                      {/* compact per-test */}
                      <div className="mt-2 space-y-1">
                        {(res?.results || []).map((r, i) => (
                          <div key={i} className={`p-2 rounded text-xs ${r.passed ? 'bg-green-800 text-white' : 'bg-red-800 text-white'}`}>
                            <div className="flex justify-between">
                              <div>Test {r.index ?? i+1} — {r.passed ? 'Passed' : 'Failed'}</div>
                              <div className="text-xs">{r.timeMs ? `${r.timeMs}ms` : ''}</div>
                            </div>
                            {r.stdout && <div className="mt-1 whitespace-pre-wrap break-words"><strong>Stdout:</strong> {String(r.stdout).slice(0, 500)}</div>}
                            {r.stderr && <div className="mt-1 text-red-200 whitespace-pre-wrap break-words"><strong>Stderr:</strong> {String(r.stderr).slice(0, 500)}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  </div>
)}



            </div>
          ))}
        </div>
      )}



      <div className="mt-6 flex justify-between items-start">
        <div className="w-1/3 bg-slate-800 p-4 rounded">
          <h4 className="font-bold mb-2">Alert Log (recent)</h4>
          <div className="max-h-40 overflow-auto">
            {alertLog.length === 0 && <p className="text-slate-400">No alerts</p>}
            {alertLog.map((a, idx) => (
              <div key={idx} className="text-sm mb-1 border-b border-slate-700 pb-1">
                <div className="font-semibold">{a.type}</div>
                <div className="text-xs text-slate-300">{a.issue}</div>
                <div className="text-xs text-slate-500">{new Date(a.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
            disabled={!studentExamId || loading}
          >
            {loading ? "Submitting..." : "Submit Exam"}
          </button>

          <div className="bg-slate-800 p-3 rounded">
            <div className="font-semibold">Alert counts</div>
            <pre className="text-xs mt-2">{JSON.stringify(alertCountsRef.current, null, 2)}</pre>
          </div>
        </div>
      </div>
           <LeaveExamModal
        open={leaveOpen}
        onStay={stayHere}
        onLeave={confirmLeave}
      />

    </div>
  );
};

export default ExamPage;