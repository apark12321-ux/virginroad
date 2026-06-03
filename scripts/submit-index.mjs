/**
 * 검색엔진 색인 제출 — IndexNow 프로토콜로 Bing·Naver·Yandex에 즉시 색인 요청.
 *
 * 사용: 배포가 끝난 뒤(URL이 실제 접속 가능할 때) `npm run submit-index` 실행.
 * Google은 IndexNow를 안 쓰므로 sitemap의 lastmod로 커버됨(별도 핑 포함).
 *
 * ⚠️ 반드시 배포 완료 후 실행. 아직 URL이 안 올라갔는데 제출하면
 *    검색엔진이 "없는 페이지"로 인식할 수 있음.
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

const SITE_HOST = "virginroad.kr";
const SITE_URL = `https://${SITE_HOST}`;
const INDEXNOW_KEY = "6912e84a5d1051736261207274dc2060";

// dist/sitemap.xml에서 URL 목록 추출
function loadUrlsFromSitemap() {
  const file = resolve(DIST, "sitemap.xml");
  if (!existsSync(file)) {
    console.error("[submit-index] dist/sitemap.xml 없음. 먼저 `npm run build` 실행 필요.");
    process.exit(1);
  }
  const xml = readFileSync(file, "utf8");
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1]);
  return urls;
}

async function submitIndexNow(urls) {
  // IndexNow는 한 곳에 제출하면 참여 검색엔진(Bing·Naver·Yandex 등)에 공유되지만,
  // 네이버는 자체 전용 엔드포인트도 운영하므로 양쪽에 모두 제출해 네이버 색인 신뢰도를 높임.
  const endpoints = [
    { name: "IndexNow(공용: Bing·Yandex 등)", url: "https://api.indexnow.org/indexnow" },
    { name: "Naver 서치어드바이저", url: "https://searchadvisor.naver.com/indexnow" },
  ];
  const body = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      console.log(`[${ep.name}] ${res.status} ${res.statusText} (${urls.length}개 URL)`);
      if (res.status === 200 || res.status === 202) {
        console.log("  ✅ 색인 요청 접수됨");
      } else if (res.status === 403) {
        console.log("  ⚠️ 403 — 키 파일 확인: " + `${SITE_URL}/${INDEXNOW_KEY}.txt` + " 접속 가능한지 확인.");
      } else if (res.status === 422) {
        console.log("  ⚠️ 422 — URL이 사이트 호스트와 불일치. SITE_HOST 확인.");
      } else if (res.status === 429) {
        console.log("  ⚠️ 429 — 요청 과다. 잠시 후 재시도.");
      } else {
        console.log("  ⚠️ 예상치 못한 응답. 잠시 후 재시도하세요.");
      }
    } catch (e) {
      console.error(`  ✗ [${ep.name}] 제출 실패:`, e.message);
    }
  }
}

async function pingSitemap() {
  // Bing sitemap 핑 (Google sitemap 핑은 2023년 폐지됨)
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  try {
    const res = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    console.log(`sitemap 핑(Bing): ${res.status}`);
  } catch (e) {
    console.log("sitemap 핑(Bing): 실패 (무시 가능)");
  }
}

const urls = loadUrlsFromSitemap();
console.log(`=== 검색엔진 색인 제출 시작 (${urls.length}개 URL) ===`);
await submitIndexNow(urls);
await pingSitemap();
console.log("=== 완료 ===");
console.log("\n[참고] Google은 Search Console의 sitemap(정확한 lastmod)으로 발견합니다.");
console.log("       즉시 색인은 Bing·Naver(IndexNow)로 처리됩니다.");
