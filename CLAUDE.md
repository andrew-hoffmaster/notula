# CLAUDE.md

Guidance for Claude Code (and any contributor) working in this repository.

## Code Quality Rules

### 1. Best practices
Always write code to industry best practices. Document all code per industry
standards:
- Doc comments on every public API (types, functions, methods, modules).
- A clear header on each module/file describing its purpose.
- Inline comments only where intent is not obvious from the code itself — explain
  *why*, not *what*.

### 2. Unit tests required
- Every change must include unit tests covering the new or modified behavior.
- Maintain a **minimum of 50% unit test coverage at all times**.
- Run the coverage report and confirm the threshold is met **before** considering
  any work complete.

### 3. No fake tests
- Never fake, stub out, or hardcode a test to make it pass.
- Tests must exercise real behavior with real assertions.
- Never weaken, skip, or delete a failing test to make the suite green. Fix the
  underlying code, or raise the issue if the cause is unclear.

### 4. Honesty over guessing
- If you do not know an answer, say so explicitly and ask.
- Do not invent APIs, behavior, or facts. No plausible-sounding guesses.

### 5. Docs first
- Consult the documents in [docs/](docs/) for additional context whenever
  requirements or architecture are unclear.
- When docs and code disagree, surface the conflict rather than silently picking
  one.

## Definition of Done
A change is complete only when **all** of the following hold:
1. Code follows best practices and is documented to standard.
2. New/changed behavior is covered by real unit tests.
3. Coverage report run and ≥ 50% confirmed.
4. No tests faked, skipped, weakened, or deleted to pass.
