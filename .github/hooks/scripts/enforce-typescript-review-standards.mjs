import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  getTypeScriptCandidateFiles,
  getWorkspaceRoot,
  isEditToolPayload,
  readHookInput,
} from './hook-utils.mjs';

const DISALLOWED_PATTERNS = [
  { label: 'type annotation', regex: /:\s*any\b/g },
  { label: 'cast', regex: /\bas\s+any\b/g },
  { label: 'angle-bracket cast', regex: /<any>/g },
  { label: 'array type', regex: /\bany\[]/g },
  { label: 'generic any', regex: /\b(?:Array|ReadonlyArray|Promise|Record|Map|Set)<[^>]*\bany\b[^>]*>/g },
];

const payload = await readHookInput();

if (!isEditToolPayload(payload)) {
  process.exit(0);
}

const workspaceRoot = getWorkspaceRoot();
const files = getTypeScriptCandidateFiles(payload);
const violations = [];

for (const filePath of files) {
  const source = fs.readFileSync(filePath, 'utf8');
  const addedLines = getAddedLines(filePath, workspaceRoot);

  for (const pattern of DISALLOWED_PATTERNS) {
    for (const addedLine of addedLines) {
      const lineMatches = [...addedLine.text.matchAll(pattern.regex)];

      for (const match of lineMatches) {
        const location = getLineAndColumn(source, getAbsoluteIndex(source, addedLine.lineNumber, (match.index ?? 0) + 1));
        violations.push({
          filePath: path.relative(workspaceRoot, filePath),
          line: location.line,
          column: location.column,
          label: pattern.label,
          snippet: match[0],
        });
      }
    }
  }
}

if (violations.length === 0) {
  process.exit(0);
}

const details = violations
  .slice(0, 10)
  .map((violation) => `- ${violation.filePath}:${violation.line}:${violation.column} ${violation.label} -> ${violation.snippet}`)
  .join('\n');

process.stdout.write(JSON.stringify({
  stopReason: 'TypeScript review hook blocked disallowed any usage.',
  systemMessage: `Avoid introducing \`any\` in edited TypeScript files. Prefer precise types, \`unknown\`, or explicit narrowing.\n${details}`,
}));
process.exit(2);

function getLineAndColumn(source, index) {
  let line = 1;
  let column = 1;

  for (let currentIndex = 0; currentIndex < index; currentIndex += 1) {
    if (source[currentIndex] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { line, column };
}

function getAddedLines(filePath, workspaceRoot) {
  const relativePath = path.relative(workspaceRoot, filePath);
  const diffResult = spawnSync(
    'git',
    ['diff', '--no-ext-diff', '--unified=0', '--', relativePath],
    { cwd: workspaceRoot, encoding: 'utf8', stdio: 'pipe' },
  );

  if (diffResult.status !== 0) {
    return [];
  }

  const addedLines = [];
  let currentLineNumber = 0;

  for (const line of diffResult.stdout.split('\n')) {
    const hunkMatch = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunkMatch) {
      currentLineNumber = Number(hunkMatch[1]);
      continue;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }

    if (line.startsWith('+')) {
      addedLines.push({ lineNumber: currentLineNumber, text: line.slice(1) });
      currentLineNumber += 1;
      continue;
    }

    if (!line.startsWith('-')) {
      currentLineNumber += 1;
    }
  }

  return addedLines;
}

function getAbsoluteIndex(source, targetLineNumber, targetColumnNumber) {
  let lineNumber = 1;
  let columnNumber = 1;

  for (let index = 0; index < source.length; index += 1) {
    if (lineNumber === targetLineNumber && columnNumber === targetColumnNumber) {
      return index;
    }

    if (source[index] === '\n') {
      lineNumber += 1;
      columnNumber = 1;
    } else {
      columnNumber += 1;
    }
  }

  return source.length;
}