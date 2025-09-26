import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, XCircle, AlertTriangle, Repeat, PlayCircle } from "lucide-react";

/* =================== Utilities =================== */

// Server ping/latency check
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

// Camera/mic permission, device, and sample check
const checkCameraMic = async () => {
  const result = {
    permission: { camera: "unknown", microphone: "unknown" },
    devices: { videoInputs: [], audioInputs: [] },
    streamTest: { videoFrameOk: null, audioLevelOk: null },
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
    result.devices.videoInputs = devices.filter(d => d.kind === "videoinput");
    result.devices.audioInputs = devices.filter(d => d.kind === "audioinput");
  } catch (err) {
    result.errors.push({ step: "devices", msg: err?.message || String(err) });
  }

  // Media test
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    // Video frame test
    const vTrack = stream.getVideoTracks()[0];
    if (vTrack) {
      const videoEl = document.createElement("video");
      videoEl.srcObject = new MediaStream([vTrack]);
      await new Promise((res) => {
        let done = false;
        const timer = setTimeout(() => { if (!done) { done = true; res(); } }, 1200);
        videoEl.onloadeddata = () => {
          try {
            const c = document.createElement("canvas");
            c.width = videoEl.videoWidth || 160;
            c.height = videoEl.videoHeight || 120;
            const ctx = c.getContext("2d");
            ctx.drawImage(videoEl, 0, 0, c.width, c.height);
            const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
            const nonBlack = (() => {
              for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) return true;
              }
              return false;
            })();
            result.streamTest.videoFrameOk = nonBlack;
          } catch {
            result.streamTest.videoFrameOk = false;
          } finally {
            done = true;
            clearTimeout(timer);
            try { videoEl.srcObject = null; } catch (e) {}
            res();
          }
        };
      });
    } else {
      result.streamTest.videoFrameOk = false;
    }

    // Audio input test
    const aTrack = stream.getAudioTracks()[0];
    if (aTrack && window.AudioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(new MediaStream([aTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        await new Promise(res => setTimeout(res, 200));
        analyser.getByteTimeDomainData(data);
        let maxDelta = 0;
        for (let i = 0; i < data.length; i++) {
          const delta = Math.abs(data[i] - 128);
          if (delta > maxDelta) maxDelta = delta;
        }
        result.streamTest.audioLevelOk = maxDelta > 2;
        ctx.close();
      } catch (err) {
        result.streamTest.audioLevelOk = null;
        result.errors.push({ step: "audioTest", msg: err?.message || String(err) });
      }
    } else {
      result.streamTest.audioLevelOk = null;
    }
  } catch (err) {
    result.errors.push({
      step: "getUserMedia", msg: err?.message || String(err), name: err?.name
    });
    result.streamTest.videoFrameOk = false;
    result.streamTest.audioLevelOk = false;
  } finally {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }
  return result;
};

// Screen and environment info
const getEnv = () => ({
  screen: {
    width: window.screen.width,
    height: window.screen.height,
    colorDepth: window.screen.colorDepth,
  },
  os: navigator.userAgentData?.platform || navigator.platform || "Unknown",
  browser: navigator.userAgent,
});

