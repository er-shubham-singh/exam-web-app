// services/codeRunner.service.js
import axios from "axios";

/**
 * Run code using Piston API
 * @param {Object} options
 * @param {string} options.language - e.g. "javascript"
 * @param {string} options.code - student code
 * @param {Array} [options.tests] - array of test cases: [{input, expected, score}]
 * @param {number} [options.timeLimitMs=2000] - execution timeout
 * @param {string} [options.stdin] - optional manual stdin (student custom input)
 * @param {"evaluation"|"debug"} [options.mode="evaluation"]
 */
export async function runCodeOnJudge({
  language,
  code,
  tests = [],
  timeLimitMs = 2000,
  stdin = "",
  mode = "evaluation",
}) {
  try {
    // ✅ fetch runtime
    const versionsResp = await axios.get(`https://emkc.org/api/v2/piston/runtimes`);
    const runtime = versionsResp.data.find(r => r.language === language);
    const version = runtime ? runtime.version : "latest";

    // --- DEBUG MODE: run once with stdin ---
    if (mode === "debug") {
      const payload = {
        language,
        version,
        files: [{ content: code }],
        stdin: (typeof stdin !== "undefined" && stdin !== null) ? String(stdin) : "",
      };
      console.log("RUN_CODE_ON_JUDGE -> POST /piston/execute payload:", {
        language: payload.language,
        version: payload.version,
        stdinPreview: payload.stdin.length > 200 ? payload.stdin.slice(0,200) + "..." : payload.stdin,
        filesPreview: payload.files.map(f => (f.content || "").slice(0,120))
      });
      const runResp = await axios.post("https://emkc.org/api/v2/piston/execute",payload);

      return {
        status: "debug",
        summary: { passedCount: null, totalCount: null }, // not graded
        results: [
          {
            index: 0,
            passed: null, // not applicable
            stdout: runResp.data.run.stdout.trim(),
            stderr: runResp.data.run.stderr.trim(),
            timeMs: runResp.data.run.time || 0,
            memoryMB: runResp.data.run.memory || 0,
          },
        ],
        stdout: runResp.data.run.stdout.trim(),
        stderr: runResp.data.run.stderr.trim(),
      };
    }

    // --- EVALUATION MODE: run against each test case ---
    const results = [];
    let passedCount = 0;

    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const runResp = await axios.post("https://emkc.org/api/v2/piston/execute", {
        language,
        version,
        files: [{ content: code }],
        stdin: (typeof t.input !== "undefined" && t.input !== null) ? String(t.input) : "",

      });

      const stdout = runResp.data.run.stdout.trim();
      const stderr = runResp.data.run.stderr.trim();

      const passed = stdout === (t.expected || "").trim();
      if (passed) passedCount++;

      results.push({
        index: i,
        passed,
        stdout,
        stderr,
        timeMs: runResp.data.run.time || 0,
        memoryMB: runResp.data.run.memory || 0,
      });
    }

    return {
      status: passedCount === tests.length ? "success" : "failed",
      summary: { passedCount, totalCount: tests.length },
      results,
    };
  } catch (err) {
    console.error("Piston API failed:", err.message);
    return {
      status: "failed",
      summary: { passedCount: 0, totalCount: mode === "debug" ? 1 : tests.length },
      results: (mode === "debug" ? [{}] : tests).map((_, i) => ({
        index: i,
        passed: false,
        stdout: "",
        stderr: "Runner error",
        timeMs: 0,
        memoryMB: 0,
      })),
    };
  }
}
