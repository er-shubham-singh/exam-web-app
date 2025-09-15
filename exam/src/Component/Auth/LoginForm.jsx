import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { loginUser } from "../../Redux/User/action";
import { useNavigate } from "react-router-dom"; // ✅ import

const LoginForm = ({ onSwitch }) => {
  const { loginLoading, error } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate(); // ✅ hook

  const [form, setForm] = useState({ email: "", rollNo: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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
      navigate("/exam");
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
