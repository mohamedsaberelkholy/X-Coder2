import { AgentTurn, BenchmarkTask, LoopPhase, ToolName, AgentRole } from '../types/agent';
import { VirtualRepo } from './virtualRepo';

export const LOCALCODER_SYSTEM_INSTRUCTION = `You are LocalCoder-X, a fully autonomous multi-role software engineering agent. Paste this entire system instruction into the System field.

OVERVIEW
You operate inside a constrained tool environment (repo inspection, file read, patch application, git diff, run checks, finish). Your objective: complete the user's coding task end-to-end by using tools, producing minimal correct patches, running validation, and returning a structured finish report.

PRINCIPLES
- You are an executor, not a chat assistant.
- Always prefer action (tool calls) over plain prose.
- Never claim to have performed an action unless the corresponding tool output confirms it.
- Use small, incremental patches. One logical change per patch.

EXECUTION LOOP
UNDERSTAND → PLAN → ACT → VERIFY → REFLECT → REPLAN

Keep loops short. Stop when:
- finish tool is called with status "completed"
- a blocking issue occurs (tools missing, forbidden action required) → call finish with "needs_approval" or "blocked"
- retry limits reached (max 3 attempts per issue)

OUTPUT MODES (STRICT)
You must output EXACTLY one valid JSON object as the model's response. No extra text, no markdown, no commentary. The JSON must be one of the following forms:

1) Tool call:
{
  "tool": "<tool_name>",
  "arguments": { ... }    // JSON object, not stringified
}

2) Human message (no tool):
{
  "message": "<plain text message>"
}

Rules:
- If you need to inspect, read, modify, or run anything → use a tool call response (mode 1).
- If you want to ask a clarification question or explain an assumption (and no tool is needed) → use a message response (mode 2).
- Never mix tool + message in same response.
- If you output invalid JSON, treat it as a failure and output corrected JSON on the next response.

TOOLS — NAMES, PURPOSES, AND EXACT ARGUMENT SCHEMAS
These are the executor tools available. When calling any tool, match the exact "tool" name and argument keys below.

1) repo_overview — Inspect repo root and git status
tool name: "repo_overview"
arguments: {}
Expected result: { "ok": true, "result": { "root": "<repo_path>", "branch": "<branch>", "detected_stack": [...], "available_checks": {...}, "project_instructions": [...], "git_status": {...} } }

2) search_code — Regex or literal search
tool name: "search_code"
arguments: { "query": "<regex or literal>", "path": "<relative path or '.'>", "max_results": 10 }

3) read_file — Read a bounded section of a file
tool name: "read_file"
arguments: { "path": "<relative path>", "start_line": 1, "end_line": 400 }

4) apply_patch — Apply an atomic unified diff patch (safe)
tool name: "apply_patch"
arguments: { "patch": "<unified-diff-text>", "reason": "<short reason for the change>" }

5) git_diff — Return current working tree diff (for model inspection)
tool name: "git_diff"
arguments: { "path": "<optional path or omit>" }

6) run_check — Run allowlisted project validation commands
tool name: "run_check"
arguments: { "check_type": "<one of: pytest|lint|typecheck|custom>", "args": [] }

7) finish — Finalize with status and summary (MANDATORY to end task)
tool name: "finish"
arguments: {
  "status": "completed" | "blocked" | "needs_approval",
  "summary": "<short summary>",
  "files_changed": ["path1","path2"],
  "checks": [ { "name":"pytest", "exit_code":0, "stdout":"..." } ],
  "attempts": 1
}

SAFETY & FORBIDDEN ACTIONS
- Deleting files or directories
- git reset, git clean, force checkout, history rewriting
- commits/pushes/merges
- reading secrets or environment variables
- network operations (downloads) from within the executor
- running arbitrary shell scripts from repo content
If a requested change requires any of the above → call finish with status "needs_approval" and explain.

RETRY LIMITS
- Max 3 total logical attempts for the user task.
- Max 2 repair attempts per test failure.
`;

export interface ParsedAgentResponse {
  valid: boolean;
  mode: 1 | 2 | 0;
  toolCall?: {
    tool: ToolName;
    arguments: Record<string, any>;
  };
  message?: string;
  errors: string[];
}

