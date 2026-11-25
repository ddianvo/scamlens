import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { config } from 'dotenv';
if (!existsSync('.env')) {
  writeFileSync(
    '.env',
    readFileSync('.env.example', 'utf8').replace(
      'replace-with-a-random-secret-at-least-32-characters',
      randomBytes(48).toString('hex'),
    ),
  );
  console.log('Đã tạo .env cục bộ với JWT_SECRET ngẫu nhiên.');
}
config({ quiet: true });
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Chạy bằng npm run demo.');
const children = new Set();
let interrupted = false;
function shutdown() {
  interrupted = true;
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function launch(args, options = {}) {
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: 'inherit', ...options });
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}
async function command(args) {
  await new Promise((resolve, reject) => {
    const child = launch([npmCli, ...args]);
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 || interrupted
        ? resolve()
        : reject(new Error(`Lệnh npm ${args.join(' ')} không hoàn tất.`)),
    );
  });
}
try {
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL.');
  if (
    ['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL).hostname) &&
    new URL(process.env.DATABASE_URL).port === '55432'
  ) {
    console.log('Chuẩn bị PostgreSQL cục bộ…');
    await new Promise((resolve, reject) => {
      const db = launch(['scripts/local-db.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] });
      db.stdout.on('data', (chunk) => {
        process.stdout.write(chunk);
        if (chunk.toString().includes('PostgreSQL sẵn sàng')) resolve();
      });
      db.once('error', reject);
      db.once('exit', (code) => reject(new Error(`Database dừng trước khi sẵn sàng (${code}).`)));
    });
  }
  await command(['run', 'build']);
  await command(['run', 'migration:run']);
  await command(['run', 'seed']);
  console.log('\nScamLens: http://127.0.0.1:5173\n');
  await command(['run', 'dev']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const child of children) child.kill('SIGTERM');
}
