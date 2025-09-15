import { Router } from "express";
import {
  createDomain,
  getAllDomains,
  getDomainById,
  updateDomain,
  deleteDomain,
} from "../Controller/domain.controller.js";

const router = Router();

router.post("/domains", createDomain);       // Create
router.get("/domains", getAllDomains);       // Get all (with optional ?category=)
router.get("/domains/:id", getDomainById);   // Get one
router.put("/domains/:id", updateDomain);    // Update
router.delete("/domains/:id", deleteDomain); // Delete

export default router;
