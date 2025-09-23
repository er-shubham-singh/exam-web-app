
import api from "../../config/api";
import {
  // Socket actions
  STUDENT_JOIN,
  STUDENT_STATUS_UPDATE,
  ADMIN_ALERT,
  ANSWER_UPDATE,
  EXAM_SUBMITTED,
  FORCE_SUBMIT,

  // Student paper
  FETCH_STUDENT_PAPER_REQUEST,
  FETCH_STUDENT_PAPER_SUCCESS,
  FETCH_STUDENT_PAPER_FAIL,

  // Exam lifecycle
  START_EXAM_REQUEST,
  START_EXAM_SUCCESS,
  START_EXAM_FAIL,
  SUBMIT_EXAM_REQUEST,
  SUBMIT_EXAM_SUCCESS,
  SUBMIT_EXAM_FAIL,
  UPDATE_ANSWER,
  FETCH_SUBMISSIONS_REQUEST,
  FETCH_SUBMISSIONS_SUCCESS,
  FETCH_SUBMISSIONS_FAIL,
    EYE_OFF_SCREEN,
  MULTIPLE_FACES,
  CAMERA_OFF,
  RUN_CODE_REQUEST,
  RUN_CODE_SUCCESS,
  RUN_CODE_FAIL,
  FETCH_CODING_ATTEMPTS_REQUEST,
  FETCH_CODING_ATTEMPTS_SUCCESS,
  FETCH_CODING_ATTEMPTS_FAIL,
} from "./actionType";

/* =========================
   SOCKET EVENT ACTIONS
========================= */
export const handleStudentJoin = (data) => ({
  type: STUDENT_JOIN,
  payload: data,
});

export const handleStudentStatusUpdate = (data) => ({
  type: STUDENT_STATUS_UPDATE,
  payload: data,
});

export const handleAdminAlert = (data) => ({
  type: ADMIN_ALERT,
  payload: data,
});

export const handleAnswerUpdate = (data) => ({
  type: ANSWER_UPDATE,
  payload: data,
});

export const handleExamSubmitted = (data) => ({
  type: EXAM_SUBMITTED,
  payload: data,
});

export const handleForceSubmit = (data) => ({
  type: FORCE_SUBMIT,
  payload: data,
});


// Strict proctoring
export const handleEyeOffScreen = (data) => ({
  type: EYE_OFF_SCREEN,
  payload: data,
});

export const handleMultipleFaces = (data) => ({
  type: MULTIPLE_FACES,
  payload: data,
});

export const handleCameraOff = (data) => ({
  type: CAMERA_OFF,
  payload: data,
});

// actions/exam.actions.js (replace the old fetchStudentPaper)
export const fetchStudentPaper = ({ category, domainId }) => async (dispatch) => {
  dispatch({ type: FETCH_STUDENT_PAPER_REQUEST });
  try {
    const res = await api.get(
      `/api/student-paper?category=${encodeURIComponent(category)}&domain=${encodeURIComponent(domainId)}`
    );

    // Server returns { success: true, paperTemplate, paperSet } (per your payload)
    const tpl = res.data?.paperTemplate || null;
    const set = res.data?.paperSet || null;

    // Build a normalized paper object for the UI
    const paper = {
      // prefer template id for template-level identity; fallback to set id
      _id: tpl?._id || tpl?.id || set?._id || set?.id || null,
      title: tpl?.title || set?.title || (tpl ? `${tpl.category} • ${new Date().toLocaleDateString()}` : "Paper"),
      category: tpl?.category || set?.category || category,
      domain: tpl?.domain || set?.domain || domainId,
      description: tpl?.description || tpl?.summary || "",
      // duration in minutes (set.timeLimitMin is what you call timeLimitMin)
      duration: set?.timeLimitMin ?? tpl?.defaultTimeLimitMin ?? 0,
      // Flatten questions: if set.questions entries are { question: {...} } use .question, otherwise accept the item
      // Also make sure each question is a plain object and filter out nulls
      questions: (set?.questions || []).map((item) => (item && item.question ? item.question : item)).filter(Boolean),
      // keep raw server payload for debugging if needed
      _raw: { paperTemplate: tpl, paperSet: set },
    };

    dispatch({
      type: FETCH_STUDENT_PAPER_SUCCESS,
      payload: paper,
    });

    return paper;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Unexpected error occurred";
    dispatch({ type: FETCH_STUDENT_PAPER_FAIL, payload: msg });
    throw new Error(msg);
  }
};



/* =========================
   EXAM LIFECYCLE (Student)
========================= */

// Start Exam
export const startExam = ({ student, exam }) => async (dispatch) => {
  dispatch({ type: START_EXAM_REQUEST });
  try {
    const res = await api.post("/api/student/start", { student, exam }); // ✅ matches routes
    dispatch({ type: START_EXAM_SUCCESS, payload: res.data.submission });
    return res.data.submission;
  } catch (err) {
    dispatch({
      type: START_EXAM_FAIL,
      payload: err.response?.data?.message || err.message,
    });
    throw err;
  }
};


