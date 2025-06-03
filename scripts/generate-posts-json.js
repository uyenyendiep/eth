// scripts/generate-posts-json.js
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

  // 1. Generate posts cho trang chủ (tất cả posts)
  console.log('\n📄 Generating homepage posts...');
  await generateHomepagePosts(dataDir);

  // 2. Generate posts cho từng model
  console.log('\n👤 Generating model-specific posts...');
  await generateModelPosts(dataDir);

  await prisma.$disconnect();
  console.log('\n✅ Done! All JSON files generated successfully.');
}

async function generateHomepagePosts(dataDir) {
  const total = await prisma.post.count();
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Tạo metadata file
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
}

async function generateModelPosts(dataDir) {
  // Lấy tất cả models
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

  for (const model of models) {
    const primaryUsername = model.usernames.find((u) => u.isPrimary);
    if (!primaryUsername) {
      console.log(`⚠️  Skipping model ${model.name} - no primary username`);
      continue;
    }

    const username = primaryUsername.username;
    console.log(`\nProcessing model: ${model.name} (${username})`);

    // 1. Tạo file thông tin model
    const modelFile = path.join(modelsDir, `${username}.json`);
    fs.writeFileSync(
      modelFile,
      JSON.stringify(
        {
          model: {
            ...model,
            _count: model._count
          }
        },
        null,
        2
      )
    );
    console.log(`  ✓ Generated model info: ${modelFile}`);

    // 2. Tạo thư mục cho posts của model
    const modelPostsDir = path.join(modelsDir, username);
    if (!fs.existsSync(modelPostsDir)) {
      fs.mkdirSync(modelPostsDir, { recursive: true });
    }

    // 3. Generate posts pages cho model
    const totalPosts = model._count.posts;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

    for (let page = 1; page <= totalPages; page++) {
      const posts = await prisma.post.findMany({
        where: {
          modelId: model.id
        },
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
          postCount: 'desc'
        }
      });

      const fileName = path.join(modelPostsDir, `posts-page-${page}.json`);
      fs.writeFileSync(
        fileName,
        JSON.stringify(
          {
            posts,
            page,
            totalPages,
            hasMore: page < totalPages,
            modelId: model.id,
            username: username
          },
          null,
          2
        )
      );

      console.log(
        `  ✓ Generated page ${page}/${totalPages} with ${posts.length} posts`
      );
    }
  }
}

generatePostsJson().catch((error) => {
  console.error('Error generating posts JSON:', error);
  process.exit(1);
});