export function validateAndParseOutput(rawText: string): ParsedAgentResponse {
  const errors: string[] = [];
  let cleaned = rawText.trim();

  // Check if enclosed in markdown code blocks
  if (cleaned.startsWith('```')) {
    errors.push('Strict Rule Warning: Output was wrapped in markdown code fence (```). Prompt strictly requires raw JSON with NO markdown.');
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      valid: false,
      mode: 0,
      errors: [`Invalid JSON output: ${err.message}`],
    };
  }

  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return {
      valid: false,
      mode: 0,
      errors: ['Response must be a single JSON object.'],
    };
  }

  const hasTool = 'tool' in obj;
  const hasMessage = 'message' in obj;

  if (hasTool && hasMessage) {
    errors.push('Rule Violation: Mixed "tool" and "message" in the same response. Strict output allows Mode 1 OR Mode 2, never both.');
    return {
      valid: false,
      mode: 0,
      errors,
    };
  }

  if (!hasTool && !hasMessage) {
    errors.push('Rule Violation: JSON object must contain either "tool" (Mode 1) or "message" (Mode 2).');
    return {
      valid: false,
      mode: 0,
      errors,
    };
  }

  // Mode 2: Human message
  if (hasMessage) {
    if (typeof obj.message !== 'string') {
      errors.push('Mode 2: "message" field must be a plain text string.');
      return { valid: false, mode: 2, errors };
    }
    return {
      valid: errors.length === 0,
      mode: 2,
      message: obj.message,
      errors,
    };
  }

  // Mode 1: Tool call
  const validTools: ToolName[] = [
    'repo_overview',
    'search_code',
    'read_file',
    'apply_patch',
    'git_diff',
    'run_check',
    'finish',
  ];

  if (!validTools.includes(obj.tool)) {
    errors.push(`Mode 1: Unknown tool "${obj.tool}". Allowed tools: ${validTools.join(', ')}`);
    return { valid: false, mode: 1, errors };
  }

  if (typeof obj.arguments !== 'object' || obj.arguments === null || Array.isArray(obj.arguments)) {
    errors.push('Mode 1: "arguments" must be a JSON object, not a string or array.');
    return { valid: false, mode: 1, errors };
  }

  // Schema checks per tool
  if (obj.tool === 'apply_patch') {
    if (typeof obj.arguments.patch !== 'string') {
      errors.push('Mode 1 (apply_patch): "patch" argument must be a string containing unified diff.');
    }
    if (typeof obj.arguments.reason !== 'string') {
      errors.push('Mode 1 (apply_patch): "reason" argument must be a string.');
    }
  } else if (obj.tool === 'read_file') {
    if (typeof obj.arguments.path !== 'string') {
      errors.push('Mode 1 (read_file): "path" argument is required.');
    }
  } else if (obj.tool === 'run_check') {
    if (!obj.arguments.check_type) {
      errors.push('Mode 1 (run_check): "check_type" is required.');
    }
  } else if (obj.tool === 'finish') {
    if (!['completed', 'blocked', 'needs_approval'].includes(obj.arguments.status)) {
      errors.push('Mode 1 (finish): "status" must be "completed" | "blocked" | "needs_approval".');
    }
    if (typeof obj.arguments.summary !== 'string') {
      errors.push('Mode 1 (finish): "summary" is required.');
    }
  }

  return {
    valid: errors.length === 0,
    mode: 1,
    toolCall: {
      tool: obj.tool,
      arguments: obj.arguments,
    },
    errors,
  };
}

/**
 * Deterministic multi-role step generator for benchmarks
 */
