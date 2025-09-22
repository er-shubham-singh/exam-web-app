// services/question.services.js
import mongoose from "mongoose";
import QuestionPaper from "../Modal/question.model.js";
import Domain from "../Modal/domain.model.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const checkDuplicate = async (questionText, domainId, excludeId = null) => {
  if (!questionText || !domainId) return false;

  const filter = {
    domain: domainId,
    questionText: { $regex: `^${questionText.trim()}$`, $options: "i" },
  };
  if (excludeId) filter._id = { $ne: excludeId };

  const existing = await QuestionPaper.findOne(filter).lean();
  return !!existing;
};

const validateCodingPayload = (coding = {}) => {
  if (!coding) return;
  if (coding.testCases && !Array.isArray(coding.testCases)) {
    throw new Error("coding.testCases must be an array");
  }
  if (coding.testCases) {
    for (const tc of coding.testCases) {
      if (typeof tc.input === "undefined" || typeof tc.expectedOutput === "undefined") {
        throw new Error("Each testCase must have 'input' and 'expectedOutput'");
      }
    }
  }
  if (coding.allowedLanguages && !Array.isArray(coding.allowedLanguages)) {
    throw new Error("coding.allowedLanguages must be an array");
  }
  if (coding.maxRunAttempts && Number(coding.maxRunAttempts) <= 0) {
    throw new Error("coding.maxRunAttempts must be a positive number");
  }

  // --- NEW: starterCodes validation ---
  if (coding.starterCodes) {
    if (!Array.isArray(coding.starterCodes)) {
      throw new Error("coding.starterCodes must be an array");
    }
    for (const sc of coding.starterCodes) {
      if (!sc || typeof sc !== "object") {
        throw new Error("each starterCode must be an object { language, code }");
      }
      if (!sc.language || typeof sc.language !== "string") {
        throw new Error("each starterCode must include a 'language' string");
      }
      if (typeof sc.code !== "string") {
        throw new Error("each starterCode must include a 'code' string");
      }
      // optional: ensure starter language is one of allowedLanguages (if provided)
      if (Array.isArray(coding.allowedLanguages) && !coding.allowedLanguages.includes(sc.language)) {
        throw new Error(`starterCodes language '${sc.language}' must be included in coding.allowedLanguages`);
      }
    }
  }
};

