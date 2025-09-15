import React from "react";

export default function LeaveExamModal({ open, onStay, onLeave }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[520px] max-w-[92vw] rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
        <div className="px-6 py-5 border-b border-slate-800">
          <h3 className="text-xl font-bold">Leave exam?</h3>
          <p className="text-sm text-slate-300 mt-1">
            Your exam is in progress. Refreshing or leaving may submit or
            invalidate your attempt. Are you sure you want to continue?
          </p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onStay}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600"
          >
            Stay on page
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700"
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}
