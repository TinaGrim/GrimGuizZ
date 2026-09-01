// Shared domain types for QuizZ. Backend (FastAPI + MongoDB) is the source of truth;
// these types mirror the API response shapes.

export type QuizStatus = "draft" | "scheduled" | "active" | "closed" | "archived";

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
  status: QuizStatus;
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

export interface Student {
  id: string;
  name: string;
  createdAt: string;
  assignedQuizIds: string[];
}

export interface QuizSessionAnswer {
  questionId: string;
  chosenOptionIndex: number;
  correct: boolean;
  tries: number;
  trolled: boolean;
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

export interface AttemptAnswerOut extends QuestionServed {
  correctOptionIndex: number;
  chosenOptionIndex: number | null;
  tries: number;
  correct: boolean;
  trolled: boolean;
}

export interface AttemptSummary {
  id: string;
  score: number;
  total: number;
  wheelResult: number;
  breakdown: AttemptAnswerOut[];
  completedAt: string;
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

export interface StudentReport {
  range: "week" | "month" | "year";
  attemptCount: number;
  overallPercent: number;
  trend: "improving" | "declining" | "flat";
  perChapter: { chapter: string; correct: number; total: number; percent: number; count: number }[];
  recent: { quizId: string; score: number; total: number; completedAt: string }[];
}

export interface ClassReport {
  totalStudents: number;
  completionRate: number;
  averageScore: number;
  students: {
    id: string;
    name: string;
    assignedCount: number;
    attemptCount: number;
    completedAny: boolean;
    averageScore: number;
  }[];
}