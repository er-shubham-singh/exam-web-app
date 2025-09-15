import * as userService from "../Services/user.service.js";

// ---------------- REGISTER ----------------
export const registerUserController = async (req, res) => {
  try {
    const { user, emailStatus } = await userService.registerUserService(req.body);

    if (emailStatus === "FAILED") {
      return res.status(400).json({
        success: false,
        message: "User registered, but email sending failed.",
        data: user,
        emailStatus,
      });
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Roll number sent to email.",
      data: user,
      emailStatus,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to register user",
    });
  }
};

// ---------------- LOGIN ----------------
export const loginController = async (req, res) => {
  try {
    const data = await userService.loginService(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};
