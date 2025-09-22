// Redux/PaperTemplate/reducer.js
import {
  CREATE_TEMPLATE_REQUEST,
  CREATE_TEMPLATE_SUCCESS,
  CREATE_TEMPLATE_FAIL,
  FETCH_TEMPLATES_REQUEST,
  FETCH_TEMPLATES_SUCCESS,
  FETCH_TEMPLATES_FAIL,
  GET_TEMPLATE_REQUEST,
  GET_TEMPLATE_SUCCESS,
  GET_TEMPLATE_FAIL,
  UPDATE_TEMPLATE_REQUEST,
  UPDATE_TEMPLATE_SUCCESS,
  UPDATE_TEMPLATE_FAIL,
  DELETE_TEMPLATE_REQUEST,
  DELETE_TEMPLATE_SUCCESS,
  DELETE_TEMPLATE_FAIL,
} from "./actionType";

const initialState = {
  loading: false,
  error: null,
  message: "",
  templates: [],       // list of templates (papers)
  currentTemplate: null,
  total: undefined,
  page: 1,
  pages: 1,
};

const extractList = (payload) => (Array.isArray(payload) ? payload : payload?.items || []);

export const paperTemplateReducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_TEMPLATE_REQUEST:
    case FETCH_TEMPLATES_REQUEST:
    case GET_TEMPLATE_REQUEST:
    case UPDATE_TEMPLATE_REQUEST:
    case DELETE_TEMPLATE_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case CREATE_TEMPLATE_SUCCESS: {
      const created = action.payload;
      return {
        ...state,
        loading: false,
        message: "Template created successfully",
        templates: [created, ...state.templates],
        currentTemplate: created,
      };
    }
    case FETCH_TEMPLATES_SUCCESS: {
      const list = extractList(action.payload);
      return {
        ...state,
        loading: false,
        templates: list,
        total: action.payload?.total,
        page: action.payload?.page || 1,
        pages: action.payload?.pages || 1,
      };
    }
    case GET_TEMPLATE_SUCCESS:
      return { ...state, loading: false, currentTemplate: action.payload };

    case UPDATE_TEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        message: "Template updated successfully",
        templates: state.templates.map((t) => (t._id === action.payload._id ? action.payload : t)),
        currentTemplate:
          state.currentTemplate && state.currentTemplate._id === action.payload._id
            ? action.payload
            : state.currentTemplate,
      };

    case DELETE_TEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        message: "Template deleted successfully",
        templates: state.templates.filter((t) => t._id !== action.payload),
        currentTemplate: state.currentTemplate && state.currentTemplate._id === action.payload ? null : state.currentTemplate,
      };

    case CREATE_TEMPLATE_FAIL:
    case FETCH_TEMPLATES_FAIL:
    case GET_TEMPLATE_FAIL:
    case UPDATE_TEMPLATE_FAIL:
    case DELETE_TEMPLATE_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    default:
      return state;
  }
};
