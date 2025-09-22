// PaperSubmit.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast, ToastContainer } from "react-toastify";

import { createTemplate } from "../Redux/papertemplate/action";
import { createSet } from "../Redux/paperSet/action";

const PaperSubmit = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state } = useLocation();
  // expected state: { category, domain, description, selected }  (selected = array of questionIds)

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [publish, setPublish] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // new UI flags for template+set flow
  const [createDefaultSet, setCreateDefaultSet] = useState(true);
  const [defaultSetLabel, setDefaultSetLabel] = useState("A");

  // store created ids for quick navigation
  const [createdTemplateId, setCreatedTemplateId] = useState(null);
  const [createdSetId, setCreatedSetId] = useState(null);

  useEffect(() => {
    if (!state?.category || !state?.domain) {
      toast.error("Missing paper info. Please try again.");
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPaper = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      return toast.error("Please enter a paper title.");
    }
    setSubmitting(true);

    // questions coming from previous page (selected) — fallback to []
    const questions = Array.isArray(state?.selected) ? state.selected : [];

    try {
      // prefer creating a Template (clean separation)
      const tplPayload = {
        title: title.trim(),
        category: state.category,
        domain: state.domain,
        description: state.description || "",
        questionBank: questions, // template field name we use in new API
        isPublished: !!publish,
        defaultTimeLimitMin: Number(duration) || 0,
        createDefaultSet: false, // we will create set explicitly below
      };

      // create Template
      const tpl = await dispatch(createTemplate(tplPayload));
      const tplId = tpl?._id || tpl?.id || tpl;
      setCreatedTemplateId(tplId);

      toast.success("Paper template created successfully!");

      // Optionally create a set for this template
      if (createDefaultSet) {
        const setPayload = {
          setLabel: defaultSetLabel?.trim() || "A",
          questions: questions || [],
          timeLimitMin: Number(duration) || tpl?.defaultTimeLimitMin || 0,
        };

        const setRes = await dispatch(createSet(tplId, setPayload));
        // setRes returned shape depends on backend — try common paths
        const setId = setRes?._id || setRes?.id || (setRes && setRes.message && setRes.message._id) || null;
        setCreatedSetId(setId);
        toast.success(`Set ${setPayload.setLabel} created for template.`);
      }

      // success UX
      toast.success("Paper workflow finished.");
      // optionally redirect to templates list or sets page
      setTimeout(() => {
        if (createdSetId) navigate(`/templates/${createdTemplateId}/sets`);
        else navigate("/"); // or `/templates/${createdTemplateId}`
      }, 900);
    } catch (err) {
      console.error(err);
      // if your app still uses createPaper route, fallback attempt:
      try {
        // import and use createPaper if your backend doesn't support new endpoints
        // const res = await dispatch(createPaper({ title, category: state.category, domain: state.domain, description: state.description || "", questions, isPublished: publish, durationMinutes: Number(duration) || 0 }));
        // toast.success("Paper created using fallback createPaper.");
      } catch (fallbackErr) {
        console.error("fallback failed", fallbackErr);
      }
      toast.error("Failed to create paper/template.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-8 lg:p-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-blue-400">Finalize Paper</h1>
        <p className="text-gray-400 mt-1">
          {state?.category || "Category"}
          {state?.description ? ` • ${state.description}` : ""}
        </p>

        <section className="bg-gray-800 rounded-2xl border border-gray-700 p-6 mt-6">
          <form onSubmit={submitPaper} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Paper Title</label>
              <input
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100"
                placeholder="e.g., Web Dev Unit Test - 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-100"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="flex items-end justify-between gap-4">
                <label className="inline-flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-blue-600"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                  />
                  <span className="text-gray-200">Publish now</span>
                </label>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={createDefaultSet}
                      onChange={(e) => setCreateDefaultSet(e.target.checked)}
                      className="w-4 h-4 rounded bg-gray-700 border border-gray-600"
                    />
                    Create default Set
                  </label>
                  {createDefaultSet && (
                    <input
                      value={defaultSetLabel}
                      onChange={(e) => setDefaultSetLabel(e.target.value)}
                      className="w-16 p-2 rounded bg-gray-700 border border-gray-600 text-gray-200 text-sm"
                      placeholder="Label"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-full text-white font-semibold disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Final Submit"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-full text-white font-semibold"
              >
                Cancel
              </button>

              {createdTemplateId && (
                <button
                  type="button"
                  onClick={() => navigate(`/templates/${createdTemplateId}/sets`)}
                  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-full text-white font-medium shadow-md"
                >
                  Open Sets
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
      <ToastContainer position="bottom-right" autoClose={2000} />
    </main>
  );
};

export default PaperSubmit;
