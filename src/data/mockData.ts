export interface Chapter {
  id: string;
  title: string;
  lessonIds: string[];
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  quizIds: string[];
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questionPoolIds: string[];
  status: "draft" | "scheduled" | "active" | "closed";
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface Question {
  id: string;
  quizId: string;
  prompt: string;
  imageUrl?: string | null;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  order: number;
}

export interface Student {
  id: string;
  name: string;
  createdAt: string;
  assignedQuizIds: string[];
  adminMessage?: { text: string; timestamp: string } | null;
}

export interface SessionAnswer {
  questionId: string;
  chosenOptionIndex: number;
  correct: boolean;
  tries: number;
  trolled: boolean;
}

export interface HistoricalAttempt {
  id: string;
  userId: string;
  quizId: string;
  wheelResult: 1 | 2 | 3;
  score: number;
  total: number;
  completedAt: string;
  answers: SessionAnswer[];
}

// ─── Chapters ────────────────────────────────────────────────────────────────

export const CHAPTERS: Chapter[] = [
  {
    id: "ch1",
    title: "Mathematics",
    lessonIds: ["l1", "l2"],
  },
  {
    id: "ch2",
    title: "Physics",
    lessonIds: ["l3", "l4"],
  },
];

// ─── Lessons ─────────────────────────────────────────────────────────────────

export const LESSONS: Lesson[] = [
  { id: "l1", chapterId: "ch1", title: "Algebra", quizIds: ["q1"] },
  { id: "l2", chapterId: "ch1", title: "Geometry & Trigonometry", quizIds: ["q2"] },
  { id: "l3", chapterId: "ch2", title: "Mechanics", quizIds: ["q3"] },
  { id: "l4", chapterId: "ch2", title: "Waves & Light", quizIds: ["q4"] },
];

// ─── Quizzes ─────────────────────────────────────────────────────────────────

export const QUIZZES: Quiz[] = [
  {
    id: "q1",
    lessonId: "l1",
    title: "Algebra Fundamentals",
    questionPoolIds: ["q1-1", "q1-2", "q1-3", "q1-4", "q1-5", "q1-6"],
    status: "active",
  },
  {
    id: "q2",
    lessonId: "l2",
    title: "Geometry & Trigonometry",
    questionPoolIds: ["q2-1", "q2-2", "q2-3", "q2-4", "q2-5", "q2-6"],
    status: "active",
  },
  {
    id: "q3",
    lessonId: "l3",
    title: "Mechanics",
    questionPoolIds: ["q3-1", "q3-2", "q3-3", "q3-4", "q3-5", "q3-6"],
    status: "active",
  },
  {
    id: "q4",
    lessonId: "l4",
    title: "Waves & Light",
    questionPoolIds: ["q4-1", "q4-2", "q4-3", "q4-4", "q4-5", "q4-6"],
    status: "active",
  },
];

// ─── Questions ────────────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  // Quiz 1 — Algebra Fundamentals
  {
    id: "q1-1",
    quizId: "q1",
    prompt: "What is the quadratic formula used to solve ax² + bx + c = 0?",
    imageUrl: null,
    options: [
      "x = (-b ± √(b² - 4ac)) / 2a",
      "x = (-b ± √(b² + 4ac)) / 2a",
      "x = (b ± √(b² - 4ac)) / 2a",
      "x = (-b ± √(4ac - b²)) / 2a",
    ],
    correctOptionIndex: 0,
    order: 1,
  },
  {
    id: "q1-2",
    quizId: "q1",
    prompt: "Solve the equation 2x + 6 = 14 for x.",
    imageUrl: null,
    options: ["x = 3", "x = 4", "x = 5", "x = 8"],
    correctOptionIndex: 1,
    order: 2,
  },
  {
    id: "q1-3",
    quizId: "q1",
    prompt: "In the slope-intercept form of a line, y = mx + b, what does the letter m represent?",
    imageUrl: null,
    options: ["The y-intercept", "The slope of the line", "The x-intercept", "The constant term"],
    correctOptionIndex: 1,
    order: 3,
  },
  {
    id: "q1-4",
    quizId: "q1",
    prompt: "Which of the following is the correct factorization of x² - 9?",
    imageUrl: null,
    options: ["(x - 3)(x - 3)", "(x + 3)(x + 3)", "(x - 3)(x + 3)", "(x - 9)(x + 1)"],
    correctOptionIndex: 2,
    order: 4,
  },
  {
    id: "q1-5",
    quizId: "q1",
    prompt: "What are the solutions to the equation x² = 49?",
    imageUrl: null,
    options: ["x = 7 only", "x = -7 only", "x = 7 and x = -7", "x = 49 and x = -49"],
    correctOptionIndex: 2,
    order: 5,
  },
  {
    id: "q1-6",
    quizId: "q1",
    prompt: "What is the value of 3² + 4²?",
    imageUrl: null,
    options: ["7", "12", "25", "49"],
    correctOptionIndex: 2,
    order: 6,
  },

  // Quiz 2 — Geometry & Trigonometry
  {
    id: "q2-1",
    quizId: "q2",
    prompt: "According to the Pythagorean theorem, for a right triangle with legs a and b and hypotenuse c:",
    imageUrl: null,
    options: ["a + b = c", "a² + b² = c²", "a² - b² = c²", "a × b = c"],
    correctOptionIndex: 1,
    order: 1,
  },
  {
    id: "q2-2",
    quizId: "q2",
    prompt: "What is the formula for the area of a circle with radius r?",
    imageUrl: null,
    options: ["2πr", "πr²", "πd", "4πr²"],
    correctOptionIndex: 1,
    order: 2,
  },
  {
    id: "q2-3",
    quizId: "q2",
    prompt: "What is the exact value of sin(30°)?",
    imageUrl: null,
    options: ["0", "1/2", "√2/2", "1"],
    correctOptionIndex: 1,
    order: 3,
  },
  {
    id: "q2-4",
    quizId: "q2",
    prompt: "What is the sum of the interior angles of any triangle?",
    imageUrl: null,
    options: ["90°", "180°", "270°", "360°"],
    correctOptionIndex: 1,
    order: 4,
  },
  {
    id: "q2-5",
    quizId: "q2",
    prompt: "What is the formula for the volume of a sphere with radius r?",
    imageUrl: null,
    options: ["(4/3)πr³", "πr³", "(2/3)πr³", "4πr²"],
    correctOptionIndex: 0,
    order: 5,
  },
  {
    id: "q2-6",
    quizId: "q2",
    prompt: "What is the exact value of cos(60°)?",
    imageUrl: null,
    options: ["0", "1/2", "√3/2", "1"],
    correctOptionIndex: 1,
    order: 6,
  },

  // Quiz 3 — Mechanics
  {
    id: "q3-1",
    quizId: "q3",
    prompt: "Which equation expresses Newton's second law of motion?",
    imageUrl: null,
    options: ["F = ma", "F = mv", "F = m/a", "F = a/m"],
    correctOptionIndex: 0,
    order: 1,
  },
  {
    id: "q3-2",
    quizId: "q3",
    prompt: "What is the SI unit of force?",
    imageUrl: null,
    options: ["Joule", "Watt", "Newton", "Pascal"],
    correctOptionIndex: 2,
    order: 2,
  },
  {
    id: "q3-3",
    quizId: "q3",
    prompt: "What is the approximate acceleration due to gravity near the Earth's surface?",
    imageUrl: null,
    options: ["3.2 m/s²", "9.8 m/s²", "12.5 m/s²", "19.6 m/s²"],
    correctOptionIndex: 1,
    order: 3,
  },
  {
    id: "q3-4",
    quizId: "q3",
    prompt: "What is the formula for the kinetic energy of an object of mass m moving at speed v?",
    imageUrl: null,
    options: ["KE = mv", "KE = mv²", "KE = (1/2)mv²", "KE = (1/2)mv"],
    correctOptionIndex: 2,
    order: 4,
  },
  {
    id: "q3-5",
    quizId: "q3",
    prompt: "What is the formula for the momentum p of an object of mass m moving at velocity v?",
    imageUrl: null,
    options: ["p = m/v", "p = mv", "p = (1/2)mv²", "p = ma"],
    correctOptionIndex: 1,
    order: 5,
  },
  {
    id: "q3-6",
    quizId: "q3",
    prompt: "Newton's first law states that an object at rest stays at rest and an object in motion stays in motion unless:",
    imageUrl: null,
    options: [
      "It is acted upon by an unbalanced external force",
      "Its mass changes",
      "It is observed by a scientist",
      "It reaches a certain speed",
    ],
    correctOptionIndex: 0,
    order: 6,
  },

  // Quiz 4 — Waves & Light
  {
    id: "q4-1",
    quizId: "q4",
    prompt: "What is the relationship between wave speed v, frequency f, and wavelength λ?",
    imageUrl: null,
    options: ["v = f / λ", "v = λ / f", "v = fλ", "v = f + λ"],
    correctOptionIndex: 2,
    order: 1,
  },
  {
    id: "q4-2",
    quizId: "q4",
    prompt: "What is the approximate speed of light in a vacuum?",
    imageUrl: null,
    options: [
      "3 × 10⁶ m/s",
      "3 × 10⁸ m/s",
      "3 × 10¹⁰ m/s",
      "3 × 10² m/s",
    ],
    correctOptionIndex: 1,
    order: 2,
  },
  {
    id: "q4-3",
    quizId: "q4",
    prompt: "What is the SI unit of frequency?",
    imageUrl: null,
    options: ["Hertz", "Watt", "Newton", "Joule"],
    correctOptionIndex: 0,
    order: 3,
  },
  {
    id: "q4-4",
    quizId: "q4",
    prompt: "Which of the following best describes the phenomenon of refraction?",
    imageUrl: null,
    options: [
      "The bending of light as it passes from one medium into another",
      "The bouncing of light off a surface",
      "The spreading of light around an obstacle",
      "The absorption of light by a material",
    ],
    correctOptionIndex: 0,
    order: 4,
  },
  {
    id: "q4-5",
    quizId: "q4",
    prompt: "Sound waves are classified as which type of wave?",
    imageUrl: null,
    options: ["Transverse", "Longitudinal", "Electromagnetic", "Stationary"],
    correctOptionIndex: 1,
    order: 5,
  },
  {
    id: "q4-6",
    quizId: "q4",
    prompt: "The wavelength of a wave is defined as:",
    imageUrl: null,
    options: [
      "The number of waves passing a point per second",
      "The distance between two consecutive identical points on the wave",
      "The maximum displacement of the wave from its rest position",
      "The time taken for one complete wave to pass a point",
    ],
    correctOptionIndex: 1,
    order: 6,
  },
];

