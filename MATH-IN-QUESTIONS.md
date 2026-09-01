# Math rendering in questions

Prompts and options can now contain real LaTeX math. Anything wrapped in
dollar signs is rendered by KaTeX; everything else stays as plain text.

## Delimiters

| Delimiter    | Use for                         | Example                              |
| ------------ | ------------------------------- | ------------------------------------ |
| `$...$`      | Inline math mixed with text     | `Solve for $x$: $2x + 6 = 14$`       |
| `$$...$$`    | Block (display) math on its own | `Find the area:\n\n$$A = \pi r^2$$`  |

A few rules so the parser doesn't get confused:

- No space right after the opening `$` or right before the closing `$`.
  `$ x+1 $` is **not** math. Write `$x+1$`.
- Block math (`$$...$$`) can span multiple lines.
- A bare `$` (currency, missing pair) is fine and is left as text.
  Example: `It costs $5 and $10.` — both `$` stay as plain characters.

## Quick LaTeX reference

| You want            | Type                  | Renders as          |
| ------------------- | --------------------- | ------------------- |
| fraction            | `\frac{1}{2}`         | 1/2 as a stacked fraction |
| square root         | `\sqrt{4}`            | √4                  |
| exponent / subscript | `x^2`, `x_1`        | x², x₁              |
| multiplication      | `\cdot`               | ·                   |
| plus / minus        | `\pm`                 | ±                   |
| ≤, ≥, ≠            | `\le`, `\ge`, `\ne`   | ≤, ≥, ≠             |
| Greek letters       | `\pi`, `\theta`       | π, θ                |
| integral            | `\int_0^1 x\,dx`      | ∫₀¹ x dx            |
| sum                 | `\sum_{i=1}^{n} i`    | Σ from i=1 to n     |
| vectors             | `\vec{v}`             | v with arrow        |

Wrap multi-token arguments in braces: `x^{10}`, not `x^10`.

## Where it shows up

Math is rendered in every place a prompt or option is displayed:

- **Student quiz screen** — the prompt and all five options.
- **Results screen** — each question's prompt and the "Your answer" /
  "Correct" lines.
- **Admin → Reports** — per-attempt question breakdown.
- **Admin → Questions** — question list and the per-question option preview.
- **Admin → Quizzes** — the expanded questions list when you open a quiz.

The form fields where you type the question and the dropdown labels inside
`<select>` elements stay as plain text (browsers don't render math in those
inputs), so the LaTeX source is what you save and what you type.

## Examples

A geometry question:

```
prompt: A circle has radius $r = 3$. Find its area.
options:
  - $6\pi$
  - $9\pi$            <- correct
  - $3\pi$
  - $12\pi$
  - $\pi$
```

A physics question with block math:

```
prompt: |
  Use kinematics to find the final velocity.
  $$v = v_0 + a t$$
options:
  - m/s
  - ft/s
  - km/h
  - mph
  - mm/s
```

A word problem mixing currency and math:

```
prompt: A book costs $5. Solve $3x + 5 = 20$ for $x$.
options:
  - 3
  - 4
  - 5
  - 6
  - 7
```

The `$5` is left as plain text; the two `$...$` segments become real math.

## If a prompt looks wrong

- The math is rendered in red — check the LaTeX; KaTeX couldn't parse it.
  The raw source is shown as the fallback.
- Nothing renders — make sure there's no space right after the opening `$`
  or right before the closing `$`.
- The whole string looks like math — you probably have only one `$` in
  the text (an unclosed delimiter).
