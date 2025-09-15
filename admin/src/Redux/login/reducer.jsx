import {
  AUTH_LOGIN_REQUEST,
  AUTH_LOGIN_SUCCESS,
  AUTH_LOGIN_FAIL,
  AUTH_LOGOUT,
} from "./actionType";

const initialState = {
  loading: false,
  token: localStorage.getItem("token") || null,
  user: localStorage.getItem("authUser") ? JSON.parse(localStorage.getItem("authUser")) : null,
  error: null,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case AUTH_LOGIN_REQUEST:
      return { ...state, loading: true, error: null };
    case AUTH_LOGIN_SUCCESS:
      return {
        ...state,
        loading: false,
        token: action.payload.token,
        user: action.payload.user,
        error: null,
      };
    case AUTH_LOGIN_FAIL:
      return { ...state, loading: false, error: action.payload };
    case AUTH_LOGOUT:
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      return { ...state, token: null, user: null, loading: false, error: null };
    default:
      return state;
  }
}
