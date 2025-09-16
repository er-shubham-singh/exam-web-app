// src/pages/AdminCreateEmployee.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createEmployee, listEmployees, resendTempPassword } from "../Redux/adminPermession/action";
import { toast } from "react-toastify";

export default function AdminCreateEmployee() {
  const [form, setForm] = useState({ name: "", email: "", role: "mentor", password: "" });
  const dispatch = useDispatch();

  const { create, list, resend } = useSelector((s) => s.employee);

  useEffect(() => {
    dispatch(listEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (create.success) {
      toast.success(create.message || "Employee created");
      // show generated password if returned (dev only)
      if (create.tempPassword) {
        toast.info(`Temp password for ${create.user?.email}: ${create.tempPassword}`, { autoClose: 10000 });
      }
      setForm({ name: "", email: "", role: "mentor", password: "" });
      dispatch({ type: "EMP_CLEAR_ERRORS" }); // optional clear errors
    }
    if (create.error) toast.error(create.error);

    if (resend.success) toast.success(resend.message);
    if (resend.error) toast.error(resend.error);
  }, [create, resend, dispatch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      password: form.password?.trim() ? form.password : undefined, // only include if provided
    };
    dispatch(createEmployee(payload));
  };

  const handleResend = (email) => dispatch(resendTempPassword(email));

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin: Manage Employees</h1>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow space-y-4 mb-8">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full p-2 rounded bg-gray-700 border border-gray-600" />
          </div>
          <div>
            <label className="block text-sm mb-1">Role *</label>
            <select name="role" value={form.role} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600">
              <option value="mentor">Mentor</option>
              <option value="evaluator">Evaluator</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="papercreation">paper Set</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Password (optional)</label>
            <input type="text" name="password" value={form.password} onChange={handleChange} className="w-full p-2 rounded bg-gray-700 border border-gray-600" placeholder="Leave empty to generate a temporary password" />
            <p className="text-xs text-gray-400 mt-1">If you provide a password it will be used; otherwise the system will generate a temporary password and email it.</p>
          </div>

          <button type="submit" disabled={create.loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded">
            {create.loading ? "Creating..." : "Create Employee"}
          </button>
        </form>

        <h2 className="text-xl font-semibold mb-4">Existing Employees</h2>
        {list.loading ? (
          <p>Loading employees...</p>
        ) : list.error ? (
          <p className="text-red-400">{list.error}</p>
        ) : (
          <div className="space-y-2">
            {list.employees.map((emp) => (
              <div key={emp._id} className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                <div>
                  <p className="font-medium">{emp.email}</p>
                  <p className="text-sm text-gray-400">Role: {emp.role} {emp.name && `| ${emp.name}`}</p>
                </div>
                <button onClick={() => handleResend(emp.email)} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded">Resend Password</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
