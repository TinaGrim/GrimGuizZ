// QuizZ API client. Talks to the FastAPI backend on the same host (Vite proxies
// /api -> :8000 in dev).

const TOKEN_KEY = "quizz.teacherToken";
const STUDENT_TOKEN_KEY = "quizz.studentToken";

// In dev (Vite, port 8443) the Vite proxy forwards `/api/*` to the
// FastAPI backend on port 8000, so a relative path is fine. In prod
// (Vercel) the frontend has no `/api` server behind it, so we need to
// point at the Render-hosted FastAPI origin via `VITE_API_BASE`.
// Empty string is the dev default; Vercel sets this to e.g.
// `https://quizz-api.onrender.com`.
function apiUrl(path: string): string {
  const base = (import.meta.env?.VITE_API_BASE as string | undefined) ?? "";
  return path.startsWith("http") ? path : `${base}/api${path}`;
}

export interface Student {
  id: string;
  name: string;
  createdAt: string;
  assignedQuizIds: string[];
  token?: string;
}

export interface Chapter {
  id: string;
  name: string;
  description?: string;
  subject?: "math" | "physics" | "other";
  lessonIds?: string[];
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  quizIds?: string[];
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questionPoolIds: string[];
  status: "draft" | "scheduled" | "active" | "closed" | "archived";
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  trollVideoId?: string | null;
  timerMinutes?: number | null;
  bestScore?: number | null;
}

export interface Question {
  id: string;
  quizId: string;
  prompt: string;
  imageUrl?: string | null;
  trollVideoId?: string | null;
  timeLimitMinutes?: number | null;
  options: string[];
  correctOptionIndex: number;
  order: number;
}

export interface QuestionServed {
  questionId: string;
  prompt: string;
  imageUrl?: string | null;
  trollVideoId?: string | null;
  timeLimitMinutes?: number | null;
  options: string[];
  order?: number;
}

export interface AttemptAnswerOut {
  questionId: string;
  chosenOptionIndex: number | null;
  chosenOptionsHistory: number[];
  tries: number;
  correct: boolean;
  trolled: boolean;
  firstTryCorrect: boolean;
  timeSpentSeconds: number;
  prompt: string;
  imageUrl?: string | null;
  options: string[];
  correctOptionIndex: number;
}

export interface SpinResponse {
  wheelResult: 1 | 2 | 3;
  maxWheelValue: 1 | 2 | 3;
  questionsServed: QuestionServed[];
}

export interface AttemptSummary {
  id: string;
  score: number;
  total: number;
  wheelResult: number;
  totalTimeSpentSeconds: number;
  breakdown: AttemptAnswerOut[];
  completedAt: string;
}

export interface AnswerResponse {
  correct: boolean;
  tries: number;
  shouldTroll: boolean;
  trollVideoUrl: string | null;
  questionId: string;
  answered: boolean;
}

export interface ActiveAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string | null;
  lessonTitle: string | null;
  chapterName: string | null;
  wheelResult: 1 | 2 | 3;
  startedAt: string;
  questionsServed: QuestionServed[];
  nextQuestionIndex: number;
  currentTries: number;
  currentHistory: number[];
  total: number;
}

export interface ActiveAttemptResponse {
  attempt: ActiveAttempt | null;
}

export interface Message {
  id: string;
  studentId: string;
  teacherId: string;
  teacherName: string;
  text: string;
  createdAt: string;
  readAt: string | null;
}

export interface Asset {
  id: string;
  type: "image" | "gif" | "video";
  url: string;
  usedIn: { questionId: string; prompt: string; role?: string }[];
  uploadedAt: string;
}

export interface Quote {
  id: string;
  text: string;
  createdAt: string;
}

export type MasteryLabel = "Strong" | "Getting there" | "Needs practice";
export type TrendLabel = "improving" | "declining" | "steady";
export type StatusFlag = "on_track" | "falling_behind" | "needs_attention";

export interface ScoreHistoryPoint {
  bucket: string;
  percent: number;
}

export interface PerChapterStats {
  chapterId: string;
  chapterName: string;
  subject: "math" | "physics" | "other";
  attempts: number;
  correct: number;
  total: number;
  percent: number;
  firstTryCorrectRate: number;
  mastery: MasteryLabel;
  trend: TrendLabel;
}

