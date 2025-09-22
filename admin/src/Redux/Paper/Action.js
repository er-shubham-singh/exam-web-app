// Redux/Paper/Action.js
import api from "../../config/api";
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

// CREATE
export const createPaper = (data) => async (dispatch) => {
  dispatch({ type: CREATE_PAPER_REQUEST });
  try {
    console.log("[createPaper] sending payload:", data);
    const res = await api.post("/api/papers", data);
    console.log("[createPaper] server response:", res.data);
    const tpl = res.data?.tpl || res.data?.message || res.data;
    dispatch({ type: CREATE_PAPER_SUCCESS, payload: tpl });
    return tpl;
  } catch (err) {
    console.error("[createPaper] error:", err?.response?.data || err.message || err);
    const msg = err.response?.data?.message || "Failed to create paper";
    dispatch({ type: CREATE_PAPER_FAIL, payload: msg });
    throw err;
  }
};



// UPDATE
export const updatePaper = (id, data) => async (dispatch) => {
  dispatch({ type: UPDATE_PAPER_REQUEST });
  try {
    const res = await api.put(`/api/papers/${id}`, data);
    const payload = res.data?.updated || res.data?.message || res.data;
    dispatch({ type: UPDATE_PAPER_SUCCESS, payload });
    return payload;
  } catch (err) {
    const msg = err.response?.data?.message || "Failed to update paper";
    dispatch({ type: UPDATE_PAPER_FAIL, payload: msg });
    throw err;
  }
};


// DELETE
export const deletePaper = (id) => async (dispatch) => {
  dispatch({ type: DELETE_PAPER_REQUEST });
  try {
    const res = await api.delete(`/api/papers/${id}`);
    dispatch({ type: DELETE_PAPER_SUCCESS, payload: { id, message: res.data.message } });
  } catch (err) {
    dispatch({
      type: DELETE_PAPER_FAIL,
      payload: err.response?.data?.message || "Failed to delete paper",
    });
  }
};

// FETCH ALL
export const fetchPapers = (filters = {}) => async (dispatch) => {
  dispatch({ type: FETCH_PAPER_REQUEST });
  try {
    const query = new URLSearchParams(filters).toString();  // build query string
    const res = await api.get(`/api/papers?${query}`);
    dispatch({ type: FETCH_PAPER_SUCCESS, payload: res.data }); // {items: [], total: ...}
  } catch (err) {
    dispatch({
      type: FETCH_PAPER_FAIL,
      payload: err.response?.data?.message || "Failed to fetch papers",
    });
  }
};

