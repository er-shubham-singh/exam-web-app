// ViewPaper.jsx
import React, { useEffect, useMemo, useState } from "react";
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

  const { papers = [], loading, error } = useSelector((s) => s.paper || { papers: [] });

  useEffect(() => {
    dispatch(fetchPapers({ category, domain, populate: true }));
  }, [dispatch, category, domain]);

  // We'll keep a UI-level active tab map keyed by paper._id -> activeSetId
  const [activeByPaper, setActiveByPaper] = useState({});

  // Helper: normalize sets for a paper into { _id, setLabel, questions: [ids or objects] }
const normalizeSets = (paper) => Array.isArray(paper.sets) ? paper.sets : [];

  // For each paper compute set tabs and counts + assigned map (memoized)
const papersWithSets = useMemo(() => {
  return papers.map((paper) => {
    const questions = Array.isArray(paper.questions) ? paper.questions : [];

    // ✅ Just use the backend-provided sets
    const sets = Array.isArray(paper.sets) ? paper.sets : [];

    // ✅ Convert each set to include counts + normalized question objects
    const setsWithCounts = sets.map((s) => ({
      ...s,
      count: Array.isArray(s.questions) ? s.questions.length : 0,
      questions: (s.questions || []).map((q) => {
        // q is like { question: { fullQuestionObj }, marks, shuffleOptions }
        if (q.question && typeof q.question === "object") return q.question;
        return q; // fallback
      })
    }));

    // ✅ unassigned = template questions not present in any set
    const assignedIds = new Set();
    setsWithCounts.forEach((s) => {
      (s.questions || []).forEach((q) => {
        if (q?._id) assignedIds.add(String(q._id));
      });
    });

    const unassignedQuestions = questions.filter((q) => !assignedIds.has(String(q._id)));

    return {
      ...paper,
      sets: setsWithCounts,
      unassigned: unassignedQuestions,
      totalQuestionsCount: questions.length,
    };
  });
}, [papers]);


  // ensure we pick an initial active tab for each paper (first set or __unassigned__)
  useEffect(() => {
    const next = {};
    papersWithSets.forEach((p) => {
      if (activeByPaper[p._id]) return; // keep existing
      // default to first set id if exists otherwise unassigned
      const defaultSet = p.sets && p.sets.length ? p.sets[0]._id : "__unassigned__";
      next[p._id] = defaultSet;
    });
    if (Object.keys(next).length) {
      setActiveByPaper((prev) => ({ ...next, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papersWithSets]);

  const setActiveTabForPaper = (paperId, setId) => {
    setActiveByPaper((p) => ({ ...p, [paperId]: setId }));
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Headings */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-400">{category || "Papers"}</h1>
          <p className="text-gray-400">{domain || "All domains"}</p>
        </div>

        {loading && <p className="text-gray-400 mb-4">Loading papers…</p>}
        {error && <p className="text-red-400 mb-4">{error}</p>}

        {!loading && papersWithSets.length === 0 && (
          <div className="text-gray-300 bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p>No papers found for this category/domain.</p>
          </div>
        )}

        <div className="space-y-8 mt-6">
          {papersWithSets.map((paper) => {
            const activeSetId = activeByPaper[paper._id] || "__unassigned__";
            // compute assigned id set for quick lookup
            const assignedIdSet = new Set();
            (paper.sets || []).forEach((s) => (s.questionIds || []).forEach((id) => assignedIdSet.add(String(id))));

            // questions to display depending on activeSetId
            let displayedQuestions = [];
            if (activeSetId === "__unassigned__") {
              displayedQuestions = paper.unassigned || [];
            } else {
              const setObj = (paper.sets || []).find((s) => String(s._id) === String(activeSetId));
              if (setObj) {
                // if setObj.questions contains question objects we already prepared, use them
                displayedQuestions = Array.isArray(setObj.questions) && setObj.questions.length
                  ? setObj.questions
                  : // else map ids to main question objects
                    (setObj.questionIds || []).map((qid) => paper._questionsMap[String(qid)]).filter(Boolean);
              } else {
                displayedQuestions = [];
              }
            }

            // build tabs (Unassigned + each set)
            const tabs = [
              { id: "__unassigned__", label: "Unassigned", count: (paper.unassigned || []).length },
              ...(paper.sets || []).map((s) => ({ id: s._id, label: s.label || s.setLabel || "Set", count: s.count || (s.questionIds || []).length })),
            ];

            return (
              <div key={paper._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">{paper.title}</h2>
                    <p className="text-sm text-gray-400">
                      {paper.category} • {paper.domain?.domain || "—"}
                    </p>
                    <div className="text-sm text-gray-300 mt-2">
                      {paper.totalQuestionsCount ?? (paper.questions || []).length} Questions
                    </div>
                  </div>

                  {/* Tabs + actions */}
                  <div className="flex items-center gap-3">
                    {/* tabs */}
                    <div className="flex items-center gap-2 bg-gray-900 p-2 rounded">
                      {tabs.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveTabForPaper(paper._id, t.id)}
                          className={`px-3 py-1 rounded-md text-sm ${String(activeSetId) === String(t.id) ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                          title={`${t.label} — ${t.count}`}
                        >
                          {t.label} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-100">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-700 my-4" />

                {/* questions list for active tab */}
                <div className="space-y-4">
                  {displayedQuestions && displayedQuestions.length ? (
                    displayedQuestions.map((q, idx) => {
                      const id = q._id || q.id || `i-${idx}`;
                      const isMCQ = q.type !== "THEORY" && Array.isArray(q.options);
                      return (
                        <div key={id} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-gray-200 font-medium">
                                {idx + 1}. {q.questionText}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">{q.type}</p>
                            </div>

                            <div className="text-sm text-gray-300">
                              <strong className="text-white">Marks:</strong> {q.marks ?? "-"}
                            </div>
                          </div>

                          {/* MCQ details */}
                          {isMCQ && (
                            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                              {q.options.map((opt, i) => {
                                const letter = String.fromCharCode(65 + i);
                                const isCorrect = q.correctAnswer === letter;
                                return (
                                  <li key={i} className={`p-2 rounded ${isCorrect ? "bg-green-700 text-white font-semibold" : "bg-gray-800 text-gray-200"}`}>
                                    <span className="font-bold mr-2">{letter}.</span>
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
                      );
                    })
                  ) : (
                    <div className="bg-gray-900 p-6 rounded text-center text-gray-400">
                      {activeSetId === "__unassigned__" ? (
                        <>
                          <h3 className="text-lg font-semibold text-white">No unassigned questions</h3>
                          <p className="mt-2">Create questions or move some to sets to see them here.</p>
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-white">No questions in this set</h3>
                          <p className="mt-2">Use the Add-to-set actions in the create/edit UI to assign questions.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-sm text-gray-300">
                  <strong className="text-white">Total Marks:</strong> {paper.totalMarks ?? "-"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default ViewPaper;
