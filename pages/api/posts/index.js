// pages/api/posts/index.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const posts = await prisma.post.findMany();
    return res.json(posts);
  }
  if (req.method === 'POST') {
    // Nếu bạn còn muốn xử lý POST "mặc định"
    // hoặc gộp chung với /local thì có thể check req.url
    return res
      .status(200)
      .json({ message: 'Use /api/posts/local for local post' });
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
