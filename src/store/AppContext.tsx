import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import {
  STUDENTS,
  QUIZZES,
  QUESTIONS,
  CHAPTERS,
  LESSONS,
  HISTORICAL_ATTEMPTS,
  type Student,
  type Quiz,
  type Question,
  type Chapter,
  type Lesson,
  type SessionAnswer,
  type HistoricalAttempt,
} from "../data/mockData";

interface AppState {
  students: Student[];
  quizzes: Quiz[];
  questions: Question[];
  chapters: Chapter[];
  lessons: Lesson[];
  attempts: HistoricalAttempt[];

  // Student session
  currentStudent: Student | null;
  sessionQuizId: string | null;
  wheelResult: 1 | 2 | 3 | null;
  questionsServed: Question[];
  currentQuestionIndex: number;
  currentTries: number;
  sessionAnswers: SessionAnswer[];

  // Admin
  isAdminLoggedIn: boolean;
}

interface AppContextType extends AppState {
  // Student actions
  loginStudent: (name: string) => Student | null;
  logoutStudent: () => void;
  selectQuiz: (quizId: string) => void;
  setWheelResult: (result: 1 | 2 | 3) => void;
  startQuiz: () => void;
  submitAnswer: (
    questionId: string,
    optionIndex: number,
  ) => { correct: boolean; tries: number; shouldTroll: boolean };
  advanceQuestion: () => void;
  completeQuiz: () => { score: number; total: number; answers: SessionAnswer[] };

  // Admin actions
  adminLogin: (username: string, password: string) => boolean;
  adminLogout: () => void;
  addStudent: (name: string) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  assignQuiz: (studentId: string, quizId: string) => void;
  unassignQuiz: (studentId: string, quizId: string) => void;
  sendMessage: (studentId: string, message: string) => void;
  addQuestion: (question: Omit<Question, "id">) => void;
  deleteQuestion: (id: string) => void;
  createQuiz: (quiz: Omit<Quiz, "id">) => void;

  // Helpers
  getQuizzesForStudent: (studentId: string) => Quiz[];
  getChapterForLesson: (lessonId: string) => Chapter | undefined;
  getLessonForQuiz: (quizId: string) => Lesson | undefined;
  getAttemptsForStudent: (studentId: string) => HistoricalAttempt[];
  getBestScoreForQuiz: (studentId: string, quizId: string) => number | null;
  getQuestionsForQuiz: (quizId: string) => Question[];
}

const AppContext = createContext<AppContextType | null>(null);

let studentIdCounter = 6;
let questionIdCounter = 100;
let quizIdCounter = 5;

