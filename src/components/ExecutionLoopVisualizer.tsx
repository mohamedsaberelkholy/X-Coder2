import React from 'react';
import { LoopPhase, AgentRole } from '../types/agent';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface ExecutionLoopVisualizerProps {
  currentPhase: LoopPhase;
  currentRole: AgentRole;
  turnCount: number;
  attempts: number;
  isFinished: boolean;
  finishStatus?: 'completed' | 'blocked' | 'needs_approval' | null;
}

const PHASES: Array<{ id: LoopPhase; label: string; desc: string }> = [
  { id: 'UNDERSTAND', label: 'Understand', desc: 'repo_overview & search' },
  { id: 'PLAN', label: 'Plan', desc: 'Message strategy' },
  { id: 'ACT', label: 'Act', desc: 'apply_patch' },
  { id: 'VERIFY', label: 'Verify', desc: 'git_diff & run_check' },
  { id: 'REFLECT', label: 'Reflect', desc: 'Analyze stdout/stderr' },
  { id: 'REPLAN', label: 'Replan', desc: 'Targeted repair' },
];

export const ExecutionLoopVisualizer: React.FC<ExecutionLoopVisualizerProps> = ({
  currentPhase,
  currentRole,
  turnCount,
  attempts,
  isFinished,
  finishStatus,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium">Execution Loop</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Role:{' '}
            <span
              className={`font-mono uppercase font-semibold ${
                currentRole === 'planner'
                  ? 'text-amber-400'
                  : currentRole === 'coder'
                  ? 'text-sky-400'
                  : 'text-purple-400'
              }`}
            >
              {currentRole}
            </span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Turns: <span className="font-mono text-slate-200">{turnCount}</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            Attempt: <span className="font-mono text-slate-200">{attempts}/3</span>
          </span>
        </div>

        {isFinished && finishStatus && (
          <div className="flex items-center gap-1.5 font-mono">
            {finishStatus === 'completed' ? (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                STATUS: COMPLETED
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                STATUS: {finishStatus.toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loop steps */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {PHASES.map((p, idx) => {
          const isActive = currentPhase === p.id && !isFinished;
          return (
            <div
              key={p.id}
              className={`px-2.5 py-1.5 rounded border transition-all ${
                isActive
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500">0{idx + 1}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              </div>
              <div className={`font-semibold mt-0.5 ${isActive ? 'text-emerald-300' : 'text-slate-300'}`}>
                {p.label}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
