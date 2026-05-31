/**
 * 빌드 후 각 페이지를 정적 HTML로 프리렌더링.
 * - index.html을 템플릿으로 사용해 page별로 메타태그·본문 일부·JSON-LD를 미리 박아넣음
 * - dist/post/{slug}/index.html, dist/about/index.html 등 생성
 * - Vercel rewrite로 사용자가 /post/slug 접속 시 이 파일을 받음
 * - JS는 그대로 로드되어 React가 hydration → 사용자 경험은 동일
 *
 * 목적: 크롤러(애드센스 봇, 네이버 등)가 JS 실행 없이도 본문 텍스트를 볼 수 있도록 함.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "홈코노미뉴스";
const DEFAULT_TITLE = "홈코노미뉴스 - 가정경제·생활정책 전문 미디어";
const DEFAULT_DESCRIPTION = "신혼부부 정책 대출, 청약 전략, 혼수 가전 비교, 결혼 준비 체크리스트까지. 인생의 새로운 출발을 위한 실용 정보를 정리해 드립니다.";
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

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadPosts() {
  const file = resolve(ROOT, "src/constants.ts");
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const posts = [];
  const blockRe =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?excerpt:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?content:\s*`([\s\S]*?)`[\s\S]*?category:\s*"([^"]+)"[\s\S]*?author:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"[\s\S]*?image:\s*"([^"]+)"/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    posts.push({
      id: m[1],
      title: m[2].replace(/\\"/g, '"'),
      excerpt: m[3].replace(/\\"/g, '"'),
      content: m[4],
      category: m[5],
      author: m[6],
      date: m[7],
      image: m[8],
    });
  }
  return posts;
}

function renderPage(template, meta, bodyContent, jsonLd) {
  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${htmlEscape(meta.title)}</title>`
  );
  html = html.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${htmlEscape(meta.description)}" />`
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${htmlEscape(meta.canonical)}" />`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${htmlEscape(meta.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${htmlEscape(meta.description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${htmlEscape(meta.canonical)}" />`
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${htmlEscape(meta.ogType || "website")}" />`
  );

  if (meta.ogImage) {
    if (html.includes('property="og:image"')) {
      html = html.replace(
        /<meta property="og:image" content="[^"]*"\s*\/?>/,
        `<meta property="og:image" content="${htmlEscape(meta.ogImage)}" />`
      );
    } else {
      html = html.replace(
        /<meta property="og:url"[^>]*\/?>/,
        (match) =>
          `${match}\n    <meta property="og:image" content="${htmlEscape(meta.ogImage)}" />`
      );
    }
  }

  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${htmlEscape(meta.title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${htmlEscape(meta.description)}" />`
  );

  if (jsonLd) {
    const ld = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    html = html.replace("</head>", `${ld}\n  </head>`);
  }

  if (bodyContent) {
    html = html.replace(
      /<div id="root"><\/div>/,
      `<div id="root"><div id="prerendered-content" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;">${bodyContent}</div></div>`
    );
  }

  return html;
}

function buildPostBody(post) {
  return `
    <article>
      <header>
        <nav aria-label="breadcrumb">
          <a href="/">홈</a> &gt; <a href="/category/${encodeURIComponent(post.category)}">${htmlEscape(post.category)}</a>
        </nav>
        <h1>${htmlEscape(post.title)}</h1>
        <p class="excerpt">${htmlEscape(post.excerpt)}</p>
        <p class="meta">
          <span>${htmlEscape(post.author)}</span> ·
          <time datetime="${post.date}">${post.date}</time> ·
          <span>${htmlEscape(post.category)}</span>
        </p>
        <img src="${htmlEscape(post.image)}" alt="${htmlEscape(post.title)}" />
      </header>
      <main>${post.content}</main>
      <footer>
        <p>© 상상아트 · 운영: ${SITE_NAME} 편집팀 · 문의: apark12321@gmail.com</p>
      </footer>
    </article>
  `;
}

function buildCategoryBody(category, posts) {
  const list = posts
    .filter((p) => p.category === category)
    .map(
      (p) => `
        <li>
          <a href="/post/${encodeURIComponent(slugify(p.title) || p.id)}">
            <h2>${htmlEscape(p.title)}</h2>
            <p>${htmlEscape(p.excerpt)}</p>
            <time datetime="${p.date}">${p.date}</time>
          </a>
        </li>`
    )
    .join("");
  return `
    <main>
      <h1>${htmlEscape(category)} 가이드</h1>
      <p>${htmlEscape(category)} 관련 신혼부부 정보를 모았습니다.</p>
      <ul>${list}</ul>
    </main>
  `;
}

function buildHomeBody(posts) {
  const recent = posts.slice(0, 10);
  const list = recent
    .map(
      (p) => `
        <li>
          <a href="/post/${encodeURIComponent(slugify(p.title) || p.id)}">
            <h2>${htmlEscape(p.title)}</h2>
            <p>${htmlEscape(p.excerpt)}</p>
            <span>${htmlEscape(p.category)}</span> · <time>${p.date}</time>
          </a>
        </li>`
    )
    .join("");
  return `
    <main>
      <h1>홈코노미뉴스</h1>
      <p>${DEFAULT_DESCRIPTION}</p>
      <h2>최근 게시물</h2>
      <ul>${list}</ul>
      <nav>
        <h2>카테고리</h2>
        <ul>
          ${CATEGORIES.map((c) => `<li><a href="/category/${encodeURIComponent(c)}">${htmlEscape(c)}</a></li>`).join("")}
        </ul>
      </nav>
    </main>
  `;
}

function buildStaticPageBody(title, body) {
  return `<main><h1>${htmlEscape(title)}</h1>${body}</main>`;
}

function articleJsonLd(post) {
  const slug = slugify(post.title) || post.id;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: [post.image],
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "상상아트",
      alternateName: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
      taxID: "272-14-01256",
      foundingDate: "2025-03-01",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/post/${slug}` },
    articleSection: post.category,
    inLanguage: "ko-KR",
  };
}

function writeFile(p, content) {
  const dir = dirname(p);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(p, content, "utf8");
}

function main() {
  const indexPath = join(DIST, "index.html");
  if (!existsSync(indexPath)) {
    console.error("[prerender] dist/index.html not found. Run vite build first.");
    process.exit(1);
  }
  const template = readFileSync(indexPath, "utf8");
  const posts = loadPosts();

  let count = 0;

  // 1) 홈
  const homeHtml = renderPage(
    template,
    {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}/`,
      ogType: "website",
    },
    buildHomeBody(posts),
    null
  );
  writeFile(indexPath, homeHtml);
  count++;

  // 2) 정적 페이지
  const staticPages = [
    {
      path: "about/index.html",
      title: `소개 | ${SITE_NAME}`,
      desc: `${SITE_NAME}는 신혼·출산·주거·세금 정책부터 가정 재무까지 다루는 가정경제·생활정책 전문 미디어입니다.`,
      url: `${SITE_URL}/about`,
      body: buildStaticPageBody(
        `${SITE_NAME} 소개`,
        `<p>${SITE_NAME}는 신혼·출산·주거·세금 등 가정의 의사결정에 직접 영향을 주는 정부 정책과 가정 재무 이슈를 정부·공공기관 자료에 근거해 다루는 전문 미디어입니다. 운영: 상상아트 / 사업자등록번호: 272-14-01256 / 통신판매업: 제2023-화성동탄-1098호 / 문의: apark12321@gmail.com</p>`
      ),
    },
    {
      path: "policy/index.html",
      title: `2026 가정경제·생활정책 핵심 정보 | ${SITE_NAME}`,
      desc: `2026년 신혼·출산·주거 대출 금리, 결혼세액공제, 신생아특례, 부모급여 등 가정에 영향을 주는 핵심 정책을 정부 공식 자료 기준으로 정리합니다.`,
      url: `${SITE_URL}/policy`,
      body: buildStaticPageBody(
        `2026 가정경제·생활정책 핵심 정보`,
        `<p>가정의 의사결정에 영향을 주는 대출 금리, 세금 혜택, 출산 지원금을 정부·공공기관 공식 자료 기준으로 정리합니다. 신생아 특례 디딤돌대출(금리 1.8~4.5%, 우대 적용 시 최저 1.2%), 결혼세액공제 100만원(2026년 12월 31일 마감), 부모급여(만 0세 월 100만원), 부동산 전자계약 우대금리 0.1%p 등 핵심 정책을 포함합니다. 출처: 주택도시기금, 한국주택금융공사, 홈택스, 복지로.</p>`
      ),
    },
    {
      path: "privacy/index.html",
      title: `개인정보 처리방침 | ${SITE_NAME}`,
      desc: `${SITE_NAME}의 개인정보 수집 및 이용에 관한 안내입니다.`,
      url: `${SITE_URL}/privacy`,
      body: buildStaticPageBody(
        "개인정보 처리방침",
        `<p>본 사이트는 이용자의 개인정보를 소중히 다룹니다. 개인정보 보호책임자: 상상아트 개인정보 보호 담당자 (apark12321@gmail.com).</p>`
      ),
    },
    {
      path: "terms/index.html",
      title: `이용약관 | ${SITE_NAME}`,
      desc: `${SITE_NAME} 서비스 이용에 관한 약관입니다.`,
      url: `${SITE_URL}/terms`,
      body: buildStaticPageBody(
        "이용약관",
        `<p>본 약관은 상상아트가 운영하는 ${SITE_NAME}(https://virginroad.kr)의 서비스 이용에 관한 사항을 규정합니다.</p>`
      ),
    },
    {
      path: "partnership/index.html",
      title: `제휴 및 비즈니스 문의 | ${SITE_NAME}`,
      desc: `${SITE_NAME}와 광고, 콘텐츠 협업, 파트너십 문의를 위한 안내 페이지입니다.`,
      url: `${SITE_URL}/partnership`,
      body: buildStaticPageBody(
        "제휴 및 비즈니스 문의",
        `<p>제휴, 광고, 콘텐츠 협업 문의는 apark12321@gmail.com으로 보내주시면 영업일 3일 이내 회신드립니다.</p>`
      ),
    },
    {
      path: "announcement/index.html",
      title: `공지사항 | ${SITE_NAME}`,
      desc: `${SITE_NAME}의 서비스 운영 관련 공지사항을 안내합니다.`,
      url: `${SITE_URL}/announcement`,
      body: buildStaticPageBody(
        "공지사항",
        `<p>${SITE_NAME} 운영 관련 공지사항을 안내합니다.</p>`
      ),
    },
    {
      path: "tools/didimdol/index.html",
      title: `디딤돌 우대금리 계산기 | ${SITE_NAME}`,
      desc: `한국주택금융공사 2026년 5월 1일 공시 기준으로 본인 가구의 디딤돌대출 우대금리와 월 상환액을 시뮬레이션해 드립니다. 자녀·청약통장·전자계약 우대를 단계별로 확인하세요.`,
      url: `${SITE_URL}/tools/didimdol`,
      body: buildStaticPageBody(
        "디딤돌 우대금리 계산기",
        `<p>한국주택금융공사 2026년 5월 1일 공시 기준으로, 본인 가구의 부부 합산 소득·대출액·만기·자녀 수·청약통장 가입 기간·전자계약 여부 등을 입력하시면 단계별 우대금리 적용 과정과 월 원리금균등 상환액을 시뮬레이션해 드립니다. 자녀 우대(택 1)와 청약통장 추가우대, 전자계약 0.1%p, 30% 이하 신청 0.1%p 등 4단계 우대를 직접 확인하세요. 출처: 한국주택금융공사, 주택도시기금포털, 국토교통부 부동산거래 전자계약시스템.</p>`
      ),
    },
  ];

  for (const p of staticPages) {
    const html = renderPage(
      template,
      { title: p.title, description: p.desc, canonical: p.url, ogType: "website" },
      p.body,
      null
    );
    writeFile(join(DIST, p.path), html);
    count++;
  }

  // 3) 카테고리
  for (const cat of CATEGORIES) {
    const path = `category/${encodeURIComponent(cat)}/index.html`;
    const html = renderPage(
      template,
      {
        title: `${cat} 카테고리 | ${SITE_NAME}`,
        description: `${cat} 관련 신혼부부 정보를 모았습니다.`,
        canonical: `${SITE_URL}/category/${encodeURIComponent(cat)}`,
        ogType: "website",
      },
      buildCategoryBody(cat, posts),
      null
    );
    writeFile(join(DIST, path), html);
    count++;
  }

  // 4) 게시물
  for (const post of posts) {
    const slug = slugify(post.title) || post.id;
    const path = `post/${encodeURIComponent(slug)}/index.html`;
    const html = renderPage(
      template,
      {
        title: `${post.title} | ${SITE_NAME}`,
        description: post.excerpt || stripHtml(post.content).slice(0, 155),
        canonical: `${SITE_URL}/post/${slug}`,
        ogType: "article",
        ogImage: post.image,
      },
      buildPostBody(post),
      articleJsonLd(post)
    );
    writeFile(join(DIST, path), html);
    count++;
  }

  console.log(`[prerender] generated ${count} static HTML files (home + ${staticPages.length} static + ${CATEGORIES.length} categories + ${posts.length} posts)`);
}

main();
