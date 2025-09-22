import * as faceapi from "face-api.js";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStudentPaper,
  startExam,
  submitExam,
  updateAnswer,
  runCode,
  fetchCodingAttempts,
} from "../../Redux/ExamLog/action";
import {
  initExamLogSocket,
  cleanupExamLogSocket,
} from "../../Redux/ExamLog/examLog.socket";
import socket from "../../config/socket.connect";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LeaveExamModal from "../../Modal/LeaveModalExam";
import { HeaderPanel } from "../../Component/HeaderPanel";
import { CodingCard } from "../../Component/CodingCard";
import { CameraAndDetection } from "../../Component/CameraAndDetection";

const ExamPage = () => {
  const [codingState, setCodingState] = useState({}); // { [questionId]: { code, language } }
  const codingAttempts = useSelector((s) => s.exam.codingAttempts || {}); // shape from reducer
  const codingLoading = useSelector((s) => s.exam.codingLoading);
  const codingError = useSelector((s) => s.exam.codingError);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [debugText, setDebugText] = useState("");
  const { user } = useSelector((s) => s.user);

  // ✅ unified exam slice
  const {
    paper,
    loading,
    error,
    currentExam,
    answers: savedAnswers,
  } = useSelector((s) => s.exam);
  const [timeLeft, setTimeLeft] = useState(null);
  const [studentExamId, setStudentExamId] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingLeaveRef = useRef(null); // "refresh" | "back" | "route" etc.

  // alert counters (persist short-term so refresh doesn't reset)
  const alertCountsRef = useRef(
    JSON.parse(localStorage.getItem("exam_alert_counts") || "{}")
  );
  const [alertLog, setAlertLog] = useState([]); // recent alerts to show on UI
  const lockedRef = useRef(localStorage.getItem("exam_locked") === "true"); // once locked cannot rejoin

  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);

  useEffect(() => {
    localStorage.setItem(
      "exam_alert_counts",
      JSON.stringify(alertCountsRef.current)
    );
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
          setTimeLeft(
            selectedPaper.duration ? selectedPaper.duration * 60 : 1800
          );

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
      localStorage.setItem(
        "exam_alert_counts",
        JSON.stringify(alertCountsRef.current)
      );
      setAlertLog((s) =>
        [{ type, issue, timestamp: nowIso }, ...s].slice(0, 10)
      );
      socket.emit(type, {
        studentExamId,
        email: user.email,
        issue,
        timestamp: nowIso,
      });
      toast.warn(`${type}: ${issue}`);
      if (alertCountsRef.current[type] >= MAX_SAME_ALERTS) {
        (async () => {
          try {
            await dispatch(submitExam({ studentExamId }));
          } catch {}
          socket.emit("auto_submit", {
            studentExamId,
            email: user.email,
            reason: type,
            timestamp: nowIso,
          });
          lockedRef.current = true;
          localStorage.setItem("exam_locked", "true");
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

    socket.emit("answer_update", {
      studentExamId,
      questionId: qId,
      answer: letter,
    });
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
      socket.emit("answer_update", {
        studentExamId,
        questionId: qId,
        answer: savedAnswers[qId],
      });
    }
  };

  // coding handler
  useEffect(() => {
    if (!paper || !studentExamId) return;

    const initial = {};
    paper.questions.forEach((q) => {
      if (q.type === "CODING") {
        // savedAnswers[q._id] is expected to be { code, language } (if previously saved)
        const saved = savedAnswers[q._id] || {};
        const starter =
          (q.coding &&
            Array.isArray(q.coding.starterCodes) &&
            q.coding.starterCodes[0]) ||
          null;
        initial[q._id] = {
          code: saved.code ?? (starter ? starter.code : ""),
          language:
            saved.language ??
            (q.coding?.defaultLanguage ||
              q.coding?.allowedLanguages?.[0] ||
              "javascript"),
        };
      }
    });
    setCodingState((s) => ({ ...initial, ...s }));
    // Also fetch attempts for coding questions
    paper.questions.forEach((q) => {
      if (q.type === "CODING") {
        dispatch(
          fetchCodingAttempts({ studentExamId, questionId: q._id })
        ).catch(() => {});
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

  const toggleMic = () => {
    try {
      const stream = document.getElementById("camera-feed")?.srcObject;
      if (!stream) return;
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;
      audioTrack.enabled = !audioTrack.enabled;
      setLocalAudioEnabled(audioTrack.enabled);
      socket.emit("mic_toggled", {
        studentExamId,
        email: user.email,
        enabled: audioTrack.enabled,
        timestamp: new Date().toISOString(),
      });
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
                onClick={() => {
                  setShowDebugOverlay(
                    false
                  ); /* optionally clear debugText: setDebugText('') */
                }}
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
      <HeaderPanel
        user={user}
        timeLeft={timeLeft}
        formatTime={formatTime}
        toggleMic={toggleMic}
        localAudioEnabled={localAudioEnabled}
        setAlertLog={setAlertLog}
        alertCountsRef={alertCountsRef}
      />

      {loading && <p>Loading paper...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && paper && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold mb-4">{paper.title}</h3>
          <CameraAndDetection
            studentExamId={studentExamId}
            user={user}
            dispatch={dispatch}
            navigate={navigate}
            setAlertLog={setAlertLog}
            alertCountsRef={alertCountsRef}
            lockedRef={lockedRef}
          />
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

              {q.type === "CODING" && (
                <CodingCard
                  q={q}
                  codingState={codingState}
                  setCodingState={setCodingState}
                  codingAttempts={codingAttempts}
                  codingLoading={codingLoading}
                  dispatch={dispatch}
                  studentExamId={studentExamId}
                  setDebugText={setDebugText}
                  setShowDebugOverlay={setShowDebugOverlay}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-between items-start">
        <div className="w-1/3 bg-slate-800 p-4 rounded">
          <h4 className="font-bold mb-2">Alert Log (recent)</h4>
          <div className="max-h-40 overflow-auto">
            {alertLog.length === 0 && (
              <p className="text-slate-400">No alerts</p>
            )}
            {alertLog.map((a, idx) => (
              <div
                key={idx}
                className="text-sm mb-1 border-b border-slate-700 pb-1"
              >
                <div className="font-semibold">{a.type}</div>
                <div className="text-xs text-slate-300">{a.issue}</div>
                <div className="text-xs text-slate-500">
                  {new Date(a.timestamp).toLocaleString()}
                </div>
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
            <pre className="text-xs mt-2">
              {JSON.stringify(alertCountsRef.current, null, 2)}
            </pre>
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
