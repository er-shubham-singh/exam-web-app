// controllers/paperSet.controller.js
import * as paperSetService from "../Services/paperSet.services.js";

export const createSet = async (req, res) => {
  try {
    const payload = {
      paperTemplateId: req.params.templateId || req.body.paperTemplateId,
      setLabel: req.body.setLabel,
      questions: req.body.questions || [],
      timeLimitMin: req.body.timeLimitMin,
      createdBy: req.user?._id,
      randomSeed: req.body.randomSeed
    };
    const setDoc = await paperSetService.createPaperSet(payload);
    return res.status(201).json({ success: true, message: setDoc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const getSet = async (req, res) => {
  try {
    const set = await paperSetService.getPaperSet(req.params.id);
    if (!set) return res.status(404).json({ success: false, message: "Set not found" });
    return res.json({ success: true, message: set });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addQuestions = async (req, res) => {
  try {
    const setId = req.params.id;
    const { questionIds = [], mode = "append", index } = req.body; // mode optional
    if (!Array.isArray(questionIds) || !questionIds.length) {
      return res.status(400).json({ success: false, message: "questionIds required" });
    }

    const updated = await paperSetService.addQuestionsToSetService(setId, questionIds, { mode, index, userId: req.user?._id });
    return res.status(200).json({ success: true, set: updated });
  } catch (err) {
    console.error("addQuestions controller error", err);
    return res.status(400).json({ success: false, message: err.message || "Failed to add questions to set." });
  }
};

export const removeQuestion = async (req, res) => {
  try {
    const set = await paperSetService.removeQuestionFromSet(req.params.id, req.params.questionId);
    return res.json({ success: true, message: set });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
