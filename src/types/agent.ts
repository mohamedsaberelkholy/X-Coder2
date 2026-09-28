export type ToolName =
  | 'repo_overview'
  | 'search_code'
  | 'read_file'
  | 'apply_patch'
  | 'git_diff'
  | 'run_check'
  | 'finish';

export interface RepoOverviewResult {
  root: string;
  branch: string;
  detected_stack: string[];
  available_checks: Record<string, string>;
  project_instructions: string[];
  git_status: {
    modified: string[];
    untracked: string[];
  };
}

export interface SearchCodeArgs {
  query: string;
  path: string;
  max_results?: number;
}

export interface SearchCodeItem {
  file: string;
  line: number;
  text: string;
}

export interface ReadFileArgs {
  path: string;
  start_line: number;
  end_line: number;
}

export interface ReadFileResult {
  path: string;
  content: string;
}

export interface ApplyPatchArgs {
  patch: string;
  reason: string;
}

export interface ApplyPatchResult {
  applied: boolean;
  changed_files: string[];
  summary: string;
}

export interface GitDiffArgs {
  path?: string;
}

export interface GitDiffResult {
  diff: string;
}

export interface RunCheckArgs {
  check_type: 'pytest' | 'lint' | 'typecheck' | 'custom';
  args?: string[];
}

export interface RunCheckResult {
  exit_code: number;
  stdout: string;
  stderr: string;
}

export interface FinishCheckItem {
  name: string;
  exit_code: number;
  stdout?: string;
}

export interface FinishArgs {
  status: 'completed' | 'blocked' | 'needs_approval';
  summary: string;
  files_changed: string[];
  checks: FinishCheckItem[];
  attempts: number;
}

export interface FinishResult {
  finished: boolean;
  status: 'completed' | 'blocked' | 'needs_approval';
  summary: string;
  files_changed: string[];
}

export type LoopPhase =
  | 'UNDERSTAND'
  | 'PLAN'
  | 'ACT'
  | 'VERIFY'
  | 'REFLECT'
  | 'REPLAN'
  | 'COMPLETE';

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'executor';

export interface AgentTurn {
  id: string;
  turnIndex: number;
  timestamp: number;
  role: AgentRole;
  phase: LoopPhase;
  type: 'message' | 'tool_call' | 'tool_result' | 'system_alert';
  message?: string;
  toolCall?: {
    tool: ToolName;
    arguments: Record<string, any>;
  };
  toolResult?: {
    ok: boolean;
    result?: any;
    error?: string;
  };
  validationErrors?: string[];
  rawText?: string;
  attemptNumber?: number;
}

export interface BenchmarkTask {
  id: string;
  title: string;
  category: string;
  issueDescription: string;
  branch: string;
  detected_stack: string[];
  available_checks: Record<string, string>;
  project_instructions: string[];
  initialFiles: Record<string, string>;
  expectedPatch: string;
  evaluationCheck: (files: Record<string, string>, checkType: string) => RunCheckResult;
}
