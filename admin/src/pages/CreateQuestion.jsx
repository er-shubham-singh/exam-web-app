// // CreateQuestion.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { createQuestion, fetchQuestion, updateQuestion, deleteQuestion } from "../Redux/Question/Action";
// import { fetchDomains } from "../Redux/Domain/Action";
// import { toast, ToastContainer } from "react-toastify";
// import { useLocation, useNavigate } from "react-router-dom";
// import McqForm from "../Component/McqForm";
// import TheoryForm from "../Component/TheoryForm";
// import { createPaper } from "../Redux/Paper/Action";

// const initialMcq = { domain: "", questionText: "", options: ["", "", "", ""], correctAnswer: "", marks: 1 };
// const initialTheory = { domain: "", questionText: "", theoryAnswer: "", marks: 5 };

// const CreateQuestion = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const location = useLocation();

//   const { loading: qLoading, error: qError, questions } = useSelector((s) => s.question);
//   const { loading: dLoading, error: dError, domains } = useSelector((s) => s.domain);

//   const [editingId, setEditingId] = useState(null);
//   const [category, setCategory] = useState("");
//   const [mode, setMode] = useState("MCQ");

//   const [mcqForm, setMcqForm] = useState(initialMcq);
//   const [theoryForm, setTheoryForm] = useState(initialTheory);

//   // Preselect from URL
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const c = params.get("category") || "";
//     const d = params.get("domain") || "";
//     if (c) setCategory(c);
//     if (c) {
//       dispatch(fetchDomains(c)).then(() => {
//         if (d) {
//           setMcqForm((f) => ({ ...f, domain: d }));
//           setTheoryForm((f) => ({ ...f, domain: d }));
//         }
//       });
//     }
//   }, [dispatch]);



//   const currentDomainId = mode === "MCQ" ? mcqForm.domain : theoryForm.domain;

//   const selectedDomain = useMemo(
//     () => domains?.find((x) => String(x._id) === String(currentDomainId)) || null,
//     [domains, currentDomainId]
//   );

//   useEffect(() => {
//   if (!category || !currentDomainId) return;
//   dispatch(fetchQuestion({ category, domain: currentDomainId }));
// }, [dispatch, category, currentDomainId]);

//   // Validation
//   const validateMcq = () => {
//     const { questionText, options, correctAnswer, domain } = mcqForm;
//     if (!category) return "Please select a category.";
//     if (!domain) return "Please select a domain.";
//     if (!questionText.trim()) return "Please enter the question text.";
//     if (!options.every((o) => o.trim())) return "Please provide all four options.";
//     if (!correctAnswer) return "Please select the correct answer.";
//     return null;
//   };
//   const validateTheory = () => {
//     const { questionText, domain } = theoryForm;
//     if (!category) return "Please select a category.";
//     if (!domain) return "Please select a domain.";
//     if (!questionText.trim()) return "Please enter the theory question.";
//     return null;
//   };

//   // Submit handlers
//   const handleSubmitMcq = async (e) => {
//     e.preventDefault();
//     const err = validateMcq();
//     if (err) return toast.error(err);
//     try {
//       if (editingId && mode === "MCQ") {
//         await dispatch(updateQuestion(editingId, { ...mcqForm, type: "MCQ" }));
//         toast.success("MCQ updated successfully!");
//       } else {
//         await dispatch(createQuestion({ ...mcqForm, type: "MCQ" }));
//         toast.success("MCQ created successfully!");
//       }
//       resetForms(false);
//     } catch {
//       toast.error(`Failed to ${editingId ? "update" : "create"} MCQ.`);
//     }
//   };

//   const handleSubmitTheory = async (e) => {
//     e.preventDefault();
//     const err = validateTheory();
//     if (err) return toast.error(err);
//     try {
//       if (editingId && mode === "THEORY") {
//         await dispatch(updateQuestion(editingId, { ...theoryForm, type: "THEORY" }));
//         toast.success("Theory question updated successfully!");
//       } else {
//         await dispatch(createQuestion({ ...theoryForm, type: "THEORY" }));
//         toast.success("Theory question created successfully!");
//       }
//       resetForms(false);
//     } catch {
//       toast.error(`Failed to ${editingId ? "update" : "create"} theory question.`);
//     }
//   };

//   const resetForms = (clearCategory = false) => {
//     setMcqForm((p) => ({ ...initialMcq, domain: clearCategory ? "" : p.domain }));
//     setTheoryForm((p) => ({ ...initialTheory, domain: clearCategory ? "" : p.domain }));
//     if (clearCategory) setCategory("");
//     setEditingId(null);
//   };

