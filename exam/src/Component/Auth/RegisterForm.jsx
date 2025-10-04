import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDomains } from "../../Redux/Domain/action";
import { registerUser } from "../../Redux/User/action"; // single-user thunk
import { toast } from "react-toastify";

// bulk helpers
import { setBulkRows, uploadBulk, clearBulk } from "../../Redux/User/action";

import * as XLSX from "xlsx";

// --- helpers for validation/formatting ---
const isYYYYMMDD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isHHmm = (s) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(s || ""));
const toIstIso = (dateStr, timeStr) => `${dateStr}T${timeStr}:00+05:30`;
// Excel serial -> JS Date (Excel's epoch: 1899-12-30 for XLSX lib)
const excelSerialToDate = (serial) => {
  // Handles full date serial (integer) or date+time serial (float)
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 1e-10; // tiny epsilon
  let totalSeconds = Math.floor(86400 * fractional_day);
  const seconds = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);
  const minutes = totalSeconds % 60;
  const hours = Math.floor(totalSeconds / 60);
  // build final JS Date in local tz
  const d = new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  );
  return d;
};

// JS Date -> "YYYY-MM-DD"
const toYyyyMmDd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// JS Date -> "HH:mm" (24h)
const toHhMm = (d) => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Accept "HH:mm", "h:mm AM/PM", "h AM/PM", Excel serials, etc. -> "HH:mm"
const normalizeTimeToHhMm = (val) => {
  if (val == null) return "";
  // 1) If it's a number, treat as Excel time serial
  if (typeof val === "number" && !Number.isNaN(val)) {
    const d = excelSerialToDate(val);
    return toHhMm(d);
  }
  // 2) If it's a Date object already
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return toHhMm(val);
  }
  // 3) String cases
  let s = String(val).trim();

  // Already HH:mm
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(s)) return s;

  // Try "h:mm AM/PM" or "h AM/PM"
  const ampm = s.toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let hh = parseInt(ampm[1], 10);
    const mm = parseInt(ampm[2] || "0", 10);
    const mer = ampm[3];
    if (hh === 12 && mer === "AM") hh = 0;         // 12 AM -> 00
    if (hh !== 12 && mer === "PM") hh += 12;       // 1..11 PM -> 13..23
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  // Try "HH:mm:ss"
  const hms = s.match(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
  if (hms) return `${hms[1]}:${hms[2]}`;

  // Try to parse generic Date string
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return toHhMm(parsed);

  return "";
};

// Accept "YYYY-MM-DD", Excel serials, Date -> "YYYY-MM-DD"
const normalizeDateToYyyyMmDd = (val) => {
  if (val == null) return "";
  if (typeof val === "number" && !Number.isNaN(val)) {
    const d = excelSerialToDate(val);
    return toYyyyMmDd(d);
  }
  if (val instanceof Date && !Number.isNaN(val.getTime?.())) {
    return toYyyyMmDd(val);
  }
  const s = String(val).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Sometimes CSVs have "DD/MM/YYYY" or "MM/DD/YYYY" — try parse
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return toYyyyMmDd(parsed);

  return "";
};


const RegisterForm = ({ onSwitch }) => {
  const dispatch = useDispatch();

  // ----- single user register state -----
  const { registerLoading: loading, error } = useSelector((s) => s.user);

  // ----- domain state -----
  const { domains, loading: domainLoading, error: domainError } = useSelector((s) => s.domain);

  // ----- bulk state -----
  const { bulkRows, bulkLoading, bulkError, bulkResults, bulkSummary } = useSelector((s) => s.user);

  const [mode, setMode] = useState("single"); // "single" | "bulk"

  // =========================
  // SINGLE REGISTER TAB
  // =========================
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    domain: "",
    examDate: "", // ← NEW
    examTime: "", // ← NEW
  });

  useEffect(() => {
    if (form.category) dispatch(fetchDomains(form.category));
  }, [form.category, dispatch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic presence checks
    if (!form.name || !form.email || !form.category || !form.domain) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!form.examDate || !form.examTime) {
      toast.error("Please select exam date and time.");
      return;
    }
    if (!isYYYYMMDD(form.examDate) || !isHHmm(form.examTime)) {
      toast.error("Invalid exam date/time. Use date=YYYY-MM-DD and time=HH:mm.");
      return;
    }

    const examAt = toIstIso(form.examDate, form.examTime);

    toast.promise(
      dispatch(registerUser({ ...form, examAt })), // send examAt to backend
      {
        pending: "Registering user and sending roll number...",
        success: {
          render({ data }) {
            return data?.emailStatus === "FAILED"
              ? "⚠️ User registered, but email sending failed."
              : "✅ Roll number & schedule sent to your email!";
          },
          autoClose: 4000,
        },
        error: {
          render({ data }) {
            return `❌ ${data?.response?.data?.message || "Failed to register user"}`;
          },
          autoClose: 4000,
        },
      }
    );

    setForm({
      name: "",
      email: "",
      category: "",
      domain: "",
      examDate: "",
      examTime: "",
    });
  };

  // =========================
  // BULK IMPORT TAB
  // =========================
  const [bulkCategory, setBulkCategory] = useState("");
  const [batchSize, setBatchSize] = useState(25);
  const [concurrency, setConcurrency] = useState(3);
  const [localBulkError, setLocalBulkError] = useState(null);

  useEffect(() => {
    if (bulkCategory) {
      dispatch(fetchDomains(bulkCategory));
      dispatch(clearBulk());
    }
  }, [bulkCategory, dispatch]);

  // map visible domain string -> _id
  const domainMap = useMemo(() => {
    const m = new Map();
    (domains || []).forEach((d) => m.set(String(d.domain).trim().toLowerCase(), d._id));
    return m;
  }, [domains]);

  const parseFile = async (file) => {
    setLocalBulkError(null);
    try {
      if (!bulkCategory) throw new Error("Choose a category first.");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }); // [{name,email,domain,examDate,examTime}]

      if (!rows.length) throw new Error("Sheet is empty.");
      const headers = Object.keys(rows[0]).map((h) => h.toLowerCase());
      const must = ["name", "email", "domain", "examdate", "examtime"];
      const missing = must.filter((m) => !headers.includes(m));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

