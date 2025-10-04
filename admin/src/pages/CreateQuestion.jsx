// CreateQuestion.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createQuestion, fetchQuestion, updateQuestion, deleteQuestion } from "../Redux/Question/Action";
import { fetchDomains } from "../Redux/Domain/Action";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import { createPaper } from "../Redux/Paper/Action";
import { fetchTemplates } from "../Redux/papertemplate/action";
import { fetchSetsForTemplate, addQuestionsToSet, createSet } from "../Redux/paperSet/action";
import TemplateSetSelector from "../Component/create_question/TemplateSelector";
import CreateQuestionModal from "../Component/create_question/CreateQuestionModal";
import AddedQuestionsPanel from "../Component/create_question/AddedQuestionsPanel";

// initial states
const initialMcq = { domain: "", questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 };
const initialTheory = { domain: "", questionText: "", theoryAnswer: "", marks: 5 };
const initialCoding = {
  domain: "",
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
  compareMode: "trimmed",
};

const CreateQuestion = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const { loading: qLoading, error: qError, questions } = useSelector((s) => s.question);
  const { loading: dLoading, error: dError, domains } = useSelector((s) => s.domain);
  console.log("domain on create page : ", domains)

  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("MCQ"); // chosen mode that the modal will open with

  const [mcqForm, setMcqForm] = useState(initialMcq);
  const [theoryForm, setTheoryForm] = useState(initialTheory);
  const [codingForm, setCodingForm] = useState(initialCoding);

  const [createDefaultSet, setCreateDefaultSet] = useState(true);
  const [defaultSetLabel, setDefaultSetLabel] = useState("A");
  const [createdTemplateId, setCreatedTemplateId] = useState(null);

  // template/set UI state
  const [templates, setTemplates] = useState([]);
  const [sets, setSets] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [setsLoading, setSetsLoading] = useState(false);

  // currentDomainId used across functions/hooks — single declaration
  const currentDomainId = mode === "MCQ" ? mcqForm.domain : mode === "THEORY" ? theoryForm.domain : codingForm.domain;

const [initialUrlParams, setInitialUrlParams] = useState({ category: "", domain: "" });

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const c = params.get("category") || "";
  const d = params.get("domain") || "";
  if (c) {
    setCategory(c);
    setInitialUrlParams({ category: c, domain: d });
    dispatch(fetchDomains(c));
  }
}, [dispatch]);

useEffect(() => {
  const { category: urlCategory, domain: urlDomain } = initialUrlParams;
  if (!urlCategory || !urlDomain) return;
  if (!domains || !domains.length) return; // wait for domains to be loaded into redux

  const found = domains.find(x => String(x._id) === String(urlDomain));
  if (!found) {
    console.warn("URL domain id not found in fetched domains:", urlDomain);
    return;
  }
  setMcqForm(prev => ({ ...prev, domain: urlDomain }));
  setTheoryForm(prev => ({ ...prev, domain: urlDomain }));
  setCodingForm(prev => ({ ...prev, domain: urlDomain }));
  dispatch(fetchQuestion({ category: urlCategory, domain: urlDomain }));
}, [domains, dispatch, initialUrlParams]);


  const selectedDomain = useMemo(
    () => domains?.find((x) => String(x._id) === String(currentDomainId)) || null,
    [domains, currentDomainId]
  );

// inside CreateQuestion.jsx
useEffect(() => {
  (async () => {
    // require both category and domain to avoid showing unrelated templates
    if (!category || !currentDomainId) {
      setTemplates([]);
      setSelectedTemplateId("");
      return;
    }
    try {
      setTemplatesLoading(true);
      // <-- pass domain too
      const res = await dispatch(fetchTemplates({ category, domain: currentDomainId }));
      console.log("fetchTemplates dispatch result:", res);

      // normalize common shapes:
      const list =
        Array.isArray(res) ? res :
        Array.isArray(res?.items) ? res.items :
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res?.templates) ? res.templates :
        [];
      console.log("normalized templates:", list);
      setTemplates(list);
    } catch (e) {
      console.warn("Failed to load templates", e);
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  })();
}, [dispatch, category, currentDomainId]); // include currentDomainId



