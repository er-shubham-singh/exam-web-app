import mongoose from "mongoose";
import Paper from "../Modal/paper.model.js";
import Domain from "../Modal/domain.model.js";
import QuestionPaper from "../Modal/question.model.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const recomputeTotals = async (questionIds = []) => {
  if (!questionIds.length) return { totalMarks: 0, mcqCount: 0, theoryCount: 0, codingCount: 0 };

  const qs = await QuestionPaper.find({ _id: { $in: questionIds } })
    .select("marks type")
    .lean();

  const totalMarks = qs.reduce((sum, q) => sum + (q.marks || 0), 0);
  const mcqCount = qs.filter((q) => q.type === "MCQ").length;
  const theoryCount = qs.filter((q) => q.type === "THEORY").length;
  const codingCount = qs.filter((q) => q.type === "CODING").length;

  return { totalMarks, mcqCount, theoryCount, codingCount };
};

export const createPaperService = async (data) => {
  const {
    title,
    category,
    domain,
    description,
    questions = [],
    isPublished = false,
  } = data || {};

  if (!title) throw new Error("Title is required.");
  if (!category) throw new Error("Category is required.");
  if (!domain || !isValidId(domain)) throw new Error("Valid domain id is required.");

  // snapshot description if missing
  let desc = description;
  if (!desc) {
    const d = await Domain.findById(domain).select("description").lean();
    if (!d) throw new Error("Domain not found.");
    desc = d.description;
  }

  // normalize question ids
  const qIds = (questions || [])
    .filter((id) => isValidId(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // 🔹 Strict: check if paper already exists for this exact (category + domain)
// strict existing paper check
const existing = await Paper.findOne({
  category: category.trim(),
  domain: new mongoose.Types.ObjectId(domain),
});

  if (existing) {
    // merge unique questions only inside this domain
    const mergedQuestions = Array.from(
      new Set([...existing.questions.map(String), ...qIds.map(String)])
    ).map((id) => new mongoose.Types.ObjectId(id));

    const totals = await recomputeTotals(mergedQuestions);

    existing.title = title; // overwrite if needed
    existing.description = desc;
    existing.questions = mergedQuestions;
    existing.totalMarks = totals.totalMarks;
    if (typeof isPublished === "boolean") {
      existing.isPublished = isPublished;
      if (isPublished) existing.publishedAt = new Date();
    }

    await existing.save();
    return existing;
  }

  // otherwise create new paper scoped to that domain
  const totals = await recomputeTotals(qIds);
  return await Paper.create({
    title,
    category,
    domain,
    description: desc,
    questions: qIds,
    totalMarks: totals.totalMarks,
    isPublished,
  });
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
// in getAllPapersService
if (domain && isValidId(domain)) {
  filter.domain = new mongoose.Types.ObjectId(domain);
}
  if (search) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortObj = { [sort]: order === "asc" ? 1 : -1 };

  let q = Paper.find(filter).sort(sortObj).skip(skip).limit(Number(limit));

  if (String(populate) !== "false") {
    q = q
      .populate({ path: "domain", select: "domain category description" })
      .populate({
        path: "questions",
        select:
          "type questionText options correctAnswer theoryAnswer marks category domain",
        populate: { path: "domain", select: "domain category" },
      });
  }

  const [items, total] = await Promise.all([q.lean().exec(), Paper.countDocuments(filter)]);

  return {
    items,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
  };
};

export const getPaperByIdService = async (id, populate = true) => {
  if (!isValidId(id)) throw new Error("Invalid paper id.");
  let q = Paper.findById(id);
  if (populate) {
    q = q
      .populate({ path: "domain", select: "domain category description" })
      .populate({
        path: "questions",
        select:
          "type questionText options correctAnswer theoryAnswer marks category domain",
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

  if (Array.isArray(update.questions)) {
    update.questions = update.questions
      .filter((id) => isValidId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const totals = await recomputeTotals(update.questions);
    update.totalMarks = totals.totalMarks;
  }

  const saved = await Paper.findByIdAndUpdate(paperId, update, { new: false });
  if (!saved) throw new Error("Paper not found.");
};

export const deletePaperService = async (paperId) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const deleted = await Paper.findByIdAndDelete(paperId);
  if (!deleted) throw new Error("Paper not found.");
};

export const togglePublishPaperService = async (paperId, isPublished = true) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const payload = { isPublished };
  if (isPublished) payload.publishedAt = new Date();
  const updated = await Paper.findByIdAndUpdate(paperId, payload, { new: false });
  if (!updated) throw new Error("Paper not found.");
};

export const addQuestionsService = async (paperId, ids = []) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const paper = await Paper.findById(paperId);
  if (!paper) throw new Error("Paper not found.");

  const append = ids.filter(isValidId).map((x) => String(x));
  const current = paper.questions.map((x) => String(x));
  const merged = Array.from(new Set([...current, ...append])).map(
    (x) => new mongoose.Types.ObjectId(x)
  );

  const totals = await recomputeTotals(merged);
  paper.questions = merged;
  paper.totalMarks = totals.totalMarks;
  await paper.save();
};

export const removeQuestionsService = async (paperId, ids = []) => {
  if (!isValidId(paperId)) throw new Error("Invalid paper id.");
  const paper = await Paper.findById(paperId);
  if (!paper) throw new Error("Paper not found.");

  const removeSet = new Set(ids.filter(isValidId).map(String));
  const remaining = paper.questions.filter((q) => !removeSet.has(String(q)));
  const totals = await recomputeTotals(remaining);

  paper.questions = remaining;
  paper.totalMarks = totals.totalMarks;
  await paper.save();
};


export const getPaperForStudentService = async ({ category, domain }) => {
  if (!category) throw new Error("Category is required");
  if (!domain || !isValidId(domain)) throw new Error("Valid domain id required");

  // normalize category
  const normalizedCategory = category.trim();

  const filter = {
    category: { $regex: `^${normalizedCategory}$`, $options: "i" },
    domain: new mongoose.Types.ObjectId(domain),
  };

  console.log("🔎 Student paper filter:", filter);

  const paper = await Paper.findOne(filter)
    .populate({ path: "domain", select: "domain category description" })
    .populate({
      path: "questions",
      select:
        "type questionText options correctAnswer theoryAnswer marks category domain",
      populate: { path: "domain", select: "domain category" },
    })
    .lean();

  if (!paper) {
    throw new Error(
      `No paper found. category="${normalizedCategory}", domain="${domain}"`
    );
  }

  return paper;
};

