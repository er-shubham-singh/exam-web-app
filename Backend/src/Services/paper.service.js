// services/paper.service.js
import mongoose from "mongoose";
import Domain from "../Modal/domain.model.js";
import QuestionPaper from "../Modal/question.model.js";
import PaperTemplate from "../Modal/paperTemplate.model.js"; // <-- template model (file: models/paper.model.js)
import PaperSet from "../Modal/paperSet.model.js";
import * as paperSetService from "./paperSet.services.js";

const isValidId = (id) =>  mongoose.Types.ObjectId.isValid(String(id));
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Recompute totals and type counts for a list of question ObjectIds
 */
const recomputeTotals = async (questionIds = []) => {
  if (!Array.isArray(questionIds) || !questionIds.length) {
    return { totalMarks: 0, mcqCount: 0, theoryCount: 0, codingCount: 0 };
  }

  const qs = await QuestionPaper.find({ _id: { $in: questionIds } })
    .select("marks type")
    .lean();

  const totalMarks = qs.reduce((sum, q) => sum + (q.marks || 0), 0);
  const mcqCount = qs.filter((q) => q.type === "MCQ").length;
  const theoryCount = qs.filter((q) => q.type === "THEORY").length;
  const codingCount = qs.filter((q) => q.type === "CODING").length;

  return { totalMarks, mcqCount, theoryCount, codingCount };
};

/**
 * Build questions payload in the exact shape PaperSet expects:
 * [{ question: ObjectId, marks?: Number }, ...]
 * Accepts incoming array items that may be strings, ObjectIds or objects.
 */
const buildQuestionsPayload = (items = []) => {
  const out = [];
  const seen = new Set();

  for (const item of items || []) {
    if (!item) continue;

    let idStr = null;
    let marks = undefined;

    if (item instanceof mongoose.Types.ObjectId) {
      idStr = String(item);
    } else if (typeof item === "string" || item instanceof String) {
      idStr = String(item).trim();
    } else if (typeof item === "object") {
      if (item.question) idStr = String(item.question).trim();
      else if (item._id) idStr = String(item._id).trim();
      else if (item.id) idStr = String(item.id).trim();
      if (typeof item.marks !== "undefined") marks = Number(item.marks);
    }

    if (!idStr || !isValidId(idStr)) continue;
    if (seen.has(idStr)) continue;
    seen.add(idStr);

    const obj = { question: toObjectId(idStr) };
    if (!Number.isNaN(marks)) obj.marks = marks;
    out.push(obj);
  }

  return out;
};

/**
 * createPaperService
 * - Creates (or updates existing) PaperTemplate (template)
 * - Optionally creates a default PaperSet (Set A etc.) using paperSetService.createPaperSet
 */
