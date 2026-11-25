import ds from './data-source';
import { seed } from './seed';
async function main() {
  await ds.initialize();
  try {
    switch (process.argv[2]) {
      case 'migrate':
        await ds.runMigrations();
        console.log('Migration hoàn tất.');
        break;
      case 'revert':
        await ds.undoLastMigration();
        console.log('Đã hoàn tác migration gần nhất.');
        break;
      case 'seed':
        await seed(ds);
        console.log('Seed hoàn tất, giữ nguyên các bản ghi đã tồn tại.');
        break;
      default:
        throw new Error('Lệnh không hợp lệ.');
    }
  } finally {
    await ds.destroy();
  }
}
main().catch(() => {
  console.error('Database chưa sẵn sàng hoặc cấu hình không hợp lệ. Kiểm tra .env và PostgreSQL.');
  process.exit(1);
});
