import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEvaluationHistory } from "../Redux/EvaluationResult/action";

const renderAnswer = (ans) => {
  if (ans === null || typeof ans === "undefined") return <span className="text-slate-400">N/A</span>;
  if (typeof ans === "string" || typeof ans === "number") return <span>{ans}</span>;
  if (Array.isArray(ans)) {
    return (
      <div className="space-y-1">
        {ans.map((a, i) => (
          <div key={i}>{renderAnswer(a)}</div>
        ))}
      </div>
    );
  }
  // treat as object (likely coding answer)
  if (typeof ans === "object") {
    const { code, language, lastSavedAt, ...rest } = ans;
    return (
      <div className="space-y-2">
        {language && (
          <div className="text-xs text-slate-300">
            <strong>Language:</strong> <span className="text-white ml-1">{language}</span>
          </div>
        )}
        {lastSavedAt && (
          <div className="text-xs text-slate-300">
            <strong>Saved:</strong>{" "}
            <span className="text-slate-200 ml-1">{new Date(lastSavedAt).toLocaleString()}</span>
          </div>
        )}
        {code ? (
          <pre className="bg-slate-900 p-2 rounded text-xs font-mono whitespace-pre-wrap break-words border border-slate-700">
            {code}
          </pre>
        ) : (
          <div className="text-sm text-slate-400">No code provided</div>
        )}
        {Object.keys(rest).length > 0 && (
          <div className="text-xs text-slate-400">Other: {JSON.stringify(rest)}</div>
        )}
      </div>
    );
  }
  return <span>{String(ans)}</span>;
};

const normalizeId = (idOrObj) => {
  if (!idOrObj && idOrObj !== 0) return null;
  if (typeof idOrObj === "object") {
    // mongoose object or populated doc
    if (idOrObj._id) return String(idOrObj._id);
    // sometimes questionId stored as ObjectId-like object
    try {
      return String(idOrObj);
    } catch {
      return null;
    }
  }
  return String(idOrObj);
};

const PaperEvaluation = () => {
  const dispatch = useDispatch();
  const { history, loading, error } = useSelector((state) => state.evaluation);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  useEffect(() => {
    dispatch(fetchEvaluationHistory({}));
  }, [dispatch]);

  const openModal = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedEvaluation(null);
    setModalOpen(false);
  };

  return (
    <main className="min-h-[calc(100vh-56px)] bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-blue-400 mb-4">Marks Evaluation</h1>

      {loading && <p>Loading evaluation history...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <table className="min-w-full border-collapse border border-gray-600">
          <thead>
            <tr className="bg-gray-700">
              <th className="border border-gray-600 p-2 text-left">Name</th>
              <th className="border border-gray-600 p-2 text-left">Roll No</th>
              <th className="border border-gray-600 p-2 text-left">Domain</th>
              <th className="border border-gray-600 p-2 text-left">Marks Achieved</th>
              <th className="border border-gray-600 p-2 text-left">Total Marks</th>
              <th className="border border-gray-600 p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(!history || history.length) === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            )}

            {Array.isArray(history) &&
              history.map((evalItem) => {
                const { studentExam, totalScore } = evalItem;
                if (!studentExam) return null;

                const name = studentExam.student?.name || "N/A";
                const rollNo = studentExam.student?.rollNumber || "N/A";
                const domainObj = studentExam.exam?.domain;
                const domain =
                  typeof domainObj === "object" ? domainObj.domain || "N/A" : domainObj || "N/A";
                const totalMarks = studentExam.exam?.totalMarks || "N/A";

                return (
                  <tr key={evalItem._id} className="hover:bg-gray-700">
                    <td className="border border-gray-600 p-2">{name}</td>
                    <td className="border border-gray-600 p-2">{rollNo}</td>
                    <td className="border border-gray-600 p-2">{domain}</td>
                    <td className="border border-gray-600 p-2">{totalScore}</td>
                    <td className="border border-gray-600 p-2">{totalMarks}</td>
                    <td className="border border-gray-600 p-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
                        onClick={() => openModal(evalItem)}
                      >
                        View Paper History
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {modalOpen && selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
              aria-label="Close modal"
            >
              &times;
            </button>
            <h2 className="text-2xl mb-4 border-b border-gray-600 pb-2">
              Paper History for {selectedEvaluation.studentExam.student?.name || "Student"}
            </h2>

            <div>
              {(!selectedEvaluation.questionFeedback ||
                selectedEvaluation.questionFeedback.length === 0) && (
                <p>No question feedback available.</p>
              )}

              <ul className="space-y-4">
                {Array.isArray(selectedEvaluation.questionFeedback) &&
                  selectedEvaluation.questionFeedback.map((qf, idx) => {
                    // Normalize qf.questionId to string id
                    const qfQuestionId = normalizeId(qf.questionId);
                    // studentExam.answers may contain objects with questionId as ObjectId or string
                    const answers = selectedEvaluation.studentExam?.answers || [];

                    // find matching answer by comparing normalized ids
                    const questionEntry = answers.find((a) => {
                      const aId = normalizeId(a.questionId);
                      return aId && qfQuestionId && aId === qfQuestionId;
                    });

                    const answerDisplay = questionEntry ? questionEntry.answer : null;

                    return (
                      <li key={idx} className="border border-gray-600 p-3 rounded">
                        <p>
                          <strong>Question ID:</strong> {qfQuestionId || "N/A"}
                        </p>
                        <p>
                          <strong>Question:</strong>{" "}
                          {typeof qf.questionId === "object"
                            ? qf.questionId.questionText || "N/A"
                            : qf.questionText || "N/A"}
                        </p>
                        <div className="mt-2">
                          <strong>Answer Given:</strong>{" "}
                          <span className="ml-2 block">{renderAnswer(answerDisplay)}</span>
                        </div>
                        <p className="mt-2">
                          <strong>Marks Awarded:</strong> {qf.marksAwarded} / {qf.maxMarks}
                        </p>
                        <p>
                          <strong>Remarks:</strong> {qf.remarks || "No remarks"}
                        </p>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default PaperEvaluation;
