// pages/api/posts/local.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { title, thumbnailUrl, modelId, media } = req.body;

    // Validation
    if (!modelId) {
      return res.status(400).json({ error: 'ModelId là bắt buộc' });
    }

    if (!thumbnailUrl) {
      return res.status(400).json({ error: 'ThumbnailUrl là bắt buộc' });
    }

    if (!media || !Array.isArray(media) || media.length === 0) {
      return res
        .status(400)
        .json({ error: 'Media array là bắt buộc và không được rỗng' });
    }

    // Kiểm tra model tồn tại và lấy thông tin
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        usernames: true,
        _count: {
          select: { posts: true }
        }
      }
    });

    if (!model) {
      return res.status(404).json({ error: 'Không tìm thấy model' });
    }

    const primaryUsername = model.usernames.find((u) => u.isPrimary);
    if (!primaryUsername) {
      return res.status(400).json({ error: 'Model không có primary username' });
    }

    // Tính postCount mới
    const currentPostCount = model._count.posts;
    const newPostCount = currentPostCount + 1;

    // Validate media format
    const validMediaTypes = ['IMAGE', 'VIDEO', 'GIF'];
    for (const mediaItem of media) {
      if (!mediaItem.url || !mediaItem.type) {
        return res.status(400).json({
          error: 'Mỗi media item phải có url và type'
        });
      }
      if (!validMediaTypes.includes(mediaItem.type)) {
        return res.status(400).json({
          error: `Type không hợp lệ: ${
            mediaItem.type
          }. Chỉ chấp nhận: ${validMediaTypes.join(', ')}`
        });
      }
    }

    // Tạo post với transaction để đảm bảo consistency
    const post = await prisma.$transaction(async (tx) => {
      // Tạo post
      const newPost = await tx.post.create({
        data: {
          title: title || `Post ${newPostCount}`,
          thumbnailUrl,
          postCount: newPostCount,
          publishedAt: new Date(),
          model: {
            connect: { id: modelId }
          },
          media: {
            create: media.map((m) => ({
              url: m.url,
              type: m.type
            }))
          }
        },
        include: {
          model: {
            include: {
              usernames: true
            }
          },
          media: true
        }
      });

      return newPost;
    });

    console.log(
      `✅ Created post for ${primaryUsername.username}, post number: ${newPostCount}`
    );

    return res.status(201).json({
      success: true,
      post,
      message: `Tạo thành công post ${newPostCount} cho ${model.name} (${primaryUsername.username})`
    });
  } catch (error) {
    console.error('❌ ERROR /api/posts/local:', error);

    // Xử lý các lỗi phổ biến
    if (error.code === 'P2002') {
      return res.status(400).json({
        error: 'Conflict: Dữ liệu đã tồn tại'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Foreign key constraint: ModelId không hợp lệ'
      });
    }

    return res.status(500).json({
      error: 'Lỗi server khi tạo post',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
