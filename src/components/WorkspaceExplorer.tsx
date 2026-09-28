import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  Folder,
  GitBranch,
  Save,
  RotateCcw,
  Check,
  Eye,
  Edit3,
  GitCompare,
  Plus,
  Trash2,
} from 'lucide-react';
import { VirtualRepo } from '../engine/virtualRepo';

interface WorkspaceExplorerProps {
  repo: VirtualRepo;
  onFileSaved: (path: string, content: string) => void;
  onResetFile: (path: string) => void;
  currentDiff: string;
}

export const WorkspaceExplorer: React.FC<WorkspaceExplorerProps> = ({
  repo,
  onFileSaved,
  onResetFile,
  currentDiff,
}) => {
  const fileKeys = Object.keys(repo.files);
  const [selectedPath, setSelectedPath] = useState<string>(fileKeys[0] || '');
  const [editorContent, setEditorContent] = useState<string>(
    repo.files[selectedPath] || '',
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'diff'>('editor');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSelectFile = (path: string) => {
    setSelectedPath(path);
    setEditorContent(repo.files[path] || '');
    setIsEditing(false);
  };

  const handleSave = () => {
    onFileSaved(selectedPath, editorContent);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  const handleResetCurrent = () => {
    onResetFile(selectedPath);
    setEditorContent(repo.originalFiles[selectedPath] || '');
    setIsEditing(false);
  };

  const isModified =
    repo.originalFiles[selectedPath] !== repo.files[selectedPath];
  const fileLines = (repo.files[selectedPath] || '').split('\n');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[740px] text-xs">
      {/* File Tree Column (3 cols) */}
      <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>Repository Tree</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            {fileKeys.length} files
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 mb-2 bg-slate-950/60 rounded border border-slate-800/80 font-mono text-[11px] text-slate-400">
          <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate">{repo.task.branch}</span>
        </div>

        {/* File items list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {fileKeys.map((path) => {
            const modified = repo.originalFiles[path] !== repo.files[path];
            const isSelected = path === selectedPath;

            return (
              <button
                key={path}
                onClick={() => handleSelectFile(path)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded font-mono text-[11px] text-left transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {path.endsWith('.py') ||
                  path.endsWith('.ts') ||
                  path.endsWith('.js') ? (
                    <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate">{path}</span>
                </div>
                {modified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Git status footer */}
        <div className="pt-2 mt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center justify-between">
            <span>Working Tree:</span>
            <span
              className={
                currentDiff ? 'text-amber-400 font-semibold' : 'text-emerald-400'
              }
            >
              {currentDiff ? 'MODIFIED' : 'CLEAN'}
            </span>
          </div>
        </div>
      </div>

      {/* Editor & Diff Column (9 cols) */}
      <div className="lg:col-span-9 bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col h-full overflow-hidden">
        {/* Editor Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-slate-200 font-medium">
              {selectedPath}
            </span>
            {isModified && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/60">
                Modified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View/Diff toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs">
              <button
                onClick={() => setActiveSubTab('editor')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  activeSubTab === 'editor'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Source</span>
              </button>
              <button
                onClick={() => setActiveSubTab('diff')}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                  activeSubTab === 'diff'
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitCompare className="w-3 h-3" />
                <span>Working Diff</span>
              </button>
            </div>

            {activeSubTab === 'editor' && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditorContent(repo.files[selectedPath] || '');
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors"
                  >
                    <Edit3 className="w-3 h-3 text-sky-400" />
                    <span>Edit File</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                    >
                      {savedSuccess ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      <span>Save</span>
                    </button>
                  </div>
                )}

                {isModified && (
                  <button
                    onClick={handleResetCurrent}
                    title="Revert changes to original baseline"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed">
          {activeSubTab === 'diff' ? (
            currentDiff ? (
              <div className="space-y-0.5">
                {currentDiff.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+') && !line.startsWith('+++');
                  const isDel = line.startsWith('-') && !line.startsWith('---');
                  const isHunk = line.startsWith('@@');
                  const isHeader =
                    line.startsWith('---') || line.startsWith('+++');

                  return (
                    <div
                      key={idx}
                      className={`px-2 py-0.5 rounded-sm ${
                        isAdd
                          ? 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500'
                          : isDel
                          ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500'
                          : isHunk
                          ? 'bg-sky-950/30 text-sky-300 font-semibold'
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <GitCompare className="w-8 h-8 mb-2 opacity-50" />
                <p>Working tree has no differences compared to baseline.</p>
              </div>
            )
          ) : isEditing ? (
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              className="w-full h-full bg-transparent text-slate-200 outline-none resize-none font-mono"
              spellCheck={false}
            />
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {fileLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="w-10 select-none text-right pr-4 text-slate-600 font-mono text-[11px] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="text-slate-200 whitespace-pre font-mono">
                      {line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