export interface PerLessonStats {
  lessonId: string;
  lessonTitle: string;
  chapterId: string | null;
  chapterName: string | null;
  subject: "math" | "physics" | "other";
  attempts: number;
  avgScore: number;
  percent: number;
  firstTryCorrectRate: number;
  medianTimeSeconds: number;
  trend: TrendLabel;
  mastery: MasteryLabel;
}

export interface RecentActivity {
  attemptId: string;
  quizId: string;
  quizTitle: string | null;
  chapterName: string | null;
  lessonTitle: string | null;
  score: number;
  total: number;
  completedAt: string;
  timeSpentSeconds: number;
  firstTryCorrectCount: number;
}

export interface StudentReport {
  range: "week" | "month" | "year";
  attemptCount: number;
  overallPercent: number;
  firstTryCorrectRate: number;
  trend: TrendLabel;
  streakDays: number;
  mostImprovedChapterName: string | null;
  perChapter: PerChapterStats[];
  perLesson: PerLessonStats[];
  scoreHistory: ScoreHistoryPoint[];
  recent: RecentActivity[];
  // teacher-only (populated on /api/teacher/reports/:id, omitted from /api/students/:id/report):
  student?: { id: string; name: string; lastActiveAt: string | null; status: StatusFlag };
  timeOnTask?: {
    perQuestionMedianSeconds: number;
    classMedianSeconds: number;
    flagFast: boolean;
    flagSlow: boolean;
  };
  wrongAnswerPatterns?: {
    lessonId: string;
    lessonTitle: string | null;
    chapterName: string | null;
    wrongOptionIndex: number;
    frequency: number;
    samplePrompt: string;
  }[];
  messageHistory?: { id: string; text: string; createdAt: string; readAt: string | null }[];
}

export interface ClassLessonDifficulty {
  lessonId: string;
  lessonTitle: string;
  chapterName: string | null;
  subject: "math" | "physics" | "other";
  attempts: number;
  avgScore: number;
  firstTryCorrectRate: number;
  firstTryCorrectRateLabel: MasteryLabel;
}

export interface ClassDropOff {
  studentId: string;
  name: string;
  lastActiveAt: string;
  daysSince: number;
}

export interface ClassStudent {
  id: string;
  name: string;
  assignedCount: number;
  attemptCount: number;
  completedAny: boolean;
  averageScore: number;
  bestScore: number;
  firstTryCorrectRate: number;
  firstTryCorrectCount: number;
  firstTryQuestions: number;
  lastActiveAt: string | null;
  recent: RecentActivity[];
}

