import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { login } from "../Redux/login/action";
import { toast } from "react-toastify";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const auth = useSelector((s) => s.auth || {});
  const { user, loading, error } = auth;

  useEffect(() => {
    if (user) {
      toast.success("Logged in successfully");

      switch (user.role) {
        case "admin":
          navigate("/admin/create-employee");
          break;
        case "mentor":
          navigate("/mentor");
          break;
        case "evaluator":
          navigate("/evaluate");
          break;
        case "student":
          navigate("/students");
          break;
        default:
          navigate("/unauthorized");
      }
    }

    if (error) {
      toast.error(error);
    }
  }, [user, error, navigate]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(form.email, form.password));
  };
  useEffect(() => {
  console.log("DEBUG auth slice:", auth);
  console.log("DEBUG localStorage token:", localStorage.getItem("token"));
  console.log("DEBUG localStorage authUser:", localStorage.getItem("authUser"));
}, [auth]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-lg shadow w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full p-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
