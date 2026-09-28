import React from 'react';
import { Play, RotateCcw, SkipForward, Terminal, Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { BenchmarkTask } from '../types/agent';

interface HeaderProps {
  activeTab: 'studio' | 'workspace' | 'tools' | 'specs';
  setActiveTab: (tab: 'studio' | 'workspace' | 'tools' | 'specs') => void;
  tasks: BenchmarkTask[];
  currentTaskId: string;
  onSelectTask: (taskId: string) => void;
  isRunning: boolean;
  isFinished: boolean;
  onRunAutonomous: () => void;
  onStepNext: () => void;
  onReset: () => void;
  useLiveGemini: boolean;
  setUseLiveGemini: (val: boolean) => void;
  hasGeminiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  tasks,
  currentTaskId,
  onSelectTask,
  isRunning,
  isFinished,
  onRunAutonomous,
  onStepNext,
  onReset,
  useLiveGemini,
  setUseLiveGemini,
  hasGeminiKey,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0d131f] sticky top-0 z-30 px-5 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 max-w-7xl mx-auto">
        {/* Zone 1: Wordmark & Task Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              LocalCoder-X
            </span>
            <span className="text-xs text-slate-400 font-mono">Agent Workbench</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Task selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="task-select" className="text-xs text-slate-400 shrink-0">
              Task:
            </label>
            <select
              id="task-select"
              value={currentTaskId}
              onChange={(e) => onSelectTask(e.target.value)}
              disabled={isRunning}
              className="bg-slate-900 border border-slate-700/80 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'studio'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agent Studio
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'workspace'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Workspace & Diff
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'tools'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Tool Runner
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === 'specs'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Docs & Specs
          </button>
        </nav>

        {/* Zone 3: Execution Actions */}
        <div className="flex items-center gap-2">
          {/* Gemini mode toggle */}
          <button
            onClick={() => setUseLiveGemini(!useLiveGemini)}
            title={
              hasGeminiKey
                ? 'Toggle between Live Gemini 3.8 and Deterministic Simulation'
                : 'Gemini Key is managed automatically via Server Secrets'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border transition-colors ${
              useLiveGemini
                ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{useLiveGemini ? 'Gemini 3.8 Flash' : 'Agent Simulator'}</span>
          </button>

          <button
            onClick={onStepNext}
            disabled={isRunning || isFinished}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5 text-sky-400" />
            <span>Step</span>
          </button>

          <button
            onClick={onRunAutonomous}
            disabled={isRunning || isFinished}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-pulse' : ''}`} />
            <span>{isRunning ? 'Executing...' : 'Run Agent'}</span>
          </button>

          <button
            onClick={onReset}
            disabled={isRunning}
            title="Reset repository to baseline"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