export interface ClassReport {
  totalStudents: number;
  completionRate: number;
  averageScore: number;
  firstTryCorrectRate: number;
  students: ClassStudent[];
  perLessonDifficulty: ClassLessonDifficulty[];
  engagementDropOff: ClassDropOff[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  _ignored?: boolean,
  tokenOverride?: string,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const isStudent = tokenOverride !== undefined;
  const token = tokenOverride ?? getTeacherToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // See `apiUrl` above for why this prefix is `""` in dev.
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail ?? msg;
    } catch {
      // not JSON
    }
    if (res.status === 401) {
      // Token expired or otherwise rejected. Clear it locally and let the
      // app decide what to do (navigate to login or to the landing page).
      try {
        if (isStudent) {
          localStorage.removeItem(STUDENT_TOKEN_KEY);
          window.dispatchEvent(new CustomEvent("quizz:student-signed-out"));
        } else {
          localStorage.removeItem(TOKEN_KEY);
          window.dispatchEvent(new CustomEvent("quizz:teacher-signed-out"));
        }
      } catch {
        // localStorage unavailable — best effort
      }
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get("Content-Type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

// ─── Student ─────────────────────────────────────────────────────────────────

function getStudentToken(): string {
  try {
    return localStorage.getItem(STUDENT_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function studentRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStudentToken();
  return request<T>(path, init, undefined, token);
}

export const Students = {
  enter: async (name: string) => {
    const r = await request<{
      student: Student;
      quizzes: Quiz[];
      hasQuizzes: boolean;
      chapters: Chapter[];
      lessons: Lesson[];
    }>("/students/enter", { method: "POST", body: JSON.stringify({ name }) });
    if (r.student?.token) {
      try {
        localStorage.setItem(STUDENT_TOKEN_KEY, r.student.token);
      } catch {
        // localStorage unavailable — best effort
      }
    }
    return r;
  },
  quizzes: (studentId: string) => studentRequest<Quiz[]>(`/students/${studentId}/quizzes`),
  messages: (studentId: string) =>
    studentRequest<Message[]>(`/students/${studentId}/messages`).then((msgs) => {
      // Only the newest message carries the unread "new" badge. Older unread
      // messages are marked read locally so the badge doesn't linger on stale
      // entries on every visit — the server sorts newest-first, so msgs[0] is
      // the latest. readAt is advisory/client-side here (there's no read API).
      const latest = msgs.length > 0 ? new Date(msgs[0].createdAt).getTime() : 0;
      msgs.forEach((m) => {
        if (!m.readAt && new Date(m.createdAt).getTime() < latest) {
          m.readAt = new Date().toISOString();
        }
      });
      return msgs;
    }),
  report: (studentId: string, range: "week" | "month" | "year" = "month") =>
    studentRequest<StudentReport>(`/students/${studentId}/report?range=${range}`),
  activeAttempt: (studentId: string) =>
    studentRequest<ActiveAttemptResponse>(`/students/${studentId}/active-attempt`),
  randomQuote: () => request<Quote>("/quotes/random"),
  quotes: () => request<Quote[]>("/quotes"),
};

// ─── Quiz-taking ─────────────────────────────────────────────────────────────

export const QuizTaking = {
  spin: (quizId: string) =>
    studentRequest<SpinResponse>(`/quizzes/${quizId}/spin`, { method: "POST" }),
  createAttempt: (body: {
    quizId: string;
    wheelResult: 1 | 2 | 3;
    deviceType?: string;
  }) =>
    studentRequest<{ id: string; wheelResult: number; questionsServed: QuestionServed[]; total: number }>(
      "/attempts",
      { method: "POST", body: JSON.stringify(body) },
    ),
  submitAnswer: (
    attemptId: string,
    body: {
      questionId: string;
      chosenOptionIndex: number;
      chosenOptionsHistory?: number[];
      timeSpentSeconds?: number;
    },
  ) =>
    studentRequest<AnswerResponse>(`/attempts/${attemptId}/answer`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  complete: (attemptId: string) =>
    studentRequest<AttemptSummary>(`/attempts/${attemptId}/complete`, { method: "POST" }),
  abandon: (attemptId: string) =>
    studentRequest<{ ok: boolean }>(`/attempts/${attemptId}`, { method: "DELETE" }),
};

// ─── Teacher ─────────────────────────────────────────────────────────────────

export const Teacher = {
  login: async (username: string, password: string) => {
    const r = await request<{ token: string; teacher: { id: string; username: string } }>(
      "/teacher/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
    );
    localStorage.setItem(TOKEN_KEY, r.token);
    return r;
  },
  me: () => request<{ id: string; username: string; displayName: string }>("/teacher/me"),
  logout: () => localStorage.removeItem(TOKEN_KEY),
  updateUsername: (username: string) =>
    request<{ id: string; username: string; displayName: string }>(
      "/teacher/me/username",
      { method: "POST", body: JSON.stringify({ username }) },
    ),
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true; token: string }>("/teacher/me/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  chapters: () => request<Chapter[]>("/teacher/chapters"),
  createChapter: (body: { name: string; description?: string }) =>
    request<Chapter>("/teacher/chapters", { method: "POST", body: JSON.stringify(body) }),
  updateChapter: (id: string, body: Partial<{ name: string; description: string }>) =>
    request<Chapter>(`/teacher/chapters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteChapter: (id: string) =>
    request<{ ok: boolean }>(`/teacher/chapters/${id}`, { method: "DELETE" }),

  lessons: () => request<Lesson[]>("/teacher/lessons"),
  createLesson: (body: { chapterId: string; title: string }) =>
    request<Lesson>("/teacher/lessons", { method: "POST", body: JSON.stringify(body) }),
  updateLesson: (id: string, body: Partial<{ title: string; chapterId: string }>) =>
    request<Lesson>(`/teacher/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteLesson: (id: string) =>
    request<{ ok: boolean }>(`/teacher/lessons/${id}`, { method: "DELETE" }),

  quizzes: () => request<Quiz[]>("/teacher/quizzes"),
  createQuiz: (body: {
    lessonId: string;
    title: string;
    questionPoolIds?: string[];
    status?: Quiz["status"];
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    trollVideoId?: string | null;
    timerMinutes?: number | null;
  }) =>
    request<Quiz>("/teacher/quizzes", { method: "POST", body: JSON.stringify(body) }),
  updateQuiz: (id: string, body: Partial<Quiz>) =>
    request<Quiz>(`/teacher/quizzes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteQuiz: (id: string) =>
    request<{ ok: boolean }>(`/teacher/quizzes/${id}`, { method: "DELETE" }),

  questions: () => request<Question[]>("/teacher/questions"),
  createQuestion: (body: Omit<Question, "id">) =>
    request<Question>("/teacher/questions", { method: "POST", body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: Partial<Question>) =>
    request<Question>(`/teacher/questions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteQuestion: (id: string) =>
    request<{ ok: boolean }>(`/teacher/questions/${id}`, { method: "DELETE" }),

  students: () => request<Student[]>("/teacher/students"),
  createStudent: (body: { name: string }) =>
    request<Student>("/teacher/students", { method: "POST", body: JSON.stringify(body) }),
  updateStudent: (id: string, body: { name: string }) =>
    request<Student>(`/teacher/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteStudent: (id: string) =>
    request<{ ok: boolean }>(`/teacher/students/${id}`, { method: "DELETE" }),

  assign: (quizId: string, studentIds: string[]) =>
    request<{ ok: boolean }>("/teacher/assign", {
      method: "POST",
      body: JSON.stringify({ quizId, studentIds }),
    }),
  assignOne: (studentId: string, quizId: string) =>
    request<{ ok: boolean }>(`/teacher/students/${studentId}/assign`, {
      method: "POST",
      body: JSON.stringify({ quizId }),
    }),
  unassignOne: (studentId: string, quizId: string) =>
    request<{ ok: boolean }>(`/teacher/students/${studentId}/unassign`, {
      method: "POST",
      body: JSON.stringify({ quizId }),
    }),

  sendMessage: (studentId: string, text: string) =>
    request<Message>("/teacher/messages", {
      method: "POST",
      body: JSON.stringify({ studentId, text }),
    }),

  assets: () => request<Asset[]>("/teacher/assets"),
  uploadAsset: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<Asset>("/teacher/assets/upload", { method: "POST", body: fd });
  },
  deleteAsset: (id: string) =>
    request<{ ok: boolean }>(`/teacher/assets/${id}`, { method: "DELETE" }),

  quotes: () => request<Quote[]>("/teacher/quotes"),
  createQuote: (text: string) =>
    request<Quote>("/teacher/quotes", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  updateQuote: (id: string, text: string) =>
    request<Quote>(`/teacher/quotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    }),
  deleteQuote: (id: string) =>
    request<{ ok: boolean }>(`/teacher/quotes/${id}`, { method: "DELETE" }),

  classReport: (range: "week" | "month" | "year" = "month") =>
    request<ClassReport>(`/teacher/reports/class?range=${range}`),
  classReportCsv: (range: "week" | "month" | "year" = "month") =>
    request<string>(`/teacher/reports/class/export.csv?range=${range}`),
  studentReport: (studentId: string, range: "week" | "month" | "year" = "month") =>
    request<StudentReport>(`/teacher/reports/${studentId}?range=${range}`),
  studentAttempt: (studentId: string, attemptId: string) =>
    request<AttemptSummary>(`/teacher/reports/${studentId}/attempts/${attemptId}`),
  studentReportXlsx: async (
    studentId: string,
    range: "week" | "month" | "year" = "month",
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(apiUrl(`/teacher/reports/${studentId}/export.xlsx?range=${range}`), {
      headers: { Authorization: `Bearer ${getTeacherToken()}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const filename = parseContentDispositionFilename(
      res.headers.get("Content-Disposition"),
    );
    return { blob, filename };
  },
  classReportXlsx: async (
    range: "week" | "month" | "year" = "month",
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await fetch(apiUrl(`/teacher/reports/class/export.xlsx?range=${range}`), {
      headers: { Authorization: `Bearer ${getTeacherToken()}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const filename = parseContentDispositionFilename(
      res.headers.get("Content-Disposition"),
    );
    return { blob, filename };
  },
};

function getTeacherToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function parseContentDispositionFilename(header: string | null): string {
  if (!header) return "";
  // RFC 5987 + plain "filename=" form
  const m = header.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  return m ? m[1] : "";
}

export { ApiError };