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
  // inside ExamPage component, with your other useState
const [activeTab, setActiveTab] = useState("MCQ"); 
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);


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

// inside ExamPage component, before using paper.questions
const normalizedPaper = React.useMemo(() => {
  if (!paper) return null;
  const qs = (paper.questions || []).map(q => (q && q.question ? q.question : q)).filter(Boolean);
  return { ...paper, questions: qs };
}, [paper]);


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


useEffect(() => {
  // Reset index if tab changes
  setCurrentQuestionIndex(0);
}, [activeTab, normalizedPaper]);

// compute tab lists for convenient usage
const tabLists = {
  MCQ: (normalizedPaper?.questions || []).filter((q) => q?.type === "MCQ"),
  THEORY: (normalizedPaper?.questions || []).filter((q) => q?.type === "THEORY"),
  CODING: (normalizedPaper?.questions || []).filter((q) => q?.type === "CODING"),
};

const currentTabList = tabLists[activeTab] || [];
const currentQuestion = currentTabList[currentQuestionIndex] || null;

return (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    {/* Toasts (needed so your warning/info/error messages render) */}
    <ToastContainer position="top-right" pauseOnFocusLoss={false} />

    {/* Top timer bar + Submit */}
    <div className="w-full bg-sky-50 border-b border-sky-100 sticky top-0 z-30">
      <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="w-full text-center">
          <span className="text-slate-500 mr-2">Time Remaining:</span>
          <span className="font-semibold tracking-wide">
            {(() => {
              if (timeLeft == null) return "--:--";
              const h = Math.floor(timeLeft / 3600);
              const m = Math.floor((timeLeft % 3600) / 60);
              const s = timeLeft % 60;
              const pad = (n) => (n < 10 ? `0${n}` : n);
              return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
            })()}
          </span>
        </div>

        {/* Submit button (keeps your existing handler) */}
        <button
          onClick={handleSubmit}
          disabled={!studentExamId || loading}
          className="ml-4 shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
        >
          Submit Exam
        </button>
      </div>
    </div>

{studentExamId && user && (
  <CameraAndDetection
    headless
    studentExamId={studentExamId}
    user={user}
    dispatch={dispatch}
    navigate={navigate}
    setAlertLog={setAlertLog}
    alertCountsRef={alertCountsRef}
    lockedRef={lockedRef}
  />
)}


    <div className="max-w-[1200px] mx-auto px-4 py-6 grid grid-cols-12 gap-6">


      
      {/* MAIN CANVAS */}
      <main className="col-span-12 lg:col-span-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Tab switcher (MCQ / THEORY / CODING) */}
          <div className="mb-6">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              {["MCQ", "THEORY", "CODING"].map((t) => (
                <button
                  key={t}
                  onClick={() => { setActiveTab(t); setCurrentQuestionIndex(0); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${activeTab === t ? "bg-white shadow border border-slate-200" : "text-slate-600 hover:text-slate-900"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* progress header */}
          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-1">
              {currentTabList.length ? `Question ${currentQuestionIndex + 1} of ${currentTabList.length}` : "Question"}
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all"
                style={{
                  width:
                    currentTabList.length > 0
                      ? `${((currentQuestionIndex + 1) / currentTabList.length) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-snug mb-6">
            {currentQuestion?.questionText || "No questions available"}
          </h1>

          {/* Content area */}
          {!normalizedPaper || !normalizedPaper.questions?.length ? (
            <div className="text-center text-slate-500 py-16">No questions available</div>
          ) : !currentQuestion ? (
            <div className="text-center text-slate-500 py-16">No {activeTab} questions available</div>
          ) : (
            <>
              {/* MCQ */}
              {activeTab === "MCQ" && (
                <div className="space-y-4">
                  {(currentQuestion.options || []).map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const checked = savedAnswers[currentQuestion._id] === letter;
                    return (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition
                        ${
                          checked
                            ? "bg-sky-50 border-sky-300 ring-1 ring-sky-400"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${currentQuestion._id}`}
                          checked={checked}
                          onChange={() => handleMCQChange(currentQuestion._id, letter)}
                          className="w-5 h-5 accent-sky-600"
                        />
                        <span className="font-medium">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* THEORY */}
              {activeTab === "THEORY" && (
                <div className="mt-2">
                  <div className="text-sm text-slate-600 mb-2">Your Answer</div>
                  <textarea
                    value={savedAnswers[currentQuestion._id] || ""}
                    onChange={(e) => handleTheoryChange(currentQuestion._id, e.target.value)}
                    onBlur={() => handleTheoryBlur(currentQuestion._id)}
                    rows={10}
                    placeholder="Write your answer here..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              )}

              {/* CODING (kept intact) */}
              {activeTab === "CODING" && (
                <div className="mt-2">
                  <CodingCard
                    q={currentQuestion}
                    codingState={codingState}
                    setCodingState={setCodingState}
                    codingAttempts={codingAttempts}
                    codingLoading={codingLoading}
                    dispatch={dispatch}
                    studentExamId={studentExamId}
                    setDebugText={setDebugText}
                    setShowDebugOverlay={setShowDebugOverlay}
                  />
                </div>
              )}

              {/* Bottom controls */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition disabled:opacity-50"
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((i) => Math.min(currentTabList.length - 1, i + 1))
                  }
                  className="px-5 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition disabled:opacity-50"
                  disabled={currentTabList.length === 0 || currentQuestionIndex === currentTabList.length - 1}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* RIGHT SIDEBAR: Question navigator */}
      <aside className="col-span-12 lg:col-span-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-20">
             <h3 className="text-xl font-semibold mb-4">Proctoring Warnings</h3>
   {alertLog.length === 0 ? (
     <div className="text-sm text-slate-500 mb-6">No warnings yet</div>
   ) : (
     <div className="mb-6 max-h-64 overflow-auto rounded-lg border border-slate-100">
       <ul className="divide-y divide-slate-100 text-sm">
         {alertLog.map((a, i) => (
           <li key={i} className="px-3 py-2">
             <div className="flex items-center justify-between">
              <span className="font-medium">{a.type}</span>
               <span className="text-xs text-slate-500">
                 {new Date(a.timestamp).toLocaleTimeString()}
               </span>
             </div>
            {a.issue && <div className="text-xs text-slate-600 mt-0.5">{a.issue}</div>}
          </li>
         ))}
       </ul>
     </div>
   )}
          <h3 className="text-xl font-semibold mb-4">Questions</h3>

          <div className="grid grid-cols-5 gap-3">
            {currentTabList.length === 0 ? (
              <div className="col-span-5 text-sm text-slate-500">No questions</div>
            ) : (
              currentTabList.map((q, idx) => {
                const attempted =
                  !!savedAnswers[q._id] &&
                  (activeTab !== "CODING" ? true : !!savedAnswers[q._id]?.code);
                const isActive = idx === currentQuestionIndex;
                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 rounded-xl text-sm font-semibold border transition
                      ${
                        isActive
                          ? "bg-sky-600 text-white border-sky-600"
                          : attempted
                          ? "bg-green-500 text-white border-green-500"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    title={q.questionText}
                  >
                    {idx + 1}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>

    {/* Your existing overlays/modals keep working */}
    {showDebugOverlay && (
      <div className="fixed right-4 top-14 z-50 w-full max-w-[540px] max-h-[85vh] overflow-auto bg-slate-800/95 border border-red-700 rounded-lg shadow-xl p-3 text-sm text-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-white">Run / Debug Output</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebugOverlay(false)}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
          {debugText}
        </pre>
      </div>
    )}

    <LeaveExamModal open={leaveOpen} onStay={stayHere} onLeave={confirmLeave} />
  </div>
);
};

export default ExamPage;
