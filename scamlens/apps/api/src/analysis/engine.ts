import { BadRequestException } from '@nestjs/common';
import { isIP } from 'node:net';
import { domainToUnicode } from 'node:url';
import { parse } from 'tldts';

export interface AnalysisRule {
  code: string;
  title: string;
  keywords: string[];
  weight: number;
  reason: string;
  action: string;
  enabled: boolean;
}
export interface Finding {
  code: string;
  title: string;
  weight: number;
  reason: string;
  action: string;
  ranges?: { start: number; end: number }[];
}
export const disclaimer =
  'Kết quả chỉ hỗ trợ đánh giá dấu hiệu, không khẳng định một nội dung hay đối tượng là an toàn hoặc lừa đảo.';
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export function summarize(findings: Finding[]) {
  const score = Math.min(
    100,
    findings.reduce((sum, f) => sum + f.weight, 0),
  );
  return {
    score,
    level: score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low',
    label: score >= 60 ? 'Nhiều dấu hiệu đáng ngờ' : score >= 25 ? 'Cần thận trọng' : 'Ít dấu hiệu',
    findings,
    disclaimer,
    method: 'weighted-rules-v1',
  };
}
function foldedMap(text: string) {
  let normalized = '';
  const starts: number[] = [];
  const ends: number[] = [];
  for (let i = 0; i < text.length;) {
    const char = String.fromCodePoint(text.codePointAt(i)!);
    const f = fold(char);
    for (const c of f) {
      normalized += c;
      starts.push(i);
      ends.push(i + char.length);
    }
    // Include decomposed accent marks in the preceding highlight.
    if (!f && ends.length) ends[ends.length - 1] = i + char.length;
    i += char.length;
  }
  return { normalized, starts, ends };
}
export function analyzeMessage(content: string, rules: AnalysisRule[]) {
  const { normalized, starts, ends } = foldedMap(content);
  const findings: Finding[] = [];
  for (const rule of rules.filter((r) => r.enabled)) {
    const ranges: { start: number; end: number }[] = [];
    for (const keyword of rule.keywords) {
      const word = fold(keyword).trim();
      if (!word) continue;
      let at = normalized.indexOf(word);
      while (at >= 0) {
        const end = at + word.length;
        const bounded =
          !/[a-z0-9]/.test(normalized[at - 1] || '') && !/[a-z0-9]/.test(normalized[end] || '');
        const prefix =
          normalized
            .slice(Math.max(0, at - 100), at)
            .split(/[.!?;\n]|\bnhung\b|\btuy nhien\b/)
            .pop() || '';
        const local = (prefix + word).slice(-100);
        const preventive =
          /(?:khong|dung|cho|tranh)(?:\s+(?:bao gio|nen|duoc|tuyet doi))?\s+(?:cung cap|chia se|gui|tiet lo|chuyen tien|chuyen khoan|dong phi|nhap|dat coc)[^.!?;\n]{0,60}$/.test(
            local,
          ) ||
          /(?:canh bao|canh giac|de phong|dau hieu lua dao|khong yeu cau)[^.!?;\n]{0,70}$/.test(
            local,
          );
        if (bounded && !preventive) ranges.push({ start: starts[at], end: ends[end - 1] });
        at = normalized.indexOf(word, at + Math.max(word.length, 1));
      }
    }
    if (ranges.length)
      findings.push({
        code: rule.code,
        title: rule.title,
        weight: rule.weight,
        reason: rule.reason,
        action: rule.action,
        ranges,
      });
  }
  return { ...summarize(findings), type: 'message' as const, content };
}
export function parseUrl(input: string) {
  const raw = input.trim();
  if (!raw || raw.length > 2048 || /[\s\u0000-\u001f\\]/.test(raw) || /%(?![0-9a-f]{2})/i.test(raw))
    throw new BadRequestException(
      'URL không hợp lệ. Nhập tên miền hoặc URL đầy đủ, không có khoảng trắng.',
    );
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new BadRequestException('Không thể đọc URL. Ví dụ: https://example.com');
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    (!host.includes('.') && !isIP(host.replace(/[\[\]]/g, ''))) ||
    host.length > 253 ||
    host.includes('..') ||
    (!isIP(host.replace(/[\[\]]/g, '')) &&
      !host.split('.').every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(l)))
  )
    throw new BadRequestException('Chỉ hỗ trợ URL HTTP/HTTPS có tên miền hợp lệ hoặc địa chỉ IP.');
  url.hostname = host;
  return url;
}
export function normalizeIdentifier(type: string, value: string) {
  if (type === 'domain') return parseUrl(value).hostname.toLowerCase();
  if (type === 'phone') {
    let phone = value.replace(/[\s().-]/g, '');
    if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
    else if (/^84\d{9}$/.test(phone)) phone = `0${phone.slice(2)}`;
    if (!/^0\d{9,10}$/.test(phone))
      throw new BadRequestException('Số điện thoại cần có 10–11 chữ số, bắt đầu bằng 0 hoặc +84.');
    return phone;
  }
  const account = value.replace(/[\s-]/g, '');
  if (!/^\d{6,30}$/.test(account))
    throw new BadRequestException('Số tài khoản cần có 6–30 chữ số.');
  return account;
}
export const normalizeBank = (value = '') => fold(value.trim()).replace(/\s+/g, ' ');
export function maskIdentifier(type: string, value: string) {
  return type === 'domain'
    ? value
    : `${value.slice(0, 3)}${'•'.repeat(Math.min(6, value.length - 5))}${value.slice(-2)}`;
}
export function publicText(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email đã ẩn]')
    .replace(/(?:\+?\d[\s().-]*){6,}/g, '[số đã ẩn]');
}
export interface BrandConfig {
  name: string;
  domains: string[];
  aliases: string[];
}
export function analyzeUrl(
  input: string,
  verified: { identifier: string; verdict: string; note: string; isDemo: boolean }[],
  brands: BrandConfig[] = [],
) {
  const url = parseUrl(input);
  const host = url.hostname;
  const parsed = parse(host, { allowPrivateDomains: true });
  const findings: Finding[] = [];
  const add = (code: string, title: string, weight: number, reason: string, action: string) =>
    findings.push({ code, title, weight, reason, action });
  if (url.protocol !== 'https:')
    add(
      'no-https',
      'Kết nối không sử dụng HTTPS',
      10,
      'HTTP không mã hóa kết nối. HTTPS có mã hóa nhưng không chứng minh trang đáng tin.',
      'Không nhập thông tin bảo mật trên kết nối HTTP.',
    );
  if (isIP(host.replace(/[\[\]]/g, '')))
    add(
      'ip',
      'Dùng địa chỉ IP thay cho tên miền',
      25,
      `Máy chủ được ghi bằng địa chỉ IP ${host}; khó nhận diện tổ chức sở hữu từ chuỗi này.`,
      'Xác minh địa chỉ chính thức của đơn vị.',
    );
  if (url.username || url.password)
    add(
      'userinfo',
      'URL có thông tin trước ký tự @',
      30,
      `Phần trước @ không phải tên miền. Tên máy chủ thực tế là ${host}.`,
      'Chỉ đối chiếu phần tên máy chủ thực tế.',
    );
  if (host.includes('xn--') || /[^\x00-\x7f]/.test(domainToUnicode(host)))
    add(
      'unicode',
      'Tên miền có ký tự quốc tế',
      20,
      `Tên miền hiển thị: ${domainToUnicode(host)}. Một số ký tự có thể trông giống chữ cái khác.`,
      'So sánh từng ký tự với tên miền chính thức.',
    );
  if (host.split('.').length > 4 || (host.match(/-/g) || []).length > 3)
    add(
      'complex',
      'Tên miền có cấu trúc phức tạp',
      10,
      'Nhiều tầng tên miền phụ hoặc dấu gạch nối có thể gây nhầm lẫn khi đọc.',
      'Đọc tên miền đăng ký từ phải sang trái.',
    );
  const domain = parsed.domain || host;
  for (const brand of brands) {
    const official = brand.domains.some((d) => host === d || host.endsWith(`.${d}`));
    const compact = host
      .replace(/[-.]/g, '')
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e');
    if (
      !official &&
      brand.aliases.some((alias) => compact.includes(fold(alias).replace(/\W/g, '')))
    )
      add(
        `brand-${brand.name}`,
        `Tên miền gần giống ${brand.name}`,
        30,
        `Tên chứa dấu hiệu thương hiệu nhưng ${domain} không thuộc danh sách tên miền chính thức đã cấu hình. Đây chỉ là đối chiếu chuỗi.`,
        'Tự mở ứng dụng hoặc nhập địa chỉ chính thức thay vì bấm link.',
      );
  }
  let path = url.pathname + url.search;
  try {
    path = decodeURIComponent(path);
  } catch {
    throw new BadRequestException('URL chứa mã hóa ký tự không hợp lệ.');
  }
  if (/login|signin|verify|xac[-_]?minh|dang[-_]?nhap|nhan[-_]?thuong|reward|otp/i.test(fold(path)))
    add(
      'sensitive-path',
      'Đường dẫn liên quan đến đăng nhập hoặc nhận thưởng',
      15,
      'Từ khóa nhạy cảm trong đường dẫn có thể xuất hiện ở cả trang hợp lệ và trang giả mạo.',
      'Kiểm tra tên miền trước khi đăng nhập, xác minh hoặc nhận quà.',
    );
  const matches = verified.filter(
    (v) => v.identifier === host || host.endsWith(`.${v.identifier}`),
  );
  // More-specific verified domain overrides an inherited parent-domain entry.
  const match = matches.sort((a, b) => b.identifier.length - a.identifier.length)[0];
  if (match?.verdict === 'caution')
    add(
      'verified-caution',
      'Có bản ghi cảnh báo do quản trị viên xác minh',
      50,
      match.note,
      'Xem báo cáo đã duyệt và kiểm tra độc lập trước khi tương tác.',
    );
  return {
    ...summarize(findings),
    type: 'url' as const,
    content: input,
    url: url.href,
    hostname: host,
    domain,
    subdomain: parsed.subdomain || '',
    https: url.protocol === 'https:',
    verified: match || null,
    technicalNote:
      'HTTPS mã hóa kết nối; không bảo chứng danh tính hay nội dung website. Không có yêu cầu mạng nào được gửi tới URL này.',
  };
}
