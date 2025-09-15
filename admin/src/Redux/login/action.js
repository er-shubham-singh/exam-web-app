import api from "../../config/api";
import {
  AUTH_LOGIN_REQUEST,
  AUTH_LOGIN_SUCCESS,
  AUTH_LOGIN_FAIL,
  AUTH_LOGOUT,
  AUTH_CLEAR_ERRORS,
} from "./actionType";

/**
 * Login action (redux-thunk)
 */
export const login = (email, password) => async (dispatch) => {
  try {
    dispatch({ type: AUTH_LOGIN_REQUEST });

    const res = await api.post("/api/admin/login", { email, password });
    const body = res.data || {};
    // support both { token, user } and { data: { token, user } }
    const payload = body.token ? body : (body.data ? body.data : {});
    const { token, user } = payload;

    if (!token || !user) {
      throw new Error("Invalid login response from server");
    }

    // persist token + user (save under both keys so interceptor works)
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));

    dispatch({ type: AUTH_LOGIN_SUCCESS, payload: { token, user } });
  } catch (err) {
    dispatch({
      type: AUTH_LOGIN_FAIL,
      payload: err.response?.data?.message || err.message || "Login failed",
    });
  }
};


export const logout = () => (dispatch) => {
  // clear both keys
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("authUser");
  dispatch({ type: AUTH_LOGOUT });
};

export const clearAuthErrors = () => (dispatch) => {
  dispatch({ type: AUTH_CLEAR_ERRORS });
};
