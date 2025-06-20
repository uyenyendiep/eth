// scripts/generate-posts-json.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 10;
const MODELS_PER_PAGE = 10;

async function generatePostsJson() {
  console.log('Starting to generate JSON files...');

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

  // 3. Generate models list
  console.log('\n📋 Generating models list...');
  await generateModelsList(dataDir);

  // 4. Generate all models json
  await generateAllModelsJson(dataDir);

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

async function generateModelsList(dataDir) {
  const total = await prisma.model.count();
  const totalPages = Math.ceil(total / MODELS_PER_PAGE);

  // Tạo metadata file cho models
  const metaFile = path.join(dataDir, 'models-meta.json');
  fs.writeFileSync(
    metaFile,
    JSON.stringify(
      {
        totalPages,
        totalModels: total,
        modelsPerPage: MODELS_PER_PAGE,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  console.log(`Generated ${metaFile}`);

  // Lấy tất cả models với post mới nhất
  const allModelsWithLatestPost = await prisma.model.findMany({
    include: {
      usernames: true,
      _count: {
        select: { posts: true }
      },
      posts: {
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  // Sắp xếp models theo post mới nhất
  const sortedModels = allModelsWithLatestPost.sort((a, b) => {
    const aLatestPost = a.posts[0]?.createdAt || new Date(0);
    const bLatestPost = b.posts[0]?.createdAt || new Date(0);
    return new Date(bLatestPost) - new Date(aLatestPost);
  });

  // Generate JSON cho mỗi page của models
  for (let page = 1; page <= totalPages; page++) {
    const startIndex = (page - 1) * MODELS_PER_PAGE;
    const endIndex = startIndex + MODELS_PER_PAGE;
    const models = sortedModels.slice(startIndex, endIndex);

    const fileName = path.join(dataDir, `models-page-${page}.json`);
    fs.writeFileSync(
      fileName,
      JSON.stringify(
        {
          models,
          page,
          totalPages,
          hasMore: page < totalPages
        },
        null,
        2
      )
    );

    console.log(`Generated ${fileName} with ${models.length} models`);
  }
}

async function generateAllModelsJson(dataDir) {
  console.log('\n📋 Generating all-models.json...');

  const allModels = await prisma.model.findMany({
    include: {
      usernames: true,
      _count: {
        select: { posts: true }
      },
      posts: {
        select: {
          postCount: true,
          createdAt: true
        },
        where: { postCount: { not: null } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  // Sắp xếp models theo post mới nhất
  const sortedModels = allModels.sort((a, b) => {
    const aLatestPost = a.posts[0]?.createdAt || new Date(0);
    const bLatestPost = b.posts[0]?.createdAt || new Date(0);
    return new Date(bLatestPost) - new Date(aLatestPost);
  });

  // Format lại data
  const formattedModels = sortedModels.map((model) => {
    // Tạo mảng postCounts từ posts
    const postCounts = model.posts
      .map((p) => p.postCount)
      .filter((pc) => pc !== null)
      .sort((a, b) => a - b); // Sắp xếp postCounts tăng dần

    return {
      id: model.id,
      name: model.name,
      avatarUrl: model.avatarUrl,
      avatarGifUrl: model.avatarGifUrl,
      location: model.location,
      usernames: model.usernames,
      _count: model._count,
      postCounts: postCounts,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt
    };
  });

  const fileName = path.join(dataDir, 'all-models.json');
  fs.writeFileSync(
    fileName,
    JSON.stringify(
      {
        models: formattedModels,
        total: formattedModels.length,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    )
  );

  console.log(`Generated ${fileName} with ${formattedModels.length} models`);
}

// Chạy script
generatePostsJson().catch((error) => {
  console.error('Error generating JSON files:', error);
  process.exit(1);
});
