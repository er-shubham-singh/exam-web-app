import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { loginUser } from "../../Redux/User/action";
import { useNavigate } from "react-router-dom"; // ✅ import
import { fetchDomains } from "../../Redux/Domain/action";

const LoginForm = ({ onSwitch }) => {
  const { loginLoading, error } = useSelector((state) => state.user);
  const {domains, loading: domainLoading, error: domainError} = useSelector((s)=>s.domain)
  const dispatch = useDispatch();
  const navigate = useNavigate(); // ✅ hook

  const [form, setForm] = useState({ email: "", rollNo: "", category:"", domain:"" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

// Fetch domain
useEffect(()=>{
if(form.category){
  dispatch(fetchDomains(form.category))
}
}, [form.category,dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.rollNo) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      const res = await dispatch(loginUser(form)); // returns res.data
      toast.success(res.message || "✅ Logged in successfully!");

      // ✅ Navigate to exam page after login
      navigate("/precheck", {state:{loginResult:res,form}});
    } catch (err) {
      toast.error(err.message || "❌ Login failed. Please try again.");
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>

      <h1 className="text-3xl font-bold text-white text-center">Login</h1>
      <p className="text-center text-slate-400 mb-4">
        Enter your email and roll number.
      </p>

      {/* Email */}
      <input
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Email"
        className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
        required
      />

      {/* Roll Number */}
      <input
        type="text"
        name="rollNo"
        value={form.rollNo}
        onChange={handleChange}
        placeholder="Roll Number"
        className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
        required
      />

  {/* Category */}
      <select
      type="text"
      name="category"
      onChange={handleChange}
      value={form.category}
      placeholder="Select category"
      className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
      required>
        <option value="">Select Category</option>
        <option value="Technical">Technical</option>
        <option value="Non-Technical">Non-technical</option>
      </select>

      {/* Domain */}
      <select
      name="domain"
      type="text"
      onChange={handleChange}
      className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
      disabled={!form.category||domainLoading}>
        <option value="">{!form.category?"Select Category first":domainLoading?"Loading...":"Select Domain"}</option>
        {domains.map((d)=>
        <option key={d._id} value={d._id}>
          {d.domain}
        </option>)}

      </select>
      {/* Submit */}
      <button
        type="submit"
        disabled={loginLoading}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-500"
      >
        {loginLoading ? "Logging in..." : "Login"}
      </button>

      {/* Switch to Register */}
      <p className="text-center text-slate-400">
        New user?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-sky-400 hover:underline"
        >
          Register here
        </button>
      </p>

      {/* Error Fallback */}
      {error && <p className="text-red-400 text-center">{error}</p>}
    </form>
  );
};

export default LoginForm;
