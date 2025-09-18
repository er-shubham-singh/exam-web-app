import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEvaluationHistory } from "../Redux/EvaluationResult/action";

const isNumericKeyObject = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  // allow also keys like "0","1",... with maybe some other metadata like "runType"
  // we treat as char-map only when the majority of keys are numeric or there exists '0' key
  const numericKeys = keys.filter(k => /^\d+$/.test(k));
  return numericKeys.length > 0 && numericKeys.length >= Math.min(1, keys.length - 1);
};

const reconstructFromCharMap = (obj) => {
  // collect numeric keys, sort by numeric order and join their values
  const numericPairs = Object.entries(obj)
    .filter(([k, v]) => /^\d+$/.test(k))
    .map(([k, v]) => [Number(k), String(v ?? "")]);
  if (numericPairs.length === 0) return null;
  numericPairs.sort((a, b) => a[0] - b[0]);
  return numericPairs.map(([, v]) => v).join("");
};

const renderAnswer = (ans) => {
  if (ans === null || typeof ans === "undefined") {
    return <span className="text-slate-400">N/A</span>;
  }

  // If it's a numeric-key object (character map) -> reconstruct sentence
  if (isNumericKeyObject(ans)) {
    const text = reconstructFromCharMap(ans);
    if (text !== null && text.trim().length > 0) {
      return (
        <div className="bg-slate-800 p-2 rounded whitespace-pre-wrap text-sm text-slate-200">
          {text}
        </div>
      );
    }
  }

  // MCQ short object like {"0":"C", "runType":null}
  if (typeof ans === "object" && ans !== null && Object.prototype.hasOwnProperty.call(ans, "0") && Object.keys(ans).length <= 3) {
    // return values joined (handles cases like {"0":"C"} or {"0":"C","runType":null})
    const mcqValue = Object.values(ans).filter(v => v !== null && v !== undefined && String(v).trim() !== "").join(", ");
    return <span className="text-green-300 font-semibold">{mcqValue || "—"}</span>;
  }

  // Plain string (long theory answer)
  if (typeof ans === "string") {
    return (
      <div className="bg-slate-800 p-2 rounded whitespace-pre-wrap text-sm text-slate-200">
        {ans}
      </div>
    );
  }

  // Array of answers
  if (Array.isArray(ans)) {
    return (
      <div className="space-y-1">
        {ans.map((a, i) => (
          <div key={i}>{renderAnswer(a)}</div>
        ))}
      </div>
    );
  }

  // Code object (with code property) or other complex object
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

        {/* show other metadata if present (but hide huge char maps) */}
        {Object.keys(rest).length > 0 && (
          <div className="text-xs text-slate-400 mt-2">Other: {JSON.stringify(rest)}</div>
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
