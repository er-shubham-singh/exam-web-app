import socket from "../../config/socket.connect";
import {
  handleStudentStatus,
  handleMentorAlert,
  handleWebRTCOffer,
} from "./action";

const EVENTS = [
  "student_status",
  "alert_admin",
  "webrtc_offer",
  "webrtc_candidate",
  "webrtc_answer",
  "exam_submitted",
  "eye_off",
  "multiple_faces",
  "camera_off",
  "tab_switch",
  "loud_voice",
  "voice_no_face",
  "hand_obstruction"
];



export const initMentorSocket = (dispatch, peersRef, setStudents) => {
  // avoid duplicate listeners
  EVENTS.forEach((e) => socket.off(e));

  // ---------- student status ----------
  socket.on("student_status", (data) => {
    console.log("📡 Mentor got student_status:", data);

    // cleanup peer if student goes offline
if (data?.studentExamId && data.online === false) {
  const id = data.studentExamId;
  const p = peersRef?.current?.[id];
  if (p) {
    try { p.close(); } catch {}
    delete peersRef.current[id];
  }

  // 🔹 also clean audio pipeline
  const pipes = peersRef.current.__audioPipelines || {};
  const ap = pipes[id];
  if (ap) {
    if (ap.rafId) cancelAnimationFrame(ap.rafId);
    try { ap.src?.disconnect?.(); } catch {}
    try { ap.hp?.disconnect?.(); ap.lp?.disconnect?.(); ap.comp?.disconnect?.(); ap.gateGain?.disconnect?.(); } catch {}
    try { ap.ctx?.close?.(); } catch {}
    delete pipes[id];
  }
}


    if (dispatch) {
      dispatch(handleStudentStatus(data));
    } else if (typeof setStudents === "function") {
      setStudents((prev = []) => {
        const existing = prev.find((s) => s.email === data.email);
        if (existing) {
          return prev.map((s) => (s.email === data.email ? { ...s, ...data } : s));
        }
        return [...prev, { ...data, alerts: [] }];
      });
    }
  });

  // ---------- exam submitted -> cleanup ----------
socket.on("exam_submitted", ({ studentExamId }) => {
  const p = peersRef?.current?.[studentExamId];
  if (p) {
    try { p.close(); } catch {}
    delete peersRef.current[studentExamId];
  }

  const pipes = peersRef.current.__audioPipelines || {};
  const ap = pipes[studentExamId];
  if (ap) {
    if (ap.rafId) cancelAnimationFrame(ap.rafId);
    try { ap.src?.disconnect?.(); } catch {}
    try { ap.hp?.disconnect?.(); ap.lp?.disconnect?.(); ap.comp?.disconnect?.(); ap.gateGain?.disconnect?.(); } catch {}
    try { ap.ctx?.close?.(); } catch {}
    delete pipes[studentExamId];
  }
});


  // ---------- alerts ----------
  socket.on("alert_admin", (data) => {
    console.log(`⚠️ [${data.type}] Alert from ${data.email}: ${data.issue}`);

    const payload = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    if (dispatch) {
      dispatch(handleMentorAlert(payload));
    } else if (typeof setStudents === "function") {
      setStudents((prev = []) =>
        prev.map((s) =>
          s.email === data.email
            ? { ...s, alerts: [...(s.alerts || []), payload] }
            : s
        )
      );
    }
  });

// Proctoring-specific events that might not use alert_admin
// ✅ Add proctoring alerts
const proctoringEvents = [
  "eye_off",
  "multiple_faces",
  "camera_off",
  "tab_switch",
  "loud_voice",
  "voice_no_face",
  "hand_obstruction"
];

proctoringEvents.forEach((event) => {
  socket.on(event, (data) => {
    console.log(`⚠️ [${event}] received:`, data);
    const payload = {
      ...data,
      type: event.toUpperCase(),
      timestamp: data.timestamp || new Date().toISOString()
    };

    if (dispatch) {
      dispatch(handleMentorAlert(payload));
    } else if (typeof setStudents === "function") {
      setStudents((prev = []) =>
        prev.map((s) =>
          s.email === data.email
            ? { ...s, alerts: [...(s.alerts || []), payload] }
            : s
        )
      );
    }
  });
});


  // ---------- WebRTC offer (student -> mentor) ----------
  socket.on("webrtc_offer", async ({ offer, email, studentExamId }) => {
    console.log("📥 Offer received on mentor:", email, studentExamId);

    if (dispatch) {
      dispatch(handleWebRTCOffer({ offer, email, studentExamId }));
    }

 // 🔁 If we already had a peer for this student, close & replace it
// 🔁 close any previous peer for this student
const existing = peersRef.current[studentExamId];
if (existing) {
  try { existing.close(); } catch {}
  delete peersRef.current[studentExamId];
  const oldVid = document.getElementById(`video-${studentExamId}`);
  if (oldVid) oldVid.srcObject = null;
}

// Create peer & be ready to receive audio+video
const peer = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});
peersRef.current[studentExamId] = peer;

const kinds = peer.getTransceivers().map(t => t.receiver.track?.kind);
if (!kinds.includes("video")) peer.addTransceiver("video", { direction: "recvonly" });
if (!kinds.includes("audio")) peer.addTransceiver("audio", { direction: "recvonly" });

// ---- Audio pipeline cache ----
peersRef.current.__audioPipelines ||= {}; // { [id]: { ctx, nodes..., rafId } }

peer.ontrack = (event) => {
  const stream = event.streams[0];
  let tries = 0;

  // ----- VIDEO attach (unchanged) -----
  const attachVideo = () => {
    const vid =
      document.getElementById(`video-${studentExamId}`) ||
      document.getElementById(`video-${email}`);
    if (vid && !vid.srcObject) {
      vid.srcObject = stream;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.muted = true; // avoid echo from video tag
      vid.play?.().catch(() => {});
      const overlay = document.getElementById(`overlay-${studentExamId}`);
      if (overlay) overlay.style.display = "none";
    } else if (!vid && tries++ < 20) {
      setTimeout(attachVideo, 150);
    }
  };
  attachVideo();


// ----- AUDIO (processed chain → <audio>) -----
let audioEl = document.getElementById(`audio-${studentExamId}`);
if (!audioEl) {
  audioEl = document.createElement("audio");
  audioEl.id = `audio-${studentExamId}`;
  audioEl.autoplay = true;
  audioEl.style.display = "none";
  document.body.appendChild(audioEl);
}

const pipes = peersRef.current.__audioPipelines;
const prev = pipes[studentExamId];

if (!prev || prev.ctx.state === "closed") {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  // Source from remote stream
  let src = ctx.createMediaStreamSource(stream);

  // --- Filters tuned for speech clarity when music present ---
  // High-pass to remove rumble & low-frequency music energy (raise to ~120Hz)
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 120; hp.Q.value = 0.7;

  // Low-mid attenuation: gentle peaking filter to reduce music energy around 200-700Hz
  const midCut = ctx.createBiquadFilter(); midCut.type = "peaking";
  midCut.frequency.value = 350; midCut.Q.value = 1.0; midCut.gain.value = -4.0;

  // Presence boost for intelligibility (around 2.5-4kHz)
  const presence = ctx.createBiquadFilter(); presence.type = "peaking";
  presence.frequency.value = 3200; presence.Q.value = 1.0; presence.gain.value = 4.0;

  // Gentle low-pass to reduce very high energy from music (keep speech crisp)
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 6000; lp.Q.value = 0.7;

  // Notch filters for hum (optional)
  const notch50 = ctx.createBiquadFilter(); notch50.type = "notch"; notch50.frequency.value = 50; notch50.Q.value = 30;
  const notch60 = ctx.createBiquadFilter(); notch60.type = "notch"; notch60.frequency.value = 60; notch60.Q.value = 30;

  // Soft compressor to tame peaks while preserving speech dynamics
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -24;
  comp.knee.value = 12;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.005;
  comp.release.value = 0.18;

  // Small makeup gain after compression
  const makeup = ctx.createGain(); makeup.gain.value = 1.1;

  // Adaptive gate implemented via a gain node controlled by analyser RMS
  const gateGain = ctx.createGain(); gateGain.gain.value = 0.0; // start closed

  // Analyser to drive gate + speaking indicator (smaller fft for responsiveness)
  const analyser = ctx.createAnalyser(); analyser.fftSize = 512;

  // Destination stream -> audio element
  const dest = ctx.createMediaStreamDestination();

  // Wire graph:
  // src -> notch50 -> notch60 -> hp -> midCut -> presence -> lp -> comp -> makeup -> gateGain -> dest
  src.connect(notch50); notch50.connect(notch60); notch60.connect(hp);
  hp.connect(midCut); midCut.connect(presence); presence.connect(lp);
  lp.connect(comp); comp.connect(makeup); makeup.connect(gateGain); gateGain.connect(dest);

  // Also tap after comp for analyser
  comp.connect(analyser);

  // Speaking detection & gate control (EWMA smoothing + hysteresis tuned for music)
  const time = new Uint8Array(analyser.fftSize);
  // thresholds lowered slightly to avoid confusing sustained music with speech
  const THRESH_HIGH = 0.065; // stronger edge to enter speaking
  const THRESH_LOW  = 0.032; // lower floor to exit speaking
  const HOLD_ON_MS  = 180;   // quicker to close (reduce false-positive hold)
  const HOLD_OFF_MS = 380;   // require a bit longer before declaring speaking

  let isSpeaking = false, lastChange = performance.now();
  let ewma = 0; const ALPHA = 0.18; // smoothing factor tuned for music

  const rms = () => {
    analyser.getByteTimeDomainData(time);
    let sum = 0;
    for (let i = 0; i < time.length; i++) {
      const v = (time[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / time.length);
  };

  // Ramp gate gain smoothly to avoid pumping
  const openGate = () => { gateGain.gain.cancelScheduledValues(ctx.currentTime); gateGain.gain.setTargetAtTime(1.0, ctx.currentTime, 0.02); };
  const closeGate = () => { gateGain.gain.cancelScheduledValues(ctx.currentTime); gateGain.gain.setTargetAtTime(0.0, ctx.currentTime, 0.05); };

  const loop = () => {
    const level = rms();
    ewma = ALPHA * level + (1 - ALPHA) * ewma;
    const now = performance.now();

    // Gate control
    if (ewma < THRESH_LOW) {
      closeGate();
    } else {
      openGate();
    }

    // Speaking indicator with hysteresis + hold
    if (!isSpeaking && ewma > THRESH_HIGH && now - lastChange > HOLD_OFF_MS) {
      isSpeaking = true; lastChange = now;
      window.dispatchEvent(new CustomEvent("student-speaking", { detail: { studentExamId, speaking: true } }));
    } else if (isSpeaking && ewma < THRESH_LOW && now - lastChange > HOLD_ON_MS) {
      isSpeaking = false; lastChange = now;
      window.dispatchEvent(new CustomEvent("student-speaking", { detail: { studentExamId, speaking: false } }));
    }

    pipes[studentExamId].rafId = requestAnimationFrame(loop);
  };

  // Autoplay unlock once (Chrome)
  const resumeOnce = () => { ctx.resume?.(); document.removeEventListener("pointerdown", resumeOnce); };
  document.addEventListener("pointerdown", resumeOnce, { once: true });

  // Save pipeline & start
  pipes[studentExamId] = {
    ctx, src, notch50, notch60, hp, midCut, presence, lp, comp, makeup, gateGain, analyser, dest, rafId: null
  };

  audioEl.srcObject = dest.stream;
  audioEl.muted = false;
  audioEl.play?.().catch(() => {});
  loop();

} else {
  // Reuse pipeline on renegotiation: update media source if changed
  const p = pipes[studentExamId];
  try {
    if (p.src.mediaStream !== stream) {
      p.src.disconnect();
      p.src = p.ctx.createMediaStreamSource(stream);
      p.src.connect(p.notch50);
    }
  } catch (err) {
    console.warn("Audio pipeline reuse failed, recreating:", err);
  }
  if (audioEl.srcObject !== p.dest.stream) {
    audioEl.srcObject = p.dest.stream;
    audioEl.muted = false;
    audioEl.play?.().catch(() => {});
  }
}
}

// ICE & state handling (keep yours)
peer.onicecandidate = (e) => {
  if (e.candidate) {
    socket.emit("webrtc_candidate", { candidate: e.candidate, email, studentExamId });
  }
};

peer.onconnectionstatechange = () => {
  const st = peer.connectionState;
  if (["failed", "disconnected", "closed"].includes(st)) {
    try { peer.close(); } catch {}
    delete peersRef.current[studentExamId];

    // 🔻 audio pipeline cleanup
    const pipes = peersRef.current.__audioPipelines || {};
    const ap = pipes[studentExamId];
    if (ap) {
      if (ap.rafId) cancelAnimationFrame(ap.rafId);
      try { ap.src?.disconnect?.(); } catch {}
      try {
        ap.notch50?.disconnect?.(); ap.notch60?.disconnect?.();
        ap.hp?.disconnect?.(); ap.presence?.disconnect?.();
        ap.lp?.disconnect?.(); ap.comp?.disconnect?.(); ap.gate?.disconnect?.();
      } catch {}
      try { ap.ctx?.close?.(); } catch {}
      delete pipes[studentExamId];
    }
  }
};

await peer.setRemoteDescription(offer);
const answer = await peer.createAnswer();
await peer.setLocalDescription(answer);
socket.emit("webrtc_answer", { answer, email, studentExamId });

  });

  // ---------- ICE candidate ----------
  socket.on("webrtc_candidate", ({ candidate, studentExamId }) => {
    const peer = peersRef.current[studentExamId];
    if (peer && candidate) {
      peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    }
  });
};

export const cleanupMentorSocket = () => {
  EVENTS.forEach((e) => socket.off(e));
};
