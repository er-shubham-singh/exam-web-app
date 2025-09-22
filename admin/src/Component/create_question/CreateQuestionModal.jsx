// CreateQuestionModal.jsx
import React, { useCallback, useEffect, useState } from "react";
import McqForm from "../create_question/McqForm";
import TheoryForm from "../create_question/TheoryForm";
import CodingForm from "../create_question/CodingForm";
const ModalShell = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal container - constrain overall height so it never overflows viewport */}
      <div className="relative w-full max-w-5xl mx-4 bg-gray-900 rounded-lg shadow-xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg md:text-xl font-semibold text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Close modal">✕</button>
          </div>
        </div>

        {/* Body: limit height and make scrollable */}
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {children}
        </div>

        {/* Sticky footer: keep visible even when body scrolls */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800 bg-gray-900">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700 text-white">Cancel</button>
        </div>
      </div>
    </div>
  );
};


export default function CreateQuestionModal({
  open,
  onClose,
  mode: initialMode = "MCQ",
  mcqForm,
  setMcqForm,
  theoryForm,
  setTheoryForm,
  codingForm,
  setCodingForm,
  handleSubmitMcq,
  handleSubmitTheory,
  handleSubmitCoding,
  qLoading = false,
  addStarterCode,
  updateStarterCode,
  removeStarterCode,
  addTestCase,
  updateTestCase,
  removeTestCase,
  editingId,
}) {
  // local mode so user can toggle inside modal regardless of parent prop
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    // if parent changes initialMode while modal open, sync it
    setMode(initialMode || "MCQ");
  }, [initialMode, open]);

  // Local defaults for reset actions (self-contained)
  const defaultMcq = { domain: mcqForm?.domain || "", questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 };
  const defaultTheory = { domain: theoryForm?.domain || "", questionText: "", theoryAnswer: "", marks: 5 };

  // Helper to call parent's submit handler and close modal if resolved successfully.
  // We assume parent handlers return a Promise and will reject / throw on failure.
  const submitAndClose = useCallback(async (submitFn, e) => {
    // allow the submit handler to use the event
    try {
      const maybePromise = submitFn?.(e);
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
      // success -> close modal
      onClose?.();
    } catch (err) {
      // don't close on error; show toast is parent's responsibility
      // optional: console.warn(err);
    }
  }, [onClose]);

  // Renders the correct form with submit wrappers that auto-close on success.
  return (
    <ModalShell open={open} onClose={onClose} title={editingId ? "Edit Question" : "Create Question"}>
      <div className="space-y-4">
        {/* Mode toggles inside modal so user can switch forms */}
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            onClick={() => setMode("MCQ")}
            className={`py-2 px-4 rounded-full font-medium ${mode === "MCQ" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Multiple Choice
          </button>
          <button
            type="button"
            onClick={() => setMode("THEORY")}
            className={`py-2 px-4 rounded-full font-medium ${mode === "THEORY" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Theory
          </button>
          <button
            type="button"
            onClick={() => setMode("CODING")}
            className={`py-2 px-4 rounded-full font-medium ${mode === "CODING" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
          >
            Coding
          </button>
        </div>

        {/* Forms */}
        {mode === "MCQ" && (
          <McqForm
            value={mcqForm}
            onChange={setMcqForm}
            onSubmit={(e) => submitAndClose(handleSubmitMcq, e)}
            onReset={() => setMcqForm((p) => ({ ...defaultMcq, domain: p?.domain || defaultMcq.domain }))}
            loading={qLoading}
          />
        )}

        {mode === "THEORY" && (
          <TheoryForm
            value={theoryForm}
            onChange={setTheoryForm}
            onSubmit={(e) => submitAndClose(handleSubmitTheory, e)}
            onReset={() => setTheoryForm((p) => ({ ...defaultTheory, domain: p?.domain || defaultTheory.domain }))}
            loading={qLoading}
          />
        )}

        {mode === "CODING" && (
          <CodingForm
            codingForm={codingForm}
            setCodingForm={setCodingForm}
            handleSubmitCoding={(e) => submitAndClose(handleSubmitCoding, e)}
            addStarterCode={addStarterCode}
            updateStarterCode={updateStarterCode}
            removeStarterCode={removeStarterCode}
            addTestCase={addTestCase}
            updateTestCase={updateTestCase}
            removeTestCase={removeTestCase}
            editingId={editingId}
            mode={mode}
          />
        )}
      </div>
    </ModalShell>
  );
}
