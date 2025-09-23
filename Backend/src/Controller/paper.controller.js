// controllers/paper.controller.js
import * as paperService from "../Services/paper.service.js";
import * as templateService from "../Services/paperTemplate.services.js";
import * as paperSetService from "../Services/paperSet.services.js";

export const createPaper = async (req, res) => {
  try {
    console.log("[createPaper] incoming body:", JSON.stringify(req.body));
    // add a pre-call marker
    console.log("[createPaper] calling paperService.createPaperService ...");

    const tpl = await paperService.createPaperService({ ...req.body, createdBy: req.user?._id });

    // post-call marker
    console.log("[createPaper] createPaperService returned tpl:", tpl ? (tpl._id || tpl) : tpl);

    return res.status(201).json({ success: true, message: "Paper template created.", tpl });
  } catch (err) {
    console.error("[createPaper] ERROR:", err && (err.stack || err.message || err));
    return res.status(400).json({ success: false, message: err.message || "Failed to create paper." });
  }
};


export const getPapers = async (req, res) => {
  try {
    const data = await paperService.getAllPapersService(req.query);
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch papers." });
  }
};

export const getPaperById = async (req, res) => {
  try {
    const data = await paperService.getPaperByIdService(
      req.params.id,
      String(req.query.populate) !== "false"
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message || "Paper not found." });
  }
};

export const updatePaper = async (req, res) => {
  try {
    const payload = { ...req.body, updatedBy: req.user?._id };
    const updated = await paperService.updatePaperService(req.params.id, payload);
    return res.status(200).json({ success: true, message: "Paper updated successfully.", updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to update paper." });
  }
};

export const deletePaper = async (req, res) => {
  try {
    await paperService.deletePaperService(req.params.id);
    return res.status(200).json({ success: true, message: "Paper deleted successfully." });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to delete paper." });
  }
};

export const togglePublishPaper = async (req, res) => {
  try {
    const { isPublished = true } = req.body;
    await paperService.togglePublishPaperService(req.params.id, isPublished);
    return res.status(200).json({ success: true, message: `Paper ${isPublished ? "published" : "unpublished"} successfully.` });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to change publish state." });
  }
};

export const addQuestions = async (req, res) => {
  try {
    const { questionIds = [] } = req.body;
    const result = await paperService.addQuestionsService(req.params.id, questionIds);
    return res.status(200).json({ success: true, message: "Questions added successfully.", result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to add questions." });
  }
};

export const removeQuestions = async (req, res) => {
  try {
    const { questionIds = [] } = req.body;
    const result = await paperService.removeQuestionsService(req.params.id, questionIds);
    return res.status(200).json({ success: true, message: "Questions removed successfully.", result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to remove questions." });
  }
};

// controllers/paper.controller.js (small change to forward setLabel)
export const getPaperForStudent = async (req, res) => {
  try {
    const { category, domain, domainId, setLabel } = req.query;
    const payload = {
      category,
      domain: domain || domainId,
      setLabel,
      studentId: req.user?._id,
      assignmentStrategy: req.query.assignmentStrategy || "deterministic",
    };
    const result = await paperService.getPaperForStudentService(payload);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
};


export const createTemplate = async (req, res) => {
  try {
    const tpl = await templateService.createTemplate(req.body);

if (req.body.createDefaultSet) {
  await paperSetService.createPaperSet({
    paperTemplate: tpl._id,   // correct field name
    setLabel: req.body.defaultSetLabel || "A",
    questions: (req.body.questions || []).map(qId => ({
      question: qId,
    })),
    createdBy: req.user?._id
  });
}


    return res.status(201).json({ success: true, message: "Template created.", tpl });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to create template." });
  }
};


export const listSetsForTemplate = async (req, res) => {
  try {
    const sets = await paperSetService.listSetsForTemplate(req.params.templateId);
    return res.status(200).json({ success: true, sets });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Failed to list sets." });
  }
};
