import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const candidatePaths = [
  path.join(rootDir, 'node_modules/tsx/node_modules/esbuild/bin/esbuild'),
  path.join(rootDir, 'node_modules/tsx/node_modules/@esbuild/darwin-arm64/bin/esbuild'),
  path.join(rootDir, 'node_modules/@esbuild/darwin-arm64/bin/esbuild'),
  path.join(rootDir, 'node_modules/.bin/esbuild'),
];

let esbuildBin = candidatePaths.find((p) => fs.existsSync(p));

if (!esbuildBin) {
  // Try finding any esbuild binary in node_modules
  try {
    const stdout = execFileSync('find', ['node_modules', '-name', 'esbuild', '-type', 'f', '-perm', '+111'], {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      esbuildBin = path.resolve(rootDir, lines[0]);
    }
  } catch (err) {
    console.warn('find failed:', err);
  }
}

if (!esbuildBin) {
  console.error('Could not locate an esbuild binary to bundle api/index.js');
  process.exit(1);
}

console.log(`Using esbuild binary at: ${esbuildBin}`);

fs.mkdirSync(path.join(rootDir, 'api'), { recursive: true });

const args = [
  'api-src/index.ts',
  '--bundle',
  '--platform=node',
  '--format=esm',
  '--target=node20',
  '--outfile=api/index.js',
  '--external:express',
  '--external:cookie-parser',
  '--external:@google/genai',
  '--external:@neondatabase/serverless',
  '--external:@tursodatabase/serverless',
  '--external:web-push',
];

execFileSync(esbuildBin, args, { cwd: rootDir, stdio: 'inherit' });
console.log('Successfully bundled api-src/index.ts -> api/index.js');
