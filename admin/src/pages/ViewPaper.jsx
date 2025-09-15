import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchPapers } from "../Redux/Paper/Action";

const ViewPaper = () => {
  const dispatch = useDispatch();
  const { search } = useLocation();

  // read ?category=&domain=
  const params = new URLSearchParams(search);
  const category = params.get("category") || "";
  const domain = params.get("domain") || "";

  const { papers, loading, error } = useSelector((s) => s.paper); // papers = array

  useEffect(() => {
    // fetch exactly what we need; backend filters for us
    dispatch(fetchPapers({ category, domain, populate: true }));
  }, [dispatch, category, domain]);

  // heading from query (fallback to first paper if needed)
  const headingCategory = category || papers[0]?.category || "All Categories";
  const headingDomain = papers[0]?.domain?.domain || (domain ? "Selected domain" : "All Domains");

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Headings */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-blue-400">{headingCategory}</h1>
          <p className="text-gray-400">{headingDomain}</p>
        </div>

        {loading && <p className="text-gray-400 mb-4">Loading papers…</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && papers.length === 0 && (
          <div className="text-gray-300 bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p>No papers found for this category/domain.</p>
          </div>
        )}

        <div className="space-y-8 mt-6">
          {papers.map((paper) => (
            <div key={paper._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-1">{paper.title}</h2>
              <p className="text-sm text-gray-400 mb-4">
                {paper.category} • {paper.domain?.domain || "—"}
              </p>

              {/* Questions */}
              <div className="space-y-4">
                {paper.questions?.map((q, idx) => (
                  <div key={q._id || idx} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-gray-200 font-medium">
                        {idx + 1}. {q.questionText}
                      </p>
                      <span className="text-sm text-gray-300">
                        <strong className="text-white">Marks:</strong> {q.marks}
                      </span>
                    </div>

                    {/* MCQ */}
                    {q.type !== "THEORY" && Array.isArray(q.options) && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {q.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect = q.correctAnswer === letter;
                          return (
                            <li
                              key={i}
                              className={`p-2 rounded ${
                                isCorrect
                                  ? "bg-green-700 text-white font-semibold"
                                  : "bg-gray-700 text-gray-200"
                              }`}
                            >
                              <span className="font-bold mr-1">{letter}.</span>
                              {opt}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {/* Theory */}
                    {q.type === "THEORY" && q.theoryAnswer && (
                      <p className="mt-3 text-sm text-gray-400 italic border-l-4 border-blue-500 pl-3">
                        <strong className="text-white">Model Answer:</strong> {q.theoryAnswer}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-300">
                <strong className="text-white">Total Marks:</strong> {paper.totalMarks}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default ViewPaper;
