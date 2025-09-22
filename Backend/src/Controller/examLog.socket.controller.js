
// examLog.socket.js

import StudentExam from "../Modal/stuedntExam.modal.js";
import ExamLog from "../Modal/examLog.modal.js";

let students = {}; // active students in memory

export default function examLogSocket(io, socket) {
  // ---------------- STUDENT SIDE ----------------
  socket.on("join_exam", async (data, cb) => {
    if (!data?.studentExamId) {
      console.error("❌ Missing studentExamId in join_exam", data);
      return cb?.({ message: "studentExamId required" });
    }

    students[socket.id] = { ...data, socketId: socket.id };
socket.join(`exam:${data.studentExamId}`);
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "JOIN_EXAM",
      details: {
        email: data.email,
        name: data.name,
        rollNumber: data.rollNumber,
      },
    });

    io.emit("student_status", { ...data, online: true });
    cb?.({ message: "Student joined exam" });
  });

  socket.on("tab_switch", async (data) => {
    if (!data?.studentExamId) return;

    const log = await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "TAB_SWITCH",
      details: {
        email: data.email,
        issue: data.issue || "Tab switch detected",
        timestamp: data.timestamp || new Date().toISOString(),
      },
    });

    io.emit("alert_admin", { ...data, type: "TAB_SWITCH" });
  });

  socket.on("camera_off", async (data) => {
    if (!data?.studentExamId) return;

    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "CAMERA_OFF",
      details: { email: data.email },
    });

    io.emit("alert_admin", { ...data, type: "CAMERA_OFF" });
  });

  socket.on("answer_update", async (data) => {
    if (!data?.studentExamId) return;

    await StudentExam.findByIdAndUpdate(data.studentExamId, {
      $push: { answers: { questionId: data.questionId, answer: data.answer } },
    });

    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "ANSWER_UPDATE",
      details: { questionId: data.questionId, answer: data.answer },
    });

    io.emit("answer_update_admin", data);
  });

  socket.on("submit_exam", async (data, cb) => {
    if (!data?.studentExamId) return cb?.({ message: "studentExamId required" });

    await StudentExam.findByIdAndUpdate(data.studentExamId, {
      status: "SUBMITTED",
      submittedAt: new Date(),
    });

    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "SUBMIT_EXAM",
      details: { email: data.email },
    });

    io.emit("exam_submitted", data);
    delete students[socket.id];
    cb?.({ message: "Exam submitted" });
  });

  socket.on("disconnect", async () => {
    const student = students[socket.id];
    if (student?.studentExamId) {
      await ExamLog.create({
        studentExam: student.studentExamId,
        eventType: "DISCONNECT",
        details: { email: student.email },
      });

      io.emit("student_status", { ...student, online: false });
      delete students[socket.id];
    }
  });
    // No face detected
  socket.on("no_face_detected", async (data) => {
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "NO_FACE_DETECTED",
      details: { email: data.email, issue: data.issue || "No face detected" },
    });
    io.emit("alert_admin", { ...data, type: "NO_FACE_DETECTED" });
  });

  // Mobile phone detected
  socket.on("mobile_phone_detected", async (data) => {
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "MOBILE_PHONE_DETECTED",
      details: { email: data.email, issue: data.issue || "Mobile phone detected" },
    });
    io.emit("alert_admin", { ...data, type: "MOBILE_PHONE_DETECTED" });
  });

  // Unauthorized person detected
  socket.on("unauthorized_person", async (data) => {
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "UNAUTHORIZED_PERSON",
      details: { email: data.email, issue: data.issue || "Unauthorized person detected" },
    });
    io.emit("alert_admin", { ...data, type: "UNAUTHORIZED_PERSON" });
  });

  // Suspicious noise detected
  socket.on("suspicious_noise_detected", async (data) => {
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "SUSPICIOUS_NOISE",
      details: { email: data.email, issue: data.issue || "Suspicious noise detected" },
    });
    io.emit("alert_admin", { ...data, type: "SUSPICIOUS_NOISE" });
  });

  // Screen sharing detected
  socket.on("screen_sharing_detected", async (data) => {
    await ExamLog.create({
      studentExam: data.studentExamId,
      eventType: "SCREEN_SHARING",
      details: { email: data.email, issue: data.issue || "Screen sharing detected" },
    });
    io.emit("alert_admin", { ...data, type: "SCREEN_SHARING" });
  });

  // ---------------- ADMIN SIDE ----------------
  socket.on("force_submit", async (data, cb) => {
    const student = Object.values(students).find(
      (s) => s.email === data.email
    );

    if (student?.studentExamId) {
      await StudentExam.findByIdAndUpdate(student.studentExamId, {
        status: "SUBMITTED",
        submittedAt: new Date(),
      });

      await ExamLog.create({
        studentExam: student.studentExamId,
        eventType: "FORCE_SUBMIT",
        details: { reason: "Admin forced submission" },
      });

      io.to(student.socketId).emit("force_submit", {
        message: "Exam forcibly submitted by admin",
      });

      return cb?.({
        message: `Force submitted exam for ${student.email}`,
      });
    }

    cb?.({ message: "Student not found" });
  });

  // ---------------- AUDIO + WEBRTC ----------------
  socket.on("student_audio_chunk", (data) => {
    if (!data?.studentExamId) return;

    io.emit("student_audio_chunk", {
      studentExamId: data.studentExamId,
      email: data.email,
      audio: data.audio, // base64 string
    });
  });

  socket.on("webrtc_offer", (data) => {
    console.log("📡 Offer received on server:", data);
    io.emit("webrtc_offer", data); // send to mentor
  });

  socket.on("webrtc_answer", (data) => {
    io.emit("webrtc_answer", data); // send back to student
  });

  socket.on("webrtc_candidate", (data) => {
    io.emit("webrtc_candidate", data); // exchange ICE candidates
  });

  // Mentor asks a student to re-send WebRTC offer (after mentor refresh, etc.)
socket.on("request_offer", ({ email, studentExamId }) => {
  // Prefer room targeting (robust even if socket id changes)
  if (studentExamId) {
    io.to(`exam:${studentExamId}`).emit("request_offer", { studentExamId });
    return;
  }

  // Fallback: find by email from our in-memory 'students' map
  const target = Object.values(students).find((s) => s.email === email);
  if (target?.socketId) {
    io.to(target.socketId).emit("request_offer", { studentExamId: target.studentExamId });
  }
});

    // ---------------- STRICT PROCTORING ----------------
  // Eye direction monitoring
socket.on("eye_off", async (data) => {
  await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "EYE_OFF_SCREEN",
    details: { email: data.email, issue: data.issue },
  });
  io.emit("alert_admin", { ...data, type: "EYE_OFF_SCREEN" });
});

  // Multiple faces detection
socket.on("multiple_faces", async (data) => {
  await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "MULTIPLE_FACES",
    details: { email: data.email, issue: data.issue },
  });
  io.emit("alert_admin", { ...data, type: "MULTIPLE_FACES" });
});
socket.on("hand_obstruction", async (data) => {
  await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "HAND_OBSTRUCTION",
    details: { email: data.email, issue: data.issue },
  });
  io.emit("alert_admin", { ...data, type: "HAND_OBSTRUCTION" });
});

}





