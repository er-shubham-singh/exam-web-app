// routes/paper.routes.js
import { Router } from "express";
import {
  createPaper,
  updatePaper,
  deletePaper,
  togglePublishPaper,
  addQuestions,
  removeQuestions,
  getPapers,
  getPaperById,
  getPaperForStudent,
} from "../Controller/paper.controller.js";

const router = Router();

router.post("/papers", createPaper);
router.put("/papers/:id", updatePaper);
router.get("/papers", getPapers);                // ?category=&domain=&page=&limit=
router.get("/papers/:id", getPaperById); 
router.delete("/papers/:id", deletePaper);
router.patch("/papers/:id/publish", togglePublishPaper);
router.post("/papers/:id/questions", addQuestions);       // body: { questionIds: [] }
router.delete("/papers/:id/questions", removeQuestions);  // body: { questionIds: [] }

// // for student 
// router.get("/student-paper", getPaperForStudent);


export default router;