export const createQuestionService = async (data) => {
  const { domain, questionText, type, coding } = data;

  if (!domain || !isValidId(domain)) {
    throw new Error("Valid 'domain' ObjectId is required.");
  }
  if (!questionText || !questionText.trim()) {
    throw new Error("Question text is required.");
  }

  const domainDoc = await Domain.findById(domain).select("category description");
  if (!domainDoc) throw new Error("Invalid domain id.");

  const duplicate = await checkDuplicate(questionText, domainDoc._id);
  if (duplicate) throw new Error("This question already exists in the selected domain.");
  if (type === "CODING") validateCodingPayload(coding);

  const payload = {
    ...data,
    questionText: questionText.trim(),
    domain: domainDoc._id,
    category: domainDoc.category,
    description: domainDoc.description,
  };

  // --- normalize starterCodes: dedupe by language keeping first ---
  if (payload.coding && Array.isArray(payload.coding.starterCodes)) {
    const seen = new Set();
    payload.coding.starterCodes = payload.coding.starterCodes
      .filter(sc => sc && sc.language && typeof sc.language === "string")
      .filter(sc => {
        if (seen.has(sc.language)) return false;
        seen.add(sc.language);
        return true;
      })
      .map(sc => ({
        language: sc.language,
        code: typeof sc.code === "string" ? sc.code : ""
      }));
  }

  // --- normalize testCases to strings (keeps numeric 0, false etc) ---
  if (payload.coding && Array.isArray(payload.coding.testCases)) {
    payload.coding.testCases = payload.coding.testCases
      .filter(tc => tc && (typeof tc.input !== "undefined") && (typeof tc.expectedOutput !== "undefined"))
      .map(tc => ({
        input: String(tc.input),
        expectedOutput: String(tc.expectedOutput),
        isPublic: !!tc.isPublic,
        score: Number.isFinite(Number(tc.score)) ? Number(tc.score) : (tc.score || 1)
      }));
  }

  // --- Robust stdin helper to inject for JavaScript starter code ---
  const stdinHelpers = `// readAllStdin / readStdin - robust cross-runtime stdin reader
async function readAllStdin() {
  // 1) Deno: try reading from Deno.stdin using readAll (no --allow-read required)
  try {
    if (typeof Deno !== "undefined" && typeof Deno.readAll === "function" && Deno.stdin) {
      const buf = await Deno.readAll(Deno.stdin);
      return new TextDecoder().decode(buf);
    }
  } catch {}

  // 2) Node-like: safely grab globalThis.process into a local var first
  try {
    const proc = globalThis.process;
    if (proc && proc.stdin && typeof proc.stdin[Symbol.asyncIterator] === "function") {
      if (proc.stdin.isTTY) return "";
      let s = "";
      for await (const chunk of proc.stdin) {
        s += chunk;
      }
      return s;
    }
  } catch {}

  // 3) Fallback: try node:fs read of /dev/stdin or fd 0
  try {
    const fs = await import("node:fs");
    try {
      return fs.readFileSync("/dev/stdin", "utf8");
    } catch {
      try {
        return fs.readFileSync(0, "utf8");
      } catch {}
    }
  } catch {}

  // nothing available — return empty string
  return "";
}

// alias for convenience
const readStdin = readAllStdin;

`;

  // Inject helper into JS starter codes if missing
  if (payload.coding && Array.isArray(payload.coding.starterCodes)) {
    payload.coding.starterCodes = payload.coding.starterCodes.map(sc => {
      if (sc.language === "javascript") {
        const code = sc.code || "";
        const helperPresent =
          /function\s+readAllStdin\s*\(/.test(code) ||
          /function\s+readStdin\s*\(/.test(code) ||
          code.includes("Deno.readAll") ||
          code.includes("readAllStdin(") ||
          code.includes("readStdin(");
        if (!helperPresent) {
          return { ...sc, code: stdinHelpers + code };
        }
      }
      return sc;
    });
  }

  // ---------- create the question ----------
  const created = await QuestionPaper.create(payload);

  // ---------- optional attach logic ----------
  // Supported payload flags:
  //  - attachToSetId: "<setId>"                 -> append to that set
  //  - attachToTemplateId + attachToSetLabel    -> find set by template + label (create if missing) and append
  //  - attachToTemplateId + createDefaultSetLabel -> create set with that label and append
  //  - failOnAttach: true                       -> if true, delete created question on attach failure and throw

  const {
    attachToSetId,
    attachToTemplateId,
    attachToSetLabel,
    createDefaultSetLabel,
    failOnAttach = false,
  } = data || {};

  // no-op if nothing asked
  if (!attachToSetId && !attachToTemplateId) {
    return created;
  }

  try {
    if (attachToSetId && isValidId(attachToSetId)) {
      // append to existing set
      await paperSetService.addQuestionsToSet(attachToSetId, [String(created._id)], { mode: "append" });
    } else if (attachToTemplateId && isValidId(attachToTemplateId)) {
      if (attachToSetLabel) {
        // try to find set by template + label
        const existing = await paperSetService.findSetByTemplateAndLabel(attachToTemplateId, attachToSetLabel);
        if (existing) {
          await paperSetService.addQuestionsToSet(existing._id, [String(created._id)], { mode: "append" });
        } else {
          await paperSetService.createPaperSet({
            paperTemplateId: attachToTemplateId,
            setLabel: attachToSetLabel,
            questions: [String(created._id)],
            createdBy: data.createdBy || null,
          });
        }
      } else if (createDefaultSetLabel) {
        // explicitly create a set with provided label
        await paperSetService.createPaperSet({
          paperTemplateId: attachToTemplateId,
          setLabel: createDefaultSetLabel,
          questions: [String(created._id)],
          createdBy: data.createdBy || null,
        });
      } else {
        // if template provided but no label, append to Set "A" if exists, else create "A"
        const existingA = await paperSetService.findSetByTemplateAndLabel(attachToTemplateId, "A");
        if (existingA) {
          await paperSetService.addQuestionsToSet(existingA._id, [String(created._id)], { mode: "append" });
        } else {
          await paperSetService.createPaperSet({
            paperTemplateId: attachToTemplateId,
            setLabel: "A",
            questions: [String(created._id)],
            createdBy: data.createdBy || null,
          });
        }
      }
    }
  } catch (attachErr) {
    // if user wants strict behavior, rollback the created question and surface error
    console.warn("attachToSet failed:", attachErr.message || attachErr);
    if (failOnAttach) {
      try {
        await QuestionPaper.findByIdAndDelete(created._id);
      } catch (delErr) {
        console.error("Failed to delete question after attach failure:", delErr);
      }
      throw new Error("Question creation rolled back due to attach failure: " + (attachErr.message || attachErr));
    }
    // Non-fatal: return created question but log error (UI can warn)
  }

  return created;
};


export const getAllQuestionService = async (query = {}) => {
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
  if (search) filter.questionText = { $regex: search.trim(), $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const sortObj = { [sort]: order === "asc" ? 1 : -1 };

  let q = QuestionPaper.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(Number(limit));

  if (String(populate) !== "false") {
    q = q.populate({ path: "domain", select: "domain category description" });
  }

  const [rows, total] = await Promise.all([
    q.lean().exec(),
    QuestionPaper.countDocuments(filter),
  ]);

  const items = rows.map((it) => {
    const dom = typeof it.domain === "object" ? it.domain : null;
    return {
      ...it,
      domainName: dom?.domain || it.domain,
      category: it.category ?? dom?.category ?? null,
      description: it.description ?? dom?.description ?? null,
    };
  });

  return {
    items,
    total,
    page: Number(page),
    pages: Math.max(1, Math.ceil(total / Number(limit))),
  };
};

export const getQuestionByIdService = async (id, options = {}) => {
  if (!isValidId(id)) return null;

  const { populate = true } = options;
  let q = QuestionPaper.findById(id);
  if (populate) {
    q = q.populate({ path: "domain", select: "domain category description" });
  }
  return q.lean().exec();
};

export const updateQuestionService = async (id, updateData = {}, options = {}) => {
  if (!isValidId(id)) return null;

  const update = { ...updateData };

  // keep a snapshot of the original document for validation + rollback if needed
  const original = await QuestionPaper.findById(id).lean();
  if (!original) throw new Error("Question not found.");

  // domain handling (same as before)
  if (update.domain) {
    if (!isValidId(update.domain)) throw new Error("Invalid domain id.");

    const domainDoc = await Domain.findById(update.domain).select("category description");
    if (!domainDoc) throw new Error("Invalid domain id.");

    update.category = domainDoc.category;
    update.description = domainDoc.description;
    update.domain = domainDoc._id;
  } else {
    update.domain = original.domain; // fallback to existing domain
  }

  if (update.type === "CODING" || (update.coding && typeof update.coding === "object")) {
    validateCodingPayload(update.coding);
  }

  if (update.questionText) {
    const duplicate = await checkDuplicate(update.questionText, update.domain, id);
    if (duplicate) throw new Error("This question already exists in the selected domain.");
    update.questionText = update.questionText.trim();
  }

  // --- normalize starterCodes: dedupe by language keeping first (if provided in update) ---
  if (update.coding && Array.isArray(update.coding.starterCodes)) {
    const seen = new Set();
    update.coding.starterCodes = update.coding.starterCodes
      .filter(sc => sc && sc.language && typeof sc.language === "string")
      .filter(sc => {
        if (seen.has(sc.language)) return false;
        seen.add(sc.language);
        return true;
      })
      .map(sc => ({
        language: sc.language,
        code: typeof sc.code === "string" ? sc.code : ""
      }));
  }

  // --- normalize testCases to strings if provided in update ---
  if (update.coding && Array.isArray(update.coding.testCases)) {
    update.coding.testCases = update.coding.testCases
      .filter(tc => tc && (typeof tc.input !== "undefined") && (typeof tc.expectedOutput !== "undefined"))
      .map(tc => ({
        input: String(tc.input),
        expectedOutput: String(tc.expectedOutput),
        isPublic: !!tc.isPublic,
        score: Number.isFinite(Number(tc.score)) ? Number(tc.score) : (tc.score || 1)
      }));
  }

  // --- Robust stdin helper to inject for JavaScript starter code ---
  const stdinHelpers = `// readAllStdin / readStdin - robust cross-runtime stdin reader
async function readAllStdin() {
  // 1) Deno: try reading from Deno.stdin using readAll (no --allow-read required)
  try {
    if (typeof Deno !== "undefined" && typeof Deno.readAll === "function" && Deno.stdin) {
      const buf = await Deno.readAll(Deno.stdin);
      return new TextDecoder().decode(buf);
    }
  } catch {}

  // 2) Node-like: safely grab globalThis.process into a local var first
  try {
    const proc = globalThis.process;
    if (proc && proc.stdin && typeof proc.stdin[Symbol.asyncIterator] === "function") {
      if (proc.stdin.isTTY) return "";
      let s = "";
      for await (const chunk of proc.stdin) {
        s += chunk;
      }
      return s;
    }
  } catch {}

  // 3) Fallback: try node:fs read of /dev/stdin or fd 0
  try {
    const fs = await import("node:fs");
    try {
      return fs.readFileSync("/dev/stdin", "utf8");
    } catch {
      try {
        return fs.readFileSync(0, "utf8");
      } catch {}
    }
  } catch {}

  // nothing available — return empty string
  return "";
}

// alias for convenience
const readStdin = readAllStdin;

`;

  // If update.coding.starterCodes provided, inject helper there
  if (update.coding && Array.isArray(update.coding.starterCodes)) {
    update.coding.starterCodes = update.coding.starterCodes.map(sc => {
      if (sc.language === "javascript") {
        const code = sc.code || "";
        const helperPresent =
          /function\s+readAllStdin\s*\(/.test(code) ||
          /function\s+readStdin\s*\(/.test(code) ||
          code.includes("Deno.readAll") ||
          code.includes("readAllStdin(") ||
          code.includes("readStdin(");
        if (!helperPresent) {
          return { ...sc, code: stdinHelpers + code };
        }
      }
      return sc;
    });
  } else {
    // preserve original starterCodes and ensure helper
    const origStarter = (original.coding && Array.isArray(original.coding.starterCodes)) ? original.coding.starterCodes : [];
    update.coding = update.coding || {};
    update.coding.starterCodes = origStarter.map(sc => {
      if (sc.language === "javascript") {
        const code = sc.code || "";
        const helperPresent =
          /function\s+readAllStdin\s*\(/.test(code) ||
          /function\s+readStdin\s*\(/.test(code) ||
          code.includes("Deno.readAll") ||
          code.includes("readAllStdin(") ||
          code.includes("readStdin(");
        if (!helperPresent) {
          return { language: sc.language, code: stdinHelpers + code };
        }
      }
      return sc;
    });
  }

  // ---------- apply update ----------
  const updated = await QuestionPaper.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!updated) return null;

  // ---------- optional attach/detach logic ----------
  // Supported updateData flags (same names supported on create):
  // attachToSetId, detachFromSetId, attachToTemplateId, attachToSetLabel, createDefaultSetLabel, failOnAttach
  const {
    attachToSetId,
    detachFromSetId,
    attachToTemplateId,
    attachToSetLabel,
    createDefaultSetLabel,
    failOnAttach = false,
    createdBy = null,
  } = updateData || {};

  // Helper to attempt rollback (best-effort): restore original doc
  const rollbackToOriginal = async (reason) => {
    try {
      await QuestionPaper.findByIdAndUpdate(id, original, { new: false, runValidators: false });
    } catch (rbErr) {
      console.error("Rollback failed:", rbErr);
    }
    throw new Error("Attach/Detach failed after update: " + (reason && reason.message ? reason.message : reason));
  };

  if (attachToSetId || detachFromSetId || attachToTemplateId) {
    try {
      // detach first (if requested)
      if (detachFromSetId && isValidId(detachFromSetId)) {
        await paperSetService.removeQuestionFromSet(detachFromSetId, id);
      }

      // attach by set id (preferred)
      if (attachToSetId && isValidId(attachToSetId)) {
        await paperSetService.addQuestionsToSet(attachToSetId, [String(id)], { mode: "append" });
      } else if (attachToTemplateId && isValidId(attachToTemplateId)) {
        // attach by template + label or create set then attach
        if (attachToSetLabel) {
          const existing = await paperSetService.findSetByTemplateAndLabel(attachToTemplateId, attachToSetLabel);
          if (existing) {
            await paperSetService.addQuestionsToSet(existing._id, [String(id)], { mode: "append" });
          } else {
            await paperSetService.createPaperSet({
              paperTemplateId: attachToTemplateId,
              setLabel: attachToSetLabel,
              questions: [String(id)],
              createdBy,
            });
          }
        } else if (createDefaultSetLabel) {
          await paperSetService.createPaperSet({
            paperTemplateId: attachToTemplateId,
            setLabel: createDefaultSetLabel,
            questions: [String(id)],
            createdBy,
          });
        } else {
          // fallback: attach to Set "A" if exists else create it
          const existingA = await paperSetService.findSetByTemplateAndLabel(attachToTemplateId, "A");
          if (existingA) {
            await paperSetService.addQuestionsToSet(existingA._id, [String(id)], { mode: "append" });
          } else {
            await paperSetService.createPaperSet({
              paperTemplateId: attachToTemplateId,
              setLabel: "A",
              questions: [String(id)],
              createdBy,
            });
          }
        }
      }
    } catch (attachErr) {
      console.warn("attach/detach failed:", attachErr);
      if (failOnAttach) {
        // attempt rollback to original state then throw to caller
        await rollbackToOriginal(attachErr);
      } else {
        // non-fatal: log and continue; the question update was saved but attach/detach failed
        console.warn("Non-fatal: question update saved but attach/detach failed.");
      }
    }
  }

  if (options.populate !== false) {
    await updated.populate({ path: "domain", select: "domain category description" });
  }
  return updated;
};


export const deleteQuestionService = async (id) => {
  if (!isValidId(id)) return null;
  return QuestionPaper.findByIdAndDelete(id);
};