// ─── Students ─────────────────────────────────────────────────────────────────

export const STUDENTS: Student[] = [
  {
    id: "s1",
    name: "Jamie Chen",
    createdAt: "2025-08-01",
    assignedQuizIds: ["q1", "q2", "q3"],
    adminMessage: {
      text: "Great work on last week's networking quiz! Your TCP handshake answer was spot-on. Keep pushing on the security module.",
      timestamp: "2025-08-28",
    },
  },
  {
    id: "s2",
    name: "Alex Rivera",
    createdAt: "2025-08-01",
    assignedQuizIds: ["q1", "q4"],
    adminMessage: null,
  },
  {
    id: "s3",
    name: "Sam Okafor",
    createdAt: "2025-08-05",
    assignedQuizIds: ["q2", "q3", "q4"],
    adminMessage: {
      text: "Focus on SQL JOIN syntax — there was some confusion in the last session. Review the INNER vs LEFT JOIN examples.",
      timestamp: "2025-08-27",
    },
  },
  {
    id: "s4",
    name: "Priya Nair",
    createdAt: "2025-08-10",
    assignedQuizIds: ["q1", "q2", "q3", "q4"],
    adminMessage: null,
  },
  {
    id: "s5",
    name: "Marcus Webb",
    createdAt: "2025-08-12",
    assignedQuizIds: ["q3", "q4"],
    adminMessage: null,
  },
];

