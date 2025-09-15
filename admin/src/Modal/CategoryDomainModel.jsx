// components/modals/CategoryDomainModal.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDomains } from "../Redux/Domain/Action";


const CategoryDomainModal = ({ open, onClose, onProceed }) => {
  const dispatch = useDispatch();
  const { loading: dLoading, error: dError, domains } = useSelector((s) => s.domain);

  const [category, setCategory] = useState("");
  const [domainId, setDomainId] = useState("");

  // Reset form whenever modal opens/closes
  useEffect(() => {
    if (!open) {
      setCategory("");
      setDomainId("");
    }
  }, [open]);

  // Load domains when category changes
  useEffect(() => {
    if (!category) {
      setDomainId("");
      return;
    }
    dispatch(fetchDomains(category));
    setDomainId("");
  }, [category, dispatch]);

  if (!open) return null;

const handleSubmit = () => {
  if (!category || !domainId) return;
  // domainId is already the _id of the domain
  onProceed?.({ category, domain: domainId });
};


  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Modal card */}
      <div className="relative z-50 max-w-md mx-auto top-[30%] bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-2xl font-semibold mb-4 text-white">Start Paper Creation</h3>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-sm mb-1 text-gray-300">Category</label>
          <select
            className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            <option value="Technical">Technical</option>
            <option value="Non-Technical">Non-Technical</option>
          </select>
        </div>

        {/* Domain */}
        <div className="mb-6">
          <label className="block text-sm mb-1 text-gray-300">Domain</label>
          <select
            className="w-full p-2 rounded bg-gray-900 border border-gray-700 text-white"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            disabled={!category || dLoading}
          >
            <option value="">
              {!category ? "Select category first" : dLoading ? "Loading..." : "Select domain"}
            </option>
            {Array.isArray(domains) &&
              domains.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.domain}
                </option>
              ))}
          </select>
          {dError && <p className="text-xs text-red-400 mt-1">{dError}</p>}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!category || !domainId}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryDomainModal;