//   // Start edit
//   const startEdit = (q) => {
//     const detected = q.type === "THEORY" ? "THEORY" : "MCQ";
//     setMode(detected);
//     setEditingId(q._id);

//     const cat = q.category || (q.domain && typeof q.domain === "object" ? q.domain.category : "") || "";
//     if (cat && cat !== category) {
//       setCategory(cat);
//       dispatch(fetchDomains(cat));
//     }
//     const dId = q.domain && typeof q.domain === "object" ? q.domain._id : q.domain;

//     if (detected === "THEORY") {
//       setTheoryForm({
//         domain: dId || "",
//         questionText: q.questionText || "",
//         theoryAnswer: q.theoryAnswer || "",
//         marks: q.marks ?? 5,
//       });
//     } else {
//       setMcqForm({
//         domain: dId || "",
//         questionText: q.questionText || "",
//         options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["", "", "", ""],
//         correctAnswer: q.correctAnswer || "",
//         marks: q.marks ?? 1,
//       });
//     }
//   };

//   const removeQuestion = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this question?")) return;
//     try {
//       await dispatch(deleteQuestion(id));
//       toast.success("Question deleted successfully!");
//       if (editingId === id) resetForms();
//     } catch {
//       toast.error("Failed to delete question.");
//     }
//   };

//   // NEW: Finalize Paper -> show toast & redirect
// // Finalize Paper -> create on backend, toast, then redirect
// const finalizePaper = async () => {
//   const domainId = currentDomainId;

//   if (!category || !domainId) {
//     return toast.error("Select a category and domain first.");
//   }

//   // include ALL questions from the current domain
//   const domainMatch = (q) =>
//     String(q.domain && typeof q.domain === "object" ? q.domain._id : q.domain) === String(domainId);

//   const domainQuestions = Array.isArray(questions) ? questions.filter(domainMatch) : [];

//   if (!domainQuestions.length) {
//     return toast.error("No questions found for this domain.");
//   }

//   // auto title (change as you like)
//   const title =
//     `${selectedDomain?.domain || "Paper"} • ${new Date().toLocaleDateString()}`;

//   try {
//     await dispatch(
//       createPaper({
//         title,
//         category,
//         domain: domainId,
//         description: selectedDomain?.description || "",
//         questions: domainQuestions.map((q) => q._id),
//         isPublished: false,
//         durationMinutes: 0,
//       })
//     );

//     toast.success("Paper created successfully!");
//     // setTimeout(() => navigate("/"), 1200);
//   } catch {
//     // In your thunk you already catch & dispatch FAIL, but we keep a guard here
//     toast.error("Failed to create paper.");
//   }
// };


//   return (
//     <main className="h-[60%] bg-gray-950 text-white p-1 md:p-2 lg:p-3">
//       <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 ">
//         {/* Left - Form Section */}
//         <div className="w-full ">
//           <div className="flex items-end justify-between">
//             <div>
//               <h1 className="text-4xl lg:text-5xl font-extrabold mb-2 text-blue-400">
//                 {editingId ? "Edit Question" : "Create a Question"}
//               </h1>
//               <p className="text-gray-400 mb-2">
//                 Select a question type and fill in the details to create a new question or edit an existing one.
//               </p>
//             </div>
//             {/* Finalize Paper button */}
//             <button
//               onClick={finalizePaper}
//               className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-white font-semibold shadow-md h-max"
//             >
//               Finalize Paper
//             </button>
//           </div>

//           <div className="w-full h-1 bg-gray-700 my-4 rounded-full"></div>

//           <div className="space-y-6 overflow-y-auto max-h-[79.2vh] pr-4 custom-scrollbar">
//             <div className="bg-gray-800 rounded-xl p-4 shadow-2xl border border-gray-700 ">
//               {/* Mode toggles */}
//               <div className="flex items-center gap-4 mb-2">
//                 <button
//                   type="button"
//                   onClick={() => setMode("MCQ")}
//                   className={`py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
//                     mode === "MCQ" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
//                   }`}
//                 >
//                   Multiple Choice Question
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setMode("THEORY")}
//                   className={`py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
//                     mode === "THEORY" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
//                   }`}
//                 >
//                   Theory Question
//                 </button>
//               </div>

