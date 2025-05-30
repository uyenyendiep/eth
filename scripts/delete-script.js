const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mediaFileId = 'cmb7pzt1b0002uto80loxjn4e'; // 🛑 Thay ID thật vào đây

  const deleted = await prisma.mediaFile.delete({
    where: { id: mediaFileId }
  });

  console.log('Đã xóa post:', deleted);
}

main()
  .catch((e) => {
    console.error('Lỗi khi xóa:', e);
  })
  .finally(() => prisma.$disconnect());
