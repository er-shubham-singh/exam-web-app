import {
  CREATE_QUESTION_FAIL,
  CREATE_QUESTION_REQUEST,
  CREATE_QUESTION_SUCCESS,
  FETCH_QUESTION_FAIL,
  FETCH_QUESTION_REQUEST,
  FETCH_QUESTION_SUCCESS,
  UPDATE_QUESTION_REQUEST,
  UPDATE_QUESTION_SUCCESS,
  UPDATE_QUESTION_FAIL,
  DELETE_QUESTION_REQUEST,
  DELETE_QUESTION_SUCCESS,
  DELETE_QUESTION_FAIL,
  GET_QUESTION_REQUEST,
  GET_QUESTION_SUCCESS,
  GET_QUESTION_FAIL,
} from "./actionType";

import api from "../../config/api";

// ---- helpers ---------------------------------------------------------------
const getErrMsg = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message || error?.message || fallback;

// ---- ACTIONS ---------------------------------------------------------------

// CREATE — payload: created question
export const createQuestion = (formData) => async (dispatch) => {
  dispatch({ type: CREATE_QUESTION_REQUEST });
  try {
    const res = await api.post("/api/create-question", formData);
    const data = res.data?.message;
    dispatch({ type: CREATE_QUESTION_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const msg = getErrMsg(error, "Failed to create question");
    dispatch({ type: CREATE_QUESTION_FAIL, payload: msg });
    throw error;
  }
};

// FETCH ALL — payload: questions (array or {items,total,...} based on backend)
export const fetchQuestion = (params = {}) => async (dispatch) => {
  dispatch({ type: FETCH_QUESTION_REQUEST });
  try {
    // Build query string (example: ?category=Technical&domain=123)
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/getAllQuestion?${query}` : "/api/getAllQuestion";

    const res = await api.get(url);
    const data = res.data?.message;

    dispatch({ type: FETCH_QUESTION_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const msg = getErrMsg(error, "Failed to fetch questions");
    dispatch({ type: FETCH_QUESTION_FAIL, payload: msg });
    return null;
  }
};


// GET BY ID — payload: single question
export const getQuestionById = (id) => async (dispatch) => {
  dispatch({ type: GET_QUESTION_REQUEST });
  try {
    const res = await api.get(`/api/questions/${id}`);
    const data = res.data?.message;
    dispatch({ type: GET_QUESTION_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const msg = getErrMsg(error, "Failed to fetch question");
    dispatch({ type: GET_QUESTION_FAIL, payload: msg });
    return null;
  }
};

// UPDATE — payload: updated question
export const updateQuestion = (id, body) => async (dispatch) => {
  dispatch({ type: UPDATE_QUESTION_REQUEST });
  try {
    const res = await api.put(`/api/questions/${id}`, body);
    const data = res.data?.message;
    dispatch({ type: UPDATE_QUESTION_SUCCESS, payload: data });
    return data;
  } catch (error) {
    const msg = getErrMsg(error, "Failed to update question");
    dispatch({ type: UPDATE_QUESTION_FAIL, payload: msg });
    throw error;
  }
};

// DELETE — payload: id
export const deleteQuestion = (id) => async (dispatch) => {
  dispatch({ type: DELETE_QUESTION_REQUEST });
  try {
    await api.delete(`/api/questions/${id}`);
    dispatch({ type: DELETE_QUESTION_SUCCESS, payload: id });
    return id;
  } catch (error) {
    const msg = getErrMsg(error, "Failed to delete question");
    dispatch({ type: DELETE_QUESTION_FAIL, payload: msg });
    throw error;
  }
};
