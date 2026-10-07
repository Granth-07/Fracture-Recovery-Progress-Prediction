import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_PATIENTS, mockCheckinResponse } from '../data/MOCK_DATA'
import { PoseOverlay } from '../components/PoseOverlay'
import { RepFeedback } from '../components/RepFeedback'
import { CheckInSummary } from '../components/CheckInSummary'
import type { RepRecord, CheckinResponse } from '../types/contract'

const TARGET_REPS = 10
const EXERCISE_ID = 'wrist_rotation'

type Phase = 'intro' | 'recording' | 'summary'

export function CheckIn() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const patient = MOCK_PATIENTS.find((p) => p.patient_id === id)

  const [phase, setPhase] = useState<Phase>('intro')
  const [reps, setReps] = useState<RepRecord[]>([])
  const [response, setResponse] = useState<CheckinResponse | null>(null)

  const handleRepComplete = useCallback((rep: RepRecord) => {
    setReps((prev) => {
      const updated = [...prev, rep]
      if (updated.length >= TARGET_REPS) {
        // Auto-finish when target reached
        setTimeout(() => finishSession(updated), 600)
      }
      return updated
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function finishSession(completedReps: RepRecord[]) {
    // In production: POST /checkins with completedReps
    const res = mockCheckinResponse(id ?? '')
    setResponse(res)
    setReps(completedReps)
    setPhase('summary')
  }

  if (!patient) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-slate-400">Patient not found.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Intro screen */}
      {phase === 'intro' && (
        <div className="animate-slide-up space-y-6">
          <button
            id="btn-back-detail"
            onClick={() => navigate(`/patients/${id}`)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            ← {patient.name}
          </button>

          <div className="card text-center space-y-4">
            <div className="text-5xl">🏋️</div>
            <h1 className="text-2xl font-bold text-white">Ready to check in?</h1>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              We'll use your camera to track your form and count reps.
              No video is stored — only extracted movement data is sent.
            </p>

            <div className="bg-surface-border/30 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Patient</span>
                <span className="text-slate-200 font-medium">{patient.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Exercise</span>
                <span className="text-slate-200 font-medium capitalize">{EXERCISE_ID.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Target reps</span>
                <span className="text-slate-200 font-medium">{TARGET_REPS}</span>
              </div>
            </div>

            <div className="bg-brand-900/40 border border-brand-700/40 rounded-xl p-3 text-xs text-brand-300">
              🔒 Camera feed is processed entirely in your browser.
              Only joint-angle features are sent to the server — never raw video.
            </div>

            <button
              id="btn-start-recording"
              className="btn-primary w-full text-base py-3"
              onClick={() => setPhase('recording')}
            >
              Start Recording
            </button>
          </div>
        </div>
      )}

      {/* Recording screen */}
      {phase === 'recording' && (
        <div className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-xl font-bold text-white">Live Check-in</h1>
              <p className="text-slate-400 text-xs mt-0.5">{patient.name} · {EXERCISE_ID.replace('_', ' ')}</p>
            </div>
            <button
              id="btn-finish-early"
              className="btn-ghost text-sm"
              onClick={() => finishSession(reps)}
              disabled={reps.length === 0}
            >
              Finish ({reps.length}/{TARGET_REPS})
            </button>
          </div>

          {/* Camera + Pose */}
          <PoseOverlay
            onRepComplete={handleRepComplete}
            repCount={reps.length}
            targetReps={TARGET_REPS}
          />

          {/* Rep feedback list */}
          {reps.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" id="rep-feedback-list">
              {[...reps].reverse().map((rep) => (
                <RepFeedback
                  key={rep.rep_index}
                  repIndex={rep.rep_index}
                  deviationType={rep.deviation_type}
                  deviationScore={rep.deviation_score}
                  maxAngle={rep.max_angle}
                />
              ))}
            </div>
          )}

          {reps.length === 0 && (
            <div className="card text-center text-slate-500 text-sm py-6 animate-pulse-slow">
              Waiting for movement… start your exercise in front of the camera.
            </div>
          )}
        </div>
      )}

      {/* Summary screen */}
      {phase === 'summary' && response && (
        <CheckInSummary
          patientId={patient.patient_id}
          patientName={patient.name}
          response={response}
          reps={reps}
        />
      )}
    </main>
  )
}
