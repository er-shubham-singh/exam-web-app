import React from 'react'

export function HeaderPanel({ user, timeLeft, formatTime, toggleMic, localAudioEnabled, setAlertLog, alertCountsRef }) {
return (
<header className="flex justify-between items-center mb-4">
<div>
<h2 className="text-xl font-bold">Exam Portal</h2>
<p>
{user?.name} | {user?.category} - {user?.domain}
</p>
<p>Roll: {user?.rollNumber}</p>
</div>
<div className="text-lg font-semibold">
Time Left: <span className="text-red-400">{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
</div>
<div className="flex flex-col items-end gap-2">
<video id="camera-feed" autoPlay muted playsInline className="w-32 h-24 rounded-md border" />
<div className="flex gap-2">
<button onClick={toggleMic} className="px-3 py-1 bg-slate-700 rounded">{localAudioEnabled ? "Mute Mic" : "Unmute Mic"}</button>
<button onClick={() => { setAlertLog([]); alertCountsRef.current = {}; localStorage.removeItem("exam_alert_counts"); }} className="px-3 py-1 bg-slate-700 rounded">Clear Alerts</button>
</div>
</div>
</header>
);
}