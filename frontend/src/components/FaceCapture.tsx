import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaceCaptureProps {
  onComplete: (images: string[]) => void;
  onBack?: () => void;
}

const TOTAL_SHOTS = 3;
const HOLD_MS = 1500; // how long the face must stay detected before capture
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

const FaceCapture = ({ onComplete, onBack }: FaceCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const lastCaptureRef = useRef<number>(0);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [flash, setFlash] = useState(false);

  /* ---------------- Load models ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (!cancelled) setModelsLoaded(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Failed to load face detection model. Check your internet connection.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------------- Start camera ---------------- */
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API is unavailable. Open the app on localhost or HTTPS.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Camera requires a secure context. Use http://localhost:8080 on this device or run HTTPS.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (e: unknown) {
      console.error(e);
      const err = e as { name?: string; message?: string };
      if (err?.name === "NotAllowedError") {
        setError("Camera permission denied. Allow camera access in browser/site settings then refresh.");
      } else if (err?.name === "NotFoundError") {
        setError("No camera device found.");
      } else if (err?.name === "NotReadableError") {
        setError("Camera is busy in another app/tab. Close other apps using camera and retry.");
      } else if (err?.name === "OverconstrainedError") {
        setError("Requested camera constraints are not supported on this device.");
      } else {
        setError("Could not access camera. Please grant permission and try again.");
      }
    }
  }, []);

  useEffect(() => {
    if (modelsLoaded) startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (detectIntervalRef.current) window.clearInterval(detectIntervalRef.current);
    };
  }, [modelsLoaded, startCamera]);

  /* ---------------- Capture a frame ---------------- */
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // mirror the image to match the preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  /* ---------------- Detection loop ---------------- */
  useEffect(() => {
    if (!cameraReady || !modelsLoaded) return;
    if (shots.length >= TOTAL_SHOTS) return;

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

    detectIntervalRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const detection = await faceapi.detectSingleFace(video, options);
      const overlay = canvasRef.current;
      if (overlay && video.videoWidth) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        const ctx = overlay.getContext("2d");
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
      }

      if (detection && detection.score > 0.6) {
        setFaceDetected(true);
        // draw box (mirrored)
        if (overlay) {
          const ctx = overlay.getContext("2d");
          if (ctx) {
            const { x, y, width, height } = detection.box;
            ctx.save();
            ctx.translate(overlay.width, 0);
            ctx.scale(-1, 1);
            ctx.strokeStyle = "hsl(142 76% 50%)";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            ctx.restore();
          }
        }

        // hold timer
        if (holdStartRef.current === null) holdStartRef.current = Date.now();
        const elapsed = Date.now() - holdStartRef.current;
        setHoldProgress(Math.min(elapsed / HOLD_MS, 1));

        // capture if held long enough and cooldown passed
        if (elapsed >= HOLD_MS && Date.now() - lastCaptureRef.current > 800) {
          const img = captureFrame();
          if (img) {
            lastCaptureRef.current = Date.now();
            holdStartRef.current = null;
            setHoldProgress(0);
            setFlash(true);
            setTimeout(() => setFlash(false), 200);
            setShots((prev) => {
              const next = [...prev, img];
              return next;
            });
          }
        }
      } else {
        setFaceDetected(false);
        holdStartRef.current = null;
        setHoldProgress(0);
      }
    }, 200);

    return () => {
      if (detectIntervalRef.current) window.clearInterval(detectIntervalRef.current);
    };
  }, [cameraReady, modelsLoaded, shots.length, captureFrame]);

  /* ---------------- Auto-finish when 3 shots collected ---------------- */
  useEffect(() => {
    if (shots.length >= TOTAL_SHOTS) {
      // stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (detectIntervalRef.current) window.clearInterval(detectIntervalRef.current);
    }
  }, [shots.length]);

  const handleRetake = () => {
    setShots([]);
    holdStartRef.current = null;
    lastCaptureRef.current = 0;
    setHoldProgress(0);
    if (!streamRef.current || !streamRef.current.active) startCamera();
  };

  const handleConfirm = () => onComplete(shots);

  /* ---------------- UI ---------------- */
  const allDone = shots.length >= TOTAL_SHOTS;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Face capture</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {allDone
            ? "All set! Review your photos below."
            : "Look at the camera. We'll capture 3 photos automatically."}
        </p>
      </div>

      {/* Camera preview */}
      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black ring-1 ring-border">
        {!modelsLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Loading face detection…</p>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)", display: allDone ? "none" : "block" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ display: allDone ? "none" : "block" }}
        />

        {/* Flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Status overlay */}
        {!allDone && cameraReady && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md ${
                faceDetected
                  ? "bg-green-500/30 text-green-50 ring-1 ring-green-400/50"
                  : "bg-black/40 text-white/90 ring-1 ring-white/20"
              }`}
            >
              {faceDetected ? "Face detected — hold still" : "Position your face in the frame"}
            </div>
            <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-black/40 text-white backdrop-blur-md ring-1 ring-white/20">
              {shots.length} / {TOTAL_SHOTS}
            </div>
          </div>
        )}

        {/* Hold progress ring */}
        {!allDone && faceDetected && holdProgress > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="h-1.5 w-40 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-green-400 transition-[width] duration-150"
                style={{ width: `${holdProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Done state */}
        {allDone && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-green-600/90 to-emerald-700/90 text-white">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
              <CheckCircle2 className="h-14 w-14" />
            </motion.div>
            <p className="text-lg font-semibold">3 photos captured</p>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: TOTAL_SHOTS }).map((_, i) => {
          const img = shots[i];
          return (
            <div
              key={i}
              className={`aspect-square rounded-xl overflow-hidden ring-2 transition-all ${
                img ? "ring-green-500" : "ring-border bg-muted"
              }`}
            >
              {img ? (
                <img src={img} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Camera className="h-5 w-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        {allDone ? (
          <>
            <Button type="button" variant="outline" className="flex-1" onClick={handleRetake}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retake
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirm}>
              Continue
            </Button>
          </>
        ) : (
          onBack && (
            <Button type="button" variant="outline" className="w-full" onClick={onBack}>
              Back
            </Button>
          )
        )}
      </div>
    </div>
  );
};

export default FaceCapture;
