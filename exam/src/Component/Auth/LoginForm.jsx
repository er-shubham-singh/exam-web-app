// import React, { useEffect, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { toast } from "react-toastify";
// import { loginUser } from "../../Redux/User/action";
// import { useNavigate } from "react-router-dom"; // ✅ import
// import { fetchDomains } from "../../Redux/Domain/action";

// const LoginForm = ({ onSwitch }) => {
//   const { loginLoading, error } = useSelector((state) => state.user);
//   const {domains, loading: domainLoading, error: domainError} = useSelector((s)=>s.domain)
//   const dispatch = useDispatch();
//   const navigate = useNavigate(); // ✅ hook

//   const [form, setForm] = useState({ email: "", rollNo: "", category:"", domain:"" });

//   const handleChange = (e) =>
//     setForm({ ...form, [e.target.name]: e.target.value });

// // Fetch domain
// useEffect(()=>{
// if(form.category){
//   dispatch(fetchDomains(form.category))
// }
// }, [form.category,dispatch])

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.email || !form.rollNo) {
//       toast.error("Please fill in all fields.");
//       return;
//     }

//     try {
//       const res = await dispatch(loginUser(form)); // returns res.data
//       toast.success(res.message || "✅ Logged in successfully!");

//       // ✅ Navigate to exam page after login
//       navigate("/precheck", {state:{loginResult:res,form}});
//     } catch (err) {
//       toast.error(err.message || "❌ Login failed. Please try again.");
//     }
//   };

//   return (
//     <form className="space-y-6" onSubmit={handleSubmit}>

//       <h1 className="text-3xl font-bold text-white text-center">Login</h1>
//       <p className="text-center text-slate-400 mb-4">
//         Enter your email and roll number.
//       </p>

//       {/* Email */}
//       <input
//         type="email"
//         name="email"
//         value={form.email}
//         onChange={handleChange}
//         placeholder="Email"
//         className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//         required
//       />

//       {/* Roll Number */}
//       <input
//         type="text"
//         name="rollNo"
//         value={form.rollNo}
//         onChange={handleChange}
//         placeholder="Roll Number"
//         className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//         required
//       />

//   {/* Category */}
//       <select
//       type="text"
//       name="category"
//       onChange={handleChange}
//       value={form.category}
//       placeholder="Select category"
//       className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//       required>
//         <option value="">Select Category</option>
//         <option value="Technical">Technical</option>
//         <option value="Non-Technical">Non-technical</option>
//       </select>

//       {/* Domain */}
//       <select
//       name="domain"
//       type="text"
//       onChange={handleChange}
//       className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//       disabled={!form.category||domainLoading}>
//         <option value="">{!form.category?"Select Category first":domainLoading?"Loading...":"Select Domain"}</option>
//         {domains.map((d)=>
//         <option key={d._id} value={d._id}>
//           {d.domain}
//         </option>)}

//       </select>
//       {/* Submit */}
//       <button
//         type="submit"
//         disabled={loginLoading}
//         className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-500"
//       >
//         {loginLoading ? "Logging in..." : "Login"}
//       </button>

//       {/* Switch to Register */}
//       <p className="text-center text-slate-400">
//         New user?{" "}
//         <button
//           type="button"
//           onClick={onSwitch}
//           className="text-sky-400 hover:underline"
//         >
//           Register here
//         </button>
//       </p>

//       {/* Error Fallback */}
//       {error && <p className="text-red-400 text-center">{error}</p>}
//     </form>
//   );
// };

// export default LoginForm;


// src/components/Auth/LoginForm.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { loginUser } from "../../Redux/User/action";
import { useNavigate } from "react-router-dom";
import { fetchDomains } from "../../Redux/Domain/action";

const LoginForm = () => {
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
    <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-auto text-center space-y-6"
      >
        <h1 className="text-4xl font-extrabold text-slate-800">Exam Access</h1>
        <p className="text-slate-500">Enter your details to begin the exam.</p>

        {/* Email */}
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Email"
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        />

        {/* Roll Number */}
        <input
          type="text"
          name="rollNo"
          value={form.rollNo}
          onChange={handleChange}
          placeholder="Roll Number"
          className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          required
        />

  {/* Category */}
       <select
      type="text"
      name="category"
      onChange={handleChange}
      value={form.category}
      placeholder="Select category"
      className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
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
      className="w-full p-4 bg-white rounded-xl border border-slate-300 shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
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
          className="w-full py-4 rounded-xl font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 transition"
        >
          {loginLoading ? "Logging in..." : "Start Exam"}
        </button>

        {/* Error Fallback */}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default LoginForm;
