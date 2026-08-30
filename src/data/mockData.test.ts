// src/data/mockData.test.ts
// Verification tests for TASK 1.1 — Math & Physics content migration (FR-201, FR-403).
//
// NOTE: @types/bun is not installed in this project, so bun:test is declared
// ambiently here to keep `tsc --noEmit` (which includes src/) green. The swarm
// test runner executes this file with the global bun runtime.

declare module "bun:test" {
  interface Matchers<T> {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toHaveLength(expected: number): void
    toContain(expected: unknown): void
    toBeNull(): void
  }
  export function describe(name: string, fn: () => void): void
  export function test(name: string, fn: () => void): void
  export function expect<T>(actual: T): Matchers<T>
}

import { describe, test, expect } from "bun:test"
import { CHAPTERS, LESSONS, QUIZZES, QUESTIONS, STUDENTS } from "./mockData"

// ─── FR-201: content must be Math & Physics only ─────────────────────────────

const IT_TERMS = [
  "computer network",
  "networking",
  "network",
  "programming",
  "program",
  "tcp",
  "udp",
  "http",
  "https",
  "sql",
  "router",
  "packet",
  "ip address",
  "binary",
  "server",
  "database",
  "html",
  "css",
  "javascript",
  "python",
  "java",
  "compiler",
  "operating system",
  "kernel",
  "firewall",
  "encryption",
  "protocol",
  "bandwidth",
  "latency",
  "cache",
  "api",
  "json",
  "xml",
  "syntax",
  "debug",
  "compile",
  "loop",
  "recursion",
  "iteration",
  "linked list",
  "stack",
  "queue",
  "bit",
  "byte",
  "client",
  "host",
  "domain",
  "url",
  "browser",
  "website",
  "internet",
  "lan",
  "wan",
  "wi-fi",
  "bluetooth",
  "ethernet",
  "modem",
  "gateway",
  "dns",
  "dhcp",
  "ftp",
  "smtp",
  "ssh",
  "tls",
  "ssl",
  "vpn",
  "proxy",
  "malware",
  "virus",
  "phishing",
  "spam",
  "authentication",
  "authorization",
  "password",
  "username",
  "login",
  "logout",
  "session",
  "cookie",
  "token",
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function contentText(): string {
  const parts: string[] = []
  for (const ch of CHAPTERS) parts.push(ch.title)
  for (const l of LESSONS) parts.push(l.title)
  for (const q of QUIZZES) parts.push(q.title)
  for (const q of QUESTIONS) {
    parts.push(q.prompt)
    parts.push(...q.options)
  }
  return parts.join("\n")
}

describe("FR-201: Math & Physics content migration", () => {
  test("chapters are exactly Mathematics and Physics", () => {
    expect(CHAPTERS.map((c) => c.title)).toEqual(["Mathematics", "Physics"])
  })

  test("lessons are exactly the four Math/Physics lessons", () => {
    expect(LESSONS.map((l) => l.title)).toEqual([
      "Algebra",
      "Geometry & Trigonometry",
      "Mechanics",
      "Waves & Light",
    ])
  })

  test("no IT-themed terminology remains in chapters/lessons/quizzes/questions", () => {
    const text = contentText()
    const hits: string[] = []
    for (const term of IT_TERMS) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")
      if (re.test(text)) hits.push(term)
    }
    expect(hits).toEqual([])
  })

  test("every question imageUrl is null (no IT-themed imagery)", () => {
    expect(QUESTIONS.map((q) => q.imageUrl)).toEqual(QUESTIONS.map(() => null))
  })
})

describe("FR-201/FR-403: Quiz shape and identity", () => {
  test("quiz IDs are exactly q1..q4", () => {
    expect(QUIZZES.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4"])
  })

  test("Quiz objects keep the exact existing shape (no description, no chapters array)", () => {
    const expectedKeys = [
      "id",
      "lessonId",
      "title",
      "coverImageDataUrl",
      "questionPoolIds",
      "status",
    ].sort()
    for (const quiz of QUIZZES) {
      expect(Object.keys(quiz).sort()).toEqual(expectedKeys)
    }
  })

  test("all quizzes are active", () => {
    expect(QUIZZES.map((q) => q.status)).toEqual([
      "active",
      "active",
      "active",
      "active",
    ])
  })

  test("each quiz has exactly 6 questionPoolIds with no duplicates", () => {
    for (const quiz of QUIZZES) {
      expect(quiz.questionPoolIds).toHaveLength(6)
      expect(new Set(quiz.questionPoolIds).size).toBe(6)
    }
  })
})

describe("FR-201/FR-403: Question shape", () => {
  test("there are exactly 24 questions", () => {
    expect(QUESTIONS).toHaveLength(24)
  })

  test("Question objects keep the exact existing shape", () => {
    const expectedKeys = [
      "id",
      "quizId",
      "prompt",
      "imageUrl",
      "options",
      "correctOptionIndex",
      "order",
    ].sort()
    for (const q of QUESTIONS) {
      expect(Object.keys(q).sort()).toEqual(expectedKeys)
    }
  })

  test("every question has exactly 5 options", () => {
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(5)
    }
  })

  test("correctOptionIndex is always 0..4", () => {
    for (const q of QUESTIONS) {
      expect([0, 1, 2, 3, 4]).toContain(q.correctOptionIndex)
    }
  })

  test("order is a unique 1..6 sequence within each quiz", () => {
    for (const quiz of QUIZZES) {
      const orders = QUESTIONS.filter((q) => q.quizId === quiz.id)
        .map((q) => q.order)
        .sort((a, b) => a - b)
      expect(orders).toEqual([1, 2, 3, 4, 5, 6])
    }
  })
})

