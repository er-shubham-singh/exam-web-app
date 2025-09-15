// src/redux/result/result.reducer.js
import {
  GET_RESULTS_BY_IDENTITY_REQUEST,
  GET_RESULTS_BY_IDENTITY_SUCCESS,
  GET_RESULTS_BY_IDENTITY_FAILURE,
  GET_RESULT_BY_EXAMID_REQUEST,
  GET_RESULT_BY_EXAMID_SUCCESS,
  GET_RESULT_BY_EXAMID_FAILURE,
} from "./actionType";

const initialState = {
  loading: false,
  resultsList: [],       // all results by email+roll
  selectedResult: null,  // single exam result
  error: null,
};

export const resultReducer = (state = initialState, action = {}) => {
  switch (action.type) {
    // --- Results by Identity ---
    case GET_RESULTS_BY_IDENTITY_REQUEST:
      return { ...state, loading: true, error: null };

    case GET_RESULTS_BY_IDENTITY_SUCCESS:
      console.log("[resultReducer] GET_RESULTS_BY_IDENTITY_SUCCESS count:", (action.payload || []).length);
      return { ...state, loading: false, resultsList: action.payload || [], error: null };

    case GET_RESULTS_BY_IDENTITY_FAILURE:
      console.log("[resultReducer] GET_RESULTS_BY_IDENTITY_FAILURE:", action.payload);
      return { ...state, loading: false, error: action.payload || "Error fetching results" };

    // --- Single Result by ExamId ---
    case GET_RESULT_BY_EXAMID_REQUEST:
      // keep resultsList as-is but set loading flag
      return { ...state, loading: true, error: null };

    case GET_RESULT_BY_EXAMID_SUCCESS:
      console.log("[resultReducer] GET_RESULT_BY_EXAMID_SUCCESS payload:", action.payload);
      return { ...state, loading: false, selectedResult: action.payload || null, error: null };

    case GET_RESULT_BY_EXAMID_FAILURE:
      console.log("[resultReducer] GET_RESULT_BY_EXAMID_FAILURE:", action.payload);
      return { ...state, loading: false, error: action.payload || "Error fetching single result" };

    default:
      return state;
  }
};
