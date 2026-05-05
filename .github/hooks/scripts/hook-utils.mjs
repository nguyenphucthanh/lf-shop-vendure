import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EDIT_TOOL_MARKERS = [
  'apply_patch',
  'create_file',
  'edit_notebook_file',
  'mcp_pylance_mcp_s_pylanceInvokeRefactoring',
];

const PRETTIER_EXTENSIONS = new Set([
  '.css',
  '.cts',
  '.graphql',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mts',
  '.scss',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);

const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

export function getWorkspaceRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

export async function readHookInput() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export function getToolName(payload) {
  const directCandidates = [
    payload?.toolName,
    payload?.tool?.name,
    payload?.toolInvocation?.toolName,
    payload?.toolInvocation?.name,
    payload?.hookSpecificInput?.toolName,
    payload?.hookSpecificInput?.toolName,
    payload?.data?.toolName,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  let discovered = null;
  visit(payload, (key, value) => {
    if (discovered || typeof value !== 'string') {
      return;
    }

    if (key.toLowerCase().includes('tool') && EDIT_TOOL_MARKERS.some((marker) => value.includes(marker))) {
      discovered = value;
    }
  });

  return discovered;
}

export function isEditToolPayload(payload) {
  const toolName = getToolName(payload);

  return typeof toolName === 'string'
    && EDIT_TOOL_MARKERS.some((marker) => toolName.includes(marker));
}

export function collectEditedFiles(payload, { allowedExtensions } = {}) {
  const workspaceRoot = getWorkspaceRoot();
  const discovered = new Set();

  visit(payload, (_key, value) => {
    if (typeof value !== 'string') {
      return;
    }

    const filePath = normalizeFilePath(value, workspaceRoot);
    if (!filePath) {
      return;
    }

    if (allowedExtensions && !allowedExtensions.has(path.extname(filePath))) {
      return;
    }

    discovered.add(filePath);
  });

  return [...discovered];
}

export function getPrettierCandidateFiles(payload) {
  return collectEditedFiles(payload, { allowedExtensions: PRETTIER_EXTENSIONS });
}

export function getTypeScriptCandidateFiles(payload) {
  return collectEditedFiles(payload, { allowedExtensions: TYPESCRIPT_EXTENSIONS });
}

function normalizeFilePath(candidate, workspaceRoot) {
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.includes('\n')) {
    return null;
  }

  let resolvedPath = null;

  if (trimmed.startsWith('file://')) {
    try {
      resolvedPath = fileURLToPath(trimmed);
    } catch {
      return null;
    }
  } else if (path.isAbsolute(trimmed)) {
    resolvedPath = path.resolve(trimmed);
  } else if (looksLikePath(trimmed)) {
    resolvedPath = path.resolve(workspaceRoot, trimmed);
  }

  if (!resolvedPath) {
    return null;
  }

  if (!resolvedPath.startsWith(workspaceRoot + path.sep) && resolvedPath !== workspaceRoot) {
    return null;
  }

  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return null;
  }

  return resolvedPath;
}

function looksLikePath(value) {
  if (value.startsWith('.') || value.startsWith('/')) {
    return true;
  }

  return value.includes('/') && !value.includes(' ');
}

function visit(node, onValue, seen = new Set()) {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (seen.has(node)) {
    return;
  }

  seen.add(node);

  if (Array.isArray(node)) {
    for (const value of node) {
      onValue('', value);
      visit(value, onValue, seen);
    }
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    onValue(key, value);
    visit(value, onValue, seen);
  }
}