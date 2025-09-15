// actions/mentor.actions.js
import api from "../../config/api";
import {
  MENTOR_FETCH_STUDENTS_REQUEST,
  MENTOR_FETCH_STUDENTS_SUCCESS,
  MENTOR_FETCH_STUDENTS_FAIL,
  MENTOR_STUDENT_STATUS,
  MENTOR_ALERT_RECEIVED,
  MENTOR_WEBRTC_OFFER,
} from "./actionType";

// ✅ Updated API route
export const fetchMentorStudents = () => async (dispatch) => {
  dispatch({ type: MENTOR_FETCH_STUDENTS_REQUEST });
  try {
    const res = await api.get("/api/admin/get-student-paper-submission-log");
    dispatch({ type: MENTOR_FETCH_STUDENTS_SUCCESS, payload: res.data.students });
  } catch (err) {
    dispatch({
      type: MENTOR_FETCH_STUDENTS_FAIL,
      payload: err.response?.data?.message || err.message,
    });
  }
};

// WebSocket → Redux handlers
export const handleStudentStatus = (payload) => ({ type: MENTOR_STUDENT_STATUS, payload });
export const handleMentorAlert   = (payload) => ({ type: MENTOR_ALERT_RECEIVED, payload });
export const handleWebRTCOffer   = (payload) => ({ type: MENTOR_WEBRTC_OFFER, payload });