export const createPaperService = async (data = {}) => {
  const {
    title,
    category,
    domain,
    description,
    questions = [],
    isPublished = false,
    createDefaultSet = false,
    defaultSetLabel = "A",
    createdBy = null,
  } = data || {};

  if (!title) throw new Error("Title is required.");
  if (!category) throw new Error("Category is required.");
  if (!domain || !isValidId(domain)) throw new Error("Valid domain id is required.");

  // fetch domain description if not present
  let desc = description;
  if (!desc) {
    const d = await Domain.findById(domain).select("description").lean();
    if (!d) throw new Error("Domain not found.");
    desc = d.description || "";
  }

  // Normalize incoming questions to ObjectId array for template storage
  const qIds = (questions || [])
    .map((x) => {
      if (!x) return null;
      if (x instanceof mongoose.Types.ObjectId) return String(x);
      if (typeof x === "string" || x instanceof String) return String(x).trim();
      if (typeof x === "object") return String(x._id || x.question || x.id || null).trim();
      return null;
    })
    .filter((id) => id && isValidId(id))
    .map((id) => toObjectId(id));

  // look for existing template for this category+domain
  const existing = await PaperTemplate.findOne({
    category: category.trim(),
    domain: toObjectId(domain),
  });

  // improved wrapper to create default set with normalized payload and logs
  const safeCreateDefaultSet = async (templateId, label, questionsPayload) => {
    // ensure templateId is ObjectId
    const paperTemplateId = isValidId(templateId) ? toObjectId(templateId) : templateId;

    // normalize questionsPayload to the exact shape PaperSet expects
    const normalizedQuestions = buildQuestionsPayload(questionsPayload || []);

    const payload = {
      paperTemplate: paperTemplateId,
      paperTemplateId: paperTemplateId,
      setLabel: String(label || "A"),
      questions: normalizedQuestions,
      createdBy,
    };

    console.log("[createPaperService] CALL -> paperSetService.createPaperSet payload (sanity):", {
      paperTemplate: String(payload.paperTemplate),
      setLabel: payload.setLabel,
      questionsCount: payload.questions.length,
      firstQuestionsSample: payload.questions.slice(0, 6),
    });

    return await paperSetService.createPaperSet(payload);
  };

  if (existing) {
    // merge unique questions
    const merged = Array.from(new Set([...existing.questions.map(String), ...qIds.map(String)])).map((id) =>
      toObjectId(id)
    );

    const totals = await recomputeTotals(merged);

    existing.title = title;
    existing.description = desc;
    existing.questions = merged;
    existing.totalMarks = totals.totalMarks;
    existing.isPublished = typeof isPublished === "boolean" ? isPublished : existing.isPublished;
    if (existing.isPublished) existing.publishedAt = existing.publishedAt || new Date();

    await existing.save();

    if (createDefaultSet) {
      try {
        const label = String(defaultSetLabel || "A").trim() || "A";
        const existingSet = await PaperSet.findOne({ paperTemplate: existing._id, setLabel: label }).lean();

        if (!existingSet) {
          const mergedPayload = buildQuestionsPayload(merged);
          console.log("[createPaperService] mergedPayload for default set (existing template):", mergedPayload.slice(0, 6));
          await safeCreateDefaultSet(existing._id, label, mergedPayload);
          console.log("[createPaperService] default set created for existing template.");
        } else {
          console.log("[createPaperService] default set already exists:", {
            setId: String(existingSet._id),
            setLabel: existingSet.setLabel,
          });
        }
      } catch (err) {
        console.warn("[createPaperService] createDefaultSet (existing) failed:", err?.message || err);
      }
    }

    return existing;
  }

  // create new template
  const totals = await recomputeTotals(qIds);
  const created = await PaperTemplate.create({
    title,
    category,
    domain: toObjectId(domain),
    description: desc,
    questions: qIds,
    totalMarks: totals.totalMarks,
    isPublished,
  });

  if (createDefaultSet) {
    try {
      const label = String(defaultSetLabel || "A").trim() || "A";
      const payloadQuestions = buildQuestionsPayload(qIds);
      console.log("[createPaperService] payloadQuestions for default set (new template):", payloadQuestions.slice(0, 6));

      await safeCreateDefaultSet(created._id, label, payloadQuestions);
      console.log("[createPaperService] default set created for new template.");
    } catch (err) {
      console.warn("[createPaperService] createDefaultSet (new) failed:", err?.message || err);
    }
  }

  return created;
};