// actions.js
export const updateAnswer = ({ studentExamId, questionId, answer }) => async (dispatch) => {
  // optimistic local update so UI updates instantly
  dispatch({
    type: ANSWER_UPDATE,                // update UI immediately (reducer already handles this)
    payload: { questionId, answer },
  });

  try {
    // persist to server
    await api.post("/api/student/answer", { studentExamId, questionId, answer });

    // optional: dispatch server-confirm action if you want to mark saved state
    dispatch({
      type: UPDATE_ANSWER,
      payload: { questionId, answer },
    });
  } catch (err) {
    console.error("❌ Failed to save answer:", err.response?.data || err.message);
    // optional: rollback or show notification
    // dispatch({ type: ANSWER_UPDATE, payload: { questionId, answer: previousValue }});
  }
};


// Submit Exam
export const submitExam = ({ studentExamId }) => async (dispatch) => {
  dispatch({ type: SUBMIT_EXAM_REQUEST });
  try {
    const res = await api.post("/api/student/submit", { studentExamId });
    dispatch({ type: SUBMIT_EXAM_SUCCESS, payload: res.data.submission });
    return res.data.submission;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    dispatch({ type: SUBMIT_EXAM_FAIL, payload: msg });
    throw new Error(msg);
  }
};

/* =========================
   FETCH SUBMISSIONS
========================= */

// One student’s submission
export const fetchSubmission = (student, exam) => async (dispatch) => {
  dispatch({ type: FETCH_SUBMISSIONS_REQUEST });
  try {
    const res = await api.get(`/api/student/${student}/${exam}`);
    dispatch({ type: FETCH_SUBMISSIONS_SUCCESS, payload: res.data.submission });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    dispatch({ type: FETCH_SUBMISSIONS_FAIL, payload: msg });
  }
};

// All submissions for one exam (Admin)
export const fetchAllSubmissions = (exam) => async (dispatch) => {
  dispatch({ type: FETCH_SUBMISSIONS_REQUEST });
  try {
    const res = await api.get(`/api/admin/submissions/${exam}`);
    dispatch({ type: FETCH_SUBMISSIONS_SUCCESS, payload: res.data.submissions });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    dispatch({ type: FETCH_SUBMISSIONS_FAIL, payload: msg });
  }
};

// All exams attempted by a student (Admin)
export const fetchSubmissionsByStudent = (userId) => async (dispatch) => {
  dispatch({ type: FETCH_SUBMISSIONS_REQUEST });
  try {
    const res = await api.get(`/api/admin/examsByStudent/${userId}`);
    dispatch({ type: FETCH_SUBMISSIONS_SUCCESS, payload: res.data.exams });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    dispatch({ type: FETCH_SUBMISSIONS_FAIL, payload: msg });
  }
};


// for code 

// Redux action: src/Redux/ExamLog/action.js (or where runCode lives)
export const runCode =
  ({ studentExamId, questionId, code, language, stdin = "", mode = "debug" }) =>
  async (dispatch) => {
    dispatch({ type: RUN_CODE_REQUEST, payload: { questionId } });

    // optimistic UI update
    dispatch({
      type: ANSWER_UPDATE,
      payload: { questionId, answer: { code, language, stdin } },
    });

    try {
      const res = await api.post(`/api/studentExam/${studentExamId}/code/run`, {
        questionId,
        code,
        language,
        stdin,
        mode, // 🔹 send mode explicitly
      });

      const payload = res.data || {};

      dispatch({
        type: RUN_CODE_SUCCESS,
        payload: { questionId, data: payload },
      });

      // persist confirmed answer
      dispatch({
        type: UPDATE_ANSWER,
        payload: { questionId, answer: { code, language, stdin } },
      });

      return payload;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Run failed";
      dispatch({ type: RUN_CODE_FAIL, payload: { questionId, error: msg } });
      throw err;
    }
  };



export const fetchCodingAttempts =
  ({ studentExamId, questionId }) =>
  async (dispatch) => {
    dispatch({ type: FETCH_CODING_ATTEMPTS_REQUEST, payload: { questionId } });
    try {
      const res = await api.get(
        `/api/studentExam/attempts?studentExamId=${encodeURIComponent(studentExamId)}&questionId=${encodeURIComponent(
          questionId
        )}`
      );

      const data = res.data || {};
      // expected: { attempts, remaining, maxAttempts }
      dispatch({
        type: FETCH_CODING_ATTEMPTS_SUCCESS,
        payload: { questionId, data },
      });

      return data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to fetch attempts";
      dispatch({ type: FETCH_CODING_ATTEMPTS_FAIL, payload: { questionId, error: msg } });
      throw err;
    }
  };