export function AppProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(STUDENTS);
  const [quizzes, setQuizzes] = useState<Quiz[]>(QUIZZES);
  const [questions, setQuestions] = useState<Question[]>(QUESTIONS);
  const [attempts, setAttempts] = useState<HistoricalAttempt[]>(HISTORICAL_ATTEMPTS);

  // Student session
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [sessionQuizId, setSessionQuizId] = useState<string | null>(null);
  const [wheelResult, setWheelResultState] = useState<1 | 2 | 3 | null>(null);
  const [questionsServed, setQuestionsServed] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentTries, setCurrentTries] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);

  // Admin
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getQuestionsForQuiz = useCallback(
    (quizId: string) => questions.filter((q) => q.quizId === quizId),
    [questions],
  );

  const getQuizzesForStudent = useCallback(
    (studentId: string) => {
      const student = students.find((s) => s.id === studentId);
      if (!student) return [];
      return quizzes.filter((q) => student.assignedQuizIds.includes(q.id));
    },
    [students, quizzes],
  );

  const getChapterForLesson = useCallback(
    (lessonId: string) => {
      const lesson = LESSONS.find((l) => l.id === lessonId);
      return lesson ? CHAPTERS.find((c) => c.id === lesson.chapterId) : undefined;
    },
    [],
  );

  const getLessonForQuiz = useCallback(
    (quizId: string) => LESSONS.find((l) => l.quizIds.includes(quizId)),
    [],
  );

  const getAttemptsForStudent = useCallback(
    (studentId: string) => attempts.filter((a) => a.userId === studentId),
    [attempts],
  );

  const getBestScoreForQuiz = useCallback(
    (studentId: string, quizId: string) => {
      const studentAttempts = attempts.filter(
        (a) => a.userId === studentId && a.quizId === quizId,
      );
      if (studentAttempts.length === 0) return null;
      return Math.max(...studentAttempts.map((a) => a.score / a.total));
    },
    [attempts],
  );

  // ─── Student actions ──────────────────────────────────────────────────────

  const loginStudent = useCallback(
    (name: string): Student | null => {
      const student = students.find((s) => s.name.toLowerCase() === name.toLowerCase().trim());
      if (student) {
        setCurrentStudent(student);
        return student;
      }
      return null;
    },
    [students],
  );

  const logoutStudent = useCallback(() => {
    setCurrentStudent(null);
    setSessionQuizId(null);
    setWheelResultState(null);
    setQuestionsServed([]);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
  }, []);

  const selectQuiz = useCallback((quizId: string) => {
    setSessionQuizId(quizId);
    setWheelResultState(null);
    setQuestionsServed([]);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
  }, []);

  const setWheelResult = useCallback((result: 1 | 2 | 3) => {
    setWheelResultState(result);
  }, []);

  const startQuiz = useCallback(() => {
    if (!sessionQuizId || !wheelResult) return;
    const quiz = quizzes.find((q) => q.id === sessionQuizId);
    if (!quiz) return;
    const pool = questions.filter((q) => quiz.questionPoolIds.includes(q.id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const served = shuffled.slice(0, wheelResult);
    setQuestionsServed(served);
    setCurrentQuestionIndex(0);
    setCurrentTries(0);
    setSessionAnswers([]);
  }, [sessionQuizId, wheelResult, quizzes, questions]);

  const submitAnswer = useCallback(
    (
      questionId: string,
      optionIndex: number,
    ): { correct: boolean; tries: number; shouldTroll: boolean } => {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return { correct: false, tries: 1, shouldTroll: false };

      const correct = optionIndex === question.correctOptionIndex;
      const newTries = currentTries + 1;
      setCurrentTries(newTries);

      const shouldTroll = !correct && newTries === 3;

      if (correct || newTries >= 3) {
        const answer: SessionAnswer = {
          questionId,
          chosenOptionIndex: optionIndex,
          correct,
          tries: newTries,
          trolled: shouldTroll,
        };
        setSessionAnswers((prev) => [...prev, answer]);
      }

      return { correct, tries: newTries, shouldTroll };
    },
    [questions, currentTries],
  );

  const advanceQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setCurrentTries(0);
  }, []);

  const completeQuiz = useCallback((): {
    score: number;
    total: number;
    answers: SessionAnswer[];
  } => {
    const score = sessionAnswers.filter((a) => a.correct).length;
    const total = questionsServed.length;

    if (currentStudent && sessionQuizId) {
      const newAttempt: HistoricalAttempt = {
        id: `a${Date.now()}`,
        userId: currentStudent.id,
        quizId: sessionQuizId,
        wheelResult: wheelResult ?? 1,
        score,
        total,
        completedAt: new Date().toISOString(),
        answers: sessionAnswers,
      };
      setAttempts((prev) => [...prev, newAttempt]);
    }

    return { score, total, answers: sessionAnswers };
  }, [sessionAnswers, questionsServed, currentStudent, sessionQuizId, wheelResult]);

  // ─── Admin actions ────────────────────────────────────────────────────────

  const adminLogin = useCallback((username: string, password: string): boolean => {
    if (username === "admin" && password === "password123") {
      setIsAdminLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  const adminLogout = useCallback(() => setIsAdminLoggedIn(false), []);

  const addStudent = useCallback((name: string) => {
    const newStudent: Student = {
      id: `s${studentIdCounter++}`,
      name,
      createdAt: new Date().toISOString().split("T")[0],
      assignedQuizIds: [],
      adminMessage: null,
    };
    setStudents((prev) => [...prev, newStudent]);
  }, []);

  const updateStudent = useCallback((id: string, updates: Partial<Student>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const assignQuiz = useCallback((studentId: string, quizId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId && !s.assignedQuizIds.includes(quizId)
          ? { ...s, assignedQuizIds: [...s.assignedQuizIds, quizId] }
          : s,
      ),
    );
  }, []);

  const unassignQuiz = useCallback((studentId: string, quizId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, assignedQuizIds: s.assignedQuizIds.filter((id) => id !== quizId) }
          : s,
      ),
    );
  }, []);

  const sendMessage = useCallback((studentId: string, message: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              adminMessage: {
                text: message,
                timestamp: new Date().toISOString().split("T")[0],
              },
            }
          : s,
      ),
    );
  }, []);

  const addQuestion = useCallback((question: Omit<Question, "id">) => {
    const newQuestion: Question = { ...question, id: `custom-${questionIdCounter++}` };
    setQuestions((prev) => [...prev, newQuestion]);
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === question.quizId
          ? { ...q, questionPoolIds: [...q.questionPoolIds, newQuestion.id] }
          : q,
      ),
    );
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setQuizzes((prev) =>
      prev.map((q) => ({
        ...q,
        questionPoolIds: q.questionPoolIds.filter((qId) => qId !== id),
      })),
    );
  }, []);

  const createQuiz = useCallback((quiz: Omit<Quiz, "id">) => {
    const newQuiz: Quiz = { ...quiz, id: `q${quizIdCounter++}` };
    setQuizzes((prev) => [...prev, newQuiz]);
  }, []);

  const value: AppContextType = {
    students,
    quizzes,
    questions,
    chapters: CHAPTERS,
    lessons: LESSONS,
    attempts,
    currentStudent,
    sessionQuizId,
    wheelResult,
    questionsServed,
    currentQuestionIndex,
    currentTries,
    sessionAnswers,
    isAdminLoggedIn,
    loginStudent,
    logoutStudent,
    selectQuiz,
    setWheelResult,
    startQuiz,
    submitAnswer,
    advanceQuestion,
    completeQuiz,
    adminLogin,
    adminLogout,
    addStudent,
    updateStudent,
    deleteStudent,
    assignQuiz,
    unassignQuiz,
    sendMessage,
    addQuestion,
    deleteQuestion,
    createQuiz,
    getQuizzesForStudent,
    getChapterForLesson,
    getLessonForQuiz,
    getAttemptsForStudent,
    getBestScoreForQuiz,
    getQuestionsForQuiz,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
