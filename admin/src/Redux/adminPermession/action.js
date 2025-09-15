import api from "../../config/api";
import {
  EMP_CREATE_REQUEST,
  EMP_CREATE_SUCCESS,
  EMP_CREATE_FAIL,
  EMP_RESEND_REQUEST,
  EMP_RESEND_SUCCESS,
  EMP_RESEND_FAIL,
  EMP_LIST_REQUEST,
  EMP_LIST_SUCCESS,
  EMP_LIST_FAIL,
  EMP_CLEAR_ERRORS
} from "./actionType";


// helper to get headers with token
const getAuthConfig = (getState) => {
  const token = getState().auth?.token;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers };
};

// create employee
// createEmployee action (redux-thunk)
export const createEmployee = ({ email, role, name, password = null }) => async (dispatch, getState) => {
  try {
    dispatch({ type: EMP_CREATE_REQUEST });

    const body = { email, role, name };
    if (password) body.password = password; // send admin-provided password

    const config = getAuthConfig(getState);
    const { data } = await api.post("/api/create-employee", body, config);

    dispatch({
      type: EMP_CREATE_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: EMP_CREATE_FAIL,
      payload:
        error.response?.data?.message ??
        error.message ??
        "Failed to create employee",
    });
  }
};


// resend temp password
export const resendTempPassword = (email) => async (dispatch, getState) => {
  try {
    dispatch({ type: EMP_RESEND_REQUEST });

    const config = getAuthConfig(getState);
    const { data } = await api.post("/admin/resend-temp-password", { email }, config);
    dispatch({
      type: EMP_RESEND_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: EMP_RESEND_FAIL,
      payload:
        error.response?.data?.message ??
        error.message ??
        "Failed to resend temporary password",
    });
  }
};

// list employees (optional role filter)
export const listEmployees = (role = "") => async (dispatch, getState) => {
  try {
    dispatch({ type: EMP_LIST_REQUEST });

    const config = getAuthConfig(getState);
    const query = role ? `?role=${encodeURIComponent(role)}` : "";
    const { data } = await api.get(`/admin/employees${query}`, config);

    // expected data: { data: users }
    dispatch({
      type: EMP_LIST_SUCCESS,
      payload: data.data ?? data,
    });
  } catch (error) {
    dispatch({
      type: EMP_LIST_FAIL,
      payload:
        error.response?.data?.message ??
        error.message ??
        "Failed to fetch employees",
    });
  }
};

// optional: clear errors
export const clearEmployeeErrors = () => (dispatch) => {
  dispatch({ type: EMP_CLEAR_ERRORS });
};
