// Công cụ tạo mã băm (hash) cho mật khẩu mới.
// Cách dùng: node scripts/hash-password.js "mật khẩu của bạn"
const bcrypt = require('bcryptjs');

const plain = process.argv[2];

if (!plain) {
  console.log('Cách dùng: node scripts/hash-password.js "mật khẩu của bạn"');
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 12);
console.log('\nMật khẩu gốc sẽ KHÔNG được lưu lại ở đâu cả.');
console.log('Sao chép chuỗi hash bên dưới vào file .env:\n');
console.log(hash);
console.log('');
