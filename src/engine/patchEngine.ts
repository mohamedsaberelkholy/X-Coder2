/**
 * Real unified diff parser, patch applier, and diff generator
 * for the LocalCoder-X tool environment.
 */

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[]; // includes ' ', '+', '-' prefixes
}

export interface FilePatch {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export function parseUnifiedDiff(diffText: string): FilePatch[] {
  const patches: FilePatch[] = [];
  const lines = diffText.replace(/\r\n/g, '\n').split('\n');

  let currentPatch: FilePatch | null = null;
  let currentHunk: DiffHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('--- ')) {
      const oldPath = line.replace(/^---\s+(a\/)?/, '').trim();
      currentPatch = { oldPath, newPath: '', hunks: [] };
      patches.push(currentPatch);
      currentHunk = null;
    } else if (line.startsWith('+++ ') && currentPatch) {
      const newPath = line.replace(/^\+\+\+\s+(b\/)?/, '').trim();
      currentPatch.newPath = newPath;
    } else if (line.startsWith('@@') && currentPatch) {
      // @@ -10,7 +10,9 @@ optional section
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldLines: match[2] ? parseInt(match[2], 10) : 1,
          newStart: parseInt(match[3], 10),
          newLines: match[4] ? parseInt(match[4], 10) : 1,
          lines: [],
        };
        currentPatch.hunks.push(currentHunk);
      }
    } else if (currentHunk) {
      if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ') || line === '') {
        currentHunk.lines.push(line === '' ? ' ' : line);
      }
    }
  }

  return patches;
}

