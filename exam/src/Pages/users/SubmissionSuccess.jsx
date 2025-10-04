import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const toISTPretty = (iso) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "long",
    timeStyle: "short",
    hourCycle: "h12",
  }).format(new Date(iso));

export default function SubmissionSuccess() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const {
    confirmationId = "—",
    submissionTime,
    examName = "Exam",
    attempted = {},
  } = state || {};

  const when = useMemo(
    () => (submissionTime ? toISTPretty(submissionTime) : "—"),
    [submissionTime]
  );

  const downloadReceipt = () => {
    const lines = [
      "Exam Submission Receipt",
      "------------------------",
      `Exam: ${examName}`,
      `Submitted at (IST): ${when}`,
      `Confirmation ID: ${confirmationId}`,
      "",
      "Attempts:",
      `- MCQ:    ${attempted.mcqAttempted ?? 0}/${attempted.mcqTotal ?? 0}`,
      `- Theory: ${attempted.theoryAttempted ?? 0}/${attempted.theoryTotal ?? 0}`,
      `- Coding: ${attempted.codingAttempted ?? 0}/${attempted.codingTotal ?? 0}`,
      "",
      "Note: Detailed scores will be emailed once available.",
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `submission_${confirmationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sky-100 flex items-center justify-center">
          <span className="text-3xl">✅</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
          Exam Submitted Successfully
        </h1>
        <p className="text-center text-slate-500 mb-6">
          Your answers have been recorded. A detailed result will be emailed to you.
        </p>

        {/* Summary card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5 mb-6">
          <div className="grid   gap-4 text-sm">
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
  <span className="text-slate-500">Exam Name</span>
  <span className="font-semibold sm:text-right break-words">{examName}</span>
</div>


            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
              <span className="text-slate-500">Submission Time</span>
              <span className="font-semibold">{when}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
              <span className="text-slate-500">Confirmation ID</span>
              <span className="font-semibold">#{confirmationId}</span>
            </div>
          </div>

          <hr className="my-4" />

          {/* Attempts only (no marks) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-slate-500 mb-1">MCQ Attempted</div>
              <div className="text-lg font-bold">
                {attempted.mcqAttempted ?? 0}/{attempted.mcqTotal ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-slate-500 mb-1">Theory Attempted</div>
              <div className="text-lg font-bold">
                {attempted.theoryAttempted ?? 0}/{attempted.theoryTotal ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-slate-500 mb-1">Coding Attempted</div>
              <div className="text-lg font-bold">
                {attempted.codingAttempted ?? 0}/{attempted.codingTotal ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={downloadReceipt}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold"
            >
              ⬇️ Download Submission Receipt
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate("/results")}
            className="px-5 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700"
          >
            View Results
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
