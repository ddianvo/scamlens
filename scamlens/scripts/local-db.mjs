import 'dotenv/config';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import pgDriver from 'pg';
const run = promisify(execFile);
function runControl(file, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { ...options, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `PostgreSQL control failed (${code}). Kiểm tra postgres.log trong thư mục runtime.`,
            ),
          ),
    );
  });
}
function copyDirectory(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name),
      to = join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else copyFileSync(from, to);
  }
}
const url = new URL(
  process.env.DATABASE_URL || 'postgresql://scamlens:scamlens_local_demo@127.0.0.1:55432/scamlens',
);
if (!['127.0.0.1', 'localhost'].includes(url.hostname))
  throw new Error('db:local chỉ dành cho database trên máy này.');
let stop;
if (process.platform === 'win32') {
  // PostgreSQL Windows initdb cannot re-execute itself from some Unicode paths.
  // Only the runtime is copied; application source stays in the workspace.
  const root =
    process.env.LOCAL_DB_RUNTIME || join(process.env.LOCALAPPDATA || tmpdir(), 'ScamLensRuntime');
  if (/[^\x00-\x7f]/.test(root))
    throw new Error('Đặt LOCAL_DB_RUNTIME vào một đường dẫn không dấu để chạy PostgreSQL Windows.');
  const native = join(root, 'postgres-18.6');
  const dir = join(root, `data-${url.port || '55432'}`);
  mkdirSync(root, { recursive: true });
  if (!existsSync(join(native, 'bin', 'initdb.exe'))) {
    const modulePath = fileURLToPath(import.meta.resolve('@embedded-postgres/windows-x64'));
    copyDirectory(resolve(dirname(modulePath), '../native'), native);
  }
  const options = { windowsHide: true, cwd: root };
  if (!existsSync(join(dir, 'PG_VERSION'))) {
    const passwordFile = join(root, `password-${randomUUID()}.tmp`);
    writeFileSync(passwordFile, decodeURIComponent(url.password) + '\n', { mode: 0o600 });
    try {
      await run(
        join(native, 'bin', 'initdb.exe'),
        [
          '-D',
          dir,
          '-U',
          decodeURIComponent(url.username),
          `--pwfile=${passwordFile}`,
          '--auth=scram-sha-256',
          '--encoding=UTF8',
          '--locale=C',
        ],
        options,
      );
    } finally {
      unlinkSync(passwordFile);
    }
  }
  const ctl = join(native, 'bin', 'pg_ctl.exe');
  let running = false;
  try {
    await run(ctl, ['status', '-D', dir], options);
    running = true;
  } catch {}
  if (!running)
    await runControl(
      ctl,
      [
        'start',
        '-D',
        dir,
        '-l',
        join(root, 'postgres.log'),
        '-o',
        `-h 127.0.0.1 -p ${Number(url.port || 55432)}`,
        '-w',
      ],
      options,
    );
  stop = async () => {
    if (!running) await runControl(ctl, ['stop', '-D', dir, '-m', 'fast', '-w'], options);
  };
  console.log(`Dữ liệu PostgreSQL cục bộ: ${dir}`);
} else {
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = resolve('.local/postgres');
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    port: Number(url.port || 55432),
    persistent: true,
    authMethod: 'scram-sha-256',
    postgresFlags: ['-h', '127.0.0.1'],
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(join(dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  stop = () => pg.stop();
}
const client = new pgDriver.Client({ connectionString: new URL('/postgres', url).href });
await client.connect();
const db = url.pathname.slice(1);
if (!/^[a-z][a-z0-9_]*$/.test(db)) throw new Error('Tên database không hợp lệ.');
if (!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [db])).rowCount)
  await client.query(`CREATE DATABASE "${db}"`);
await client.end();
console.log(`PostgreSQL sẵn sàng tại 127.0.0.1:${url.port}. Giữ tiến trình này khi chạy demo.`);
let stopping = false;
const timer = setInterval(() => {}, 60_000);
async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await stop();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
