// controllers/paper.controller.js
import * as paperService from "../Services/paper.service.js";

/**
 * Create a paper
 */
export const createPaper = async (req, res) => {
  try {
    await paperService.createPaperService(req.body);
    return res.status(200).json({ message: "Paper created successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create paper." });
  }
};


// controllers/paper.controller.js (add)
export const getPapers = async (req, res) => {
  try {
    const data = await paperService.getAllPapersService(req.query);
    // For fetch we must return the data (list + meta)
    return res.status(200).json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch papers." });
  }
};




// controllers/paper.controller.js (optional)
export const getPaperById = async (req, res) => {
  try {
    const data = await paperService.getPaperByIdService(
      req.params.id,
      String(req.query.populate) !== "false"
    );
    return res.status(200).json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch paper." });
  }
};



/**
 * Update a paper (title/category/domain/description/questions/isPublished)
 */
export const updatePaper = async (req, res) => {
  try {
    await paperService.updatePaperService(req.params.id, req.body);
    return res.status(200).json({ message: "Paper updated successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update paper." });
  }
};

/**
 * Delete a paper
 */
export const deletePaper = async (req, res) => {
  try {
    await paperService.deletePaperService(req.params.id);
    return res.status(200).json({ message: "Paper deleted successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete paper." });
  }
};

/**
 * Publish / Unpublish
 */
export const togglePublishPaper = async (req, res) => {
  try {
    const { isPublished = true } = req.body;
    await paperService.togglePublishPaperService(req.params.id, isPublished);
    return res.status(200).json({ message: `Paper ${isPublished ? "published" : "unpublished"} successfully.` });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to change publish state." });
  }
};

/**
 * Add questions (append & de-duplicate)
 */
export const addQuestions = async (req, res) => {
  try {
    const { questionIds = [] } = req.body;
    await paperService.addQuestionsService(req.params.id, questionIds);
    return res.status(200).json({ message: "Questions added successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to add questions." });
  }
};

/**
 * Remove questions
 */
export const removeQuestions = async (req, res) => {
  try {
    const { questionIds = [] } = req.body;
    await paperService.removeQuestionsService(req.params.id, questionIds);
    return res.status(200).json({ message: "Questions removed successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to remove questions." });
  }
};

 
// controller  for student side 

export const getPaperForStudent = async (req, res) => {
  try {
    const { category, domain, domainId } = req.query;

    // call service, not itself
    const paper = await paperService.getPaperForStudentService({
      category,
      domain: domain || domainId,   // support both
    });

    res.json({ success: true, paper });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

