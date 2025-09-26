import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResultsByIdentity,
  fetchResultByExamId,
} from "../Redux/view result/action";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : "-");
const calcPercent = (score, total) =>
  total ? Math.round((Number(score) / Number(total)) * 100) : 0;
const gradeFromPercent = (p) => {
  if (p >= 90) return { grade: "A+", color: "bg-emerald-500" };
  if (p >= 80) return { grade: "A", color: "bg-lime-500" };
  if (p >= 70) return { grade: "B+", color: "bg-amber-500" };
  if (p >= 60) return { grade: "B", color: "bg-orange-500" };
  if (p >= 50) return { grade: "C", color: "bg-rose-500" };
  return { grade: "F", color: "bg-red-600" };
};

// --- Helpers for rendering answers ---
const isNumericKeyObject = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  return keys.some((k) => /^\d+$/.test(k));
};

const reconstructFromCharMap = (obj) => {
  const numericPairs = Object.entries(obj)
    .filter(([k]) => /^\d+$/.test(k))
    .map(([k, v]) => [Number(k), v == null ? "" : String(v)]);
  numericPairs.sort((a, b) => a[0] - b[0]);
  return numericPairs.map(([, v]) => v).join("");
};

const renderAnswer = (ans) => {
  if (ans === null || typeof ans === "undefined") {
    return <span className="text-slate-400">N/A</span>;
  }

  if (isNumericKeyObject(ans)) {
    const text = reconstructFromCharMap(ans);
    return <span className="whitespace-pre-wrap">{text || "-"}</span>;
  }

  if (typeof ans === "object" && Object.prototype.hasOwnProperty.call(ans, "0")) {
    const val = Object.values(ans)
      .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
      .join(", ");
    return <span>{val || "—"}</span>;
  }

  if (typeof ans === "string" || typeof ans === "number") {
    return <span className="whitespace-pre-wrap">{String(ans)}</span>;
  }

  if (Array.isArray(ans)) {
    return (
      <div className="space-y-1">
        {ans.map((a, i) => (
          <div key={i}>{renderAnswer(a)}</div>
        ))}
      </div>
    );
  }

  if (typeof ans === "object") {
    const { code, language, lastSavedAt, ...rest } = ans;
    return (
      <div className="space-y-2">
        {language && (
          <div className="text-xs text-slate-300">
            <strong>Language:</strong> <span className="text-white ml-1">{language}</span>
          </div>
        )}
        {lastSavedAt && (
          <div className="text-xs text-slate-300">
            <strong>Saved:</strong>{" "}
            <span className="text-slate-200 ml-1">{new Date(lastSavedAt).toLocaleString()}</span>
          </div>
        )}
        {code ? (
          <pre className="bg-slate-900 p-2 rounded text-xs font-mono whitespace-pre-wrap break-words border border-slate-700">
            {code}
          </pre>
        ) : (
          <div className="text-sm text-slate-400">No code provided</div>
        )}
        {Object.keys(rest).length > 0 && (
          <div className="text-xs text-slate-400 mt-2">Other: {JSON.stringify(rest)}</div>
        )}
      </div>
    );
  }

  return <span>{String(ans)}</span>;
};

const normalizeQid = (qid) => {
  if (!qid && qid !== 0) return null;
  if (typeof qid === "object") {
    if (qid._id) return String(qid._id);
    try {
      return String(qid);
    } catch {
      return null;
    }
  }
  return String(qid);
};
export default function ResultPage() {
  const dispatch = useDispatch();
  const { loading, resultsList = [], selectedResult = null, error } = useSelector(
    (state) => state.result || {}
  );

  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [message, setMessage] = useState("");
  const [showAttemptModal, setShowAttemptModal] = useState(false);

  // concise store snapshot log — runs only when these values change
  useEffect(() => {
    console.log("[ResultPage] snapshot:", {
      loading,
      resultsCount: resultsList?.length ?? 0,
      selectedResultId: selectedResult?.studentExamId ?? null,
      selectedExamId,
      error,
    });
  }, [loading, resultsList?.length, selectedResult?.studentExamId, selectedExamId, error]);

  // click handler: explicit fetch of single result
  const onResultClick = (studentExamId) => {
    setSelectedExamId(studentExamId);
    dispatch(fetchResultByExamId(studentExamId));
  };

  // normalize inputs before dispatch
  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");
    setSelectedExamId(null);

    const emailTrim = (email || "").trim();
    const rollTrim = (rollNumber || "").trim();

    if (!emailTrim || !rollTrim) {
      setMessage("Please enter both email and roll number.");
      return;
    }

    // lowercase email for more tolerant matching on server
    dispatch(fetchResultsByIdentity(emailTrim.toLowerCase(), rollTrim));
  };

  const onPrint = () => window.print();
  const copyResultLink = () => {
    if (!selectedExamId) return;
    const url = `${window.location.origin}/results/${selectedExamId}`;
    navigator.clipboard?.writeText(url);
    setMessage("Result link copied to clipboard.");
    setTimeout(() => setMessage(""), 2500);
  };

  // prefer selectedResult (detail view) else fallback to list item
  const displayResult = useMemo(() => {
    if (selectedResult) return selectedResult;
    if (!selectedExamId || !resultsList?.length) return null;
    return resultsList.find((r) => String(r.studentExamId) === String(selectedExamId)) || null;
  }, [selectedResult, selectedExamId, resultsList]);

