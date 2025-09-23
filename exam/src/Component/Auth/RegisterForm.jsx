// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchDomains } from "../../Redux/Domain/action";
// import { registerUser } from "../../Redux/User/action";
// import { toast } from "react-toastify";

// const RegisterForm = ({ onSwitch }) => {
//   const dispatch = useDispatch();
//   const { loading, error } = useSelector((s) => s.user);
//   const { domains, loading: domainLoading, error: domainError } = useSelector(
//     (s) => s.domain
//   );

//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     category: "",
//     domain: "",
//   });

//   // fetch domains when category changes
//   useEffect(() => {
//     if (form.category) {
//       dispatch(fetchDomains(form.category));
//     }
//   }, [form.category, dispatch]);

//   const handleChange = (e) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!form.name || !form.email || !form.category || !form.domain) {
//       toast.error("Please fill in all fields.");
//       return;
//     }

//     toast.promise(dispatch(registerUser(form)), {
//       pending: "Registering user and sending roll number...",
//       success: {
//         render({ data }) {
//           return data.emailStatus === "FAILED"
//             ? "⚠️ User registered, but email sending failed."
//             : "✅ Roll number sent to your registered email!";
//         },
//         autoClose: 4000,
//       },
//       error: {
//         render({ data }) {
//           return `❌ ${
//             data?.response?.data?.message || "Failed to register user"
//           }`;
//         },
//         autoClose: 4000,
//       },
//     });

//     setForm({ name: "", email: "", category: "", domain: "" });
//   };

//   return (
//     <form className="space-y-6" onSubmit={handleSubmit}>
//       <h1 className="text-3xl font-bold text-white text-center">Register</h1>
//       <p className="text-center text-slate-400 mb-4">
//         Fill in your details to register.
//       </p>

//       {/* Name */}
//       <input
//         type="text"
//         name="name"
//         value={form.name}
//         onChange={handleChange}
//         placeholder="Name"
//         className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//         required
//       />

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

//       {/* Category */}
//       <select
//         name="category"
//         value={form.category}
//         onChange={handleChange}
//         className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//         required
//       >
//         <option value="">Select Category</option>
//         <option value="Technical">Technical</option>
//         <option value="Non-Technical">Non-Technical</option>
//       </select>

//       {/* Domain */}
//       <select
//         name="domain"
//         value={form.domain}
//         onChange={handleChange}
//         className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
//         required
//         disabled={!form.category || domainLoading}
//       >
//         <option value="">
//           {!form.category
//             ? "Select Category first"
//             : domainLoading
//             ? "Loading..."
//             : "Select Domain"}
//         </option>
//         {domains.map((d) => (
//           <option key={d._id} value={d._id}>
//             {d.domain}
//           </option>
//         ))}
//       </select>
//       {domainError && <p className="text-red-400">{domainError}</p>}

//       {/* Submit */}
//       <button
//         type="submit"
//         disabled={loading}
//         className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg"
//       >
//         {loading ? "Registering..." : "Register"}
//       </button>

//       <p className="text-center text-slate-400">
//         Already registered?{" "}
//         <button
//           type="button"
//           onClick={onSwitch}
//           className="text-sky-400 hover:underline"
//         >
//           Login here
//         </button>
//       </p>

//       {error && <p className="text-red-400 text-center">{error}</p>}
//     </form>
//   );
// };

// export default RegisterForm;



import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDomains } from "../../Redux/Domain/action";
import { registerUser } from "../../Redux/User/action";
import { toast } from "react-toastify";

const RegisterForm = ({ onSwitch }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.user);
  const { domains, loading: domainLoading, error: domainError } = useSelector(
    (s) => s.domain
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
  });

  // fetch domains when category changes
  useEffect(() => {
    if (form.category) {
      dispatch(fetchDomains(form.category));
    }
  }, [form.category, dispatch]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.category) {
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
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h1 className="text-3xl font-bold text-white text-center">Register</h1>
      <p className="text-center text-slate-400 mb-4">
        Fill in your details to register.
      </p>

      {/* Name */}
      <input
        type="text"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Name"
        className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
        required
      />

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

      {/* Category */}
      <select
        name="category"
        value={form.category}
        onChange={handleChange}
        className="w-full p-3 bg-slate-700 rounded-lg text-white border border-slate-600"
        required
      >
        <option value="">Select Category</option>
        <option value="Technical">Technical</option>
        <option value="Non-Technical">Non-Technical</option>
      </select>


      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg"
      >
        {loading ? "Registering..." : "Register"}
      </button>

      <p className="text-center text-slate-400">
        Already registered?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-sky-400 hover:underline"
        >
          Login here
        </button>
      </p>

      {error && <p className="text-red-400 text-center">{error}</p>}
    </form>
  );
};

export default RegisterForm;
