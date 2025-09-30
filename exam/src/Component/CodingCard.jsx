// import * as faceapi from "face-api.js";
// import React, { useEffect, useRef, useState, useCallback } from "react";
// import {
//   updateAnswer,
//   runCode,
//   fetchCodingAttempts,
// } from "../../src/Redux/ExamLog/action";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export function CodingCard({ q, codingState, setCodingState, codingAttempts, codingLoading, dispatch, studentExamId, setDebugText, setShowDebugOverlay }) {
//   const handleCodingChange = useCallback(
//     (qId, newCode) => {
//       setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), code: newCode } }));
//       dispatch(
//         updateAnswer({
//           studentExamId,
//           questionId: qId,
//           answer: { ...(codingState[qId] || {}), code: newCode },
//         })
//       );
//     },
//     [dispatch, studentExamId, codingState, setCodingState]
//   );

//   const handleCodingLanguageChange = useCallback(
//     (qId, lang) => {
//       setCodingState((s) => ({ ...s, [qId]: { ...(s[qId] || {}), language: lang } }));
//       dispatch(
//         updateAnswer({
//           studentExamId,
//           questionId: qId,
//           answer: { ...(codingState[qId] || {}), language: lang },
//         })
//       );
//     },
//     [dispatch, studentExamId, codingState, setCodingState]
//   );

//   const handleRunCode = useCallback(
//     async (qParam, mode = "evaluation") => {
//       if (!studentExamId) {
//         toast.error("Exam not started yet");
//         return;
//       }
//       const qId = qParam._id;
//       const state = codingState[qId] || {};
//       const code = (state.code ?? "").trim();
//       const language = state.language ?? (qParam.coding?.defaultLanguage || "javascript");
//       const stdin = state.stdin ?? "";

//       if (!code) {
//         toast.error("Write some code before running.");
//         return;
//       }

//       const runToastId = toast.info(mode === "debug" ? "Running with custom input..." : "Running test cases...", { autoClose: false });

//       try {
//         const resp = await dispatch(runCode({ studentExamId, questionId: qId, code, language, stdin, mode }));

//         toast.dismiss(runToastId);
//         toast.success("Run completed");

//         if (mode === "evaluation") {
//           await dispatch(fetchCodingAttempts({ studentExamId, questionId: qId }));
//         }

//         let stdout = "";
//         let stderr = "";
//         let attempt = null;

//         if (resp) {
//           if (resp.debug && resp.runner) {
//             stdout = String(resp.runner.stdout ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stdout || "").join("\n") : "")).trim();
//             stderr = String(resp.runner.stderr ?? (Array.isArray(resp.runner.results) ? resp.runner.results.map(r => r.stderr || "").join("\n") : "")).trim();
//             attempt = null;
//           } else if (resp.attempt) {
//             attempt = resp.attempt;
//             const r = attempt.result || attempt.codingResult || {};
//             stdout = String(r.stdout ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stdout || "").join("\n") : "")).trim();
//             stderr = String(r.stderr ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stderr || "").join("\n") : "")).trim();
//           } else if (resp.result) {
//             const r = resp.result;
//             stdout = String(r.stdout ?? (Array.isArray(r.tests) ? r.tests.map(t => t.stdout || "").join("\n") : "")).trim();
//             stderr = String(r.stderr ?? "").trim();
//           } else {
//             stdout = String(resp.stdout ?? resp.runner?.stdout ?? "").trim();
//             stderr = String(resp.stderr ?? resp.runner?.stderr ?? "").trim();
//             attempt = resp.attempt || null;
//           }
//         }

//         const outText = `Stdout:\n${stdout || "(empty)"}\n\nStderr:\n${stderr || "(empty)"}`;

//         if (mode === "debug" || attempt) {
//           setDebugText(outText);
//           setShowDebugOverlay(true);
//         }
//       } catch (err) {
//         toast.dismiss(runToastId);
//         console.error("Run failed:", err);
//         toast.error(err?.response?.data?.message || err?.message || "Run failed");
//       }
//     },
//     [dispatch, studentExamId, codingState, setDebugText, setShowDebugOverlay]
//   );

