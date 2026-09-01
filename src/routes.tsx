import { createBrowserRouter } from "react-router";
import StudentLayout from "./pages/StudentLayout";
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
import AdminCategories from "./pages/admin/AdminCategories";
import AdminLessons from "./pages/admin/AdminLessons";
import AdminQuizzes from "./pages/admin/AdminQuizzes";
import AdminAssets from "./pages/admin/AdminAssets";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminSecurity from "./pages/admin/AdminSecurity";

export const router = createBrowserRouter([
  {
    Component: StudentLayout,
    children: [
      { path: "/", Component: StudentLanding },
      { path: "/quizzes", Component: StudentQuizList },
      { path: "/quiz/:quizId/pre", Component: PreQuiz },
      { path: "/quiz/:quizId/spin", Component: WheelSpin },
      { path: "/quiz/:quizId/question", Component: QuestionScreen },
      { path: "/quiz/:quizId/results", Component: Results },
    ],
  },
  { path: "/admin", Component: AdminLogin },
  {
    path: "/admin/panel",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "dashboard", Component: AdminDashboard },
      { path: "students", Component: AdminStudents },
      { path: "chapters", Component: AdminCategories },
      { path: "lessons", Component: AdminLessons },
      { path: "quizzes", Component: AdminQuizzes },
      { path: "questions", Component: AdminQuestions },
      { path: "assets", Component: AdminAssets },
      { path: "quotes", Component: AdminQuotes },
      { path: "security", Component: AdminSecurity },
      { path: "reports", Component: AdminReports },
    ],
  },
]);