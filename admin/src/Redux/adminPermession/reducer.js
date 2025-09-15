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
  EMP_CLEAR_ERRORS,
} from "./actionType";

const initialState = {
  create: {
    loading: false,
    success: false,
    user: null,
    message: null,
    error: null,
  },
  resend: {
    loading: false,
    success: false,
    message: null,
    error: null,
  },
  list: {
    loading: false,
    employees: [],
    error: null,
  },
};

export const employeeReducer = (state = initialState, action) => {
  switch (action.type) {
    // CREATE EMPLOYEE
    case EMP_CREATE_REQUEST:
      return {
        ...state,
        create: { ...state.create, loading: true, success: false, error: null },
      };
    case EMP_CREATE_SUCCESS:
      return {
        ...state,
        create: {
          loading: false,
          success: true,
          user: action.payload.user ?? null,
          message: action.payload.message ?? null,
          error: null,
        },
      };
    case EMP_CREATE_FAIL:
      return {
        ...state,
        create: {
          ...state.create,
          loading: false,
          success: false,
          error: action.payload,
        },
      };

    // RESEND PASSWORD
    case EMP_RESEND_REQUEST:
      return {
        ...state,
        resend: { ...state.resend, loading: true, success: false, error: null },
      };
    case EMP_RESEND_SUCCESS:
      return {
        ...state,
        resend: {
          loading: false,
          success: true,
          message: action.payload.message ?? "Temporary password resent",
          error: null,
        },
      };
    case EMP_RESEND_FAIL:
      return {
        ...state,
        resend: {
          ...state.resend,
          loading: false,
          success: false,
          error: action.payload,
        },
      };

    // LIST EMPLOYEES
    case EMP_LIST_REQUEST:
      return {
        ...state,
        list: { ...state.list, loading: true, employees: [], error: null },
      };
    case EMP_LIST_SUCCESS:
      return {
        ...state,
        list: { loading: false, employees: action.payload, error: null },
      };
    case EMP_LIST_FAIL:
      return {
        ...state,
        list: { ...state.list, loading: false, error: action.payload },
      };

    // CLEAR ERRORS
    case EMP_CLEAR_ERRORS:
      return {
        ...state,
        create: { ...state.create, error: null },
        resend: { ...state.resend, error: null },
        list: { ...state.list, error: null },
      };

    default:
      return state;
  }
};
