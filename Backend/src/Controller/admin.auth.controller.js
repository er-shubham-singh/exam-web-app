// controllers/admin.controller.js
import { createEmployee, resendTempPassword, listEmployees, adminLoginService } from "../Services/admin.auth.services.js";


export async function createEmployeeController(req, res) {
  try {
    const { email, role, name, password } = req.body;
    if (!email || !role) return res.status(400).json({ message: "Email and role are required" });

    const createdBy = req.user ? req.user._id : null; // if middleware sets req.user
    const result = await createEmployee({ email, role, name, plainPassword: password, createdBy });

    const payload = { message: "Employee created and email sent", user: result.user };
    if (process.env.NODE_ENV !== "production" && result.tempPassword) {
      payload.tempPassword = result.tempPassword;
    }
    return res.status(201).json(payload);
  } catch (err) {
    console.error("createEmployeeController:", err);
    if (err.code === "USER_EXISTS") return res.status(409).json({ message: "User already exists" });
    if (err.code === "INVALID_INPUT") return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/** other controllers: resend & list (unchanged) */
export async function resendTempPasswordController(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    await resendTempPassword(email);
    return res.json({ message: "Temporary password resent" });
  } catch (err) {
    console.error("resendTempPasswordController:", err);
    if (err.code === "NOT_FOUND") return res.status(404).json({ message: "User not found" });
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function listEmployeesController(req, res) {
  try {
    const { role } = req.query;
    const users = await listEmployees({ role });
    return res.json({ data: users });
  } catch (err) {
    console.error("listEmployeesController:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function adminLoginController(req, res) {
  try {
    const { email, password } = req.body;
    const result = await adminLoginService({ email, password });

    return res.json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user,
      isTempPassword: result.isTempPassword,
    });
  } catch (err) {
    console.error("adminLoginController:", err);
    return res
      .status(err.code === "INVALID_CREDENTIALS" ? 401 : 500)
      .json({ success: false, message: err.message || "Login failed" });
  }
}
