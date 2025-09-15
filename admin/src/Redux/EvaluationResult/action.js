// redux/evaluationActions.js
import api from "../../config/api";
import {
  EVALUATE_EXAM_REQUEST,
  EVALUATE_EXAM_SUCCESS,
  EVALUATE_EXAM_FAILURE,
  FETCH_EVALUATION_HISTORY_REQUEST,
  FETCH_EVALUATION_HISTORY_SUCCESS,
  FETCH_EVALUATION_HISTORY_FAILURE,
} from "./actionType";

// Student submits and evaluates their exam
export const submitAndEvaluateExam = (studentExamId, submissionData) => async (dispatch) => {
  dispatch({ type: EVALUATE_EXAM_REQUEST });
  try {
    const response = await api.post(`/evaluate/${studentExamId}`, submissionData);
    dispatch({
      type: EVALUATE_EXAM_SUCCESS,
      payload: response.data,
    });
  } catch (error) {
    dispatch({
      type: EVALUATE_EXAM_FAILURE,
      payload: error.response?.data?.error || error.message,
    });
  }
};

// Admin fetches student evaluation history
export const fetchEvaluationHistory = (filters = {}) => async (dispatch) => {
  dispatch({ type: FETCH_EVALUATION_HISTORY_REQUEST });
  try {
    const query = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/admin/student-history?${query}`);
    dispatch({
      type: FETCH_EVALUATION_HISTORY_SUCCESS,
      payload: response.data.history,
    });
  } catch (error) {
    dispatch({
      type: FETCH_EVALUATION_HISTORY_FAILURE,
      payload: error.response?.data?.error || error.message,
    });
  }
};

