// src/redux/result/result.actions.js
import api from "../../config/api";
import {
  GET_RESULTS_BY_IDENTITY_REQUEST,
  GET_RESULTS_BY_IDENTITY_SUCCESS,
  GET_RESULTS_BY_IDENTITY_FAILURE,
  GET_RESULT_BY_EXAMID_REQUEST,
  GET_RESULT_BY_EXAMID_SUCCESS,
  GET_RESULT_BY_EXAMID_FAILURE,
} from "./actionType";

// Fetch all results by email + rollNumber
export const fetchResultsByIdentity = (email, rollNumber) => async (dispatch) => {
  try {
    dispatch({ type: GET_RESULTS_BY_IDENTITY_REQUEST });

    const res = await api.get(`/api/results/by-identity`, {
      params: { email, rollNumber },
    });

    // debug - shows the raw API body
    console.log("[fetchResultsByIdentity] API response:", res.data);

    // Normalize results to array
    const payload = Array.isArray(res.data?.results) ? res.data.results : [];

    dispatch({
      type: GET_RESULTS_BY_IDENTITY_SUCCESS,
      payload,
    });
  } catch (err) {
    console.error("[fetchResultsByIdentity] error:", err);
    dispatch({
      type: GET_RESULTS_BY_IDENTITY_FAILURE,
      payload: err.response?.data?.error || err.message || "Failed to fetch results",
    });
  }
};

// Fetch single result by studentExamId
export const fetchResultByExamId = (studentExamId) => async (dispatch) => {
  try {
    dispatch({ type: GET_RESULT_BY_EXAMID_REQUEST });

    // use the same api instance
    const res = await api.get(`/api/results/${studentExamId}`);

    console.log("[fetchResultByExamId] API response:", res.data);

    // backend returns { success: true, result: {...} } — normalize to object or null
    const payload = res.data?.result ?? null;

    dispatch({
      type: GET_RESULT_BY_EXAMID_SUCCESS,
      payload,
    });
  } catch (err) {
    console.error("[fetchResultByExamId] error:", err);
    dispatch({
      type: GET_RESULT_BY_EXAMID_FAILURE,
      payload: err.response?.data?.error || err.message || "Failed to fetch result",
    });
  }
};
