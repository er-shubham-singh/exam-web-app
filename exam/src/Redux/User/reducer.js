import {
  LOGIN_USER_FAIL,
  LOGIN_USER_REQUEST,
  LOGIN_USER_SUCCESS,
  REGISTER_USER_FAIL,
  REGISTER_USER_REQUEST,
  REGISTER_USER_SUCCESS,
  // LOGOUT_USER,
} from "./actionType";

const initialState = {
  user: null,
  registerLoading: false,
  loginLoading: false,
  error: null,
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

    // -------- LOGOUT --------
    // case LOGOUT_USER:
    //   return { ...initialState };

    default:
      return state;
  }
};
