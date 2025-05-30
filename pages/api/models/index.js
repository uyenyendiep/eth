// pages/api/models/index.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const models = await prisma.model.findMany({
        include: {
          usernames: true,
          _count: {
            select: { posts: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return res.status(200).json(models);
    }

    if (req.method === 'POST') {
      const { name, avatarUrl, location, usernames } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Tên model là bắt buộc' });
      }

      if (!avatarUrl || !avatarUrl.trim()) {
        return res.status(400).json({ error: 'Avatar URL là bắt buộc' });
      }

      if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
        return res
          .status(400)
          .json({ error: 'Ít nhất 1 username là bắt buộc' });
      }

      // Validate usernames
      const validUsernames = usernames.filter(
        (u) => u.username && u.username.trim()
      );
      if (validUsernames.length === 0) {
        return res
          .status(400)
          .json({ error: 'Ít nhất 1 username hợp lệ là bắt buộc' });
      }

      const primaryUsernames = validUsernames.filter((u) => u.isPrimary);
      if (primaryUsernames.length === 0) {
        return res
          .status(400)
          .json({ error: 'Phải có ít nhất 1 primary username' });
      }

      if (primaryUsernames.length > 1) {
        return res
          .status(400)
          .json({ error: 'Chỉ được có 1 primary username' });
      }

      // Check for duplicate usernames in request
      const usernameValues = validUsernames.map((u) =>
        u.username.trim().toLowerCase()
      );
      const uniqueUsernames = [...new Set(usernameValues)];
      if (usernameValues.length !== uniqueUsernames.length) {
        return res
          .status(400)
          .json({ error: 'Không được có username trùng lặp' });
      }

      // Check if usernames already exist in database
      const existingUsernames = await prisma.username.findMany({
        where: {
          username: {
            in: usernameValues
          }
        }
      });

      if (existingUsernames.length > 0) {
        const conflictUsernames = existingUsernames.map((u) => u.username);
        return res.status(400).json({
          error: `Username đã tồn tại: ${conflictUsernames.join(', ')}`
        });
      }

      // Create model with transaction
      const model = await prisma.$transaction(async (tx) => {
        // Create model
        const newModel = await tx.model.create({
          data: {
            name: name.trim(),
            avatarUrl: avatarUrl.trim(),
            location: location?.trim() || null,
            usernames: {
              create: validUsernames.map((u) => ({
                username: u.username.trim(),
                isPrimary: u.isPrimary
              }))
            }
          },
          include: {
            usernames: true
          }
        });

        return newModel;
      });

      console.log(
        `✅ Created model: ${model.name} with ${model.usernames.length} usernames`
      );

      return res.status(201).json({
        success: true,
        model,
        message: `Tạo thành công model "${model.name}"`
      });
    }

    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('❌ ERROR /api/models:', error);

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Dữ liệu đã tồn tại (có thể là username trùng lặp)'
      });
    }

    return res.status(500).json({
      error: 'Lỗi server khi xử lý model',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
