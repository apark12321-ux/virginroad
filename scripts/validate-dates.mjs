/**
 * 빌드 전 날짜 검증 — 발행일 오류를 빌드 단계에서 차단.
 * - 미래 날짜(오늘보다 뒤): 색인 지연·누락 유발 → 에러로 빌드 중단
 * - 비정상 과거(사이트 시작일 이전): 오타 가능성 → 경고
 * - 잘못된 형식(YYYY-MM-DD 아님): 에러
 * - 중복 (id): 에러
 *
 * 사용: package.json build 맨 앞에 `node scripts/validate-dates.mjs &&` 추가.
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SITE_START = "2026-03-01"; // 사이트 운영 시작 기준일(이보다 이전 글은 의심)
// '오늘'을 한국 시간(KST, UTC+9) 기준으로 계산.
// 컨테이너가 UTC로 동작해도 한국 자정 이후 작성한 글이 '미래 날짜'로 오판되지 않도록 함.
const TODAY = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

function loadPosts() {
  const file = resolve(ROOT, "src/constants.ts");
  if (!existsSync(file)) {
    console.error("[validate-dates] src/constants.ts 없음. gen_constants 먼저 실행 필요.");
    process.exit(1);
  }
  const src = readFileSync(file, "utf8");
  const posts = [];
  const blockRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?date:\s*"([^"]+)"/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    posts.push({ id: m[1], title: m[2], date: m[3] });
  }
  return posts;
}

const posts = loadPosts();
const errors = [];
const warnings = [];
const seenIds = new Set();
const dateFmt = /^\d{4}-\d{2}-\d{2}$/;

for (const p of posts) {
  // 1) id 중복
  if (seenIds.has(p.id)) errors.push(`중복 id: ${p.id}`);
  seenIds.add(p.id);

  // 2) 날짜 형식
  if (!dateFmt.test(p.date)) {
    errors.push(`잘못된 날짜 형식 [${p.id}]: "${p.date}"`);
    continue;
  }

  // 3) 미래 날짜 (가장 위험 — 색인 누락 유발)
  if (p.date > TODAY) {
    errors.push(`미래 날짜 [${p.id}]: ${p.date} (오늘=${TODAY})`);
  }

  // 4) 비정상 과거 (오타 의심)
  if (p.date < SITE_START) {
    warnings.push(`사이트 시작일 이전 [${p.id}]: ${p.date} (시작=${SITE_START})`);
  }

  // 5) 유효한 실제 날짜인지 (예: 2026-02-30 같은 불가능한 날짜)
  const d = new Date(p.date + "T00:00:00Z");
  if (d.toISOString().slice(0, 10) !== p.date) {
    errors.push(`존재하지 않는 날짜 [${p.id}]: ${p.date}`);
  }
}

// 최신 글이 너무 오래됐는지 (운영 중단처럼 보임) — 경고만
const latest = posts.map((p) => p.date).filter((d) => dateFmt.test(d)).sort().pop();
if (latest) {
  const daysSince = Math.floor((new Date(TODAY) - new Date(latest)) / 86400000);
  if (daysSince > 14) {
    warnings.push(`최신 글이 ${daysSince}일 전(${latest}). 운영 중단처럼 보일 수 있음.`);
  }
}

console.log(`[validate-dates] ${posts.length}개 글 검증 · 오늘=${TODAY} · 최신글=${latest}`);

if (warnings.length) {
  console.warn("\n⚠ 경고:");
  warnings.forEach((w) => console.warn("  - " + w));
}

if (errors.length) {
  console.error("\n✗ 오류 (빌드 중단):");
  errors.forEach((e) => console.error("  - " + e));
  console.error("\n날짜를 수정한 뒤 다시 빌드하세요.");
  process.exit(1);
}

console.log("✓ 날짜 검증 통과");
