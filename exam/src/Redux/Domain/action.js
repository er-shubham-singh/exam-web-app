// Redux/Domain/Action.js
import api from "../../config/api";
import { FETCH_DOMAIN_FAIL, FETCH_DOMAIN_REQUEST, FETCH_DOMAIN_SUCCESS } from "./actionType";

export const fetchDomains = (category = "") => async (dispatch) => {
  dispatch({ type: FETCH_DOMAIN_REQUEST });
  try {
    const res = await api.get(
      `/api/domains${category ? `?category=${category}` : ""}`
    );
    dispatch({ type: FETCH_DOMAIN_SUCCESS, payload: res.data.message });
    return res.data.message;
  } catch (err) {
    dispatch({
      type: FETCH_DOMAIN_FAIL,
      payload: err.response?.data?.message || err.message,  // ✅ use err.message instead
    });
    return null;
  }
};


