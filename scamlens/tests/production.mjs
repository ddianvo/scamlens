import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('Production serves React, SPA routes and API with secure cookies and origin checks', async () => {
  const port = 3187;
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(port),
      COOKIE_SECURE: 'true',
      SERVE_WEB: 'true',
      FRONTEND_ORIGIN: origin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Production server startup timed out.')),
        30_000,
      );
      child.once('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Production server stopped before readiness.'));
      });
      child.stdout.on('data', (b) => {
        if (b.toString().includes('ScamLens server listening')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    for (const route of ['/', '/dang-nhap', '/tai-khoan', '/quan-tri']) {
      const res = await fetch(origin + route);
      assert.equal(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/html'));
      const html = await res.text();
      assert.ok(html.includes('<div id="root">'));
      const asset = html.match(/src="(\/assets\/[^\"]+\.js)"/);
      assert.ok(asset);
      assert.equal((await fetch(origin + asset[1])).status, 200);
    }
    assert.equal((await fetch(origin + '/api/health')).status, 200);
    const missing = await fetch(origin + '/api/does-not-exist');
    assert.equal(missing.status, 404);
    assert.ok(missing.headers.get('content-type').includes('application/json'));
    const blocked = await fetch(origin + '/api/analysis/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.test' },
      body: JSON.stringify({ content: 'Xin chào bạn.' }),
    });
    assert.equal(blocked.status, 403);
    const login = await fetch(origin + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email: 'user@scamlens.test',
        password: process.env.DEMO_USER_PASSWORD,
      }),
    });
    assert.equal(login.status, 201);
    assert.ok(login.headers.get('set-cookie').includes('Secure'));
    assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
  } finally {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill('SIGTERM');
    await exited;
  }
});
