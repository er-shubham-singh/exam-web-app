// redux/evaluationReducer.js
import {
  EVALUATE_EXAM_REQUEST,
  EVALUATE_EXAM_SUCCESS,
  EVALUATE_EXAM_FAILURE,
  FETCH_EVALUATION_HISTORY_REQUEST,
  FETCH_EVALUATION_HISTORY_SUCCESS,
  FETCH_EVALUATION_HISTORY_FAILURE,
} from "./actionType";

const initialState = {
  evaluateLoading: false,
  evaluateResult: null,
  evaluateError: null,

  historyLoading: false,
  history: [],
  historyError: null,
};

const evaluationReducer = (state = initialState, action) => {
  switch (action.type) {
    // Evaluation submission cases
    case EVALUATE_EXAM_REQUEST:
      return { ...state, evaluateLoading: true, evaluateError: null };
    case EVALUATE_EXAM_SUCCESS:
      return { ...state, evaluateLoading: false, evaluateResult: action.payload };
    case EVALUATE_EXAM_FAILURE:
      return { ...state, evaluateLoading: false, evaluateError: action.payload };

    // Fetch history cases
    case FETCH_EVALUATION_HISTORY_REQUEST:
      return { ...state, historyLoading: true, historyError: null };
    case FETCH_EVALUATION_HISTORY_SUCCESS:
      return { ...state, historyLoading: false, history: action.payload };
    case FETCH_EVALUATION_HISTORY_FAILURE:
      return { ...state, historyLoading: false, historyError: action.payload };

    default:
      return state;
  }
};

export default evaluationReducer;