// return (
//   <section className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-2xl border border-slate-600 shadow-xl">
//     {/* Header: Time & Marks */}
//     <header className="flex flex-col md:flex-row justify-between gap-6 mb-6">
//       <div className="flex-1">
//         <div className="flex gap-4 items-center mb-3">
//           <span className="px-3 py-2 rounded-lg bg-slate-900 text-xs font-semibold border border-slate-700">
//             Time limit: <span className="text-white font-bold">{q.coding?.timeLimitMs ?? 2000} ms</span>
//           </span>
//           <span className="px-3 py-2 rounded-lg bg-blue-950 text-xs font-semibold border border-blue-700">
//             Marks: <span className="text-white font-bold">{q.marks}</span>
//           </span>
//         </div>
//         <div className="mt-4 text-xs">
//           <span className="font-semibold text-slate-300">Starter (preview):</span>
//           <pre className="mt-2 p-3 bg-slate-950 rounded-lg max-h-40 overflow-auto border border-slate-700 text-xs font-mono text-slate-200 whitespace-pre-wrap break-all">
//             {(q.coding?.starterCodes?.[0]?.code) ? q.coding?.starterCodes?.[0]?.code : "// No starter code"}
//           </pre>
//         </div>
//       </div>
//       {/* Attempts Info */}
//       <aside className="w-full md:w-56 flex flex-col items-end gap-2">
//         <div className="w-full">
//           <div className="mb-1 text-right text-xs text-gray-400 font-semibold">Attempts left</div>
//           <div className="flex items-center justify-end gap-3 bg-slate-900 px-5 py-2 rounded-full border border-slate-700 shadow">
//             <span className="text-xl font-bold text-green-400">
//               {
//                 (() => {
//                   const info = codingAttempts[q._id] || {};
//                   const remaining = typeof info.remaining === "number"
//                     ? info.remaining
//                     : (q.coding?.maxRunAttempts ?? 3) - (info.attempts?.length || 0);
//                   return remaining;
//                 })()
//               }
//             </span>
//             <span className="text-xs text-slate-400">
//               / {
//                 (() => {
//                   const info = codingAttempts[q._id] || {};
//                   return typeof info.maxAttempts === "number"
//                     ? info.maxAttempts
//                     : (q.coding?.maxRunAttempts ?? 3);
//                 })()
//               }
//             </span>
//           </div>
//         </div>
//       </aside>
//     </header>

//     {/* Main Layout */}
//     <section className="grid md:grid-cols-3 gap-6 mb-6">
//       {/* Editor + Test Input */}
//       <div className="md:col-span-2 flex flex-col gap-4">
//         <label className="block text-sm font-semibold text-gray-400 mb-2">Code</label>
//         <textarea
//           rows={12}
//           value={codingState[q._id]?.code ?? ""}
//           onChange={(e) => handleCodingChange(q._id, e.target.value)}
//           className="w-full p-4 rounded-2xl bg-slate-900 text-sm font-mono border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 transition placeholder:text-sm"
//           placeholder={q.coding?.starterCodes?.[0]?.code || "Write your code here..."}
//         />
//         <div>
//           <label className="block text-sm font-semibold text-gray-400 mb-2">Test Input (stdin)</label>
//           <textarea
//             rows={5}
//             value={codingState[q._id]?.stdin ?? ""}
//             onChange={(e) => setCodingState((s) => ({ ...s, [q._id]: { ...(s[q._id]||{}), stdin: e.target.value } }))}
//             className="w-full p-3 rounded-2xl bg-slate-900 text-sm border border-slate-700 focus:outline-none"
//             placeholder={"Paste test input here (e.g. \n3\n[{\"name\":\"A\",\"price\":100}, ...])"}
//           />
//           <span className="text-xs text-slate-500 mt-1 block">
//             This input is only for local testing (passed to runner if supported).
//           </span>
//         </div>
//       </div>

