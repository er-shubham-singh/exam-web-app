// CodingForm.jsx
import React from "react";

const CodingForm = ({
  codingForm,
  setCodingForm,
  handleSubmitCoding,
  addStarterCode,
  updateStarterCode,
  removeStarterCode,
  addTestCase,
  updateTestCase,
  removeTestCase,
  editingId,
  mode,
}) => {
  return (
    <form onSubmit={handleSubmitCoding} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Question Text</label>
        <input
          value={codingForm.questionText}
          onChange={(e) => setCodingForm((p) => ({ ...p, questionText: e.target.value }))}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          placeholder="Short one-line question title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Problem Prompt</label>
        <textarea
          value={codingForm.problemPrompt}
          onChange={(e) => setCodingForm((p) => ({ ...p, problemPrompt: e.target.value }))}
          rows={6}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          placeholder="Full problem description, constraints, examples..."
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Input Format</label>
          <input
            value={codingForm.inputFormat}
            onChange={(e) => setCodingForm((p) => ({ ...p, inputFormat: e.target.value }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Output Format</label>
          <input
            value={codingForm.outputFormat}
            onChange={(e) => setCodingForm((p) => ({ ...p, outputFormat: e.target.value }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Constraints</label>
        <input
          value={codingForm.constraintsText}
          onChange={(e) => setCodingForm((p) => ({ ...p, constraintsText: e.target.value }))}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          placeholder="Time/space constraints, edge limits..."
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Time Limit (ms)</label>
          <input
            type="number"
            value={codingForm.timeLimitMs}
            onChange={(e) => setCodingForm((p) => ({ ...p, timeLimitMs: Number(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Memory Limit (MB)</label>
          <input
            type="number"
            value={codingForm.memoryLimitMB}
            onChange={(e) => setCodingForm((p) => ({ ...p, memoryLimitMB: Number(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Max Run Attempts</label>
          <input
            type="number"
            value={codingForm.maxRunAttempts}
            onChange={(e) => setCodingForm((p) => ({ ...p, maxRunAttempts: Number(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Allowed Languages (comma separated)</label>
        <input
          value={codingForm.allowedLanguages.join(",")}
          onChange={(e) => setCodingForm((p) => ({ ...p, allowedLanguages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
          className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          placeholder="python,javascript,cpp"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Default Language</label>
          <input
            value={codingForm.defaultLanguage}
            onChange={(e) => setCodingForm((p) => ({ ...p, defaultLanguage: e.target.value }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
            placeholder="python"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Marks for this question</label>
          <input
            type="number"
            value={codingForm.marks}
            onChange={(e) => setCodingForm((p) => ({ ...p, marks: Number(e.target.value) }))}
            className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-200"
          />
        </div>
      </div>

      {/* Starter Codes */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Starter Codes</h4>
          <button type="button" onClick={addStarterCode} className="bg-green-600 px-3 py-1 rounded-full text-sm">Add</button>
        </div>
        {(codingForm.starterCodes || []).map((sc, i) => (
          <div key={i} className="mb-3 bg-gray-900 p-3 rounded">
            <div className="flex items-center gap-2 mb-2">
              <input
                value={sc.language}
                onChange={(e) => updateStarterCode(i, "language", e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600"
              />
              <button type="button" onClick={() => removeStarterCode(i)} className="ml-auto bg-red-600 px-3 py-1 rounded-full text-sm">Remove</button>
            </div>
            <textarea
              value={sc.code}
              onChange={(e) => updateStarterCode(i, "code", e.target.value)}
              rows={4}
              className="w-full p-2 rounded bg-gray-800 text-sm"
              placeholder={`Starter code for ${sc.language}`}
            />
          </div>
        ))}
      </div>

      {/* Test Cases */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Test Cases</h4>
          <button type="button" onClick={addTestCase} className="bg-green-600 px-3 py-1 rounded-full text-sm">Add</button>
        </div>
        {(codingForm.testCases || []).map((tc, i) => (
          <div key={i} className="mb-3 bg-gray-900 p-3 rounded">
            <div className="grid md:grid-cols-3 gap-2 mb-2">
              <textarea
                value={tc.input}
                onChange={(e) => updateTestCase(i, "input", e.target.value)}
                rows={2}
                className="p-2 rounded bg-gray-800"
                placeholder="stdin input"
              />
              <textarea
                value={tc.expectedOutput}
                onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                rows={2}
                className="p-2 rounded bg-gray-800"
                placeholder="expected stdout"
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-300">Public</label>
                <select value={tc.isPublic ? "true" : "false"} onChange={(e) => updateTestCase(i, "isPublic", e.target.value === "true")} className="p-2 rounded bg-gray-800">
                  <option value="true">Public</option>
                  <option value="false">Hidden</option>
                </select>
                <input type="number" value={tc.score} onChange={(e) => updateTestCase(i, "score", Number(e.target.value))} className="p-2 rounded bg-gray-800" placeholder="score" />
              </div>
            </div>
            <div className="text-right">
              <button type="button" onClick={() => removeTestCase(i)} className="bg-red-600 px-3 py-1 rounded-full text-sm">Remove test</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-4">
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-white font-semibold shadow-md">
          {editingId && mode === "CODING" ? "Update Coding Question" : "Create Coding Question"}
        </button>
        <button type="button" onClick={() => setCodingForm((p) => ({ ...p, ...{
          questionText: "",
          problemPrompt: "",
          inputFormat: "",
          outputFormat: "",
          constraintsText: "",
          timeLimitMs: 2000,
          memoryLimitMB: 256,
          allowedLanguages: ["python", "javascript"],
          defaultLanguage: "python",
          starterCodes: [{ language: "python", code: "" }],
          testCases: [{ input: "", expectedOutput: "", isPublic: true, score: 1 }],
          maxRunAttempts: 3,
          marks: 5,
          compareMode: "trimmed"
        }}))} className="bg-gray-600 px-5 py-2 rounded-full">Reset</button>
      </div>
    </form>
  );
};

export default CodingForm;
