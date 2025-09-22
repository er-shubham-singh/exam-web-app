// QuestionList.jsx
import React from "react";

const QuestionList = ({
  questions = [],
  qLoading,
  qError,
  dError,
  startEdit,
  removeQuestion,
  handleAddToSet,
  selectedSetId,
  selectedDomain,
  category,
}) => {
  const domainLabel = selectedDomain ? ` • ${selectedDomain.domain}` : "";

  return (
    <div className="w-full">
      <div className="sticky top-0 bg-gray-950 z-10 py-6">
        
        <h2 className="text-3xl font-bold mb-2 text-blue-400">Added Questions</h2>
        <p className="text-gray-400">
          {category || "Category"}{domainLabel}
        </p>
        <div className="w-full h-1 bg-gray-700 my-4 rounded-full"></div>
      </div>

      <div className="space-y-6 overflow-y-auto max-h-[77vh] pr-4 custom-scrollbar">
        {qLoading && !questions?.length ? (
          <div className="text-center text-gray-400 py-10">Loading questions...</div>
        ) : Array.isArray(questions) && questions.length > 0 ? (
          questions.map((q) => {
            const isTheory = q.type === "THEORY";
            const isCoding = q.type === "CODING";
            return (
              <div
                key={q._id}
                className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 transition-transform transform hover:scale-[1.01] hover:shadow-xl duration-200"
              >
                <p className="text-lg font-semibold mb-3 text-white">
                  {isCoding ? "Coding Question" : isTheory ? "Theory Question" : "MCQ Question"}
                </p>
                <p className="mb-4 text-gray-300">{q.questionText}</p>

                {!isTheory && !isCoding ? (
                  <ul className="list-none space-y-2 text-sm">
                    {q.options?.map((opt, i) => (
                      <li
                        key={i}
                        className={`p-2 rounded-lg ${q.correctAnswer === String.fromCharCode(65 + i) ? "bg-green-700 text-white font-bold" : "bg-gray-700 text-gray-300"}`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                      </li>
                    ))}
                  </ul>
                ) : isCoding ? (
                  <>
                    <div className="text-sm text-gray-400 mb-2">
                      <strong className="text-white">Marks:</strong> {q.marks} • <strong className="text-white">TimeLimit:</strong> {q.coding?.timeLimitMs}ms
                    </div>
                    <details className="text-sm text-gray-300">
                      <summary className="cursor-pointer">View prompt & test summary</summary>
                      <div className="mt-2">
                        <pre className="whitespace-pre-wrap text-xs bg-gray-900 p-3 rounded">{q.coding?.problemPrompt}</pre>
                        <div className="mt-2">
                          <strong className="text-white">Test cases:</strong>
                          <ul className="list-disc ml-6 mt-1">
                            {(q.coding?.testCases || []).map((t, i) => (
                              <li key={i} className="text-xs text-gray-400">
                                {t.isPublic ? "Public" : "Hidden"} • score:{t.score ?? 1}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </details>
                  </>
                ) : (
                  q.theoryAnswer && (
                    <p className="mt-4 text-sm text-gray-400 border-l-4 border-blue-500 pl-4 italic">
                      <strong className="text-white">Model Answer:</strong> {q.theoryAnswer}
                    </p>
                  )
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => startEdit(q)}
                    className="bg-yellow-600 hover:bg-yellow-500 px-5 py-2 rounded-full text-white font-semibold transition-colors shadow-md"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => removeQuestion(q._id)}
                    className="bg-red-600 hover:bg-red-500 px-5 py-2 rounded-full text-white font-semibold transition-colors shadow-md"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => handleAddToSet(q._id)}
                    disabled={!selectedSetId}
                    title={selectedSetId ? "Add question to selected set" : "Choose a template & set first"}
                    className={`px-4 py-2 rounded-full text-white font-semibold transition-colors shadow-md ${
                      selectedSetId ? "bg-indigo-600 hover:bg-indigo-500" : "bg-gray-700 cursor-not-allowed opacity-60"
                    }`}
                  >
                    Add to Set
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-center">
            <h3 className="text-2xl font-bold mb-2 text-white">No questions added yet</h3>
            <p className="text-gray-400">Fill out the form to add your first question.</p>
          </div>
        )}

        {(qError || dError) && <p className="text-red-400 mt-4 text-center">{qError || dError}</p>}
      </div>
    </div>
  );
};

export default QuestionList;