// ─── Historical Attempts ──────────────────────────────────────────────────────

export const HISTORICAL_ATTEMPTS: HistoricalAttempt[] = [
  {
    id: "a1",
    userId: "s1",
    quizId: "q1",
    wheelResult: 2,
    score: 2,
    total: 2,
    completedAt: "2025-08-22T14:30:00Z",
    answers: [
      { questionId: "q1-1", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q1-3", chosenOptionIndex: 3, correct: true, tries: 2, trolled: false },
    ],
  },
  {
    id: "a2",
    userId: "s1",
    quizId: "q2",
    wheelResult: 3,
    score: 2,
    total: 3,
    completedAt: "2025-08-26T10:15:00Z",
    answers: [
      { questionId: "q2-1", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q2-2", chosenOptionIndex: 2, correct: false, tries: 3, trolled: true },
      { questionId: "q2-4", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
    ],
  },
  {
    id: "a3",
    userId: "s2",
    quizId: "q1",
    wheelResult: 1,
    score: 1,
    total: 1,
    completedAt: "2025-08-15T09:00:00Z",
    answers: [
      { questionId: "q1-2", chosenOptionIndex: 0, correct: true, tries: 1, trolled: false },
    ],
  },
  {
    id: "a4",
    userId: "s2",
    quizId: "q4",
    wheelResult: 3,
    score: 2,
    total: 3,
    completedAt: "2025-08-24T16:45:00Z",
    answers: [
      { questionId: "q4-1", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q4-3", chosenOptionIndex: 1, correct: false, tries: 3, trolled: true },
      { questionId: "q4-5", chosenOptionIndex: 1, correct: true, tries: 2, trolled: false },
    ],
  },
  {
    id: "a5",
    userId: "s3",
    quizId: "q2",
    wheelResult: 2,
    score: 2,
    total: 2,
    completedAt: "2025-08-19T11:30:00Z",
    answers: [
      { questionId: "q2-3", chosenOptionIndex: 1, correct: true, tries: 1, trolled: false },
      { questionId: "q2-5", chosenOptionIndex: 1, correct: true, tries: 2, trolled: false },
    ],
  },
  {
    id: "a6",
    userId: "s3",
    quizId: "q3",
    wheelResult: 1,
    score: 0,
    total: 1,
    completedAt: "2025-08-23T13:00:00Z",
    answers: [
      { questionId: "q3-2", chosenOptionIndex: 0, correct: false, tries: 3, trolled: true },
    ],
  },
  {
    id: "a7",
    userId: "s3",
    quizId: "q4",
    wheelResult: 2,
    score: 1,
    total: 2,
    completedAt: "2025-08-27T15:20:00Z",
    answers: [
      { questionId: "q4-2", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q4-4", chosenOptionIndex: 0, correct: false, tries: 3, trolled: false },
    ],
  },
  {
    id: "a8",
    userId: "s1",
    quizId: "q1",
    wheelResult: 3,
    score: 3,
    total: 3,
    completedAt: "2025-08-10T09:00:00Z",
    answers: [
      { questionId: "q1-1", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q1-4", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q1-5", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
    ],
  },
  {
    id: "a9",
    userId: "s4",
    quizId: "q1",
    wheelResult: 2,
    score: 1,
    total: 2,
    completedAt: "2025-08-20T10:00:00Z",
    answers: [
      { questionId: "q1-2", chosenOptionIndex: 0, correct: true, tries: 1, trolled: false },
      { questionId: "q1-6", chosenOptionIndex: 0, correct: false, tries: 2, trolled: false },
    ],
  },
  {
    id: "a10",
    userId: "s4",
    quizId: "q2",
    wheelResult: 3,
    score: 3,
    total: 3,
    completedAt: "2025-08-25T14:00:00Z",
    answers: [
      { questionId: "q2-1", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q2-4", chosenOptionIndex: 2, correct: true, tries: 1, trolled: false },
      { questionId: "q2-6", chosenOptionIndex: 1, correct: true, tries: 2, trolled: false },
    ],
  },
];
