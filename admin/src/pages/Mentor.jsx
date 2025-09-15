// src/Pages/Mentor.jsx
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { initMentorSocket, cleanupMentorSocket } from "../Redux/Mentor/socket";
import { fetchMentorStudents } from "../Redux/Mentor/action";
import socket from "../config/socket.connect";
import StudentDetailModal from "../Modal/StudentDetailModal";

const alertColors = {
  TAB_SWITCH: "bg-yellow-600",
  CAMERA_OFF: "bg-orange-600",
  EYE_OFF_SCREEN: "bg-blue-600",
  MULTIPLE_FACES: "bg-red-700",
  HAND_OBSTRUCTION: "bg-purple-600",
};

const Mentor = () => {
  const [speaking, setSpeaking] = useState({}); // { studentExamId: true/false }
  const dispatch = useDispatch();
  const peersRef = useRef({});
 const [selected, setSelected] = useState(null); // student object or null
 const [modalOpen, setModalOpen] = useState(false);
 const requestedRef = useRef(new Set());
  // ✅ read slice safely (won’t crash even if reducer key is missing)
const { students = [], loading = false, error = null } =
  useSelector((s) => s.mentor) || {};

useEffect(() => {
  dispatch(fetchMentorStudents());         // hydrate on refresh
  initMentorSocket(dispatch, peersRef);    // realtime updates → Redux
  return () => cleanupMentorSocket();
}, [dispatch]);

useEffect(() => {
  students.forEach((s) => {
    const id = s.studentExamId;
   if (s.online && id && !peersRef.current[id] && !requestedRef.current.has(id)) {
     requestedRef.current.add(id);
     socket.emit("request_offer", { email: s.email, studentExamId: id });
     setTimeout(() => requestedRef.current.delete(id), 3000);
   }
  });
}, [students]);

useEffect(() => {
  const unlock = () => {
    document.querySelectorAll('audio[id^="audio-"]').forEach(a => {
      try { a.muted = false; a.play?.(); } catch {}
    });
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  return () => window.removeEventListener("pointerdown", unlock);
}, []);

useEffect(() => {
  const handleSpeaking = (e) => {
    const { studentExamId, speaking: isSpeaking } = e.detail;
    setSpeaking((prev) => ({
      ...prev,
      [studentExamId]: isSpeaking,
    }));
  };

  window.addEventListener("student-speaking", handleSpeaking);
  return () => window.removeEventListener("student-speaking", handleSpeaking);
}, []);


// When modal opens, try to mirror the existing video stream into modal video
useEffect(() => {
  if (!modalOpen || !selected) return;
  const id = selected?.studentExamId;
  const cardVideo = document.getElementById(`video-${id}`);
  const modalVideo = document.getElementById(`modal-video-${id}`);
  if (cardVideo && modalVideo && cardVideo.srcObject) {
    modalVideo.srcObject = cardVideo.srcObject;
    modalVideo.play?.();
  }
}, [modalOpen, selected]);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">Mentor Dashboard</h1>

      {loading && <p>Loading students…</p>}
      {error && <p className="text-red-400">{String(error)}</p>}
{!loading && students.length === 0 && (
<p className="text-gray-400">No students available in the last 30 days.</p>
)}


      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((s, i) => {
          const alerts = Array.isArray(s.alerts) ? s.alerts : [];
          const totalAlerts = Number.isFinite(s.alertsTotal)
           ? s.alertsTotal
             : alerts.length; // fallback if API didn’t send total
          // group alerts by (type + issue)
          const groupedAlerts = alerts.reduce((acc, a) => {
            const type = a?.type || "UNKNOWN";
            const issue = a?.issue || "-";
            const key = `${type}-${issue}`;
            if (!acc[key]) {
              acc[key] = {
                type,
                issue,
                timestamp: a?.timestamp,
                count: 1,
              };
            } else {
              acc[key].count += 1;
              acc[key].timestamp = a?.timestamp || acc[key].timestamp;
            }
            return acc;
          }, {});

          const lastAlert = alerts.length ? alerts[alerts.length - 1] : null;

          // ⚠️ keep this ID based on studentExamId because your socket attaches streams using it
          const videoId = s.studentExamId || `fallback-${i}`;
          const cardKey = s.studentExamId || s.email || i;

          return (
            <div
              key={cardKey}
              onClick={() => { setSelected(s); setModalOpen(true); }}
              className={`rounded-xl shadow-lg overflow-hidden flex flex-col border 
                ${
                  alerts.some((a) =>
                    ["MULTIPLE_FACES", "CAMERA_OFF", "HAND_OBSTRUCTION"].includes(a?.type)
                  )
                    ? "border-red-600"
                    : "border-gray-700"
                } bg-gray-800`}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                <div>
                  <h3 className="font-semibold text-lg truncate">
                    {s.name || "Unknown"} ({s.rollNumber || "—"})
                  </h3>
                  <p className="text-sm text-gray-400">{s.email}</p>
                  <p className="text-xs text-red-400 mt-1">
                    Last Alert: {lastAlert?.type || "None"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    s.online ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {s.online ? "Online" : "Offline"}
                </span>
              </div>

              {/* Live Camera */}
{/* Live Camera */}
<div className="relative w-full h-48 bg-black">
  <video
    id={`video-${videoId}`}
    autoPlay
    playsInline
    muted
    className="w-full h-full object-cover"
  />
  <div
    id={`overlay-${videoId}`}
    className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm"
  >
    Waiting for video…
  </div>
  {!s.online && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-gray-400 text-sm">
      Camera Offline
    </div>
  )}

  {/* 🔴 Speaking indicator */}
  {speaking[s.studentExamId] && (
    <div className="absolute bottom-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs animate-pulse">
      Speaking…
    </div>
  )}
</div>


{/* 🔊 Speaking indicator */}
<div className="flex justify-center items-center bg-gray-700 p-2">
  <span
    className={`px-3 py-1 rounded text-sm font-medium ${
      speaking[videoId] ? "bg-red-600 animate-pulse" : "bg-green-600"
    }`}
  >
    {speaking[videoId] ? "Speaking…" : "Normal"}
  </span>
</div>

              {alerts.length > 0 && totalAlerts > alerts.length && (
  <p className="text-xs text-gray-400 mb-2">
    Showing last {alerts.length} of {totalAlerts}
  </p>
)}

              {/* Alerts */}
              <div className="p-4 flex-1 overflow-y-auto max-h-32 space-y-2">
                <h4 className="text-md font-semibold mb-2">
                  Alerts{" "}
                  <span className="ml-2 text-xs bg-red-500 px-2 py-0.5 rounded-full">
                    {totalAlerts}
                  </span>
                </h4>

                {Object.values(groupedAlerts).length > 0 ? (
                  Object.values(groupedAlerts)
                    .reverse()
                    .map((a, idx) => (
                      <div
                        key={`${a.type}-${a.issue}-${idx}`}
                        className={`${
                          alertColors[a.type] || "bg-gray-600"
                        } text-sm px-3 py-2 rounded flex justify-between`}
                      >
                        <span className="font-bold">
                          {a.type} {a.count > 1 && `(x${a.count})`}
                        </span>
                        <span className="text-gray-200">{a.issue}</span>
                        <span className="text-gray-300">
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "--"}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-sm">No alerts</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
          <StudentDetailModal
       open={modalOpen}
       onClose={() => setModalOpen(false)}
       student={selected}
     />
    </main>
  );
};

export default Mentor;
