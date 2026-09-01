"""High-school (grades 9-12) Math & Physics seed content.

Subjects are plain chapters — no special-cased "Math"/"Physics" types.
Each chapter carries a `subject: "math"|"physics"|"other"` tag so reports
can group chapters into Math vs Physics without hardcoding names.
No IT / computer-science / programming content anywhere.

Every document gets a random ObjectId as `_id`; string reference tokens are
mapped to those ObjectIds consistently so the router's ObjectId(...) lookups work.
"""

from bson import ObjectId

from .auth import hash_password
from .config import settings
from .schemas import now_iso

# Deterministic readable reference tokens -> ObjectIds (random but fixed per seed run).
_ID = {}


def _oid(token: str) -> ObjectId:
    if token not in _ID:
        _ID[token] = ObjectId()
    return _ID[token]


def _str(token: str) -> str:
    return str(_oid(token))


def build_seed():
    teacher_token = "teacher"
    teacher_id_obj = _oid(teacher_token)
    teacher_id = str(teacher_id_obj)
    teacher_username = settings.seed_teacher_username
    teacher_plaintext = settings.seed_teacher_password

    student_tokens = {
        "s_jamie": "Jamie Chen",
        "s_alex": "Alex Rivera",
        "s_sam": "Sam Okafor",
        "s_priya": "Priya Nair",
        "s_marcus": "Marcus Webb",
    }

    students = [
        {
            "_id": _oid(token),
            "name": name,
            "createdAt": now_iso(),
            "assignedQuizIds": [],
        }
        for token, name in student_tokens.items()
    ]

    # Each chapter tagged with a subject so reports can group them.
    # Math = algebra/geometry/trig/stats/functions; Physics = motion/energy/electricity/waves/heat.
    chapters = [
        {"_id": _oid(tok), "name": name, "description": desc, "subject": subject}
        for tok, name, desc, subject in [
            ("c_algebra", "Algebra I & II", "Linear equations, quadratics, and polynomials.", "math"),
            ("c_geometry", "Geometry", "Angles, triangles, circles, and area.", "math"),
            ("c_trig", "Trigonometry", "Sine, cosine, tangent, and right-triangle problems.", "math"),
            ("c_stats", "Statistics & Probability", "Mean, median, mode, and introductory probability.", "math"),
            ("c_functions", "Functions & Graphs", "Linear and quadratic graphing and intercepts.", "math"),
            ("c_motion", "Motion & Forces", "Newton's laws, speed, velocity, acceleration.", "physics"),
            ("c_energy", "Energy & Work", "Kinetic and potential energy, simple machines.", "physics"),
            ("c_electric", "Intro to Electricity", "Circuits, voltage, current, resistance, Ohm's law.", "physics"),
            ("c_waves", "Waves & Sound", "Wave properties, reflection and simple optics.", "physics"),
            ("c_heat", "Heat & Temperature", "Heat transfer and states of matter.", "physics"),
        ]
    ]

    lessons = [
        {"_id": _oid(tok), "chapterId": _str(cat), "title": title, "quizIds": [_str(q)]}
        for tok, cat, title, q in [
            ("l_linear", "c_algebra", "Solving Linear Equations", "q_linear"),
            ("l_quads", "c_algebra", "Quadratic Equations", "q_quad"),
            ("l_triang", "c_geometry", "Triangles & Angles", "q_angle"),
            ("l_circle", "c_geometry", "Circles & Circumference", "q_circle"),
            ("l_trigbasics", "c_trig", "Right-Triangle Ratios", "q_trig"),
            ("l_stats", "c_stats", "Mean, Median & Mode", "q_stats"),
            ("l_prob", "c_stats", "Probability Fundamentals", "q_prob"),
            ("l_graph", "c_functions", "Graphing Linear Functions", "q_graph"),
            ("l_newton", "c_motion", "Newton's Laws of Motion", "q_newton"),
            ("l_kinetic", "c_energy", "Kinetic & Potential Energy", "q_energy"),
            ("l_ohms", "c_electric", "Ohm's Law", "q_ohm"),
            ("l_waves", "c_waves", "Wave Properties", "q_wave"),
            ("l_heat", "c_heat", "Heat Transfer", "q_heat"),
        ]
    ]

    questions = [
        {
            "_id": _oid(tok),
            "quizId": _str(q),
            "prompt": prompt,
            "options": options,
            "correctOptionIndex": correct,
            "order": order,
            "imageUrl": None,
        }
        for tok, q, prompt, options, correct, order in [
            # Algebra: linear equations
            ("qn_lin1", "q_linear", "Solve for x: 2x + 6 = 14", ["x = 3", "x = 4", "x = 5", "x = 6", "x = 8"], 1, 0),
            ("qn_lin2", "q_linear", "Solve for x: 3(x - 2) = 15", ["x = 5", "x = 6", "x = 7", "x = 9", "x = 11"], 2, 1),
            ("qn_lin3", "q_linear", "What value of x satisfies x/4 = 9?", ["x = 13", "x = 24", "x = 30", "x = 36", "x = 45"], 3, 2),
            ("qn_lin4", "q_linear", "Solve for x: 5x - 8 = 2x + 7", ["x = 3", "x = 4", "x = 5", "x = 6", "x = 7"], 2, 3),
            # Algebra: quadratics
            ("qn_q1", "q_quad", "Which of these is a root of x² - 9 = 0?", ["x = 3", "x = 6", "x = 9", "x = -2", "x = 1"], 0, 0),
            ("qn_q2", "q_quad", "Factor x² + 5x + 6", ["(x+2)(x+3)", "(x+1)(x+6)", "(x-2)(x-3)", "(x+5)(x+1)", "(x+3)(x+2)"], 0, 1),
            ("qn_q3", "q_quad", "What is the vertex form of x² + 6x + 9?", ["(x+3)²", "(x-3)²", "(x+6)²", "(x+9)²", "(x+1)²"], 0, 2),
            # Geometry: triangles & circles
            ("qn_ang1", "q_angle", "Two angles of a triangle are 50° and 60°. What is the third?", ["70°", "80°", "90°", "60°", "50°"], 0, 0),
            ("qn_ang2", "q_angle", "A triangle has sides 3, 4, and 5. What type is it?", ["Right triangle", "Equilateral", "Obtuse", "Isosceles only", "Scalene obtuse"], 0, 1),
            ("qn_cir1", "q_circle", "A circle has radius 7. What is its circumference? (π ≈ 22/7)", ["22", "44", "14", "88", "154"], 1, 0),
            ("qn_cir2", "q_circle", "A circle has diameter 10. What is its area? (π ≈ 3.14)", ["78.5", "31.4", "62.8", "100", "314"], 0, 1),
            # Trig
            ("qn_trig1", "q_trig", "In a right triangle, sin θ = opposite ÷ ?", ["hypotenuse", "adjacent", "opposite", "leg", "height"], 0, 0),
            ("qn_trig2", "q_trig", "tan θ = opposite ÷ ?", ["adjacent", "hypotenuse", "opposite", "leg", "sine"], 0, 1),
            # Stats & probability
            ("qn_stat1", "q_stats", "Find the mean of 4, 6, 8, 10, 12", ["8", "9", "10", "7", "6"], 0, 0),
            ("qn_stat2", "q_stats", "What is the median of 3, 7, 9, 12, 15?", ["9", "7", "12", "10", "8"], 0, 1),
            ("qn_stat3", "q_stats", "In the set 2, 5, 5, 5, 8, what is the mode?", ["5", "2", "8", "6", "3"], 0, 2),
            ("qn_prob1", "q_prob", "A fair six-sided die is rolled. What is P(rolling a 4)?", ["1/6", "1/3", "1/2", "1/4", "2/3"], 0, 0),
            ("qn_prob2", "q_prob", "A bag has 3 red and 7 blue marbles. What is P(red)?", ["3/10", "7/10", "1/3", "1/2", "3/7"], 0, 1),
            ("qn_prob3", "q_prob", "You flip a fair coin twice. What is P(both heads)?", ["1/4", "1/2", "1/3", "3/4", "1/8"], 0, 2),
            # Functions & graphs
            ("qn_graph1", "q_graph", "What is the y-intercept of y = 2x + 5?", ["(0, 5)", "(0, 2)", "(5, 0)", "(2, 0)", "(0, -5)"], 0, 0),
            ("qn_graph2", "q_graph", "What is the slope of the line y = 3x - 1?", ["3", "-1", "1", "4", "-3"], 0, 1),
            ("qn_graph3", "q_graph", "Where does y = x - 4 cross the x-axis?", ["(4, 0)", "(0, 4)", "(-4, 0)", "(0, -4)", "(1, 0)"], 0, 2),
            # Motion & Forces (the spec sample question)
            ("qn_newton1", "q_newton", "A car accelerates from rest — which law explains why passengers feel pushed back into their seats?", ["Newton's first law (inertia)", "Newton's second law", "Newton's third law", "Law of universal gravitation", "Law of conservation of momentum"], 0, 0),
            ("qn_newton2", "q_newton", "A 10 kg object is pushed with a 30 N force. What is its acceleration?", ["3 m/s²", "0.33 m/s²", "30 m/s²", "300 m/s²", "15 m/s²"], 0, 1),
            ("qn_newton3", "q_newton", "A car travels 120 km in 2 hours. What is its average speed?", ["60 km/h", "40 km/h", "120 km/h", "240 km/h", "30 km/h"], 0, 2),
            ("qn_newton4", "q_newton", "F = ma. If mass doubles and force is unchanged, acceleration will:", ["halve", "double", "stay the same", "quadruple", "become zero"], 0, 3),
            # Energy
            ("qn_energy1", "q_energy", "KE = ½mv². A 2 kg ball moves at 3 m/s. What is its kinetic energy?", ["9 J", "6 J", "3 J", "18 J", "12 J"], 0, 0),
            ("qn_energy2", "q_energy", "PE = mgh. A 5 kg box is 2 m high (g=10). What is its potential energy?", ["100 J", "50 J", "10 J", "200 J", "20 J"], 0, 1),
            ("qn_energy3", "q_energy", "A ball rolling over a hill has the most potential energy:", ["at the top", "at the bottom", "halfway up", "while rolling fastest", "just after leaving the top"], 0, 2),
            # Ohm's law
            ("qn_ohm1", "q_ohm", "V = IR. A circuit has 9 V and 3 A. What is the resistance?", ["3 Ω", "27 Ω", "0.33 Ω", "12 Ω", "6 Ω"], 0, 0),
            ("qn_ohm2", "q_ohm", "A resistor is 4 Ω and current is 2 A. What is the voltage?", ["8 V", "2 V", "6 V", "0.5 V", "16 V"], 0, 1),
            ("qn_ohm3", "q_ohm", "Doubling the voltage across a fixed resistor (I = V/R) will:", ["double the current", "halve the current", "not change current", "quadruple current", "make resistance double"], 0, 2),
            # Waves
            ("qn_wave1", "q_wave", "A wave has a frequency of 4 Hz. What is its period?", ["0.25 s", "4 s", "2 s", "8 s", "0.5 s"], 0, 0),
            ("qn_wave2", "q_wave", "v = fλ. A wave travels at 300 m/s with a frequency of 100 Hz. What is its wavelength?", ["3 m", "0.33 m", "30000 m", "30 m", "100 m"], 0, 1),
            ("qn_wave3", "q_wave", "Sound travels fastest through:", ["a solid", "a liquid", "a gas", "a vacuum", "empty space"], 0, 2),
            # Heat
            ("qn_heat1", "q_heat", "Ice melting into water at 0°C is an example of:", ["phase change", "chemical reaction", "thermal expansion", "convection", "radiation"], 0, 0),
            ("qn_heat2", "q_heat", "Heat moves through a metal rod mainly by:", ["conduction", "convection", "radiation", "evaporation", "reflection"], 0, 1),
            ("qn_heat3", "q_heat", "Which unit measures heat energy?", ["joule", "newton", "watt", "pascal", "ohm"], 0, 2),
        ]
    ]

    quizzes = []
    quiz_specs = [
        ("q_linear", "l_linear", "Linear Equations Quick Check", ["qn_lin1", "qn_lin2", "qn_lin3", "qn_lin4"]),
        ("q_quad", "l_quads", "Quadratic Roots & Factoring", ["qn_q1", "qn_q2", "qn_q3"]),
        ("q_angle", "l_triang", "Triangles & Angle Sums", ["qn_ang1", "qn_ang2"]),
        ("q_circle", "l_circle", "Circles: Area & Circumference", ["qn_cir1", "qn_cir2"]),
        ("q_trig", "l_trigbasics", "Right-Triangle Ratios", ["qn_trig1", "qn_trig2"]),
        ("q_stats", "l_stats", "Mean, Median & Mode", ["qn_stat1", "qn_stat2", "qn_stat3"]),
        ("q_prob", "l_prob", "Probability Foundations", ["qn_prob1", "qn_prob2", "qn_prob3"]),
        ("q_graph", "l_graph", "Linear Graph Intercepts", ["qn_graph1", "qn_graph2", "qn_graph3"]),
        ("q_newton", "l_newton", "Newton's Laws & Motion", ["qn_newton1", "qn_newton2", "qn_newton3", "qn_newton4"]),
        ("q_energy", "l_kinetic", "Energy & Work", ["qn_energy1", "qn_energy2", "qn_energy3"]),
        ("q_ohm", "l_ohms", "Ohm's Law", ["qn_ohm1", "qn_ohm2", "qn_ohm3"]),
        ("q_wave", "l_waves", "Wave Properties", ["qn_wave1", "qn_wave2", "qn_wave3"]),
        ("q_heat", "l_heat", "Heat & Temperature", ["qn_heat1", "qn_heat2", "qn_heat3"]),
    ]
    for q_tok, l_tok, qtitle, qn_tokens in quiz_specs:
        quizzes.append({
            "_id": _oid(q_tok),
            "lessonId": _str(l_tok),
            "title": qtitle,
            "questionPoolIds": [_str(t) for t in qn_tokens],
            "status": "active",
            "scheduledStart": None,
            "scheduledEnd": None,
            "trollVideoId": None,
            "timerMinutes": None,
        })

    # Assign quizzes: Jamie (Math), Alex (Physics), Priya (mixture), Sam/Marcus (none).
    jamie_ids = [q for q, _, _, _ in quiz_specs if q in ("q_linear", "q_quad", "q_angle", "q_circle", "q_trig", "q_stats", "q_prob", "q_graph")]
    alex_ids = [q for q, _, _, _ in quiz_specs if q in ("q_newton", "q_energy", "q_ohm", "q_wave", "q_heat")]
    priya_ids = ["q_linear", "q_newton", "q_stats", "q_ohm"]
    for s in students:
        if s["name"] == "Jamie Chen":
            s["assignedQuizIds"] = [str(_oid(q)) for q in jamie_ids]
        elif s["name"] == "Alex Rivera":
            s["assignedQuizIds"] = [str(_oid(q)) for q in alex_ids]
        elif s["name"] == "Priya Nair":
            s["assignedQuizIds"] = [str(_oid(q)) for q in priya_ids]
        else:
            s["assignedQuizIds"] = []

    teacher = {
        "_id": teacher_id_obj,
        "username": teacher_username,
        "passwordHash": hash_password(teacher_plaintext),
        "displayName": "Mrs. Chen",
    }

    messages = [
        {
            "_id": ObjectId(),
            "studentId": _str("s_jamie"),
            "teacherId": teacher_id,
            "text": "Great work on the linear equations quiz — you nailed the balancing steps. Keep it up!",
            "createdAt": now_iso(),
            "readAt": None,
        },
        {
            "_id": ObjectId(),
            "studentId": _str("s_jamie"),
            "teacherId": teacher_id,
            "text": "Don't forget our geometry review is on Friday. I added a circles quiz if you want extra practice.",
            "createdAt": now_iso(),
            "readAt": now_iso(),
        },
        {
            "_id": ObjectId(),
            "studentId": _str("s_alex"),
            "teacherId": teacher_id,
            "text": "Your Ohm's law results are improving. Try the energy quiz when you get a chance.",
            "createdAt": now_iso(),
            "readAt": None,
        },
    ]

    return {
        "teacher": teacher,
        "students": students,
        "chapters": chapters,
        "lessons": lessons,
        "quizzes": quizzes,
        "questions": questions,
        "messages": messages,
    }


