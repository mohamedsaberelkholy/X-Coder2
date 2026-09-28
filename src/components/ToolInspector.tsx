import React, { useState } from 'react';
import { ToolName } from '../types/agent';
import { VirtualRepo } from '../engine/virtualRepo';
import { Play, Copy, Check, Terminal, Code2, AlertCircle, CheckCircle } from 'lucide-react';

interface ToolInspectorProps {
  repo: VirtualRepo;
  onToolExecuted: () => void;
}

const SAMPLE_ARGS: Record<ToolName, any> = {
  repo_overview: {},
  search_code: {
    query: 'def divide',
    path: '.',
    max_results: 5,
  },
  read_file: {
    path: 'src/calc.py',
    start_line: 1,
    end_line: 50,
  },
  apply_patch: {
    patch: `--- a/src/calc.py
+++ b/src/calc.py
@@ -10,4 +10,6 @@
 def divide(a: float, b: float) -> float:
+    if b == 0:
+        raise ValueError("division by zero")
     return a / b
`,
    reason: 'Validate divide by zero',
  },
  git_diff: {
    path: '',
  },
  run_check: {
    check_type: 'pytest',
    args: [],
  },
  finish: {
    status: 'completed',
    summary: 'Fixed divide by zero bug in calc.py',
    files_changed: ['src/calc.py'],
    checks: [
      {
        name: 'pytest',
        exit_code: 0,
        stdout: '5 passed',
      },
    ],
    attempts: 1,
  },
};

export const ToolInspector: React.FC<ToolInspectorProps> = ({ repo, onToolExecuted }) => {
  const [selectedTool, setSelectedTool] = useState<ToolName>('repo_overview');
  const [argsJson, setArgsJson] = useState<string>(
    JSON.stringify(SAMPLE_ARGS['repo_overview'], null, 2),
  );
  const [result, setResult] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelectTool = (tool: ToolName) => {
    setSelectedTool(tool);
    // dynamically adapt read_file or apply_patch sample path to current repo files
    const sample = { ...SAMPLE_ARGS[tool] };
    const firstSource = Object.keys(repo.files).find((p) => p.includes('src/') || p.includes('aggregator/'));
    if (tool === 'read_file' && firstSource) {
      sample.path = firstSource;
    }
    setArgsJson(JSON.stringify(sample, null, 2));
    setResult(null);
    setParseError(null);
  };

  const handleRun = () => {
    setParseError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(argsJson);
    } catch (e: any) {
      setParseError(`JSON Parse Error: ${e.message}`);
      return;
    }

    const execRes = repo.executeTool(selectedTool, parsed);
    setResult(execRes);
    onToolExecuted();
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[740px] text-xs">
      {/* Tool Selector List (3 cols) */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
        <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-slate-400 font-medium">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>LocalCoder-X Tools</span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto">
          {(Object.keys(SAMPLE_ARGS) as ToolName[]).map((t) => {
            const isSelected = t === selectedTool;
            return (
              <button
                key={t}
                onClick={() => handleSelectTool(t)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded font-mono text-[11px] text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-emerald-300 font-semibold shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <span>{t}</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
          <span>Total Tools: 7 · Strict Mode</span>
        </div>
      </div>

      {/* Invocation and Output Panes (9 cols) */}
      <div className="lg:col-span-9 grid grid-rows-2 gap-4 h-full">
        {/* Top: Arguments Editor */}
        <div className="bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-slate-200 font-semibold">{selectedTool}</span>
              <span className="text-slate-500 font-mono text-[11px]">(arguments)</span>
            </div>

            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-sm"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Execute Tool</span>
            </button>
          </div>

          <div className="flex-1 p-3 font-mono text-[11px]">
            {parseError && (
              <div className="mb-2 p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{parseError}</span>
              </div>
            )}
            <textarea
              value={argsJson}
              onChange={(e) => setArgsJson(e.target.value)}
              className="w-full h-full bg-transparent text-slate-200 outline-none resize-none font-mono"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Bottom: Executor Tool Result */}
        <div className="bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2 font-mono text-slate-200">
              <span>Executor Response</span>
              {result && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                    result.ok
                      ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-800 bg-rose-950/40 text-rose-300'
                  }`}
                >
                  {result.ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {result.ok ? 'ok: true' : 'ok: false'}
                </span>
              )}
            </div>

            {result && (
              <button
                onClick={copyResult}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy response JSON"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-3 overflow-auto font-mono text-[11px]">
            {result ? (
              <pre className="text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Terminal className="w-6 h-6 mb-2 opacity-40" />
                <p>Click "Execute Tool" above to inspect raw executor return format.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
