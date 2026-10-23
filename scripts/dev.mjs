import { spawn } from 'node:child_process';

const children = ['client', 'server'].map((workspace) =>
  spawn('npm', ['run', 'dev', '--workspace', workspace], { stdio: 'inherit' }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach((child) => {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