//               {/* Category & Domain (read-only) */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
//                   <input
//                     type="text"
//                     value={category || "Not selected"}
//                     disabled
//                     className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-400 mb-2">Domain</label>
//                   <input
//                     type="text"
//                     value={selectedDomain?.domain || "Not selected"}
//                     disabled
//                     className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
//                   />
//                 </div>
//               </div>

//               {/* Dynamic Form */}
//               {mode === "MCQ" ? (
//                 <McqForm
//                   value={mcqForm}
//                   onChange={setMcqForm}
//                   onSubmit={handleSubmitMcq}
//                   onReset={() => setMcqForm((p) => ({ ...initialMcq, domain: p.domain }))}
//                   loading={qLoading}
//                 />
//               ) : (
//                 <TheoryForm
//                   value={theoryForm}
//                   onChange={setTheoryForm}
//                   onSubmit={handleSubmitTheory}
//                   onReset={() => setTheoryForm((p) => ({ ...initialTheory, domain: p.domain }))}
//                   loading={qLoading}
//                 />
//               )}

//               {(qError || dError) && <p className="text-red-400 mt-4 text-center">{qError || dError}</p>}
//             </div>
//           </div>
//         </div>

//         {/* Right - Question List (no checkboxes) */}
//         <div className="w-full">
//           <div className="sticky top-0 bg-gray-950 z-10 py-6">
//             <h2 className="text-3xl font-bold mb-2 text-blue-400">Added Questions</h2>
//             <p className="text-gray-400">
//               {category || "Category"}{selectedDomain ? ` • ${selectedDomain.domain}` : ""}
//             </p>
//             <div className="w-full h-1 bg-gray-700 my-4 rounded-full"></div>
//           </div>

//           <div className="space-y-6 overflow-y-auto max-h-[77vh] pr-4 custom-scrollbar">
//             {qLoading && !questions?.length ? (
//               <div className="text-center text-gray-400 py-10">Loading questions...</div>
//             ) : Array.isArray(questions) && questions.length > 0 ? (
//               questions.map((q) => {
//                 const isTheory = q.type === "THEORY";
//                 return (
//                   <div
//                     key={q._id}
//                     className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 transition-transform transform hover:scale-[1.01] hover:shadow-xl duration-200"
//                   >
//                     <p className="text-lg font-semibold mb-3 text-white">
//                       {isTheory ? "Theory Question" : "MCQ Question"}
//                     </p>
//                     <p className="mb-4 text-gray-300">{q.questionText}</p>

//                     {!isTheory ? (
//                       <ul className="list-none space-y-2 text-sm">
//                         {q.options?.map((opt, i) => (
//                           <li
//                             key={i}
//                             className={`p-2 rounded-lg ${q.correctAnswer === String.fromCharCode(65 + i) ? "bg-green-700 text-white font-bold" : "bg-gray-700 text-gray-300"}`}
//                           >
//                             <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
//                           </li>
//                         ))}
//                       </ul>
//                     ) : (
//                       q.theoryAnswer && (
//                         <p className="mt-4 text-sm text-gray-400 border-l-4 border-blue-500 pl-4 italic">
//                           <strong className="text-white">Model Answer:</strong> {q.theoryAnswer}
//                         </p>
//                       )
//                     )}

//                     <p className="mt-4 text-sm text-gray-400">
//                       <strong className="text-white">Marks:</strong> {q.marks}
//                     </p>

//                     <div className="flex gap-4 mt-6">
//                       <button
//                         onClick={() => startEdit(q)}
//                         className="bg-yellow-600 hover:bg-yellow-500 px-5 py-2 rounded-full text-white font-semibold transition-colors shadow-md"
//                       >
//                         Edit
//                       </button>
//                       <button
//                         onClick={() => removeQuestion(q._id)}
//                         className="bg-red-600 hover:bg-red-500 px-5 py-2 rounded-full text-white font-semibold transition-colors shadow-md"
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   </div>
//                 );
//               })
//             ) : (
//               <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-center">
//                 <h3 className="text-2xl font-bold mb-2 text-white">No questions added yet</h3>
//                 <p className="text-gray-400">Fill out the form to add your first question.</p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//       <ToastContainer position="bottom-right" autoClose={3000} />
//     </main>
//   );
// };

// export default CreateQuestion;


// CreateQuestion.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createQuestion, fetchQuestion, updateQuestion, deleteQuestion } from "../Redux/Question/Action";
import { fetchDomains } from "../Redux/Domain/Action";
import { toast, ToastContainer } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import McqForm from "../Component/McqForm";
import TheoryForm from "../Component/TheoryForm";
import { createPaper } from "../Redux/Paper/Action";

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
  starterCodes: [ { language: "python", code: "" } ],
  testCases: [ { input: "", expectedOutput: "", isPublic: true, score: 1 } ],
  maxRunAttempts: 3,
  marks: 5,
  compareMode: "trimmed",
};

