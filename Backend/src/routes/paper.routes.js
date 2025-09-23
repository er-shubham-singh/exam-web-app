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
  createTemplate,
  listSetsForTemplate,
} from "../Controller/paper.controller.js";

import {
  createSet,
  getSet,
  addQuestions as addQuestionsToSet,
  removeQuestion as removeQuestionFromSet,
} from "../Controller/paperSet.controller.js"; // create this controller if not yet present

const router = Router();

/* Template (Paper) routes */
router.post("/papers", createPaper);
router.put("/papers/:id", updatePaper);
router.get("/papers", getPapers);                
router.get("/papers/:id", getPaperById);
router.delete("/papers/:id", deletePaper);
router.patch("/papers/:id/publish", togglePublishPaper);
router.post("/papers/:id/questions", addQuestions);       // body: { questionIds: [] }
router.delete("/papers/:id/questions", removeQuestions);  // body: { questionIds: [] }

/* Template-specific helpers (optional) */
router.post("/templates", createTemplate); // explicit create template (useful if you separate UI flows)
router.get("/templates/:templateId/sets", listSetsForTemplate); // list sets for a template

/* PaperSet routes (actual delivered exam sets) */
router.post("/templates/:templateId/sets", createSet); // create a new set for template (body: { setLabel, questions, timeLimitMin, ... })
router.get("/sets/:id", getSet); // fetch a set (populated)
router.patch("/sets/:id/questions", addQuestionsToSet); // body: { questionIds: [], mode: 'append'|'replace'|'insert', index? }
router.delete("/sets/:id/questions/:questionId", removeQuestionFromSet); // remove a single question from set

/* Student-facing */
router.get("/student-paper", getPaperForStudent); // query: ?category=&domain= (returns { paperTemplate, paperSet })

export default router;
