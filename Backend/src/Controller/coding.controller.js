// import { runStudentCode } from "../Services/coding.service.js";

// export const runCodeController = async (req, res) => {
//   try {
//     const { studentExamId, questionId, code, language, stdin } = req.body;
//     const runBy = req.user?._id || null;

//     const resp = await runStudentCode({
//       studentExamId,
//       questionId,
//       code,
//       language,
//       stdin,
//       runBy,
//     });

//     return res.json(resp);
//   } catch (err) {
//     console.error("runCodeController:", err);
//     return res.status(500).json({ success: false, message: err.message || "Run failed" });
//   }
// };
