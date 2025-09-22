// AddedQuestionsPanel.jsx (replace your file contents with this)
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
  const [activeSet, setActiveSet] = useState("__unassigned__");
  const [loadingMap, setLoadingMap] = useState({}); // id -> boolean
  const [addedMap, setAddedMap] = useState({}); // optimistic local adds (questionId -> setId)

  useEffect(() => {
    // clear optimistic flags for questions that server now shows as in a set
    setAddedMap(prev => {
      const next = { ...prev };
      for (const qId of Object.keys(prev)) {
        const inAny = sets.some(s => (s.questions || []).some(qEntry => {
          const qid = String(qEntry.question ?? qEntry._id ?? qEntry);
          return qid === qId;
        }));
        if (inAny) delete next[qId];
      }
      return next;
    });
  }, [sets, questions]);

  // Build map: questionId -> Set of setIds
  const questionToSetsMap = useMemo(() => {
    const map = {};
    (sets || []).forEach(s => {
      const sid = s._id || s.id;
      if (!sid) return;
      (s.questions || []).forEach(qEntry => {
        const qId = String(qEntry.question ?? qEntry._id ?? qEntry);
        if (!qId) return;
        map[qId] = map[qId] || new Set();
        map[qId].add(String(sid));
      });
    });
    return map;
  }, [sets]);

  const isQuestionInSet = (questionId, setId) => {
    if (!questionId || !setId) return false;
    return !!(questionToSetsMap[questionId] && questionToSetsMap[questionId].has(String(setId)));
  };

  // domain questions
  const domainId = selectedDomain?._id;
  const domainQuestions = useMemo(
    () => (questions || []).filter(q => String(q?.domain?._id || q?.domain) === String(domainId)),
    [questions, domainId]
  );

  // counts
  const countsBySet = useMemo(() => {
    const map = {};
    for (const s of sets) {
      map[s._id] = domainQuestions.filter(q => isQuestionInSet(q._id || q.id, s._id)).length;
    }
    map.__unassigned__ = domainQuestions.filter(q => {
      const qId = q._id || q.id;
      if (!qId) return false;
      return !(questionToSetsMap[qId] && questionToSetsMap[qId].size > 0);
    }).length;
    return map;
  }, [sets, domainQuestions, questionToSetsMap]);

  const tabs = [{ id: "__unassigned__", label: "Unassigned" }, ...sets.map(s => ({ id: s._id, label: s.setLabel || s.label || "Set" }))];

  const filtered = useMemo(() => {
    if (activeSet === "__unassigned__") {
      return domainQuestions.filter(q => {
        const qId = q._id || q.id;
        return !(questionToSetsMap[qId] && questionToSetsMap[qId].size > 0);
      });
    }
    return domainQuestions.filter(q => {
      const qId = q._id || q.id;
      return isQuestionInSet(qId, activeSet);
    });
  }, [activeSet, domainQuestions, questionToSetsMap]);

  const selectTab = (id) => {
    setActiveSet(id);
    setSelectedSetId && setSelectedSetId(id === "__unassigned__" ? "" : id);
  };

  // Add to set handler used in panel (wraps parent handleAddToSet to manage loading/optimistic map)
  const onAddToSetClick = async (questionOrIds, overrideSetId = null) => {
    const ids = Array.isArray(questionOrIds) ? questionOrIds : [questionOrIds];
    const setId = overrideSetId || (activeSet === "__unassigned__" ? selectedSetId : activeSet);
    if (!setId) {
      toast.error("Choose a set first.");
      return;
    }

    // filter out already-in-set ids using server SOT map
    const toAdd = ids.filter(id => !isQuestionInSet(id, setId));
    if (!toAdd.length) {
      toast.info("Selected question(s) already in the set.");
      return;
    }

    // set loading
    setLoadingMap(prev => {
      const next = { ...prev };
      toAdd.forEach(id => next[id] = true);
      return next;
    });

    try {
      await (handleAddToSet ? handleAddToSet(toAdd, setId) : Promise.reject(new Error("No handler")));
      // optimistic mark (will be cleared when sets prop updates)
      setAddedMap(prev => {
        const next = { ...prev };
        toAdd.forEach(id => next[id] = setId);
        return next;
      });
      toast.success(`Added ${toAdd.length} question(s) to set.`);
    } catch (err) {
      console.error("Add to set failed", err);
      toast.error("Failed to add question(s) to set.");
    } finally {
      setLoadingMap(prev => {
        const next = { ...prev };
        toAdd.forEach(id => delete next[id]);
        return next;
      });
    }
  };

  const handleStartEdit = (q) => {
    // clear local optimistic map for this question so Add button can re-enable
    setAddedMap(prev => {
      const next = { ...prev };
      delete next[q._id || q.id];
      return next;
    });
    startEdit && startEdit(q);
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
                if (activeSet === "__unassigned__") { toast.info("Select a set tab to add all questions."); return; }
                const ids = filtered.map(q => q._id || q.id).filter(Boolean);
                if (!ids.length) return toast.info("No questions to add.");
                onAddToSetClick(ids, activeSet);
              }}
              className={`px-3 py-2 rounded-md ${activeSet === "__unassigned__" ? "bg-gray-700 text-gray-300" : "bg-green-600 hover:bg-green-500 text-white"}`}
            >
              Add all to set
            </button>
          </div>
        </div>

        <div className="max-h-[56vh] overflow-auto pr-3">
          {filtered.length === 0 ? (
            <div className="p-6 bg-gray-900 rounded-md text-center text-gray-300">
              <h3 className="text-lg font-semibold text-white">{activeSet === "__unassigned__" ? "No questions added yet" : "No questions in this set"}</h3>
              <p className="mt-2">{activeSet === "__unassigned__" ? "Click Create Question to add the first question." : "Use the Add to Set button on any question to move it here."}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map(q => {
                const qId = q._id || q.id;
                const alreadyInActive = activeSet !== "__unassigned__" && isQuestionInSet(qId, activeSet);
                const optimistic = !!addedMap[qId] && (addedMap[qId] === (activeSet === "__unassigned__" ? selectedSetId : activeSet));
                const loading = !!loadingMap[qId];
                const disableAdd = alreadyInActive || optimistic || loading;

                return (
                  <li key={qId} className="bg-gray-900 p-3 rounded-md flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{q.questionText || q.title || "Untitled"}</div>
                      <div className="text-xs text-gray-400 mt-1">{q.type || "MCQ"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleStartEdit(q)} className="px-3 py-1 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white">Edit</button>

                      <button
                        onClick={() => onAddToSetClick(qId, activeSet !== "__unassigned__" ? activeSet : null)}
                        className={`px-3 py-1 rounded-md ${disableAdd ? "bg-gray-600 text-gray-200 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
                        disabled={disableAdd}
                        title={disableAdd ? (alreadyInActive ? "Already in this set" : "Added — edit to re-enable") : "Add to set"}
                      >
                        {loading ? "..." : (alreadyInActive ? "Added" : optimistic ? "Added" : "Add to set")}
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
