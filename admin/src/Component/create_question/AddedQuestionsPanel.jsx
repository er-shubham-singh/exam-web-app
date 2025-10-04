// AddedQuestionsPanel.jsx
import React, { useMemo, useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";

export default function AddedQuestionsPanel({
  category,
  selectedDomain,
  sets = [],
  questions = [],
  selectedSetId,
  setSelectedSetId,
  openModal,
  startEdit,
  removeQuestion,
  handleAddToSet,
  onCreateSetClick
}) {
  const toIdStr = (v) => {
    if (v === null || typeof v === "undefined") return "";
    if (typeof v === "object") return String(v._id || v.id || "");
    return String(v || "");
  };
  const normalizedSets = useMemo(() => (sets || []).map((s) => {
    const sid = toIdStr(s._id || s.id);
    const label = s.setLabel || s.label || s.name || "Set";
    const qlist = Array.isArray(s.questions) ? s.questions : [];
    const normalizedQuestions = qlist.map(qe => {
      if (!qe) return null;
      if (typeof qe === "string") return { questionId: toIdStr(qe), raw: qe };
      const qVal = qe.question ?? qe._id ?? qe.id ?? null;
      return qVal ? { questionId: toIdStr(qVal), raw: qe } : null;
    }).filter(Boolean);
    return { _id: sid, setLabel: label, questions: normalizedQuestions, raw: s };
  }), [sets]);

  // Build quick lookup: questionId -> Set<setId>
  const questionToSetsMap = useMemo(() => {
    const map = {};
    normalizedSets.forEach(s => {
      const sid = s._id;
      (s.questions || []).forEach(qe => {
        const qid = qe.questionId;
        if (!qid) return;
        map[qid] = map[qid] || new Set();
        map[qid].add(String(sid));
      });
    });
    return map;
  }, [normalizedSets]);

  // domain filtered questions
  const domainId = toIdStr(selectedDomain?._id);
  const domainQuestions = useMemo(() => {
    if (!domainId) return [];
    return (questions || []).filter(q => toIdStr(q?.domain?._id || q?.domain) === domainId);
  }, [questions, domainId]);

  const [activeSet, setActiveSet] = useState("__unassigned__");

  // optimistic local added marks (questionId -> setId) while waiting for server refresh
  const [addedMap, setAddedMap] = useState({}); // questionId -> setId
  // loading state per question id while API is running
  const [loadingMap, setLoadingMap] = useState({});

  useEffect(() => {
    setAddedMap(prev => {
      const next = { ...prev };
      for (const qId of Object.keys(prev)) {
        if (questionToSetsMap[qId] && questionToSetsMap[qId].size > 0) {
          delete next[qId];
        }
      }
      return next;
    });
  }, [questionToSetsMap]);

  // membership checker: considers server state and optimistic local state
  const isQuestionInSet = (questionId, setId) => {
    const qid = toIdStr(questionId);
    const sid = toIdStr(setId);
    if (!qid || !sid) return false;
    // optimistic: we locally marked this question as added to this set
    if (addedMap[qid] && String(addedMap[qid]) === String(sid)) return true;
    const s = questionToSetsMap[qid];
    return !!(s && s.has(String(sid)));
  };

  // tabs: Unassigned + each set
  const tabs = [{ id: "__unassigned__", label: "Unassigned" }, ...normalizedSets.map(s => ({ id: s._id, label: s.setLabel }))];

  // counts (unassigned and per set) - consider optimistic additions
  const countsBySet = useMemo(() => {
    const map = {};
    normalizedSets.forEach(s => {
      map[s._id] = domainQuestions.filter(q => isQuestionInSet(q._id || q.id, s._id)).length;
    });
    map.__unassigned__ = domainQuestions.filter(q => {
      const qid = toIdStr(q._id || q.id);
      if (!qid) return false;
      const present = questionToSetsMap[qid] && questionToSetsMap[qid].size > 0;
      const optimistic = !!addedMap[qid];
      return !present && !optimistic;
    }).length;
    return map;
  }, [normalizedSets, domainQuestions, questionToSetsMap, addedMap]);

  // filtered questions shown for the current tab
  const filtered = useMemo(() => {
    if (activeSet === "__unassigned__") {
      return domainQuestions.filter(q => {
        const qid = toIdStr(q._id || q.id);
        if (!qid) return false;
        const present = questionToSetsMap[qid] && questionToSetsMap[qid].size > 0;
        const optimistic = !!addedMap[qid];
        return !present && !optimistic;
      });
    }
    return domainQuestions.filter(q => isQuestionInSet(q._id || q.id, activeSet));
  }, [activeSet, domainQuestions, questionToSetsMap, addedMap]);

  // user clicked a tab in this panel
  const selectTab = (id) => {
    setActiveSet(id);
  };

  const onAddToSetClick = async (questionOrIds, overrideSetId = null) => {
    const ids = Array.isArray(questionOrIds) ? questionOrIds : [questionOrIds];
    const targetSetId = overrideSetId || (activeSet === "__unassigned__" ? (selectedSetId || null) : activeSet);
    if (!targetSetId) {
      toast.error("Choose a set first (click a set tab or select a set in the Template & Sets panel).");
      return;
    }

    const toAdd = ids.filter(id => !isQuestionInSet(id, targetSetId));
    if (!toAdd.length) {
      toast.info("Selected question(s) already in the set.");
      return;
    }

    // set loading flags
    setLoadingMap(prev => {
      const next = { ...prev };
      toAdd.forEach(id => next[toIdStr(id)] = true);
      return next;
    });

    try {
      if (!handleAddToSet) throw new Error("No handler provided to add questions");
      await handleAddToSet(toAdd, targetSetId);

      // optimistic mark until parent refreshes sets
      setAddedMap(prev => {
        const next = { ...prev };
        toAdd.forEach(id => next[toIdStr(id)] = toIdStr(targetSetId));
        return next;
      });

      toast.success(`Added ${toAdd.length} question(s) to set.`);
    } catch (err) {
      console.error("add failed", err);
      toast.error(err?.message || "Failed to add question(s) to set.");
    } finally {
      setLoadingMap(prev => {
        const next = { ...prev };
        toAdd.forEach(id => delete next[toIdStr(id)]);
        return next;
      });
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-12 gap-4">
      <aside className="col-span-12 lg:col-span-3">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Sets</h3>
        <div className="space-y-3">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left ${activeSet === t.id ? "bg-gray-900 text-white" : "bg-gray-700 text-gray-200 hover:bg-gray-700"}`}
            >
              <span>{t.label}</span>
              <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">{countsBySet[t.id] ?? 0}</span>
            </button>
          ))}
          <button onClick={() => onCreateSetClick ? onCreateSetClick() : alert("Create a set from the Template & Sets panel")} className="w-full mt-2 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white">+ New Set</button>
        </div>
      </aside>

      <section className="col-span-12 lg:col-span-9">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-blue-400">Questions</h2>
            <p className="text-xs text-gray-400">{category || "Category"}{selectedDomain ? ` • ${selectedDomain.domain}` : ""}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => openModal && openModal()} className="px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white">Create Question</button>

            <button
              onClick={() => {
                const targetSetId = activeSet === "__unassigned__" ? (selectedSetId || null) : activeSet;
                if (!targetSetId) { toast.info("Select a set (tab or left selector) to add all questions."); return; }
                const ids = filtered.map(q => q._id || q.id).filter(Boolean);
                if (!ids.length) { toast.info("No questions to add."); return; }
                onAddToSetClick(ids, targetSetId);
              }}
              className={`px-3 py-2 rounded-md ${activeSet === "__unassigned__" ? "bg-gray-700 text-gray-300" : "bg-green-600 hover:bg-green-500 text-white"}`}
              title={activeSet === "__unassigned__" ? "Select a set to add all" : "Add all visible questions to this set"}
            >
              Add all to set
            </button>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-auto pr-3">
          {filtered.length === 0 ? (
            <div className="p-6 bg-gray-900 rounded-md text-center text-gray-300">
              <h3 className="text-lg font-semibold text-white">{activeSet === "__unassigned__" ? "No questions added yet" : "No questions in this set"}</h3>
              <p className="mt-2">{activeSet === "__unassigned__" ? "Click Create Question to add the first question." : "Use the Add to Set button on any question to move it here."}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(q => {
                const qId = toIdStr(q._id || q.id);
                const targetSetId = activeSet === "__unassigned__" ? (selectedSetId || null) : activeSet;
                const alreadyInActive = activeSet !== "__unassigned__" && isQuestionInSet(qId, activeSet);
                const optimistic = !!(addedMap[qId] && (addedMap[qId] === (activeSet === "__unassigned__" ? toIdStr(selectedSetId) : toIdStr(activeSet))));
                const loading = !!loadingMap[qId];
                const disableAdd = loading || optimistic || (targetSetId ? isQuestionInSet(qId, targetSetId) : false);

                return (
                  <li key={qId} className="bg-gray-900 p-3 rounded-md flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{q.questionText || q.title || "Untitled"}</div>
                      <div className="text-xs text-gray-400 mt-1">{q.type || "MCQ"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => { setAddedMap(prev => { const n = { ...prev }; delete n[qId]; return n; }); startEdit && startEdit(q); }} className="px-3 py-1 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white">Edit</button>

                      <button
                        onClick={() => onAddToSetClick(qId, activeSet !== "__unassigned__" ? activeSet : null)}
                        className={`px-3 py-1 rounded-md ${disableAdd ? "bg-gray-600 text-gray-200 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                        disabled={disableAdd}
                        title={!targetSetId ? "Choose a set first (left panel) or click a set tab" : (disableAdd ? "Already in this set" : "Add to set")}
                      >
                        {loading ? "..." : (disableAdd ? "Added" : "Add to set")}
                      </button>

                      <button onClick={() => { if (confirm("Delete this question?")) removeQuestion && removeQuestion(qId); }} className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white">Delete</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      <ToastContainer />
    </div>
  );
}
