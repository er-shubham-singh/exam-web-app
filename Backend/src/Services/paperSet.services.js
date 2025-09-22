// Services/paperSet.services.js (part)
import mongoose from "mongoose";
import PaperSet from "../Modal/paperSet.model.js";
import PaperTemplate from "../Modal/paperTemplate.model.js";
import QuestionPaper from "../Modal/question.model.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

const normalizeQuestions = (questions = []) => {
  const out = [];
  const seen = new Set();
  for (const item of (questions || [])) {
    if (!item) continue;
    let qId = null;
    let marks = undefined;
    if (typeof item === "string" || item instanceof String) {
      qId = String(item).trim();
    } else if (typeof item === "object") {
      if (item.question) qId = String(item.question).trim();
      if (item._id && !qId) qId = String(item._id).trim(); // accept {_id: "..."}
      if (typeof item.marks !== "undefined") marks = Number(item.marks);
    }
    if (!qId || !isValidId(qId)) continue;
    if (seen.has(qId)) continue;
    seen.add(qId);
    const obj = { question: new mongoose.Types.ObjectId(qId) };
    if (!Number.isNaN(marks)) obj.marks = marks;
    out.push(obj);
  }
  return out;
};
const computeTotals = async (qRefs = []) => {
  if (!qRefs || !qRefs.length) return { totalMarks: 0 };
  // qRefs can be either array of ObjectId or array of objects {question: id}
  const qIds = qRefs.map(q => {
    if (!q) return null;
    if (typeof q === "string" || q instanceof String) return new mongoose.Types.ObjectId(String(q));
    if (q.question) return new mongoose.Types.ObjectId(q.question);
    if (q._id) return new mongoose.Types.ObjectId(q._id);
    return null;
  }).filter(Boolean);

  if (!qIds.length) return { totalMarks: 0 };

  const qs = await QuestionPaper.find({ _id: { $in: qIds } }).select("marks").lean();
  const totalMarks = qs.reduce((s, q) => s + (q.marks || 0), 0);
  return { totalMarks };
};
export const createPaperSet = async (payload = {}) => {
  // quick log to inspect incoming raw payload
  console.log("← createPaperSet received raw payload:", {
    paperTemplate: payload.paperTemplate || payload.paperTemplateId,
    setLabel: payload.setLabel,
    questionsSample: Array.isArray(payload.questions) ? payload.questions.slice(0, 6) : payload.questions
  });

  const {
    paperTemplate,
    paperTemplateId,
    setLabel,
    questions = [],
    timeLimitMin,
    createdBy,
    randomSeed,
    upsertIfExists = true,
    session = null
  } = payload;

  const templateId = paperTemplate || paperTemplateId;
  if (!templateId || !isValidId(templateId)) {
    throw new Error("Valid paperTemplate id is required.");
  }

  // ensure template exists (lean)
  const tpl = await PaperTemplate.findById(templateId).lean();
  if (!tpl) throw new Error("Paper template not found.");

  if (!setLabel || !String(setLabel).trim()) {
    throw new Error("setLabel is required.");
  }
  const normalizedLabel = String(setLabel).trim();

  // normalize input questions and dedupe
  const normQ = normalizeQuestions(questions || []);

  // log normalized shape BEFORE DB action
  console.log("← createPaperSet normalized payload:", {
    paperTemplate: String(templateId),
    setLabel: normalizedLabel,
    normalizedQuestionsSample: normQ.slice(0, 6),
    normalizedQuestionsCount: normQ.length
  });

  const qIds = normQ.map(x => String(x.question));

  // verify existence of provided questions (only if some provided)
  if (qIds.length) {
    const uniqIds = Array.from(new Set(qIds));
    const validCount = await QuestionPaper.countDocuments({ _id: { $in: uniqIds } });
    if (validCount !== uniqIds.length) {
      throw new Error("One or more questions are invalid or missing.");
    }
  }

  // existing/upsert logic (same as you have) ...
  const query = { paperTemplate: new mongoose.Types.ObjectId(templateId), setLabel: normalizedLabel };
  const existing = await PaperSet.findOne(query);

  if (existing && upsertIfExists) {
    // append new questions (dedupe against existing)
    const existingSet = new Set((existing.questions || []).map(q => String(q.question)));
    const toAppend = [];
    for (const nq of normQ) {
      if (!existingSet.has(String(nq.question))) {
        toAppend.push(nq);
        existingSet.add(String(nq.question));
      }
    }
    if (toAppend.length) {
      existing.questions.push(...toAppend);
      const totals = await computeTotals(existing.questions);
      existing.totalMarks = totals.totalMarks;
      if (typeof timeLimitMin !== "undefined") existing.timeLimitMin = timeLimitMin;
      if (typeof randomSeed !== "undefined") existing.randomSeed = randomSeed;
      if (createdBy) existing.createdBy = createdBy;
      await existing.save({ session });
    }
    return existing;
  }

  // build new set doc
  const setDoc = {
    paperTemplate: new mongoose.Types.ObjectId(templateId),
    setLabel: normalizedLabel,
    questions: normQ,
    timeLimitMin: timeLimitMin ?? tpl.defaultTimeLimitMin ?? undefined,
    totalMarks: 0,
    publishedAt: new Date(),
    createdBy: createdBy ? new mongoose.Types.ObjectId(String(createdBy)) : undefined,
    randomSeed,
  };

  // compute totals after questions normalized
  const totals = await computeTotals(setDoc.questions);
  setDoc.totalMarks = totals.totalMarks;

  // final log right before create()
  console.log("← createPaperSet creating PaperSet with setDoc sample:", {
    paperTemplate: String(setDoc.paperTemplate),
    setLabel: setDoc.setLabel,
    questionsSample: setDoc.questions.slice(0, 6),
    totalMarks: setDoc.totalMarks
  });

  const created = await PaperSet.create([setDoc], { session }).then(r => r[0]);
  return created;
};

