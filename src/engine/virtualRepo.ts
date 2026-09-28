import {
  BenchmarkTask,
  RepoOverviewResult,
  SearchCodeArgs,
  SearchCodeItem,
  ReadFileArgs,
  ReadFileResult,
  ApplyPatchArgs,
  ApplyPatchResult,
  GitDiffArgs,
  GitDiffResult,
  RunCheckArgs,
  RunCheckResult,
  FinishArgs,
  FinishResult,
} from '../types/agent';
import { parseUnifiedDiff, applyUnifiedDiffToFile, generateUnifiedDiff } from './patchEngine';

export class VirtualRepo {
  public task: BenchmarkTask;
  public files: Record<string, string>;
  public originalFiles: Record<string, string>;
  public finishedResult: FinishResult | null = null;
  public attempts: number = 0;

  constructor(task: BenchmarkTask) {
    this.task = task;
    this.files = { ...task.initialFiles };
    this.originalFiles = { ...task.initialFiles };
    this.finishedResult = null;
    this.attempts = 0;
  }

  public reset(): void {
    this.files = { ...this.task.initialFiles };
    this.originalFiles = { ...this.task.initialFiles };
    this.finishedResult = null;
    this.attempts = 0;
  }

  // 1) repo_overview
  public repo_overview(): { ok: boolean; result: RepoOverviewResult } {
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const [path, content] of Object.entries(this.files)) {
      if (!(path in this.originalFiles)) {
        untracked.push(path);
      } else if (this.originalFiles[path] !== content) {
        modified.push(path);
      }
    }

