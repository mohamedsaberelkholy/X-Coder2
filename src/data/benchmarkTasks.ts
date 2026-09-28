import { BenchmarkTask, RunCheckResult } from '../types/agent';

export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    id: 'task-calc-zerodiv',
    title: 'Python: Fix ZeroDivisionError in calc.py',
    category: 'Bug Fix / Exception Handling',
    issueDescription:
      'Issue #42: `divide(a, b)` in `src/calc.py` crashes with an unhandled `ZeroDivisionError` when `b == 0`. Expected behavior: validate denominator and raise `ValueError("division by zero")`. Ensure all test assertions in `tests/test_calc.py` pass.',
    branch: 'fix/divide-zero-validation',
    detected_stack: ['python', 'pytest', 'ruff'],
    available_checks: {
      test: 'pytest',
      lint: 'ruff check .',
      typecheck: 'mypy src/',
    },
    project_instructions: ['README.md', 'CONTRIBUTING.md'],
    initialFiles: {
      'src/calc.py': `"""Simple arithmetic utility module."""

def add(a: float, b: float) -> float:
    return a + b

def subtract(a: float, b: float) -> float:
    return a - b

def multiply(a: float, b: float) -> float:
    return a * b

def divide(a: float, b: float) -> float:
    return a / b
`,
      'tests/test_calc.py': `import pytest
from src.calc import add, subtract, multiply, divide

def test_add():
    assert add(2, 3) == 5

def test_subtract():
    assert subtract(10, 4) == 6

def test_multiply():
    assert multiply(3, 7) == 21

def test_divide_valid():
    assert divide(10, 2) == 5.0
    assert divide(9, 3) == 3.0

def test_divide_by_zero():
    with pytest.raises(ValueError, match="division by zero"):
        divide(10, 0)
`,
      'README.md': `# Math Calculator Utilities

A lightweight arithmetic calculation module.

## Running Tests
Run \`pytest\` to verify all unit tests pass before committing.
`,
      'CONTRIBUTING.md': `# Contributing Guidelines
- Maintain atomic patches
- Always verify pytest exits with code 0
- Do not introduce breaking API changes
`,
    },
    expectedPatch: `--- a/src/calc.py
+++ b/src/calc.py
@@ -10,4 +10,6 @@
 def divide(a: float, b: float) -> float:
+    if b == 0:
+        raise ValueError("division by zero")
     return a / b
`,
    evaluationCheck: (files: Record<string, string>, checkType: string): RunCheckResult => {
      const calcContent = files['src/calc.py'] || '';

      if (checkType === 'lint') {
        // Ruff lint check
        const hasUnused = calcContent.includes('import sys');
        if (hasUnused) {
          return {
            exit_code: 1,
            stdout: '',
            stderr: 'src/calc.py:1:1: F401 `sys` imported but unused\nFound 1 error.',
          };
        }
        return {
          exit_code: 0,
          stdout: 'All checks passed!\n0 errors, 0 warnings found.',
          stderr: '',
        };
      }

      if (checkType === 'typecheck') {
        return {
          exit_code: 0,
          stdout: 'Success: no issues found in 1 source file',
          stderr: '',
        };
      }

      // Pytest check
      const hasZeroCheck =
        (calcContent.includes('b == 0') || calcContent.includes('not b')) &&
        calcContent.includes('ValueError') &&
        calcContent.includes('division by zero');

      if (hasZeroCheck) {
        return {
          exit_code: 0,
          stdout: `============================= test session starts ==============================
platform linux -- Python 3.11.8, pytest-8.1.1
rootdir: /workspace/math-calc
collected 5 items

tests/test_calc.py .....                                                 [100%]

============================== 5 passed in 0.04s ===============================`,
          stderr: '',
        };
      }

      return {
        exit_code: 1,
        stdout: `============================= test session starts ==============================
platform linux -- Python 3.11.8, pytest-8.1.1
rootdir: /workspace/math-calc
collected 5 items

tests/test_calc.py ....F                                                 [100%]

=================================== FAILURES ===================================
_____________________________ test_divide_by_zero ______________________________

    def test_divide_by_zero():
>       with pytest.raises(ValueError, match="division by zero"):
E       Failed: DID NOT RAISE <class 'ValueError'>
E       Instead raised: ZeroDivisionError('division by zero')

src/calc.py:13: ZeroDivisionError
=========================== 1 failed, 4 passed in 0.06s ===========================`,
        stderr: '',
      };
    },
  },
  {
    id: 'task-jwt-boundary',
    title: 'TypeScript: Off-by-one Token Expiration in auth.ts',
    category: 'Edge Case / Security Bug',
    issueDescription:
      'Issue #108: `isTokenValid(expMs, currentMs)` accepts expired authentication tokens on the exact expiration boundary because it tests `currentMs > expMs` instead of `currentMs >= expMs`. Fix the condition and verify tests pass.',
    branch: 'fix/token-expiration-boundary',
    detected_stack: ['node', 'typescript', 'vitest'],
    available_checks: {
      test: 'vitest run',
      lint: 'eslint src/',
      typecheck: 'tsc --noEmit',
    },
    project_instructions: ['README.md'],
    initialFiles: {
      'src/auth.ts': `export interface AuthToken {
  userId: string;
  exp: number; // Unix timestamp in seconds
}

export function isTokenValid(token: AuthToken, currentTimestampSec: number): boolean {
  // Check if token is expired
  if (currentTimestampSec > token.exp) {
    return false;
  }
  return true;
}
`,
      'tests/auth.test.ts': `import { describe, it, expect } from 'vitest';
import { isTokenValid } from '../src/auth';

describe('isTokenValid', () => {
  it('returns true for active future token', () => {
    expect(isTokenValid({ userId: 'u1', exp: 1700000100 }, 1700000000)).toBe(true);
  });

  it('returns false for strictly expired token', () => {
    expect(isTokenValid({ userId: 'u1', exp: 1699999900 }, 1700000000)).toBe(false);
  });

  it('rejects token at the exact expiration second boundary', () => {
    // At timestamp === exp, the token is already expired
    expect(isTokenValid({ userId: 'u1', exp: 1700000000 }, 1700000000)).toBe(false);
  });
});
`,
      'README.md': `# Auth Security Library

Token validation and JWT lifecycle helpers.
`,
    },
    expectedPatch: `--- a/src/auth.ts
+++ b/src/auth.ts
@@ -6,4 +6,4 @@
 export function isTokenValid(token: AuthToken, currentTimestampSec: number): boolean {
   // Check if token is expired
-  if (currentTimestampSec > token.exp) {
+  if (currentTimestampSec >= token.exp) {
     return false;
   }
`,
    evaluationCheck: (files: Record<string, string>, checkType: string): RunCheckResult => {
      const authContent = files['src/auth.ts'] || '';

      if (checkType === 'lint') {
        return {
          exit_code: 0,
          stdout: 'ESLint: 0 problems detected in 2 files.',
          stderr: '',
        };
      }

      const hasBoundaryFixed =
        authContent.includes('currentTimestampSec >= token.exp') ||
        authContent.includes('token.exp <= currentTimestampSec');

      if (hasBoundaryFixed) {
        return {
          exit_code: 0,
          stdout: ` ✓ tests/auth.test.ts (3)
   ✓ isTokenValid > returns true for active future token
   ✓ isTokenValid > returns false for strictly expired token
   ✓ isTokenValid > rejects token at the exact expiration second boundary

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  18ms`,
          stderr: '',
        };
      }

      return {
        exit_code: 1,
        stdout: ` ❯ tests/auth.test.ts (3)
   ✓ isTokenValid > returns true for active future token
   ✓ isTokenValid > returns false for strictly expired token
   × isTokenValid > rejects token at the exact expiration second boundary

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/auth.test.ts > isTokenValid > rejects token at the exact expiration second boundary
AssertionError: expected true to be false // Object.is equality
  - false
  + true

 ❯ tests/auth.test.ts:15:73
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)`,
        stderr: '',
      };
    },
  },
  {
    id: 'task-analytics-empty',
    title: 'Python: Empty Data List Crash in aggregator.py',
    category: 'Robustness / Edge Case',
    issueDescription:
      'Issue #215: `compute_summary(metrics)` crashes with `IndexError: list index out of range` when passed an empty list `[]`. Expected: return `{"count": 0, "mean": 0.0, "max": 0.0}` for empty input.',
    branch: 'fix/empty-metrics-guard',
    detected_stack: ['python', 'pytest'],
    available_checks: {
      test: 'pytest',
      lint: 'flake8 aggregator/',
    },
    project_instructions: ['README.md'],
    initialFiles: {
      'aggregator/metrics.py': `from typing import Dict, List

def compute_summary(values: List[float]) -> Dict[str, float]:
    # Crashes on empty values
    total = sum(values)
    count = len(values)
    max_val = max(values)
    mean = total / count
    return {
        "count": float(count),
        "mean": round(mean, 2),
        "max": float(max_val),
    }
`,
      'tests/test_metrics.py': `import pytest
from aggregator.metrics import compute_summary

def test_summary_with_values():
    res = compute_summary([10.0, 20.0, 30.0])
    assert res["count"] == 3.0
    assert res["mean"] == 20.0
    assert res["max"] == 30.0

def test_summary_empty():
    res = compute_summary([])
    assert res["count"] == 0.0
    assert res["mean"] == 0.0
    assert res["max"] == 0.0
`,
      'README.md': `# Data Aggregator Module
Metrics computation utilities for batch pipelines.
`,
    },
    expectedPatch: `--- a/aggregator/metrics.py
+++ b/aggregator/metrics.py
@@ -3,4 +3,6 @@
 def compute_summary(values: List[float]) -> Dict[str, float]:
+    if not values:
+        return {"count": 0.0, "mean": 0.0, "max": 0.0}
     total = sum(values)
`,
    evaluationCheck: (files: Record<string, string>, checkType: string): RunCheckResult => {
      const content = files['aggregator/metrics.py'] || '';

      const handlesEmpty =
        (content.includes('if not values') || content.includes('len(values) == 0') || content.includes('if not len(values)')) &&
        content.includes('"count": 0') &&
        content.includes('"mean": 0') &&
        content.includes('"max": 0');

      if (handlesEmpty) {
        return {
          exit_code: 0,
          stdout: `============================= test session starts ==============================
collected 2 items

tests/test_metrics.py ..                                                 [100%]

============================== 2 passed in 0.03s ===============================`,
          stderr: '',
        };
      }

      return {
        exit_code: 1,
        stdout: `============================= test session starts ==============================
collected 2 items

tests/test_metrics.py .F                                                 [100%]

=================================== FAILURES ===================================
______________________________ test_summary_empty ______________________________
    def test_summary_empty():
>       res = compute_summary([])

aggregator/metrics.py:6: in compute_summary
>   max_val = max(values)
E   ValueError: max() arg is an empty sequence
=========================== 1 failed, 1 passed in 0.04s ===========================`,
        stderr: '',
      };
    },
  },
];
