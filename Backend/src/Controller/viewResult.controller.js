// controllers/result.controller.js
import {
  getResultsByEmailAndRoll,
  getResultByStudentExamId,
} from "../Services/viewResult.services.js";

/**
 * Public endpoint: GET /api/results/by-identity?email=...&rollNumber=...
 * Returns an array (possibly empty) of results for that student.
 */
export const getResultByEmailAndRollController = async (req, res) => {
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const start = Date.now();

  // support query params and also accept POST body if someone sends JSON
  const email = (req.query?.email ?? req.body?.email ?? "").toString().trim();
  const rollNumber = (req.query?.rollNumber ?? req.body?.rollNumber ?? "").toString().trim();
  const limit = req.query?.limit ?? req.body?.limit;
  const skip = req.query?.skip ?? req.body?.skip;

  const ip = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "unknown";
  const ua = req.get("user-agent") || "unknown";

  console.info(`[API][getResults][${reqId}] ENTER time=${new Date().toISOString()} ip=${ip} ua="${ua}" payload=${JSON.stringify({ email, rollNumber, limit, skip })}`);

  try {
    if (!email || !rollNumber) {
      console.warn(`[API][getResults][${reqId}] INVALID_PAYLOAD missing email/rollNumber`);
      return res.status(400).json({ success: false, error: "email and rollNumber are required" });
    }

    const options = {};
    if (limit) options.limit = limit;
    if (skip) options.skip = skip;

    // call service (service has its own logging too)
    const results = await getResultsByEmailAndRoll(email, rollNumber, options);

    console.info(`[API][getResults][${reqId}] SERVICE_RETURN count=${(results || []).length} timeMs=${Date.now()-start}`);

    if (!results || !results.length) {
      // explicit 200/404 decision: keep your existing response shape but log clearly
      console.info(`[API][getResults][${reqId}] NO_RESULTS returning 404 to client`);
      return res.status(404).json({
        success: true,
        results: [],
        message: "No evaluated results found for given email and roll number."
      });
    }

    console.info(`[API][getResults][${reqId}] SUCCESS returning results timeMs=${Date.now()-start}`);
    return res.json({ success: true, results });
  } catch (err) {
    // log full stack + context so you can find where the error was raised
    console.error(`[API][getResults][${reqId}] ERROR time=${new Date().toISOString()} payload=${JSON.stringify({ email, rollNumber, limit, skip })}`, err && err.stack ? err.stack : err);
    // return minimal error to client but include reqId so you can search logs
    return res.status(500).json({
      success: false,
      error: "Failed to fetch results",
      reqId: reqId
    });
  }
};

/**
 * Public endpoint: GET /api/results/:studentExamId
 * Returns a single evaluation view for the provided studentExamId.
 */
export const getResultByStudentExamIdController = async (req, res) => {
  try {
    const { studentExamId } = req.params;
    if (!studentExamId) return res.status(400).json({ success: false, error: "studentExamId required" });

    const result = await getResultByStudentExamId(studentExamId);
    if (!result) return res.status(404).json({ success: false, error: "Result not found or not evaluated yet" });

    return res.json({ success: true, result });
  } catch (err) {
    console.error("getResultByStudentExamIdController:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
