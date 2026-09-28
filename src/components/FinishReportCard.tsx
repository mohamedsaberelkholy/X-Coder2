import React from 'react';
import { FinishArgs, FinishResult } from '../types/agent';
import { CheckCircle2, AlertTriangle, ShieldAlert, Download, RotateCcw } from 'lucide-react';

interface FinishReportCardProps {
  finishArgs?: FinishArgs;
  finishResult?: FinishResult;
  currentDiff: string;
  onReset: () => void;
}

export const FinishReportCard: React.FC<FinishReportCardProps> = ({
  finishArgs,
  finishResult,
  currentDiff,
  onReset,
}) => {
  const status = finishArgs?.status || finishResult?.status || 'completed';
  const summary = finishArgs?.summary || finishResult?.summary || '';
  const filesChanged = finishArgs?.files_changed || finishResult?.files_changed || [];
  const checks = finishArgs?.checks || [];
  const attempts = finishArgs?.attempts || 1;

  const downloadPatch = () => {
    if (!currentDiff) return;
    const blob = new Blob([currentDiff], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localcoder-x-fix.patch';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900 rounded-lg p-4 text-xs shadow-lg mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-emerald-900/40">
        <div className="flex items-center gap-2.5">
          {status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : status === 'needs_approval' ? (
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
              <span>Task Finalized:</span>
              <span
                className={`font-mono uppercase ${
                  status === 'completed'
                    ? 'text-emerald-400'
                    : status === 'needs_approval'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Attempts: {attempts}/3 · Files Changed: {filesChanged.length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentDiff && (
            <button
              onClick={downloadPatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download .patch</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Task</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Summary text */}
        <div>
          <span className="text-slate-400 font-medium">Summary:</span>
          <p className="mt-1 text-slate-200 leading-relaxed font-sans">{summary}</p>
        </div>

        {/* Files changed */}
        {filesChanged.length > 0 && (
          <div>
            <span className="text-slate-400 font-medium">Modified Files:</span>
            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[11px]">
              {filesChanged.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Checks verification */}
        {checks.length > 0 && (
          <div>
            <span className="text-slate-400 font-medium">Validation Checks:</span>
            <div className="mt-1.5 space-y-1.5 font-mono">
              {checks.map((chk, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-black/40 border border-slate-800"
                >
                  <span className="text-slate-300 font-semibold">{chk.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      chk.exit_code === 0
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                        : 'bg-rose-950/60 text-rose-300 border border-rose-800/80'
                    }`}
                  >
                    exit_code: {chk.exit_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
