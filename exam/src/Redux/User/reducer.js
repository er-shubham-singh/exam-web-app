// reducers/userReducer.js
import {
  LOGIN_USER_FAIL,
  LOGIN_USER_REQUEST,
  LOGIN_USER_SUCCESS,
  REGISTER_USER_FAIL,
  REGISTER_USER_REQUEST,
  REGISTER_USER_SUCCESS,
  BULK_SET_ROWS,
  BULK_CLEAR,
  BULK_UPLOAD_REQUEST,
  BULK_UPLOAD_SUCCESS,
  BULK_UPLOAD_FAIL,
} from "./actionType";

const initialState = {
  user: null,
  registerLoading: false,
  loginLoading: false,
  error: null,

  // --- bulk ---
  bulkRows: [],
  bulkLoading: false,
  bulkError: null,
  bulkResults: [],          // array of per-row results
  bulkSummary: null,        // { total, ok, failed }
};

export const userReducer = (state = initialState, action) => {
  switch (action.type) {
    // -------- REGISTER --------
    case REGISTER_USER_REQUEST:
      return { ...state, registerLoading: true, error: null };
    case REGISTER_USER_SUCCESS:
      return { ...state, registerLoading: false, user: action.payload, error: null };
    case REGISTER_USER_FAIL:
      return { ...state, registerLoading: false, error: action.payload };

    // -------- LOGIN --------
    case LOGIN_USER_REQUEST:
      return { ...state, loginLoading: true, error: null };
    case LOGIN_USER_SUCCESS:
      return { ...state, loginLoading: false, user: action.payload, error: null };
    case LOGIN_USER_FAIL:
      return { ...state, loginLoading: false, error: action.payload };

    // -------- BULK --------
    case BULK_SET_ROWS:
      return {
        ...state,
        bulkRows: action.payload,
        bulkResults: [],
        bulkSummary: null,
        bulkError: null,
      };
    case BULK_CLEAR:
      return {
        ...state,
        bulkRows: [],
        bulkResults: [],
        bulkSummary: null,
        bulkError: null,
      };
    case BULK_UPLOAD_REQUEST:
      return { ...state, bulkLoading: true, bulkError: null };
    case BULK_UPLOAD_SUCCESS:
      return {
        ...state,
        bulkLoading: false,
        bulkError: null,
        bulkResults: action.payload?.results || [],
        bulkSummary: {
          total: action.payload?.total || 0,
          ok: action.payload?.ok || 0,
          failed: action.payload?.failed || 0,
        },
      };
    case BULK_UPLOAD_FAIL:
      return { ...state, bulkLoading: false, bulkError: action.payload };

    default:
      return state;
  }
};
