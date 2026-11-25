import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMessage, analyzeUrl, normalizeIdentifier, parseUrl, publicText } from './engine';
import { defaultRules } from '../database/seed';
import brands from './brands.json';
const rules = defaultRules.map((r) => ({ ...r, enabled: true }));
test('Tin bình thường không khớp quy tắc', () => {
  assert.equal(analyzeMessage('Chiều nay hẹn gặp bạn ở thư viện lúc ba giờ.', rules).score, 0);
});
test('Trọng số có thể giải thích và chỉ cộng một lần mỗi nhóm', () => {
  const r = analyzeMessage('Cung cấp OTP, OTP và chuyển tiền ngay lập tức.', rules);
  assert.equal(r.score, 80);
  assert.equal(r.findings.length, 3);
  assert.equal(
    r.score,
    r.findings.reduce((s, f) => s + f.weight, 0),
  );
  assert.ok(r.findings.every((f) => f.reason && f.action && f.ranges?.length));
});
test('Tổng điểm không vượt 100', () => {
  const r = analyzeMessage(
    'Ngân hàng thông báo: cung cấp OTP, chuyển tiền ngay lập tức để nhận lợi nhuận 30%.',
    rules,
  );
  assert.equal(r.score, 100);
  assert.equal(r.level, 'high');
});
test('Bỏ qua ngữ cảnh cảnh báo và phủ định', () => {
  for (const content of [
    'Không cung cấp OTP cho bất kỳ ai.',
    'Tuyệt đối không chia sẻ mật khẩu.',
    'Không chuyển tiền hoặc đóng phí nhận thưởng qua link lạ.',
    'Cảnh báo lừa đảo: không cung cấp OTP cho bất kỳ ai.',
  ])
    assert.equal(analyzeMessage(content, rules).score, 0, content);
});
test('Câu cảnh báo không che yêu cầu đáng ngờ trong mệnh đề khác', () => {
  assert.equal(
    analyzeMessage('Không cung cấp OTP cho người lạ. Nhưng gửi OTP cho tôi ngay lập tức.', rules)
      .score,
    50,
  );
});
test('Tô nổi chính xác văn bản Unicode, bao gồm chuỗi dấu tách rời', () => {
  for (const content of [
    'Hãy gửi mật khẩu ngay lập tức.',
    'Hãy gửi mật khẩu ngay lập tức.'.normalize('NFD'),
  ]) {
    const result = analyzeMessage(content, rules);
    const r = result.findings.find((f) => f.code === 'credentials')!.ranges![0];
    assert.equal(content.slice(r.start, r.end).normalize('NFC'), 'mật khẩu');
  }
});
test('Từ khóa không khớp một phần từ dài hơn', () => {
  assert.equal(analyzeMessage('otpabc không phải là từ khóa.', rules).score, 0);
});
test('URL không hợp lệ, protocol không hỗ trợ và mã hóa lỗi bị từ chối', () => {
  for (const url of [
    'hello',
    'javascript:alert(1)',
    'ftp://example.com',
    'https://exa mple.com',
    'https://bad..test',
    'https://example.com/%ZZ',
    'https://example.com/%E0%A4',
  ])
    assert.throws(() => analyzeUrl(url, []));
});
test('Phân tích IP, HTTPS, userinfo, tên miền thực tế và phụ', () => {
  const r = analyzeUrl('http://192.0.2.10/login', []);
  assert.equal(r.score, 50);
  assert.equal(r.https, false);
  const disguised = analyzeUrl('https://vietcombank.com.vn@phish.test/verify', [], brands);
  assert.equal(disguised.hostname, 'phish.test');
  assert.ok(disguised.findings.some((f) => f.code === 'userinfo'));
  const sub = analyzeUrl('https://bank.example.com', []);
  assert.equal(sub.domain, 'example.com');
  assert.equal(sub.subdomain, 'bank');
});
test('Đối chiếu thương hiệu, Unicode và danh sách quản trị', () => {
  assert.ok(
    analyzeUrl('https://vietc0mbank.test', [], brands).findings.some((f) =>
      f.code.startsWith('brand-'),
    ),
  );
  assert.ok(analyzeUrl('https://xn--pple-43d.test', []).findings.some((f) => f.code === 'unicode'));
  const r = analyzeUrl('https://sub.qua-tang.test', [
    { identifier: 'qua-tang.test', verdict: 'caution', note: 'Cảnh báo mô phỏng.', isDemo: true },
  ]);
  assert.equal(r.score, 50);
  assert.ok(r.verified?.isDemo);
});
test('Chuẩn hóa thông tin và che dữ liệu cá nhân', () => {
  assert.equal(normalizeIdentifier('phone', '+84 900 000 001'), '0900000001');
  assert.equal(normalizeIdentifier('bank', '0000 0012-3456'), '000000123456');
  assert.equal(normalizeIdentifier('domain', 'HTTPS://QUA-TANG.TEST/a'), 'qua-tang.test');
  const summary = publicText('Liên hệ 0900000001, STK 000000123456, a@example.com');
  assert.ok(!summary.includes('0900000001'));
  assert.ok(!summary.includes('000000123456'));
  assert.ok(!summary.includes('a@example.com'));
});
test('Quy tắc tắt không được áp dụng', () => {
  assert.equal(
    analyzeMessage(
      'Cung cấp OTP',
      rules.map((r) => ({ ...r, enabled: false })),
    ).score,
    0,
  );
});
