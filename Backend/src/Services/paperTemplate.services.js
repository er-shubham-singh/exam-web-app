// Services/paperTemplate.services.js
import mongoose from "mongoose";
import PaperTemplate from "../Modal/paperTemplate.model.js";
import QuestionPaper from "../Modal/question.model.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const createTemplate = async (payload) => {
  const { 
    title, 
    category, 
    domain, 
    description, 
    questionBank = [], 
    defaultTimeLimitMin, 
    defaultMarksPerQuestion 
  } = payload;

  if (!title || !category || !domain) {
    throw new Error("title, category and domain required.");
  }

  const qIds = (questionBank || [])
    .filter(isValidId)
    .map(id => new mongoose.Types.ObjectId(id));

  // ✅ Only validate if we actually have questions
  if (qIds.length > 0) {
    const count = await QuestionPaper.countDocuments({ _id: { $in: qIds }});
    if (count !== qIds.length) {
      throw new Error("One or more questions invalid.");
    }
  }

  return PaperTemplate.create({
    title,
    category,
    domain,
    description,
    questionBank: qIds,
    defaultTimeLimitMin: defaultTimeLimitMin ?? 60,
    defaultMarksPerQuestion: defaultMarksPerQuestion ?? 1,
  });
};


export const getTemplateById = (id) => {
  if (!isValidId(id)) return null;
  return PaperTemplate.findById(id).populate({ path: "questionBank", select: "questionText type marks" }).lean();
};

export const addToQuestionBank = async (templateId, questionIds = []) => {
  if (!isValidId(templateId)) throw new Error("Invalid template id");
  const t = await PaperTemplate.findById(templateId);
  if (!t) throw new Error("Template not found");
  const incoming = questionIds.filter(isValidId).map(String);
  const current = t.questionBank.map(String);
  const merged = Array.from(new Set([...current, ...incoming])).map(id => new mongoose.Types.ObjectId(id));
  t.questionBank = merged;
  await t.save();
  return t;
};
