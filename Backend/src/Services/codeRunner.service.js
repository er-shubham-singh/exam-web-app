// services/codeRunner.service.js
import axios from "axios";


const LANGUAGE_MAP = {
  javascript: { piston: "javascript", filename: "main.js" },
  python: { piston: "python", filename: "main.py" },
  java: { piston: "java", filename: "Main.java" }, // require top-level class Main
  c: { piston: "c", filename: "main.c" },
  cpp: { piston: "cpp", filename: "main.cpp" },
};

async function getRuntimeVersion(language) {
  try {
    const versionsResp = await axios.get("https://emkc.org/api/v2/piston/runtimes", { timeout: 20000 });
    const runtime = versionsResp.data.find((r) => r.language === language);
    return runtime ? runtime.version : "latest";
  } catch (err) {
    // fallback to latest string
    return "latest";
  }
}

function buildFileObj(langKey, code) {
  const mapping = LANGUAGE_MAP[langKey];
  if (!mapping) {
    // fallback generic file
    return { name: "main.txt", content: code };
  }
  return { name: mapping.filename, content: code };
}

export async function runCodeOnJudge({
  language,
  code,
  tests = [],
  timeLimitMs = 2000,
  stdin = "",
  mode = "evaluation",
}) {
  // normalize language alias (allow "c++" -> "cpp", "js" -> "javascript")
  let langKey = (language || "").toString().toLowerCase();
  if (langKey === "c++") langKey = "cpp";
  if (langKey === "js") langKey = "javascript";
  if (!LANGUAGE_MAP[langKey]) {
    return {
      status: "failed",
      summary: { passedCount: 0, totalCount: Array.isArray(tests) ? tests.length : 0 },
      results: (Array.isArray(tests) ? tests : [null]).map((_, i) => ({
        index: i,
        passed: false,
        stdout: "",
        stderr: `Unsupported language: ${language}`,
        timeMs: 0,
        memoryMB: 0,
      })),
    };
  }

  try {
    // Resolve runtime version (best-effort)
    const version = await getRuntimeVersion(LANGUAGE_MAP[langKey].piston);

    // helper to call piston execute with filename included
    async function executeOnce({ input = "" } = {}) {
      const payload = {
        language: LANGUAGE_MAP[langKey].piston,
        version,
        files: [buildFileObj(langKey, code)],
        stdin: (typeof input !== "undefined" && input !== null) ? String(input) : "",
        // note: Piston supports args, compile_timeout, run_timeout depending on host; we avoid non-portable fields
      };

      const resp = await axios.post("https://emkc.org/api/v2/piston/execute", payload, {
        timeout: Math.max(30000, timeLimitMs + 10000),
      });
      return resp.data;
    }

    // DEBUG: run once with provided stdin and return raw stdout/stderr (no grading)
    if (mode === "debug") {
      const runResp = await executeOnce({ input: stdin });

      // Piston may include compile and run fields: { compile: {...}, run: {...} }
      const compileOut = runResp.compile ? (runResp.compile.stdout || runResp.compile.stderr || "").toString().trim() : "";
      const runOut = runResp.run || {};
      const stdout = (runOut.stdout || "").toString().trim();
      const stderr = (runOut.stderr || "").toString().trim();

      return {
        status: "debug",
        summary: { passedCount: null, totalCount: null },
        results: [
          {
            index: 0,
            passed: null,
            stdout,
            stderr,
            compileOutput: compileOut,
            timeMs: runOut.time || 0,
            memoryMB: runOut.memory || 0,
          },
        ],
        stdout,
        stderr,
        compileOutput: compileOut,
      };
    }

    // EVALUATION: run tests array
    const results = [];
    let passedCount = 0;

    // If no tests provided, still run once (useful fallback): treat as single test with given stdin
    const effectiveTests = Array.isArray(tests) && tests.length ? tests : [{ input: stdin || "", expected: "" }];

    for (let i = 0; i < effectiveTests.length; i++) {
      const t = effectiveTests[i] || {};
      const input = (typeof t.input !== "undefined" && t.input !== null) ? String(t.input) : "";

      let runResp;
      try {
        runResp = await executeOnce({ input });
      } catch (execErr) {
        // runtime/host error
        results.push({
          index: i,
          passed: false,
          stdout: "",
          stderr: `Execution error: ${String(execErr.message || execErr)}`,
          compileOutput: "",
          timeMs: 0,
          memoryMB: 0,
        });
        continue;
      }

        const compileOut = runResp.compile ? (runResp.compile.stdout || runResp.compile.stderr || "") : "";
  const runOut = runResp.run || {};
  const stdout = (runOut.stdout || "").toString().replace(/\r\n/g, "\n").trim();
  const stderr = (runOut.stderr || "").toString().trim();

      // compare trimmed lines by default (you can change compare logic later)
function normalizeOutput(str) {
  return (str == null ? "" : String(str))
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\s+/g, " ");
}

const expectedRaw =
  // choose the first non-empty of many likely keys
  (() => {
    if (t == null) return "";
    const tryKeys = ["expected", "expectedOutput", "output", "expected_stdout", "expectedOutputRaw", "stdout"];
    for (const k of tryKeys) {
      if (Object.prototype.hasOwnProperty.call(t, k) && t[k] !== null && typeof t[k] !== "undefined" && String(t[k]).trim() !== "") {
        return t[k];
      }
    }
    // also support older shape where test might be { expectedLines: [...] }
    if (Array.isArray(t.expectedLines) && t.expectedLines.length) {
      return t.expectedLines.join("\n");
    }
    return "";
  })();
  const expectedNormalized = normalizeOutput(expectedRaw);
const gotNormalized = normalizeOutput(stdout);
const CASE_INSENSITIVE = false; // set true if you want "Html" == "html"
const expectedForCompare = CASE_INSENSITIVE ? expectedNormalized.toLowerCase() : expectedNormalized;
const gotForCompare = CASE_INSENSITIVE ? gotNormalized.toLowerCase() : gotNormalized;

const passed = expectedForCompare !== "" && expectedForCompare === gotForCompare;
if (passed) passedCount++;

results.push({
  index: i,
  passed,
  stdout,
  stderr,
  compileOutput: compileOut ? String(compileOut).trim() : "",
  expectedRaw,            // raw value from test case (helps debug missing key)
  expectedNormalized,
  gotNormalized,
  timeMs: runOut.time || 0,
  memoryMB: runOut.memory || 0,
});
    }

    return {
      status: passedCount === effectiveTests.length ? "success" : "failed",
      summary: { passedCount, totalCount: effectiveTests.length },
      results,
    };
  } catch (err) {
    console.error("Piston API failed:", err && err.message ? err.message : err);
    return {
      status: "failed",
      summary: { passedCount: 0, totalCount: Array.isArray(tests) ? tests.length : 0 },
      results: (Array.isArray(tests) && tests.length ? tests : [{}]).map((_, i) => ({
        index: i,
        passed: false,
        stdout: "",
        stderr: "Runner error",
        compileOutput: "",
        timeMs: 0,
        memoryMB: 0,
      })),
    };
  }
}