describe("FR-403: referential integrity", () => {
  test("every lesson.chapterId exists in CHAPTERS", () => {
    const chapterIds = new Set(CHAPTERS.map((c) => c.id))
    for (const l of LESSONS) {
      expect(chapterIds.has(l.chapterId)).toBe(true)
    }
  })

  test("chapter.lessonIds <-> lesson.chapterId are bidirectional", () => {
    const lessonByChapter = new Map<string, Set<string>>()
    for (const l of LESSONS) {
      const set = lessonByChapter.get(l.chapterId) ?? new Set<string>()
      set.add(l.id)
      lessonByChapter.set(l.chapterId, set)
    }
    for (const c of CHAPTERS) {
      expect(new Set(c.lessonIds)).toEqual(
        lessonByChapter.get(c.id) ?? new Set<string>(),
      )
    }
  })

  test("every quiz.lessonId exists in LESSONS", () => {
    const lessonIds = new Set(LESSONS.map((l) => l.id))
    for (const quiz of QUIZZES) {
      if (quiz.lessonId == null) continue // category-less quizzes are allowed
      expect(lessonIds.has(quiz.lessonId)).toBe(true)
    }
  })

  test("lesson.quizIds <-> quiz.lessonId are bidirectional", () => {
    const quizByLesson = new Map<string, Set<string>>()
    for (const quiz of QUIZZES) {
      if (quiz.lessonId == null) continue // category-less quizzes are allowed
      const set = quizByLesson.get(quiz.lessonId) ?? new Set<string>()
      set.add(quiz.id)
      quizByLesson.set(quiz.lessonId, set)
    }
    for (const l of LESSONS) {
      expect(new Set(l.quizIds)).toEqual(
        quizByLesson.get(l.id) ?? new Set<string>(),
      )
    }
  })

  test("every question.quizId exists in QUIZZES", () => {
    const quizIds = new Set(QUIZZES.map((q) => q.id))
    for (const q of QUESTIONS) {
      expect(quizIds.has(q.quizId)).toBe(true)
    }
  })

  test("quiz.questionPoolIds <-> question.quizId are bidirectional", () => {
    const questionsByQuiz = new Map<string, Set<string>>()
    for (const q of QUESTIONS) {
      const set = questionsByQuiz.get(q.quizId) ?? new Set<string>()
      set.add(q.id)
      questionsByQuiz.set(q.quizId, set)
    }
    for (const quiz of QUIZZES) {
      expect(new Set(quiz.questionPoolIds)).toEqual(
        questionsByQuiz.get(quiz.id) ?? new Set<string>(),
      )
    }
  })

  test("every question id is prefixed by its quizId", () => {
    for (const q of QUESTIONS) {
      expect(q.id.startsWith(`${q.quizId}-`)).toBe(true)
    }
  })
})

describe("FR-201: factual correctness of answers", () => {
  const expectedByQuiz: Record<string, number[]> = {
    q1: [0, 1, 1, 2, 2, 2],
    q2: [1, 1, 1, 1, 0, 1],
    q3: [0, 2, 1, 2, 1, 0],
    q4: [2, 1, 0, 0, 1, 1],
  }

  for (const [quizId, expected] of Object.entries(expectedByQuiz)) {
    test(`${quizId} correct answers match the expected sequence`, () => {
      const actual = QUESTIONS.filter((q) => q.quizId === quizId)
        .sort((a, b) => a.order - b.order)
        .map((q) => q.correctOptionIndex)
      expect(actual).toEqual(expected)
    })
  }
})

describe("FR-201: teacher messages are Math & Physics focused and latest-first", () => {
  test("every student message is free of IT terminology", () => {
    const text = STUDENTS.flatMap((s) => s.messages.map((m) => m.text)).join(
      "\n",
    )
    const hits: string[] = []
    for (const term of IT_TERMS) {
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")
      if (re.test(text)) hits.push(term)
    }
    expect(hits).toEqual([])
  })

  test("each student's messages are stored newest-first", () => {
    for (const s of STUDENTS) {
      const dates = s.messages.map((m) => new Date(m.timestamp).getTime())
      const sortedDesc = [...dates].sort((a, b) => b - a)
      expect(dates).toEqual(sortedDesc)
    }
  })
})
