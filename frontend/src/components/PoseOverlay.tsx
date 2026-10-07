import { useEffect, useRef, useState, useCallback } from 'react'
import type { DeviationType, RepRecord } from '../types/contract'
import { LiveFeedbackRing } from './RepFeedback'

interface PoseOverlayProps {
  onRepComplete: (rep: RepRecord) => void
  repCount: number
  targetReps: number
}

// ── Pose landmark indices (MediaPipe) ──────────────────────────────────────
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28],
]

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: { x: number; y: number; visibility?: number }[],
  w: number,
  h: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (const [a, b] of POSE_CONNECTIONS) {
    const la = landmarks[a]
    const lb = landmarks[b]
    if (!la || !lb) continue
    if ((la.visibility ?? 1) < 0.3 || (lb.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(la.x * w, la.y * h)
    ctx.lineTo(lb.x * w, lb.y * h)
    ctx.stroke()
  }
  ctx.fillStyle = '#fff'
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function angleFromThreePoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180) angle = 360 - angle
  return angle
}

// Simple heuristic: detect rep by angle threshold crossing
function classifyDeviation(
  deviationScore: number,
  durationSec: number,
): DeviationType {
  if (durationSec < 1.5) return 'speed'
  if (deviationScore > 0.6) return 'overextend'
  if (deviationScore > 0.3) return 'compensation'
  return 'none'
}

export function PoseOverlay({ onRepComplete, repCount, targetReps }: PoseOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [poseLoaded, setPoseLoaded] = useState(false)
  const [currentDeviation, setCurrentDeviation] = useState<DeviationType>('none')

  // Rep state machine
  const repStateRef = useRef<{
    inRep: boolean
    repStartTime: number
    peakAngle: number
    repIndex: number
  }>({ inRep: false, repStartTime: 0, peakAngle: 0, repIndex: 0 })

  const handleResults = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (results: any) => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

      if (!results.poseLandmarks) return

      const lm = results.poseLandmarks
      const fgColor =
        currentDeviation === 'none'
          ? '#10b981'
          : currentDeviation === 'speed' || currentDeviation === 'overextend'
          ? '#f43f5e'
          : '#f59e0b'

      drawLandmarks(ctx, lm, canvas.width, canvas.height, fgColor)

      // Compute elbow angle (right side: 12→14→16) as proxy for ROM
      const shoulder = lm[12]
      const elbow = lm[14]
      const wrist = lm[16]
      if (!shoulder || !elbow || !wrist) return

      const angle = angleFromThreePoints(shoulder, elbow, wrist)
      const rs = repStateRef.current

      // Rep detection: angle drops below 90° → rep started; returns above 150° → rep done
      if (!rs.inRep && angle < 90) {
        rs.inRep = true
        rs.repStartTime = Date.now()
        rs.peakAngle = angle
      } else if (rs.inRep) {
        if (angle < rs.peakAngle) rs.peakAngle = angle
        if (angle > 150) {
          const durationSec = (Date.now() - rs.repStartTime) / 1000
          const deviationScore = Math.max(0, (90 - rs.peakAngle) / 90)
          const devType = classifyDeviation(deviationScore, durationSec)
          setCurrentDeviation(devType)

          onRepComplete({
            rep_index: rs.repIndex,
            max_angle: parseFloat(angle.toFixed(1)),
            duration_sec: parseFloat(durationSec.toFixed(2)),
            deviation_score: parseFloat(deviationScore.toFixed(3)),
            deviation_type: devType,
          })
          rs.repIndex++
          rs.inRep = false
          rs.peakAngle = 0
        }
      }
    },
    [currentDeviation, onRepComplete],
  )

  useEffect(() => {
    let pose: ReturnType<typeof setTimeout> | null = null
    let camera: { start: () => void; stop: () => void } | null = null
    let stopped = false

    async function init() {
      if (!videoRef.current) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        videoRef.current.srcObject = stream

        // Dynamically import MediaPipe to avoid SSR issues
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const MP = (window as any)

        if (MP.Pose) {
          const poseInstance = new MP.Pose({
            locateFile: (file: string) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
          })
          poseInstance.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
          poseInstance.onResults(handleResults)

          const CameraUtil = new MP.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current) {
                await poseInstance.send({ image: videoRef.current })
              }
            },
            width: 640,
            height: 480,
          })
          camera = CameraUtil
          CameraUtil.start()
          setPoseLoaded(true)
        } else {
          // Fallback: just show the webcam without pose
          setPoseLoaded(true)
        }
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : 'Camera access denied',
        )
      }
    }

    void init()
    return () => {
      stopped = true
      if (pose) clearTimeout(pose)
      camera?.stop?.()
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((t) => t.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center bg-surface-card rounded-2xl border border-surface-border h-80 gap-3">
        <span className="text-4xl">📷</span>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Camera unavailable: {cameraError}. Please allow camera access in your browser.
        </p>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      {/* Hidden video; we draw onto canvas */}
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="w-full rounded-2xl" />

      {/* Loading overlay */}
      {!poseLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 rounded-2xl gap-3">
          <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-300 text-sm">Initialising pose detection…</p>
        </div>
      )}

      {/* Colour-coded border ring */}
      <LiveFeedbackRing deviationType={currentDeviation} />

      {/* Rep counter overlay */}
      <div className="absolute top-3 right-3 bg-surface/70 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
        <p className="text-3xl font-bold text-white">{repCount}</p>
        <p className="text-xs text-slate-400">/ {targetReps} reps</p>
      </div>
    </div>
  )
}
