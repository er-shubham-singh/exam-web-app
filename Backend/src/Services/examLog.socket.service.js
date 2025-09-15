import StudentExam from "../Modal/stuedntExam.modal.js";
import ExamLog from "../Modal/examLog.modal.js";

let students = {}; // active students in memory

// ---------------- STUDENT SIDE ----------------
export const joinExamService = async (io, socket, data) => {
  if (!data?.studentExamId) {
    console.error("❌ Missing studentExamId in join_exam", data);
    return { message: "studentExamId required" };
  }

  students[socket.id] = { ...data, socketId: socket.id };

  await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "JOIN_EXAM",
    details: { 
      email: data.email, 
      name: data.name, 
      rollNumber: data.rollNumber 
    },
  });

  // ✅ Emit all student info, not just email/id
io.emit("student_status", { ...data, online: true });


  return { message: "Student joined exam" };
};


export const tabSwitchService = async (io, socket, data) => {
  if (!data?.studentExamId) return { message: "studentExamId required" };

  const log = await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "TAB_SWITCH",
    details: { 
      email: data.email, 
      issue: data.issue || "Tab switch detected",
      timestamp: data.timestamp || new Date().toISOString() // ✅ fallback
    },
  });

  io.emit("alert_admin", { ...data, type: "TAB_SWITCH" });
  return { message: "Tab switch logged", log };
};


export const cameraOffService = async (io, socket, data) => {
  if (!data?.studentExamId) return { message: "studentExamId required" };

  const log = await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "CAMERA_OFF",
    details: { email: data.email },
  });

  io.emit("alert_admin", { ...data, type: "CAMERA_OFF" });
  return { message: "Camera off logged", log };
};

export const answerUpdateService = async (io, socket, data) => {
  if (!data?.studentExamId) return { message: "studentExamId required" };

  await StudentExam.findByIdAndUpdate(data.studentExamId, {
    $push: { answers: { questionId: data.questionId, answer: data.answer } },
  });

  const log = await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "ANSWER_UPDATE",
    details: { questionId: data.questionId, answer: data.answer },
  });

  io.emit("answer_update_admin", data);
  return { message: "Answer updated", log };
};

export const submitExamService = async (io, socket, data) => {
  if (!data?.studentExamId) return { message: "studentExamId required" };

  await StudentExam.findByIdAndUpdate(data.studentExamId, {
    status: "SUBMITTED",
    submittedAt: new Date(),
  });

  const log = await ExamLog.create({
    studentExam: data.studentExamId,
    eventType: "SUBMIT_EXAM",
    details: { email: data.email },
  });

  io.emit("exam_submitted", data);
  delete students[socket.id];
  return { message: "Exam submitted", log };
};

export const disconnectService = async (io, socket) => {
  const student = students[socket.id];
  if (student?.studentExamId) {
    const log = await ExamLog.create({
      studentExam: student.studentExamId,
      eventType: "DISCONNECT",
      details: { email: student.email },
    });

    io.emit("student_status", { ...student, online: false });
    delete students[socket.id];
    return { message: "Student disconnected", log };
  }
  return { message: "Unknown disconnect" };
};

// ---------------- ADMIN SIDE ----------------
export const forceSubmitService = async (io, data) => {
  const student = Object.values(students).find((s) => s.email === data.email);
  if (student?.studentExamId) {
    await StudentExam.findByIdAndUpdate(student.studentExamId, {
      status: "SUBMITTED",
      submittedAt: new Date(),
    });

    const log = await ExamLog.create({
      studentExam: student.studentExamId,
      eventType: "FORCE_SUBMIT",
      details: { reason: "Admin forced submission" },
    });

    io.to(student.socketId).emit("force_submit", { message: "Exam forcibly submitted by admin" });
    return { message: `Force submitted exam for ${student.email}`, log };
  }
  return { message: "Student not found" };
};