// CreateQuestion.jsx
useEffect(() => {
  (async () => {
    if (!selectedTemplateId) {
      setSets([]);
      setSelectedSetId("");
      return;
    }
    try {
      setSetsLoading(true);
      const sres = await dispatch(fetchSetsForTemplate(selectedTemplateId));
      const list = Array.isArray(sres) ? sres : sres?.sets || sres?.items || [];
      setSets(list);
    } catch (e) {
      console.warn("Failed to load sets", e);
      setSets([]);
    } finally {
      setSetsLoading(false);
    }
  })();
}, [dispatch, selectedTemplateId]);





  // Validation helpers (same as before)
  const validateMcq = () => {
    const { questionText, options, correctAnswer, domain } = mcqForm;
    if (!category) return "Please select a category.";
    if (!domain) return "Please select a domain.";
    if (!questionText.trim()) return "Please enter the question text.";
    if (!options.every((o) => o.trim())) return "Please provide all four options.";
    if (!correctAnswer) return "Please select the correct answer.";
    return null;
  };
  const validateTheory = () => {
    const { questionText, domain } = theoryForm;
    if (!category) return "Please select a category.";
    if (!domain) return "Please select a domain.";
    if (!questionText.trim()) return "Please enter the theory question.";
    return null;
  };
  const validateCoding = () => {
    const c = codingForm;
    if (!category) return "Please select a category.";
    if (!c.domain) return "Please select a domain.";
    if (!c.questionText.trim()) return "Please enter the coding question text.";
    if (!c.problemPrompt.trim()) return "Please provide the problem prompt.";
    if (!Array.isArray(c.testCases) || !c.testCases.length) return "Add at least one test case.";
    for (const [i, t] of c.testCases.entries()) {
      if (typeof t.input === "undefined" || typeof t.expectedOutput === "undefined" || String(t.input).trim() === "") {
        return `Test case ${i + 1} must have input and expected output.`;
      }
    }
    if (!Array.isArray(c.allowedLanguages) || !c.allowedLanguages.length) return "Allowed languages required.";
    if (!c.defaultLanguage) return "Select default language.";
    if (!Number(c.maxRunAttempts) || Number(c.maxRunAttempts) <= 0) return "maxRunAttempts must be positive.";
    return null;
  };

  // Submit handlers (same logic)
  const handleSubmitMcq = async (e) => {
    e.preventDefault();
    const err = validateMcq();
    if (err) return toast.error(err);

    try {
      if (editingId && mode === "MCQ") {
        const payload = { ...mcqForm, type: "MCQ", attachToSetId: selectedSetId || undefined };
        const updated = await dispatch(updateQuestion(editingId, payload));
        toast.success("MCQ updated successfully!");
        if (selectedSetId) {
          try {
            await dispatch(addQuestionsToSet(selectedSetId, [updated._id || updated.id || editingId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); }
        }
      } else {
        const payload = { ...mcqForm, type: "MCQ", attachToSetId: selectedSetId || undefined };
        const created = await dispatch(createQuestion(payload));
        toast.success("MCQ created successfully!");
        if (selectedSetId) {
          try {
            const createdId = created?._id || created?.id || created;
            await dispatch(addQuestionsToSet(selectedSetId, [createdId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); toast.error("Question created but failed to add to set."); }
        }
      }
      resetForms(false);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${editingId ? "update" : "create"} MCQ.`);
    }
  };

  const handleSubmitTheory = async (e) => {
    e.preventDefault();
    const err = validateTheory();
    if (err) return toast.error(err);

    try {
      if (editingId && mode === "THEORY") {
        const payload = { ...theoryForm, type: "THEORY", attachToSetId: selectedSetId || undefined };
        const updated = await dispatch(updateQuestion(editingId, payload));
        toast.success("Theory question updated successfully!");
        if (selectedSetId) {
          try {
            await dispatch(addQuestionsToSet(selectedSetId, [updated._id || updated.id || editingId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); }
        }
      } else {
        const payload = { ...theoryForm, type: "THEORY", attachToSetId: selectedSetId || undefined };
        const created = await dispatch(createQuestion(payload));
        toast.success("Theory question created successfully!");
        if (selectedSetId) {
          try {
            const createdId = created?._id || created?.id || created;
            await dispatch(addQuestionsToSet(selectedSetId, [createdId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); toast.error("Question created but failed to add to set."); }
        }
      }
      resetForms(false);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${editingId ? "update" : "create"} theory question.`);
    }
  };

  const handleSubmitCoding = async (e) => {
    e.preventDefault();
    const err = validateCoding();
    if (err) return toast.error(err);

    try {
      const basePayload = {
        ...codingForm,
        type: "CODING",
        coding: {
          problemPrompt: codingForm.problemPrompt,
          inputFormat: codingForm.inputFormat,
          outputFormat: codingForm.outputFormat,
          constraintsText: codingForm.constraintsText,
          timeLimitMs: Number(codingForm.timeLimitMs) || 2000,
          memoryLimitMB: Number(codingForm.memoryLimitMB) || 256,
          allowedLanguages: codingForm.allowedLanguages,
          defaultLanguage: codingForm.defaultLanguage,
          starterCodes: codingForm.starterCodes || [],
          testCases: codingForm.testCases || [],
          maxRunAttempts: Number(codingForm.maxRunAttempts) || 3,
          compareMode: codingForm.compareMode || "trimmed",
        },
        questionText: codingForm.questionText,
        marks: Number(codingForm.marks) || 5,
        domain: codingForm.domain,
        category,
        description: selectedDomain?.description || "",
        attachToSetId: selectedSetId || undefined,
      };

      if (editingId && mode === "CODING") {
        const updated = await dispatch(updateQuestion(editingId, basePayload));
        toast.success("Coding question updated successfully!");
        if (selectedSetId) {
          try {
            await dispatch(addQuestionsToSet(selectedSetId, [updated._id || updated.id || editingId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); }
        }
      } else {
        const created = await dispatch(createQuestion(basePayload));
        toast.success("Coding question created successfully!");
        if (selectedSetId) {
          try {
            const createdId = created?._id || created?.id || created;
            await dispatch(addQuestionsToSet(selectedSetId, [createdId]));
            toast.success("Question added to selected set.");
          } catch (attachErr) { console.warn("Fallback attach failed:", attachErr); toast.error("Question created but failed to add to set."); }
        }
      }
      resetForms(false);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${editingId ? "update" : "create"} coding question.`);
    }
  };

  // wrappers that close modal after submit
  const submitMcqAndClose = async (e) => {
    await handleSubmitMcq(e);
    setIsModalOpen(false);
  };
  const submitTheoryAndClose = async (e) => {
    await handleSubmitTheory(e);
    setIsModalOpen(false);
  };
  const submitCodingAndClose = async (e) => {
    await handleSubmitCoding(e);
    setIsModalOpen(false);
  };

// Replace your handleAddToSet with this version

// inside your handleAddToSet in CreateQuestion.jsx
// CreateQuestion.jsx handleAddToSet (simplified)
const handleAddToSet = async (questionOrIds, overrideSetId) => {
  const ids = Array.isArray(questionOrIds) ? questionOrIds : [questionOrIds];
  const setId = overrideSetId || selectedSetId;
  if (!setId) return toast.error("Choose a template and set first.");

  try {
    const updatedSet = await dispatch(addQuestionsToSet(setId, ids));

    // optimistic local update
    if (updatedSet && (updatedSet._id || updatedSet.id)) {
      setSets(prev =>
        prev.map(s =>
          String(s._id) === String(updatedSet._id || updatedSet.id) ? updatedSet : s
        )
      );
    }

    // refresh sets
    if (selectedTemplateId) {
      const sres = await dispatch(fetchSetsForTemplate(selectedTemplateId));
      const list = Array.isArray(sres) ? sres : sres?.sets || sres?.items || [];
      setSets(list);
    }

    // refresh questions
    if (category && currentDomainId) {
      await dispatch(fetchQuestion({ category, domain: currentDomainId }));
    }

    toast.success("Added to set");
  } catch (err) {
    console.error("Add to set error:", err);
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to add question to set.";
    toast.error(msg);
  }
};





const handleCreateSetForTemplate = async (templateId, payload = {}) => {
  // ensure we send the exact shape backend expects
  const body = {
    paperTemplateId: templateId,         // accepts either, your service accepts paperTemplateId or paperTemplate
    setLabel: (payload.setLabel || payload.label || "A").toString().trim(),
    questions: payload.questions || [],  // can be [] or list of { question: id } depending on backend normalizeQuestions
    timeLimitMin: payload.timeLimitMin,
    // add other fields if you need: randomSeed, createdBy omitted (backend uses req.user)
  };

  try {
    const created = await dispatch(createSet(templateId, body));
    // refresh sets after creation
    const sres = await dispatch(fetchSetsForTemplate(templateId));
    const list = Array.isArray(sres) ? sres : sres?.sets || sres?.items || [];
    setSets(list);
    toast.success("Set created");
    return created;
  } catch (err) {
    console.error("create set failed", err);
    toast.error("Failed to create set");
    throw err;
  }
};


  const resetForms = (clearCategory = false) => {
    setMcqForm((p) => ({ ...initialMcq, domain: clearCategory ? "" : p.domain }));
    setTheoryForm((p) => ({ ...initialTheory, domain: clearCategory ? "" : p.domain }));
    setCodingForm((p) => ({ ...initialCoding, domain: clearCategory ? "" : p.domain }));
    if (clearCategory) setCategory("");
    setEditingId(null);
  };

  const startEdit = (q) => {
    const detected = q.type === "THEORY" ? "THEORY" : q.type === "CODING" ? "CODING" : "MCQ";
    setMode(detected);
    setEditingId(q._id);

    const cat = q.category || (q.domain && typeof q.domain === "object" ? q.domain.category : "") || "";
    if (cat && cat !== category) {
      setCategory(cat);
      dispatch(fetchDomains(cat));
    }
    const dId = q.domain && typeof q.domain === "object" ? q.domain._id : q.domain;

    if (detected === "THEORY") {
      setTheoryForm({
        domain: dId || "",
        questionText: q.questionText || "",
        theoryAnswer: q.theoryAnswer || "",
        marks: q.marks ?? 5,
      });
    } else if (detected === "CODING") {
      setCodingForm({
        domain: dId || "",
        questionText: q.questionText || "",
        problemPrompt: q.coding?.problemPrompt || "",
        inputFormat: q.coding?.inputFormat || "",
        outputFormat: q.coding?.outputFormat || "",
        constraintsText: q.coding?.constraintsText || "",
        timeLimitMs: q.coding?.timeLimitMs ?? 2000,
        memoryLimitMB: q.coding?.memoryLimitMB ?? 256,
        allowedLanguages: q.coding?.allowedLanguages || ["python", "javascript"],
        defaultLanguage: q.coding?.defaultLanguage || (q.coding?.allowedLanguages?.[0] || "python"),
        starterCodes: q.coding?.starterCodes || [{ language: "python", code: "" }],
        testCases: q.coding?.testCases || [{ input: "", expectedOutput: "", isPublic: true, score: 1 }],
        maxRunAttempts: q.coding?.maxRunAttempts ?? 3,
        compareMode: q.coding?.compareMode || "trimmed",
        marks: q.marks ?? 5,
      });
    } else {
      setMcqForm({
        domain: dId || "",
        questionText: q.questionText || "",
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["", "", "", ""],
        correctAnswer: q.correctAnswer || "",
        marks: q.marks ?? 1,
      });
    }

    // open modal when editing to allow inline edit in modal
    setIsModalOpen(true);
  };

  const removeQuestion = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await dispatch(deleteQuestion(id));
      toast.success("Question deleted successfully!");
      if (editingId === id) resetForms();
    } catch {
      toast.error("Failed to delete question.");
    }
  };

  // Finalize Paper
  const [finalizeLoading, setFinalizeLoading] = useState(false);

const finalizePaper = async () => {
  const domainId = currentDomainId;

  if (!category || !domainId) {
    return toast.error("Select a category and domain first.");
  }

  const domainMatch = (q) =>
    String(q.domain && typeof q.domain === "object" ? q.domain._id : q.domain) === String(domainId);

  const domainQuestions = Array.isArray(questions) ? questions.filter(domainMatch) : [];

  // If no questions, ask for confirmation then continue.
  if (!domainQuestions.length) {
    const proceed = window.confirm(
      "There are no questions for this domain. Do you want to create an empty template (you can add questions later)?"
    );
    if (!proceed) return;
  }

  const title = `${selectedDomain?.domain || "Paper"} • ${new Date().toLocaleDateString()}`;

  setFinalizeLoading(true);
  try {
    const payload = {
      title,
      category,
      domain: domainId,
      description: selectedDomain?.description || "",
      questions: domainQuestions.map((q) => q._id), // may be []
      isPublished: false,
      durationMinutes: 0,
      createDefaultSet: !!createDefaultSet,
      defaultSetLabel: defaultSetLabel?.trim() || "A",
    };

    // createPaper should return the created template object (tpl)
    const tplResp = await dispatch(createPaper(payload));

    // your createPaper action previously returned various shapes — pick template id robustly
    const templateId = tplResp?.tpl?._id || tplResp?._id || tplResp?.id || tplResp;

    if (!templateId) {
      // still succeed gracefully if server didn't return id
      toast.success("Paper template created (server did not return template id).");
      setCreatedTemplateId(null);
      setFinalizeLoading(false);
      return;
    }

    setCreatedTemplateId(templateId);
    toast.success("Paper template created successfully!");

    if (createDefaultSet) {
      toast.info(`Default set ${defaultSetLabel || "A"} will be created (if not present).`);
    }

    // refresh templates & sets
    try {
      const refreshed = await dispatch(fetchTemplates({ category }));
      const templatesList = Array.isArray(refreshed) ? refreshed : refreshed?.items || [];
      setTemplates(templatesList);

      setSelectedTemplateId(templateId);

      const s = await dispatch(fetchSetsForTemplate(templateId));
      const setsList = Array.isArray(s) ? s : s?.sets || [];
      setSets(setsList);

      if (createDefaultSet && defaultSetLabel) {
        const target = setsList.find(
          (x) => String((x.setLabel || x.label || "").trim()).toLowerCase() === String(defaultSetLabel.trim()).toLowerCase()
        );
        if (target) {
          setSelectedSetId(target._id);
          toast.success(`Auto-selected set ${defaultSetLabel}.`);
        } else {
          toast.info(`Default set ${defaultSetLabel} not found yet — it may be created shortly.`);
        }
      }
    } catch (refreshErr) {
      console.warn("Failed to refresh templates/sets after create:", refreshErr);
    }
  } catch (err) {
    console.error(err);
    toast.error("Failed to create paper.");
  } finally {
    setFinalizeLoading(false);
  }
};


  // Coding form helpers
  const addStarterCode = () => {
    setCodingForm((p) => ({ ...p, starterCodes: [...(p.starterCodes || []), { language: p.allowedLanguages[0] || "python", code: "" }] }));
  };
  const updateStarterCode = (idx, field, value) => {
    setCodingForm((p) => {
      const arr = [...(p.starterCodes || [])];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...p, starterCodes: arr };
    });
  };
  const removeStarterCode = (idx) => {
    setCodingForm((p) => ({ ...p, starterCodes: (p.starterCodes || []).filter((_, i) => i !== idx) }));
  };

  const addTestCase = () => {
    setCodingForm((p) => ({ ...p, testCases: [...(p.testCases || []), { input: "", expectedOutput: "", isPublic: false, score: 1 }] }));
  };
  const updateTestCase = (idx, field, value) => {
    setCodingForm((p) => {
      const arr = [...(p.testCases || [])];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...p, testCases: arr };
    });
  };
  const removeTestCase = (idx) => {
    setCodingForm((p) => ({ ...p, testCases: (p.testCases || []).filter((_, i) => i !== idx) }));
  };

  const domainQuestionsCount = Array.isArray(questions)
    ? questions.filter((q) => String(q.domain && typeof q.domain === "object" ? q.domain._id : q.domain) === String(currentDomainId)).length
    : 0;

  const canFinalize = domainQuestionsCount > 0 && !finalizeLoading;

  // helpers to open/close modal
  const openModal = (startMode = null) => {
    if (startMode) setMode(startMode);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };



  // for tab switch
  // ---------- Tab state + helpers for Added Questions panel ----------
const [activeTab, setActiveTab] = useState("__added__"); // "__added__" => questions not in any set

// flexible membership check (supports common shapes)
const questionInSet = (q, setId) => {
  if (!q || !setId) return false;
  if (q.set && (String(q.set._id) === String(setId) || String(q.set) === String(setId))) return true;
  if (q.setId && String(q.setId) === String(setId)) return true;
  if (q.attachToSetId && String(q.attachToSetId) === String(setId)) return true;
  if (Array.isArray(q.sets) && q.sets.some(s => String(s) === String(setId))) return true;
  if (Array.isArray(q.setIds) && q.setIds.some(s => String(s) === String(setId))) return true;
  return false;
};

const anySetMembership = (q) => {
  if (!Array.isArray(sets) || !sets.length) return false;
  return sets.some(s => questionInSet(q, s._id));
};

// domain-filtered questions (use currentDomainId already computed)
const domainMatch = (q) => String(q.domain && typeof q.domain === "object" ? q.domain._id : q.domain) === String(currentDomainId);
const domainQuestions = Array.isArray(questions) ? questions.filter(domainMatch) : [];

// tabs array (first tab is unassigned questions)
const setTabs = [
  { id: "__added__", label: "Added Questions" },
  ...((Array.isArray(sets) ? sets : []).map((s, i) => ({ id: s._id, label: s.setLabel || s.label || `Set ${i + 1}` }))),
];

// counts
const addedCount = domainQuestions.filter(q => !anySetMembership(q)).length;
const countsBySet = {};
if (Array.isArray(sets)) {
  for (const s of sets) countsBySet[s._id] = domainQuestions.filter(q => questionInSet(q, s._id)).length;
}

// filtered questions for current tab
const filteredQuestions = activeTab === "__added__"
  ? domainQuestions.filter(q => !anySetMembership(q))
  : domainQuestions.filter(q => questionInSet(q, activeTab));

// helper used by "New Set" quick action (keeps real creation in Template panel)
const handleCreateNewSetClick = () => {
  toast.info("Create an empty set from the Template & Sets panel on the left (use 'New' or 'Create template & Set').");
};

  return (
    <main className=" bg-gray-950 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* TOP ROW: Template/Set controls + Added Questions (side-by-side on lg, stacked on sm) */}
        <div className="grid grid-cols-1  gap-6">
          {/* Template/Set controls (left) */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <TemplateSetSelector
              category={category}
              selectedDomain={selectedDomain}
              templates={templates}
              sets={sets}
              templatesLoading={templatesLoading}
              setsLoading={setsLoading}
              selectedTemplateId={selectedTemplateId}
              selectedSetId={selectedSetId}
              setSelectedTemplateId={setSelectedTemplateId}
              setSelectedSetId={setSelectedSetId}
              createDefaultSet={createDefaultSet}
              setCreateDefaultSet={setCreateDefaultSet}
              defaultSetLabel={defaultSetLabel}
              setDefaultSetLabel={setDefaultSetLabel}
              finalizePaper={finalizePaper}
              finalizeLoading={finalizeLoading}
              createdTemplateId={createdTemplateId}
              navigate={navigate}
              createSetForTemplate={handleCreateSetForTemplate}
            />
          </div>

          {/* Added Questions (right) */}
{/* Added Questions (right) - tabbed view */}
<AddedQuestionsPanel
  category={category}
  selectedDomain={selectedDomain}
  sets={sets}
  questions={questions}
  selectedSetId={selectedSetId}
  setSelectedSetId={setSelectedSetId}
  openModal={() => openModal()}
  startEdit={startEdit}
  removeQuestion={removeQuestion}
  handleAddToSet={handleAddToSet}
  onCreateSetClick={() => {
    // optionally open the Template panel or call createSet
    // e.g. navigate to template editor or call a function to create a set
    alert("Create a new set from Template & Sets panel (left)");
  }}
/>
        </div>

        {/* BOTTOM ROW: Compact area with Create button only (modal will hold actual form) */}
        {/* <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-400">Create a Question</h1>
            <p className="text-gray-400 mt-1">Click Create Question to open the form in a modal.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-900 p-2 rounded">
              <button
                onClick={() => setMode("MCQ")}
                className={`px-3 py-1 rounded ${mode === "MCQ" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                MCQ
              </button>
              <button
                onClick={() => setMode("THEORY")}
                className={`px-3 py-1 rounded ${mode === "THEORY" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                Theory
              </button>
              <button
                onClick={() => setMode("CODING")}
                className={`px-3 py-1 rounded ${mode === "CODING" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                Coding
              </button>
            </div>

            <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-white font-medium">
              Create Question
            </button>

            {createdTemplateId && (
              <button onClick={() => navigate(`/templates/${createdTemplateId}/sets`)} className="bg-green-600 hover:bg-green-500 px-3 py-2 rounded-full text-white font-medium">
                Open Sets
              </button>
            )}
          </div>
        </div> */}
      </div>

      {/* Modal — forms are shown only inside modal */}
      <CreateQuestionModal
        open={isModalOpen}
        onClose={closeModal}
        mode={mode}
        mcqForm={mcqForm}
        setMcqForm={setMcqForm}
        theoryForm={theoryForm}
        setTheoryForm={setTheoryForm}
        codingForm={codingForm}
        setCodingForm={setCodingForm}
        handleSubmitMcq={submitMcqAndClose}
        handleSubmitTheory={submitTheoryAndClose}
        handleSubmitCoding={submitCodingAndClose}
        qLoading={qLoading}
        addStarterCode={addStarterCode}
        updateStarterCode={updateStarterCode}
        removeStarterCode={removeStarterCode}
        addTestCase={addTestCase}
        updateTestCase={updateTestCase}
        removeTestCase={removeTestCase}
        editingId={editingId}
      />

      <ToastContainer position="bottom-right" autoClose={3000} />
    </main>
  );
};

export default CreateQuestion;
