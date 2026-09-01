import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { Students, Teacher, QuizTaking, type QuestionServed, type AttemptSummary, type ActiveAttempt } from "../api/client";
import type {
  Student,
  Quiz,
  Question,
  Chapter,
  Lesson,
  Message,
  QuizSessionAnswer,
} from "../data/types";

// Student identity + in-progress quiz session persistence so a browser
// refresh (S3C-1) doesn't boot the student back to the name screen.
const STUDENT_KEY = "quizz.student";
const RESUME_KEY = "quizz.resumeAttemptId";

interface AppState {
  // Catalogue (teacher-visible data)
  chapters: Chapter[];
  lessons: Lesson[];
  quizzes: Quiz[];
  questions: Question[];
  students: Student[];
  messages: Message[];

  // Student session
  currentStudent: Student | null;
  sessionQuizId: string | null;
  wheelResult: 1 | 2 | 3 | null;
  questionsServed: QuestionServed[];
  currentQuestionIndex: number;
  currentTries: number;
  sessionAnswers: QuizSessionAnswer[];
  attemptId: string | null;
  attemptSummary: AttemptSummary | null;

  // Resume-on-reload
  pendingResume: ActiveAttempt | null;

  // Teacher session
  teacherToken: string | null;
  teacherName: string;

  // Loading flags
  loading: boolean;
  error: string | null;
}

interface AppContextType extends AppState {
  // Catalog refresh
  refreshCatalog: () => Promise<void>;

  // Student
  loginStudent: (name: string) => Promise<Student | null>;
  logoutStudent: () => void;
  selectQuiz: (quizId: string) => void;
  clearSession: () => void;
  setWheelResult: (result: 1 | 2 | 3) => void;
  startQuiz: (served: QuestionServed[], attemptId: string) => void;
  submitAnswer: (
    questionId: string,
    optionIndex: number,
    chosenOptionsHistory: number[],
    timeSpentSeconds: number,
  ) => Promise<{
    correct: boolean;
    tries: number;
    shouldTroll: boolean;
    trollVideoUrl: string | null;
  }>;
  advanceQuestion: () => void;
  completeQuiz: (summary: AttemptSummary) => { score: number; total: number; answers: QuizSessionAnswer[] };
  loadResume: (attempt: ActiveAttempt) => void;
  clearResume: () => void;

  // Teacher
  teacherLogin: (username: string, password: string) => Promise<boolean>;
  teacherLogout: () => void;
  teacherUpdateUsername: (newUsername: string) => Promise<{ ok: boolean; error?: string }>;
  teacherUpdatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>;

  // Teacher-side mutators
  refreshStudents: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshQuestions: () => Promise<void>;
  refreshQuizzes: () => Promise<void>;
  refreshChapters: () => Promise<void>;
  refreshLessons: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Catalog
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Student session
  const [currentStudent, setCurrentStudent] = useState<Student | null>(() => {
    try {
      const raw = localStorage.getItem(STUDENT_KEY);
      return raw ? (JSON.parse(raw) as Student) : null;
    } catch {
      return null;
    }
  });
  const [sessionQuizId, setSessionQuizId] = useState<string | null>(null);
  const [wheelResult, setWheelResultState] = useState<1 | 2 | 3 | null>(null);
  const [questionsServed, setQuestionsServed] = useState<QuestionServed[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTries, setCurrentTries] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<QuizSessionAnswer[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptSummary, setAttemptSummary] = useState<AttemptSummary | null>(null);
  const [pendingResume, setPendingResume] = useState<ActiveAttempt | null>(null);

  // Teacher
  const [teacherToken, setTeacherToken] = useState<string | null>(
    () => localStorage.getItem("quizz.teacherToken"),
  );
  const [teacherName, setTeacherName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Catalog ────────────────────────────────────────────────────────────

  const refreshChapters = useCallback(async () => {
    try {
      setChapters(await Teacher.chapters());
    } catch (e) {
      console.warn("chapters", e);
    }
  }, []);

  const refreshLessons = useCallback(async () => {
    try {
      setLessons(await Teacher.lessons());
    } catch (e) {
      console.warn("lessons", e);
    }
  }, []);

  const refreshQuizzes = useCallback(async () => {
    try {
      setQuizzes(await Teacher.quizzes());
    } catch (e) {
      console.warn("quizzes", e);
    }
  }, []);

  const refreshQuestions = useCallback(async () => {
    try {
      setQuestions(await Teacher.questions());
    } catch (e) {
      console.warn("questions", e);
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      setStudents(await Teacher.students());
    } catch (e) {
      console.warn("students", e);
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!currentStudent) return;
    try {
      setMessages(await Students.messages(currentStudent.id));
    } catch (e) {
      console.warn("messages", e);
    }
  }, [currentStudent]);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshChapters(),
        refreshLessons(),
        refreshQuizzes(),
        refreshQuestions(),
        refreshStudents(),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [refreshChapters, refreshLessons, refreshQuizzes, refreshQuestions, refreshStudents]);

