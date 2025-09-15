
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
  RUN_CODE_REQUEST,
  RUN_CODE_SUCCESS,
  RUN_CODE_FAIL,
  FETCH_CODING_ATTEMPTS_REQUEST,
  FETCH_CODING_ATTEMPTS_SUCCESS,
  FETCH_CODING_ATTEMPTS_FAIL,
} from "./actionType";

const initialState = {
  // ✅ Socket-driven state
  students: [],     // Active students in exam
  alerts: [],       // Admin alerts (tab switch, camera off, force submit)
  submissions: [],  // Live submissions (socket + fetch)

  // ✅ Student paper
  paper: null,

  // ✅ Exam lifecycle
  loading: false,
  error: null,
  currentExam: null, // Active exam object
  answers: {},       // Local answers (keyed by questionId)
    codingAttempts: {},            // { [questionId]: { attempts: [...], remaining, maxAttempts } }
  codingLoading: false,          // general flag for run/fetch ops
  codingError: null,
};

export const examReducer = (state = initialState, action) => {
  switch (action.type) {
    /* =========================
       SOCKET EVENTS
    ========================= */
    case STUDENT_JOIN:
      return {
        ...state,
        students: [...state.students, action.payload],
      };
    case STUDENT_STATUS_UPDATE:
      return {
        ...state,
        students: state.students.map((s) =>
          s.email === action.payload.email ? { ...s, online: action.payload.online } : s
        ),
      };
    case ADMIN_ALERT:
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };
    case ANSWER_UPDATE:
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.answer,
        },
      };
    case EXAM_SUBMITTED:
      return {
        ...state,
        submissions: [...state.submissions, action.payload],
      };
    case FORCE_SUBMIT:
      return {
        ...state,
        alerts: [...state.alerts, { type: "FORCE_SUBMIT", ...action.payload }],
      };

    /* =========================
       STUDENT PAPER
    ========================= */
    case FETCH_STUDENT_PAPER_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_STUDENT_PAPER_SUCCESS:
      return { ...state, loading: false, paper: action.payload };
    case FETCH_STUDENT_PAPER_FAIL:
      return { ...state, loading: false, error: action.payload };

    /* =========================
       EXAM LIFECYCLE
    ========================= */
    case START_EXAM_REQUEST:
      return { ...state, loading: true, error: null };
    case START_EXAM_SUCCESS:
      return {
        ...state,
        loading: false,
        currentExam: action.payload,
        answers: {},
      };
    case START_EXAM_FAIL:
      return { ...state, loading: false, error: action.payload };

    case SUBMIT_EXAM_REQUEST:
      return { ...state, loading: true, error: null };
    case SUBMIT_EXAM_SUCCESS:
      return {
        ...state,
        loading: false,
        currentExam: { ...state.currentExam, status: "SUBMITTED" },
      };
    case SUBMIT_EXAM_FAIL:
      return { ...state, loading: false, error: action.payload };

    case FETCH_SUBMISSIONS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_SUBMISSIONS_SUCCESS:
      return { ...state, loading: false, submissions: action.payload };
    case FETCH_SUBMISSIONS_FAIL:
      return { ...state, loading: false, error: action.payload };

      // for code test
          case RUN_CODE_REQUEST: {
      return { ...state, codingLoading: true, codingError: null };
    }
    case RUN_CODE_SUCCESS: {
      const { questionId, data } = action.payload || {};
      // data may contain attempt and attempt.result or attempts array
      const existing = state.codingAttempts[questionId] || { attempts: [], remaining: null, maxAttempts: null };

      // if response contains 'attempt' append it; else if 'attempts' replace
      let updatedAttempts = existing.attempts;
      let remaining = existing.remaining;
      let maxAttempts = existing.maxAttempts;

      if (data?.attempt) {
        updatedAttempts = [...existing.attempts, data.attempt];
        // if server returned remaining/max, use them
        if (typeof data.remaining !== "undefined") remaining = data.remaining;
        if (typeof data.maxAttempts !== "undefined") maxAttempts = data.maxAttempts;
      } else if (data?.attempts) {
        updatedAttempts = data.attempts;
        remaining = data.remaining ?? remaining;
        maxAttempts = data.maxAttempts ?? maxAttempts;
      }

      return {
        ...state,
        codingLoading: false,
        codingAttempts: {
          ...state.codingAttempts,
          [questionId]: { attempts: updatedAttempts, remaining, maxAttempts },
        },
      };
    }
    case RUN_CODE_FAIL:
      return { ...state, codingLoading: false, codingError: action.payload?.error || "Run failed" };

    case FETCH_CODING_ATTEMPTS_REQUEST:
      return { ...state, codingLoading: true, codingError: null };
    case FETCH_CODING_ATTEMPTS_SUCCESS: {
      const { questionId, data } = action.payload || {};
      return {
        ...state,
        codingLoading: false,
        codingAttempts: {
          ...state.codingAttempts,
          [questionId]: {
            attempts: data.attempts || [],
            remaining: typeof data.remaining !== "undefined" ? data.remaining : null,
            maxAttempts: typeof data.maxAttempts !== "undefined" ? data.maxAttempts : null,
          },
        },
      };
    }
    case FETCH_CODING_ATTEMPTS_FAIL:
      return { ...state, codingLoading: false, codingError: action.payload?.error || "Failed to fetch attempts" };

    default:
      return state;
  }
};