const CreateQuestion = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { loading: qLoading, error: qError, questions } = useSelector((s) => s.question);
  const { loading: dLoading, error: dError, domains } = useSelector((s) => s.domain);

  const [editingId, setEditingId] = useState(null);
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("MCQ");

  const [mcqForm, setMcqForm] = useState(initialMcq);
  const [theoryForm, setTheoryForm] = useState(initialTheory);
  const [codingForm, setCodingForm] = useState(initialCoding);

  // Preselect from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("category") || "";
    const d = params.get("domain") || "";
    if (c) setCategory(c);
    if (c) {
      dispatch(fetchDomains(c)).then(() => {
        if (d) {
          setMcqForm((f) => ({ ...f, domain: d }));
          setTheoryForm((f) => ({ ...f, domain: d }));
          setCodingForm((f) => ({ ...f, domain: d }));
        }
      });
    }
  }, [dispatch]);

  const currentDomainId = mode === "MCQ" ? mcqForm.domain : mode === "THEORY" ? theoryForm.domain : codingForm.domain;

  const selectedDomain = useMemo(
    () => domains?.find((x) => String(x._id) === String(currentDomainId)) || null,
    [domains, currentDomainId]
  );

  useEffect(() => {
    if (!category || !currentDomainId) return;
    dispatch(fetchQuestion({ category, domain: currentDomainId }));
  }, [dispatch, category, currentDomainId]);

  // Validation
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
      if (typeof t.input === "undefined" || typeof t.expectedOutput === "undefined" || String(t.input).trim()==="") {
        return `Test case ${i+1} must have input and expected output.`;
      }
    }
    if (!Array.isArray(c.allowedLanguages) || !c.allowedLanguages.length) return "Allowed languages required.";
    if (!c.defaultLanguage) return "Select default language.";
    if (!Number(c.maxRunAttempts) || Number(c.maxRunAttempts) <= 0) return "maxRunAttempts must be positive.";
    return null;
  };

  // Submit handlers
  const handleSubmitMcq = async (e) => {
    e.preventDefault();
    const err = validateMcq();
    if (err) return toast.error(err);
    try {
      if (editingId && mode === "MCQ") {
        await dispatch(updateQuestion(editingId, { ...mcqForm, type: "MCQ" }));
        toast.success("MCQ updated successfully!");
      } else {
        await dispatch(createQuestion({ ...mcqForm, type: "MCQ" }));
        toast.success("MCQ created successfully!");
      }
      resetForms(false);
    } catch {
      toast.error(`Failed to ${editingId ? "update" : "create"} MCQ.`);
    }
  };

  const handleSubmitTheory = async (e) => {
    e.preventDefault();
    const err = validateTheory();
    if (err) return toast.error(err);
    try {
      if (editingId && mode === "THEORY") {
        await dispatch(updateQuestion(editingId, { ...theoryForm, type: "THEORY" }));
        toast.success("Theory question updated successfully!");
      } else {
        await dispatch(createQuestion({ ...theoryForm, type: "THEORY" }));
        toast.success("Theory question created successfully!");
      }
      resetForms(false);
    } catch {
      toast.error(`Failed to ${editingId ? "update" : "create"} theory question.`);
    }
  };

  const handleSubmitCoding = async (e) => {
    e.preventDefault();
    const err = validateCoding();
    if (err) return toast.error(err);
    try {
      // assemble coding payload within question
      const payload = {
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
      };

      if (editingId && mode === "CODING") {
        await dispatch(updateQuestion(editingId, payload));
        toast.success("Coding question updated successfully!");
      } else {
        await dispatch(createQuestion(payload));
        toast.success("Coding question created successfully!");
      }

      resetForms(false);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${editingId ? "update" : "create"} coding question.`);
    }
  };

  const resetForms = (clearCategory = false) => {
    setMcqForm((p) => ({ ...initialMcq, domain: clearCategory ? "" : p.domain }));
    setTheoryForm((p) => ({ ...initialTheory, domain: clearCategory ? "" : p.domain }));
    setCodingForm((p) => ({ ...initialCoding, domain: clearCategory ? "" : p.domain }));
    if (clearCategory) setCategory("");
    setEditingId(null);
  };

  // Start edit
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

  // NEW: Finalize Paper -> show toast & redirect
  const finalizePaper = async () => {
    const domainId = currentDomainId;

    if (!category || !domainId) {
      return toast.error("Select a category and domain first.");
    }

    // include ALL questions from the current domain
    const domainMatch = (q) =>
      String(q.domain && typeof q.domain === "object" ? q.domain._id : q.domain) === String(domainId);

    const domainQuestions = Array.isArray(questions) ? questions.filter(domainMatch) : [];

    if (!domainQuestions.length) {
      return toast.error("No questions found for this domain.");
    }

    // auto title (change as you like)
    const title = `${selectedDomain?.domain || "Paper"} • ${new Date().toLocaleDateString()}`;

    try {
      await dispatch(
        createPaper({
          title,
          category,
          domain: domainId,
          description: selectedDomain?.description || "",
          questions: domainQuestions.map((q) => q._id),
          isPublished: false,
          durationMinutes: 0,
        })
      );

      toast.success("Paper created successfully!");
      // setTimeout(() => navigate("/"), 1200);
    } catch {
      toast.error("Failed to create paper.");
    }
  };

  // Simple UI helpers for coding form
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

  // UI render
  return (
    <main className="h-[60%] bg-gray-950 text-white p-1 md:p-2 lg:p-3">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 ">
        {/* Left - Form Section */}
        <div className="w-full ">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl lg:text-5xl font-extrabold mb-2 text-blue-400">
                {editingId ? "Edit Question" : "Create a Question"}
              </h1>
              <p className="text-gray-400 mb-2">
                Select a question type and fill in the details to create a new question or edit an existing one.
              </p>
            </div>
            {/* Finalize Paper button */}
            <button
              onClick={finalizePaper}
              className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-white font-semibold shadow-md h-max"
            >
              Finalize Paper
            </button>
          </div>

          <div className="w-full h-1 bg-gray-700 my-4 rounded-full"></div>

          <div className="space-y-6 overflow-y-auto max-h-[79.2vh] pr-4 custom-scrollbar">
            <div className="bg-gray-800 rounded-xl p-4 shadow-2xl border border-gray-700 ">
              {/* Mode toggles */}
              <div className="flex items-center gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setMode("MCQ")}
                  className={`py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
                    mode === "MCQ" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Multiple Choice Question
                </button>
                <button
                  type="button"
                  onClick={() => setMode("THEORY")}
                  className={`py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
                    mode === "THEORY" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Theory Question
                </button>
                <button
                  type="button"
                  onClick={() => setMode("CODING")}
                  className={`py-3 px-6 rounded-full font-semibold transition-all duration-300 ${
                    mode === "CODING" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Coding Question
                </button>
              </div>

              {/* Category & Domain (read-only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                  <input
                    type="text"
                    value={category || "Not selected"}
                    disabled
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Domain</label>
                  <input
                    type="text"
                    value={selectedDomain?.domain || "Not selected"}
                    disabled
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Dynamic Form */}
              {mode === "MCQ" ? (
                <McqForm
                  value={mcqForm}
                  onChange={setMcqForm}
                  onSubmit={handleSubmitMcq}
                  onReset={() => setMcqForm((p) => ({ ...initialMcq, domain: p.domain }))}
                  loading={qLoading}
                />
              ) : mode === "THEORY" ? (
                <TheoryForm
                  value={theoryForm}
                  onChange={setTheoryForm}
                  onSubmit={handleSubmitTheory}
                  onReset={() => setTheoryForm((p) => ({ ...initialTheory, domain: p.domain }))}
                  loading={qLoading}
                />
              ) : (
                // CODING FORM (inline)
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
                    <button type="button" onClick={() => setCodingForm((p) => ({ ...initialCoding, domain: p.domain }))} className="bg-gray-600 px-5 py-2 rounded-full">Reset</button>
                  </div>
                </form>
              )}

              {(qError || dError) && <p className="text-red-400 mt-4 text-center">{qError || dError}</p>}
            </div>
          </div>
        </div>

        {/* Right - Question List (no checkboxes) */}
        <div className="w-full">
          <div className="sticky top-0 bg-gray-950 z-10 py-6">
            <h2 className="text-3xl font-bold mb-2 text-blue-400">Added Questions</h2>
            <p className="text-gray-400">
              {category || "Category"}{selectedDomain ? ` • ${selectedDomain.domain}` : ""}
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
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </main>
  );
};

export default CreateQuestion;
