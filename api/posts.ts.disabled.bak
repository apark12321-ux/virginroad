import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase Admin Setup
const projectId = "gen-lang-client-0326874047";
const databaseId = "ai-studio-9ae01718-7459-4ac4-90d0-d2a27c2a0cc1";

if (!getApps().length) {
  initializeApp({
    projectId: projectId,
  });
}
const db = getFirestore(databaseId);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers["x-api-key"];
  const serverApiKey = process.env.BLOG_STUDIO_API_KEY;

  if (serverApiKey && apiKey !== serverApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { slug, title, category, summary, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Missing required fields: title and content" });
  }

  const generateSlug = (t: string) => {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 100);
  };

  const postId = slug || generateSlug(title) || `post-${Date.now()}`;
  const validCategories = ["청약-분양", "전월세", "이사-인테리어", "대출-금융"];
  let finalCategory = category;
  if (!validCategories.includes(category)) {
    finalCategory = "청약-분양";
  }

  const bodyContent = typeof content === 'string' ? content : content.body;

  const newPost = {
    id: postId,
    title,
    excerpt: summary || "",
    content: bodyContent || "",
    category: finalCategory,
    author: "Blog Studio",
    date: new Date().toISOString().split('T')[0],
    image: `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800&sig=${Date.now()}`,
    readTime: "5분"
  };

  try {
    await db.collection("posts").doc(postId).set(newPost);
    return res.status(200).json({ success: true, id: postId });
  } catch (error) {
    console.error("Error saving post to Firestore:", error);
    return res.status(500).json({ error: "Failed to save post" });
  }
}
