import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const base = process.env.TEST_API_URL || 'http://127.0.0.1:3001/api';
async function request(path, { body, cookie, method = body ? 'POST' : 'GET', headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: res.status,
    body: await res.json(),
    cookie: res.headers.get('set-cookie')?.split(';')[0],
    cookieHeader: res.headers.get('set-cookie'),
  };
}
test('API + PostgreSQL: xác thực, phân tích, kiểm duyệt, riêng tư và phân quyền', async (t) => {
  const suffix = randomUUID().slice(0, 8);
  const emails = [`a-${suffix}@example.test`, `b-${suffix}@example.test`];
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const domain = `integration-${suffix}.test`;
  const code = `integration-${suffix}`;
  let userA, userB, admin, reportId, historyId;
  try {
    await t.test('Đăng ký, cookie HttpOnly và không tự lưu phân tích khách', async () => {
      const before = await client.query('SELECT count(*)::int n FROM histories');
      const result = await request('/analysis/message', {
        body: { content: 'Cung cấp OTP, chuyển tiền ngay lập tức.' },
      });
      assert.equal(result.status, 201);
      assert.equal(result.body.score, 80);
      assert.equal(
        (await client.query('SELECT count(*)::int n FROM histories')).rows[0].n,
        before.rows[0].n,
      );
      userA = await request('/auth/register', {
        body: { name: 'Kiểm thử A', email: emails[0], password: 'TestPassword!2026' },
      });
      assert.equal(userA.status, 201);
      assert.ok(userA.cookieHeader.includes('HttpOnly'));
      assert.ok(userA.cookieHeader.includes('SameSite=Strict'));
      assert.equal(userA.body.passwordHash, undefined);
      userB = await request('/auth/register', {
        body: { name: 'Kiểm thử B', email: emails[1], password: 'TestPassword!2026' },
      });
      assert.equal(userB.status, 201);
      const stored = await client.query('SELECT "passwordHash" FROM users WHERE email=$1', [
        emails[0],
      ]);
      assert.ok(stored.rows[0].passwordHash.startsWith('$2'));
      assert.notEqual(stored.rows[0].passwordHash, 'TestPassword!2026');
      assert.equal(
        (
          await request('/auth/register', {
            body: { name: 'Kiểm thử', email: emails[0], password: 'TestPassword!2026' },
          })
        ).status,
        409,
      );
      assert.equal(
        (await request('/auth/login', { body: { email: emails[0], password: 'InvalidPassword' } }))
          .status,
        401,
      );
      assert.equal(
        (
          await request('/auth/register', {
            body: {
              name: 'Giả quyền',
              email: `x-${suffix}@example.test`,
              password: 'TestPassword!2026',
              role: 'admin',
            },
          })
        ).status,
        400,
      );
    });
    await t.test('Validation, URL lỗi, ngữ cảnh và tìm kiếm trống', async () => {
      assert.equal(
        (await request('/analysis/message', { body: { content: 'x'.repeat(10001) } })).status,
        400,
      );
      assert.equal((await request('/analysis/message', { body: { content: '   ' } })).status, 400);
      assert.equal(
        (await request('/analysis/url', { body: { url: 'javascript:alert(1)' } })).status,
        400,
      );
      assert.equal(
        (
          await request('/analysis/message', {
            body: { content: 'Không cung cấp OTP cho bất kỳ ai.' },
          })
        ).body.score,
        0,
      );
      const empty = await request(`/reports/lookup?type=domain&query=${domain}`);
      assert.equal(empty.body.reports.length, 0);
      assert.equal(empty.body.message, 'Chưa tìm thấy báo cáo trong hệ thống');
      assert.equal((await request('/reports/lookup?type=bank&query=000000123456')).status, 400);
      const phone = await request('/reports/lookup?type=phone&query=%2B84%20900%20000%20001');
      assert.ok(
        phone.body.reports.every((r) => !r.identifier.includes('0900000001') && !r.evidence),
      );
    });
    await t.test('Lưu chủ động và quyền truy cập dữ liệu riêng', async () => {
      const saved = await request('/history', {
        cookie: userA.cookie,
        body: { type: 'message', content: 'Cung cấp OTP ngay lập tức.' },
      });
      assert.equal(saved.status, 201);
      historyId = saved.body.id;
      assert.equal((await request('/history', { cookie: userA.cookie })).body.length, 1);
      assert.equal(
        (await request(`/history?userId=${userA.body.id}`, { cookie: userB.cookie })).body.length,
        0,
      );
      assert.equal(
        (await request(`/history/${historyId}`, { cookie: userB.cookie, method: 'DELETE' })).status,
        404,
      );
      assert.equal((await request('/history')).status, 401);
      assert.equal((await request('/admin/stats', { cookie: userA.cookie })).status, 403);
      assert.equal(
        (await request('/admin/stats', { cookie: 'scamlens_session=forged-token' })).status,
        401,
      );
    });
    await t.test('Gửi báo cáo → chờ duyệt → Admin duyệt → tra cứu công khai', async () => {
      const body = {
        type: 'domain',
        identifier: `https://${domain}/login`,
        description: 'Báo cáo mô phỏng dùng để kiểm tra luồng duyệt.',
        evidence: 'Nội dung bằng chứng nội bộ phải được giữ riêng tư.',
      };
      assert.equal((await request('/reports', { body })).status, 401);
      const sent = await request('/reports', { cookie: userA.cookie, body });
      assert.equal(sent.status, 201);
      assert.equal(sent.body.status, 'pending');
      reportId = sent.body.id;
      assert.equal(
        (await request(`/reports/lookup?type=domain&query=${domain}`)).body.reports.length,
        0,
      );
      assert.equal((await request('/reports/mine', { cookie: userB.cookie })).body.length, 0);
      admin = await request('/auth/login', {
        body: { email: 'admin@scamlens.test', password: process.env.DEMO_ADMIN_PASSWORD },
      });
      assert.equal(admin.status, 201);
      const review = {
        status: 'approved',
        reason: 'Đã kiểm tra bằng chứng mô phỏng trong kiểm thử.',
        publicSummary:
          'Mô phỏng yêu cầu cung cấp OTP. Thông tin liên hệ 0900000001 và email x@example.com.',
      };
      assert.equal(
        (
          await request(`/admin/reports/${reportId}`, {
            cookie: userA.cookie,
            method: 'PATCH',
            body: review,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await request(`/admin/reports/${reportId}`, {
            cookie: admin.cookie,
            method: 'PATCH',
            body: review,
          })
        ).status,
        200,
      );
      const lookup = (await request(`/reports/lookup?type=domain&query=${domain}`)).body.reports;
      assert.equal(lookup.length, 1);
      assert.equal(lookup[0].evidence, undefined);
      assert.equal(lookup[0].userId, undefined);
      assert.ok(!lookup[0].description.includes('0900000001'));
      assert.ok(!lookup[0].description.includes('x@example.com'));
      const rejected = await request(`/admin/reports/${reportId}`, {
        cookie: admin.cookie,
        method: 'PATCH',
        body: { status: 'rejected', reason: 'Rút lại bản mô phỏng sau khi kiểm thử hoàn tất.' },
      });
      assert.equal(rejected.status, 200);
      assert.equal(
        (await request(`/reports/lookup?type=domain&query=${domain}`)).body.reports.length,
        0,
      );
      const bankReport = await request('/reports', {
        cookie: userB.cookie,
        body: {
          type: 'bank',
          identifier: '0000 0012-3456',
          bank: 'Ngân hàng Mô phỏng',
          description: 'Mô phỏng yêu cầu đặt cọc trước khi nhận công việc.',
          evidence: 'Bằng chứng dạng văn bản giả lập dùng cho kiểm thử tài khoản.',
        },
      });
      assert.equal(bankReport.status, 201);
      assert.equal(
        (
          await request(`/admin/reports/${bankReport.body.id}`, {
            cookie: admin.cookie,
            method: 'PATCH',
            body: {
              status: 'approved',
              reason: 'Kiểm duyệt tình huống mô phỏng trong kiểm thử.',
              publicSummary: 'Mô phỏng một yêu cầu đóng tiền đặt cọc trước khi nhận việc.',
            },
          })
        ).status,
        200,
      );
      const bankQuery = new URLSearchParams({
        type: 'bank',
        query: '000000123456',
        bank: 'NGAN HANG MO PHONG',
      });
      const bankResults = (await request(`/reports/lookup?${bankQuery}`)).body.reports;
      assert.ok(bankResults.some((r) => r.id === bankReport.body.id));
      assert.ok(bankResults.every((r) => !r.identifier.includes('000000123456')));
    });
    await t.test('Admin chỉnh quy tắc và danh sách xác minh tác động dữ liệu thật', async () => {
      const rule = {
        code,
        title: 'Quy tắc thử nghiệm',
        keywords: [`marker${suffix}`],
        weight: 42,
        reason: 'Dấu hiệu mô phỏng chỉ dành cho kiểm thử.',
        action: 'Dừng lại và xác minh thông tin qua kênh độc lập.',
        enabled: true,
      };
      const created = await request('/admin/rules', { cookie: admin.cookie, body: rule });
      assert.equal(created.status, 201);
      assert.equal(
        (await request('/analysis/message', { body: { content: `marker${suffix}` } })).body.score,
        42,
      );
      const { code: _code, ...update } = rule;
      assert.equal(
        (
          await request(`/admin/rules/${created.body.id}`, {
            cookie: admin.cookie,
            method: 'PATCH',
            body: { ...update, enabled: false },
          })
        ).status,
        200,
      );
      assert.equal(
        (await request('/analysis/message', { body: { content: `marker${suffix}` } })).body.score,
        0,
      );
      const subject = {
        type: 'domain',
        identifier: domain,
        verdict: 'caution',
        note: 'Dữ liệu mô phỏng kiểm thử cảnh báo tên miền.',
        isDemo: true,
      };
      await request('/admin/subjects', { cookie: admin.cookie, body: subject });
      await request('/admin/subjects', { cookie: admin.cookie, body: subject });
      assert.equal(
        (
          await client.query('SELECT count(*)::int n FROM verified_subjects WHERE identifier=$1', [
            domain,
          ])
        ).rows[0].n,
        1,
      );
      assert.equal(
        (await request('/analysis/url', { body: { url: `https://${domain}` } })).body.score,
        50,
      );
      const stats = await request('/admin/stats', { cookie: admin.cookie });
      assert.equal(stats.status, 200);
      assert.equal(
        stats.body.users,
        (await client.query('SELECT count(*)::int n FROM users')).rows[0].n,
      );
    });
    await t.test('Chặn cross-origin, logout vô hiệu JWT và xóa lịch sử', async () => {
      assert.equal(
        (
          await request('/analysis/message', {
            headers: { Origin: 'https://untrusted.test' },
            body: { content: 'Xin chào bạn.' },
          })
        ).status,
        403,
      );
      assert.equal(
        (await request(`/history/${historyId}`, { cookie: userA.cookie, method: 'DELETE' })).status,
        200,
      );
      assert.equal((await request('/auth/logout', { cookie: userA.cookie, body: {} })).status, 201);
      assert.equal((await request('/auth/me', { cookie: userA.cookie })).status, 401);
    });
    await t.test('Giới hạn tần suất thực sự chặn yêu cầu', async () => {
      let limited = false;
      for (let i = 0; i < 62; i++) {
        if ((await request('/health')).status === 429) {
          limited = true;
          break;
        }
      }
      assert.ok(limited);
    });
  } finally {
    await client.query(
      'DELETE FROM reports WHERE "userId" IN (SELECT id FROM users WHERE email = ANY($1))',
      [emails],
    );
    await client.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
    await client.query('DELETE FROM rules WHERE code=$1', [code]);
    await client.query('DELETE FROM verified_subjects WHERE identifier=$1', [domain]);
    await client.end();
  }
});
