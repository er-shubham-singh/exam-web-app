import * as faceapi from "face-api.js";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  updateAnswer,
  runCode,
  fetchCodingAttempts,
} from "../../src/Redux/ExamLog/action";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function CodingCard({ q, codingState, setCodingState, codingAttempts, codingLoading, dispatch, studentExamId, setDebugText, setShowDebugOverlay }) {
  const handleCodingChange = useCallback(
    (qId, newCode) => {
      setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), code: newCode } }));
      dispatch(
        updateAnswer({
          studentExamId,
          questionId: qId,
          answer: { ...(codingState[qId] || {}), code: newCode },
        })
      );
    },
    [dispatch, studentExamId, codingState, setCodingState]
  );

  const handleCodingLanguageChange = useCallback(
    (qId, lang) => {
      setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), language: lang } }));
      dispatch(
        updateAnswer({
          studentExamId,
          questionId: qId,
          answer: { ...(codingState[qId] || {}), language: lang },
        })
      );
    },
    [dispatch, studentExamId, codingState, setCodingState]
  );

  const handleRunCode = useCallback(
    async (qParam, mode = "evaluation") => {
      if (!studentExamId) {
        toast.error("Exam not started yet");
        return;
      }
      const qId = qParam._id;
      const state = codingState[qId] || {};
      const code = (state.code ?? "").trim();
      const language = state.language ?? (qParam.coding?.defaultLanguage || "javascript");
      const stdin = state.stdin ?? "";

      if (!code) {
        toast.error("Write some code before running.");
        return;
      }

      const runToastId = toast.info(mode === "debug" ? "Running with custom input..." : "Running test cases...", { autoClose: false });

      try {
        const resp = await dispatch(runCode({ studentExamId, questionId: qId, code, language, stdin, mode }));

        toast.dismiss(runToastId);
        toast.success("Run completed");

        if (mode === "evaluation") {
          await dispatch(fetchCodingAttempts({ studentExamId, questionId: qId }));
        }

        let stdout = "";
        let stderr = "";
        let attempt = null;

        if (resp) {
          if (resp.debug && resp.runner) {
            stdout = String(resp.runner.stdout ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stdout || "").join("\n") : "")).trim();
            stderr = String(resp.runner.stderr ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stderr || "").join("\n") : "")).trim();
            attempt = null;
          } else if (resp.attempt) {
            attempt = resp.attempt;
            const r = attempt.result || attempt.codingResult || {};
            stdout = String(r.stdout ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stdout || "").join("\n") : "")).trim();
            stderr = String(r.stderr ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stderr || "").join("\n") : "")).trim();
          } else if (resp.result) {
            const r = resp.result;
            stdout = String(r.stdout ?? (Array.isArray(r.tests) ? r.tests.map(t => t.stdout || "").join("\n") : "")).trim();
            stderr = String(r.stderr ?? "").trim();
          } else {
            stdout = String(resp.stdout ?? resp.runner?.stdout ?? "").trim();
            stderr = String(resp.stderr ?? resp.runner?.stderr ?? "").trim();
            attempt = resp.attempt || null;
          }
        }

        const outText = `Stdout:\n${stdout || "(empty)"}\n\nStderr:\n${stderr || "(empty)"}`;

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
    [dispatch, studentExamId, codingState, setDebugText, setShowDebugOverlay]
  );

  return (
    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
        <div className="flex-1 text-sm text-gray-300">
          <div><strong>Time limit:</strong> <span className="text-white">{q.coding?.timeLimitMs ?? 2000} ms</span></div>
          <div><strong>Marks:</strong> <span className="text-white">{q.marks}</span></div>
          <div className="mt-3 text-xs text-slate-400">
            <strong>Starter (preview):</strong>
            <div className="mt-2">
              <pre className="p-2 bg-slate-800 rounded max-h-36 overflow-auto text-xs text-slate-300 whitespace-pre-wrap break-words" title="Starter code (read-only preview)">{ (q.coding?.starterCodes?.[0]?.code) ? q.coding?.starterCodes?.[0]?.code : "// No starter code" }</pre>
            </div>
          </div>
        </div>

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

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Code</label>
          <textarea rows={12} value={codingState[q._id]?.code ?? ""} onChange={(e) => handleCodingChange(q._id, e.target.value)} className="w-full p-3 rounded bg-slate-800 text-sm font-mono border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={q.coding?.starterCodes?.[0]?.code || "Write your code here..."} />
        </div>

        <div className="md:col-span-1 flex flex-col gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Language</label>
            <select value={(codingState[q._id]?.language) || (q.coding?.defaultLanguage || "javascript")} onChange={(e) => handleCodingLanguageChange(q._id, e.target.value)} className="w-full p-2 rounded bg-slate-800 text-sm border border-slate-600">
              {(q.coding?.allowedLanguages || ["javascript"]).map((lang) => (
                <option value={lang} key={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Test Input (stdin)</label>
            <textarea rows={6} value={codingState[q._id]?.stdin ?? ""} onChange={(e) => setCodingState((s) => ({ ...s, [q._id]: { ...(s[q._id]||{}), stdin: e.target.value } }))} className="w-full p-2 rounded bg-slate-800 text-sm border border-slate-600 focus:outline-none" placeholder={"Paste test input here (e.g. \\n3\\n[{\"name\":\"A\",\"price\":100}, ...])"} />
            <div className="text-xs text-slate-400 mt-1">This input is only for quick local testing (sent to runner if handleRunCode supports it).</div>
          </div>

          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleRunCode(q, "debug")} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded shadow">Run with Custom Input</button>

            <button onClick={() => handleRunCode(q, "evaluation")} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded shadow" disabled={codingLoading || (() => { const info = codingAttempts[q._id] || {}; const remaining = typeof info.remaining === "number" ? info.remaining : (q.coding?.maxRunAttempts ?? 3) - (info.attempts?.length || 0); return remaining <= 0; })()}>
              {codingLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg>
              ) : null}
              <span className="text-sm font-semibold text-white">Run Test Cases</span>
            </button>

            <button onClick={() => { dispatch(updateAnswer({ studentExamId, questionId: q._id, answer: { ...(codingState[q._id] || {}), code: codingState[q._id]?.code || "" } })); toast.info("Code saved"); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded">Save</button>

            <button onClick={() => dispatch(fetchCodingAttempts({ studentExamId, questionId: q._id })).catch(() => {})} className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded">Refresh Attempts</button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {(() => {
          const info = codingAttempts[q._id] || {};
          const errMsg = info.error || null;
          const attempts = info.attempts || [];
          if (!errMsg && !attempts.length) return <div className="text-sm text-slate-400">No runs yet</div>;

          return (
            <div className="space-y-3">
              {errMsg && (
                <div className="p-3 bg-red-800 border border-red-700 rounded text-sm">
                  <div className="flex items-start gap-3">
                    <div className="text-white font-semibold">Run Error</div>
                    <div className="flex-1 text-slate-200 text-xs break-words">{String(errMsg)}</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleRunCode(q)} className="px-2 py-1 bg-white/10 rounded text-xs text-white">Retry</button>

                    <button onClick={() => { const copy = { ...(codingAttempts[q._id] || {}) }; delete copy.error; dispatch({ type: 'FETCH_CODING_ATTEMPTS_SUCCESS', payload: { questionId: q._id, data: { attempts: copy.attempts || [], remaining: copy.remaining, maxAttempts: copy.maxAttempts } } }); }} className="px-2 py-1 bg-white/10 rounded text-xs text-white">Dismiss</button>

                    <button onClick={() => { setDebugText(String(info.error || 'No details')); setShowDebugOverlay(true); }} className="px-2 py-1 bg-white/10 rounded text-xs text-white">View Full</button>
                  </div>
                </div>
              )}

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
  );
}
