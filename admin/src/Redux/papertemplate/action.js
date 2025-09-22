// Redux/PaperTemplate/actions.js
import api from "../../config/api";
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

const getErr = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || err?.message || fallback;

// CREATE TEMPLATE
export const createTemplate = (payload) => async (dispatch) => {
  dispatch({ type: CREATE_TEMPLATE_REQUEST });
  try {
    // backend route: POST /api/templates
    const res = await api.post("/api/templates", payload);
    const tpl = res.data?.tpl || res.data?.message || res.data;
    dispatch({ type: CREATE_TEMPLATE_SUCCESS, payload: tpl });
    return tpl;
  } catch (err) {
    const msg = getErr(err, "Failed to create template");
    dispatch({ type: CREATE_TEMPLATE_FAIL, payload: msg });
    throw err;
  }
};

// FETCH TEMPLATES (list)
export const fetchTemplates = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_TEMPLATES_REQUEST });
  try {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `/api/papers?${qs}` : "/api/papers"; // keep compatibility with existing backend /papers
    const res = await api.get(url);
    const data = res.data || res.data?.items || res.data;
    dispatch({ type: FETCH_TEMPLATES_SUCCESS, payload: data });
    return data;
  } catch (err) {
    const msg = getErr(err, "Failed to fetch templates");
    dispatch({ type: FETCH_TEMPLATES_FAIL, payload: msg });
    return null;
  }
};

// GET TEMPLATE BY ID
export const getTemplateById = (id) => async (dispatch) => {
  dispatch({ type: GET_TEMPLATE_REQUEST });
  try {
    const res = await api.get(`/api/papers/${id}`);
    const tpl = res.data || res.data?.data || res.data?.message;
    dispatch({ type: GET_TEMPLATE_SUCCESS, payload: tpl });
    return tpl;
  } catch (err) {
    const msg = getErr(err, "Failed to fetch template");
    dispatch({ type: GET_TEMPLATE_FAIL, payload: msg });
    return null;
  }
};

// UPDATE TEMPLATE
export const updateTemplate = (id, data) => async (dispatch) => {
  dispatch({ type: UPDATE_TEMPLATE_REQUEST });
  try {
    const res = await api.put(`/api/papers/${id}`, data);
    const payload = res.data?.updated || res.data?.message || res.data;
    dispatch({ type: UPDATE_TEMPLATE_SUCCESS, payload });
    return payload;
  } catch (err) {
    const msg = getErr(err, "Failed to update template");
    dispatch({ type: UPDATE_TEMPLATE_FAIL, payload: msg });
    throw err;
  }
};

// DELETE TEMPLATE
export const deleteTemplate = (id) => async (dispatch) => {
  dispatch({ type: DELETE_TEMPLATE_REQUEST });
  try {
    const res = await api.delete(`/api/papers/${id}`);
    dispatch({ type: DELETE_TEMPLATE_SUCCESS, payload: id });
    return id;
  } catch (err) {
    const msg = getErr(err, "Failed to delete template");
    dispatch({ type: DELETE_TEMPLATE_FAIL, payload: msg });
    throw err;
  }
};
