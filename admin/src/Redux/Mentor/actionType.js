// Student list (API fetch to hydrate on refresh)
export const MENTOR_FETCH_STUDENTS_REQUEST = "MENTOR_FETCH_STUDENTS_REQUEST";
export const MENTOR_FETCH_STUDENTS_SUCCESS = "MENTOR_FETCH_STUDENTS_SUCCESS";
export const MENTOR_FETCH_STUDENTS_FAIL    = "MENTOR_FETCH_STUDENTS_FAIL";

// Realtime socket updates
export const MENTOR_STUDENT_STATUS = "MENTOR_STUDENT_STATUS";   // online/offline + details
export const MENTOR_ALERT_RECEIVED = "MENTOR_ALERT_RECEIVED";   // TAB_SWITCH, CAMERA_OFF, etc.
export const MENTOR_WEBRTC_OFFER   = "MENTOR_WEBRTC_OFFER";     // optional: keep last offer


