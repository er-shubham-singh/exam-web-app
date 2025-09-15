// src/Components/StudentDetailModal.jsx
import React, { useEffect } from "react";

const pillColors = {
  TAB_SWITCH: "bg-yellow-600",
  CAMERA_OFF: "bg-orange-600",
  EYE_OFF_SCREEN: "bg-blue-600",
  MULTIPLE_FACES: "bg-red-700",
  HAND_OBSTRUCTION: "bg-purple-600",
  DISCONNECT: "bg-gray-600",
  JOIN_EXAM: "bg-emerald-700",
  ANSWER_UPDATE: "bg-cyan-700",
  SUBMIT_EXAM: "bg-violet-700",
};

export default function StudentDetailModal({ open, onClose, student }) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !student) return null;

  const alerts = Array.isArray(student.alerts) ? student.alerts : [];
  const total = Number.isFinite(student.alertsTotal)
    ? student.alertsTotal
    : alerts.length;

  const infoRows = [
    ["Name", student.name || "—"],
    ["Email", student.email || "—"],
    ["Roll No.", student.rollNumber || "—"],
    ["Domain", student.domain || student.exam?.domain || "—"],
    ["Category", student.category || student.exam?.category || "—"],
    ["Exam", student.examTitle || student.exam?.title || "—"],
    ["Status", student.status || (student.online ? "Online" : "Offline")],
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose} // click outside
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-[900px] max-w-[95vw] h-[620px] max-h-[92vh] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()} // keep clicks inside from closing
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
          <div>
            <h3 className="text-xl font-bold">{student.name || "Student"}</h3>
            <p className="text-sm text-slate-300">{student.email}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-12 gap-0 h-[calc(100%-56px)]">
          {/* Left: identity */}
          <div className="col-span-5 p-6 overflow-y-auto border-r border-slate-800">
            <h4 className="text-lg font-semibold mb-4">Student Details</h4>
            <dl className="space-y-3">
              {infoRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="font-medium text-right">{String(v)}</dd>
                </div>
              ))}
            </dl>

            {/* Live preview if present in card */}
            <div className="mt-6">
              <h5 className="text-sm text-slate-400 mb-2">Live Camera</h5>
              <div className="w-full aspect-video bg-black/70 rounded-lg border border-slate-800 overflow-hidden">
                <video
                  id={`modal-video-${student.studentExamId}`}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              {/* Tip: in Mentor.jsx we’ll mirror the stream into this element when the modal opens */}
            </div>
          </div>

          {/* Right: activity */}
          <div className="col-span-7 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold">Activity</h4>
              <span className="text-xs text-slate-400">
                Showing last {alerts.length} of {total}
              </span>
            </div>

            {alerts.length === 0 ? (
              <p className="text-slate-400">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {alerts
                  .slice() // ensure not to mutate
                  .reverse()
                  .map((a, idx) => (
                    <li
                      key={`${a.type}-${a.timestamp}-${idx}`}
                      className="p-3 rounded-xl bg-slate-800 border border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${pillColors[a.type] || "bg-slate-600"}`}
                        >
                          {a.type}
                        </span>
                        <span className="text-xs text-slate-300">
                          {a.timestamp
                            ? new Date(a.timestamp).toLocaleString()
                            : "--"}
                        </span>
                      </div>
                      {a.issue && (
                        <p className="mt-2 text-sm text-slate-200">{a.issue}</p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
