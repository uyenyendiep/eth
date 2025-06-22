import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearAllData() {
  try {
    // Xóa bảng con trước (MediaFile → Post → Username → Model)
    await prisma.mediaFile.deleteMany();
    await prisma.post.deleteMany();
    await prisma.username.deleteMany();
    await prisma.model.deleteMany();

    console.log('✅ Đã xóa sạch toàn bộ dữ liệu trong database.');
  } catch (error) {
    console.error('❌ Lỗi khi xóa dữ liệu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