// UI: reusable status row with icon
function StatusRow({ label, ok, warn, className = "", children }) {
  const Icon = ok ? CheckCircle : warn ? AlertTriangle : XCircle;
  const iconColor = ok ? "text-green-400" : warn ? "text-yellow-400" : "text-red-400";
  return (
    <div className={`flex items-start gap-2 text-sm ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <span className="font-medium text-slate-300">{label}</span>
        {children}
      </div>
    </div>
  );
}

/* ========== Precheck Main Component ========== */
function Precheck() {
  // ----------- React/Redux hooks and Local State -----------
  const location = useLocation();
  const navigate = useNavigate();

  // Device preview refs/state
  const videoRef = useRef(null);
  const [previewStream, setPreviewStream] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState("");

  // Check state
  const [checking, setChecking] = useState(false);
  const [camMic, setCamMic] = useState(null);
  const [network, setNetwork] = useState({ online: navigator.onLine, ping: null });
  const [env, setEnv] = useState(getEnv());
  const [allOk, setAllOk] = useState(false);

  // Passed location state from login/form
  const passed = location.state || {};
  const { loginResult, form } = passed;

  // ----------- Core: Run all checks -----------
  useEffect(() => { runChecks(); }, []);
  async function runChecks() {
    setChecking(true);
    setAllOk(false);

    // Run checks in parallel
    const [camMicResult, ping] = await Promise.all([checkCameraMic(), pingServer()]);
    setCamMic(camMicResult);
    setNetwork({ online: navigator.onLine, ping });
    setEnv(getEnv());

    // Start preview stream for selected device (or first found)
    try {
      const firstDeviceId = camMicResult?.devices?.videoInputs?.[0]?.deviceId;
      const deviceToUse = selectedCamera || firstDeviceId || "";
      if (previewStream) previewStream.getTracks().forEach(t => t.stop());
      setPreviewStream(null);
      await startPreview(deviceToUse);
    } catch (err) {
      console.warn("startPreview after checks failed:", err);
    }
    setChecking(false);
  }

  // ----------- Camera Preview Management -----------
  async function startPreview(deviceId = "") {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach(t => t.stop());
        setPreviewStream(null);
      }
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPreviewStream(stream);
    } catch (err) {
      console.error("Preview failed:", err?.message || err);
      toast.error("Unable to start camera preview. Try another device or close other camera apps.");
    }
  }

  useEffect(() => () => {
    if (previewStream) {
      try { previewStream.getTracks().forEach(t => t.stop()); } catch { }
    }
  }, [previewStream]);

  // ----------- Status/Message helpers -----------
  const getCameraMessage = () => {
    if (!camMic) return { text: "Checking...", ok: null };
    if (previewStream && previewStream.getVideoTracks().length > 0)
      return { text: "Camera working — producing live image", ok: true };
    if (camMic.permission.camera === "denied")
      return { text: "Camera permission denied — enable from browser/OS settings", ok: false };
    if ((camMic.devices?.videoInputs?.length || 0) === 0)
      return { text: "No camera detected on this device", ok: false };
    if (camMic.streamTest.videoFrameOk === false)
      return { text: "Camera detected but not producing image. Possible reasons: camera covered, used by another app, or blocked by OS settings.", ok: false };
    if (camMic.streamTest.videoFrameOk === null)
      return { text: "Camera detected — unable to determine frame (try Re-run)", ok: null };
    return { text: "Camera working — producing image", ok: true };
  };

  const getMicMessage = () => {
    if (!camMic) return { text: "Checking...", ok: null };
    if (camMic.permission.microphone === "denied")
      return { text: "Microphone permission denied — enable from browser/OS settings", ok: false };
    if ((camMic.devices?.audioInputs?.length || 0) === 0)
      return { text: "No microphone detected", ok: false };
    if (camMic.streamTest.audioLevelOk === false)
      return { text: "Microphone detected but no audio input detected. Possible reasons: hardware muted, OS privacy block, or hardware issue.", ok: false };
    if (camMic.streamTest.audioLevelOk === null)
      return { text: "Microphone detected — unable to measure audio level (try Re-run)", ok: null };
    return { text: "Microphone working — input detected", ok: true };
  };

  // ----------- Success state calculation -----------
  useEffect(() => {
    if (!camMic) { setAllOk(false); return; }
    const cameraFrameOk = camMic.streamTest.videoFrameOk === true ||
      (previewStream && previewStream.getVideoTracks && previewStream.getVideoTracks().length > 0);
    const micLevelOk = camMic.streamTest.audioLevelOk === true ||
      (camMic.streamTest.audioLevelOk === null && camMic.permission.microphone === "granted" && (camMic.devices?.audioInputs?.length || 0) > 0);
    const cameraPermissionOk = camMic.permission.camera === "granted";
    const micPermissionOk = camMic.permission.microphone === "granted";
    const cameraDetected = (camMic.devices?.videoInputs?.length || 0) > 0;
    const micDetected = (camMic.devices?.audioInputs?.length || 0) > 0;
    const networkOk = network?.online && network?.ping?.ok && network.ping.latency && network.ping.latency < 2000;
    const screenOk = env?.screen?.width >= 800;
    const pass =
      cameraPermissionOk &&
      micPermissionOk &&
      cameraDetected &&
      micDetected &&
      cameraFrameOk &&
      micLevelOk &&
      networkOk &&
      screenOk;
    setAllOk(Boolean(pass));
  }, [camMic, previewStream, network, env]);

  // ----------- Handle proceed -----------
  function proceed() {
    if (!allOk) return toast.error("Please fix failed checks.");
    // Only serializable fields in state
    const safeCamMic = {
      permission: camMic.permission,
      devices: {
        videoInputs: (camMic.devices.videoInputs || []).map(d => ({ deviceId: d.deviceId, label: d.label || "" })),
        audioInputs: (camMic.devices.audioInputs || []).map(d => ({ deviceId: d.deviceId, label: d.label || "" })),
      },
      streamTest: camMic.streamTest,
      errors: camMic.errors,
    };
    const data = {
      camMic: safeCamMic, network, env, loginResult, form, timestamp: new Date().toISOString(),
    };
    navigate("/exam", { state: { precheckData: data, loginResult, form } });
  }

  // ----------- Render -----------
  const cameraMsg = getCameraMessage();
  const micMsg = getMicMessage();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-4">
      <div className="max-w-4xl w-full p-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <h1 className="text-3xl sm:text-4xl text-white font-bold mb-2">Device Precheck</h1>
        <p className="text-slate-400 text-base mb-6">
          A quick check to ensure your camera, microphone, network, and screen are ready for the exam.
        </p>
        
        {allOk && (
          <div className="bg-green-600/20 text-green-300 p-4 rounded-lg mb-6 flex items-center space-x-3 border border-green-700">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <p className="font-semibold text-white">All systems operational! You are ready to proceed.</p>
          </div>
        )}

        {/* Status Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Camera Section */}
          <section className="p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="flex items-center space-x-2 text-xl font-semibold mb-4 text-white">
              <PlayCircle className="w-6 h-6 text-indigo-400" />
              <span>Camera</span>
            </h3>
            <div className="space-y-3">
              <StatusRow label={`Permission Status: ${camMic?.permission.camera}`} ok={camMic?.permission.camera === "granted"} />
              <StatusRow label={`Devices Detected: ${camMic?.devices?.videoInputs?.length || 0}`} ok={(camMic?.devices?.videoInputs?.length || 0) > 0} />
              
              <div className="text-sm text-white pt-2">
                <p className={`font-medium ${cameraMsg.ok === true ? "text-green-300" : cameraMsg.ok === false ? "text-red-300" : "text-yellow-300"}`}>
                  {cameraMsg.text}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col items-center">
              <div className="relative w-full max-w-sm rounded-lg overflow-hidden border-2 border-slate-600 shadow-md">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto object-cover transform scale-x-[-1]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white/50 text-sm font-medium">
                  {!previewStream && (
                    <span>No Preview</span>
                  )}
                </div>
              </div>
              
              {(camMic?.devices?.videoInputs?.length || 0) > 0 && (
                <div className="mt-4 w-full max-w-sm">
                  <label htmlFor="camera-select" className="text-xs text-slate-400 block mb-1">Select Camera</label>
                  <select
                    id="camera-select"
                    value={selectedCamera}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setSelectedCamera(id);
                      await startPreview(id);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                  >
                    <option value="">Default Camera</option>
                    {camMic.devices.videoInputs.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Microphone Section */}
          <section className="p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="flex items-center space-x-2 text-xl font-semibold mb-4 text-white">
              <PlayCircle className="w-6 h-6 text-pink-400" />
              <span>Microphone</span>
            </h3>
            <div className="space-y-3">
              <StatusRow label={`Permission Status: ${camMic?.permission.microphone}`} ok={camMic?.permission.microphone === "granted"} />
              <StatusRow label={`Devices Detected: ${camMic?.devices?.audioInputs?.length || 0}`} ok={(camMic?.devices?.audioInputs?.length || 0) > 0} />
              
              <div className="text-sm text-white pt-2">
                <p className={`font-medium ${micMsg.ok === true ? "text-green-300" : micMsg.ok === false ? "text-red-300" : "text-yellow-300"}`}>
                  {micMsg.text}
                </p>
              </div>
            </div>
          </section>

          {/* Network Section */}
          <section className="p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="flex items-center space-x-2 text-xl font-semibold mb-4 text-white">
              <PlayCircle className="w-6 h-6 text-cyan-400" />
              <span>Network</span>
            </h3>
            <div className="space-y-3">
              <StatusRow label={`Online Status: ${network.online ? "Connected" : "Disconnected"}`} ok={network.online} />
              <StatusRow
                label={`Ping Latency:`}
                ok={network.ping?.ok && network.ping.latency < 2000}
                warn={network.ping?.ok && network.ping.latency >= 2000}
              >
                <span className="text-slate-400">
                  {network.ping ? (network.ping.ok ? `${network.ping.latency} ms` : `Failed (${network.ping.error || "unknown"})`) : "Checking..."}
                </span>
              </StatusRow>
            </div>
          </section>

          {/* Screen & OS Section */}
          <section className="p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="flex items-center space-x-2 text-xl font-semibold mb-4 text-white">
              <PlayCircle className="w-6 h-6 text-lime-400" />
              <span>Environment</span>
            </h3>
            <div className="space-y-3">
              <StatusRow
                label={`Screen Resolution: ${env.screen.width} × ${env.screen.height}`}
                ok={env.screen.width >= 800}
                warn={env.screen.width > 600 && env.screen.width < 800}
              />
              <div className="text-sm text-slate-300">
                <span className="font-medium">Operating System:</span> {env.os}
              </div>
              <details className="text-xs text-slate-400 cursor-pointer transition-all duration-300 hover:text-white">
                <summary className="font-semibold select-none">Show browser user agent</summary>
                <div className="mt-2 text-slate-500 break-words">{env.browser}</div>
              </details>
            </div>
          </section>
        </div>
        
        {/* Buttons and Final Message */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <button
            onClick={runChecks}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-transform transform hover:scale-105"
            disabled={checking}
          >
            <Repeat className={`w-5 h-5 ${checking ? "animate-spin" : ""}`} />
            <span>{checking ? "Re-running Checks..." : "Re-run Checks"}</span>
          </button>
          
          <button
            onClick={proceed}
            className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all transform ${allOk ? "bg-green-600 hover:bg-green-700 hover:scale-105" : "bg-gray-600 cursor-not-allowed"} text-white`}
            disabled={!allOk}
          >
            <span>Proceed to Exam</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        
        {!allOk && (
          <div className="mt-6 text-sm text-yellow-300 p-4 rounded-lg bg-yellow-600/20 border border-yellow-700">
            <p className="font-semibold">Having trouble? Here's what to check:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check your browser permissions to allow access to your camera and microphone.</li>
              <li>Close other applications (like Zoom, Teams, or OBS) that might be using your camera.</li>
              <li>Ensure your operating system's privacy settings permit access to your devices.</li>
              <li>Try switching to a more stable Wi-Fi network or restarting your browser.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Precheck;
