import { FETCH_DOMAIN_FAIL, FETCH_DOMAIN_REQUEST, FETCH_DOMAIN_SUCCESS } from "./actionType";


const initialState = {
  loading: false,
  error: null,
  message: "",
  domains: [],
  currentDomain: null,
};

export const domainReducer = (state = initialState, action) => {
  switch (action.type) {
    // FETCH ALL
    case FETCH_DOMAIN_REQUEST:
      return { ...state, loading: true, error: null };
    case FETCH_DOMAIN_SUCCESS:
      return {
        ...state,
        loading: false,
        domains: action.payload,
      };
    case FETCH_DOMAIN_FAIL:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};
