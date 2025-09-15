// // src/Redux/ExamLog/examLog.socket.js
// import socket from "../../config/socket.connect";
// import {
//   handleStudentJoin,
//   handleStudentStatusUpdate,
//   handleAdminAlert,
//   handleAnswerUpdate,
//   handleExamSubmitted,
//   handleForceSubmit,
// } from "./action";

// // ✅ Initialize socket listeners
// export const initExamLogSocket = (dispatch) => {
//   // student join
//   socket.on("student_status", (data) => {
//     dispatch(handleStudentStatusUpdate(data));
//   });

//   // student fully joins
//   socket.on("student_join", (data) => {
//     dispatch(handleStudentJoin(data));
//   });

//   // admin alerts
//   socket.on("alert_admin", (data) => {
//     dispatch(handleAdminAlert(data));
//   });

//   // live answer updates
//   socket.on("answer_update_admin", (data) => {
//     dispatch(handleAnswerUpdate(data));
//   });

//   // exam submitted
//   socket.on("exam_submitted", (data) => {
//     dispatch(handleExamSubmitted(data));
//   });

//   // admin forced submission
//   socket.on("force_submit", (data) => {
//     dispatch(handleForceSubmit(data));
//   });
// };

// // ✅ Cleanup on unmount
// export const cleanupExamLogSocket = () => {
//   socket.off("student_status");
//   socket.off("student_join");
//   socket.off("alert_admin");
//   socket.off("answer_update_admin");
//   socket.off("exam_submitted");
//   socket.off("force_submit");
// };



import socket from "../../config/socket.connect";
import {
  handleStudentStatusUpdate,
  handleAdminAlert,
  handleAnswerUpdate,
  handleExamSubmitted,
  handleForceSubmit,
} from "./action";

// ✅ Events we listen to (so cleanup is easy)
const EVENTS = [
  "student_status",
  "alert_admin",
  "answer_update_admin",
  "exam_submitted",
  "force_submit",
  "eye_off",
  "multiple_faces",
  "camera_off",
  "loud_voice",
  "voice_no_face",
  "tab_switch",
  "hand_obstruction",
];

export const initExamLogSocket = (dispatch) => {
  socket.on("student_status", (data) => {
    try {
      dispatch(handleStudentStatusUpdate(data));
    } catch (err) {
      console.error("❌ student_status error:", err);
    }
  });

  socket.on("alert_admin", (data) => {
    try {
      dispatch(handleAdminAlert(data));
    } catch (err) {
      console.error("❌ alert_admin error:", err);
    }
  });

  socket.on("answer_update_admin", (data) => {
    try {
      dispatch(handleAnswerUpdate(data));
    } catch (err) {
      console.error("❌ answer_update_admin error:", err);
    }
  });

  socket.on("exam_submitted", (data) => {
    try {
      dispatch(handleExamSubmitted(data));
    } catch (err) {
      console.error("❌ exam_submitted error:", err);
    }
  });

  socket.on("force_submit", (data) => {
    try {
      dispatch(handleForceSubmit(data));
    } catch (err) {
      console.error("❌ force_submit error:", err);
    }
  });

  // ✅ General handler for all proctoring events
  const proctoringEvents = [
    "eye_off",
    "multiple_faces",
    "camera_off",
    "loud_voice",
    "voice_no_face",
    "tab_switch",
    "hand_obstruction",
  ];

  proctoringEvents.forEach((event) => {
    socket.on(event, (data) => {
      try {
        dispatch(handleAdminAlert({ ...data, type: event.toUpperCase() }));
      } catch (err) {
        console.error(`❌ Error handling ${event}:`, err, data);
      }
    });
  });
};


// ✅ Cleanup on unmount
export const cleanupExamLogSocket = () => {
  EVENTS.forEach((event) => socket.off(event));
};
