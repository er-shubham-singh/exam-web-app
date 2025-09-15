import {
  CREATE_DOMAIN_REQUEST,
  CREATE_DOMAIN_SUCCESS,
  CREATE_DOMAIN_FAIL,
  FETCH_DOMAINS_REQUEST,
  FETCH_DOMAINS_SUCCESS,
  FETCH_DOMAINS_FAIL,
  GET_DOMAIN_REQUEST,
  GET_DOMAIN_SUCCESS,
  GET_DOMAIN_FAIL,
  UPDATE_DOMAIN_REQUEST,
  UPDATE_DOMAIN_SUCCESS,
  UPDATE_DOMAIN_FAIL,
  DELETE_DOMAIN_REQUEST,
  DELETE_DOMAIN_SUCCESS,
  DELETE_DOMAIN_FAIL,
} from "./ActionType";

const initialState = {
  loading: false,
  error: null,
  message: "",
  domains: [],
  currentDomain: null,
};

export const domainReducer = (state = initialState, action) => {
  switch (action.type) {
    // CREATE
    case CREATE_DOMAIN_REQUEST:
      return { ...state, loading: true, error: null, message: "" };
    case CREATE_DOMAIN_SUCCESS:
      return {
        ...state,
        loading: false,
        message: "Domain created successfully",
        domains: [action.payload, ...state.domains],
      };
    case CREATE_DOMAIN_FAIL:
      return { ...state, loading: false, error: action.payload };

    // FETCH ALL
    case FETCH_DOMAINS_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_DOMAINS_SUCCESS:
      return {
        ...state,
        loading: false,
        domains: action.payload,
      };
    case FETCH_DOMAINS_FAIL:
      return { ...state, loading: false, error: action.payload };

    // GET BY ID
    case GET_DOMAIN_REQUEST:
      return { ...state, loading: true, error: null };
    case GET_DOMAIN_SUCCESS:
      return { ...state, loading: false, currentDomain: action.payload };
    case GET_DOMAIN_FAIL:
      return { ...state, loading: false, error: action.payload, currentDomain: null };

    // UPDATE
    case UPDATE_DOMAIN_REQUEST:
      return { ...state, loading: true, error: null };
    case UPDATE_DOMAIN_SUCCESS:
      return {
        ...state,
        loading: false,
        message: "Domain updated successfully",
        domains: state.domains.map((d) =>
          d._id === action.payload._id ? action.payload : d
        ),
        currentDomain:
          state.currentDomain && state.currentDomain._id === action.payload._id
            ? action.payload
            : state.currentDomain,
      };
    case UPDATE_DOMAIN_FAIL:
      return { ...state, loading: false, error: action.payload };

    // DELETE
    case DELETE_DOMAIN_REQUEST:
      return { ...state, loading: true, error: null };
    case DELETE_DOMAIN_SUCCESS:
      return {
        ...state,
        loading: false,
        message: "Domain deleted successfully",
        domains: state.domains.filter((d) => d._id !== action.payload),
        currentDomain:
          state.currentDomain && state.currentDomain._id === action.payload
            ? null
            : state.currentDomain,
      };
    case DELETE_DOMAIN_FAIL:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};