  // Auto-load catalog when a teacher token exists.
  useEffect(() => {
    if (teacherToken) {
      Teacher.me()
        .then((m) => setTeacherName(m.username || m.displayName))
        .catch(() => {
          localStorage.removeItem("quizz.teacherToken");
          setTeacherToken(null);
        });
      refreshCatalog();
    }
  }, [teacherToken, refreshCatalog]);

  // Auto-load messages when student changes.
  useEffect(() => {
    if (currentStudent) refreshMessages();
  }, [currentStudent, refreshMessages]);

  // Restore a persisted student session after a browser refresh (S3C-1).
  // Re-validates against the server and, if there's an in-progress attempt,
  // surfaces the "Continue or Cancel" resume prompt.
  useEffect(() => {
    if (!currentStudent) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await Students.enter(currentStudent.name);
        if (cancelled) return;
        if (r.student.id === "unknown") {
          // The student no longer exists server-side — clear the stale session.
          setCurrentStudent(null);
          localStorage.removeItem(STUDENT_KEY);
          return;
        }
        setCurrentStudent(r.student);
        setQuizzes(r.quizzes);
        setChapters(r.chapters ?? []);
        setLessons(r.lessons ?? []);

        // If we only just came from the login action we don't want to prompt,
        // but on a genuine reload we do. Track via the resume key: it is set
        // when a quiz actually starts and cleared on completion/abandon.
        if (localStorage.getItem(RESUME_KEY)) {
          const { attempt } = await Students.activeAttempt(currentStudent.id);
          if (cancelled) return;
          if (attempt) setPendingResume(attempt);
          else localStorage.removeItem(RESUME_KEY);
        }
      } catch {
        // Offline or server error — keep the cached student so the refresh
        // still lands on the dashboard instead of the login screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStudent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loginStudent = useCallback(async (name: string): Promise<Student | null> => {
    setLoading(true);
    setError(null);
    try {
      const r = await Students.enter(name);
      if (r.student.id === "unknown") return null;
      setCurrentStudent(r.student);
      localStorage.setItem(STUDENT_KEY, JSON.stringify(r.student));
      setQuizzes(r.quizzes);
      // The student view groups quizzes by chapter → lesson, so we also need
      // the catalogue. Server returns the full chapter + lesson list as part
      // of /enter so the dashboard renders correctly without teacher auth.
      setChapters(r.chapters ?? []);
      setLessons(r.lessons ?? []);
      return r.student;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutStudent = useCallback(() => {
    setCurrentStudent(null);
    localStorage.removeItem(STUDENT_KEY);
    localStorage.removeItem(RESUME_KEY);
    clearSession();
  }, []);

  const selectQuiz = useCallback((quizId: string) => {
    setSessionQuizId(quizId);
    setWheelResultState(null);
    setQuestionsServed([]);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
    setAttemptId(null);
    setAttemptSummary(null);
  }, []);

  const clearSession = useCallback(() => {
    setSessionQuizId(null);
    setWheelResultState(null);
    setQuestionsServed([]);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
    setAttemptId(null);
    setAttemptSummary(null);
  }, []);

  // Listen for the 401 events fired by the API client when a token is
  // rejected, and clear the local session so the app routes the user to the
  // right landing page instead of leaving them on a broken screen.
  useEffect(() => {
    const onStudentOut = () => {
      setCurrentStudent(null);
      localStorage.removeItem(STUDENT_KEY);
      localStorage.removeItem(RESUME_KEY);
      clearSession();
    };
    const onTeacherOut = () => {
      setTeacherToken(null);
      setTeacherName("");
    };
    window.addEventListener("quizz:student-signed-out", onStudentOut);
    window.addEventListener("quizz:teacher-signed-out", onTeacherOut);
    return () => {
      window.removeEventListener("quizz:student-signed-out", onStudentOut);
      window.removeEventListener("quizz:teacher-signed-out", onTeacherOut);
    };
  }, [clearSession]);

  const setWheelResult = useCallback((result: 1 | 2 | 3) => {
    setWheelResultState(result);
  }, []);

  const startQuiz = useCallback((served: QuestionServed[], aid: string) => {
    setQuestionsServed(served);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
    setAttemptId(aid);
    // Arm the resume prompt for this attempt (cleared on complete/cancel).
    localStorage.setItem(RESUME_KEY, aid);
  }, []);

  const submitAnswer = useCallback(
    async (
      questionId: string,
      optionIndex: number,
      chosenOptionsHistory: number[],
      timeSpentSeconds: number,
    ): Promise<{
      correct: boolean;
      tries: number;
      shouldTroll: boolean;
      trollVideoUrl: string | null;
    }> => {
      if (!attemptId)
        return { correct: false, tries: 0, shouldTroll: false, trollVideoUrl: null };
      try {
        // Route through the API client (not a raw fetch) so the student
        // session JWT is attached. A raw fetch here would send no
        // Authorization header and the backend would return 401, which
        // previously caused the "Answer failed: 401" errors and prevented
        // the troll video from ever showing on the 3rd wrong try.
        const data = await QuizTaking.submitAnswer(attemptId, {
          questionId,
          chosenOptionIndex: optionIndex,
          chosenOptionsHistory,
          timeSpentSeconds,
        });
        setCurrentTries(data.tries);
        if (data.answered) {
          setSessionAnswers((prev) => [
            ...prev,
            {
              questionId,
              chosenOptionIndex: optionIndex,
              correct: data.correct,
              tries: data.tries,
              trolled: data.shouldTroll,
            },
          ]);
        }
        return data;
      } catch (e) {
        console.error(e);
        return { correct: false, tries: 0, shouldTroll: false, trollVideoUrl: null };
      }
    },
    [attemptId],
  );

  const advanceQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setCurrentTries(0);
  }, []);

  const completeQuiz = useCallback(
    (summary: AttemptSummary) => {
      const answers: QuizSessionAnswer[] = summary.breakdown.map((b) => ({
        questionId: b.questionId,
        chosenOptionIndex: b.chosenOptionIndex ?? 0,
        correct: b.correct,
        tries: b.tries,
        trolled: b.trolled,
      }));
      setSessionAnswers(answers);
      setAttemptSummary(summary);
      localStorage.removeItem(RESUME_KEY);
      // Refresh the student's quiz list so completed quizzes show their
      // updated bestScore / "Done" state immediately (server now has the
      // completed attempt).
      if (currentStudent && currentStudent.id !== "unknown") {
        Students.quizzes(currentStudent.id)
          .then((list) => setQuizzes(list))
          .catch(() => {
            // non-fatal — quiz list will refresh on next enter
          });
      }
      return { score: summary.score, total: summary.total, answers };
    },
    [currentStudent],
  );

  // Resume: reconstruct the in-progress quiz session from the server snapshot
  // and jump straight back to the question the student was on.
  const loadResume = useCallback((attempt: ActiveAttempt) => {
    setPendingResume(null);
    setSessionQuizId(attempt.quizId);
    setWheelResultState(attempt.wheelResult);
    setQuestionsServed(attempt.questionsServed);
    setCurrentQuestionIndex(attempt.nextQuestionIndex);
    setCurrentTries(attempt.currentTries);
    setSessionAnswers([]);
    setAttemptId(attempt.attemptId);
    // Re-arm so a second refresh mid-quiz still offers resume.
    localStorage.setItem(RESUME_KEY, attempt.attemptId);
  }, []);

  // Cancel: abandon the in-progress attempt server-side and drop the prompt.
  const clearResume = useCallback(async () => {
    const resumeId = localStorage.getItem(RESUME_KEY);
    localStorage.removeItem(RESUME_KEY);
    setPendingResume(null);
    if (resumeId) {
      try {
        await QuizTaking.abandon(resumeId);
      } catch {
        // ignore — already cleared locally
      }
    }
    clearSession();
  }, [clearSession]);

  // ─── Teacher actions ────────────────────────────────────────────────────

  const teacherLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const r = await Teacher.login(username, password);
      setTeacherToken(r.token);
      setTeacherName(r.teacher.username);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }, []);

  const teacherLogout = useCallback(() => {
    Teacher.logout();
    setTeacherToken(null);
    setTeacherName("");
  }, []);

  const teacherUpdateUsername = useCallback(
    async (newUsername: string): Promise<{ ok: boolean; error?: string }> => {
      const trimmed = newUsername.trim();
      if (!trimmed) {
        return { ok: false, error: "Username cannot be empty" };
      }
      if (trimmed === teacherName) {
        return { ok: false, error: "That's already your username" };
      }
      try {
        const r = await Teacher.updateUsername(trimmed);
        setTeacherName(r.username);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
    [teacherName],
  );

  const teacherUpdatePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!currentPassword) {
        return { ok: false, error: "Enter your current password" };
      }
      if (!newPassword) {
        return { ok: false, error: "Enter a new password" };
      }
      if (newPassword === currentPassword) {
        return { ok: false, error: "New password must differ from current" };
      }
      try {
        const r = await Teacher.updatePassword(currentPassword, newPassword);
        // Server mints a fresh JWT on password change so other open tabs
        // pick up the new credentials without forcing a re-login.
        setTeacherToken(r.token);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
    [],
  );

  const value: AppContextType = {
    chapters,
    lessons,
    quizzes,
    questions,
    students,
    messages,
    currentStudent,
    sessionQuizId,
    wheelResult,
    questionsServed,
    currentQuestionIndex,
    currentTries,
    sessionAnswers,
    attemptId,
    attemptSummary,
    pendingResume,
    teacherToken,
    teacherName,
    loading,
    error,
    refreshCatalog,
    loginStudent,
    logoutStudent,
    selectQuiz,
    clearSession,
    setWheelResult,
    startQuiz,
    submitAnswer,
    advanceQuestion,
    completeQuiz,
    loadResume,
    clearResume,
    teacherLogin,
    teacherLogout,
    teacherUpdateUsername,
    teacherUpdatePassword,
    refreshStudents,
    refreshMessages,
    refreshQuestions,
    refreshQuizzes,
    refreshChapters,
    refreshLessons,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}