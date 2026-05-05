import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  getPrettierCandidateFiles,
  getWorkspaceRoot,
  isEditToolPayload,
  readHookInput,
} from './hook-utils.mjs';

const payload = await readHookInput();

if (!isEditToolPayload(payload)) {
  process.exit(0);
}

const workspaceRoot = getWorkspaceRoot();
const prettierBin = path.join(workspaceRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
const files = getPrettierCandidateFiles(payload);

if (files.length === 0) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [prettierBin, '--write', ...files], {
  cwd: workspaceRoot,
  encoding: 'utf8',
  stdio: 'pipe',
});

if (result.error || result.status !== 0) {
  process.stdout.write(JSON.stringify({
    systemMessage: `Prettier hook failed: ${(result.error?.message ?? result.stderr ?? 'unknown error').trim()}`,
  }));
  process.exit(0);
}