export const getAllPapersService = async (query = {}) => {
  const {
    category,
    domain,
    search,
    page = 1,
    limit = 20,
    sort = "createdAt",
    order = "desc",
    populate = "true",
  } = query;

  const filter = {};
  if (category) filter.category = category;
  if (domain && isValidId(domain)) filter.domain = new mongoose.Types.ObjectId(domain);

  if (search) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortObj = { [sort]: order === "asc" ? 1 : -1 };

  // load templates (with questions populated if requested)
  let q = PaperTemplate.find(filter).sort(sortObj).skip(skip).limit(Number(limit));
  if (String(populate) !== "false") {
    q = q
      .populate({ path: "domain", select: "domain category description" })
      .populate({
        path: "questions",
        select: "type questionText options correctAnswer theoryAnswer marks category domain",
        populate: { path: "domain", select: "domain category" },
      });
  }

  const [items, total] = await Promise.all([q.lean().exec(), PaperTemplate.countDocuments(filter)]);

  // If we returned any templates, fetch sets for them and attach
  if (items && items.length) {
    const templateIds = items.map((t) => String(t._id)).filter(Boolean);
    if (templateIds.length) {
      const sets = await PaperSet.find({ paperTemplate: { $in: templateIds } })
        .populate({
          path: "questions.question",
          model: "QuestionPapers",
          select: "type questionText options correctAnswer theoryAnswer marks category domain coding",
          populate: { path: "domain", select: "domain category" },
        })
        .lean()
        .exec();

      const setsByTemplate = sets.reduce((acc, s) => {
        const tpl = String(s.paperTemplate);
        acc[tpl] = acc[tpl] || [];
        acc[tpl].push(s);
        return acc;
      }, {});

      // attach sets array (possibly empty) to each template
      for (const it of items) {
        const key = String(it._id);
        it.sets = setsByTemplate[key] || [];
      }
    }
  }

  return {
    items,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
  };
};

export const getPaperByIdService = async (id, populate = true) => {
  if (!isValidId(id)) throw new Error("Invalid paper id.");
  let q = PaperTemplate.findById(id);
  if (populate) {
    q = q
      .populate({ path: "domain", select: "domain category description" })
      .populate({
        path: "questions",
        select: "type questionText options correctAnswer theoryAnswer marks category domain",
        populate: { path: "domain", select: "domain category" },
      });
  }
  const doc = await q.lean();
  if (!doc) throw new Error("Paper not found.");
  return doc;
};

export const updatePaperService = async (paperId, payload) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");

  const update = { ...payload };

  if (update.domain && !update.description) {
    const d = await Domain.findById(update.domain).select("description").lean();
    if (!d) throw new Error("Domain not found.");
    update.description = d.description;
  }

  // normalize questions if provided
  let normalizedQuestionIds = null;
  if (Array.isArray(update.questions)) {
    normalizedQuestionIds = update.questions.filter((id) => isValidId(id)).map((id) => new mongoose.Types.ObjectId(id));
    update.questions = normalizedQuestionIds;
    const totals = await recomputeTotals(update.questions);
    update.totalMarks = totals.totalMarks;
  }

  const saved = await PaperTemplate.findByIdAndUpdate(paperId, update, { new: true, runValidators: true });
  if (!saved) throw new Error("Paper not found.");

  // Optional: sync the default Set A if requested by caller
  if (payload && payload.syncDefaultSet) {
    try {
      const setA = await PaperSet.findOne({ paperTemplate: saved._id, setLabel: "A" });

      if (setA) {
        await paperSetService.addQuestionsToSet(setA._id, normalizedQuestionIds || [], { mode: "replace" });
      } else if (normalizedQuestionIds && normalizedQuestionIds.length) {
        await paperSetService.createPaperSet({
          paperTemplateId: saved._id,
          setLabel: "A",
          questions: (normalizedQuestionIds || []).map((x) => String(x)),
          createdBy: payload.updatedBy || null,
        });
      }
    } catch (e) {
      console.warn("syncDefaultSet failed:", e.message);
    }
  }

  return saved;
};

export const deletePaperService = async (paperId) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const deleted = await PaperTemplate.findByIdAndDelete(paperId);
  if (!deleted) throw new Error("Paper not found.");
};

export const togglePublishPaperService = async (paperId, isPublished = true) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const payload = { isPublished };
  if (isPublished) payload.publishedAt = new Date();
  const updated = await PaperTemplate.findByIdAndUpdate(paperId, payload, { new: false });
  if (!updated) throw new Error("Paper not found.");
};

