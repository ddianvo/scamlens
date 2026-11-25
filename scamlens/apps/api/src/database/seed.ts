import { DataSource } from 'typeorm';
import { hash } from 'bcryptjs';
import { User, Rule, Report, VerifiedSubject } from './entities';
import { normalizeBank } from '../analysis/engine';
export const defaultRules = [
  {
    code: 'credentials',
    title: 'Yêu cầu thông tin bảo mật',
    keywords: ['otp', 'mật khẩu', 'mã xác thực', 'thông tin ngân hàng'],
    weight: 35,
    reason: 'Nội dung đề cập đến thông tin bảo mật có thể bị lợi dụng để chiếm quyền tài khoản.',
    action: 'Không gửi mật khẩu, OTP hoặc thông tin ngân hàng. Liên hệ đơn vị qua kênh chính thức.',
  },
  {
    code: 'advance',
    title: 'Yêu cầu thanh toán trước',
    keywords: ['chuyển tiền', 'đóng phí', 'phí nhận thưởng', 'đặt cọc', 'chuyển khoản'],
    weight: 30,
    reason:
      'Yêu cầu nộp tiền trước cần được kiểm tra độc lập, đặc biệt khi gắn với việc nhận quà hoặc công việc.',
    action: 'Tạm dừng chuyển tiền. Xác minh người nhận và mục đích thanh toán qua kênh độc lập.',
  },
  {
    code: 'profit',
    title: 'Hứa hẹn lợi nhuận bất thường',
    keywords: [
      'lợi nhuận 30%',
      'lãi 30%',
      'lãi 50%',
      'lợi nhuận cao',
      'việc nhẹ lương cao',
      'cam kết sinh lời',
      'lợi nhuận 50%',
    ],
    weight: 25,
    reason: 'Cam kết thu nhập hoặc lợi nhuận cao có thể che giấu rủi ro tài chính.',
    action: 'Kiểm tra thông tin đơn vị và cơ sở của cam kết. Không nạp tiền để mở khóa thu nhập.',
  },
  {
    code: 'impersonation',
    title: 'Có dấu hiệu mạo danh',
    keywords: [
      'ngân hàng thông báo',
      'bộ công an',
      'cơ quan thuế',
      'tòa án',
      'nhân viên ngân hàng',
    ],
    weight: 20,
    reason: 'Việc tự xưng là cơ quan hoặc tổ chức không chứng minh danh tính người gửi.',
    action:
      'Tự tìm số liên hệ chính thức; không dùng số hoặc đường link trong tin nhắn để xác minh.',
  },
  {
    code: 'urgency',
    title: 'Tạo áp lực hành động gấp',
    keywords: [
      'ngay lập tức',
      'trong 5 phút',
      'khóa tài khoản',
      'khẩn cấp',
      'cơ hội cuối',
      'trong 24 giờ',
    ],
    weight: 15,
    reason: 'Giới hạn thời gian hoặc đe dọa có thể khiến bạn bỏ qua bước kiểm tra.',
    action: 'Dừng lại, giữ bình tĩnh và xác minh trước khi làm theo yêu cầu.',
  },
];
export async function seed(ds: DataSource) {
  await ds.transaction(async (manager) => {
    for (const r of defaultRules)
      if (!(await manager.findOneBy(Rule, { code: r.code })))
        await manager.save(Rule, manager.create(Rule, r));
    if (process.env.DEMO_SEED !== 'true') return;
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
    const userPassword = process.env.DEMO_USER_PASSWORD;
    if (!adminPassword || !userPassword) throw new Error('Cần cấu hình mật khẩu seed trong .env.');
    for (const item of [
      {
        email: 'admin@scamlens.test',
        name: 'Quản trị viên demo',
        role: 'admin',
        password: adminPassword,
      },
      { email: 'user@scamlens.test', name: 'Minh Anh', role: 'user', password: userPassword },
    ]) {
      if (!(await manager.findOneBy(User, { email: item.email })))
        await manager.save(
          User,
          manager.create(User, {
            email: item.email,
            name: item.name,
            role: item.role as 'user' | 'admin',
            passwordHash: await hash(item.password, 12),
          }),
        );
    }
    const owner = await manager.findOneByOrFail(User, { email: 'user@scamlens.test' });
    const reports = [
      {
        type: 'domain',
        identifier: 'qua-tang.test',
        bank: '',
        description: 'Mô phỏng: Trang thông báo nhận quà và yêu cầu đóng phí vận chuyển trước.',
        evidence: 'Mô phỏng: Chuyển tiền để nhận quà trong 5 phút.',
        status: 'approved',
        publicSummary:
          'Mô phỏng tình huống nhận quà yêu cầu thanh toán trước. Không phải sự việc thực tế.',
      },
      {
        type: 'phone',
        identifier: '0900000001',
        bank: '',
        description: 'Mô phỏng: Cuộc gọi tự xưng nhân viên ngân hàng yêu cầu OTP.',
        evidence: 'Mô phỏng: Xin mã OTP để cập nhật tài khoản.',
        status: 'approved',
        publicSummary:
          'Mô phỏng cuộc gọi mạo danh và yêu cầu cung cấp mã OTP. Số điện thoại giả lập.',
      },
      {
        type: 'bank',
        identifier: '000000123456',
        bank: 'ngân hàng mô phỏng',
        description: 'Mô phỏng: Tài khoản nhận đặt cọc công việc trực tuyến.',
        evidence: 'Mô phỏng: Đặt cọc để nhận nhiệm vụ.',
        status: 'pending',
        publicSummary: '',
      },
      {
        type: 'domain',
        identifier: 'example.com',
        bank: '',
        description: 'Mô phỏng: Báo cáo không có bằng chứng cụ thể.',
        evidence: 'Chỉ có tên miền mẫu.',
        status: 'rejected',
        publicSummary: '',
      },
    ];
    for (const item of reports) {
      const existing = await manager.findOneBy(Report, {
        identifier: item.identifier,
        isDemo: true,
      });
      if (existing && existing.bank !== normalizeBank(existing.bank)) {
        await manager.update(Report, existing.id, { bank: normalizeBank(existing.bank) });
      }
      if (!existing)
        await manager.save(
          Report,
          manager.create(Report, {
            ...item,
            bank: normalizeBank(item.bank),
            type: item.type as Report['type'],
            status: item.status as Report['status'],
            userId: owner.id,
            isDemo: true,
            reviewReason:
              item.status === 'pending'
                ? ''
                : item.status === 'rejected'
                  ? 'Dữ liệu mô phỏng chưa đủ bằng chứng để công bố.'
                  : 'Đã kiểm duyệt dữ liệu mô phỏng phục vụ đồ án.',
          }),
        );
    }
    for (const item of [
      {
        identifier: 'qua-tang.test',
        verdict: 'caution',
        note: 'Dữ liệu mô phỏng: tên miền minh họa tình huống nhận thưởng có thu phí.',
      },
      {
        identifier: 'example.com',
        verdict: 'official',
        note: 'Tên miền mẫu dành cho tài liệu; bản ghi minh họa thao tác quản trị, không bảo chứng nội dung mọi trang.',
      },
    ]) {
      if (
        !(await manager.findOneBy(VerifiedSubject, { identifier: item.identifier, type: 'domain' }))
      )
        await manager.save(
          VerifiedSubject,
          manager.create(VerifiedSubject, {
            ...item,
            type: 'domain',
            verdict: item.verdict as 'caution' | 'official',
            isDemo: true,
          }),
        );
    }
  });
}
