const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 10;

async function generatePostsJson() {
  console.log('Starting to generate posts JSON files...');

  // Tạo thư mục public/data nếu chưa có
  const dataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 1. Generate data cho trang chủ (existing code)
  const total = await prisma.post.count();
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

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
  }

  // 2. Generate data cho từng model
  const models = await prisma.model.findMany({
    include: {
      usernames: true,
      _count: {
        select: { posts: true }
      }
    }
  });

  // Tạo thư mục models
  const modelsDir = path.join(dataDir, 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  // Generate data cho từng model
  for (const model of models) {
    const primaryUsername = model.usernames.find((u) => u.isPrimary)?.username;
    if (!primaryUsername) continue;

    const modelTotal = model._count.posts;
    const modelTotalPages = Math.ceil(modelTotal / POSTS_PER_PAGE);

    // Generate pages cho model
    for (let page = 1; page <= modelTotalPages; page++) {
      const posts = await prisma.post.findMany({
        where: { modelId: model.id },
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

      const fileName = path.join(
        modelsDir,
        `${primaryUsername}-page-${page}.json`
      );
      fs.writeFileSync(
        fileName,
        JSON.stringify(
          {
            posts,
            page,
            totalPages: modelTotalPages,
            hasMore: page < modelTotalPages,
            model: model
          },
          null,
          2
        )
      );
    }

    // Create model info file
    const modelInfoFile = path.join(modelsDir, `${primaryUsername}-info.json`);
    fs.writeFileSync(
      modelInfoFile,
      JSON.stringify(
        {
          model,
          totalPosts: modelTotal,
          totalPages: modelTotalPages
        },
        null,
        2
      )
    );

    console.log(`Generated data for model: ${model.name} (${primaryUsername})`);
  }

  // 3. Save all models data
  const allModelsFile = path.join(dataDir, 'all-models.json');
  fs.writeFileSync(allModelsFile, JSON.stringify(models, null, 2));

  await prisma.$disconnect();
  console.log('Done generating all JSON files!');
}

generatePostsJson().catch((error) => {
  console.error('Error generating posts JSON:', error);
  process.exit(1);
});