//       {/* Controls Panel */}
//       <div className="flex flex-col gap-5">
//         <div>
//           <label className="block text-sm font-semibold text-gray-400 mb-2">Language</label>
//           <select
//             value={(codingState[q._id]?.language) || (q.coding?.defaultLanguage || "javascript")}
//             onChange={(e) => handleCodingLanguageChange(q._id, e.target.value)}
//             className="w-full p-3 rounded-2xl bg-slate-900 text-sm border border-slate-700 focus:ring-cyan-700 transition"
//           >
//             {(q.coding?.allowedLanguages || ["javascript"]).map((lang) => (
//               <option value={lang} key={lang}>{lang}</option>
//             ))}
//           </select>
//         </div>
//         <div className="flex flex-wrap gap-3 mt-auto">
//           <button
//             onClick={() => handleRunCode(q, "debug")}
//             className="px-4 py-2 rounded-2xl bg-cyan-700 hover:bg-cyan-600 text-white font-bold transition shadow"
//           >
//             Run with Custom Input
//           </button>
//           <button
//             onClick={() => handleRunCode(q, "evaluation")}
//             className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-700 hover:bg-green-600 text-white font-bold transition shadow"
//             disabled={codingLoading || (() => {
//               const info = codingAttempts[q._id] || {};
//               const remaining = typeof info.remaining === "number"
//                 ? info.remaining
//                 : (q.coding?.maxRunAttempts ?? 3) - (info.attempts?.length || 0);
//               return remaining <= 0;
//             })()}
//           >
//             {codingLoading && (
//               <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
//                 <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//               </svg>
//             )}
//             <span>Run Test Cases</span>
//           </button>
//           <button
//             onClick={() => {
//               dispatch(updateAnswer({ studentExamId, questionId: q._id, answer: { ...(codingState[q._id] || {}), code: codingState[q._id]?.code || "" } }));
//               toast.info("Code saved");
//             }}
//             className="px-4 py-2 rounded-2xl bg-blue-700 hover:bg-blue-600 text-white transition shadow"
//           >
//             Save
//           </button>
//           <button
//             onClick={() =>
//               dispatch(fetchCodingAttempts({ studentExamId, questionId: q._id })).catch(() => {})
//             }
//             className="px-4 py-2 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white transition shadow"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>
//     </section>

//     {/* Attempts / Results */}
//     <section className="mt-4">
//       {
//         (() => {
//           const info = codingAttempts[q._id] || {};
//           const errMsg = info.error || null;
//           const attempts = info.attempts || [];
//           if (!errMsg && !attempts.length) return (
//             <div className="text-base text-slate-500 italic text-center">No runs yet</div>
//           );
//           return (
//             <div className="space-y-5">
//               {errMsg && (
//                 <div className="p-5 bg-red-800/90 border border-red-700 rounded-2xl text-base shadow">
//                   <div className="flex items-start gap-4">
//                     <div className="font-bold text-white">Run Error</div>
//                     <div className="flex-1 text-slate-100 text-xs">{String(errMsg)}</div>
//                   </div>
//                   <div className="mt-2 flex gap-3">
//                     <button onClick={() => handleRunCode(q)} className="px-3 py-1 rounded bg-slate-900 hover:bg-red-900 text-white text-xs font-semibold transition">Retry</button>
//                     <button onClick={() => {
//                       const copy = { ...(codingAttempts[q._id] || {}) };
//                       delete copy.error;
//                       dispatch({ type: 'FETCH_CODING_ATTEMPTS_SUCCESS', payload: { questionId: q._id, data: { attempts: copy.attempts || [], remaining: copy.remaining, maxAttempts: copy.maxAttempts } } });
//                     }} className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs transition">Dismiss</button>
//                     <button onClick={() => { setDebugText(String(info.error || 'No details')); setShowDebugOverlay(true); }} className="px-3 py-1 rounded bg-slate-900 hover:bg-blue-900 text-white text-xs transition">View Full</button>
//                   </div>
//                 </div>
//               )}
//               {attempts.length > 0 && (
//                 <div className="max-h-56 overflow-auto flex flex-col gap-3">
//                   {attempts.slice().reverse().map((at, idx) => {
//                     const res = at.result || at.codingResult || {};
//                     const passed = (res?.summary?.passedCount ?? res?.passedCount ?? 0);
//                     const total = (res?.summary?.totalCount ?? res?.totalCount ?? (q.coding?.testCases?.length ?? 0));
//                     const atDate = at.submittedAt || at.createdAt || null;
//                     return (
//                       <div key={idx} className="p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow flex flex-col gap-2">
//                         <div className="flex items-center justify-between">
//                           <div>
//                             <div className="font-bold text-slate-200">Run #{at.attemptNumber ?? (attempts.length - idx)}</div>
//                             {atDate && (
//                               <div className="text-xs text-slate-400">{new Date(atDate).toLocaleString()}</div>
//                             )}
//                           </div>
//                           <div className="text-right">
//                             <span className="text-xs text-slate-300 block">Passed</span>
//                             <span className="font-semibold text-green-400">{passed}/{total}</span>
//                           </div>
//                         </div>
//                         <div className="gap-2 flex flex-col mt-2">
//                           {(res?.results || []).map((r, i) => (
//                             <div
//                               key={i}
//                               className={`p-2 rounded-xl text-xs border ${r.passed ? 'bg-green-900 border-green-800 text-green-200' : 'bg-red-900 border-red-800 text-red-100'}`}
//                             >
//                               <div className="flex justify-between">
//                                 <div>Test {r.index ?? i+1} — {r.passed ? 'Passed' : 'Failed'}</div>
//                                 <div className="text-xs">{r.timeMs ? `${r.timeMs}ms` : ''}</div>
//                               </div>
//                               {r.stdout && (
//                                 <div className="mt-1 whitespace-pre-wrap break-words">
//                                   <span className="font-bold">Stdout:</span> {String(r.stdout).slice(0, 500)}
//                                 </div>
//                               )}
//                               {r.stderr && (
//                                 <div className="mt-1 text-red-300 whitespace-pre-wrap break-words">
//                                   <span className="font-bold">Stderr:</span> {String(r.stderr).slice(0, 500)}
//                                 </div>
//                               )}
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               )}
//             </div>
//           );
//         })()
//       }
//     </section>
//   </section>
// );
// }
// --- replace your CodingCard component with this version ---
import React, { useState, useCallback } from "react";
import { updateAnswer, runCode, fetchCodingAttempts } from "../../src/Redux/ExamLog/action";
import { toast } from "react-toastify";

