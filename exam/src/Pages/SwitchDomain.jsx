// src/pages/Auth/SwitchDomain.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchDomains } from "../Redux/Domain/action";
// import { switchUserDomain } from "../../Redux/User/action"; // If you have it
import axios from "axios";
import { registerUser } from "../Redux/User/action";

const SwitchDomain = () => {
  const location = useLocation();
  const preset = useMemo(() => location.state?.preset || {}, [location.state]);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { domains, loading: domainLoading, error: domainError } = useSelector((s) => s.domain);

  const [form, setForm] = useState({
    email: preset.email || "",
    name: preset.name || "",
    category: preset.category || "",
    domain: preset.domain || "",
  });

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (form.category) {
      dispatch(fetchDomains(form.category));
      setForm((prev) => ({ ...prev, domain: "" })); // reset domain on category change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.name || !form.category || !form.domain) {
      toast.error("Please fill in all fields.");
      return;
    }
    toast.promise(dispatch(registerUser(form)), {
      pending: "Registering user and sending roll number...",
      success: {
        render({ data }) {
          return data.emailStatus === "FAILED"
            ? "⚠️ User registered, but email sending failed."
            : "✅ Roll number sent to your registered email!";
        },
        autoClose: 4000,
      },
      error: {
        render({ data }) {
          return `❌ ${
            data?.response?.data?.message || "Failed to register user"
          }`;
        },
        autoClose: 4000,
      },
    });

    setForm({ name: "", email: "", category: "" });
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto text-center space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-800">Switch Domain</h1>
        <p className="text-slate-500">Update your exam domain before starting.</p>

        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        />

        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Full Name"
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        >
          <option value="">Select Category</option>
          <option value="Technical">Technical</option>
          <option value="Non-Technical">Non-technical</option>
        </select>

        <select
          name="domain"
          value={form.domain}
          onChange={handleChange}
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          disabled={!form.category || domainLoading}
          required
        >
          <option value="">
            {!form.category ? "Select Category first" : domainLoading ? "Loading..." : "Select Domain"}
          </option>
          {domains.map((d) => (
            <option key={d._id} value={d._id}>
              {d.domain}
            </option>
          ))}
        </select>

        {domainError && <p className="text-red-600">{domainError}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-1/2 py-3 rounded-xl font-semibold text-sky-700 bg-white border border-sky-200 hover:bg-sky-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-1/2 py-3 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 transition"
          >
            Save & Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default SwitchDomain;
