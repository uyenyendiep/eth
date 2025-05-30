const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 2;

async function generatePostsJson() {
  console.log('Starting to generate posts JSON files...');

  // Tạo thư mục public/data nếu chưa có
  const dataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Lấy tổng số posts
  const total = await prisma.post.count();
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Tạo metadata file TRƯỚC
  const metaFile = path.join(dataDir, 'posts-meta.json');
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        totalPages,
        totalPosts: total,
        postsPerPage: POSTS_PER_PAGE,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  console.log(`Generated ${metaFile}`);

  // Generate JSON cho mỗi page
  for (let page = 1; page <= totalPages; page++) {
    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE,
      skip: (page - 1) * POSTS_PER_PAGE,
      include: {
        model: {
          include: {
            usernames: true
          }
        },
        media: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Lưu vào file JSON
    const fileName = path.join(dataDir, `posts-page-${page}.json`);
    fs.writeFileSync(
      fileName,
      JSON.stringify(
        {
          posts,
          page,
          totalPages,
          hasMore: page < totalPages
        },
        null,
        2
      )
    );

    console.log(`Generated ${fileName} with ${posts.length} posts`);
  }

  await prisma.$disconnect();
  console.log(`Done! Generated ${totalPages} page files.`);
}

generatePostsJson().catch((error) => {
  console.error('Error generating posts JSON:', error);
  process.exit(1);
});
