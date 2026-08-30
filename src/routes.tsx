import { createBrowserRouter } from "react-router";
import StudentLanding from "./pages/StudentLanding";
import StudentQuizList from "./pages/StudentQuizList";
import PreQuiz from "./pages/PreQuiz";
import WheelSpin from "./pages/WheelSpin";
import QuestionScreen from "./pages/QuestionScreen";
import Results from "./pages/Results";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminReports from "./pages/admin/AdminReports";

export const router = createBrowserRouter([
  { path: "/", Component: StudentLanding },
  { path: "/quizzes", Component: StudentQuizList },
  { path: "/quiz/:quizId/pre", Component: PreQuiz },
  { path: "/quiz/:quizId/spin", Component: WheelSpin },
  { path: "/quiz/:quizId/question", Component: QuestionScreen },
  { path: "/quiz/:quizId/results", Component: Results },
  { path: "/admin", Component: AdminLogin },
  {
    path: "/admin/panel",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "dashboard", Component: AdminDashboard },
      { path: "students", Component: AdminStudents },
      { path: "questions", Component: AdminQuestions },
      { path: "reports", Component: AdminReports },
    ],
  },
]);