export const addQuestionsService = async (paperId, ids = []) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const paper = await PaperTemplate.findById(paperId);
  if (!paper) throw new Error("Paper not found.");

  const append = ids.filter(isValidId).map((x) => String(x));
  const current = paper.questions.map((x) => String(x));
  const merged = Array.from(new Set([...current, ...append])).map((x) => new mongoose.Types.ObjectId(x));

  const totals = await recomputeTotals(merged);
  paper.questions = merged;
  paper.totalMarks = totals.totalMarks;
  await paper.save();
};

export const removeQuestionsService = async (paperId, ids = []) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const paper = await PaperTemplate.findById(paperId);
  if (!paper) throw new Error("Paper not found.");

  const removeSet = new Set(ids.filter(isValidId).map(String));
  const remaining = paper.questions.filter((q) => !removeSet.has(String(q)));
  const totals = await recomputeTotals(remaining);

  paper.questions = remaining;
  paper.totalMarks = totals.totalMarks;
  await paper.save();
};

// helper deterministic assign
const hashToIndex = (str, max) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % max;
};

export const getPaperForStudentService = async ({
  category,
  domain,
  setLabel = null,
  studentId = null,
  assignmentStrategy = "deterministic",
  allowFallback = true, // when setLabel specified but no sets with that label exist, fallback to all sets
}) => {
  if (!category) throw new Error("Category is required");
  if (!domain || !isValidId(domain)) throw new Error("Valid domain id required");

  const normalizedCategory = category.trim();

  // find template (PaperTemplate)
  const template = await PaperTemplate.findOne({
    category: { $regex: `^${normalizedCategory}$`, $options: "i" },
    domain: new mongoose.Types.ObjectId(domain),
  }).lean();

  if (!template) throw new Error(`No paper template found for category="${normalizedCategory}", domain="${domain}"`);

  // If setLabel provided, first try to fetch sets with that label
  let sets = [];
  if (setLabel) {
    sets = await PaperSet.find({
      paperTemplate: template._id,
      isActive: true,
      setLabel: setLabel,
    }).lean();
  }

  // If we didn't find any sets for the requested label, optionally fallback to all active sets
  if ((!sets || !sets.length) && allowFallback) {
    sets = await PaperSet.find({ paperTemplate: template._id, isActive: true }).lean();
  }

  if (!sets || !sets.length) {
    // If caller provided setLabel and we don't want fallback, show a specific error
    if (setLabel && !allowFallback) {
      throw new Error(`No active sets found for template with setLabel="${setLabel}"`);
    }
    throw new Error("No active paper sets available for this template");
  }

  // Choose set (same logic as before)
  let chosenSet;
  if (sets.length === 1) {
    chosenSet = sets[0];
  } else if (assignmentStrategy === "random") {
    chosenSet = sets[Math.floor(Math.random() * sets.length)];
  } else {
    const key = studentId ? `${String(studentId)}:${String(template._id)}` : `${Date.now()}:${String(template._id)}`;
    const idx = hashToIndex(key, sets.length);
    chosenSet = sets[idx];
  }

  // populate chosen set questions & template fields
  const populated = await PaperSet.findById(chosenSet._id)
    .populate({
      path: "questions.question",
      select: "type questionText options correctAnswer theoryAnswer marks category domain coding",
      populate: { path: "domain", select: "domain category" },
    })
    .populate({ path: "paperTemplate", select: "title category domain description defaultTimeLimitMin defaultMarksPerQuestion" })
    .lean();

  if (!populated) throw new Error("Failed to load chosen set");

  return {
    paperTemplate: populated.paperTemplate,
    paperSet: {
      _id: populated._id,
      setLabel: populated.setLabel,
      timeLimitMin: populated.timeLimitMin,
      totalMarks: populated.totalMarks,
      questions: populated.questions,
      randomSeed: populated.randomSeed,
    },
  };
};
