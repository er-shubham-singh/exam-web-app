import {
  CREATE_QUESTION_FAIL,
  CREATE_QUESTION_REQUEST,
  CREATE_QUESTION_SUCCESS,
  FETCH_QUESTION_FAIL,
  FETCH_QUESTION_REQUEST,
  FETCH_QUESTION_SUCCESS,
  UPDATE_QUESTION_REQUEST,
  UPDATE_QUESTION_SUCCESS,
  UPDATE_QUESTION_FAIL,
  DELETE_QUESTION_REQUEST,
  DELETE_QUESTION_SUCCESS,
  DELETE_QUESTION_FAIL,
  GET_QUESTION_REQUEST,
  GET_QUESTION_SUCCESS,
  GET_QUESTION_FAIL,
} from "./actionType";

const initialState = {
  loading: false,
  error: null,
  message: "",
  questions: [],
  currentQuestion: null,
  total: undefined, // optional if your backend returns pagination
};

// helpers
const extractList = (payload) =>
  Array.isArray(payload) ? payload : payload?.items || [];

const upsertById = (list, item) => {
  const idx = list.findIndex((q) => q._id === item._id);
  if (idx === -1) return [item, ...list];
  const next = list.slice();
  next[idx] = item;
  return next;
};

export const questionReducer = (state = initialState, action) => {
  switch (action.type) {
    // CREATE
    case CREATE_QUESTION_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case CREATE_QUESTION_SUCCESS: {
      const created = action.payload;
      return {
        ...state,
        loading: false,
        error: null,
        message: "Question created successfully",
        questions: upsertById(state.questions, created),
      };
    }

    case CREATE_QUESTION_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    // FETCH ALL
    case FETCH_QUESTION_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case FETCH_QUESTION_SUCCESS: {
      const list = extractList(action.payload);
      const total = Array.isArray(action.payload)
        ? action.payload.length
        : action.payload?.total;
      return {
        ...state,
        loading: false,
        error: null,
        message: "",
        questions: list,
        total,
      };
    }

    case FETCH_QUESTION_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    // GET BY ID
    case GET_QUESTION_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case GET_QUESTION_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        message: "",
        currentQuestion: action.payload,
      };

    case GET_QUESTION_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
        message: "",
        currentQuestion: null,
      };

    // UPDATE
    case UPDATE_QUESTION_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case UPDATE_QUESTION_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        error: null,
        message: "Question updated successfully",
        questions: upsertById(state.questions, updated),
        currentQuestion:
          state.currentQuestion && state.currentQuestion._id === updated._id
            ? updated
            : state.currentQuestion,
      };
    }

    case UPDATE_QUESTION_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    // DELETE
    case DELETE_QUESTION_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case DELETE_QUESTION_SUCCESS: {
      const id = action.payload;
      return {
        ...state,
        loading: false,
        error: null,
        message: "Question deleted successfully",
        questions: state.questions.filter((q) => q._id !== id),
        currentQuestion:
          state.currentQuestion && state.currentQuestion._id === id
            ? null
            : state.currentQuestion,
      };
    }

    case DELETE_QUESTION_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    default:
      return state;
  }
};
