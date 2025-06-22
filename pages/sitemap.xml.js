import { PrismaClient } from '@prisma/client';

function generateSiteMap(models, posts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://ethot.me</loc>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>https://ethot.me/models</loc>
       <changefreq>daily</changefreq>
       <priority>0.9</priority>
     </url>
     ${models
       .map((model) => {
         const primaryUsername = model.usernames.find(
           (u) => u.isPrimary
         )?.username;
         return `
       <url>
           <loc>https://ethot.me/${primaryUsername}</loc>
           <changefreq>weekly</changefreq>
           <priority>0.8</priority>
       </url>
     `;
       })
       .join('')}
     ${posts
       .map((post) => {
         const primaryUsername = post.model.usernames.find(
           (u) => u.isPrimary
         )?.username;
         return `
       <url>
           <loc>https://ethot.me/${primaryUsername}/post/${post.postCount}</loc>
           <changefreq>monthly</changefreq>
           <priority>0.7</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function getServerSideProps({ res }) {
  const prisma = new PrismaClient();

  const models = await prisma.model.findMany({
    include: { usernames: true }
  });

  const posts = await prisma.post.findMany({
    include: {
      model: {
        include: { usernames: true }
      }
    }
  });

  await prisma.$disconnect();

  const sitemap = generateSiteMap(models, posts);

  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {}
  };
}

export default function SiteMap() {}