// normalize + map domain -> _id + fix date/time to canonical formats
const cleaned = rows.map((r, idx) => {
  const domText = String(r.domain ?? "").trim().toLowerCase();
  const domId = domainMap.get(domText);

  // Handle Excel serials, AM/PM, etc.
  const rawDate = r.examDate ?? r.examdate ?? "";
  const rawTime = r.examTime ?? r.examtime ?? "";

  const examDate = normalizeDateToYyyyMmDd(rawDate);
  const examTime = normalizeTimeToHhMm(rawTime);

  return {
    name: String(r.name || "").trim(),
    email: String(r.email || "").trim(),
    category: bulkCategory,
    domain: domId || "",
    examDate,
    examTime,
    __row: idx + 2,
    __domainText: r.domain,
    __rawTime: rawTime,
  };
});


      // validate each row
const invalid = cleaned.filter(
  (x) =>
    !x.name ||
    !x.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email) ||
    !x.domain ||
    !x.examDate ||
    !x.examTime ||
    !isYYYYMMDD(x.examDate) ||
    !isHHmm(x.examTime)
);

if (invalid.length) {
  const ex = invalid
    .slice(0, 5)
    .map((x) => `Row ${x.__row} (email: ${x.email}, domain: ${x.__domainText}, date: ${x.examDate || "?"}, time: ${x.__rawTime || x.examTime || "?"})`)
    .join(", ");
  throw new Error(
    `Found ${invalid.length} invalid row(s). Use examDate=YYYY-MM-DD and examTime=HH:mm (24h). Example: "2:30 PM" → "14:30". e.g., ${ex}`
  );
}


      // strip helpers
      const finalRows = cleaned.map(({ __row, __domainText, ...rest }) => rest);
      dispatch(setBulkRows(finalRows));
      toast.success(`Parsed ${finalRows.length} rows.`);
    } catch (e) {
      setLocalBulkError(e.message || "Failed to parse file");
      toast.error(e.message || "Failed to parse file");
    }
  };

  const startBulkUpload = async () => {
    if (!bulkRows?.length) {
      toast.error("No rows to upload.");
      return;
    }
    setLocalBulkError(null);
    await toast.promise(
      dispatch(uploadBulk({ rows: bulkRows, batchSize, concurrency })), // rows include examDate & examTime
      {
        pending: "Uploading & sending emails...",
        success: "Bulk upload completed.",
        error: {
          render({ data }) {
            return data?.message || "Bulk upload failed";
          },
        },
      }
    );
  };

  const failedRows = useMemo(
    () => (bulkResults || []).filter((r) => r.status === "ERROR"),
    [bulkResults]
  );

  const downloadTemplateHref = useMemo(() => {
    const csv =
      "name,email,domain,examDate,examTime\n" +
      "John Doe,john@example.com,example.com,2025-10-12,14:30\n";
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`px-4 py-2 rounded ${mode === "single" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200"}`}
        >
          Single Register
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`px-4 py-2 rounded ${mode === "bulk" ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200"}`}
        >
          Bulk Import
        </button>
      </div>

      {mode === "single" ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <h1 className="text-3xl font-bold text-white text-center">Register</h1>
          <p className="text-center text-slate-400 mb-4">Fill in your details to register.</p>

          {/* Name */}
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Name"
            className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
            required
          />

          {/* Email */}
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
            required
          />

          {/* Category */}
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
            required
          >
            <option value="">Select Category</option>
            <option value="Technical">Technical</option>
            <option value="Non-Technical">Non-Technical</option>
          </select>

          {/* Domain */}
          <select
            name="domain"
            value={form.domain}
            onChange={handleChange}
            className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
            required
            disabled={!form.category || domainLoading}
          >
            <option value="">
              {!form.category ? "Select Category first" : domainLoading ? "Loading..." : "Select Domain"}
            </option>
            {domains.map((d) => (
              <option key={d._id} value={d._id}>
                {d.domain}
              </option>
            ))}
          </select>
          {domainError && <p className="text-red-400">{domainError}</p>}

          {/* Exam Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Exam Date (YYYY-MM-DD)</label>
              <input
                type="date"
                name="examDate"
                value={form.examDate}
                onChange={handleChange}
                className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Exam Time (HH:mm, 24h)</label>
              <input
                type="time"
                name="examTime"
                value={form.examTime}
                onChange={handleChange}
                className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
                step="60"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg"
          >
            {loading ? "Registering..." : "Register"}
          </button>

          <p className="text-center text-slate-400">
            Already registered?{" "}
            <button type="button" onClick={onSwitch} className="text-sky-400 hover:underline">
              Login here
            </button>
          </p>

          {error && <p className="text-red-400 text-center">{error}</p>}
        </form>
      ) : (
        // =========================
        // BULK TAB UI
        // =========================
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white text-center">Bulk Import</h1>
          <p className="text-center text-slate-400 mb-4">
            Upload a sheet with <b>name, email, domain, examDate, examTime</b>. Pick the category for all rows.
          </p>

          {/* Pick category for this bulk */}
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
          >
            <option value="">Select Category</option>
            <option value="Technical">Technical</option>
            <option value="Non-Technical">Non-Technical</option>
          </select>

          {/* Domains loaded info */}
          {bulkCategory && (
            <p className="text-sm text-slate-400">
              Loaded domains: {domainLoading ? "Loading..." : domains.map((d) => d.domain).join(", ") || "None"}
            </p>
          )}

          {/* File input */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={!bulkCategory || domainLoading}
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
              className="text-slate-200"
            />
            <a className="text-sky-400 underline" href={downloadTemplateHref} download="bulk-template.csv">
              Download CSV template
            </a>
          </div>

          {/* Options */}
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-300">Batch size</label>
              <input
                type="number"
                min={5}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="border border-slate-600 bg-slate-700 text-white px-2 py-1 rounded w-28"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300">Concurrency</label>
              <input
                type="number"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="border border-slate-600 bg-slate-700 text-white px-2 py-1 rounded w-28"
              />
            </div>

            <button
              onClick={startBulkUpload}
              disabled={!bulkRows?.length || bulkLoading}
              className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50"
            >
              {bulkLoading ? "Uploading..." : `Send ${bulkRows.length} emails`}
            </button>
          </div>

          {/* Errors */}
          {(localBulkError || bulkError) && (
            <div className="text-red-400 text-sm">{localBulkError || bulkError}</div>
          )}

          {/* Preview */}
          {bulkRows?.length > 0 && (
            <>
              <div className="text-sm text-slate-300">
                Parsed rows: <b>{bulkRows.length}</b> (showing first 10)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-700">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="border border-slate-700 px-2 py-1">#</th>
                      <th className="border border-slate-700 px-2 py-1">Name</th>
                      <th className="border border-slate-700 px-2 py-1">Email</th>
                      <th className="border border-slate-700 px-2 py-1">Category</th>
                      <th className="border border-slate-700 px-2 py-1">DomainId</th>
                      <th className="border border-slate-700 px-2 py-1">Exam Date</th>
                      <th className="border border-slate-700 px-2 py-1">Exam Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.slice(0, 10).map((r, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-700 px-2 py-1">{idx + 1}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.name}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.email}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.category}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.domain}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.examDate}</td>
                        <td className="border border-slate-700 px-2 py-1">{r.examTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Results */}
          {bulkSummary && (
            <div className="space-y-2">
              <div className="mt-2 text-sm text-slate-200">
                <b>Summary:</b> Total {bulkSummary.total} | OK {bulkSummary.ok} | Failed {bulkSummary.failed}
              </div>

              {bulkResults?.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-700">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="border border-slate-700 px-2 py-1">#</th>
                        <th className="border border-slate-700 px-2 py-1">Email</th>
                        <th className="border border-slate-700 px-2 py-1">Status</th>
                        <th className="border border-slate-700 px-2 py-1">Email Status</th>
                        <th className="border border-slate-700 px-2 py-1">Roll</th>
                        <th className="border border-slate-700 px-2 py-1">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.slice(0, 100).map((r, i) => (
                        <tr key={i}>
                          <td className="border border-slate-700 px-2 py-1">{r.index + 1}</td>
                          <td className="border border-slate-700 px-2 py-1">{r.email}</td>
                          <td className="border border-slate-700 px-2 py-1">{r.status}</td>
                          <td className="border border-slate-700 px-2 py-1">{r.emailStatus || "-"}</td>
                          <td className="border border-slate-700 px-2 py-1">{r.rollNumber || "-"}</td>
                          <td className="border border-slate-700 px-2 py-1">{r.error || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Download failed rows */}
              {failedRows.length > 0 && (
                <a
                  className="text-sky-400 underline"
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                    "email,error\n" +
                      failedRows
                        .map((f) => `${f.email},"${(f.error || "").replace(/"/g, '""')}"`)
                        .join("\n")
                  )}`}
                  download="failed-rows.csv"
                >
                  Download failed rows
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
