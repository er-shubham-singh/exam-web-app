// actions/userActions.js
import api from "../../config/api";
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

// ---------- SINGLE REGISTER ----------
export const registerUser = (data) => async (dispatch) => {
  try {
    dispatch({ type: REGISTER_USER_REQUEST });
    const res = await api.post("/api/users/register", data);
    dispatch({ type: REGISTER_USER_SUCCESS, payload: res.data.data });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || "Failed to register user";
    dispatch({ type: REGISTER_USER_FAIL, payload: msg });
    throw new Error(msg);
  }
};

// ---------- LOGIN ----------
// Redux/User/action.js
export const loginUser = (data) => async (dispatch) => {
  try {
    dispatch({ type: LOGIN_USER_REQUEST });
    const res = await api.post("/api/user/login", data);

    // ⬇️ Expecting { message, token, user } from your loginService
    const { token, user, message } = res?.data?.data || {};

     if (!token) {
      throw new Error("Login succeeded but no token returned.");
    }

    // Persist + set default header
    localStorage.setItem("ACCESS_TOKEN", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    dispatch({ type: LOGIN_USER_SUCCESS, payload: { user, token } });
    return { message, token, user };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: LOGIN_USER_FAIL, payload: msg });
    throw new Error(msg);
  }
};


// ---------- BULK HELPERS ----------
export const setBulkRows = (rows) => ({ type: BULK_SET_ROWS, payload: rows });
export const clearBulk = () => ({ type: BULK_CLEAR });

// rows: [{ name, email, category, domain }]
export const uploadBulk = ({ rows, batchSize = 25, concurrency = 3 }) => async (dispatch) => {
  try {
    dispatch({ type: BULK_UPLOAD_REQUEST });
    const { data } = await api.post("/api/users/bulk", { rows, batchSize, concurrency });
    // backend should respond: { success, total, ok, failed, results: [...] }
    dispatch({ type: BULK_UPLOAD_SUCCESS, payload: data });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Bulk upload failed";
    dispatch({ type: BULK_UPLOAD_FAIL, payload: msg });
    throw new Error(msg);
  }
};
