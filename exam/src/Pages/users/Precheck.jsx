import React, { useEffect, useState, useRef, StrictMode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Repeat,
  Video,
  Mic,
  MonitorSmartphone,
} from "lucide-react";

/* ===== Utilities (enhanced checks) ===== */
const pingServer = async () => {
  const start = performance.now();
  try {
    const res = await fetch("/api/ping", { method: "GET", cache: "no-cache" });
    if (!res.ok) throw new Error("Ping failed");
    return { ok: true, latency: Math.round(performance.now() - start) };
  } catch (err) {
    return { ok: false, latency: null, error: err.message };
  }
};

// More detailed camera/mic checks with brightness variance & audio level
const checkCameraMic = async () => {
  const result = {
    permission: { camera: "unknown", microphone: "unknown" },
    devices: { videoInputs: [], audioInputs: [] },
    streamTest: {
      videoFrameOk: null,
      faceLikelyVisible: null, // NEW: based on brightness variance (very rough)
      audioLevelOk: null,
    },
    errors: [],
  };

  // Permissions
  try {
    if (navigator.permissions?.query) {
      const cam = await navigator.permissions.query({ name: "camera" });
      const mic = await navigator.permissions.query({ name: "microphone" });
      result.permission.camera = cam.state || "unknown";
      result.permission.microphone = mic.state || "unknown";
    }
  } catch (err) {
    result.errors.push({ step: "permissions", msg: err?.message || String(err) });
  }

  // Devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    result.devices.videoInputs = devices.filter((d) => d.kind === "videoinput");
    result.devices.audioInputs = devices.filter((d) => d.kind === "audioinput");
  } catch (err) {
    result.errors.push({ step: "devices", msg: err?.message || String(err) });
  }

  // Media capture + quick frame/audio checks
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    // --- Video frame + brightness variance (proxy for "profile visible") ---
    const vTrack = stream.getVideoTracks()[0];
    if (vTrack) {
      const videoEl = document.createElement("video");
      videoEl.srcObject = new MediaStream([vTrack]);
      videoEl.muted = true;
      await videoEl.play().catch(() => {});
      await new Promise((res) => setTimeout(res, 300)); // let first frame render

      try {
        const w = Math.max(160, videoEl.videoWidth || 160);
        const h = Math.max(120, videoEl.videoHeight || 120);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, w, h);
        const pixels = ctx.getImageData(0, 0, w, h).data;

        // compute brightness variance
        let sum = 0;
        let sumSq = 0;
        const N = pixels.length / 4;
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b; // perceived luminance
          sum += lum;
          sumSq += lum * lum;
        }
        const mean = sum / N;
        const variance = sumSq / N - mean * mean;

        // heuristics:
        // - frame ok if mean > ~5 (not fully black) and variance > tiny
        // - "face likely visible" if brightness is moderate and not too dark
        const frameOk = mean > 5;
        const faceLikely = frameOk && mean > 20 && variance > 50;

        result.streamTest.videoFrameOk = frameOk;
        result.streamTest.faceLikelyVisible = faceLikely;
      } catch {
        result.streamTest.videoFrameOk = true; // have a track, assume ok
        result.streamTest.faceLikelyVisible = null;
      }
    } else {
      result.streamTest.videoFrameOk = false;
      result.streamTest.faceLikelyVisible = false;
    }

    // --- Audio level (mic must be ON and giving signal) ---
    const aTrack = stream.getAudioTracks()[0];
    if (aTrack && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaStreamSource(new MediaStream([aTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        await new Promise((r) => setTimeout(r, 250));
        analyser.getByteTimeDomainData(data);
        let maxDelta = 0;
        for (let i = 0; i < data.length; i++) {
          const delta = Math.abs(data[i] - 128);
          if (delta > maxDelta) maxDelta = delta;
        }
        // Require a small but real movement to count as "mic on"
        result.streamTest.audioLevelOk = maxDelta > 3;
        result.streamTest.audioPeak = maxDelta;  
        ctx.close();
      } catch (err) {
        result.streamTest.audioLevelOk = null;
        result.errors.push({ step: "audioTest", msg: err?.message || String(err) });
      }
    } else {
      result.streamTest.audioLevelOk = false;
    }
  } catch (err) {
    result.errors.push({ step: "getUserMedia", msg: err?.message || String(err) });
    result.streamTest.videoFrameOk = false;
    result.streamTest.audioLevelOk = false;
    result.streamTest.faceLikelyVisible = false;
  } finally {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  return result;
};

const getEnv = () => {
  const ua = navigator.userAgent || "";
  const isMobile =
    /Android|iPhone|iPad|iPod|Windows Phone|Mobi/i.test(ua) ||
    (navigator.userAgentData && navigator.userAgentData.mobile);
  return {
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    os: navigator.userAgentData?.platform || navigator.platform || "Unknown",
    browser: navigator.userAgent,
    deviceType: isMobile ? "Mobile" : "Desktop/Laptop",
  };
};

/* ===== Component ===== */
export default function Precheck() {
  const location = useLocation();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const [previewStream, setPreviewStream] = useState(null);

  const [checking, setChecking] = useState(false);
  const [camMic, setCamMic] = useState(null);
  const [network, setNetwork] = useState({ online: navigator.onLine, ping: null });
  const [env, setEnv] = useState(getEnv());
  const [allOk, setAllOk] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const { loginResult, form } = location.state || {};

  useEffect(() => {
    runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Precheck.jsx
async function enterStrictMode() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();  // user gesture here
    }
  } catch (e) {
    console.warn("Precheck FS error:", e);
  }

  // Lock F11/Escape (Chromium/Edge)
  try {
    if (navigator.keyboard?.lock) {
      await navigator.keyboard.lock(["F11", "Escape"]);
    }
  } catch {}
}






  async function runChecks() {
    setChecking(true);
    const [camMicResult, ping] = await Promise.all([checkCameraMic(), pingServer()]);
    setCamMic(camMicResult);
    setNetwork({ online: navigator.onLine, ping });
    setEnv(getEnv());

    // start preview only (video)
    try {
      if (previewStream) previewStream.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPreviewStream(stream);
    } catch (e) {
      toast.error("Unable to start camera preview.");
    }

    setChecking(false);
  }

  useEffect(() => {
    if (!camMic) return;
    const ok =
      camMic.permission.camera === "granted" &&
      camMic.permission.microphone === "granted" &&
      (camMic.devices.videoInputs?.length || 0) > 0 &&
      (camMic.devices.audioInputs?.length || 0) > 0 &&
      camMic.streamTest.videoFrameOk === true &&
      camMic.streamTest.audioLevelOk === true && // mic must be ON
      network.online &&
      network.ping?.ok &&
      network.ping.latency < 2000 &&
      env.screen.width > 800;
    setAllOk(ok);
  }, [camMic, network, env]);

  
  
const proceed = () => {
  if (!allOk || !agreed) {
    toast.error("Please complete checks and accept the instructions.");
    return;
  }

  // ⚠️ Serialize cam/mic info so History.pushState can clone it
  const safeCamMic = camMic
    ? {
        permission: camMic.permission ?? {},
        devices: {
          videoInputs: (camMic.devices?.videoInputs || []).map((d) => ({
            // only primitives
            deviceId: d.deviceId || "",
            label: d.label || "",
            kind: "videoinput",
          })),
          audioInputs: (camMic.devices?.audioInputs || []).map((d) => ({
            deviceId: d.deviceId || "",
            label: d.label || "",
            kind: "audioinput",
          })),
        },
        streamTest: {
          videoFrameOk: !!camMic.streamTest?.videoFrameOk,
          audioLevelOk: !!camMic.streamTest?.audioLevelOk,
          faceLikelyVisible:
            camMic.streamTest?.faceLikelyVisible === true
              ? true
              : camMic.streamTest?.faceLikelyVisible === false
              ? false
              : null,
          audioPeak:
            typeof camMic.streamTest?.audioPeak === "number"
              ? camMic.streamTest.audioPeak
              : null,
        },
        errors: (camMic.errors || []).map((e) => ({
          step: e?.step || "",
          msg: String(e?.msg ?? e ?? ""),
        })),
      }
    : null;

  // keep network lean too
  const safeNetwork = {
    online: !!network?.online,
    ping: network?.ping
      ? {
          ok: !!network.ping.ok,
          latency:
            typeof network.ping.latency === "number" ? network.ping.latency : null,
          error: network.ping.error || null,
        }
      : null,
  };

  const data = {
    camMic: safeCamMic,
    network: safeNetwork,
    env: {
      screen: {
        width: env?.screen?.width || null,
        height: env?.screen?.height || null,
      },
      os: env?.os || "",
      browser: env?.browser || "",
      deviceType: env?.deviceType || "",
    },
    loginResult,
    form,
    timestamp: new Date().toISOString(),
  };

  navigate("/exam", { state: { precheckData: data, loginResult, form } });
};


  const StatusBadge = ({ ok, warn = false, label }) => (
    <div className="flex items-center gap-1">
      {ok ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : warn ? (
        <AlertTriangle className="w-4 h-4 text-amber-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-600" />
      )}
      <span className={`text-sm ${ok ? "text-green-700" : warn ? "text-amber-700" : "text-red-700"}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg px-8 py-5 space-y-1 border border-slate-200">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800">Exam Setup and Instructions</h1>
          <p className="text-slate-500">
            Please ensure your camera and microphone are working correctly before proceeding. Review the exam rules carefully.
          </p>
        </div>

        {/* System Check */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">System Check</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Camera Feed Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="relative rounded-lg overflow-hidden mb-2">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-40 object-cover rounded-lg" />
                {!previewStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-500 text-sm">
                    No Preview
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-slate-700 font-medium flex items-center gap-1">
                  <Video className="w-4 h-4 text-sky-500" /> Camera Feed
                </span>
                <StatusBadge ok={camMic?.streamTest.videoFrameOk === true} label="Active" />
              </div>

              {/* EXTRA status lines requested */}
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Camera Open</span>
                  <StatusBadge
                    ok={camMic?.permission?.camera === "granted" && camMic?.streamTest?.videoFrameOk === true}
                    label={camMic?.permission?.camera === "granted" ? "Yes" : "No"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Profile / Face Visible</span>
                  <StatusBadge
                    ok={camMic?.streamTest?.faceLikelyVisible === true}
                    warn={camMic?.streamTest?.faceLikelyVisible === null}
                    label={
                      camMic?.streamTest?.faceLikelyVisible === true
                        ? "Looks good"
                        : camMic?.streamTest?.faceLikelyVisible === null
                        ? "Unsure"
                        : "Not visible"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Microphone + Device Card */}
            <div className="space-y-2">
                            {/* Device / OS Info (replaces Speaker test) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MonitorSmartphone className="w-4 h-4 text-indigo-600" /> Device
                  </div>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    <span className="font-medium">{env.deviceType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>OS / Platform</span>
                    <span className="font-medium">{env.os}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Screen</span>
                    <span className="font-medium">
                      {env.screen.width} × {env.screen.height}
                    </span>
                  </div>
                </div>
              </div>
              {/* Microphone Test */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <Mic className="w-4 h-4 text-green-600" /> Microphone Test
    </div>
    <StatusBadge
      ok={camMic?.streamTest?.audioLevelOk === true}
      label={camMic?.streamTest?.audioLevelOk ? "Active" : "Error"}
    />
  </div>

  <p className="text-xs text-slate-500 mt-1">
    {camMic?.permission?.microphone === "denied"
      ? "Microphone permission denied — enable in browser/OS settings."
      : camMic?.streamTest?.audioLevelOk === false
      ? "No audio input detected. Unmute mic / check OS privacy / choose correct device."
      : "Microphone is active and receiving audio."}
  </p>

  {/* 👇 Speak indication + simple level meter */}
  <div className="mt-3" aria-live="polite">
    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
      <span>Say “testing one two” near your mic</span>
      <span className="font-medium">
        {(() => {
          const peak = camMic?.streamTest?.audioPeak ?? 0;
          if (peak > 12) return "Strong";
          if (peak > 6)  return "Good";
          if (peak > 3)  return "Low";
          return "Silent";
        })()}
      </span>
    </div>

    {/* level bar */}
    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
      {(() => {
        const peak = camMic?.streamTest?.audioPeak ?? 0;         // ~0–20+ range
        const pct  = Math.min(100, Math.round(peak * 5));        // map to %
        const color =
          peak > 12 ? "bg-green-500" :
          peak > 6  ? "bg-amber-400" :
          peak > 3  ? "bg-yellow-400" : "bg-red-400";
        return (
          <div
            className={`h-full ${color} transition-[width] duration-200`}
            style={{ width: `${pct}%` }}
          />
        );
      })()}
    </div>

    <div className="text-[11px] text-slate-500 mt-1">
      Tip: speak clearly for a second, then click <span className="font-medium">Re-run Checks</span> if the bar doesn’t move.
    </div>
  </div>
</div>
            {/* Network Card */}
            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Network</div>
                <StatusBadge ok={network.online && network.ping?.ok} label={network.online ? "Connected" : "Offline"} />
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Ping Latency:{" "}
                <span className="font-medium">
                  {network.ping ? (network.ping.ok ? `${network.ping.latency} ms` : "Failed") : "Checking..."}
                </span>
              </div>
            </div>

            </div>
          </div>
        </section>

        {/* Rules */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Exam Rules & Warnings</h2>
          <div className="bg-red-50 border border-red-300 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <p>
              <strong>Important:</strong> 3 warnings will lead to automatic submission of your exam.
            </p>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-sm">
            <li>Do not switch tabs or applications during the exam.</li>
            <li>Ensure a stable internet connection throughout the exam.</li>
            <li>Keep your face clearly visible to the camera at all times.</li>
            <li>No external assistance is permitted.</li>
          </ul>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="w-4 h-4 accent-blue-600"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              id="agree"
            />
            <label htmlFor="agree">I have read and understood all the instructions and rules.</label>
          </div>
        </section>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={runChecks}
            disabled={checking}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            <Repeat className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Re-running Checks..." : "Re-run Checks"}
          </button>
          <button
            onClick={ async() => {
              // enforce mic is ON and profile visible before proceed
              if (camMic?.streamTest?.audioLevelOk !== true) {
                toast.error("Microphone is not receiving audio. Please fix it to proceed.");
                return;
              }
              if (camMic?.streamTest?.videoFrameOk !== true) {
                toast.error("Camera is not open or not producing image.");
                return;
              }
              if (camMic?.streamTest?.faceLikelyVisible === false) {
                toast.error("Your profile/face is not clearly visible to the camera.");
                return;
              }
              await enterStrictMode();
              proceed();
            }}
            disabled={!allOk || !agreed}
            className={`flex-1 py-3 rounded-lg text-white font-medium ${
              allOk && agreed ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-400 cursor-not-allowed"
            }`}
          >
            Proceed to Exam
          </button>
        </div>
      </div>
    </div>
  );
}
