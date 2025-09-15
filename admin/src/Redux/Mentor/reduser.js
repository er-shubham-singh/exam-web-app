import {
  MENTOR_FETCH_STUDENTS_REQUEST,
  MENTOR_FETCH_STUDENTS_SUCCESS,
  MENTOR_FETCH_STUDENTS_FAIL,
  MENTOR_STUDENT_STATUS,
  MENTOR_ALERT_RECEIVED,
  MENTOR_WEBRTC_OFFER,
} from "./actionType";

const initialState = {
  loading: false,
  error: null,
  students: [],    // [{ studentExamId, name, email, rollNumber, online, alerts: [] }]
  webrtcOffers: {},// { [studentExamId]: offer }
};

export const mentorReducer = (state = initialState, action) => {
  switch (action.type) {
    // API load
    case MENTOR_FETCH_STUDENTS_REQUEST:
      return { ...state, loading: true, error: null };
    case MENTOR_FETCH_STUDENTS_SUCCESS:
      return { ...state, loading: false, students: action.payload || [] };
    case MENTOR_FETCH_STUDENTS_FAIL:
      return { ...state, loading: false, error: action.payload };

    // Socket: online/offline & identity/status updates
    case MENTOR_STUDENT_STATUS: {
      const exists = state.students.some(s => s.email === action.payload.email);
      return {
        ...state,
        students: exists
          ? state.students.map(s =>
              s.email === action.payload.email ? { ...s, ...action.payload } : s
            )
          : [...state.students, { ...action.payload, alerts: [] }],
      };
    }

    // Socket: alerts stream
    case MENTOR_ALERT_RECEIVED:
      return {
        ...state,
        students: state.students.map(s =>
          s.email === action.payload.email
            ? { ...s, alerts: [...(s.alerts || []), action.payload] }
            : s
        ),
      };

    // Optional: store last offer per student
    case MENTOR_WEBRTC_OFFER:
      return {
        ...state,
        webrtcOffers: {
          ...state.webrtcOffers,
          [action.payload.studentExamId]: action.payload.offer,
        },
      };

    default:
      return state;
  }
};
