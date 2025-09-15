
/* =========================
   SOCKET EVENT ACTIONS
========================= */
export const STUDENT_JOIN = "STUDENT_JOIN";
export const STUDENT_STATUS_UPDATE = "STUDENT_STATUS_UPDATE";
export const ADMIN_ALERT = "ADMIN_ALERT";
export const ANSWER_UPDATE = "ANSWER_UPDATE";
export const EXAM_SUBMITTED = "EXAM_SUBMITTED";
export const FORCE_SUBMIT = "FORCE_SUBMIT";

/* Strict proctoring */
export const EYE_OFF_SCREEN = "EYE_OFF_SCREEN";
export const MULTIPLE_FACES = "MULTIPLE_FACES";
export const CAMERA_OFF = "CAMERA_OFF";

/* =========================
   STUDENT PAPER
========================= */
export const FETCH_STUDENT_PAPER_REQUEST = "FETCH_STUDENT_PAPER_REQUEST";
export const FETCH_STUDENT_PAPER_SUCCESS = "FETCH_STUDENT_PAPER_SUCCESS";
export const FETCH_STUDENT_PAPER_FAIL = "FETCH_STUDENT_PAPER_FAIL";

/* =========================
   EXAM LIFECYCLE
========================= */
export const START_EXAM_REQUEST = "START_EXAM_REQUEST";
export const START_EXAM_SUCCESS = "START_EXAM_SUCCESS";
export const START_EXAM_FAIL = "START_EXAM_FAIL";

export const SUBMIT_EXAM_REQUEST = "SUBMIT_EXAM_REQUEST";
export const SUBMIT_EXAM_SUCCESS = "SUBMIT_EXAM_SUCCESS";
export const SUBMIT_EXAM_FAIL = "SUBMIT_EXAM_FAIL";

/* =========================
   ANSWER UPDATES
========================= */
export const UPDATE_ANSWER = "UPDATE_ANSWER";

/* =========================
   FETCH SUBMISSIONS
========================= */
export const FETCH_SUBMISSIONS_REQUEST = "FETCH_SUBMISSIONS_REQUEST";
export const FETCH_SUBMISSIONS_SUCCESS = "FETCH_SUBMISSIONS_SUCCESS";
export const FETCH_SUBMISSIONS_FAIL = "FETCH_SUBMISSIONS_FAIL";

// for code
export const RUN_CODE_REQUEST = "RUN_CODE_REQUEST";
export const RUN_CODE_SUCCESS = "RUN_CODE_SUCCESS";
export const RUN_CODE_FAIL = "RUN_CODE_FAIL";

export const FETCH_CODING_ATTEMPTS_REQUEST = "FETCH_CODING_ATTEMPTS_REQUEST";
export const FETCH_CODING_ATTEMPTS_SUCCESS = "FETCH_CODING_ATTEMPTS_SUCCESS";
export const FETCH_CODING_ATTEMPTS_FAIL = "FETCH_CODING_ATTEMPTS_FAIL";