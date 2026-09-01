from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from pydantic import BaseModel, Field


# ─── Generic helpers ──────────────────────────────────────────────────────────

def obj_id() -> str:
    return str(ObjectId())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def serialize(doc: dict) -> dict:
    """Convert a MongoDB document to a JSON-safe dict with `id` (not `_id`)."""
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    return out


QuizStatus = Literal["draft", "scheduled", "active", "closed", "archived"]
AttemptStatus = Literal["in_progress", "completed"]
AssetType = Literal["image", "gif", "video"]
SemesterRange = Literal["week", "month", "year"]


# ─── Student / Teacher identity ───────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class StudentOut(BaseModel):
    id: str
    name: str
    createdAt: str
    assignedQuizIds: list[str] = []
    # Student session JWT, only populated by /api/students/enter on the
    # success path. Omitted from the response on the "unknown" empty state.
    token: Optional[str] = None


class StudentEnterOut(BaseModel):
    student: StudentOut
    quizzes: list = []  # assigned quizzes populated by router
    hasQuizzes: bool
    chapters: list = []
    lessons: list = []


class TeacherCreate(BaseModel):
    username: str
    password: str


class UsernameUpdate(BaseModel):
    # Case-preserving but the server normalises the stored value to the
    # exact form the teacher typed. Comparison is done after `strip()` so
    # accidental whitespace doesn't lock the account out.
    username: str = Field(min_length=1, max_length=80)


class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=1, max_length=200)


# ─── Chapter / Lesson / Quiz / Question ────────────────────────────────────────

class ChapterBase(BaseModel):
    name: str
    description: str = ""


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class LessonOut(BaseModel):
    id: str
    chapterId: str
    title: str
    quizIds: list[str] = []


class QuizBase(BaseModel):
    lessonId: str
    title: str
    scheduledStart: Optional[str] = None
    scheduledEnd: Optional[str] = None
    trollVideoId: Optional[str] = None
    timerMinutes: Optional[int] = None


class QuizCreate(QuizBase):
    status: QuizStatus = "draft"
    questionPoolIds: list[str] = []


class QuizUpdate(BaseModel):
    lessonId: Optional[str] = None
    title: Optional[str] = None
    scheduledStart: Optional[str] = None
    scheduledEnd: Optional[str] = None
    trollVideoId: Optional[str] = None
    timerMinutes: Optional[int] = None
    status: Optional[QuizStatus] = None
    questionPoolIds: Optional[list[str]] = None


class QuestionBase(BaseModel):
    quizId: str
    prompt: str
    imageUrl: Optional[str] = None
    trollVideoId: Optional[str] = None
    timeLimitMinutes: Optional[int] = Field(default=None, ge=1, le=10)
    options: list[str] = Field(min_length=5, max_length=5)
    correctOptionIndex: int = Field(ge=0, le=4)
    order: int = 0


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    quizId: Optional[str] = None
    prompt: Optional[str] = None
    imageUrl: Optional[str] = None
    trollVideoId: Optional[str] = None
    timeLimitMinutes: Optional[int] = Field(default=None, ge=1, le=10)
    options: Optional[list[str]] = None
    correctOptionIndex: Optional[int] = Field(default=None, ge=0, le=4)
    order: Optional[int] = None


# ─── Assignment ───────────────────────────────────────────────────────────────

class AssignRequest(BaseModel):
    quizId: str
    studentIds: list[str]


# ─── Quiz-taking ──────────────────────────────────────────────────────────────

class SpinResult(BaseModel):
    wheelResult: Literal[1, 2, 3]
    questionsServed: list[dict]


class AnswerCreate(BaseModel):
    """Submitted when a student answers a question (any try)."""
    questionId: str
    chosenOptionIndex: int = Field(ge=0, le=4)
    # Full history of choices the student made on this question, including
    # the current one. The last entry should equal chosenOptionIndex.
    chosenOptionsHistory: list[int] = Field(default_factory=list)
    # Time spent on the question so far (seconds). The server sums across
    # PATCHes for the same questionId.
    timeSpentSeconds: float = 0.0


class QuestionServed(BaseModel):
    questionId: str
    prompt: str
    imageUrl: Optional[str] = None
    trollVideoId: Optional[str] = None
    timeLimitMinutes: Optional[int] = None
    options: list[str]
    # correctOptionIndex intentionally omitted when serving to students


class QuestionReveal(QuestionServed):
    correctOptionIndex: int


# ─── Reports (addendum) ────────────────────────────────────────────────────────

class CreateAttempt(BaseModel):
    quizId: str
    wheelResult: Literal[1, 2, 3]
    # The student is identified by the bearer token; `studentId` in the
    # payload is ignored (and rejected if it doesn't match the token) for
    # defence in depth. The served questions are picked server-side from
    # `quizId` + `wheelResult`, so a client-provided `questionsServed` is
    # also ignored. Both fields are kept optional so the wire body stays
    # minimal for the security-hardened client.
    studentId: Optional[str] = None
    questionsServed: Optional[list[dict]] = None
    deviceType: Optional[str] = None  # "mobile" | "desktop"


# ─── Messages ─────────────────────────────────────────────────────────────────

class SendMessage(BaseModel):
    studentId: str
    text: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: str
    studentId: str
    teacherId: str
    teacherName: str
    text: str
    createdAt: str
    readAt: Optional[str] = None