export function applyUnifiedDiffToFile(
  fileContent: string,
  patch: FilePatch,
): { success: boolean; newContent?: string; error?: string } {
  let fileLines = fileContent.replace(/\r\n/g, '\n').split('\n');

  for (let hIdx = 0; hIdx < patch.hunks.length; hIdx++) {
    const hunk = patch.hunks[hIdx];
    const expectedOldLines: string[] = [];
    const replacementLines: string[] = [];

    for (const l of hunk.lines) {
      const prefix = l[0];
      const content = l.slice(1);
      if (prefix === ' ') {
        expectedOldLines.push(content);
        replacementLines.push(content);
      } else if (prefix === '-') {
        expectedOldLines.push(content);
      } else if (prefix === '+') {
        replacementLines.push(content);
      }
    }

    // Try finding the matching lines starting near oldStart
    let targetIdx = hunk.oldStart - 1;
    let found = false;

    // Check at exact targetIdx
    if (matchesAt(fileLines, targetIdx, expectedOldLines)) {
      found = true;
    } else {
      // Search with offset window ± 10 lines
      for (let offset = 1; offset <= 20; offset++) {
        if (matchesAt(fileLines, targetIdx + offset, expectedOldLines)) {
          targetIdx = targetIdx + offset;
          found = true;
          break;
        }
        if (targetIdx - offset >= 0 && matchesAt(fileLines, targetIdx - offset, expectedOldLines)) {
          targetIdx = targetIdx - offset;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // Fallback: search anywhere in file if unique
      const occurrences: number[] = [];
      for (let i = 0; i <= fileLines.length - expectedOldLines.length; i++) {
        if (matchesAt(fileLines, i, expectedOldLines)) {
          occurrences.push(i);
        }
      }
      if (occurrences.length === 1) {
        targetIdx = occurrences[0];
        found = true;
      }
    }

    if (!found) {
      return {
        success: false,
        error: `git apply error: patch does not apply at hunk #${hIdx + 1} (${patch.newPath || patch.oldPath})`,
      };
    }

    // Replace lines in fileLines
    fileLines.splice(targetIdx, expectedOldLines.length, ...replacementLines);
  }

  return {
    success: true,
    newContent: fileLines.join('\n'),
  };
}

function matchesAt(fileLines: string[], start: number, expected: string[]): boolean {
  if (start < 0 || start + expected.length > fileLines.length) return false;
  for (let i = 0; i < expected.length; i++) {
    // Trim right trailing whitespace for robustness like git apply --ignore-space-change
    if (fileLines[start + i].trimEnd() !== expected[i].trimEnd()) {
      return false;
    }
  }
  return true;
}

/**
 * Generate a standard unified diff between original and modified text
 */
export function generateUnifiedDiff(
  oldPath: string,
  newPath: string,
  oldText: string,
  newText: string,
): string {
  if (oldText === newText) return '';

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Simple Myers / LCS diff
  const diffHunks = computeDiffHunks(oldLines, newLines);
  if (diffHunks.length === 0) return '';

  let out = `--- a/${oldPath}\n+++ b/${newPath}\n`;
  for (const hunk of diffHunks) {
    out += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
    for (const l of hunk.lines) {
      out += l + '\n';
    }
  }

  return out.trimEnd();
}

function computeDiffHunks(oldLines: string[], newLines: string[]): DiffHunk[] {
  // LCS table
  const n = oldLines.length;
  const m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack edit operations
  const edits: Array<{ type: ' ' | '-' | '+'; line: string; oldIdx?: number; newIdx?: number }> = [];
  let i = n,
    j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      edits.push({ type: ' ', line: oldLines[i - 1], oldIdx: i, newIdx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.push({ type: '+', line: newLines[j - 1], newIdx: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      edits.push({ type: '-', line: oldLines[i - 1], oldIdx: i });
      i--;
    }
  }

  edits.reverse();

  // Group edits into hunks with context lines
  const hunks: DiffHunk[] = [];
  const CONTEXT = 3;

  let currentHunkLines: string[] = [];
  let oldStart = 1;
  let newStart = 1;
  let oldLen = 0;
  let newLen = 0;
  let inHunk = false;

  for (let k = 0; k < edits.length; k++) {
    const edit = edits[k];
    const isChange = edit.type !== ' ';

    if (isChange && !inHunk) {
      inHunk = true;
      currentHunkLines = [];
      const contextStart = Math.max(0, k - CONTEXT);
      let oStart = 1;
      let nStart = 1;

      for (let c = 0; c < contextStart; c++) {
        if (edits[c].type === ' ' || edits[c].type === '-') oStart++;
        if (edits[c].type === ' ' || edits[c].type === '+') nStart++;
      }

      oldStart = oStart;
      newStart = nStart;
      oldLen = 0;
      newLen = 0;

      for (let c = contextStart; c < k; c++) {
        currentHunkLines.push(' ' + edits[c].line);
        oldLen++;
        newLen++;
      }
    }

    if (inHunk) {
      currentHunkLines.push(`${edit.type}${edit.line}`);
      if (edit.type === ' ' || edit.type === '-') oldLen++;
      if (edit.type === ' ' || edit.type === '+') newLen++;

      // Check if we should close hunk: lookahead for next changes within 2*CONTEXT
      let hasMoreChangesSoon = false;
      for (let look = k + 1; look <= Math.min(edits.length - 1, k + CONTEXT * 2); look++) {
        if (edits[look].type !== ' ') {
          hasMoreChangesSoon = true;
          break;
        }
      }

      if (!hasMoreChangesSoon && !isChange) {
        // Collect trailing context
        let trailCount = 0;
        for (let t = k + 1; t <= Math.min(edits.length - 1, k + CONTEXT); t++) {
          if (edits[t].type === ' ') {
            currentHunkLines.push(' ' + edits[t].line);
            oldLen++;
            newLen++;
            trailCount++;
          }
        }
        k += trailCount;

        hunks.push({
          oldStart,
          oldLines: oldLen,
          newStart,
          newLines: newLen,
          lines: currentHunkLines,
        });

        inHunk = false;
      }
    }
  }

  if (inHunk) {
    hunks.push({
      oldStart,
      oldLines: oldLen,
      newStart,
      newLines: newLen,
      lines: currentHunkLines,
    });
  }

  return hunks;
}
