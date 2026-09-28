import React, { useState } from 'react';
import { AgentTurn } from '../types/agent';
import {
  Code,
  CheckCircle,
  XCircle,
  Copy,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  Search,
  FolderGit2,
  FileCheck2,
  GitCommit,
  Check,
} from 'lucide-react';

interface TurnCardProps {
  turn: AgentTurn;
}

export const TurnCard: React.FC<TurnCardProps> = ({ turn }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getToolIcon = (toolName?: string) => {
    switch (toolName) {
      case 'repo_overview':
        return <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'search_code':
        return <Search className="w-3.5 h-3.5 text-sky-400" />;
      case 'read_file':
        return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
      case 'apply_patch':
        return <Code className="w-3.5 h-3.5 text-emerald-400" />;
      case 'git_diff':
        return <GitCommit className="w-3.5 h-3.5 text-indigo-400" />;
      case 'run_check':
        return <Terminal className="w-3.5 h-3.5 text-purple-400" />;
      case 'finish':
        return <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Code className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // 1. Message Turn (Mode 2)
  if (turn.type === 'message') {
    return (
      <div className="border border-amber-900/40 bg-slate-900/60 rounded-lg p-3 text-xs mb-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-400 text-[11px]">#{turn.turnIndex}</span>
            <span className="text-slate-500">·</span>
            <span className="font-mono uppercase font-semibold text-amber-400">{turn.role}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400 font-mono">Mode 2 (Human Message)</span>
          </div>
          <button
            onClick={() => copyText(turn.message || '')}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy message"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed pl-1">
          {turn.message}
        </div>
      </div>
    );
  }

  // 2. Tool Call Turn (Mode 1)
  const toolName = turn.toolCall?.tool;
  const toolArgs = turn.toolCall?.arguments || {};
  const isPatch = toolName === 'apply_patch';
  const patchText = isPatch && typeof toolArgs.patch === 'string' ? toolArgs.patch : '';

  return (
    <div className="border border-slate-800 bg-slate-900/80 rounded-lg p-3 text-xs mb-3 transition-colors hover:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400 text-[11px]">#{turn.turnIndex}</span>
          <span className="text-slate-500">·</span>
          <span
            className={`font-mono uppercase font-semibold ${
              turn.role === 'coder' ? 'text-sky-400' : 'text-purple-400'
            }`}
          >
            {turn.role}
          </span>
          <span className="text-slate-500">·</span>
          <div className="flex items-center gap-1.5 font-mono font-medium text-slate-200">
            {getToolIcon(toolName)}
            <span className="text-emerald-300">{toolName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {turn.toolResult && (
            <span
              className={`font-mono text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                turn.toolResult.ok
                  ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-800/80 bg-rose-950/40 text-rose-300'
              }`}
            >
              {turn.toolResult.ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {turn.toolResult.ok ? 'ok: true' : 'ok: false'}
            </span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-slate-200 p-0.5"
            title="Toggle collapse"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3">
          {/* Tool arguments */}
          <div>
            <div className="text-[11px] text-slate-400 font-mono mb-1 flex items-center justify-between">
              <span>Arguments:</span>
              <button
                onClick={() => copyText(JSON.stringify(turn.toolCall, null, 2))}
                className="hover:text-slate-200 transition-colors"
                title="Copy tool call JSON"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Special display for patch */}
            {isPatch && patchText ? (
              <div className="bg-[#0b0f17] border border-slate-800/90 rounded p-2.5 font-mono text-[11px] overflow-x-auto">
                <div className="text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
                  Reason: <span className="text-slate-200 font-sans">{toolArgs.reason}</span>
                </div>
                <div className="space-y-0.5">
                  {patchText.split('\n').map((line, idx) => {
                    const isAdd = line.startsWith('+') && !line.startsWith('+++');
                    const isDel = line.startsWith('-') && !line.startsWith('---');
                    const isHunk = line.startsWith('@@');
                    const isHeader = line.startsWith('---') || line.startsWith('+++');
                    return (
                      <div
                        key={idx}
                        className={`${
                          isAdd
                            ? 'text-emerald-400 bg-emerald-950/20'
                            : isDel
                            ? 'text-rose-400 bg-rose-950/20'
                            : isHunk
                            ? 'text-sky-400 bg-sky-950/20 font-semibold'
                            : isHeader
                            ? 'text-amber-400 font-semibold'
                            : 'text-slate-300'
                        }`}
                      >
                        {line || ' '}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <pre className="bg-[#0b0f17] border border-slate-800/90 rounded p-2 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(toolArgs, null, 2)}
              </pre>
            )}
          </div>

          {/* Tool Result */}
          {turn.toolResult && (
            <div>
              <div className="text-[11px] text-slate-400 font-mono mb-1">Executor Response:</div>
              {turn.toolResult.error ? (
                <div className="bg-rose-950/30 border border-rose-900/60 rounded p-2 font-mono text-[11px] text-rose-300 whitespace-pre-wrap">
                  {turn.toolResult.error}
                </div>
              ) : toolName === 'run_check' ? (
                <div className="bg-black/80 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-200 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-800">
                    <span className="text-slate-400">Exit Code:</span>
                    <span
                      className={`font-semibold ${
                        turn.toolResult.result?.exit_code === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {turn.toolResult.result?.exit_code}
                    </span>
                  </div>
                  {turn.toolResult.result?.stdout && (
                    <div className="whitespace-pre-wrap text-emerald-300/90">
                      {turn.toolResult.result?.stdout}
                    </div>
                  )}
                  {turn.toolResult.result?.stderr && (
                    <div className="whitespace-pre-wrap text-rose-400 mt-1">
                      {turn.toolResult.result?.stderr}
                    </div>
                  )}
                </div>
              ) : toolName === 'git_diff' ? (
                <div className="bg-[#0b0f17] border border-slate-800 rounded p-2.5 font-mono text-[11px] overflow-x-auto">
                  {turn.toolResult.result?.diff ? (
                    turn.toolResult.result.diff.split('\n').map((line: string, idx: number) => {
                      const isAdd = line.startsWith('+') && !line.startsWith('+++');
                      const isDel = line.startsWith('-') && !line.startsWith('---');
                      return (
                        <div
                          key={idx}
                          className={`${
                            isAdd
                              ? 'text-emerald-400 bg-emerald-950/20'
                              : isDel
                              ? 'text-rose-400 bg-rose-950/20'
                              : 'text-slate-300'
                          }`}
                        >
                          {line || ' '}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-slate-500 italic">Working tree clean (no modified files)</span>
                  )}
                </div>
              ) : (
                <pre className="bg-[#0b0f17] border border-slate-800/90 rounded p-2 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(turn.toolResult.result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
