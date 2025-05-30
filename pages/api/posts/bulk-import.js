// pages/api/posts/bulk-import.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Files array là bắt buộc' });
    }

    // Lấy tất cả models với usernames
    const models = await prisma.model.findMany({
      include: {
        usernames: true,
        posts: {
          select: {
            postCount: true
          }
        }
      }
    });

    // Tạo map để tra cứu nhanh
    const modelsByPrimaryUsername = {};
    models.forEach((model) => {
      const primaryUsername = model.usernames.find((u) => u.isPrimary);
      if (primaryUsername) {
        modelsByPrimaryUsername[primaryUsername.username] = {
          ...model,
          existingPostCounts: model.posts.map((p) => p.postCount)
        };
      }
    });

    // Phân tích files và nhóm theo model/post
    const postsToCreate = [];
    const errors = [];

    // Regex để parse đường dẫn: /media/{username}/post-{number}/
    const pathRegex = /^\/media\/([^\/]+)\/post-(\d+)\//;

    // Group files by model and post number
    const groupedFiles = {};

    files.forEach((file) => {
      const match = file.fullPath.match(pathRegex);
      if (!match) return;

      const [, username, postNumber] = match;
      const postNum = parseInt(postNumber);

      // Kiểm tra model có tồn tại không
      const model = modelsByPrimaryUsername[username];
      if (!model) {
        errors.push(`Model với username '${username}' không tồn tại`);
        return;
      }

      // Kiểm tra post đã tồn tại chưa
      if (model.existingPostCounts.includes(postNum)) {
        return; // Skip nếu post đã tồn tại
      }

      // Tạo key để group files
      const key = `${model.id}_${postNum}`;
      if (!groupedFiles[key]) {
        groupedFiles[key] = {
          modelId: model.id,
          modelName: model.name,
          username: username,
          postCount: postNum,
          files: []
        };
      }

      groupedFiles[key].files.push({
        url: file.fullPath,
        type: file.type,
        fileName: file.fileName
      });
    });

    // Tạo posts từ grouped files
    for (const group of Object.values(groupedFiles)) {
      if (group.files.length === 0) continue;

      // Tìm thumbnail
      const thumbnailFile =
        group.files.find((f) =>
          f.fileName.toLowerCase().includes('thumbnail')
        ) || group.files.find((f) => f.type === 'IMAGE');

      if (!thumbnailFile) {
        errors.push(
          `Post ${group.postCount} của ${group.username} không có thumbnail`
        );
        continue;
      }

      postsToCreate.push({
        modelId: group.modelId,
        title: `Post ${group.postCount}`,
        thumbnailUrl: thumbnailFile.url,
        postCount: group.postCount,
        publishedAt: new Date(),
        media: {
          create: group.files.map((f) => ({
            url: f.url,
            type: f.type
          }))
        }
      });
    }

    // Bulk create posts với transaction
    const createdPosts = [];
    for (const postData of postsToCreate) {
      try {
        const post = await prisma.post.create({
          data: postData,
          include: {
            model: true,
            media: true
          }
        });
        createdPosts.push(post);
      } catch (error) {
        errors.push(`Lỗi khi tạo post ${postData.postCount}: ${error.message}`);
      }
    }

    await prisma.$disconnect();

    return res.status(201).json({
      success: true,
      created: createdPosts.length,
      posts: createdPosts,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalFilesScanned: files.length,
        postsCreated: createdPosts.length,
        errors: errors.length
      }
    });
  } catch (error) {
    console.error('❌ ERROR /api/posts/bulk-import:', error);
    return res.status(500).json({
      error: 'Lỗi server khi import posts',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
