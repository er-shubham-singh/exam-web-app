import api from "../../config/api";
import {
  LOGIN_USER_FAIL,
  LOGIN_USER_REQUEST,
  LOGIN_USER_SUCCESS,
  REGISTER_USER_FAIL,
  REGISTER_USER_REQUEST,
  REGISTER_USER_SUCCESS,
} from "./actionType";

// ---------------- REGISTER ----------------
export const registerUser = (data) => async (dispatch) => {
  try {
    dispatch({ type: REGISTER_USER_REQUEST });
    const res = await api.post("/api/users/register", data);
    dispatch({
      type: REGISTER_USER_SUCCESS,
      payload: res.data.data, // backend returns { data: user }
    });
    return res.data; // so component can use toast
  } catch (err) {
    const msg = err.response?.data?.message || "Failed to register user";
    dispatch({ type: REGISTER_USER_FAIL, payload: msg });
    throw new Error(msg); // allow toast.promise to catch
  }
};

// ---------------- LOGIN ----------------
export const loginUser = (data) => async (dispatch) => {
  try {
    dispatch({ type: LOGIN_USER_REQUEST });
    const res = await api.post("/api/user/login", data);

    dispatch({
      type: LOGIN_USER_SUCCESS,
      payload: res.data.data.user, // 👈 only send the user object
    });

    return res.data; // return full response if needed elsewhere
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    dispatch({ type: LOGIN_USER_FAIL, payload: msg });
    throw new Error(msg);
  }
};

