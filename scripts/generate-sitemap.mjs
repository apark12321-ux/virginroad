/**
 * 빌드 후 dist/sitemap.xml과 dist/robots.txt를 자동 생성.
 * MOCK_POSTS(constants.ts)를 읽어 slug 기반 URL을 만든다.
 *
 * 사용: package.json의 build 스크립트 뒤에 `&& node scripts/generate-sitemap.mjs` 추가.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://virginroad.kr";
const CATEGORIES = ["신혼금융", "신혼가전", "결혼준비"];

function slugify(title) {
  if (!title) return "";
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\uAC00-\uD7A3\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 25)
    .replace(/-+$/g, "");
}

// constants.ts에서 게시물 id, title, date를 정규식으로 추출
function loadPosts() {
  const file = resolve(ROOT, "src/constants.ts");
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const posts = [];
  const blockRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?date:\s*"([^"]+)"/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    posts.push({ id: m[1], title: m[2].replace(/\\"/g, '"'), date: m[3] });
  }
  return posts;
}

function xmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  urls.push({ loc: `${SITE_URL}/`, lastmod: today, changefreq: "daily", priority: "1.0" });
  urls.push({ loc: `${SITE_URL}/about`, lastmod: today, changefreq: "monthly", priority: "0.6" });
  urls.push({ loc: `${SITE_URL}/policy`, lastmod: today, changefreq: "weekly", priority: "0.8" });
  urls.push({ loc: `${SITE_URL}/announcement`, lastmod: today, changefreq: "weekly", priority: "0.5" });
  urls.push({ loc: `${SITE_URL}/partnership`, lastmod: today, changefreq: "monthly", priority: "0.4" });
  urls.push({ loc: `${SITE_URL}/terms`, lastmod: today, changefreq: "yearly", priority: "0.3" });
  urls.push({ loc: `${SITE_URL}/privacy`, lastmod: today, changefreq: "yearly", priority: "0.3" });

  for (const cat of CATEGORIES) {
    urls.push({
      loc: `${SITE_URL}/category/${encodeURIComponent(cat)}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.8",
    });
  }

  for (const p of posts) {
    const slug = slugify(p.title) || p.id;
    urls.push({
      loc: `${SITE_URL}/post/${encodeURIComponent(slug)}`,
      lastmod: p.date || today,
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function buildRobots() {
  return `# 버진로드 robots.txt
# Site: ${SITE_URL}

User-agent: *
Allow: /
Disallow: /api/

# Google AdSense 크롤러 명시 허용
User-agent: Mediapartners-Google
Allow: /

# Google AdsBot
User-agent: AdsBot-Google
Allow: /

# 일반 검색 봇
User-agent: Googlebot
Allow: /

User-agent: Yeti
Allow: /

User-agent: Daum
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function main() {
  if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });
  const posts = loadPosts();
  writeFileSync(resolve(DIST, "sitemap.xml"), buildSitemap(posts), "utf8");
  writeFileSync(resolve(DIST, "robots.txt"), buildRobots(), "utf8");
  console.log(`[sitemap] generated for ${posts.length} posts → dist/sitemap.xml, dist/robots.txt`);
}

main();
