import { createBrowserRouter } from "react-router"
import StudentLanding from "./pages/StudentLanding"
import StudentQuizList from "./pages/StudentQuizList"
import PreQuiz from "./pages/PreQuiz"
import WheelSpin from "./pages/WheelSpin"
import QuestionScreen from "./pages/QuestionScreen"
import Results from "./pages/Results"
import TeacherDashboard from "./pages/teacher/TeacherDashboard"
import NewQuiz from "./pages/teacher/NewQuiz"

export const router = createBrowserRouter([
  { path: "/", Component: StudentLanding },
  { path: "/quizzes", Component: StudentQuizList },
  { path: "/quiz/:quizId/pre", Component: PreQuiz },
  { path: "/quiz/:quizId/spin", Component: WheelSpin },
  { path: "/quiz/:quizId/question", Component: QuestionScreen },
  { path: "/quiz/:quizId/results", Component: Results },
  { path: "/teacher", Component: TeacherDashboard },
  { path: "/teacher/new-quiz", Component: NewQuiz },
])
