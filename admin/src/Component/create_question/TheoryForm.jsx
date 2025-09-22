import React from "react";

const TheoryForm = ({ value, onChange, onSubmit, loading, onReset }) => {
  const handleField = (e) => onChange({ ...value, [e.target.name]: e.target.value });

  return (
    <form onSubmit={onSubmit}>
      {/* Theory Question */}
      <div className="mb-4">
        <label className="block text-sm mb-1">Theory Question</label>
        <textarea
          name="questionText"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          rows="3"
          placeholder="Enter theory question"
          value={value.questionText}
          onChange={handleField}
        />
      </div>

      {/* Expected/Model Answer (optional) */}
      <div className="mb-4">
        <label className="block text-sm mb-1">Expected Answer / Notes (optional)</label>
        <textarea
          name="theoryAnswer"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          rows="5"
          placeholder="Enter key points or model answer"
          value={value.theoryAnswer || ""}
          onChange={handleField}
        />
      </div>

      {/* Marks */}
      <div className="mb-6">
        <label className="block text-sm mb-1">Marks</label>
        <input
          type="number"
          min={0}
          name="marks"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          value={value.marks}
          onChange={handleField}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded text-white font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save Theory"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded text-white font-semibold transition-colors"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default TheoryForm;