const summary = useMemo(() => {
  if (!displayResult) return null;

  // Prefer explicit exam.totalMarks if > 0, otherwise sum questionFeedback.maxMarks
  const examTotalRaw = displayResult.exam?.totalMarks;
  let totMarks = typeof examTotalRaw === "number" && examTotalRaw > 0
    ? examTotalRaw
    : null;

  if (!totMarks) {
    const qf = Array.isArray(displayResult.questionFeedback) ? displayResult.questionFeedback : [];
    const sum = qf.reduce((s, q) => s + (Number(q.maxMarks) || 0), 0);
    totMarks = sum || 0;
  }

  const score = Number(displayResult.scores?.totalScore ?? 0);
  const percent = totMarks ? Math.round((score / totMarks) * 100) : 0;
  const grade = gradeFromPercent(percent);

  return { totMarks, score, percent, grade };
}, [displayResult]);


  const getFeedbackByQid = (qid) => {
    if (!displayResult?.questionFeedback) return null;
    return displayResult.questionFeedback.find((q) => String(q.questionId) === String(qid));
  };

  const dedupAttempts = useMemo(() => {
    if (!displayResult?.attemptedAnswers) return [];
    const map = new Map();
    displayResult.attemptedAnswers.forEach((a) => {
      const key = normalizeQid(a.questionId) || `idx-${Math.random().toString(36).slice(2, 9)}`;
      map.set(key, a);
    });
    return Array.from(map.values());
  }, [displayResult]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between mb-8 text-center sm:text-left">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Result Viewer</h1>
            <p className="mt-1 text-sm text-gray-400">Enter your email and roll number to view results.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button onClick={onPrint} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105">
              Print / Download
            </button>
            <button onClick={copyResultLink} disabled={!selectedExamId} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 disabled:opacity-50">
              Copy Result Link
            </button>
          </div>
        </header>

        {/* Search Section */}
        <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-8 shadow-lg">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Roll Number</label>
              <input
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full border rounded-xl p-3 bg-gray-700 border-gray-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-500 text-gray-200 outline-none"
                placeholder="e.g. 85913245"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl p-3 bg-gray-700 border-gray-600 focus:ring-2 focus:ring-sky-500 placeholder-gray-500 text-gray-200 outline-none"
                placeholder="student@example.com"
                type="email"
              />
            </div>
            <div>
              <button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
                {loading ? "Searching..." : "Find Results"}
              </button>
            </div>
          </form>
          {message && <p className="mt-4 text-sm text-rose-400 text-center">{message}</p>}
          {error && <p className="mt-4 text-sm text-rose-400 text-center">Error: {error}</p>}
        </section>

        {/* Main Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Results List Sidebar */}
          <aside className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Your Results</h2>
            {loading && !resultsList.length ? (
              <div className="text-gray-500 animate-pulse">Searching...</div>
            ) : resultsList.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <p>No evaluated results found for your details.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {resultsList.map((r) => (
                  <li
                    key={r.studentExamId}
                    onClick={() => onResultClick(r.studentExamId)}
                    className={`p-5 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] shadow-sm ${selectedExamId === r.studentExamId ? "bg-sky-700 text-white border border-sky-600" : "bg-gray-700 hover:bg-gray-600 border border-gray-700"}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-base font-bold">{r.exam.title || "Untitled Exam"}</div>
                        <div className="text-xs text-gray-400 mt-1">{r.exam.domain || "Unknown domain"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold">{r.scores.totalScore ?? "-"}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">{fmtDate(r.evaluatedAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Detailed Result View */}
          <section className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-lg print:shadow-none">
            {!displayResult ? (
              <div className="text-gray-500 text-center py-16">
                <p>Select a result from the list to view detailed feedback.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6 pb-6 border-b border-gray-700">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-sky-400 border-2 border-sky-400">
                      {displayResult.student?.name?.[0]?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Student</div>
                      <div className="text-xl font-extrabold text-white">{displayResult.student?.name}</div>
                      <div className="text-sm text-gray-400">{displayResult.student?.email}</div>
                      <div className="text-sm text-gray-400">Roll: {displayResult.student?.rollNumber}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mt-4 sm:mt-0">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Total Score</div>
                      <div className="text-3xl font-extrabold text-white">{summary?.score ?? 0}</div>
                      <div className="text-sm text-gray-400">out of {summary?.totMarks ?? "-"} • {summary?.percent ?? 0}%</div>
                    </div>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${summary?.grade?.color ?? "bg-gray-500"}`}>
                      {summary?.grade?.grade}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Question Feedback</h3>
                  <div className="space-y-4">
                    {(displayResult.questionFeedback || []).map((q, idx) => (
                      <div key={q.questionId || idx} className="p-5 border border-gray-700 rounded-xl bg-gray-700 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="text-base font-medium text-white">{idx + 1}. {q.questionText}</div>
                            <div className="text-xs text-gray-500 mt-1">QID: {q.questionId}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-sky-300">{q.marksAwarded}/{q.maxMarks}</div>
                            <div className="text-xs text-gray-400 mt-1">{q.remarks || "-"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center mt-8">
                  <button onClick={() => setShowAttemptModal(true)} className="px-6 py-3 bg-gray-700 border border-gray-600 rounded-xl hover:bg-gray-600 text-gray-100 font-semibold shadow-md transition-all duration-300">
                    View Attempted Answers
                  </button>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Attempt Modal */}
      {showAttemptModal && displayResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black opacity-60" onClick={() => setShowAttemptModal(false)} />
          <div className="relative bg-gray-800 text-gray-100 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900">
              <h3 className="text-2xl font-extrabold text-white">Attempted Answers</h3>
              <button onClick={() => setShowAttemptModal(false)} className="text-gray-500 hover:text-gray-300 text-3xl transition-all duration-300 transform hover:rotate-90">
                &times;
              </button>
            </div>

            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {dedupAttempts.map((a, idx) => {
                const fb = getFeedbackByQid(a.questionId);
                const isCorrect =
                  (fb && typeof fb.maxMarks === "number" && fb.maxMarks > 0 && fb.marksAwarded === fb.maxMarks) ||
                  a.isCorrect === true;

                const colorClass = isCorrect ? "border-green-300 bg-green-900" : "border-red-300 bg-red-900";
                const textColor = isCorrect ? "text-green-300" : "text-red-300";
                const key = normalizeQid(a.questionId) || `attempt-${idx}`;

                return (
                  <div key={key} className={`p-5 rounded-xl border ${colorClass} transition-colors duration-300`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="text-base font-medium text-white">{idx + 1}. {fb?.questionText || "(Question text not available)"}</div>
                        <div className="text-xs text-gray-500 mt-1">QID: {a.questionId}</div>
                        <div className="mt-4">
                          <div className="text-sm text-gray-400">Your answer:</div>
                          <div className={`mt-2 p-3 rounded-xl ${isCorrect ? "bg-green-800" : "bg-red-800"} ${textColor} font-mono break-words`}>
                            {renderAnswer(a.answer)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className={`text-xl font-extrabold ${textColor}`}>
                          {fb ? `${fb.marksAwarded}/${fb.maxMarks}` : "-"}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">{fb?.remarks || ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {dedupAttempts.length === 0 && <div className="text-gray-500 text-center py-4">No attempted answers available.</div>}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900 text-right">
              <button onClick={() => setShowAttemptModal(false)} className="px-6 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 text-white font-semibold shadow-md transition-all duration-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { background: white; }
          .print\\:shadow-none { box-shadow: none !important; }
          button, input, .no-print, .fixed { display: none !important; }
        }
      `}</style>
    </div>
  );
}