export const getPaperSet = async (setId, { populateQuestions = true } = {}) => {
  if (!isValidId(setId)) return null;
  let q = PaperSet.findById(setId);
  if (populateQuestions) {
    q = q.populate({
      path: "questions.question",
      model: "QuestionPapers",
      select: "type questionText options correctAnswer theoryAnswer marks category domain coding"
    }).populate({ path: "paperTemplate", select: "title category domain description defaultTimeLimitMin defaultMarksPerQuestion" });
  }
  return q.lean().exec();
};

export const listSetsForTemplate = async (templateId) => {
  if (!isValidId(templateId)) throw new Error("Invalid template id");
  return PaperSet.find({ paperTemplate: templateId }).lean();
};


export const addQuestionsToSetService = async (setId, questionIds = [], options = {}) => {
  if (!isValidId(setId)) throw new Error("Invalid set id");
  if (!Array.isArray(questionIds) || !questionIds.length) throw new Error("questionIds required");

  const set = await PaperSet.findById(setId);
  if (!set) throw new Error("Set not found");

  // Normalize incoming to string ids and validate
  const incoming = Array.from(new Set(questionIds.filter(isValidId).map(String)));
  if (!incoming.length) throw new Error("No valid questionIds provided");

  // Helper to convert a value to ObjectId
  const toId = (id) => new mongoose.Types.ObjectId(String(id));

  // Determine current storage shape:
  // - subdoc shape: { question: ObjectId, ... }
  // - or array-of-ids shape: [ ObjectId, ... ] (or strings)
  const first = (set.questions || [])[0];
  const storedAsSubdocs = !!(first && typeof first === "object" && first.question);

  // Normalize existing questions into subdoc array if needed
  if (!storedAsSubdocs) {
    // transform existing array-of-ids into subdocs if needed
    const existingIds = (set.questions || []).map(q => {
      if (!q) return null;
      if (typeof q === "object" && q.question) return String(q.question);
      return String(q);
    }).filter(Boolean);

    // convert to subdoc objects
    set.questions = existingIds.map(id => ({ question: toId(id), addedAt: new Date() }));
  }

  // Now set.questions is guaranteed to be subdoc array
  const existingSet = new Set((set.questions || []).map(q => String(q.question)));
  const toAddIds = incoming.filter(id => !existingSet.has(id));

  if (!toAddIds.length) {
    // nothing new to add — return populated set
    return PaperSet.findById(setId)
      .populate({ path: "questions.question", select: "questionText type marks" })
      .lean();
  }

  // Build subdoc entries for toAddIds
  const newDocs = toAddIds.map(id => ({ question: toId(id), addedAt: new Date() }));
  set.questions.push(...newDocs);

  // Optionally compute/update totalMarks (safe): sum marks of referenced questions
  // We will gather question ids and query QuestionPaper for marks
  try {
    const qIds = (set.questions || []).map(q => String(q.question));
    const uniqQIds = Array.from(new Set(qIds));
    const qs = await QuestionPaper.find({ _id: { $in: uniqQIds } }).select("marks").lean();
    const totalMarks = qs.reduce((s, q) => s + (q.marks || 0), 0);
    set.totalMarks = totalMarks;
  } catch (err) {
    // non-fatal — log and continue
    console.warn("Failed to recompute totalMarks after adding questions:", err);
  }

  await set.save();

  // Return populated set (questions.question populated)
  return PaperSet.findById(setId)
    .populate({ path: "questions.question", select: "questionText type marks" })
    .lean();
};


export const removeQuestionFromSet = async (setId, questionId) => {
  if (!isValidId(setId) || !isValidId(questionId)) throw new Error("Invalid id");
  const updated = await PaperSet.findByIdAndUpdate(setId, { $pull: { questions: { question: questionId } } }, { new: true });
  if (!updated) throw new Error("Set not found");
  const totals = await computeTotals(updated.questions.map(q => q.question));
  updated.totalMarks = totals.totalMarks;
  await updated.save();
  return updated;
};
