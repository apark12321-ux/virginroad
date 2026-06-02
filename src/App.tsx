
import { useState, useMemo, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PostCard } from "./components/PostCard";
import { PolicyHub } from "./components/PolicyHub";
import { DidimdolCalculator } from "./components/DidimdolCalculator";
import { CheongyakCalculator } from "./components/CheongyakCalculator";
import { MOCK_POSTS, CATEGORIES } from "./constants";
import { Post } from "./types";
import { Share2, Printer, ArrowRight, TrendingUp, ArrowUpRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./lib/firebase";
import { recordView, fetchAllViews, formatViews } from "./lib/views";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { calculateReadTime, slugify, stripHtml } from "./lib/utils";

type Page = "home" | "about" | "privacy" | "partnership" | "announcement" | "terms" | "policy" | "tools-didimdol" | "tools-cheongyak" | `category-${string}` | `post-${string}`;

const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "홈코노미뉴스";
const DEFAULT_TITLE = "홈코노미뉴스 - 가정경제·생활정책 전문 미디어";
const DEFAULT_DESCRIPTION = "신혼·출산·주거·세금 정책부터 가정 재무까지. 정부·공공기관 자료에 근거한 가정경제·생활정책 전문 매체입니다.";

function pageFromUrl(): Page {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname;
  if (path === "/" || path === "") return "home";
  if (path === "/about") return "about";
  if (path === "/privacy") return "privacy";
  if (path === "/partnership") return "partnership";
  if (path === "/announcement") return "announcement";
  if (path === "/terms") return "terms";
  if (path === "/policy") return "policy";
  if (path === "/tools/didimdol") return "tools-didimdol";
  if (path === "/tools/cheongyak") return "tools-cheongyak";
  const catMatch = path.match(/^\/category\/(.+)$/);
  if (catMatch) return `category-${decodeURIComponent(catMatch[1])}` as Page;
  const postMatch = path.match(/^\/post\/(.+)$/);
  if (postMatch) return `post-${decodeURIComponent(postMatch[1])}` as Page;
  return "home";
}

function urlFromPage(page: Page, posts: Post[]): string {
  if (page === "home") return "/";
  if (page === "about") return "/about";
  if (page === "privacy") return "/privacy";
  if (page === "partnership") return "/partnership";
  if (page === "announcement") return "/announcement";
  if (page === "terms") return "/terms";
  if (page === "policy") return "/policy";
  if (page === "tools-didimdol") return "/tools/didimdol";
  if (page === "tools-cheongyak") return "/tools/cheongyak";
  if (page.startsWith("category-")) {
    return `/category/${encodeURIComponent(page.replace("category-", ""))}`;
  }
  if (page.startsWith("post-")) {
    const key = page.replace("post-", "");
    const post = posts.find(p => p.id === key || slugify(p.title) === key);
    if (post) {
      const slug = slugify(post.title) || post.id;
      return `/post/${slug}`;
    }
    return `/post/${encodeURIComponent(key)}`;
  }
  return "/";
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

function setArticleJsonLd(post: Post | null) {
  const id = "article-jsonld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!post) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  const slug = slugify(post.title) || post.id;
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": [post.image],
    "datePublished": post.date,
    "dateModified": post.updated || post.date,
    "author": { "@type": "Person", "name": post.author || "홈코노미뉴스 편집부" },
    "publisher": {
      "@type": "Organization",
      "name": "상상아트",
      "alternateName": SITE_NAME,
      "url": SITE_URL,
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/icon.svg` },
      "taxID": "272-14-01256"
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `${SITE_URL}/post/${slug}` },
    "articleSection": post.category,
    "inLanguage": "ko-KR"
  };
  el.textContent = JSON.stringify(data);
}

function setBreadcrumbJsonLd(post: Post | null) {
  const id = "breadcrumb-jsonld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!post) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  const slug = slugify(post.title) || post.id;
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "홈", "item": SITE_URL + "/" },
      { "@type": "ListItem", "position": 2, "name": post.category, "item": `${SITE_URL}/category/${encodeURIComponent(post.category)}` },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": `${SITE_URL}/post/${slug}` }
    ]
  };
  el.textContent = JSON.stringify(data);
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(() => pageFromUrl());
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("q") || "";
  });
  const [realPosts, setRealPosts] = useState<Post[]>([]);
  const [, setUser] = useState<User | null>(null);
  const [views, setViews] = useState<Record<string, number>>({});

  useEffect(() => {
    const onPopState = () => {
      setCurrentPage(pageFromUrl());
      const params = new URLSearchParams(window.location.search);
      setSearchQuery(params.get("q") || "");
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentQ = params.get("q") || "";
    if (currentQ === searchQuery) return;

    if (!searchQuery) {
      params.delete("q");
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
      return;
    }

    const timer = setTimeout(() => {
      params.set("q", searchQuery);
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      const wasSearching = !!currentQ;
      if (wasSearching) {
        window.history.replaceState({}, "", newUrl);
      } else {
        window.history.pushState({}, "", newUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Post[];
      setRealPosts(posts);
    }, (error) => {
      console.error("Firestore Error:", error);
    });
    return () => unsubscribe();
  }, []);

  const allPosts = useMemo(() => {
    const combined = [...realPosts];
    MOCK_POSTS.forEach(mock => {
      if (!combined.find(p => p.id === mock.id)) {
        combined.push(mock as Post);
      }
    });
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [realPosts]);

  // 전체 조회수 로드 (마운트 시 1회)
  useEffect(() => {
    fetchAllViews().then(setViews);
  }, []);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (currentPage === "home") {
      // show all
    } else if (currentPage.startsWith("category-")) {
      const category = currentPage.replace("category-", "");
      posts = posts.filter(p => p.category === category);
    }
    if (searchQuery) {
      posts = posts.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return posts;
  }, [currentPage, searchQuery, allPosts]);

  const currentPost = useMemo(() => {
    if (currentPage.startsWith("post-")) {
      const key = currentPage.replace("post-", "");
      return (
        allPosts.find(p => slugify(p.title) === key) ||
        allPosts.find(p => p.id === key) ||
        null
      );
    }
    return null;
  }, [currentPage, allPosts]);

  useEffect(() => {
    if (!currentPost) return;
    const slug = slugify(currentPost.title) || currentPost.id;
    const desired = `/post/${slug}`;
    if (window.location.pathname !== desired) {
      window.history.replaceState({}, "", desired);
    }
  }, [currentPost]);

  // 글 조회 시 조회수 기록 (세션당 1회) + 화면에 즉시 반영
  useEffect(() => {
    if (!currentPost) return;
    const id = currentPost.id;
    recordView(id).then((next) => {
      if (typeof next === "number") {
        // 쓰기 성공: 반환된 최신값으로 즉시 반영
        setViews((prev) => ({ ...prev, [id]: next }));
      } else {
        // 이미 본 글이거나 쓰기 생략: 전체 조회수만 다시 읽어 동기화
        fetchAllViews().then(setViews);
      }
    });
  }, [currentPost]);

  useEffect(() => {
    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESCRIPTION;
    let canonical = `${SITE_URL}/`;
    let ogType: "website" | "article" = "website";
    let ogImage: string | null = null;

    if (currentPost) {
      const slug = slugify(currentPost.title) || currentPost.id;
      title = `${currentPost.title} | ${SITE_NAME}`;
      description = currentPost.excerpt || stripHtml(currentPost.content).slice(0, 155);
      canonical = `${SITE_URL}/post/${slug}`;
      ogType = "article";
      ogImage = currentPost.image;
    } else if (currentPage === "about") {
      title = `소개 | ${SITE_NAME}`;
      description = `${SITE_NAME}는 신혼·출산·주거·세금 정책부터 가정 재무까지 다루는 가정경제·생활정책 전문 미디어입니다.`;
      canonical = `${SITE_URL}/about`;
    } else if (currentPage === "policy") {
      title = `2026 가정경제·생활정책 핵심 정보 | ${SITE_NAME}`;
      description = `2026년 신혼·출산·주거 대출 금리, 결혼세액공제, 신생아특례, 부모급여 등 가정에 영향을 주는 핵심 정책을 정부 공식 자료 기준으로 정리합니다. 정책 변경 시 신속 반영.`;
      canonical = `${SITE_URL}/policy`;
    } else if (currentPage === "privacy") {
      title = `개인정보 처리방침 | ${SITE_NAME}`;
      description = `${SITE_NAME}의 개인정보 수집 및 이용에 관한 안내입니다.`;
      canonical = `${SITE_URL}/privacy`;
    } else if (currentPage === "partnership") {
      title = `제휴 및 비즈니스 문의 | ${SITE_NAME}`;
      description = `${SITE_NAME}와 광고, 콘텐츠 협업, 파트너십 문의를 위한 안내 페이지입니다.`;
      canonical = `${SITE_URL}/partnership`;
    } else if (currentPage === "announcement") {
      title = `공지사항 | ${SITE_NAME}`;
      description = `${SITE_NAME}의 서비스 운영 관련 공지사항을 안내합니다.`;
      canonical = `${SITE_URL}/announcement`;
    } else if (currentPage === "terms") {
      title = `이용약관 | ${SITE_NAME}`;
      description = `${SITE_NAME} 서비스 이용에 관한 약관입니다.`;
      canonical = `${SITE_URL}/terms`;
    } else if (currentPage === "tools-didimdol") {
      title = `디딤돌 우대금리 계산기 | ${SITE_NAME}`;
      description = `한국주택금융공사 2026년 5월 1일 공시 기준으로 본인 가구의 디딤돌대출 우대금리와 월 상환액을 시뮬레이션해 드립니다. 자녀·청약통장·전자계약 우대를 단계별로 확인하세요.`;
      canonical = `${SITE_URL}/tools/didimdol`;
    } else if (currentPage === "tools-cheongyak") {
      title = `신혼부부 특별공급 가점 계산기 | ${SITE_NAME}`;
      description = `「주택공급에 관한 규칙」 별표1 기준으로 신혼부부 특별공급 가점과 일반 청약가점제 점수를 동시에 계산해 드립니다. 자녀·혼인 기간·청약통장·신생아 가산까지 단계별 확인.`;
      canonical = `${SITE_URL}/tools/cheongyak`;
    } else if (currentPage.startsWith("category-")) {
      const cat = currentPage.replace("category-", "");
      const catDescriptions: Record<string, string> = {
        "신혼금융": "신혼·출산 가구의 주거 대출(디딤돌·보금자리·신생아특례), 청약 전략, 세제 혜택, 자산 형성까지. 가정의 재무 의사결정에 필요한 정책·금융 정보를 정리한 섹션입니다.",
        "신혼가전": "삼성·LG 신혼가전 패키지 비교, 평수별 적정 사이즈, 빌트인 가전 선택 기준, 한샘·이케아·리바트·일룸 가구 비교 등 신혼집 꾸리기 실용 가이드를 모았습니다.",
        "결혼준비": "스드메 견적, 웨딩홀 비교, 결혼 준비 타임라인, 예단·예물 협상법까지. 결혼을 앞둔 가구의 비용·시간 의사결정을 정부·업계 자료를 토대로 정리합니다.",
      };
      title = `${cat} | ${SITE_NAME}`;
      description = catDescriptions[cat] || `${cat} 관련 가정경제·생활정책 정보를 모았습니다.`;
      canonical = `${SITE_URL}/category/${encodeURIComponent(cat)}`;
    }

    document.title = title;
    setMeta("description", description);
    setCanonical(canonical);
    setMeta("og:type", ogType, "property");
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "ko_KR", "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage);
    }
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setArticleJsonLd(currentPost);
    setBreadcrumbJsonLd(currentPost);
  }, [currentPage, currentPost]);

  const handleNavigate = (page: string) => {
    const nextPage = page as Page;
    const nextUrl = urlFromPage(nextPage, allPosts);
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({}, "", nextUrl);
    }
    setCurrentPage(nextPage);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-white text-[#1E1B2E]">
      <Navbar onSearch={setSearchQuery} onNavigate={handleNavigate} searchQuery={searchQuery} />

      <main>
        <AnimatePresence mode="wait">
          {currentPage === "home" && !searchQuery && (
            <motion.section
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* HERO — warm gradient background, dense info */}
              <div className="gradient-warm relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-10 right-10 w-64 h-64 bg-[#4F46E5] rounded-full opacity-30 blur-3xl" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#6366F1] rounded-full opacity-20 blur-2xl" />

                <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-16 relative">
                  <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Left: Hero text */}
                    <div className="lg:col-span-7">
                      <div className="inline-flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 bg-white/15 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">가정경제·생활정책</span>
                        <span className="text-[12px] font-medium text-white/70">
                          · 정부·공공기관 자료 기반
                        </span>
                      </div>
                      <h1 className="text-[32px] sm:text-[42px] lg:text-[52px] font-bold tracking-[-0.03em] leading-[1.15] text-white mb-5 break-keep">
                        대출도 청약도,<br />
                        <span className="text-[#FFB4A2]">우리 집은 어떻게 될까</span><br />
                        고민될 때.
                      </h1>
                      <p className="text-[15px] sm:text-[16px] leading-[1.7] text-white/85 max-w-xl break-keep mb-6">
                        디딤돌 금리부터 신혼특공 가점, 출산·육아 지원금까지.
                        복잡한 정책을 우리 집 상황에 맞춰 알기 쉽게 풀어드려요.
                        평균이 아니라, 바로 우리 가구 기준으로요.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "💰 디딤돌대출", page: "category-신혼금융" },
                          { label: "🏠 신혼특공", page: "category-신혼금융" },
                          { label: "👶 신생아특례", page: "category-신혼금융" },
                          { label: "📱 혼수가전 비교", page: "category-신혼가전" },
                          { label: "💍 스드메 견적", page: "category-결혼준비" },
                          { label: "📅 결혼 타임라인", page: "category-결혼준비" },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            onClick={() => handleNavigate(chip.page)}
                            className="text-[13px] font-semibold text-white bg-white/12 hover:bg-white/22 border border-white/20 hover:border-white/40 px-3.5 py-2 rounded-full transition-all backdrop-blur-sm"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Trust card */}
                    <div className="lg:col-span-5">
                      <div className="bg-white/80 backdrop-blur-sm border border-[#E2E4F0] rounded-2xl p-6 lg:p-8 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                          <span className="text-[11px] font-bold text-[#22C55E] tracking-wide">홈코노미뉴스는 이렇게 일해요</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#1E1B2E] mb-5 break-keep">
                          숫자 하나도 공식 자료에서
                        </h3>
                        <ul className="space-y-4">
                          <li className="flex gap-3">
                            <span className="text-[#E8745F] text-[15px] font-bold shrink-0 mt-0.5">✓</span>
                            <div>
                              <p className="text-[14px] font-bold text-[#1E1B2E] leading-snug">공식 출처만 인용해요</p>
                              <p className="text-[12px] text-[#8A87A0] mt-0.5 leading-snug break-keep">주택도시기금·국세청·복지로 같은 정부 자료에 근거합니다.</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-[#E8745F] text-[15px] font-bold shrink-0 mt-0.5">✓</span>
                            <div>
                              <p className="text-[14px] font-bold text-[#1E1B2E] leading-snug">바뀌면 바로 고쳐요</p>
                              <p className="text-[12px] text-[#8A87A0] mt-0.5 leading-snug break-keep">금리·세제·지원금이 바뀌면 빠르게 업데이트합니다.</p>
                            </div>
                          </li>
                          <li className="flex gap-3">
                            <span className="text-[#E8745F] text-[15px] font-bold shrink-0 mt-0.5">✓</span>
                            <div>
                              <p className="text-[14px] font-bold text-[#1E1B2E] leading-snug">우리 집 기준으로 알려줘요</p>
                              <p className="text-[12px] text-[#8A87A0] mt-0.5 leading-snug break-keep">평균이 아니라 조건별로 달라지는 실제 선택지를 짚어드려요.</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* === 많이 찾는 주제 (빠른 진입 태그 바) === */}
              <div className="border-y border-[#E2E4F0] bg-[#FAFBFF]">
                <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#B0432F] shrink-0">
                      <TrendingUp className="w-4 h-4" />
                      많이 찾는 주제
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: "디딤돌 금리 계산", page: "tools-didimdol" },
                        { label: "신혼특공 가점", page: "tools-cheongyak" },
                        { label: "신생아 특례대출", page: "category-신혼금융" },
                        { label: "부모급여·아동수당", page: "category-신혼금융" },
                        { label: "공공임대 자격", page: "category-신혼금융" },
                        { label: "결혼세액공제", page: "policy" },
                      ].map((t, i) => (
                        <button
                          key={t.label}
                          onClick={() => handleNavigate(t.page)}
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#3F3D56] hover:text-[#E8745F] transition-colors"
                        >
                          <span className="text-[#B5B3C8] font-bold tabular-nums">{i + 1}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* === POLICY HUB 요약 (정책·금리 대시보드) === */}
              <PolicyHub compact={true} onNavigate={handleNavigate} />

              {/* === 공식 자료 바로가기 (실용 외부 링크) === */}
              <div className="max-w-[1400px] mx-auto px-5 lg:px-10 pt-10 lg:pt-14">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-[#E8745F] rounded-full" />
                  <h2 className="text-[16px] font-bold text-[#1E1B2E]">정부·공공기관 공식 자료 바로가기</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { icon: "🏦", title: "주택도시기금", desc: "디딤돌·버팀목 대출 신청", url: "https://nhuf.molit.go.kr" },
                    { icon: "🏠", title: "청약홈", desc: "청약 일정·가점 계산기", url: "https://www.applyhome.co.kr" },
                    { icon: "👶", title: "복지로", desc: "부모급여·아동수당 신청", url: "https://www.bokjiro.go.kr" },
                    { icon: "📋", title: "홈택스", desc: "결혼세액공제·연말정산", url: "https://www.hometax.go.kr" },
                  ].map((link) => (
                    <a
                      key={link.title}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 bg-white border border-[#E2E4F0] hover:border-[#FFD2BD] hover:bg-[#F5F6FD] rounded-xl p-4 transition-all"
                    >
                      <span className="text-[24px] shrink-0">{link.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold text-[#1E1B2E] group-hover:text-[#E8745F] transition-colors flex items-center gap-1">
                          {link.title}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                        </p>
                        <p className="text-[12px] text-[#8A87A0] leading-snug break-keep">{link.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-[11px] text-[#8A87A0] mt-3">
                  외부 공식 사이트로 연결됩니다. 신청 자격·금액은 각 기관 안내를 기준으로 확인하세요.
                </p>
              </div>

              {/* === 카테고리 빠른 진입 그리드 === */}
              <div className="max-w-[1400px] mx-auto px-5 lg:px-10 pt-10 lg:pt-14">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-[#4F46E5] rounded-full" />
                  <h2 className="text-[16px] font-bold text-[#1E1B2E]">카테고리</h2>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { icon: "💰", label: "신혼금융", page: "category-신혼금융", count: allPosts.filter(p => p.category === "신혼금융").length },
                    { icon: "🏠", label: "신혼가전", page: "category-신혼가전", count: allPosts.filter(p => p.category === "신혼가전").length },
                    { icon: "💍", label: "결혼준비", page: "category-결혼준비", count: allPosts.filter(p => p.category === "결혼준비").length },
                    { icon: "📊", label: "정책정보", page: "policy", count: null },
                    { icon: "🧮", label: "금리 계산기", page: "tools-didimdol", count: null },
                    { icon: "🎯", label: "가점 계산기", page: "tools-cheongyak", count: null },
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => handleNavigate(c.page)}
                      className="group flex flex-col items-center justify-center gap-2 bg-white border border-[#E2E4F0] hover:border-[#C7C9F0] hover:bg-[#F5F6FD] rounded-xl py-5 px-2 transition-all"
                    >
                      <span className="text-[28px] group-hover:scale-110 transition-transform">{c.icon}</span>
                      <span className="text-[13px] font-bold text-[#1E1B2E] group-hover:text-[#4F46E5] transition-colors text-center leading-tight break-keep">
                        {c.label}
                      </span>
                      {c.count !== null && (
                        <span className="text-[11px] text-[#8A87A0] font-medium">{c.count}개 글</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* === CATEGORY SECTIONS — info-dense === */}
              <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                {(() => {
                  const byCategory = (cat: string, n: number) =>
                    allPosts.filter(p => p.category === cat).slice(0, n);

                  const finPosts = byCategory("신혼금융", 7);
                  const appPosts = byCategory("신혼가전", 4);
                  const wedPosts = byCategory("결혼준비", 4);

                  return (
                    <>
                      {/* 신혼금융 — 1 large + 5 list */}
                      {finPosts.length >= 7 && (
                        <section className="py-12 lg:py-16">
                          <div className="flex items-end justify-between mb-8">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-6 bg-[#E8745F] rounded-full" />
                                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#E8745F]">
                                  Category 01
                                </p>
                              </div>
                              <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1E1B2E] tracking-[-0.025em]">
                                💰 신혼금융
                              </h2>
                              <p className="text-[13px] text-[#5B5870] mt-1">
                                주거 대출·청약·세금·자산관리, 가정 재무의 핵심 결정
                              </p>
                            </div>
                            <button
                              onClick={() => handleNavigate("category-신혼금융")}
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all"
                            >
                              전체 {allPosts.filter(p => p.category === "신혼금융").length}개 보기
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                            {/* Large feature */}
                            <button
                              onClick={() => handleNavigate(`post-${finPosts[0].id}`)}
                              className="group text-left lg:col-span-6 card-warm p-0 overflow-hidden flex flex-col"
                            >
                              <div className="aspect-[5/3] overflow-hidden bg-[#F5F6FD] relative">
                                <img
                                  src={finPosts[0].image}
                                  alt={finPosts[0].title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    if (!img.dataset.fallback) {
                                      img.dataset.fallback = "1";
                                      img.src = "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800";
                                    }
                                  }}
                                />
                                <div className="absolute top-3 left-3">
                                  <span className="badge-new">최신</span>
                                </div>
                              </div>
                              <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[11px] font-bold text-[#E8745F]">신혼금융</span>
                                  <span className="w-1 h-1 bg-[#B5B3C8] rounded-full" />
                                  <span className="text-[11px] text-[#8A87A0]">
                                    {finPosts[0].date.replace(/-/g, ". ")} · {calculateReadTime(finPosts[0].content)} 읽기
                                  </span>
                                </div>
                                <h3 className="text-[19px] sm:text-[21px] font-bold leading-[1.35] text-[#1E1B2E] mb-2.5 break-keep group-hover:text-[#E8745F] transition-colors">
                                  {finPosts[0].title}
                                </h3>
                                <p className="text-[14px] leading-[1.6] text-[#3F3D56] line-clamp-2 break-keep">
                                  {finPosts[0].excerpt}
                                </p>
                              </div>
                            </button>

                            {/* 6 compact list items — fills full card height */}
                            <div className="lg:col-span-6 card-warm p-2 lg:p-3 flex flex-col">
                              <ul className="flex flex-col justify-between h-full divide-y divide-[#EDEEF7]">
                                {finPosts.slice(1, 7).map((post, idx) => (
                                  <li key={post.id} className="flex-1 flex items-center">
                                    <button
                                      onClick={() => handleNavigate(`post-${post.id}`)}
                                      className="group flex items-center gap-3 w-full text-left p-3 hover:bg-[#F5F6FD] rounded-lg transition-colors"
                                    >
                                      <span className="flex items-center justify-center w-7 h-7 bg-[#EEF0FB] text-[#B0432F] text-[11px] font-bold rounded-full shrink-0 tabular-nums">
                                        {idx + 2}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="text-[14px] font-bold leading-[1.4] text-[#1E1B2E] break-keep line-clamp-2 group-hover:text-[#E8745F] transition-colors mb-1">
                                          {post.title}
                                        </h4>
                                        <p className="text-[11px] text-[#8A87A0] font-medium">
                                          {post.date.replace(/-/g, ". ")} · {calculateReadTime(post.content)}
                                        </p>
                                      </div>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </section>
                      )}

                      {/* 신혼가전 */}
                      {appPosts.length >= 4 && (
                        <section className="py-12 lg:py-16 border-t border-[#E2E4F0]">
                          <div className="flex items-end justify-between mb-8">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-6 bg-[#E8745F] rounded-full" />
                                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#E8745F]">
                                  Category 02
                                </p>
                              </div>
                              <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1E1B2E] tracking-[-0.025em]">
                                🏠 신혼가전
                              </h2>
                              <p className="text-[13px] text-[#5B5870] mt-1">
                                혼수가전 비교, 인테리어 예산, 실용 구매 가이드
                              </p>
                            </div>
                            <button
                              onClick={() => handleNavigate("category-신혼가전")}
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all"
                            >
                              전체 {allPosts.filter(p => p.category === "신혼가전").length}개 보기
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                            {appPosts.map(post => (
                              <PostCard
                                key={post.id}
                                post={post}
                                views={views[post.id]}
                                onClick={(id) => handleNavigate(`post-${id}`)}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {/* 결혼준비 */}
                      {wedPosts.length >= 4 && (
                        <section className="py-12 lg:py-16 border-t border-[#E2E4F0]">
                          <div className="flex items-end justify-between mb-8">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-1 h-6 bg-[#E8745F] rounded-full" />
                                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#E8745F]">
                                  Category 03
                                </p>
                              </div>
                              <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1E1B2E] tracking-[-0.025em]">
                                💍 결혼준비
                              </h2>
                              <p className="text-[13px] text-[#5B5870] mt-1">
                                스드메·예식장·청첩장, 결혼 준비 의사결정
                              </p>
                            </div>
                            <button
                              onClick={() => handleNavigate("category-결혼준비")}
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all"
                            >
                              전체 {allPosts.filter(p => p.category === "결혼준비").length}개 보기
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                            {wedPosts.map(post => (
                              <PostCard
                                key={post.id}
                                post={post}
                                views={views[post.id]}
                                onClick={(id) => handleNavigate(`post-${id}`)}
                              />
                            ))}
                          </div>
                        </section>
                      )}

                      {/* 주목할 글 — 계산기 연동·심층 글 큐레이션 */}
                      {(() => {
                        // 계산기 연동 글(fin-39, fin-38)과 심층 정책 글을 우선 노출
                        const featuredIds = ["fin-39", "fin-38", "fin-41", "fin-43"];
                        const featured = featuredIds
                          .map(id => allPosts.find(p => p.id === id))
                          .filter((p): p is typeof allPosts[number] => Boolean(p));
                        if (featured.length < 3) return null;
                        return (
                          <section className="py-12 lg:py-16 border-t border-[#E2E4F0]">
                            <div className="flex items-end justify-between mb-8">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 h-6 bg-[#E8745F] rounded-full" />
                                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#E8745F]">
                                    Editor's Pick
                                  </p>
                                </div>
                                <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1E1B2E] tracking-[-0.025em]">
                                  ⭐ 주목할 글
                                </h2>
                                <p className="text-[13px] text-[#5B5870] mt-1">
                                  계산기로 직접 확인할 수 있는 글, 실제 사례 기반 심층 분석
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                              {featured.map(post => (
                                <PostCard
                                  key={post.id}
                                  post={post}
                                  views={views[post.id]}
                                  onClick={(id) => handleNavigate(`post-${id}`)}
                                />
                              ))}
                            </div>
                          </section>
                        );
                      })()}

                      {/* All posts CTA strip */}
                      <section className="py-12 lg:py-16">
                        <div className="gradient-coral rounded-3xl p-8 lg:p-14 text-center text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
                          <div className="relative">
                            <p className="text-[11px] font-bold tracking-[0.25em] uppercase opacity-80 mb-3">
                              Browse All
                            </p>
                            <h2 className="text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] mb-4 break-keep">
                              필요한 정보를<br />카테고리별로 빠르게 찾아보세요.
                            </h2>
                            <p className="text-[14px] sm:text-[15px] opacity-90 mb-7 break-keep max-w-lg mx-auto">
                              신혼금융·신혼가전·결혼준비, 본인 가구 상황에 맞는 글을
                              카테고리별로 정리해 두었습니다.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2.5">
                              {CATEGORIES.map(cat => {
                                const count = allPosts.filter(p => p.category === cat).length;
                                return (
                                  <button
                                    key={cat}
                                    onClick={() => handleNavigate(`category-${cat}`)}
                                    className="inline-flex items-center gap-2 px-5 h-11 bg-white text-[#E8745F] text-[14px] font-bold rounded-full hover:bg-[#F5F6FD] transition-colors shadow-sm"
                                  >
                                    {cat}
                                    <span className="px-2 py-0.5 bg-[#EEF0FB] text-[#B0432F] text-[11px] rounded-full">
                                      {count}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </section>
                    </>
                  );
                })()}
              </div>
            </motion.section>
          )}

          {/* POLICY HUB — 정책정보 전체 페이지 */}
          {currentPage === "policy" && (
            <motion.div
              key="policy-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <PolicyHub compact={false} onNavigate={handleNavigate} />
            </motion.div>
          )}

          {/* DIDIMDOL CALCULATOR */}
          {currentPage === "tools-didimdol" && (
            <motion.div
              key="tools-didimdol-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <DidimdolCalculator />
            </motion.div>
          )}

          {/* CHEONGYAK CALCULATOR */}
          {currentPage === "tools-cheongyak" && (
            <motion.div
              key="tools-cheongyak-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheongyakCalculator />
            </motion.div>
          )}

          {/* ABOUT */}
          {currentPage === "about" && (
            <motion.div
              key="about-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-5 lg:px-6 py-12 lg:py-20 article-body"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                홈코노미뉴스 소개
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                홈코노미뉴스는 신혼·출산·주거·세금 등 가정의 의사결정에 직접 영향을 주는 정부 정책과 가정 재무 이슈를 다루는 가정경제·생활정책 전문 미디어입니다. 평균값에 묻혀 사라지는 본인 가구의 답을 정부·공공기관 자료에 근거해 안내합니다.
              </p>

              <h2>우리의 목표</h2>
              <p>가정에는 매일 결정해야 할 일이 있습니다. 디딤돌과 보금자리 중 어느 쪽이 유리한지, 신혼특공 자격이 되는지, 출산 후 받을 수 있는 정부 지원은 얼마인지, 연말정산에서 부양가족을 누가 올려야 하는지. 정책은 자주 바뀌고 평균값을 나열하는 기사는 많지만, 본인 가구에 적용할 기준까지 짚는 곳은 드뭅니다. 홈코노미뉴스는 그 격차를 메우는 가정경제·생활정책 전문 미디어입니다.</p>

              <h2>주요 카테고리</h2>
              <ul>
                <li><strong>신혼금융:</strong> 디딤돌·버팀목·신생아특례대출 비교, 신혼특공 청약 전략, 혼인 증여재산 공제 1억 5천만원 활용법, 신혼희망타운, IRP·연금저축 세제혜택까지</li>
                <li><strong>신혼가전:</strong> 삼성·LG 신혼가전 패키지 비교, 평수별 가전 사이즈, 빌트인 vs 일반 가전 선택 기준, 한샘·이케아·리바트·일룸 가구 매트릭스</li>
                <li><strong>결혼준비:</strong> 스드메 견적의 실제, 웨딩홀 종류별 1인당 식대, 결혼 준비 타임라인, 예단·예물 협상 기준</li>
              </ul>

              <h2>콘텐츠 제작 원칙</h2>
              <ul>
                <li><strong>1차 자료 우선:</strong> 국토교통부, 한국주택금융공사, 주택도시기금, 청약홈, 국세청, 통계청 등 공공기관의 공식 발표를 기준으로 합니다.</li>
                <li><strong>본인 상황에 적용 가능한 방법론:</strong> 평균값 나열이 아닌, 본인 가구에 적용해 결정할 수 있는 판단 기준을 제공합니다.</li>
                <li><strong>출처 명시:</strong> 본문에 인용된 공공 자료는 원문 링크를 함께 제공해 독자가 직접 확인할 수 있도록 합니다.</li>
                <li><strong>면책 고지:</strong> 세무·법률·금융 등 전문 분야 정보는 일반 안내 목적임을 명시하고, 중요 결정에는 전문가 상담을 권장합니다.</li>
              </ul>

              <h2>편집 검증 프로세스</h2>
              <p>모든 게시물은 세 단계 검토를 거쳐 발행됩니다. 1차 자료 수집과 본문 구성, 수치와 법령 조문의 팩트 체크, 표현의 정확성과 면책 고지의 적절성 검토. 정책이 변경되면 본문을 수정하고 글 하단 갱신 일자를 갱신합니다. 부정확한 부분을 발견하시면 <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>으로 알려 주시면 영업일 3일 이내 검토 후 반영합니다.</p>

              <h2>다루지 않는 영역</h2>
              <p>홈코노미뉴스는 가정의 재무·정책 정보에 집중합니다. 부동산 투자 종목 추천, 특정 단지의 향후 가격 예측, 개별 사례에 대한 법률·세무 자문, 금융 상품의 가입 권유는 다루지 않습니다. 중요한 결정 시에는 반드시 해당 분야 전문가와 공공기관 공식 자료를 함께 확인해 주시기 바랍니다.</p>

              <h2>운영 정보</h2>
              <ul>
                <li><strong>운영 주체:</strong> 상상아트</li>
                <li><strong>사업자등록번호:</strong> 272-14-01256</li>
                <li><strong>통신판매업 신고번호:</strong> 제2023-화성동탄-1098호</li>
                <li><strong>업태/종목:</strong> 정보통신업(미디어콘텐츠창작업, 응용 소프트웨어 개발 및 공급업), 광고 대행업, 전자상거래 소매 중개업</li>
                <li><strong>문의 이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>사이트:</strong> <a href="https://virginroad.kr" target="_blank" rel="noopener noreferrer">https://virginroad.kr</a></li>
              </ul>
            </motion.div>
          )}

          {currentPage === "privacy" && (
            <motion.div
              key="privacy-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-5 lg:px-6 py-12 lg:py-20 article-body"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                개인정보 처리방침
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                상상아트(이하 '회사')는 「개인정보 보호법」 등 관련 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내합니다.
              </p>

              <p className="text-sm text-[#8A87A0]">본 개인정보처리방침은 다음과 같은 내용을 담고 있습니다.</p>
              <ol className="text-sm text-[#8A87A0]">
                <li>개인정보의 처리 목적</li>
                <li>처리하는 개인정보의 항목 및 수집 방법</li>
                <li>개인정보의 처리 및 보유 기간</li>
                <li>개인정보 처리의 위탁에 관한 사항</li>
                <li>개인정보의 제3자 제공에 관한 사항</li>
                <li>정보주체와 법정대리인의 권리·의무 및 그 행사 방법</li>
                <li>개인정보 자동 수집 장치(쿠키)의 설치·운영 및 거부</li>
                <li>광고 게재 및 제3자 광고 서비스</li>
                <li>개인정보의 안전성 확보 조치</li>
                <li>개인정보 보호책임자 및 담당자</li>
                <li>개인정보 열람 청구</li>
                <li>권익 침해 구제 방법</li>
                <li>고지의 의무</li>
              </ol>

              <h2>1. 개인정보의 처리 목적</h2>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.</p>
              <ul>
                <li><strong>웹사이트 운영 및 통계 분석:</strong> 방문자 통계 집계, 콘텐츠 인기도 분석, 서비스 개선</li>
                <li><strong>문의 응대:</strong> 이메일로 접수된 문의·정정 요청·제보에 대한 회신</li>
                <li><strong>광고 게재 및 효과 측정:</strong> Google AdSense를 통한 맞춤형 광고 게재 및 광고 성과 측정</li>
                <li><strong>법령상 의무 이행:</strong> 관계 법령에 따른 기록 보존 및 분쟁 대응</li>
              </ul>

              <h2>2. 처리하는 개인정보의 항목 및 수집 방법</h2>
              <p>회사는 회원가입 절차 없이 콘텐츠를 제공하므로 식별 가능한 개인정보를 직접 수집하지 않습니다. 다만 다음의 정보가 자동으로 수집되거나, 사용자가 직접 제공하는 경우에 한해 수집됩니다.</p>

              <table>
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>수집 항목</th>
                    <th>수집 시점</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>자동 수집</strong></td>
                    <td>IP 주소, 브라우저 종류 및 버전, OS 정보, 방문 일시, 방문 페이지, 접속 경로(referrer), 쿠키</td>
                    <td>웹사이트 접속 시</td>
                  </tr>
                  <tr>
                    <td><strong>이용자 제공</strong></td>
                    <td>이메일 주소(문의자가 직접 기재한 경우), 문의 내용</td>
                    <td>이메일 문의 시</td>
                  </tr>
                  <tr>
                    <td><strong>제3자 도구</strong></td>
                    <td>Google Analytics 통계 데이터, Google AdSense 광고 식별자</td>
                    <td>웹사이트 접속 시</td>
                  </tr>
                </tbody>
              </table>

              <p>수집 방법: 웹사이트 접속 시 자동 수집, 사용자가 이메일로 직접 발송, Google이 제공하는 분석·광고 도구를 통한 수집</p>

              <h2>3. 개인정보의 처리 및 보유 기간</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
              <ul>
                <li><strong>접속 로그 및 IP 정보:</strong> 「통신비밀보호법」에 따라 3개월간 보관</li>
                <li><strong>이메일 문의 내용:</strong> 회신 완료 후 1년 보관 후 파기 (분쟁 대응 목적)</li>
                <li><strong>쿠키 정보:</strong> 브라우저 설정에 따라 사용자가 임의로 삭제 가능, 미삭제 시 최대 2년</li>
                <li><strong>광고 식별자:</strong> Google AdSense의 정책에 따라 보관 (Google 개인정보처리방침 참조)</li>
              </ul>
              <p>법령에서 정한 별도의 보존 의무가 있는 경우, 회사는 해당 기간 동안 정보를 안전하게 보관한 후 지체 없이 파기합니다.</p>

              <h2>4. 개인정보 처리의 위탁에 관한 사항</h2>
              <p>회사는 원활한 서비스 운영을 위하여 다음과 같이 일부 업무를 외부 전문업체에 위탁하고 있습니다. 위탁 계약 시 「개인정보 보호법」 제26조에 따라 개인정보의 안전한 처리에 관한 사항을 명시하고 있습니다.</p>
              <table>
                <thead>
                  <tr>
                    <th>수탁자</th>
                    <th>위탁 업무 내용</th>
                    <th>개인정보 보유·이용 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Vercel Inc.</strong></td>
                    <td>웹사이트 호스팅 및 콘텐츠 전송망(CDN) 운영</td>
                    <td>위탁계약 종료 시까지</td>
                  </tr>
                  <tr>
                    <td><strong>Google LLC</strong></td>
                    <td>웹 분석(Google Analytics), 광고 게재(Google AdSense)</td>
                    <td>Google 정책에 따름</td>
                  </tr>
                  <tr>
                    <td><strong>Google Firebase</strong></td>
                    <td>데이터베이스 및 인증 서비스</td>
                    <td>위탁계약 종료 시까지</td>
                  </tr>
                </tbody>
              </table>

              <h2>5. 개인정보의 제3자 제공에 관한 사항</h2>
              <p>회사는 정보주체의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만 다음의 경우에 한해 예외적으로 제공할 수 있습니다.</p>
              <ul>
                <li>정보주체로부터 별도의 동의를 받은 경우</li>
                <li>다른 법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우</li>
                <li>법원의 재판 업무 수행을 위하여 제공하는 경우</li>
                <li>범죄의 수사와 공소의 제기 및 유지를 위하여 필요한 경우</li>
                <li>명백히 정보주체 또는 제3자의 급박한 생명, 신체, 재산의 이익을 위하여 필요하다고 인정되는 경우</li>
              </ul>
              <p>본 사이트는 Google AdSense를 통해 광고를 게재하며, Google은 광고 게재를 위해 사용자의 쿠키 정보 등을 활용할 수 있습니다.</p>

              <h2>6. 정보주체와 법정대리인의 권리·의무 및 그 행사 방법</h2>
              <p>정보주체는 회사에 대해 언제든지 개인정보 열람 요구, 정정·삭제 요구, 처리 정지 요구, 동의 철회 요구의 권리를 행사할 수 있습니다. 위 권리 행사는 회사에 대해 이메일(<a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>)을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다. 만 14세 미만 아동의 개인정보는 수집하지 않습니다.</p>

              <h2>7. 개인정보 자동 수집 장치(쿠키)의 설치·운영 및 거부</h2>
              <p>회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 '쿠키(cookie)'를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.</p>
              <ul>
                <li>Chrome: 설정에서 개인정보 보호 및 보안, 쿠키 및 기타 사이트 데이터</li>
                <li>Safari: 환경설정에서 개인정보 보호, 쿠키 및 웹 사이트 데이터</li>
                <li>Edge: 설정에서 쿠키 및 사이트 권한, 쿠키 및 사이트 데이터</li>
              </ul>
              <p>쿠키 저장을 거부할 경우 일부 맞춤 서비스 이용에 어려움이 있을 수 있습니다.</p>

              <h2>8. 광고 게재 및 제3자 광고 서비스</h2>
              <p>본 사이트는 Google LLC의 광고 서비스인 Google AdSense를 통해 광고를 게재합니다. Google AdSense는 사용자의 이전 사이트 방문 정보를 토대로 사용자의 관심에 맞는 광고를 게재하기 위해 쿠키 및 광고 식별자를 사용합니다.</p>
              <p>사용자는 다음 경로를 통해 맞춤 광고를 거부하실 수 있습니다.</p>
              <ul>
                <li><a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google 광고 설정 페이지</a>에서 맞춤 광고 비활성화</li>
                <li><a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google 광고 정책</a> 확인</li>
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a> 확인</li>
              </ul>

              <h2>9. 개인정보의 안전성 확보 조치</h2>
              <ul>
                <li><strong>관리적 조치:</strong> 개인정보 취급 직원의 최소화, 정기적인 자체 점검, 내부 관리 계획 수립·시행</li>
                <li><strong>기술적 조치:</strong> SSL/TLS 암호화 통신(HTTPS) 적용, 접근 권한 관리, 보안 프로그램 설치 및 주기적 갱신</li>
                <li><strong>물리적 조치:</strong> 신뢰할 수 있는 클라우드 서비스(Vercel, Google Cloud)를 통한 데이터 보관, 접근 통제 시스템 운영</li>
              </ul>

              <h2>10. 개인정보 보호책임자 및 담당자</h2>
              <ul>
                <li><strong>개인정보 보호책임자:</strong> 상상아트 개인정보 보호 담당자</li>
                <li><strong>연락처:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>접수 시간:</strong> 평일 오전 9시부터 오후 6시까지 (주말·공휴일 제외)</li>
              </ul>

              <h2>11. 개인정보 열람 청구</h2>
              <p>정보주체는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다.</p>
              <ul>
                <li><strong>부서명:</strong> 상상아트 고객 응대팀</li>
                <li><strong>이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
              </ul>

              <h2>12. 권익 침해 구제 방법</h2>
              <ul>
                <li><strong>개인정보분쟁조정위원회:</strong> (국번 없이) 1833-6972 / <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer">www.kopico.go.kr</a></li>
                <li><strong>개인정보침해 신고센터:</strong> (국번 없이) 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer">privacy.kisa.or.kr</a></li>
                <li><strong>대검찰청 사이버수사과:</strong> (국번 없이) 1301 / <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a></li>
                <li><strong>경찰청 사이버수사국:</strong> (국번 없이) 182 / <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer">ecrm.cyber.go.kr</a></li>
              </ul>

              <h2>13. 고지의 의무</h2>
              <p>본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제, 정정이 있는 경우 변경 사항의 시행 7일 전부터 공지사항 또는 본 페이지를 통하여 고지할 것입니다. 이용자 권리에 중대한 변경이 발생할 때에는 최소 30일 전에 공지합니다.</p>

              <hr />
              <p className="text-sm">운영 주체: 상상아트</p>
              <p className="text-sm">사업자등록번호: 272-14-01256</p>
              <p className="text-sm">통신판매업 신고번호: 제2023-화성동탄-1098호</p>
              <p className="text-sm">이메일: <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></p>
              <p className="text-sm">공고일자: 2026년 3월 15일 · 시행일자: 2026년 3월 15일</p>
            </motion.div>
          )}

          {currentPage === "terms" && (
            <motion.div
              key="terms-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-5 lg:px-6 py-12 lg:py-20 article-body"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                이용약관
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                본 약관은 홈코노미뉴스(이하 "사이트")가 제공하는 콘텐츠 및 부가 서비스(이하 "서비스")의 이용과 관련하여 사이트와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>

              <h2>제1조 (목적)</h2>
              <p>이 약관은 이용자가 사이트에서 제공하는 서비스를 이용함에 있어 필요한 사항을 규정합니다.</p>

              <h2>제2조 (용어의 정의)</h2>
              <ul>
                <li><strong>"사이트"</strong>란 상상아트가 운영하는 홈코노미뉴스(https://virginroad.kr)를 의미합니다.</li>
                <li><strong>"운영자"</strong>란 본 사이트를 운영하는 상상아트를 의미합니다.</li>
                <li><strong>"이용자"</strong>란 사이트에 접속하여 서비스를 이용하는 모든 자를 말합니다.</li>
                <li><strong>"콘텐츠"</strong>란 사이트가 게재하는 모든 텍스트, 이미지, 데이터, 영상 등을 의미합니다.</li>
              </ul>

              <h2>제3조 (약관의 효력 및 변경)</h2>
              <p>이 약관은 사이트에 게시함으로써 효력이 발생하며, 사이트는 합리적인 사유가 발생할 경우 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다. 변경된 약관은 사이트에 공지함으로써 효력이 발생합니다.</p>

              <h2>제4조 (서비스의 제공 및 변경)</h2>
              <p>사이트는 신혼·출산·주거·세금 등 가정경제·생활정책과 관련된 정보 콘텐츠를 제공합니다. 사이트는 운영상·기술상 필요한 경우 제공하는 서비스의 내용을 변경할 수 있습니다.</p>

              <h2>제5조 (이용자의 의무)</h2>
              <ul>
                <li>사이트가 게시한 콘텐츠를 사전 동의 없이 상업적 목적으로 복제·재배포하는 행위 금지</li>
                <li>사이트의 운영을 방해하거나 시스템에 무단으로 접근하는 행위 금지</li>
                <li>타인의 명예를 훼손하거나 권리를 침해하는 행위 금지</li>
                <li>관련 법령 및 본 약관에 위배되는 그 밖의 행위 금지</li>
              </ul>

              <h2>제6조 (콘텐츠의 저작권)</h2>
              <p>사이트가 작성한 모든 콘텐츠의 저작권은 운영자인 상상아트에 귀속됩니다. 이용자는 운영자의 사전 서면 동의 없이 콘텐츠를 영리 목적으로 이용하거나 제3자에게 이용하게 할 수 없습니다. 단, 출처를 명시한 비영리적·개인적 인용은 허용됩니다.</p>

              <h2>제7조 (책임의 제한)</h2>
              <p>사이트가 제공하는 정보는 일반적인 안내를 목적으로 하며, 특정 개인의 의사 결정에 대한 법률·세무·금융 자문이 아닙니다. 이용자가 사이트의 정보를 활용하여 내린 결정으로 인해 발생한 손실에 대해 사이트는 법적 책임을 지지 않으며, 중요한 의사 결정 시에는 반드시 해당 분야의 전문가 및 공공기관의 공식 자료를 함께 확인하실 것을 권장합니다.</p>

              <h2>제8조 (광고)</h2>
              <p>사이트는 서비스 운영을 위해 Google AdSense 등 제3자 광고를 게재할 수 있습니다. 광고의 내용 및 그로 인한 거래에 대한 책임은 해당 광고주에게 있으며, 사이트는 이에 대해 책임지지 않습니다.</p>

              <h2>제9조 (준거법 및 관할)</h2>
              <p>이 약관과 관련된 분쟁은 대한민국 법령에 따르며, 분쟁이 발생할 경우 민사소송법상의 관할 법원을 따릅니다.</p>

              <h2>제10조 (운영자 정보)</h2>
              <ul>
                <li><strong>운영 주체:</strong> 상상아트</li>
                <li><strong>사업자등록번호:</strong> 272-14-01256</li>
                <li><strong>통신판매업 신고번호:</strong> 제2023-화성동탄-1098호</li>
                <li><strong>업태/종목:</strong> 정보통신업(미디어콘텐츠창작업, 응용 소프트웨어 개발 및 공급업), 광고 대행업</li>
                <li><strong>이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>사이트:</strong> https://virginroad.kr</li>
              </ul>

              <p className="text-sm">공고일자: 2026년 3월 15일 · 시행일자: 2026년 3월 15일</p>
            </motion.div>
          )}

          {currentPage === "announcement" && (
            <motion.div
              key="announcement-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-5 lg:px-6 py-12 lg:py-20 article-body"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                공지사항
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                홈코노미뉴스 운영에 관한 안내 사항을 공지합니다.
              </p>

              <h2>2026년 5월 13일</h2>
              <h3>신혼가전 카테고리 갱신 — 2026년 상반기 신혼 박람회 시즌 반영</h3>
              <p>2026년 봄 신혼 박람회 시즌(3~4월)에 맞춰 삼성·LG 가전 패키지 가격 정보를 업데이트하고, 가구 브랜드 비교 콘텐츠도 최신 라인업으로 갱신했습니다. 새 시즌의 할인 패턴을 반영한 캘린더 가이드도 함께 정비했습니다.</p>

              <h2>2026년 5월 11일</h2>
              <h3>신혼금융 콘텐츠 정책 변경 사항 반영</h3>
              <p>주택도시기금의 디딤돌·버팀목 대출 우대금리 조건 변경 사항과 신생아특례대출 자격 확대를 반영하여 관련 게시물을 모두 업데이트했습니다. 본문 하단의 갱신 일자를 확인해 주시기 바랍니다.</p>

              <h2>2026년 3월 15일</h2>
              <h3>홈코노미뉴스 정식 오픈</h3>
              <p>가정경제·생활정책 전문 미디어 '홈코노미뉴스'(virginroad.kr)를 정식 오픈하였습니다. 신혼·출산·주거·세금 등 가정의 의사결정에 직접 영향을 주는 정부 정책과 가정 재무 이슈를 정부·공공기관 자료에 근거해 다룹니다. 평균값이 아닌 본인 가구 기준의 답을 찾을 수 있도록 콘텐츠를 차근차근 쌓아갈 계획입니다.</p>

              <hr />
              <h2>운영 안내</h2>
              <p>본 공지사항은 사이트 운영 정책, 콘텐츠 정책, 법령 준수와 관련된 주요 변경 사항을 안내합니다. 중요 사항이 발생할 때마다 본 페이지를 통해 우선 안내드리며, 개인정보 처리에 관한 변경은 별도로 <button onClick={() => handleNavigate("privacy")} className="text-[#1E1B2E] underline underline-offset-2">개인정보처리방침</button>을 통해 고지합니다.</p>
              <p>사이트 운영 관련 의견이나 제보는 언제든 <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>으로 보내주세요.</p>
            </motion.div>
          )}

          {currentPage === "partnership" && (
            <motion.div
              key="partnership-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-5 lg:px-6 py-12 lg:py-20 article-body"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                제휴 및 비즈니스 문의
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                홈코노미뉴스는 신혼·출산·주거·세금 등 가정경제·생활정책 정보를 다루는 전문 미디어입니다. 독자 여러분과 업계 파트너 여러분의 다양한 제안을 환영합니다.
              </p>

              <h2>제휴 가능 영역</h2>
              <ul>
                <li><strong>콘텐츠 협업:</strong> 금융·웨딩·인테리어 관련 전문가의 인사이트 기고, 인터뷰 협업</li>
                <li><strong>광고·홍보:</strong> 가정 대상 금융·보험·부동산 상품, 가전·가구, 결혼·육아 서비스의 홍보 협업</li>
                <li><strong>데이터·서비스 협업:</strong> 신혼·출산·주거·세제 등 가정경제 통계, 정책 자료, 금융 상품 데이터 등의 제공·교환</li>
                <li><strong>이벤트·세미나:</strong> 가정·신혼·예비부부 대상 오프라인·온라인 행사 공동 운영</li>
              </ul>

              <h2>제휴 검토 기준</h2>
              <p>홈코노미뉴스는 독자에게 정확하고 유용한 정보를 제공한다는 원칙을 최우선으로 합니다. 따라서 다음 기준에 부합하는 제휴만 검토합니다.</p>
              <ul>
                <li>법령을 준수하는 적법한 서비스·상품일 것</li>
                <li>독자의 권익을 침해하지 않을 것</li>
                <li>부풀려진 약속이나 허위·과장 표현이 없을 것</li>
                <li>편집 독립성을 침해하지 않을 것</li>
              </ul>

              <h2>문의 방법</h2>
              <p>제휴를 희망하시는 분은 아래 이메일로 다음 사항을 포함하여 보내주시기 바랍니다.</p>
              <ul>
                <li>회사명·기관명 및 담당자 정보</li>
                <li>제휴 분야와 구체적인 제안 내용</li>
                <li>희망 일정 및 예산 범위(해당 시)</li>
              </ul>
              <p>이메일: <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></p>
              <p>영업일 기준 3일 이내에 회신드리며, 제안 내용에 따라 비대면 미팅 또는 추가 자료를 요청드릴 수 있습니다.</p>

              <h2>운영 정보</h2>
              <ul>
                <li>운영 주체: 상상아트</li>
                <li>사업자등록번호: 272-14-01256</li>
                <li>통신판매업 신고번호: 제2023-화성동탄-1098호</li>
                <li>이메일: <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
              </ul>
            </motion.div>
          )}

          {currentPost ? (
            <motion.article
              key="post-detail"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-16"
            >
              <div className="lg:max-w-[860px]">
              {/* Breadcrumb */}
              <nav aria-label="breadcrumb" className="mb-6 text-[12px] text-[#8A87A0]">
                <ol className="flex flex-wrap items-center gap-1.5">
                  <li>
                    <button onClick={() => handleNavigate("home")} className="hover:text-[#1E1B2E] transition-colors">홈</button>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <button onClick={() => handleNavigate(`category-${currentPost.category}`)} className="hover:text-[#1E1B2E] transition-colors">
                      {currentPost.category}
                    </button>
                  </li>
                </ol>
              </nav>

              {/* Category */}
              <p className="text-[13px] font-semibold text-[#1E1B2E] mb-4">
                {currentPost.category}
              </p>

              {/* Title */}
              <h1 className="text-[28px] sm:text-[34px] lg:text-[40px] font-bold leading-[1.2] tracking-[-0.025em] text-[#1E1B2E] mb-5 break-keep">
                {currentPost.title}
              </h1>

              {/* Excerpt */}
              <p className="text-[17px] leading-[1.7] text-[#3F3D56] mb-8 break-keep">
                {currentPost.excerpt}
              </p>

              {/* Meta + actions */}
              <div className="flex items-center justify-between py-5 border-y border-[#D5D8E8] mb-10">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="font-semibold text-[#1E1B2E]">{currentPost.author}</span>
                  <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                  <span className="text-[#8A87A0]">{currentPost.date.replace(/-/g, ". ")}</span>
                  <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                  <span className="text-[#8A87A0]">{calculateReadTime(currentPost.content)} 읽기</span>
                  <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                  <span className="text-[#8A87A0] inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> {formatViews(views[currentPost.id] || 0)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    className="w-9 h-9 rounded-md text-[#3F3D56] hover:text-[#1E1B2E] hover:bg-[#F1F3F9] flex items-center justify-center transition-colors"
                    title="공유"
                    aria-label="이 글 공유하기"
                    onClick={async () => {
                      const shareData = {
                        title: currentPost.title,
                        text: currentPost.excerpt || currentPost.title,
                        url: window.location.href,
                      };
                      try {
                        if (typeof navigator !== "undefined" && (navigator as any).share) {
                          await (navigator as any).share(shareData);
                          return;
                        }
                      } catch {
                        // ignore
                      }
                      try {
                        await navigator.clipboard.writeText(window.location.href);
                        alert("주소를 클립보드에 복사했습니다.");
                      } catch {
                        window.prompt("이 글 주소를 복사하세요:", window.location.href);
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button
                    className="w-9 h-9 rounded-md text-[#3F3D56] hover:text-[#1E1B2E] hover:bg-[#F1F3F9] flex items-center justify-center transition-colors hidden sm:flex"
                    title="인쇄"
                    aria-label="이 글 인쇄하기"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
              </div>

              {/* Body + Sidebar grid */}
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-8 min-w-0">
              {/* Hero image */}
              <div className="aspect-[16/10] overflow-hidden mb-10 bg-[#F1F3F9] rounded-lg">
                <img
                  src={currentPost.image}
                  alt={currentPost.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1200";
                  }}
                />
              </div>

              {/* Article body */}
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: currentPost.content }}
              />

              {/* Hashtags */}
              {currentPost.hashtags && currentPost.hashtags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[#D5D8E8]">
                  <div className="flex flex-wrap gap-2">
                    {currentPost.hashtags.map(tag => (
                      <span
                        key={tag}
                        className="text-[12px] text-[#3F3D56] bg-[#F1F3F9] px-3 py-1.5 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
                </div>

                {/* Sidebar */}
                <aside className="lg:col-span-4 space-y-6">
                  <div className="lg:sticky lg:top-24 space-y-6">
                    {/* 인기 글 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#3730A3] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> 인기 글
                        </h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {["fin-39", "fin-38", "fin-41", "fin-43", "fin-44"]
                          .map(id => allPosts.find(p => p.id === id))
                          .filter((p): p is typeof allPosts[number] => Boolean(p) && p!.id !== currentPost.id)
                          .slice(0, 5)
                          .map((post, i) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex gap-2.5 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors"
                              >
                                <span className="flex items-center justify-center w-5 h-5 bg-[#EEF0FB] text-[#3730A3] text-[11px] font-bold rounded shrink-0 mt-0.5 tabular-nums">
                                  {i + 1}
                                </span>
                                <span className="text-[13px] font-medium text-[#1E1B2E] leading-[1.45] break-keep line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
                                  {post.title}
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* 같은 카테고리 최신 글 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#4F46E5] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white">📰 {currentPost.category} 최신</h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {allPosts
                          .filter(p => p.category === currentPost.category && p.id !== currentPost.id)
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 5)
                          .map((post) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex flex-col gap-1 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors"
                              >
                                <span className="text-[13px] font-medium text-[#1E1B2E] leading-[1.45] break-keep line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
                                  {post.title}
                                </span>
                                <span className="text-[11px] text-[#8A87A0]">{post.date.replace(/-/g, ". ")}</span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* 실용 도구 바로가기 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#312E81] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white">🧮 실용 계산기</h3>
                      </div>
                      <div className="p-3 space-y-2">
                        <button
                          onClick={() => handleNavigate("tools-didimdol")}
                          className="w-full text-left text-[13px] font-medium text-[#3F3D56] bg-[#F5F6FD] hover:bg-[#EEF0FB] hover:text-[#4F46E5] border border-[#E2E4F0] rounded-lg px-3 py-2.5 transition-colors"
                        >
                          디딤돌 우대금리 계산기
                        </button>
                        <button
                          onClick={() => handleNavigate("tools-cheongyak")}
                          className="w-full text-left text-[13px] font-medium text-[#3F3D56] bg-[#F5F6FD] hover:bg-[#EEF0FB] hover:text-[#4F46E5] border border-[#E2E4F0] rounded-lg px-3 py-2.5 transition-colors"
                        >
                          신혼특공 가점 계산기
                        </button>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

              {/* Related */}
              {(() => {
                const related = allPosts
                  .filter(p => p.category === currentPost.category && p.id !== currentPost.id)
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 3);
                if (related.length === 0) return null;
                return (
                  <aside className="mt-16 pt-10 border-t border-[#D5D8E8]" aria-label="관련 글">
                    <h2 className="text-[18px] sm:text-[20px] font-bold text-[#1E1B2E] mb-6 tracking-tight">
                      {currentPost.category} 카테고리의 다른 글
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {related.map((p) => (
                        <PostCard
                          key={p.id}
                          post={p}
                          views={views[p.id]}
                          onClick={(id) => handleNavigate(`post-${id}`)}
                        />
                      ))}
                    </div>
                  </aside>
                );
              })()}

            </motion.article>
          ) : (
            (currentPage.startsWith("category-") || searchQuery) && (
              <motion.section
                key="post-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-16"
              >
                {/* Section header */}
                <div className="mb-8 lg:mb-10">
                  {(() => {
                    const categoryName = currentPage === "home" ? "" : currentPage.replace("category-", "");
                    const isCategory = currentPage.startsWith("category-");
                    const isSearching = !!searchQuery;
                    const title = isSearching
                      ? `'${searchQuery}' 검색 결과`
                      : (isCategory ? categoryName : "전체 글");
                    const desc = isSearching
                      ? `총 ${filteredPosts.length}개의 글이 검색되었습니다.`
                      : (isCategory
                        ? ({
                            "신혼금융": "디딤돌, 보금자리, 신생아특례대출부터 신혼특공·혼인 증여공제, 출산·육아 지원 정책까지 — 가정의 재무·정책 의사결정에 필요한 정보를 모았습니다.",
                            "신혼가전": "삼성·LG 패키지 비교, 평수별 가전 사이즈, 빌트인 선택 기준 등 신혼집을 꾸리는 데 필요한 실용 가이드를 정리했습니다.",
                            "결혼준비": "스드메 견적의 진실, 웨딩홀 종류별 장단점, 6개월 타임라인 등 결혼을 앞둔 두 사람을 위한 현실적인 안내입니다.",
                          } as Record<string, string>)[categoryName] || "본 카테고리의 글을 모았습니다."
                        : "홈코노미뉴스의 모든 글을 한자리에서 확인하세요.");

                    return (
                      <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div className="max-w-2xl">
                          <h2 className="text-[26px] sm:text-[32px] lg:text-[40px] font-bold text-[#1E1B2E] tracking-[-0.025em] break-keep leading-[1.2] mb-3">
                            {title}
                          </h2>
                          <p className="text-[14px] sm:text-[15px] text-[#3F3D56] leading-[1.7] break-keep max-w-xl">
                            {desc}
                          </p>
                        </div>
                        {isSearching && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(""); handleNavigate("home"); }}
                            className="text-[13px] font-semibold text-[#3F3D56] hover:text-[#1E1B2E] inline-flex items-center gap-1"
                            aria-label="검색 닫기"
                          >
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> 검색 닫기
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Category tabs — pill style */}
                <div className="flex gap-1.5 overflow-x-auto pb-4 mb-8 hide-scrollbar border-b border-[#D5D8E8]">
                  <button
                    className={`whitespace-nowrap px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                      currentPage === "home" && !searchQuery
                        ? "bg-[#1E1B2E] text-white"
                        : "bg-white text-[#3F3D56] hover:bg-[#F1F3F9] border border-[#D5D8E8]"
                    }`}
                    onClick={() => handleNavigate("home")}
                  >
                    전체
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`whitespace-nowrap px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                        currentPage === `category-${cat}`
                          ? "bg-[#1E1B2E] text-white"
                          : "bg-white text-[#3F3D56] hover:bg-[#F1F3F9] border border-[#D5D8E8]"
                      }`}
                      onClick={() => handleNavigate(`category-${cat}`)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Main + Sidebar layout */}
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
                  {/* Main: posts grid */}
                  <div className="lg:col-span-9">
                {filteredPosts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-12 lg:gap-x-6 lg:gap-y-14">
                    {filteredPosts.map((post, idx) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx, 8) * 0.04 }}
                      >
                        <PostCard
                          post={post}
                          views={views[post.id]}
                          onClick={(id) => handleNavigate(`post-${id}`)}
                          index={idx}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center bg-[#F8F9FD] rounded-xl">
                    <p className="text-[16px] font-semibold text-[#1E1B2E] mb-2">
                      검색 결과가 없습니다
                    </p>
                    <p className="text-[14px] text-[#8A87A0] mb-6">다른 검색어로 다시 시도해 보세요.</p>
                    <button
                      className="text-[13px] font-semibold text-[#1E1B2E] underline underline-offset-4"
                      onClick={() => { setSearchQuery(""); handleNavigate("home"); }}
                    >
                      모든 글 보기
                    </button>
                  </div>
                )}
                  </div>

                  {/* Sidebar */}
                  <aside className="lg:col-span-3 space-y-6">
                    {/* 인기 글 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#3730A3] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> 인기 글
                        </h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {["fin-39", "fin-38", "fin-41", "fin-43", "fin-44"]
                          .map(id => allPosts.find(p => p.id === id))
                          .filter((p): p is typeof allPosts[number] => Boolean(p))
                          .slice(0, 5)
                          .map((post, i) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex gap-2.5 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors"
                              >
                                <span className="flex items-center justify-center w-5 h-5 bg-[#EEF0FB] text-[#3730A3] text-[11px] font-bold rounded shrink-0 mt-0.5 tabular-nums">
                                  {i + 1}
                                </span>
                                <span className="text-[13px] font-medium text-[#1E1B2E] leading-[1.45] break-keep line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
                                  {post.title}
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* 최신 글 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#4F46E5] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white">📰 최신 글</h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {[...allPosts]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .slice(0, 5)
                          .map((post) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex flex-col gap-1 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors"
                              >
                                <span className="text-[13px] font-medium text-[#1E1B2E] leading-[1.45] break-keep line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
                                  {post.title}
                                </span>
                                <span className="text-[11px] text-[#8A87A0]">{post.date.replace(/-/g, ". ")}</span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </div>

                    {/* 주제별 빠른 찾기 */}
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden">
                      <div className="bg-[#312E81] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white">🔎 주제별 찾기</h3>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "디딤돌", page: "tools-didimdol" },
                          { label: "신혼특공", page: "tools-cheongyak" },
                          { label: "신생아특례", page: "category-신혼금융" },
                          { label: "부모급여", page: "category-신혼금융" },
                          { label: "공공임대", page: "category-신혼금융" },
                          { label: "혼수가전", page: "category-신혼가전" },
                          { label: "스드메", page: "category-결혼준비" },
                          { label: "정책정보", page: "policy" },
                        ].map((t) => (
                          <button
                            key={t.label}
                            onClick={() => handleNavigate(t.page)}
                            className="text-[12.5px] font-medium text-[#3F3D56] bg-[#F5F6FD] hover:bg-[#EEF0FB] hover:text-[#4F46E5] border border-[#E2E4F0] rounded-lg py-2 transition-colors"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </motion.section>
            )
          )}
        </AnimatePresence>
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
