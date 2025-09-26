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
  <div className="min-h-screen bg-slate-900 text-white p-6">
    <ToastContainer position="top-right" pauseOnFocusLoss={false} />

    <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-6">
      {/* LEFT: Student info, timer, buttons */}
      <aside className="col-span-3 bg-slate-800 rounded-lg p-4 space-y-4 sticky top-4 h-fit">
        {/* Student Info */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">
            {user?.name?.[0] || "U"}
          </div>
          <div>
            <div className="text-sm text-gray-300">Student</div>
            <div className="font-semibold">{user?.name || "Unknown"}</div>
            <div className="text-xs text-gray-400">{user?.email}</div>
          </div>
        </div>

        <div className="mt-2 space-y-1 text-sm text-gray-300">
          <div><span className="text-xs text-gray-400">Roll:</span> {user?.rollNumber || "—"}</div>
          <div><span className="text-xs text-gray-400">Category:</span> {user?.category || "—"}</div>
          <div><span className="text-xs text-gray-400">Domain:</span> {user?.domainName || user?.domain || "—"}</div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-gray-400 mb-1">Timer</div>
          <div className="text-2xl font-semibold bg-black/20 px-3 py-2 rounded text-center">
            {timeLeft === null ? "-" : formatTime(timeLeft)}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => setShowDebugOverlay((s) => !s)}
            className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 font-medium"
          >
            {showDebugOverlay ? "Hide Debug" : "Show Debug"}
          </button>
          <button
            onClick={toggleMic}
            className="w-full px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 font-medium"
          >
            Toggle Mic
          </button>
          <button
            onClick={handleSubmit}
            disabled={!studentExamId || loading}
            className="w-full px-3 py-2 rounded bg-red-600 hover:bg-red-700 font-bold disabled:opacity-60"
          >
            Submit Exam
          </button>
        </div>
      </aside>

      {/* CENTER: Question canvas (UNCHANGED) */}
      <main className="col-span-6">
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{normalizedPaper?.title || "Exam"}</h2>
              <div className="text-sm text-gray-400">
                {normalizedPaper?.category} {normalizedPaper?.domain ? `• ${typeof normalizedPaper.domain === "object" ? normalizedPaper.domain.domain : normalizedPaper.domain}` : ""}
              </div>
            </div>
            <div className="text-sm text-gray-300 text-right">
              <div className="text-xs">Question</div>
              <div className="text-2xl font-semibold">
                {currentTabList.length ? currentQuestionIndex + 1 : "-"}
              </div>
              <div className="text-xs text-gray-400">{activeTab}</div>
            </div>
          </div>

          {/* big question panel */}
          <div className="bg-slate-900 p-5 rounded-lg min-h-[260px]">
            {!normalizedPaper || !normalizedPaper.questions?.length ? (
              <div className="text-center text-gray-400 py-12">No questions available</div>
            ) : !currentQuestion ? (
              <div className="text-center text-gray-400 py-12">No {activeTab} questions available</div>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400">Q.</div>
                  <div className="text-lg font-semibold text-white">{currentQuestion.questionText}</div>
                </div>

                {/* MCQ */}
                {activeTab === "MCQ" && (
                  <div className="space-y-3">
                    {(currentQuestion.options || []).map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const attempted = savedAnswers[currentQuestion._id] === letter;
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 rounded p-3 cursor-pointer border ${attempted ? "bg-green-700/60 border-green-600" : "bg-slate-800 border-slate-700"}`}
                        >
                          <input
                            type="radio"
                            name={`q-${currentQuestion._id}`}
                            checked={attempted}
                            onChange={() => handleMCQChange(currentQuestion._id, letter)}
                            className="mr-3"
                          />
                          <span className="font-medium">{letter}.</span>
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* THEORY */}
                {activeTab === "THEORY" && (
                  <div>
                    <textarea
                      value={savedAnswers[currentQuestion._id] || ""}
                      onChange={(e) => handleTheoryChange(currentQuestion._id, e.target.value)}
                      onBlur={() => handleTheoryBlur(currentQuestion._id)}
                      rows={8}
                      className="w-full p-3 rounded bg-slate-800 text-gray-200"
                      placeholder="Write your answer..."
                    />
                  </div>
                )}

                {/* CODING */}
                {activeTab === "CODING" && (
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
                )}

                {/* navigation */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-300">
                    {currentQuestion.type} • Marks: {currentQuestion.marks ?? "-"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                      className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentQuestionIndex((i) => Math.min(currentTabList.length - 1, i + 1))}
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT: camera, then profile/tabs/palette */}
      <aside className="col-span-3">
        <div className="bg-slate-800 rounded-lg p-4 sticky top-4 space-y-4">
          {/* Camera block moved here */}
          <div>
            <div className="text-xs text-gray-400 mb-1">Camera</div>
            <div className="bg-black/30 rounded overflow-visible w-full h-36 flex items-center justify-center border border-slate-700">
              <div className="w-full h-full">
                <CameraAndDetection
                  studentExamId={studentExamId}
                  user={user}
                  dispatch={dispatch}
                  navigate={navigate}
                  setAlertLog={setAlertLog}
                  alertCountsRef={alertCountsRef}
                  lockedRef={lockedRef}
                />
              </div>
            </div>
          </div>

          {/* Tabs, question grid, legend, and user info remain here */}
          {/* User Profile */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-xl font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <div>
              <div className="text-sm text-gray-300">Student</div>
              <div className="font-semibold text-white">{user?.name || "Unknown"}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
              <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                <div><span className="text-xs text-gray-400">Roll:</span> {user?.rollNumber || "—"}</div>
                <div><span className="text-xs text-gray-400">Category:</span> {user?.category || "—"}</div>
                <div><span className="text-xs text-gray-400">Domain:</span> {user?.domainName || user?.domain || "—"}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {["MCQ", "THEORY", "CODING"].map((t) => (
              <button
                key={t}
                onClick={() => { setActiveTab(t); setCurrentQuestionIndex(0); }}
                className={`flex-1 py-2 rounded ${activeTab === t ? "bg-blue-600 text-white" : "bg-slate-700 text-gray-300"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* question grid */}
          <div className="max-h-[54vh] overflow-auto pr-2">
            <div className="text-sm text-gray-300 mb-2">Questions ({activeTab})</div>
            <div className="grid grid-cols-5 gap-2">
              {currentTabList.length === 0 ? (
                <div className="col-span-5 text-xs text-gray-400">No questions</div>
              ) : currentTabList.map((q, idx) => {
                const attempted = !!savedAnswers[q._id] && (activeTab !== "CODING" ? true : !!savedAnswers[q._id]?.code);
                const isActive = idx === currentQuestionIndex;
                return (
                  <button
                    key={q._id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    title={q.questionText}
                    className={`p-2 rounded text-xs font-medium border ${isActive ? "bg-white text-black border-white" : attempted ? "bg-green-600 text-white border-green-600" : "bg-slate-700 text-gray-300 border-slate-700"}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* legend */}
          <div className="text-xs text-gray-400 mt-3 space-y-1">
            <div><span className="inline-block w-3 h-3 bg-green-600 mr-2 align-middle"></span> Attempted</div>
            <div><span className="inline-block w-3 h-3 bg-slate-700 mr-2 align-middle"></span> Unattempted</div>
            <div><span className="inline-block w-3 h-3 bg-white mr-2 align-middle border"></span> Current</div>
          </div>
        </div>
      </aside>
    </div>

    {/* Debug overlay (optional) */}
    {showDebugOverlay && (
      <div className="fixed right-4 top-14 z-50 w-full max-w-[540px] max-h-[85vh] overflow-auto bg-slate-800/95 border border-red-700 rounded-lg shadow-xl p-3 text-sm text-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-white">Run / Debug Output</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDebugOverlay(false)} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20">Close</button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">{debugText}</pre>
      </div>
    )}

    <LeaveExamModal open={leaveOpen} onStay={stayHere} onLeave={confirmLeave} />
  </div>
);

};

export default ExamPage;
