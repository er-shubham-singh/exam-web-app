// Redux/PaperSet/actions.js
import api from "../../config/api";
import {
  CREATE_SET_REQUEST,
  CREATE_SET_SUCCESS,
  CREATE_SET_FAIL,
  FETCH_SETS_REQUEST,
  FETCH_SETS_SUCCESS,
  FETCH_SETS_FAIL,
  GET_SET_REQUEST,
  GET_SET_SUCCESS,
  GET_SET_FAIL,
  UPDATE_SET_REQUEST,
  UPDATE_SET_SUCCESS,
  UPDATE_SET_FAIL,
  DELETE_SET_REQUEST,
  DELETE_SET_SUCCESS,
  DELETE_SET_FAIL,
  ADD_QUESTIONS_TO_SET_REQUEST,
  ADD_QUESTIONS_TO_SET_SUCCESS,
  ADD_QUESTIONS_TO_SET_FAIL,
  REMOVE_QUESTION_FROM_SET_REQUEST,
  REMOVE_QUESTION_FROM_SET_SUCCESS,
  REMOVE_QUESTION_FROM_SET_FAIL,
} from "./actionType";

const getErr = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || err?.message || fallback;

export const createSet = (templateId, payload) => async (dispatch) => {
  dispatch({ type: CREATE_SET_REQUEST });
  try {
    console.log("Base URL in Axios:", api.defaults.baseURL);

    console.log(`[createSet] templateId=${templateId} payload=`, payload);
    const res = await api.post(`/api/templates/${templateId}/sets`, payload);
    console.log("[createSet] response:", res.data);
    const set = res.data?.message || res.data;
    dispatch({ type: CREATE_SET_SUCCESS, payload: set });
    return set;
  } catch (err) {
    const msg = getErr(err, "Failed to create set");
    dispatch({ type: CREATE_SET_FAIL, payload: msg });
    console.error("[createSet] error:", err?.response?.data || err.message || err);
    throw err;
  }
};


// FETCH sets for a template (admin)
// Redux/paperSet/action.js
export const fetchSetsForTemplate = (templateId) => async (dispatch) => {
  dispatch({ type: FETCH_SETS_REQUEST });
  try {
    const res = await api.get(`/api/templates/${templateId}/sets`);
    dispatch({ type: FETCH_SETS_SUCCESS, payload: res.data });
    // return sets so caller can use result
    return res.data?.sets || res.data || [];
  } catch (err) {
    dispatch({ type: FETCH_SETS_FAIL, payload: err.response?.data?.message || err.message || "Failed to fetch sets" });
    throw err;
  }
};


// GET set by id (populated) - used by exam runner
export const getSetById = (setId) => async (dispatch) => {
  dispatch({ type: GET_SET_REQUEST });
  try {
    const res = await api.get(`/api/sets/${setId}`);
    const set = res.data?.message || res.data;
    dispatch({ type: GET_SET_SUCCESS, payload: set });
    return set;
  } catch (err) {
    const msg = getErr(err, "Failed to fetch set");
    dispatch({ type: GET_SET_FAIL, payload: msg });
    return null;
  }
};

// UPDATE set metadata (e.g., timeLimit, isActive, setLabel)
export const updateSet = (setId, data) => async (dispatch) => {
  dispatch({ type: UPDATE_SET_REQUEST });
  try {
    const res = await api.put(`/api/sets/${setId}`, data);
    const updated = res.data?.message || res.data;
    dispatch({ type: UPDATE_SET_SUCCESS, payload: updated });
    return updated;
  } catch (err) {
    const msg = getErr(err, "Failed to update set");
    dispatch({ type: UPDATE_SET_FAIL, payload: msg });
    throw err;
  }
};

// DELETE set
export const deleteSet = (setId) => async (dispatch) => {
  dispatch({ type: DELETE_SET_REQUEST });
  try {
    await api.delete(`/api/sets/${setId}`);
    dispatch({ type: DELETE_SET_SUCCESS, payload: setId });
    return setId;
  } catch (err) {
    const msg = getErr(err, "Failed to delete set");
    dispatch({ type: DELETE_SET_FAIL, payload: msg });
    throw err;
  }
};


// Redux/paperSet/action.js
export const addQuestionsToSet = (setId, questionIds) => async (dispatch) => {
  dispatch({ type: ADD_QUESTIONS_TO_SET_REQUEST });
  try {
    const res = await api.patch(`/api/sets/${setId}/questions`, { questionIds });

    // Accept server shapes: { set }, { updated }, { message }, or { success: true, ... }
    const updatedSet =
      res.data?.set ||
      res.data?.updated ||
      res.data?.updatedSet ||
      (res.data?.message && typeof res.data?.message === "object" ? res.data.message : null) ||
      res.data;

    dispatch({ type: ADD_QUESTIONS_TO_SET_SUCCESS, payload: updatedSet });
    return updatedSet;
  } catch (err) {
    dispatch({ type: ADD_QUESTIONS_TO_SET_FAIL, payload: getErr(err) });
    throw err;
  }
};



// REMOVE a question from set (route: DELETE /sets/:id/questions/:questionId)
export const removeQuestionFromSet = (setId, questionId) => async (dispatch) => {
  dispatch({ type: REMOVE_QUESTION_FROM_SET_REQUEST });
  try {
    const res = await api.delete(`/api/sets/${setId}/questions/${questionId}`);
    const updated = res.data?.message || res.data;
    dispatch({ type: REMOVE_QUESTION_FROM_SET_SUCCESS, payload: { setId, questionId } });
    return updated;
  } catch (err) {
    const msg = getErr(err, "Failed to remove question from set");
    dispatch({ type: REMOVE_QUESTION_FROM_SET_FAIL, payload: msg });
    throw err;
  }
};