    return {
      ok: true,
      result: {
        root: `/workspace/${this.task.id}`,
        branch: this.task.branch,
        detected_stack: this.task.detected_stack,
        available_checks: this.task.available_checks,
        project_instructions: this.task.project_instructions,
        git_status: {
          modified,
          untracked,
        },
      },
    };
  }

  // 2) search_code
  public search_code(args: SearchCodeArgs): { ok: boolean; result: SearchCodeItem[] } {
    const { query, path = '.', max_results = 10 } = args;
    const results: SearchCodeItem[] = [];

    let regex: RegExp;
    try {
      regex = new RegExp(query, 'i');
    } catch {
      regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const normalizedFilterPath = path === '.' ? '' : path.replace(/^\.\//, '');

    for (const [filePath, content] of Object.entries(this.files)) {
      if (normalizedFilterPath && !filePath.startsWith(normalizedFilterPath)) {
        continue;
      }

      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        if (regex.test(lineText)) {
          results.push({
            file: filePath,
            line: i + 1,
            text: lineText.trim(),
          });
          if (results.length >= max_results) {
            break;
          }
        }
      }

      if (results.length >= max_results) {
        break;
      }
    }

    return { ok: true, result: results };
  }

  // 3) read_file
  public read_file(args: ReadFileArgs): { ok: boolean; result?: ReadFileResult; error?: string } {
    const { path, start_line = 1, end_line = 400 } = args;

    if (!path || !(path in this.files)) {
      return {
        ok: false,
        error: `File not found: ${path}. Available files: ${Object.keys(this.files).join(', ')}`,
      };
    }

    const lines = this.files[path].split('\n');
    const actualStart = Math.max(1, start_line);
    const actualEnd = Math.min(lines.length, end_line);

    if (actualStart > lines.length) {
      return {
        ok: true,
        result: {
          path,
          content: '',
        },
      };
    }

    const sliced = lines.slice(actualStart - 1, actualEnd);
    return {
      ok: true,
      result: {
        path,
        content: sliced.join('\n'),
      },
    };
  }

  // 4) apply_patch
  public apply_patch(args: ApplyPatchArgs): { ok: boolean; result?: ApplyPatchResult; error?: string } {
    const { patch, reason = 'Code repair' } = args;

    if (!patch || typeof patch !== 'string') {
      return {
        ok: false,
        error: 'Invalid patch argument: patch string must be provided.',
      };
    }

    // Safety checks as defined in prompt:
    // - no path traversal
    // - patch size limit
    if (patch.includes('../') || patch.includes('..\\')) {
      return {
        ok: false,
        error: 'Security rejection: path traversal not allowed in patch.',
      };
    }

    if (patch.length > 50000) {
      return {
        ok: false,
        error: 'Patch size exceeds maximum allowable limit (50KB).',
      };
    }

    const filePatches = parseUnifiedDiff(patch);
    if (filePatches.length === 0) {
      return {
        ok: false,
        error: 'git apply error: corrupt patch or no valid diff hunks detected.',
      };
    }

    const changedFiles: string[] = [];

    for (const fp of filePatches) {
      const targetPath = fp.newPath || fp.oldPath;
      if (!targetPath) {
        return {
          ok: false,
          error: 'git apply error: unable to resolve target file path from unified diff.',
        };
      }

      if (!(targetPath in this.files)) {
        return {
          ok: false,
          error: `git apply error: target file "${targetPath}" does not exist in repository.`,
        };
      }

      const applyRes = applyUnifiedDiffToFile(this.files[targetPath], fp);
      if (!applyRes.success || applyRes.newContent === undefined) {
        return {
          ok: false,
          error: applyRes.error || `git apply error on ${targetPath}`,
        };
      }

      // Update in memory
      this.files[targetPath] = applyRes.newContent;
      changedFiles.push(targetPath);
    }

    return {
      ok: true,
      result: {
        applied: true,
        changed_files: changedFiles,
        summary: `Applied patch (${reason}): changed ${changedFiles.length} file(s)`,
      },
    };
  }

  // 5) git_diff
  public git_diff(args: GitDiffArgs = {}): { ok: boolean; result: GitDiffResult } {
    const { path } = args;
    let fullDiff = '';

    const pathsToInspect = path ? [path] : Object.keys(this.files);

    for (const filePath of pathsToInspect) {
      const orig = this.originalFiles[filePath] ?? '';
      const current = this.files[filePath] ?? '';

      if (orig !== current) {
        const fileDiff = generateUnifiedDiff(filePath, filePath, orig, current);
        if (fileDiff) {
          fullDiff += (fullDiff ? '\n' : '') + fileDiff;
        }
      }
    }

    return {
      ok: true,
      result: {
        diff: fullDiff,
      },
    };
  }

  // 6) run_check
  public run_check(args: RunCheckArgs): { ok: boolean; result: RunCheckResult; error?: string } {
    const { check_type } = args;

    const allowed = ['pytest', 'lint', 'typecheck', 'custom'];
    if (!allowed.includes(check_type)) {
      return {
        ok: false,
        error: `run_check error: check_type "${check_type}" is not allowlisted. Allowed checks: ${allowed.join(', ')}`,
        result: { exit_code: 1, stdout: '', stderr: `Check type not allowed: ${check_type}` },
      };
    }

    const checkResult = this.task.evaluationCheck(this.files, check_type);
    return {
      ok: true,
      result: checkResult,
    };
  }

  // 7) finish
  public finish(args: FinishArgs): { ok: boolean; result: FinishResult; error?: string } {
    const { status, summary, files_changed = [], checks = [], attempts = 1 } = args;

    if (!['completed', 'blocked', 'needs_approval'].includes(status)) {
      return {
        ok: false,
        error: `finish error: invalid status "${status}". Allowed values: completed | blocked | needs_approval`,
        result: {
          finished: false,
          status: 'blocked',
          summary: 'Invalid finish status',
          files_changed: [],
        },
      };
    }

    this.finishedResult = {
      finished: true,
      status,
      summary,
      files_changed,
    };
    this.attempts = attempts;

    return {
      ok: true,
      result: this.finishedResult,
    };
  }

  // Generic executor dispatch
  public executeTool(toolName: string, args: Record<string, any>): { ok: boolean; result?: any; error?: string } {
    switch (toolName) {
      case 'repo_overview':
        return this.repo_overview();
      case 'search_code':
        return this.search_code(args as SearchCodeArgs);
      case 'read_file':
        return this.read_file(args as ReadFileArgs);
      case 'apply_patch':
        return this.apply_patch(args as ApplyPatchArgs);
      case 'git_diff':
        return this.git_diff(args as GitDiffArgs);
      case 'run_check':
        return this.run_check(args as RunCheckArgs);
      case 'finish':
        return this.finish(args as FinishArgs);
      default:
        return {
          ok: false,
          error: `Unknown tool: "${toolName}". Available tools: repo_overview, search_code, read_file, apply_patch, git_diff, run_check, finish.`,
        };
    }
  }
}
