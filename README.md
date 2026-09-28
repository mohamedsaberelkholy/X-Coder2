# LocalCoder-X Autonomous Software Engineering Agent

> **LocalCoder-X** is an autonomous, multi-role software engineering agent and execution workbench. It operates inside a strictly constrained tool environment (virtual git repository inspection, bounded file reading, atomic unified diff patch application, diff verification, automated test execution, and structured task finalization).

---

## 1. System Overview

LocalCoder-X is engineered as an **action-oriented software engineering executor**, not a conversational chat bot. It resolves bug tickets, implements missing guards, and validates changes by iteratively generating unified diff patches and inspecting test output until the repository reaches a verified clean state.

```
                  ┌────────────────────────────────────────┐
                  │              USER REQUEST              │
                  │   Issue Ticket / Bug Report / Task     │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                        LOCALCODER-X AGENT LOOP                         │
 │                                                                        │
 │   ┌───────────────┐     ┌──────────────┐     ┌──────────────┐          │
 │   │  UNDERSTAND   ├────►│     PLAN     ├────►│     ACT      │          │
 │   │ repo_overview │     │ Human Message│     │ apply_patch  │          │
 │   │  search_code  │     │  (Planner)   │     │   (Coder)    │          │
 │   │   read_file   │     └──────────────┘     └──────┬───────┘          │
 │   └───────────────┘                                 │                  │
 │           ▲                                         ▼                  │
 │           │             ┌──────────────┐     ┌──────────────┐          │
 │           └─────────────┤    REPLAN    │◄────┤    VERIFY    │          │
 │               Retry     │ Parse Error  │     │   git_diff   │          │
 │                         │   (Coder)    │     │  run_check   │          │
 │                         └──────────────┘     │  (Reviewer)  │          │
 │                                                     │                  │
 └─────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                                              exit_code == 0
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │       FINISH        │
                                            │ status: "completed" │
                                            └─────────────────────┘
```

---

## 2. Core Principles

1. **Action Over Prose**: Prefer precise tool invocations over conversational chat. The agent acts on the filesystem and tests before explaining conclusions.
2. **Strict Confirmation**: Never assume an action succeeded until the corresponding tool output explicitly confirms `ok: true`.
3. **Atomic Incremental Patches**: Deliver small, single-purpose unified diffs. One logical modification per patch hunk.
4. **Execution Verification**: Every code modification must be verified using `git_diff` and allowlisted validation checks (`pytest`, `vitest`, `lint`, `typecheck`).

---

## 3. Strict Output Modes

LocalCoder-X must emit **EXACTLY ONE valid JSON object** per response with no markdown fences, no explanatory preamble, and no postscript comments.

### Mode 1: Tool Call
Invoked whenever the agent needs to inspect the environment, read code, apply modifications, or execute tests.
```json
{
  "tool": "<tool_name>",
  "arguments": {
    "<arg_key>": "<arg_value>"
  }
}
```

### Mode 2: Human Message (No Tool)
Invoked by the **Planner** to outline the high-level roadmap or ask necessary clarifying questions when no tool execution is required.
```json
{
  "message": "Plan:\n1) inspect repository root & git status\n2) search for failing symbols\n3) read target source & test files\n4) generate minimal unified diff patch\n5) verify with test check\n6) finalize with finish tool"
}
```

> **Strict Invariants**:
> - Never mix `tool` and `message` in the same response.
> - Invalid JSON is treated as a fatal turn failure.
> - Arguments must be a JSON object, not a stringified JSON string.

---

## 4. Complete Tool Reference

LocalCoder-X operates exclusively with the following 7 executor tools:

### 1) `repo_overview`
Inspects the repository root, active git branch, detected language stacks, configured checks, instructions, and git working tree status.