/*
 * Professional CodingCard Editor Component
 * - Preserves input prompt for stdin codes
 * - Shows output/error in console
 * - Displays attempts and allows language/code changes without losing info
*/
export function CodingCard({
  q,
  codingState,
  setCodingState,
  codingAttempts,
  codingLoading,
  dispatch,
  studentExamId,
  setDebugText, // compatibility
  setShowDebugOverlay, // compatibility
}) {
  // Editor/Console state
  const [consoleOut, setConsoleOut] = useState("Your output will appear here...");
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [stdinTemp, setStdinTemp] = useState("");

  // Utility: identify if code likely needs input
  const codeProbablyNeedsInput = (code = "", language = "") => {
    const c = code.toLowerCase();
    const l = (language || "").toLowerCase();

    // Generic hints
    const generic = /(stdin|readline|enter input|provide input|read line)/.test(c);
    // Language specific detection
    const py = /input\s*\(/.test(c);
    const js = /fs\.readfilesync|process\.stdin/i.test(code);
    const java = /(new\s+scanner\s*\(|scanner\s*\(|\.next(int|long|double|line)?\s*\()/i.test(code);
    const cpp = /(cin\s*>>|scanf\s*\(|getline\s*\()/i.test(code);
    const cLang = /scanf\s*\(|getchar\s*\(|gets\s*\(/i.test(code);
    const go = /bufio\.newreader|fmt\.scan(?:(?:f|ln)?\s*\()/i.test(code);
    const rust = /std::io::stdin|read_line\s*\(/i.test(code);

    // By language prop
    const byLang =
      (l.startsWith("py") && py) ||
      (l.includes("javascript") || l.includes("node") ? js : false) ||
      (l.includes("java") && java) ||
      (l.includes("cpp") && cpp) ||
      (l === "c" && cLang) ||
      (l.startsWith("go") && go) ||
      (l.includes("rust") && rust);

    return generic || byLang || py || js || java || cpp || cLang || go || rust;
  };

  // Utility: identify post-run output indicating input needed
  const looksLikeNeedsInput = (stdout = "", stderr = "") => {
    const t = `${stdout}\n${stderr}`.toLowerCase();
    return (
      /eoferror|eof when reading a line|need.*input|waiting for input|no input provided/.test(t) ||
      /readline.*(failed|error)|stdin.*(not provided|empty)/.test(t) ||
      /scanf|cin|stdin.*error|bad file descriptor.*stdin/.test(t)
    );
  };

  // Get current language
  const languageOf = () =>
    codingState[q._id]?.language || q.coding?.defaultLanguage || "javascript";

  // Placeholder input per lang
  const placeholderForLang = () => {
    const l = languageOf().toLowerCase();
    if (["python", "javascript", "java", "cpp", "c", "go"].some(lang => l.startsWith(lang) || l.includes(lang))) {
      return "e.g.\n2 3";
    }
    return "Enter input as your program expects…";
  };

  // Change code
  const handleCodingChange = useCallback(
    (qId, newCode) => {
      setCodingState(s => ({
        ...s,
        [qId]: { ...(s[qId] || {}), code: newCode },
      }));
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

  // Change language
  const handleCodingLanguageChange = useCallback(
    (qId, lang) => {
      setCodingState(s => ({
        ...s,
        [qId]: { ...(s[qId] || {}), language: lang },
      }));
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

  // CODE RUNNER
  const doRun = useCallback(
    async (mode = "evaluation", stdinToUse = "") => {
      const qId = q._id;
      const state = codingState[qId] || {};
      const code = (state.code ?? "").trim();
      const language = languageOf();

      if (!studentExamId) {
        toast.error("Exam not started yet");
        return null;
      }
      if (!code) {
        toast.error("Write some code before running.");
        return null;
      }

      const runToastId = toast.info(stdinToUse ? "Running with input..." : "Running...", {
        autoClose: false,
      });

      try {
        const resp = await dispatch(
          runCode({
            studentExamId,
            questionId: qId,
            code,
            language,
            stdin: stdinToUse,
            mode,
          })
        );

        toast.dismiss(runToastId);
        toast.success("Run completed");

        let stdout = "";
        let stderr = "";

        if (resp?.attempt) {
          const r = resp.attempt.result || resp.attempt.codingResult || {};
          stdout = String(
            r.stdout ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stdout || "").join("\n") : "")
          ).trim();
          stderr = String(
            r.stderr ?? (Array.isArray(r.results) ? r.results.map(rr => rr.stderr || "").join("\n") : "")
          ).trim();
        } else if (resp?.result) {
          const r = resp.result;
          stdout = String(
            r.stdout ?? (Array.isArray(r.tests) ? r.tests.map(t => t.stdout || "").join("\n") : "")
          ).trim();
          stderr = String(r.stderr ?? "").trim();
        } else {
          stdout = String(resp?.stdout ?? resp?.runner?.stdout ?? "").trim();
          stderr = String(resp?.stderr ?? resp?.runner?.stderr ?? "").trim();
        }

        const outText = `Stdout:\n${stdout || "(empty)"}\n\nStderr:\n${stderr || "(empty)"}`;
        setConsoleOut(outText);
        setDebugText?.(outText);

        return { stdout, stderr };
      } catch (err) {
        toast.dismiss(runToastId);
        const msg = err?.response?.data?.message || err?.message || "Run failed";
        toast.error(msg);
        setConsoleOut(`Error:\n${msg}`);
        return { error: msg };
      }
    },
    [dispatch, studentExamId, codingState, q]
  );

  // Main run button logic
  const handleRunFirst = useCallback(async () => {
    const qId = q._id;
    const state = codingState[qId] || {};
    const code = state.code ?? "";
    const lang = languageOf();

    if (codeProbablyNeedsInput(code, lang) && !stdinTemp.trim()) {
      setAwaitingInput(true);
      setConsoleOut("Program appears to read input.\n\n▶ Provide input below and click \"Run with Input\".");
      return;
    }

    const res = await doRun("evaluation", "");
    if (!res) return;

    if (looksLikeNeedsInput(res.stdout, res.stderr)) {
      setAwaitingInput(true);
      setConsoleOut(prev =>
        `${prev}\n\n▶ Program requested input. Provide input below and click "Run with Input".`
      );
      return;
    }

    await dispatch(fetchCodingAttempts({ studentExamId, questionId: qId })).catch(() => { });
    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: { ...state, code: state.code ?? "", language: lang },
      })
    );
  }, [codingState, q, stdinTemp, doRun, dispatch, studentExamId]);

  // Run with input provided in prompt
  const handleRunWithInput = useCallback(async () => {
    const qId = q._id;
    const state = codingState[qId] || {};
    const lang = languageOf();

    const res = await doRun("debug", stdinTemp);
    if (!res) return;

    dispatch(
      updateAnswer({
        studentExamId,
        questionId: qId,
        answer: { ...state, code: state.code ?? "", language: lang, stdin: stdinTemp },
      })
    );
    await dispatch(fetchCodingAttempts({ studentExamId, questionId: qId })).catch(() => { });
    setAwaitingInput(false);
  }, [codingState, q, stdinTemp, doRun, dispatch, studentExamId]);

  // UI
  return (
    <section className="bg-white border border-slate-200 rounded-2xl">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm">
          <button className="font-semibold text-sky-700">Editor</button>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Console</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={languageOf()}
            onChange={e => handleCodingLanguageChange(q._id, e.target.value)}
            className="hidden sm:block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            {(q.coding?.allowedLanguages || ["javascript"]).map(lang => (
              <option value={lang} key={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            onClick={handleRunFirst}
            disabled={codingLoading}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            {codingLoading ? "Running..." : "Run"}
          </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 p-4 sm:p-5">
        {/* Editor */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200">
            <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-200">
              {"// Your code here"}
            </div>
            <textarea
              rows={14}
              value={codingState[q._id]?.code ?? ""}
              onChange={e => handleCodingChange(q._id, e.target.value)}
              className="w-full p-4 rounded-b-xl bg-white text-[13px] font-mono text-slate-800 focus:outline-none"
              placeholder={q.coding?.starterCodes?.[0]?.code || "Write your code here..."}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const st = codingState[q._id] || {};
                dispatch(
                  updateAnswer({
                    studentExamId,
                    questionId: q._id,
                    answer: { ...st, code: st.code || "" },
                  })
                );
                toast.info("Code saved");
              }}
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300"
            >
              Save
            </button>
            <button
              onClick={() =>
                dispatch(fetchCodingAttempts({ studentExamId, questionId: q._id })).catch(() => {})
              }
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300"
            >
              Refresh
            </button>
          </div>
        </div>
        {/* Console + Attempts */}
        <div className="flex flex-col gap-4">
          {/* Attempts left */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Attempts left:</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              {(() => {
                const info = codingAttempts[q._id] || {};
                const remaining =
                  typeof info.remaining === "number"
                    ? info.remaining
                    : (q.coding?.maxRunAttempts ?? 3) - (info.attempts?.length || 0);
                return remaining;
              })()}
              /
              {(() => {
                const info = codingAttempts[q._id] || {};
                return typeof info.maxAttempts === "number"
                  ? info.maxAttempts
                  : q.coding?.maxRunAttempts ?? 3;
              })()}
            </span>
          </div>
          {/* Console output */}
          <div className="rounded-xl border border-slate-200">
            <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-200">Console</div>
            <pre className="min-h-[240px] p-3 text-[13px] font-mono text-slate-800 whitespace-pre-wrap break-words">
              {consoleOut}
            </pre>
          </div>
          {/* Input prompt if program needs input */}
          {awaitingInput && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
              <div className="text-sm font-medium text-amber-800 mb-2">
                Program requested input
              </div>
              <textarea
                rows={4}
                value={stdinTemp}
                onChange={e => setStdinTemp(e.target.value)}
                className="w-full rounded-lg border border-amber-300 bg-white p-2 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder={placeholderForLang()}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleRunWithInput}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                >
                  Run with Input
                </button>
                <button
                  onClick={() => { setAwaitingInput(false); setStdinTemp(""); }}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Recent runs */}
          {(() => {
            const info = codingAttempts[q._id] || {};
            const errMsg = info.error || null;
            const attempts = info.attempts || [];
            if (!errMsg && !attempts.length) return null;
            return (
              <div className="rounded-xl border border-slate-200">
                <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-200">
                  Recent Runs
                </div>
                <div className="max-h-48 overflow-auto divide-y divide-slate-100">
                  {errMsg && <div className="p-3 text-xs text-red-600 bg-red-50">{String(errMsg)}</div>}
                  {attempts
                    .slice()
                    .reverse()
                    .map((at, i) => {
                      const res = at.result || at.codingResult || {};
                      const passed = res?.summary?.passedCount ?? res?.passedCount ?? 0;
                      const total = res?.summary?.totalCount ?? res?.totalCount ?? (q.coding?.testCases?.length ?? 0);
                      const atDate = at.submittedAt || at.createdAt || null;
                      return (
                        <div key={i} className="p-3 text-xs text-slate-700 flex items-center justify-between">
                          <div>
                            <div className="font-semibold">Run #{at.attemptNumber ?? i + 1}</div>
                            {atDate && (
                              <div className="text-[11px] text-slate-500">
                                {new Date(atDate).toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 block">Passed</span>
                            <span className="font-semibold">
                              {passed}/{total}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
