// routes/admin.routes.js
import express from "express";
import { createEmployeeController, resendTempPasswordController, listEmployeesController, adminLoginController } from "../Controller/admin.auth.controller.js";
import { requireAuth, requireAdmin } from "../Middlewere/auth.middleware.js";

const router = express.Router();
router.post("/admin/login", adminLoginController);
router.use(requireAuth);
router.use(requireAdmin);

router.post("/create-employee", createEmployeeController);
router.post("/resend-temp-password", resendTempPasswordController);
router.get("/employees", listEmployeesController);




export default router;