- **Arguments**: `{}`
- **Response**:
```json
{
  "ok": true,
  "result": {
    "root": "/workspace/math-calc",
    "branch": "fix/divide-zero-validation",
    "detected_stack": ["python", "pytest", "ruff"],
    "available_checks": {
      "test": "pytest",
      "lint": "ruff check .",
      "typecheck": "mypy src/"
    },
    "project_instructions": ["README.md", "CONTRIBUTING.md"],
    "git_status": {
      "modified": [],
      "untracked": []
    }
  }
}
```

---

### 2) `search_code`
Searches for symbol definitions, function signatures, or error messages using regular expressions or literal strings.

- **Arguments**:
```json
{
  "query": "def divide",
  "path": ".",
  "max_results": 10
}
```
- **Response**:
```json
{
  "ok": true,
  "result": [
    {
      "file": "src/calc.py",
      "line": 10,
      "text": "def divide(a: float, b: float) -> float:"
    }
  ]
}
```

---

### 3) `read_file`
Reads a bounded section of a target source file with 1-based start and end line indexing.

- **Arguments**:
```json
{
  "path": "src/calc.py",
  "start_line": 1,
  "end_line": 15
}
```
- **Response**:
```json
{
  "ok": true,
  "result": {
    "path": "src/calc.py",
    "content": "def add(a: float, b: float) -> float:\n    return a + b\n\ndef divide(a: float, b: float) -> float:\n    return a / b\n"
  }
}
```

---

### 4) `apply_patch`
Applies an atomic unified diff patch to target files in the virtual repository.

- **Arguments**:
```json
{
  "patch": "--- a/src/calc.py\n+++ b/src/calc.py\n@@ -10,4 +10,6 @@\n def divide(a: float, b: float) -> float:\n+    if b == 0:\n+        raise ValueError(\"division by zero\")\n     return a / b\n",
  "reason": "validate divide by zero denominator"
}
```
- **Response**:
```json
{
  "ok": true,
  "result": {
    "applied": true,
    "changed_files": ["src/calc.py"],
    "summary": "Applied patch (validate divide by zero denominator): changed 1 file(s)"
  }
}
```
*If lines or context mismatch, the tool returns `{ "ok": false, "error": "git apply error: patch does not apply at hunk #1" }`.*

---

### 5) `git_diff`
Calculates and returns the current working tree differences relative to the repository baseline.

- **Arguments**:
```json
{
  "path": "src/calc.py"
}
```
- **Response**:
```json
{
  "ok": true,
  "result": {
    "diff": "--- a/src/calc.py\n+++ b/src/calc.py\n@@ -10,4 +10,6 @@\n def divide(a: float, b: float) -> float:\n+    if b == 0:\n+        raise ValueError(\"division by zero\")\n     return a / b"
  }
}
```

---

### 6) `run_check`
Executes an allowlisted validation command (`pytest`, `lint`, `typecheck`, or `custom`) against the current modified repository state.

- **Arguments**:
```json
{
  "check_type": "pytest",
  "args": []
}
```
- **Response (Passing)**:
```json
{
  "ok": true,
  "result": {
    "exit_code": 0,
    "stdout": "collected 5 items\ntests/test_calc.py ..... [100%]\n5 passed in 0.04s",
    "stderr": ""
  }
}
```

---

### 7) `finish`
Concludes the task. Mandatory to end every successful or blocked run.

- **Arguments**:
```json
{
  "status": "completed",
  "summary": "Fixed ZeroDivisionError in calc.py. Added validation check for b == 0 raising ValueError. Verified with pytest.",
  "files_changed": ["src/calc.py"],
  "checks": [
    {
      "name": "pytest",
      "exit_code": 0,
      "stdout": "5 passed in 0.04s"
    }
  ],
  "attempts": 1
}
```
- **Allowed Statuses**:
  - `completed`: All tests passing, code clean and verified.
  - `needs_approval`: Requested change requires restricted actions (file deletion, network access, history rewriting).
  - `blocked`: Cannot proceed due to missing tools or unrecoverable environmental error.

---

## 5. Multi-Role Behavior

The agent shifts operational roles across the execution lifecycle:

| Role | Primary Responsibility | Dominant Output Mode | Tools Used |
| :--- | :--- | :--- | :--- |
| **Planner** | Task triage, formulating high-level repair plan | Mode 2 (`message`) | None |
| **Coder** | Repository exploration, symbol search, file reading, patch creation | Mode 1 (`tool`) | `repo_overview`, `search_code`, `read_file`, `apply_patch` |
| **Reviewer** | Diff audit, test verification, failure diagnosis, task sign-off | Mode 1 (`tool`) | `git_diff`, `run_check`, `finish` |

---

## 6. Safety & Security Invariants

The agent is strictly sandboxed. The following operations are forbidden:
- **No File Deletion**: Deleting files or directories is disallowed.
- **No History Manipulation**: `git reset`, `git clean`, `git checkout --force`, or branch rewriting.
- **No Commits or Pushes**: Executor does not run `git commit`, `git push`, or `git merge`.
- **No Secrets Access**: Reading environment secrets, tokens, or credentials is blocked.
- **No Unrestricted Network**: Arbitrary downloads or network connections are forbidden.
- **No Arbitrary Shell Script Execution**: Only allowlisted test commands are permitted.

If a task mandates any forbidden operation, LocalCoder-X immediately halts and calls `finish` with status `"needs_approval"`.

---

## 7. Retry Limits

- **Max 3 Total Logical Attempts**: The agent will not loop indefinitely.
- **Max 2 Repair Attempts Per Failure**: If a patch fails the test suite, the agent diagnoses the failure and formulates at most 2 targeted repair patches.

---

## 8. Built-in Benchmark Tasks

The workbench includes 3 pre-configured benchmark scenarios:

1. **Python: Fix ZeroDivisionError in `calc.py`**
   - *Bug*: Unhandled division by zero in `divide(a, b)`.
   - *Requirement*: Validate denominator and raise `ValueError("division by zero")`.
   - *Validation*: `pytest tests/test_calc.py` (5 assertions).

2. **TypeScript: Off-by-one Token Expiration in `auth.ts`**
   - *Bug*: `isTokenValid` checks `now > exp` instead of `now >= exp`, erroneously accepting expired tokens on the millisecond boundary.
   - *Requirement*: Correct comparison operator.
   - *Validation*: `vitest run tests/auth.test.ts` (3 test suites).

3. **Python: Empty Data List Crash in `aggregator.py`**
   - *Bug*: `compute_summary([])` crashes with `IndexError: list index out of range`.
   - *Requirement*: Return zero-initialized summary `{"count": 0.0, "mean": 0.0, "max": 0.0}` on empty series.
   - *Validation*: `pytest tests/test_metrics.py`.

---

## 9. Dual-Engine Architecture & Auto-Fallback

The workbench supports two execution modes:

1. **Live Gemini 3.8 Flash Engine**:
   - Sends the exact system instruction and turns history to Google's `gemini-3.8-flash` model.
   - Enforces single-object JSON schema responses.
2. **Deterministic Autonomous Simulation Engine**:
   - Fully hermetic, deterministic state machine that mirrors the optimal LocalCoder-X workflow.
   - **Automatic Quota Failover**: If Gemini API free-tier quotas (HTTP 429 / `RESOURCE_EXHAUSTED`) are encountered, the system seamlessly transitions to the simulation engine so runs complete without failure.

---

## 10. Workspace & UI Features

- **Agent Studio**: Real-time visual timeline of agent turns with collapsible JSON payloads, syntax-highlighted diffs, and live test output.
- **Execution Loop Visualizer**: Visual indicator tracking current phase (`UNDERSTAND` through `REPLAN`), role, turn count, and attempt limits.
- **Virtual Workspace & Diff**: Integrated file browser with line numbers, code editor, and side-by-side git diff view.
- **Direct Tool Runner**: Interactive sandbox allowing manual execution of any of the 7 tools with custom JSON arguments.
- **Patch Export**: One-click download of generated unified diff `.patch` files.