# Encouraging quotes shown to students after a wrong answer on the Results
# screen. Teachers can manage this list from the admin Quotes panel.
QUOTE_TEXTS = [
    "Almost — that concept trips everyone up the first time.",
    "Wrong answer, solid attempt. The gap is in one detail.",
    "That one's sneaky. Now you know exactly why.",
    "Close enough to be frustrating — which means your reasoning was on the right track.",
    "Not quite. The correct answer is worth rereading slowly.",
    "You picked the popular wrong answer. Good company, wrong conclusion.",
    "Miss now, ace it next time. That's the actual pattern.",
    "The trap was obvious in hindsight, right? That's on purpose.",
    "Wrong, but a wrong answer you understand beats a right guess.",
    "Your brain was one degree off. That's a fixable thing.",
    "File that one away — it'll come back around.",
    "Nah, but that's why we practise, not why we panic.",
    "Everyone misses that one the first time. Literally everyone.",
    "Tougher than it looks on the surface. Check the explanation.",
    "Wrong, but you were thinking about it. That's more than most.",
    "That answer makes intuitive sense — which is exactly why it's wrong.",
    "One missed question is data, not disaster.",
    "Review the correct answer. It'll click the moment you see it.",
    "You were in the right neighbourhood, just the wrong address.",
    "Knowing what you got wrong is half the preparation for the real thing.",
]


def build_quotes() -> list[dict]:
    return [
        {"_id": ObjectId(), "text": text, "createdAt": now_iso()}
        for text in QUOTE_TEXTS
    ]
