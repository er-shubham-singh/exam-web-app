import React, { useMemo } from "react";

const McqForm = ({ value, onChange, onSubmit, loading, onReset }) => {
  const answerLetters = useMemo(() => ["A", "B", "C", "D"], []);

  const handleField = (e) => onChange({ ...value, [e.target.name]: e.target.value });

  const handleOptionChange = (i, v) => {
    const opts = [...value.options];
    opts[i] = v;
    onChange({ ...value, options: opts });
  };

  return (
    <form onSubmit={onSubmit}>
      {/* Question */}
      <div className="">
        <label className="block text-sm mb-1">Question</label>
        <textarea
          name="questionText"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          rows="3"
          placeholder="Enter question"
          value={value.questionText}
          onChange={handleField}
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
        {value.options.map((opt, i) => (
          <div key={i}>
            <label className="block text-sm mb-1">Option {answerLetters[i]}</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              placeholder={`Enter option ${answerLetters[i]}`}
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Correct Answer */}
      <div className="mb-4">
        <label className="block text-sm mb-1">Correct Answer</label>
        <select
          name="correctAnswer"
          className="w-full p-2 rounded bg-gray-800 border border-gray-700"
          value={value.correctAnswer}
          onChange={handleField}
        >
          <option value="">Select correct option</option>
          {answerLetters.map((L) => (
            <option key={L} value={L}>
              Option {L}
            </option>
          ))}
        </select>
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
      <div className="flex gap-4 ">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded text-white font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save MCQ"}
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

export default McqForm;
