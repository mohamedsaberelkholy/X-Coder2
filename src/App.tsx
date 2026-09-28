import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ExecutionLoopVisualizer } from './components/ExecutionLoopVisualizer';
import { TurnCard } from './components/TurnCard';
import { WorkspaceExplorer } from './components/WorkspaceExplorer';
import { ToolInspector } from './components/ToolInspector';
import { SystemPromptModal } from './components/SystemPromptModal';
import { FinishReportCard } from './components/FinishReportCard';
import { BENCHMARK_TASKS } from './data/benchmarkTasks';
import { BenchmarkTask, AgentTurn, LoopPhase, AgentRole, FinishArgs } from './types/agent';
import { VirtualRepo } from './engine/virtualRepo';
import {
  LOCALCODER_SYSTEM_INSTRUCTION,
  validateAndParseOutput,
  getNextAutonomousStep,
} from './engine/agentRunner';
import {
  Terminal,
  Code2,
  FileText,
  AlertCircle,
  GitBranch,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  const [tasks] = useState<BenchmarkTask[]>(BENCHMARK_TASKS);
  const [currentTaskId, setCurrentTaskId] = useState<string>(BENCHMARK_TASKS[0].id);
  const currentTask = tasks.find((t) => t.id === currentTaskId) || tasks[0];

  const repoRef = useRef<VirtualRepo>(new VirtualRepo(currentTask));
  const [, setForceUpdate] = useState(0);

  const [activeTab, setActiveTab] = useState<'studio' | 'workspace' | 'tools' | 'specs'>('studio');
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const turnsRef = useRef<AgentTurn[]>([]);
  const isFinishedRef = useRef<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [finishArgs, setFinishArgs] = useState<FinishArgs | undefined>(undefined);
  const [currentPhase, setCurrentPhase] = useState<LoopPhase>('UNDERSTAND');
  const [currentRole, setCurrentRole] = useState<AgentRole>('planner');
  const [useLiveGemini, setUseLiveGemini] = useState<boolean>(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [lastRawJson, setLastRawJson] = useState<string>('');
  const [executionSpeed, setExecutionSpeed] = useState<'fast' | 'normal'>('normal');

  const turnsEndRef = useRef<HTMLDivElement>(null);

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasGeminiKey) {
          setHasGeminiKey(true);
        }
      })
      .catch(() => {
        // standalone/preview mode
      });
  }, []);

  // When task changes, reset repo
  useEffect(() => {
    repoRef.current = new VirtualRepo(currentTask);
    resetState();
  }, [currentTaskId]);

  const resetState = () => {
    repoRef.current.reset();
    turnsRef.current = [];
    isFinishedRef.current = false;
    setTurns([]);
    setIsRunning(false);
    setIsFinished(false);
    setFinishArgs(undefined);
    setCurrentPhase('UNDERSTAND');
    setCurrentRole('planner');
    setLastRawJson('');
    setForceUpdate((v) => v + 1);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Execute one step of LocalCoder-X
  const stepAgent = async (): Promise<boolean> => {
    if (isFinishedRef.current || repoRef.current.finishedResult) return false;

    const repo = repoRef.current;
    let nextStep: { role: AgentRole; phase: LoopPhase; jsonPayload: Record<string, any> };

    if (useLiveGemini) {
      // Build conversation for Gemini API call
      try {
        const historyText = turnsRef.current
          .map((t) => {
            if (t.type === 'message') return `Model: {"message": ${JSON.stringify(t.message)}}`;
            if (t.type === 'tool_call') {
              return `Model: ${JSON.stringify({ tool: t.toolCall?.tool, arguments: t.toolCall?.arguments })}\nExecutor: ${JSON.stringify(t.toolResult)}`;
            }
            return '';
          })
          .join('\n\n');

        const promptText = `User coding task:\n${currentTask.issueDescription}\n\nExecution history so far:\n${historyText}\n\nDecide next step. Remember: Output EXACTLY ONE valid JSON object: either Mode 1 (tool call) or Mode 2 (message).`;

        const res = await fetch('/api/agent/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: LOCALCODER_SYSTEM_INSTRUCTION,
            contents: promptText,
          }),
        });

        const data = await res.json();
        if (data.fallback || data.isRateLimit) {
          setUseLiveGemini(false);
          nextStep = getNextAutonomousStep(currentTask, turnsRef.current, repo);
        } else if (data.success && data.text) {
          const parsed = validateAndParseOutput(data.text);
          if (parsed.valid) {
            if (parsed.mode === 2) {
              nextStep = {
                role: 'planner',
                phase: 'PLAN',
                jsonPayload: { message: parsed.message },
              };
            } else {
              nextStep = {
                role: parsed.toolCall?.tool === 'finish' || parsed.toolCall?.tool === 'run_check' ? 'reviewer' : 'coder',
                phase: parsed.toolCall?.tool === 'finish' ? 'COMPLETE' : parsed.toolCall?.tool === 'apply_patch' ? 'ACT' : 'VERIFY',
                jsonPayload: { tool: parsed.toolCall?.tool, arguments: parsed.toolCall?.arguments },
              };
            }
          } else {
            // fallback
            nextStep = getNextAutonomousStep(currentTask, turnsRef.current, repo);
          }
        } else {
          // fallback to simulation
          setUseLiveGemini(false);
          nextStep = getNextAutonomousStep(currentTask, turnsRef.current, repo);
        }
      } catch {
        setUseLiveGemini(false);
        nextStep = getNextAutonomousStep(currentTask, turnsRef.current, repo);
      }
    } else {
      nextStep = getNextAutonomousStep(currentTask, turnsRef.current, repo);
    }

    const { role, phase, jsonPayload } = nextStep;
    setCurrentRole(role);
    setCurrentPhase(phase);

    const rawStr = JSON.stringify(jsonPayload, null, 2);
    setLastRawJson(rawStr);

    const parsedOutput = validateAndParseOutput(rawStr);
    const nextTurnIndex = turnsRef.current.length + 1;
    const uniqueTurnId = `turn-${nextTurnIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Case 1: Mode 2 Human message
    if (parsedOutput.mode === 2) {
      const newTurn: AgentTurn = {
        id: uniqueTurnId,
        turnIndex: nextTurnIndex,
        timestamp: Date.now(),
        role,
        phase,
        type: 'message',
        message: parsedOutput.message,
        rawText: rawStr,
        validationErrors: parsedOutput.errors,
      };

      turnsRef.current = [...turnsRef.current, newTurn];
      setTurns(turnsRef.current);
      scrollToBottom();
      return true;
    }

    // Case 2: Mode 1 Tool call
    if (parsedOutput.mode === 1 && parsedOutput.toolCall) {
      const { tool, arguments: args } = parsedOutput.toolCall;

      // Execute tool in VirtualRepo
      const toolExecResult = repo.executeTool(tool, args);

      const newTurn: AgentTurn = {
        id: uniqueTurnId,
        turnIndex: nextTurnIndex,
        timestamp: Date.now(),
        role,
        phase,
        type: 'tool_call',
        toolCall: {
          tool,
          arguments: args,
        },
        toolResult: toolExecResult,
        rawText: rawStr,
        validationErrors: parsedOutput.errors,
      };

      turnsRef.current = [...turnsRef.current, newTurn];
      setTurns(turnsRef.current);
      setForceUpdate((v) => v + 1);

      if (tool === 'finish') {
        isFinishedRef.current = true;
        setIsFinished(true);
        setFinishArgs(args as FinishArgs);
        setCurrentPhase('COMPLETE');
        scrollToBottom();
        return false; // loop ended
      }

      scrollToBottom();
      return true;
    }

    return false;
  };

  // Run autonomous loop
  const handleRunAutonomous = async () => {
    if (isRunning || isFinishedRef.current) return;
    setIsRunning(true);

    const delayMs = executionSpeed === 'fast' ? 400 : 900;

    let canContinue = true;
    while (canContinue && !isFinishedRef.current) {
      canContinue = await stepAgent();
      if (!canContinue || isFinishedRef.current) break;
      await new Promise((r) => setTimeout(r, delayMs));
    }

    setIsRunning(false);
  };

  const handleStepNext = async () => {
    if (isRunning || isFinishedRef.current) return;
    setIsRunning(true);
    await stepAgent();
    setIsRunning(false);
  };

  // File saved in Workspace
  const handleFileSaved = (path: string, content: string) => {
    repoRef.current.files[path] = content;
    setForceUpdate((v) => v + 1);
  };

  const handleResetFile = (path: string) => {
    if (path in repoRef.current.originalFiles) {
      repoRef.current.files[path] = repoRef.current.originalFiles[path];
      setForceUpdate((v) => v + 1);
    }
  };

  const currentDiff = repoRef.current.git_diff().result.diff;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tasks={tasks}
        currentTaskId={currentTaskId}
        onSelectTask={setCurrentTaskId}
        isRunning={isRunning}
        isFinished={isFinished}
        onRunAutonomous={handleRunAutonomous}
        onStepNext={handleStepNext}
        onReset={resetState}
        useLiveGemini={useLiveGemini}
        setUseLiveGemini={setUseLiveGemini}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 flex flex-col gap-4">
        {/* Execution Loop Visualizer */}
        <ExecutionLoopVisualizer
          currentPhase={currentPhase}
          currentRole={currentRole}
          turnCount={turns.length}
          attempts={repoRef.current.attempts || 1}
          isFinished={isFinished}
          finishStatus={finishArgs?.status}
        />

        {/* Studio Tab View */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Left Column: Task Specification & Output Stream Inspector (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Task Brief */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{currentTask.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                    {currentTask.category}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans text-[11px]">
                  {currentTask.issueDescription}
                </p>

                <div className="pt-2 border-t border-slate-800 text-[11px] font-mono space-y-1 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{currentTask.branch}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Stack:</span>
                    <span className="text-slate-200">{currentTask.detected_stack.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Check:</span>
                    <span className="text-slate-200">
                      {Object.values(currentTask.available_checks).join(' · ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strict JSON Output Inspector */}
              <div className="bg-[#0b0f17] border border-slate-800 rounded-lg p-3 text-xs flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-slate-200 font-medium">Model Output Stream</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Strict JSON Mode</span>
                </div>

                <div className="flex-1 overflow-auto font-mono text-[11px]">
                  {lastRawJson ? (
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-black/50 border border-slate-800 text-slate-300 whitespace-pre-wrap">
                        {lastRawJson}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        <span>Validated single JSON object format (Mode 1 / Mode 2 compliant)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                      <Code2 className="w-6 h-6 mb-2 opacity-40" />
                      <p>Awaiting first agent loop cycle. Click "Run Agent" or "Step" above.</p>
                    </div>
                  )}
                </div>

                {/* Speed toggle */}
                <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Loop Delay:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExecutionSpeed('normal')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        executionSpeed === 'normal'
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      900ms
                    </button>
                    <button
                      onClick={() => setExecutionSpeed('fast')}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        executionSpeed === 'fast'
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      400ms
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Execution Turns Timeline & Finish Card (8 cols) */}
            <div className="lg:col-span-8 bg-[#0b0f17] border border-slate-800 rounded-lg p-4 flex flex-col h-[740px] overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono text-slate-200 font-medium">Agent Turn History</span>
                  <span className="text-slate-500 font-mono text-xs">({turns.length} turns)</span>
                </div>

                {currentDiff && (
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>View Diff in Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Scrollable turns list */}
              <div className="flex-1 overflow-y-auto pr-1">
                {turns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
                      <Terminal className="w-6 h-6 text-slate-400" />
                    </div>
                    <h4 className="font-semibold text-slate-300 mb-1">LocalCoder-X Ready</h4>
                    <p className="max-w-md text-xs leading-relaxed text-slate-400">
                      The autonomous software engineering agent operates with 7 tools (repo_overview,
                      search_code, read_file, apply_patch, git_diff, run_check, finish).
                    </p>
                    <button
                      onClick={handleStepNext}
                      className="mt-4 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
                    >
                      Start First Turn
                    </button>
                  </div>
                ) : (
                  <>
                    {turns.map((turn, idx) => (
                      <TurnCard key={`${turn.id || 'turn'}-${idx}`} turn={turn} />
                    ))}

                    {isFinished && (
                      <FinishReportCard
                        finishArgs={finishArgs}
                        currentDiff={currentDiff}
                        onReset={resetState}
                      />
                    )}

                    <div ref={turnsEndRef} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspace Tab View */}
        {activeTab === 'workspace' && (
          <WorkspaceExplorer
            repo={repoRef.current}
            onFileSaved={handleFileSaved}
            onResetFile={handleResetFile}
            currentDiff={currentDiff}
          />
        )}

        {/* Tool Runner Tab View */}
        {activeTab === 'tools' && (
          <ToolInspector
            repo={repoRef.current}
            onToolExecuted={() => setForceUpdate((v) => v + 1)}
          />
        )}

        {/* System Prompt & Specifications Tab View */}
        {activeTab === 'specs' && <SystemPromptModal />}
      </main>
    </div>
  );
}
