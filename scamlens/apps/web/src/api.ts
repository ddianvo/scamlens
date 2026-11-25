export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Không kết nối được máy chủ. Nội dung bạn nhập vẫn được giữ lại; hãy thử lại sau.',
      0,
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status === 429
        ? 'Bạn thao tác hơi nhanh. Vui lòng đợi một phút rồi thử lại.'
        : Array.isArray(body.message)
          ? body.message.join(' ')
          : body.message || 'Có lỗi xảy ra. Vui lòng thử lại.',
      response.status,
    );
  return body as T;
}
export const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
export const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
export type User = { id: string; name: string; email: string; role: 'user' | 'admin' };
export type Finding = {
  code: string;
  title: string;
  weight: number;
  reason: string;
  action: string;
  ranges?: { start: number; end: number }[];
};
export type Analysis = {
  type: 'message' | 'url';
  content: string;
  score: number;
  level: 'low' | 'medium' | 'high';
  label: string;
  findings: Finding[];
  disclaimer: string;
  hostname?: string;
  domain?: string;
  subdomain?: string;
  https?: boolean;
  verified?: { verdict: string; note: string; isDemo: boolean } | null;
  technicalNote?: string;
};
export type Report = {
  id: string;
  type: string;
  identifier: string;
  bank: string;
  description: string;
  status: string;
  updatedAt: string;
  createdAt?: string;
  isDemo: boolean;
  evidence?: string;
  reviewReason?: string;
  publicSummary?: string;
};