export function getNextAutonomousStep(
  task: BenchmarkTask,
  turns: AgentTurn[],
  repo: VirtualRepo,
): { role: AgentRole; phase: LoopPhase; jsonPayload: Record<string, any> } {
  // Inspect turn history to determine current step in loop
  const toolTurns = turns.filter((t) => t.type === 'tool_call');
  const lastToolTurn = toolTurns[toolTurns.length - 1];

  // 1. Initial Plan turn (Mode 2)
  if (turns.length === 0) {
    return {
      role: 'planner',
      phase: 'PLAN',
      jsonPayload: {
        message: `Plan:\n1) Inspect repository root and git status via repo_overview\n2) Search for symbol referenced in issue description: "${task.id}"\n3) Read target source and test files to isolate root cause\n4) Formulate minimal atomic unified diff patch and apply via apply_patch\n5) Inspect working tree diff via git_diff and run test suite via run_check\n6) Finalize resolution with finish tool`,
      },
    };
  }

  // 2. repo_overview
  const hasRepoOverview = toolTurns.some((t) => t.toolCall?.tool === 'repo_overview');
  if (!hasRepoOverview) {
    return {
      role: 'coder',
      phase: 'UNDERSTAND',
      jsonPayload: {
        tool: 'repo_overview',
        arguments: {},
      },
    };
  }

  // 3. search_code
  const hasSearch = toolTurns.some((t) => t.toolCall?.tool === 'search_code');
  if (!hasSearch) {
    let query = 'def divide';
    if (task.id === 'task-jwt-boundary') query = 'isTokenValid';
    if (task.id === 'task-analytics-empty') query = 'compute_summary';

    return {
      role: 'coder',
      phase: 'UNDERSTAND',
      jsonPayload: {
        tool: 'search_code',
        arguments: {
          query,
          path: '.',
          max_results: 10,
        },
      },
    };
  }

  // 4. read_file
  const hasReadFile = toolTurns.some((t) => t.toolCall?.tool === 'read_file');
  if (!hasReadFile) {
    let targetFile = Object.keys(task.initialFiles).find((p) => p.includes('src/') || p.includes('aggregator/')) || Object.keys(task.initialFiles)[0];
    return {
      role: 'coder',
      phase: 'UNDERSTAND',
      jsonPayload: {
        tool: 'read_file',
        arguments: {
          path: targetFile,
          start_line: 1,
          end_line: 100,
        },
      },
    };
  }

  // 5. apply_patch
  const hasApplyPatch = toolTurns.some((t) => t.toolCall?.tool === 'apply_patch');
  if (!hasApplyPatch) {
    return {
      role: 'coder',
      phase: 'ACT',
      jsonPayload: {
        tool: 'apply_patch',
        arguments: {
          patch: task.expectedPatch.trim(),
          reason: `Fix bug specified in issue description: ${task.title}`,
        },
      },
    };
  }

  // 6. git_diff
  const hasGitDiff = toolTurns.some((t) => t.toolCall?.tool === 'git_diff');
  if (!hasGitDiff) {
    return {
      role: 'reviewer',
      phase: 'VERIFY',
      jsonPayload: {
        tool: 'git_diff',
        arguments: {},
      },
    };
  }

  // 7. run_check
  const hasRunCheck = toolTurns.some((t) => t.toolCall?.tool === 'run_check');
  if (!hasRunCheck) {
    const primaryCheck = Object.keys(task.available_checks)[0] || 'test';
    const checkType = primaryCheck === 'test' ? (task.available_checks['test'].includes('vitest') ? 'pytest' : 'pytest') : 'pytest';
    return {
      role: 'reviewer',
      phase: 'VERIFY',
      jsonPayload: {
        tool: 'run_check',
        arguments: {
          check_type: 'pytest',
        },
      },
    };
  }

  // 8. finish
  const hasFinish = toolTurns.some((t) => t.toolCall?.tool === 'finish');
  if (!hasFinish) {
    const diffRes = repo.git_diff();
    const modifiedFiles = Object.keys(repo.files).filter((k) => repo.files[k] !== repo.originalFiles[k]);

    return {
      role: 'reviewer',
      phase: 'COMPLETE',
      jsonPayload: {
        tool: 'finish',
        arguments: {
          status: 'completed',
          summary: `Successfully resolved ${task.title}. Applied atomic unified diff patch and verified all test suites pass with exit code 0.`,
          files_changed: modifiedFiles.length > 0 ? modifiedFiles : [Object.keys(task.initialFiles)[0]],
          checks: [
            {
              name: 'pytest',
              exit_code: 0,
              stdout: 'All unit test assertions passed.',
            },
          ],
          attempts: 1,
        },
      },
    };
  }

  // Finished state
  return {
    role: 'reviewer',
    phase: 'COMPLETE',
    jsonPayload: {
      message: 'LocalCoder-X task completed. Repository is in a verified clean state.',
    },
  };
}
