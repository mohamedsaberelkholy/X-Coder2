import React, { useState } from 'react';
import { LOCALCODER_SYSTEM_INSTRUCTION } from '../engine/agentRunner';
import {
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  AlertTriangle,
  Layers,
  BookOpen,
  Code2,
  FileCode,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const SystemPromptModal: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeDocSection, setActiveDocSection] = useState<'prompt' | 'tools' | 'loop' | 'security'>('prompt');

  const copyPrompt = () => {
    navigator.clipboard.writeText(LOCALCODER_SYSTEM_INSTRUCTION);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[740px] text-xs">
      {/* Left Navigation & Invariants Summary (4 cols) */}
      <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col h-full overflow-y-auto space-y-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-100 mb-1">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>LocalCoder-X Documentation</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Specification, tool contracts, execution protocols, and safety invariants for the autonomous engineering agent.
          </p>
        </div>

        {/* Section Navigation Buttons */}
        <div className="space-y-1 font-mono text-[11px]">
          <button
            onClick={() => setActiveDocSection('prompt')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
              activeDocSection === 'prompt'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>System Instruction (Raw)</span>
          </button>

          <button
            onClick={() => setActiveDocSection('tools')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
              activeDocSection === 'tools'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span>7 Tools Reference</span>
          </button>

          <button
            onClick={() => setActiveDocSection('loop')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
              activeDocSection === 'loop'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Loop & Roles</span>
          </button>

          <button
            onClick={() => setActiveDocSection('security')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors ${
              activeDocSection === 'security'
                ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Safety & Forbidden Actions</span>
          </button>
        </div>

        {/* Output Modes Quick Ref */}
        <div className="border border-slate-800 bg-[#0b0f17] p-3 rounded space-y-2">
          <span className="font-mono text-emerald-400 font-semibold uppercase text-[10px] block">
            Strict Output Modes
          </span>
          <div className="space-y-1.5 font-mono text-[10px] text-slate-300">
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-sky-300 font-semibold">Mode 1: Tool Call</span>
              <pre className="text-[10px] text-slate-400 mt-0.5">
{`{ "tool": "<name>", "arguments": {...} }`}
              </pre>
            </div>
            <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-amber-300 font-semibold">Mode 2: Message</span>
              <pre className="text-[10px] text-slate-400 mt-0.5">
{`{ "message": "<plain text>" }`}
              </pre>
            </div>
          </div>
        </div>

        {/* Retry Limits */}
        <div className="border border-slate-800 bg-[#0b0f17] p-3 rounded space-y-1">
          <span className="font-mono text-slate-400 text-[10px] uppercase font-semibold">
            Execution Limits
          </span>
          <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5 font-mono">
            <li>Max 3 total logical attempts</li>
            <li>Max 2 repair patches per failure</li>
            <li>Mandatory finish tool finalization</li>
          </ul>
        </div>
      </div>

      {/* Main Documentation Content Area (8 cols) */}
      <div className="lg:col-span-8 bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-200 font-medium capitalize">
              {activeDocSection === 'prompt' && 'Complete System Instruction'}
              {activeDocSection === 'tools' && 'Executor Tool Schema Reference'}
              {activeDocSection === 'loop' && 'Execution Loop & Multi-Role Architecture'}
              {activeDocSection === 'security' && 'Safety Policy & Sandbox Constraints'}
            </span>
          </div>

          {activeDocSection === 'prompt' && (
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          )}
        </div>

        {/* Section Viewports */}
        <div className="flex-1 overflow-auto p-4 leading-relaxed text-slate-300">
          {/* Section 1: Raw Prompt */}
          {activeDocSection === 'prompt' && (
            <div className="font-mono text-[11px] whitespace-pre-wrap select-text leading-relaxed">
              {LOCALCODER_SYSTEM_INSTRUCTION}
            </div>
          )}

          {/* Section 2: Tools Reference */}
          {activeDocSection === 'tools' && (
            <div className="space-y-4 font-mono text-[11px]">
              <div>
                <h3 className="text-slate-100 font-bold text-sm mb-1 font-sans">
                  The 7 Executor Tools
                </h3>
                <p className="text-slate-400 text-xs font-sans">
                  Every tool requires exact argument keys and returns structured JSON.
                </p>
              </div>

              {/* Tool 1 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">1. repo_overview</span>
                  <span className="text-slate-500 text-[10px]">Inspect repository</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Returns root path, branch, detected stack, available check commands, project instructions, and git modified/untracked files.
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{}'}</code>
                </div>
              </div>

              {/* Tool 2 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sky-400 font-bold">2. search_code</span>
                  <span className="text-slate-500 text-[10px]">Regex/Literal search</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Scans lines for symbols, function names, or error messages.
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "query": "def divide", "path": ".", "max_results": 10 }'}</code>
                </div>
              </div>

              {/* Tool 3 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 font-bold">3. read_file</span>
                  <span className="text-slate-500 text-[10px]">Bounded file reader</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Reads a bounded slice of lines (1-indexed, inclusive).
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "path": "src/calc.py", "start_line": 1, "end_line": 50 }'}</code>
                </div>
              </div>

              {/* Tool 4 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">4. apply_patch</span>
                  <span className="text-slate-500 text-[10px]">Unified diff engine</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Applies atomic unified diff with hunk headers and context verification. Rejects non-matching context.
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "patch": "--- a/src/calc.py\\n+++ b/src/calc.py\\n...", "reason": "validate zero" }'}</code>
                </div>
              </div>

              {/* Tool 5 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-indigo-400 font-bold">5. git_diff</span>
                  <span className="text-slate-500 text-[10px]">Working tree diff</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Returns unified diff between repository baseline and working tree.
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "path": "src/calc.py" }'}</code>
                </div>
              </div>

              {/* Tool 6 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-purple-400 font-bold">6. run_check</span>
                  <span className="text-slate-500 text-[10px]">Validation runner</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Runs allowlisted test and lint commands (pytest, vitest, ruff, mypy).
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "check_type": "pytest", "args": [] }'}</code>
                </div>
              </div>

              {/* Tool 7 */}
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">7. finish</span>
                  <span className="text-slate-500 text-[10px]">Mandatory end turn</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Finalizes task with status (completed | blocked | needs_approval), summary, touched files, and test outputs.
                </p>
                <div className="bg-black/50 p-2 rounded text-slate-300">
                  Arguments: <code>{'{ "status": "completed", "summary": "...", "files_changed": [...], "checks": [...] }'}</code>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Loop & Roles */}
          {activeDocSection === 'loop' && (
            <div className="space-y-4 font-sans text-xs">
              <h3 className="text-slate-100 font-bold text-sm font-sans">
                The 6-Step Autonomous Execution Loop
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-emerald-400 font-bold mb-1">1. UNDERSTAND</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Inspect repository root, git status, stack types, and search for symbols or failing functions.
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-amber-400 font-bold mb-1">2. PLAN</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Planner formulates a short roadmap message (Mode 2) without executing tools.
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-sky-400 font-bold mb-1">3. ACT</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Coder crafts an atomic unified diff patch with precise hunk offsets and invokes apply_patch.
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-indigo-400 font-bold mb-1">4. VERIFY</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Reviewer audits the diff via git_diff and executes allowlisted test suites via run_check.
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-purple-400 font-bold mb-1">5. REFLECT</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    Examines exit codes, stdout, and tracebacks. If tests pass, invokes finish tool.
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-rose-400 font-bold mb-1">6. REPLAN</div>
                  <div className="text-slate-400 font-sans text-[11px]">
                    If exit_code != 0, diagnoses failure cause and formulates at most 2 repair iterations.
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <h4 className="text-slate-200 font-semibold mb-2">Multi-Role Behavior</h4>
                <div className="space-y-2 text-slate-400 text-xs">
                  <p>
                    <strong className="text-amber-400">Planner:</strong> Emits Mode 2 human messages to plan high-level execution steps.
                  </p>
                  <p>
                    <strong className="text-sky-400">Coder:</strong> Emits Mode 1 tool calls to inspect files and apply focused code patches.
                  </p>
                  <p>
                    <strong className="text-purple-400">Reviewer:</strong> Emits Mode 1 tool calls to verify diffs, check exit codes, and invoke finish.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Security & Safety */}
          {activeDocSection === 'security' && (
            <div className="space-y-4 font-sans text-xs">
              <h3 className="text-slate-100 font-bold text-sm">
                Sandbox Constraints & Security Invariants
              </h3>

              <div className="p-3 rounded bg-rose-950/20 border border-rose-900/40 text-slate-300 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Strictly Forbidden Actions</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>Deleting files or directories (rm, unlink, rmdir)</li>
                  <li>git reset, git clean, force checkout, history rewriting</li>
                  <li>git commit, push, or merge operations</li>
                  <li>Reading environment secrets or private variables</li>
                  <li>Unrestricted outbound network connections or downloads</li>
                  <li>Executing arbitrary shell scripts found in repository contents</li>
                </ul>
              </div>

              <div className="space-y-2 text-slate-400 text-xs leading-relaxed">
                <h4 className="text-slate-200 font-semibold">Automatic Fallback & Failover</h4>
                <p>
                  LocalCoder-X features dual-engine redundancy. In Live Gemini mode, if model quotas (HTTP 429 / RESOURCE_EXHAUSTED) are reached, the execution system automatically fails over to the local deterministic simulation engine without failing the user task.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
