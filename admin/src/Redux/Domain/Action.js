import api from "../../config/api";
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

// CREATE DOMAIN
export const createDomain = (formData) => async (dispatch) => {
  dispatch({ type: CREATE_DOMAIN_REQUEST });
  try {
    const res = await api.post("/api/domains", formData);
    dispatch({ type: CREATE_DOMAIN_SUCCESS, payload: res.data.message });
    return res.data.message;
  } catch (error) {
    dispatch({
      type: CREATE_DOMAIN_FAIL,
      payload: error?.response?.data?.message || "Failed to create domain",
    });
    throw error;
  }
};

// FETCH ALL DOMAINS (optional filter: category)
export const fetchDomains = (category = "") => async (dispatch) => {
  dispatch({ type: FETCH_DOMAINS_REQUEST });
  try {
    const res = await api.get(
      `/api/domains${category ? `?category=${category}` : ""}`
    );
    dispatch({ type: FETCH_DOMAINS_SUCCESS, payload: res.data.message });
    return res.data.message;
  } catch (error) {
    dispatch({
      type: FETCH_DOMAINS_FAIL,
      payload: error?.response?.data?.message || "Failed to fetch domains",
    });
    return null;
  }
};

// GET BY ID
export const getDomainById = (id) => async (dispatch) => {
  dispatch({ type: GET_DOMAIN_REQUEST });
  try {
    const res = await api.get(`/api/domains/${id}`);
    dispatch({ type: GET_DOMAIN_SUCCESS, payload: res.data.message });
    return res.data.message;
  } catch (error) {
    dispatch({
      type: GET_DOMAIN_FAIL,
      payload: error?.response?.data?.message || "Failed to fetch domain",
    });
    return null;
  }
};

// UPDATE DOMAIN
export const updateDomain = (id, body) => async (dispatch) => {
  dispatch({ type: UPDATE_DOMAIN_REQUEST });
  try {
    const res = await api.put(`/api/domains/${id}`, body);
    dispatch({ type: UPDATE_DOMAIN_SUCCESS, payload: res.data.message });
    return res.data.message;
  } catch (error) {
    dispatch({
      type: UPDATE_DOMAIN_FAIL,
      payload: error?.response?.data?.message || "Failed to update domain",
    });
    throw error;
  }
};

// DELETE DOMAIN
export const deleteDomain = (id) => async (dispatch) => {
  dispatch({ type: DELETE_DOMAIN_REQUEST });
  try {
    await api.delete(`/api/domains/${id}`);
    dispatch({ type: DELETE_DOMAIN_SUCCESS, payload: id });
    return id;
  } catch (error) {
    dispatch({
      type: DELETE_DOMAIN_FAIL,
      payload: error?.response?.data?.message || "Failed to delete domain",
    });
    throw error;
  }
};
