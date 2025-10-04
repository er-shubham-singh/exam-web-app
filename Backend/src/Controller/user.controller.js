import * as userService from "../Services/user.service.js";
import pLimit from "p-limit";
import { registerUserService } from "../Services/user.service.js";

// ---------------- REGISTER ----------------
export const registerUserController = async (req, res) => {
  try {
    const { user, emailStatus } = await userService.registerUserService(req.body);

    const ok = emailStatus !== "FAILED";
    return res.status(201).json({
      success: true,
      message: ok
        ? "User registered successfully. Roll number & schedule sent to email."
        : "User registered. Email sending failed — please contact support or try again later.",
      data: user,
      emailStatus, // "SENT" | "FAILED"
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to register user",
    });
  }
};


// ---------------- LOGIN ----------------
export const loginController = async (req, res) => {
  try {
    const data = await userService.loginService(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};

// for handeling bulk data
const isYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isHHmm = (s) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(s || ""));
const toIstIso = (dateStr, timeStr) => `${dateStr}T${timeStr}:00+05:30`;

// OPTIONAL: accept "2 PM", "2:30 pm" and convert to "14:30".
// Comment out if you want strictly HH:mm from the sheet.
const normalizeTime = (raw) => {
  const v = String(raw || "").trim().toUpperCase();
  if (isHHmm(v)) return v; // already 24h
  // patterns like "2 PM", "2:30 PM", "02 PM"
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];
  if (hh === 12 && ampm === "AM") hh = 0;        // 12AM -> 00
  if (hh !== 12 && ampm === "PM") hh = hh + 12;  // 1..11PM -> 13..23
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const bulkRegisterController = async (req, res) => {
  let { rows = [], batchSize = 50, concurrency = 5 } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "rows must be a non-empty array" });
  }

  // clamp knobs
  batchSize = Math.max(5, Math.min(200, Number(batchSize) || 50));
  concurrency = Math.max(1, Math.min(10, Number(concurrency) || 5));

  // required fields
  const required = ["name", "email", "category", "domain", "examDate", "examTime"];
  const invalidIndex = rows.findIndex(r => !required.every(k => r?.[k]));
  if (invalidIndex !== -1) {
    return res.status(400).json({
      success: false,
      message: `Row ${invalidIndex + 1} missing required fields (${required.join(", ")})`,
    });
  }

  // dedupe within the same upload by (email + domain)
  const seen = new Set();
  rows = rows.filter((r, idx) => {
    const key = `${String(r.email).toLowerCase().trim()}::${String(r.domain).trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // validate formats (after optional normalization)
  const prepared = rows.map((r, i) => {
    const examDate = String(r.examDate).trim();
    let examTime = String(r.examTime).trim();

    // OPTIONAL normalization: uncomment if you want to accept "2 PM" inputs
    const nt = normalizeTime(examTime);
    if (nt) examTime = nt;

    return { ...r, _row: i + 1, examDate, examTime };
  });

  const badIdx = prepared.findIndex(r => !isYYYYMMDD(r.examDate) || !isHHmm(r.examTime));
  if (badIdx !== -1) {
    return res.status(400).json({
      success: false,
      message: `Row ${prepared[badIdx]._row} has invalid examDate/examTime. Use examDate=YYYY-MM-DD, examTime=HH:mm (24h).`,
    });
  }

  const limit = pLimit(concurrency);
  const results = [];
  let processed = 0;

  const chunked = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  try {
    for (const chunk of chunked(prepared, batchSize)) {
      const tasks = chunk.map((row, i) =>
        limit(async () => {
          try {
            const examAt = toIstIso(row.examDate, row.examTime);
            const when = new Date(examAt);
            if (isNaN(when.getTime())) throw new Error(`Invalid exam datetime after parsing: ${examAt}`);

            const payload = {
              name: String(row.name || "").trim(),
              email: String(row.email || "").trim().toLowerCase(),
              category: String(row.category || "").trim(),
              domain: String(row.domain || "").trim(),
              examAt,
            };

            const resp = await registerUserService(payload);

            results.push({
              index: processed + i,
              email: row.email,
              status: "OK",
              examAt,
              emailStatus: resp.emailStatus,
              messageId: resp.messageId || null,   // ← include messageId
              userId: resp.user?._id,
              rollNumber: resp.user?.rollNumber,
            });
          } catch (err) {
            results.push({
              index: processed + i,
              email: row.email,
              status: "ERROR",
              error: (err?.message || "Unknown error").slice(0, 300),
            });
          }
        })
      );

      await Promise.all(tasks);
      processed += chunk.length;

      // tiny pause between chunks to be gentle with DB/ESP (tune 250–800ms)
      await sleep(400);
    }

    results.sort((a, b) => a.index - b.index);

    return res.json({
      success: true,
      total: prepared.length,
      ok: results.filter(r => r.status === "OK").length,
      failed: results.filter(r => r.status === "ERROR").length,
      results,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
