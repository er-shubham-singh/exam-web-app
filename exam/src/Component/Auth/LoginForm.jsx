
// src/components/Auth/LoginForm.jsx

import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { loginUser } from "../../Redux/User/action";
import { useNavigate, Link } from "react-router-dom";
import { fetchDomains } from "../../Redux/Domain/action";

const LoginForm = () => {
  const { loginLoading, error } = useSelector((state) => state.user);
  const { domains, loading: domainLoading, error: domainError } = useSelector((s) => s.domain);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", rollNo: "", category: "", domain: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    if (form.category) {
      dispatch(fetchDomains(form.category));
      // reset domain if category changes
      setForm((prev) => ({ ...prev, domain: "" }));
    }
  }, [form.category, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.rollNo || !form.category || !form.domain) {
      toast.error("Please fill in all fields, including category & domain.");
      return;
    }
    try {
      const res = await dispatch(loginUser(form));
      toast.success(res.message || "✅ Logged in successfully!");
      navigate("/precheck", { state: { loginResult: res, form } });
    } catch (err) {
      toast.error(err.message || "❌ Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto text-center space-y-6">
        <h1 className="text-4xl font-extrabold text-slate-800">Exam Access</h1>
        <p className="text-slate-500">Enter your details to begin the exam.</p>

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
          name="rollNo"
          value={form.rollNo}
          onChange={handleChange}
          placeholder="Roll Number"
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        />

        <select
          name="category"
          onChange={handleChange}
          value={form.category}
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        >
          <option value="">Select Category</option>
          <option value="Technical">Technical</option>
          <option value="Non-Technical">Non-technical</option>
        </select>

        <div className="space-y-2">
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

          {/* Switch Domain link */}
          <div className="text-right">
            <Link
              to="/switch-domain"
              state={{ preset: { email: form.email, name: "", category: form.category, domain: form.domain } }}
              className="text-sm text-sky-700 hover:text-sky-800 underline"
            >
              Switch domain
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loginLoading}
          className="w-full py-4 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 transition"
        >
          {loginLoading ? "Logging in..." : "Start Exam"}
        </button>

        {domainError && <p className="text-red-600">{domainError}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default LoginForm;
