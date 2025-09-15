// Redux/Paper/Reducer.js
import {
  CREATE_PAPER_REQUEST,
  CREATE_PAPER_SUCCESS,
  CREATE_PAPER_FAIL,
  UPDATE_PAPER_REQUEST,
  UPDATE_PAPER_SUCCESS,
  UPDATE_PAPER_FAIL,
  DELETE_PAPER_REQUEST,
  DELETE_PAPER_SUCCESS,
  DELETE_PAPER_FAIL,
  FETCH_PAPER_REQUEST,
  FETCH_PAPER_SUCCESS,
  FETCH_PAPER_FAIL,
} from "./actionType";

const initialState = {
  loading: false,
  error: null,
  message: "",
  papers: [],   // list of papers
};

export const paperReducer = (state = initialState, action) => {
  switch (action.type) {
    // CREATE
    case CREATE_PAPER_REQUEST:
      return { ...state, loading: true, error: null, message: "" };
    case CREATE_PAPER_SUCCESS:
      return { ...state, loading: false, message: action.payload };
    case CREATE_PAPER_FAIL:
      return { ...state, loading: false, error: action.payload };

    // UPDATE
    case UPDATE_PAPER_REQUEST:
      return { ...state, loading: true, error: null, message: "" };
    case UPDATE_PAPER_SUCCESS:
      return { ...state, loading: false, message: action.payload };
    case UPDATE_PAPER_FAIL:
      return { ...state, loading: false, error: action.payload };

    // DELETE
    case DELETE_PAPER_REQUEST:
      return { ...state, loading: true, error: null, message: "" };
    case DELETE_PAPER_SUCCESS:
      return {
        ...state,
        loading: false,
        message: action.payload.message,
        papers: state.papers.filter((p) => p._id !== action.payload.id),
      };
    case DELETE_PAPER_FAIL:
      return { ...state, loading: false, error: action.payload };

    // FETCH ALL
    case FETCH_PAPER_REQUEST:
      return { ...state, loading: true, error: null, message: "" };
    case FETCH_PAPER_SUCCESS:
      return { ...state, loading: false, papers: action.payload.items || [] };
    case FETCH_PAPER_FAIL:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};
