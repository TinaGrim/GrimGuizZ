import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useApp } from "../store/AppContext"
import SpinWheel from "../components/SpinWheel"

export default function WheelSpin() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { currentStudent, quizzes, setWheelResult, startQuiz } = useApp()

  useEffect(() => {
    if (!currentStudent) navigate("/")
  }, [currentStudent, navigate])

  const quiz = quizzes.find((q) => q.id === quizId)
  if (!quiz || !currentStudent) return null

  const handleResult = (result: 1 | 2 | 3) => {
    setWheelResult(result)
    startQuiz()
    setTimeout(() => navigate(`/quiz/${quizId}/question`), 1200)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: "var(--color-ink)" }}
    >
      {/* Memphis background shapes */}
      <div
        className="absolute top-8 left-8 opacity-5"
        style={{
          width: 180,
          height: 180,
          border: "3px solid var(--color-amber)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute bottom-16 right-12 opacity-5"
        style={{
          width: 100,
          height: 100,
          background: "var(--color-ember)",
          transform: "rotate(20deg)",
        }}
      />
      <div
        className="absolute top-1/3 right-6 opacity-5"
        style={{
          width: 0,
          height: 0,
          borderLeft: "40px solid transparent",
          borderRight: "40px solid transparent",
          borderBottom: "70px solid var(--color-teal)",
        }}
      />

      {/* Top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background:
            "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 30px, #F0A500 30px, #F0A500 60px, #0D6E6E 60px, #0D6E6E 90px)",
        }}
      />

      {/* Content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="text-center">
          <p
            className="text-xs font-600 uppercase tracking-widest mb-2"
            style={{
              color: "var(--color-ember)",
              fontFamily: "var(--font-body)",
              letterSpacing: "0.2em",
            }}
          >
            {quiz.title}
          </p>
          <h1
            className="font-900 leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-amber)",
              fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
            }}
          >
            Spin for your
            <br />
            question count
          </h1>
        </div>

        <SpinWheel onResult={handleResult} />

        <p
          className="text-sm text-center max-w-xs"
          style={{
            color: "rgba(255,255,255,0.35)",
            fontFamily: "var(--font-body)",
          }}
        >
          The wheel decides — 1, 2, or 3 questions. One spin only.
        </p>
      </div>
    </div>
  )
}
