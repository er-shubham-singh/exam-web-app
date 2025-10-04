// TemplateSelector.jsx
import React, { useMemo, useState } from "react";
const TemplateSelector = ({
  templates = [],
  sets = [],
  templatesLoading,
  setsLoading,
  selectedTemplateId,
  selectedSetId,
  setSelectedTemplateId,
  setSelectedSetId,
  createDefaultSet,
  setCreateDefaultSet,
  defaultSetLabel,
  setDefaultSetLabel,
  finalizePaper,
  finalizeLoading,
  createdTemplateId,
  navigate,
  createSetForTemplate,
  category,
  selectedDomain,
}) => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Helpful fallback label generator for sets (A, B, C or numeric)
  const nextSetLabel = useMemo(() => {
    if (!sets || !sets.length) return "A";
    const labels = sets.map(s => (s.setLabel || s.label || "").toString().trim()).filter(Boolean);
    const letters = labels.filter(l => /^[A-Z]$/i.test(l)).map(l => l.toUpperCase());
    if (letters.length) {
      const max = letters.reduce((m, l) => (l > m ? l : m), "A");
      return String.fromCharCode(max.charCodeAt(0) + 1);
    }
    const nums = labels.map(l => parseInt(l,10)).filter(Number.isFinite);
    return nums.length ? String(Math.max(...nums)+1) : "A";
  }, [sets]);

  const performCreateSet = async (templateId, label) => {
    // prefer parent-provided handler
    if (typeof createSetForTemplate === "function") {
      return createSetForTemplate(templateId, { label });
    }

    // fallback: try to POST directly to backend endpoint (needs auth cookie / token in browser)
    const url = `/templates/${templateId}/sets`;
    const body = { setLabel: label };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to create set (${res.status})`);
    }
    const payload = await res.json();
    // expecting created set in payload (or something)
    return payload;
  };

  const handleCreateSet = async (label) => {
    if (!selectedTemplateId) {
      setError("Choose a template first.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      await performCreateSet(selectedTemplateId, label || nextSetLabel);
      // parent should fetch sets again. If parent didn't, we try to be helpful by dispatching fetch via a callback,
      // but since this component doesn't have dispatch, we assume parent will refresh sets after this resolves.
    } catch (e) {
      setError(e?.message || "Failed to create set");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-start justify-between px-2 ">
        <div>
          <h3 className="text-lg font-semibold text-white ">Template & Sets</h3>
          <p className="text-sm text-gray-400 mb-3">Select template and set, or create new.</p>
        </div>

        {/* show Category & Domain at top-right for clarity */}
        <div className="flex items-center justify-between  gap-10 text-sm">
          {category && <div><span className="text-xs text-gray-300">Category</span><div className="font-semibold text-white">{category}</div></div>}
          {selectedDomain && <div className=""><span className="text-xs text-gray-300">Domain</span><div className="font-semibold text-white">{selectedDomain.domain || selectedDomain.name}</div></div>}
        </div>
      </div>
      {/* if no templates, show helpful CTA */}
      {(!templates || !templates.length) && (
        <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-800">
          <p className="text-sm text-gray-300 mb-2">No templates for this category. Create one from domain questions.</p>
          <div className="flex gap-3 items-center">
            <input
              value={defaultSetLabel}
              onChange={(e)=> setDefaultSetLabel(e.target.value)}
              className="w-20 p-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
              aria-label="default set label"
            />
            <button
              onClick={finalizePaper}
              disabled={finalizeLoading}
              className={`px-4 py-2 rounded-full text-white ${finalizeLoading ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-500"}`}
            >
              {finalizeLoading ? "Creating..." : `Create template & Set ${defaultSetLabel || "A"}`}
            </button>

            {/* helpful hint */}
            <span className="text-xs text-gray-400 ml-3">This will create a template from current domain's questions.</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-xs text-gray-300">Template (optional)</label>
          <select
            value={selectedTemplateId || ""}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
          >
            <option value="">— choose template —</option>
            {templates.map(t => (
              <option key={t._id || t.id} value={t._id || t.id}>
                {t.title || t.name || t.label || t._id || t.id}
              </option>
            ))}
          </select>
          {templatesLoading && <p className="text-xs text-gray-400 mt-1">Loading templates…</p>}
        </div>

        <div>
          <label className="text-xs text-gray-300">Set (optional)</label>
          <div className="flex gap-2">
            <select
              value={selectedSetId || ""}
              onChange={(e) => setSelectedSetId(e.target.value)}
              disabled={!selectedTemplateId}
              className="flex-1 p-2 rounded bg-gray-900 border border-gray-700 text-gray-200"
            >
              <option value="">— choose set —</option>
              {sets.map(s => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.setLabel || s.label || s._id || s.id}{s.questionCount ? ` · ${s.questionCount} Qs` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleCreateSet(nextSetLabel)}
              disabled={!selectedTemplateId || creating}
              className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
              title={`Create new set (${nextSetLabel})`}
            >
              {creating ? "..." : `New ${nextSetLabel}`}
            </button>
          </div>
          {setsLoading && <p className="text-xs text-gray-400 mt-1">Loading sets…</p>}
        </div>
      </div>



      {!!error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
};

export default TemplateSelector;
