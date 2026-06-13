import { useState, useMemo, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PostCard } from "./components/PostCard";
import { PolicyHub } from "./components/PolicyHub";
import { DidimdolCalculator } from "./components/DidimdolCalculator";
import { CheongyakCalculator } from "./components/CheongyakCalculator";
import { MOCK_POSTS, CATEGORIES } from "./constants";
import { POST_EXTRA_MAP } from "./postMeta";
import { Post } from "./types";
import { Share2, Printer, ArrowRight, TrendingUp, ArrowUpRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./lib/firebase";
import { recordView, fetchAllViews, fetchView, formatViews, handleFirestoreError, OperationType } from "./lib/views";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { calculateReadTime, slugify, stripHtml } from "./lib/utils";

type Page = "home" | "about" | "privacy" | "partnership" | "announcement" | "terms" | "policy" | "tools-didimdol" | "tools-cheongyak" | `category-${string}` | `post-${string}`;

const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "버진로드";
const DEFAULT_TITLE = "버진로드 (Virginroad) - 결혼 준비 & 신혼 금융 생활 백서";
const DEFAULT_DESCRIPTION = "결혼 준비부터 신혼부부 디딤돌대출, 버팀목대출, 신생아 특례대출 금리 계산기, 청약 가점 시뮬레이션까지 함께하는 신혼 금융 생활 백서, 버진로드입니다.";

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
    "author": { "@type": "Person", "name": post.author || "버진로드 편집부" },
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
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [adSensePreviewMode, setAdSensePreviewMode] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

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
    // 1. Fetch from our backend REST API which merges local & cloud posts
    fetch("/api/posts")
      .then(res => {
        if (!res.ok) throw new Error("API response error");
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data)) {
          setRealPosts(data);
        }
      })
      .catch(err => console.error("Failed to fetch merged API posts:", err));

    // 2. Fallback live subscription to Firestore posts if connection is active
    const q = query(collection(db, "posts"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Post[];
      setRealPosts(prev => {
        const merged = [...prev];
        posts.forEach(p => {
          if (!merged.some(m => m.id === p.id)) {
            merged.push(p);
          }
        });
        return merged;
      });
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, "posts");
      } catch (err) {
        console.warn("Handled posts onSnapshot warning gracefully:", err);
      }
    });
    return () => unsubscribe();
  }, []);

  const allPosts = useMemo(() => {
    // 덮어쓰기 우선: 이전 DB에 꼬여있거나 빈약해진 글들이 있을 때, 개정 완료된 고품격 로컬 MOCK_POSTS를 최우선 덮어쓰고, 신규 DB 글만 살려 귀속합니다.
    const combined = [...MOCK_POSTS];
    realPosts.forEach(real => {
      // 만약 ID가 같거나 제목이 완전히 일치하거나 slug가 같은 글이 이미 존재한다면, 고품질 보증된 로컬 MOCK_POSTS를 최우선 채용하고 해당 DB 글은 배제합니다.
      const isDuplicate = combined.some(p => 
        p.id === real.id || 
        p.title.trim() === real.title?.trim() || 
        slugify(p.title) === slugify(real.title || "")
      );
      if (!isDuplicate) {
        combined.push(real as Post);
      }
    });
    // Dynamically sanitize any fallback branding to 버진로드 (Virginroad)
    const sanitized = combined.map(p => {
      const author = p.author === "홈코노미뉴스 편집부" ? "버진로드 편집부" : p.author;
      const title = p.title.replace(/홈코노미뉴스/g, "버진로드");
      const excerpt = p.excerpt.replace(/홈코노미뉴스/g, "버진로드");
      const content = p.content.replace(/홈코노미뉴스/g, "버진로드");
      return { ...p, author, title, excerpt, content };
    });
    return sanitized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [realPosts]);

  // 전체 조회수 로드 (글 목록이 준비되면)
  useEffect(() => {
    if (allPosts.length === 0) return;
    fetchAllViews(allPosts.map((p) => p.id)).then(setViews);
  }, [allPosts]);

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
    setOpenFaqIdx(null);
  }, [currentPost]);

  useEffect(() => {
    if (!currentPost) return;
    const slug = slugify(currentPost.title) || currentPost.id;
    const desired = `/post/${slug}`;
    if (window.location.pathname !== desired) {
      window.history.replaceState({}, "", desired);
    }
  }, [currentPost]);

  // 글 조회 시 조회수 기록
  useEffect(() => {
    if (!currentPost) return;
    const id = currentPost.id;
    
    // 로컬 상태 즉시 증가 (Optimistic Update)
    setViews((prev) => {
      const currentVal = prev[id] || 0;
      return { ...prev, [id]: currentVal + 1 };
    });

    recordView(id).then((next) => {
      if (typeof next === "number") {
        setViews((prev) => ({ ...prev, [id]: next }));
      } else {
        fetchView(id).then((v) => {
          if (typeof v === "number") setViews((prev) => ({ ...prev, [id]: v }));
        });
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
        "결혼준비": "스드메 견적의 실제, 웨딩홀 종류별 장단점, 결혼 준비 타임라인, 예단·예물 협상 기준 등 결혼을 앞둔 가구를 위한 풍성한 자료가 한가득 수록되어 있습니다.",
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
    <div className="min-h-screen bg-[#FAFBFF] text-[#1E1B2E]">
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
                      <h1 className="text-[32px] sm:text-[42px] lg:text-[48px] font-bold tracking-[-0.03em] leading-[1.15] text-white mb-5 break-keep">
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
                            className="text-[13px] font-semibold text-white bg-white/12 hover:bg-white/22 border border-white/20 hover:border-white/40 px-3.5 py-2 rounded-full transition-all backdrop-blur-sm cursor-pointer"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: Trust card */}
                    <div className="lg:col-span-5">
                      <div className="bg-white/90 backdrop-blur-sm border border-[#E2E4F0] rounded-2xl p-6 lg:p-8 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                          <span className="text-[11px] font-bold text-[#22C55E] tracking-wide">버진로드는 이렇게 일해요</span>
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
                          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#3F3D56] hover:text-[#E8745F] transition-colors cursor-pointer"
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

              {/* === 공식 자료 바로가기 === */}
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
                      className="group flex flex-col items-center justify-center gap-2 bg-white border border-[#E2E4F0] hover:border-[#C7C9F0] hover:bg-[#F5F6FD] rounded-xl py-5 px-2 transition-all cursor-pointer"
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

                  const finPosts = byCategory("신혼금융", 5);
                  const appPosts = byCategory("신혼가전", 4);
                  const wedPosts = byCategory("결혼준비", 4);

                  return (
                    <>
                      {/* 신혼금융 — 1 large + 4 list */}
                      {finPosts.length >= 4 && (
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
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all cursor-pointer"
                            >
                              전체 {allPosts.filter(p => p.category === "신혼금융").length}개 보기
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                            {/* Large feature */}
                            <button
                              onClick={() => handleNavigate(`post-${finPosts[0].id}`)}
                              className="group text-left lg:col-span-6 card-warm p-0 overflow-hidden flex flex-col bg-white"
                            >
                              <div className="aspect-[5/3] overflow-hidden bg-[#F5F6FD] relative">
                                <img
                                  src={finPosts[0].image || "https://images.unsplash.com/photo-1554224128-3c7f3edcc69f?auto=format&fit=crop&q=80&w=800"}
                                  alt={finPosts[0].title}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

                            {/* List items */}
                            <div className="lg:col-span-6 card-warm p-2 lg:p-3 flex flex-col bg-white">
                              <ul className="flex flex-col justify-between h-full divide-y divide-[#EDEEF7]">
                                {finPosts.slice(1, 5).map((post, idx) => (
                                  <li key={post.id} className="flex-1 flex items-center">
                                    <button
                                      onClick={() => handleNavigate(`post-${post.id}`)}
                                      className="group flex items-center gap-3 w-full text-left p-3 hover:bg-[#F5F6FD] rounded-lg transition-colors cursor-pointer"
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
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all cursor-pointer"
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
                              className="text-[13px] font-bold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#FFD2BD] px-4 py-2 rounded-full transition-all cursor-pointer"
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
                                    className="inline-flex items-center gap-2 px-5 h-11 bg-white text-[#E8745F] text-[14px] font-bold rounded-full hover:bg-[#F5F6FD] transition-colors shadow-sm cursor-pointer"
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
              className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 article-body bg-white min-h-screen mt-4"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                버진로드 소개
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                버진로드(Virginroad)는 결혼 준비, 신혼 가전, 그리고 디딤돌/버팀목 대출이나 청약 가점 시뮬레이션 등 예비·신혼부부의 주거 마련과 금융 의사결정에 직접적인 영향을 미치는 정보를 제공하는 신혼 생활 정책 및 금융 전문 미디어입니다. 평균값 뒤에 가려진 '우리 집만의 정답'을 확실한 공공 기준 자료에 의거해 짚어드립니다.
              </p>

              <h2>우리의 목표</h2>
              <p>단 한 번뿐인 결혼식을 올리고 새로운 가정을 이룰 때 마주하는 수많은 결정들이 있습니다. 생소한 청약가점 계산부터 디딤돌대출 금리에 자녀 수나 청약통장 회차가 미치는 인하 혜택까지, 각종 규정과 혜택 정보는 세밀하고 복잡하게 얽혀 있습니다. 버진로드는 정확한 사실 관계(Fact)를 기초로 쉽고 명확하게 계산해 가이드 라인을 전달함으로써 현명한 가계의 시작을 완벽히 조력하겠습니다.</p>

              <h2>주요 카테고리</h2>
              <ul>
                <li><strong>신혼금융:</strong> 디딤돌·버팀목·신생아특례대출 비교, 신혼특공 청약 전략, 혼인 증여재산 공제 1억 5천만원 활용법, 신혼희망타운, IRP·연금저축 세제혜택까지</li>
                <li><strong>신혼가전:</strong> 삼성·LG 신혼가전 패키지 비교, 평수별 가전 사이즈, 빌트인 vs 일반 가전 선택 기준, 한샘·이케아·리바트·일룸 가구 비교</li>
                <li><strong>결혼준비:</strong> 스드메 견적의 실제, 웨딩홀 종류별 1인당 식대, 결혼 준비 타임라인, 예단·예물 협상 기준</li>
              </ul>

              <h2>콘텐츠 제작 원칙</h2>
              <ul>
                <li><strong>1차 자료 우선:</strong> 국토교통부, 한국주택금융공사, 주택도시기금, 청약홈, 국세청, 통계청 등 공공기관의 공식 발표를 기준으로 합니다.</li>
                <li><strong>본인 상황에 적용 가능한 방법론:</strong> 평균값 나열이 아닌, 본인 가구에 적용해 결정할 수 있는 판단 기준을 제공합니다.</li>
                <li><strong>출처 명시:</strong> 본문에 인용된 공공 자료는 원문 링크를 함께 제공해 독자가 직접 확인할 수 있도록 합니다.</li>
                <li><strong>면책 고지:</strong> 세무·법률·금융 등 전문 분야 정보는 일반 안내 목적임을 명시하고, 중요 결정에는 전문가 상담을 권장합니다.</li>
              </ul>

              <h2>기업 정보</h2>
              <ul>
                <li><strong>운영 주체:</strong> 상상아트</li>
                <li><strong>사업자등록번호:</strong> 272-14-01256</li>
                <li><strong>통신판매업 신고번호:</strong> 제2023-화성동탄-1098호</li>
                <li><strong>문의 이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>대표 사이트:</strong> <a href="https://virginroad.kr" rel="noopener noreferrer">https://virginroad.kr</a></li>
              </ul>
            </motion.div>
          )}

          {currentPage === "privacy" && (
            <motion.div
              key="privacy-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 article-body bg-white min-h-screen mt-4"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                개인정보 처리방침
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                상상아트(이하 '회사')는 「개인정보 보호법」 등 관련 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 이용자의 권익을 보호하며 안전하게 관리하고 있습니다.
              </p>

              <h2>제1조 (개인정보의 처리 목적)</h2>
              <p>회사는 다음의 목적을 위하여 최소한의 개인정보를 수집 및 처리하고 있으며, 다음 목적 이외의 용도로는 절대 이용하지 않습니다.</p>
              <ul>
                <li><strong>웹사이트 운영 및 통계 분석:</strong> 방문자수 통계, 국가별/브라우저별 통계 및 시뮬레이션 계산 사용량 분석</li>
                <li><strong>일반 제휴 및 이메일 문의 응대:</strong> 이메일을 통한 사업 제휴 제안 및 서비스 관련 문의 사항의 사실 확인 및 처리 결과 보도 회신</li>
                <li><strong>제3자 광고 게재 및 분석:</strong> Google AdSense 솔루션을 적용한 타겟 맞춤형 온라인 광고 배너 송출 및 클릭 로그 분석</li>
              </ul>

              <h2>제2조 (개인정보의 처리 및 보유 기간)</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 수집 시에 동의를 받은 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <ul>
                <li><strong>이메일 문의 정보:</strong> 관련 법령 저작권 처리에 관한 사항 보존을 위하여 1년간 보관 후 지체 없이 영구 파기</li>
                <li><strong>자동 수집 로그 및 기기 식별정보:</strong> 사이트 보증 관리 및 보안 인시던트 차단을 위해 최대 6개월 보유 후 파기</li>
              </ul>

              <h2>제3조 (수집하는 개인정보의 항목)</h2>
              <p>회사는 별도의 회원가입 절차 없이 모든 콘텐츠와 계산기를 완전 무료로 열람하고 이용하도록 구조를 취하고 있습니다. 다만 서비스를 이용하는 과정에서 아래 정보가 자동 생성되거나 문의 접수를 위해 자발적으로 제공하는 항목에 한해 수집될 수 있습니다.</p>
              <ul>
                <li><strong>자동 수집 항목:</strong> 이용자의 접속 IP 주소, OS 운영체제 종류, 웹 브라우저 제품 정보, 사이트 방문 시간 및 세션 쿠키(Cookie)</li>
                <li><strong>문의 시 수집 항목:</strong> 성명 또는 닉네임, 문의 이메일 주소, 자발적 기재 내용</li>
              </ul>

              <h2>제4조 (개인정보의 제3자 제공 및 위탁)</h2>
              <p>회사는 이용자의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 사전 동의를 받았거나 사법 당국의 법령에 따른 강제 명령이 있는 외에는 제3자에게 임의로 제공하거나 위탁하지 않습니다.</p>

              <h2>제5조 (쿠키 및 구글 애드센스 광고에 관한 고지)</h2>
              <p>1. 본 서비스는 구글 주식회사(Google Inc.)가 제공하는 웹 광고 분석 기술 서비스인 Google AdSense를 탑재하여 연동 작동하고 있습니다.<br />
              2. Google은 사용자가 이전 방문 이력을 기반으로 본 사이트 및 기타 제3자 웹사이트에 맞는 온라인 맞춤 배너 광고를 게재하기 위해 쿠키(Cookie)를 활용할 수 있습니다.<br />
              3. Google의 광고 및 콘텐츠 네트워크 개인정보 보호정책에 관한 보다 상세한 데이터 활용 양식과 지침은 구글 개인정보처리약관 페이지(<a href="https://policies.google.com/privacy" rel="noopener noreferrer" className="text-[#D45A45] underline hover:text-[#1E1B2E]">https://policies.google.com/privacy</a>)에서 확인할 수 있습니다.<br />
              4. <strong>쿠키 설치 허용 여부에 관한 제어 수단:</strong> 이용자는 언제든 사용하는 웹 브라우저의 옵션을 조절하여 쿠키 저장을 거부하거나 경고를 받도록 처리할 수 있습니다. 예를 들어, 구글 맞춤 설정 페이지(<a href="https://adssettings.google.com" rel="noopener noreferrer" className="text-[#D45A45] underline hover:text-[#1E1B2E]">https://adssettings.google.com</a>)에서 맞춤 광고 게재 비활성화와 같은 직접 제어가 가능합니다.</p>

              <h2>제6조 (정보주체의 권리·의무 및 그 행사방법)</h2>
              <p>1. 이용자는 회사에 대해 언제든지 개인정보의 열람, 정정, 삭제, 처리정지 요구 등의 권리를 신속히 행사할 수 있습니다.<br />
              2. 권리 행사는 이메일(<a href="mailto:apark12321@gmail.com" className="text-[#4F46E5] hover:underline">apark12321@gmail.com</a>)을 통해 서면 신청하실 수 있으며, 접수 즉시 확인하여 처리 완료를 전달해 드립니다.</p>

              <h2>제7조 (개인정보의 파기절차 및 방법)</h2>
              <p>회사는 수집 목적이 완료되거나 보유 기간이 만료된 이용자의 개인정보는 물리적, 기술적으로 완전히 파기합니다. 파일 형태의 수집 기록은 복구할 수 없는 방식으로 영구 포맷 소거하며, 문서 형태는 전문 분쇄기를 이용하여 처분합니다.</p>

              <h2>제8조 (개인정보의 안전성 확보 조치)</h2>
              <p>회사는 개인정보를 취급함에 있어 안전성 확보를 위해 다음 각 호의 대책을 기본 수립하고 적용하고 있습니다.</p>
              <ul>
                <li>안전한 서버 가동망 구축 및 대외 불법 침입 시도 상시 탐지 차단 방화벽 적용</li>
                <li>개 개인정보 열람 담당 책임자의 인원 수 세밀 통제 및 정기 보안 교육 실시</li>
              </ul>

              <h2>제9조 (개인정보 보호책임자 정보)</h2>
              <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 운영하고 있습니다.</p>
              <ul>
                <li><strong>개인정보 보호책임자:</strong> 상상아트 사이트 운영본부</li>
                <li><strong>담당 이메일:</strong> <a href="mailto:apark12321@gmail.com" className="text-[#4F46E5] hover:underline">apark12321@gmail.com</a></li>
              </ul>

              <h2>제10조 (개인정보 처리방침의 변경 고지)</h2>
              <p>본 개인정보 처리방침은 법령 개정 및 보완, 서비스 개편에 따라 변경될 수 있으며, 개정이 있을 시에는 시행 최소 7일 전 사이트의 공지사항 목록을 통하여 명확히 안내할 것을 천명합니다.</p>
            </motion.div>
          )}

          {currentPage === "terms" && (
            <motion.div
              key="terms-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 article-body bg-white min-h-screen mt-4"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                이용약관
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                본 약관은 버진로드(이하 "서비스")가 제공하는 웹사이트 서비스 및 관련 계산 도구, 콘텐츠 이용과 관련하여 회사(상상아트)와 이용자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.
              </p>

              <h2>제1조 (목적)</h2>
              <p>본 약관은 회사가 운영하는 "버진로드" 웹사이트(이하 "사이트")에서 제공하는 제반 콘텐츠, 결혼 준비 정보, 대출 금리 계산기 및 가점 시뮬레이션 도구(이하 "서비스")를 이용자가 이용함에 있어 필요한 준수 사항 및 권리와 의무를 정의합니다.</p>

              <h2>제2조 (정의)</h2>
              <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ul>
                <li><strong>이용자:</strong> 사이트에 접속하여 본 약관에 따라 서비스를 이용하는 모든 방문객 및 사용자</li>
                <li><strong>콘텐츠:</strong> 회사가 제공하는 텍스트, 이미지, 계산표, 분석 의견, 제보 기고글 등 일체의 정보 자료</li>
                <li><strong>계산 도구:</strong> 디딤돌 금리 계산기, 청약 가점 계산기 등 사이트 내에서 제공하는 모의 시뮬레이터</li>
              </ul>

              <h2>제3조 (약관의 효력 및 개정)</h2>
              <p>1. 본 약관은 사이트 화면에 게시하거나 기타의 방법으로 이용자에게 공시함으로써 효력을 발생합니다.<br />
              2. 회사는 약관의 규제에 관한 법률 등 관련 법령을 위배하지 않는 범위 내에서 본 약관을 개정할 수 있습니다.<br />
              3. 이용자는 정기적으로 사이트를 방문하여 약관의 변경 사항을 확인해야 할 의무가 있으며, 개정된 약관의 공지 이후에도 서비스를 계속 사용하는 경우 변경된 약관 조항에 동의한 것으로 간주됩니다.</p>

              <h2>제4조 (서비스의 제공 및 변경)</h2>
              <p>1. 회사는 이용자에게 신혼 금융, 신혼 가전, 결혼 준비 콘텐츠 및 각종 금융 시뮬레이션 계산 도구를 제공합니다.<br />
              2. 제공되는 모든 시뮬레이션 및 데이터 결과물은 공공기관의 공식 발표자료에 근거하여 작동하나, 개별 가구의 구체적인 가점이나 실행 금리는 금융기관 및 담당 기관의 직접적인 기준과 차이가 있을 수 있으므로 전적인 법적 보증 문서로 사용될 수 없습니다.<br />
              3. 회사는 필요한 경우 서비스의 내용을 수정하거나 중단할 수 있으며, 이로 발생하는 간접 결과에 책임을 지지 않습니다.</p>

              <h2>제5조 (이용자의 의무 및 제한)</h2>
              <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
              <ul>
                <li>회사 또는 제3자의 저작권 등 지적재산권을 침해하는 행위</li>
                <li>사이트 내의 데이터를 비정상적인 방법(크롤러, 매크로 등 자동 수집 도구)으로 수집하여 무단 데이터베이스화하는 행위</li>
                <li>사이트의 시스템 안전성을 위협하거나 임의로 코드를 주입, 변조하려는 일체의 해킹 시도</li>
                <li>타인의 명예를 훼손하거나 유해한 정보를 유포하는 일체의 행위</li>
              </ul>

              <h2>제6조 (저작권의 귀속 및 이용제한)</h2>
              <p>1. 회사가 자체 디자인하고 작성하여 사이트에 게재한 모든 글, 그래픽, 계산 시뮬레이션 알고리즘 및 레이아웃의 전반 저작권은 상상아트에 귀속됩니다.<br />
              2. 이용자는 사이트 내 정보를 사전 서면 복제 승인 없이 상업적 용도로 전재, 배포, 인용, 복제하는 행위를 엄격히 금지합니다. 출처를 표기한 부분 인용의 경우에도 사이트 운영 목적을 저해하는 무단 스크랩은 엄격히 차단됩니다.</p>

              <h2>제7조 (책임의 한계와 제3자 서비스 면책)</h2>
              <p>1. 본 사이트 내 게재된 콘텐츠는 단순 가이드 및 일반적인 참고 목적으로 제공되는 것이며, 투자, 세법 적용, 실제 청약 및 대출 실행 관련 최종 의사결정의 주 책임은 전적으로 이용자 본인에게 있습니다.<br />
              2. 본 사이트는 Google AdSense 등 제3자 광고 파트너사가 송출하는 광고 및 마케팅 정보를 포함하고 있으며, 해당 제3자 광고 링크를 통해 이동하는 외부 사이트에서 이루어진 정보 및 거래에 대해 회사는 일체의 귀속 책임을 부담하지 않습니다.</p>

              <h2>제8조 (관할 법원)</h2>
              <p>본 서비스 이용과 관련하여 회사와 이용자 간 분쟁이 발생하는 경우, 민사소송법상의 관할 법원을 합의 법원으로 지정하여 해결합니다.</p>
            </motion.div>
          )}

          {currentPage === "announcement" && (
            <motion.div
              key="announcement-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 article-body bg-white min-h-screen mt-4"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                공지사항
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                버진로드 운영에 관한 안내 사항을 공지합니다.
              </p>

              <h2>2026년 5월 13일</h2>
              <h3>인기 가전·가구 비교 목록 최신 갱신완료</h3>
              <p>2026년 봄 결혼 가전 입주 시즌에 맞춰 삼성 비스포크와 LG 오브제 컬렉션의 가격 단품 시세를 새로 동조 갱신해 드렸습니다.</p>

              <h2>2026년 3월 15일</h2>
              <h3>버진로드 정식 서비스 오픈</h3>
              <p>신혼 생활 정책 및 금융 전문 미디어 버진로드가 정식 발족되었습니다. 유용한 계산 기구들과 양질의 공식 레코드 중심 보도를 기대해 주세요.</p>
            </motion.div>
          )}

          {currentPage === "partnership" && (
            <motion.div
              key="partnership-page"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[1000px] mx-auto px-6 sm:px-10 lg:px-16 py-12 lg:py-20 article-body bg-white min-h-screen mt-4"
            >
              <h1 className="text-[32px] sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.2] text-[#1E1B2E] mb-6 break-keep">
                제휴 및 비즈니스 문의
              </h1>
              <p className="text-[16px] leading-[1.8] text-[#3F3D56] mb-10 break-keep">
                금융, 보험, 웨딩, 인테리어 분야와의 제휴나 협업 기고 제보를 환영합니다.
              </p>
              <p>제휴 문의 이메일: <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a> (담당자 앞)</p>
            </motion.div>
          )}

          {currentPost ? (
            <motion.article
              key="post-detail"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-16 bg-white min-h-screen mt-4"
            >
              <div className="lg:max-w-[860px]">
                {/* Breadcrumb */}
                <nav aria-label="breadcrumb" className="mb-6 text-[12px] text-[#8A87A0]">
                  <ol className="flex flex-wrap items-center gap-1.5">
                    <li>
                      <button onClick={() => handleNavigate("home")} className="hover:text-[#1E1B2E] transition-colors cursor-pointer">홈</button>
                    </li>
                    <li aria-hidden="true">/</li>
                    <li>
                      <button onClick={() => handleNavigate(`category-${currentPost.category}`)} className="hover:text-[#1E1B2E] transition-colors cursor-pointer">
                        {currentPost.category}
                      </button>
                    </li>
                  </ol>
                </nav>

                {/* Category */}
                <p className="text-[13px] font-semibold text-[#E8745F] mb-4">
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

                {/* Meta */}
                <div className="flex items-center justify-between py-5 border-y border-[#D5D8E8] mb-10">
                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="font-semibold text-[#1E1B2E]">{currentPost.author}</span>
                    <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                    <span className="text-[#8A87A0]">{currentPost.date.replace(/-/g, ". ")}</span>
                    <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                    <span className="text-[#8A87A0]">{calculateReadTime(currentPost.content)} 읽기</span>
                    <span className="w-[2px] h-[2px] bg-[#D5D8E8] rounded-full" />
                    <span className="text-[#8A87A0] inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {(views[currentPost.id] || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {shareSuccess && (
                      <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 animate-pulse">
                        주소가 복사되었습니다!
                      </span>
                    )}
                    <button
                      className={`w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                        shareSuccess ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "text-[#3F3D56] hover:text-[#1E1B2E] hover:bg-[#F1F3F9]"
                      }`}
                      title="공유"
                      aria-label="이 글 공유하기"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(window.location.href);
                          setShareSuccess(true);
                          setTimeout(() => setShareSuccess(false), 2000);
                        } catch {
                          setShareSuccess(true);
                          setTimeout(() => setShareSuccess(false), 2000);
                        }
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      className="w-9 h-9 rounded-md text-[#3F3D56] hover:text-[#1E1B2E] hover:bg-[#F1F3F9] flex items-center justify-center transition-colors hidden sm:flex cursor-pointer"
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
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-8 min-w-0">
                  <div className="aspect-[16/10] overflow-hidden mb-10 bg-[#F1F3F9] rounded-lg">
                    <img
                      src={currentPost.image || "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800"}
                      alt={currentPost.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Persona Card */}
                  {currentPost && POST_EXTRA_MAP[currentPost.id] && (
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 mb-8 flex items-start gap-4">
                      <img
                        src={POST_EXTRA_MAP[currentPost.id].persona.avatar}
                        alt={POST_EXTRA_MAP[currentPost.id].persona.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[14px] font-bold text-[#1E1B2E]" id={`persona-name-${currentPost.id}`}>{POST_EXTRA_MAP[currentPost.id].persona.name}</span>
                          <span className="text-[11px] font-medium text-[#4F46E5] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#C7D2FE]">
                            {POST_EXTRA_MAP[currentPost.id].persona.role}
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {POST_EXTRA_MAP[currentPost.id].persona.badge}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#475569] leading-relaxed break-keep">
                          &ldquo;{POST_EXTRA_MAP[currentPost.id].persona.message}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AdSense Top Banner */}
                  {currentPost && POST_EXTRA_MAP[currentPost.id] && (
                    <div className={`rounded-xl p-5 mb-8 relative overflow-hidden shadow-sm transition-all duration-300 ${adSensePreviewMode ? "bg-[#FAFAFA] border border-[#ECECEC]" : "bg-gradient-to-br from-[#FAF9FF] to-[#EFF6FF] border border-[#C7D2FE]"}`}>
                      <div className="absolute top-0 right-0 flex items-center">
                        <div className={`text-[9px] font-bold px-2.5 py-1 rounded-bl transition-all duration-200 ${adSensePreviewMode ? "bg-[#E2EAF4] text-[#7F8D9E]" : "bg-[#4F46E5]/10 text-[#4F46E5]"}`}>
                          {adSensePreviewMode ? "SPONSOR AD (AdSense)" : "💡 에디터 맞춤정보 제휴 안내"}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                        <div className="text-left max-w-xl">
                          <div className="text-[10px] text-[#4F46E5] font-bold tracking-wider uppercase mb-1">
                            {adSensePreviewMode ? "RECOMMENDED AD CONTENT" : "RECOMMENDED FOR YOU"}
                          </div>
                          <h4 className="text-[14px] font-bold text-[#1E1B2E] leading-[1.4] break-keep">
                            {POST_EXTRA_MAP[currentPost.id].adsName}
                          </h4>
                          <p className="text-[12.5px] text-[#475569] mt-1 break-keep">
                            {adSensePreviewMode 
                              ? `기사 주제와 긴밀히 연계된 ${POST_EXTRA_MAP[currentPost.id].adsKeyword} 관련 구글 검색 추천 광고가 승인 이후 실제 연동됩니다.`
                              : `내 여건에 부합하는 ${POST_EXTRA_MAP[currentPost.id].adsKeyword} 가계 지원 서비스 및 모의 계산을 즉시 매칭합니다.`
                            }
                          </p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-3 shrink-0 w-full sm:w-auto">
                          <button 
                            onClick={() => {
                              if (currentPost.category === "신혼금융" && currentPost.id.includes("didimdol")) {
                                handleNavigate("tools-didimdol");
                              } else if (currentPost.category === "신혼금융" && currentPost.id.includes("cheongyak")) {
                                handleNavigate("tools-cheongyak");
                              } else {
                                handleNavigate("partnership");
                              }
                            }}
                            className="bg-[#1E1B2E] hover:bg-[#4F46E5] text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto shadow-sm"
                          >
                            자세히 알아보기 <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Small inline preview controller showing we understand approval process */}
                      <div className="mt-4 pt-3.5 border-t border-dashed border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2 text-[11px] text-[#64748B]">
                        <span className="flex items-center gap-1 text-left">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <span>
                            {adSensePreviewMode 
                              ? "⚠️ 애드센스 심사전이라면 이와 같이 투명하게 광고 레이아웃 배치 시연을 진행할 수 있습니다."
                              : "🔔 현재 애드센스 심사 전 검수 최적화를 위해 고품격 파트너 추천 레이아웃으로 안심 대체 작동 중입니다."
                            }
                          </span>
                        </span>
                        <button
                          onClick={() => setAdSensePreviewMode(!adSensePreviewMode)}
                          className="flex items-center gap-1.5 text-[#4F46E5] hover:text-[#3730A3] font-bold cursor-pointer transition-colors"
                        >
                          <input 
                            type="checkbox" 
                            checked={adSensePreviewMode} 
                            onChange={() => {}} 
                            className="w-3.5 h-3.5 accent-[#4F46E5] cursor-pointer"
                          />
                          애드센스 광고배너 미리보기 {adSensePreviewMode ? "끄기" : "켜기"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div
                    className="article-body"
                    dangerouslySetInnerHTML={{ __html: currentPost.content }}
                  />

                  {/* GEO Official Source Card */}
                  {currentPost && POST_EXTRA_MAP[currentPost.id] && (
                    <div className="mt-10 p-5 bg-[#EEF2F6] border border-[#D0D7DE] rounded-xl" id={`geo-source-${currentPost.id}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                        <h4 className="text-[14px] font-bold text-[#1E1B2E] flex items-center gap-1.5">
                          🏛️ GEO 오피셜 신뢰 기관 및 정책 근거 정보
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[12px] text-[#475569]">
                        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                          <div className="text-[11px] text-[#8A87A0] mb-0.5">배포 및 보장 기구</div>
                          <div className="font-semibold text-[#1E1B2E] break-keep">{POST_EXTRA_MAP[currentPost.id].geoSource.agency}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                          <div className="text-[11px] text-[#8A87A0] mb-0.5">법적/행정적 근거 고시</div>
                          <div className="font-semibold text-[#1E1B2E] leading-normal break-keep">{POST_EXTRA_MAP[currentPost.id].geoSource.basis}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                          <div className="text-[11px] text-[#8A87A0] mb-0.5">적용 유효 지자체 범위</div>
                          <div className="font-semibold text-[#1E1B2E] break-keep">{POST_EXTRA_MAP[currentPost.id].geoSource.region}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                          <div>
                            <div className="text-[11px] text-[#8A87A0] mb-0.5">정보 공신력 판정 지수</div>
                            <div className="font-bold text-[#10B981]">{POST_EXTRA_MAP[currentPost.id].geoSource.trustIndex}</div>
                          </div>
                          <span className="text-[10px] font-extrabold text-white bg-[#10B981] px-2 py-0.5 rounded shrink-0">공인인증</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AEO FAQ Accordion */}
                  {currentPost && POST_EXTRA_MAP[currentPost.id] && (
                    <div className="mt-8 p-5 bg-white border border-[#E2E4F0] rounded-xl shadow-sm" id={`aeo-faq-${currentPost.id}`}>
                      <h4 className="text-[14px] font-bold text-[#1E1B2E] mb-4 flex items-center gap-1.5">
                        💬 AEO 원 포인트 자격 Q&A (통합 AI 검색 정합성 보증)
                      </h4>
                      <div className="space-y-2.5">
                        {POST_EXTRA_MAP[currentPost.id].aeoFaq.map((faq, idx) => {
                          const isOpen = openFaqIdx === idx;
                          return (
                            <div key={idx} className="border border-[#EEF0FB] rounded-lg overflow-hidden">
                              <button
                                onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                                className="w-full flex items-center justify-between p-3.5 text-left bg-[#F8FAFD] hover:bg-[#EEF0FB] transition-colors cursor-pointer"
                              >
                                <span className="text-[13px] font-bold text-[#1E1B2E] leading-relaxed flex items-start gap-1.5 break-keep">
                                  <span className="text-[#4F46E5] font-extrabold shrink-0">Q.</span> {faq.q}
                                </span>
                                <span className="text-[11px] text-[#4F46E5] font-semibold shrink-0 ml-2 whitespace-nowrap">
                                  {isOpen ? "해설 닫기 ▲" : "해설 해부 ▼"}
                                </span>
                              </button>
                              {isOpen && (
                                <div className="p-4 bg-white border-t border-[#EEF0FB] text-[13px] text-[#3F3D56] leading-[1.7] break-keep">
                                  <strong className="text-[#10B981] font-extrabold mr-1">A.</strong> {faq.a}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AdSense Bottom Banner */}
                  {currentPost && POST_EXTRA_MAP[currentPost.id] && (
                    <div className={`rounded-xl p-5 mt-8 relative overflow-hidden shadow-sm text-center transition-all duration-300 ${adSensePreviewMode ? "bg-[#FAF9FF] border border-[#E2E1F5]" : "bg-gradient-to-br from-[#F0FDF4] to-[#EFF6FF] border border-[#C6EDD2]"}`}>
                      <div className="absolute top-0 right-0 bg-[#E9E4F8] text-[#8676B0] text-[9px] font-bold px-3 py-0.5 rounded-bl">
                        {adSensePreviewMode ? "IN-ARTICLE SPONSOR AD" : "🛠️ 버진로드 추천 스마트 툴"}
                      </div>
                      <div className="py-2">
                        <div className="text-[10px] text-[#4F46E5] font-bold tracking-wider uppercase mb-1">
                          {adSensePreviewMode ? "INTERESTED IN THIS TOPIC?" : "CONNECTED VALUE TOOL"}
                        </div>
                        <h4 className="text-[14px] font-bold text-[#1E1B2E] mb-2 leading-[1.4] break-keep">
                          {POST_EXTRA_MAP[currentPost.id].adsName}
                        </h4>
                        <p className="text-[12.5px] text-[#475569] max-w-xl mx-auto mb-4 break-keep">
                          {adSensePreviewMode 
                            ? `이 기사 하단의 애드센스 구글 정밀 타겟팅 영역에는 연동 후 무주택 기간, 대출금 이자 감면 등을 매칭해 주는 ${POST_EXTRA_MAP[currentPost.id].adsKeyword} 광고가 실시간 자동 고정 노출됩니다.`
                            : "버진로드가 제공하는 초정밀 가점 진단기 및 가계 예산 디딤돌 시뮬레이터를 활용해 예비 가계 자금을 아끼고 똑똑하게 설계해보세요."
                          }
                        </p>
                        <button 
                          onClick={() => {
                            if (currentPost.category === "신혼금융" && currentPost.id.includes("didimdol")) {
                              handleNavigate("tools-didimdol");
                            } else if (currentPost.category === "신혼금융" && currentPost.id.includes("cheongyak")) {
                              handleNavigate("tools-cheongyak");
                            } else {
                              handleNavigate("partnership");
                            }
                          }}
                          className={`${adSensePreviewMode ? "bg-[#4F46E5] hover:bg-[#3730A3]" : "bg-[#10B981] hover:bg-[#059669]"} text-white text-[11px] font-bold px-4 py-2.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer shadow-sm`}
                        >
                          관련 계산기 및 추천도구 바로가기 <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

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

                <div className="lg:col-span-4 space-y-6">
                  {/* 인기 글 */}
                  <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#3730A3] px-4 py-3">
                      <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" /> 인기 글
                      </h3>
                    </div>
                    <ul className="divide-y divide-[#EDEEF7]">
                      {["fin-39", "fin-38", "fin-41", "fin-43", "fin-44"]
                        .map(id => allPosts.find(p => p.id === id))
                        .filter((p): p is Post => Boolean(p) && p!.id !== currentPost.id)
                        .slice(0, 5)
                        .map((post, i) => (
                          <li key={post.id}>
                            <button
                              onClick={() => handleNavigate(`post-${post.id}`)}
                              className="group flex gap-2.5 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors cursor-pointer"
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
                  <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#4F46E5] px-4 py-3">
                      <h3 className="text-[14px] font-bold text-white">📰 {currentPost.category} 최신</h3>
                    </div>
                    <ul className="divide-y divide-[#EDEEF7]">
                      {allPosts
                        .filter(p => p.category === currentPost.category && p.id !== currentPost.id)
                        .slice(0, 5)
                        .map((post) => (
                          <li key={post.id}>
                            <button
                              onClick={() => handleNavigate(`post-${post.id}`)}
                              className="group flex flex-col gap-1 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors cursor-pointer"
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
                  <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#312E81] px-4 py-3">
                      <h3 className="text-[14px] font-bold text-white">🧮 실용 계산기</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      <button
                        onClick={() => handleNavigate("tools-didimdol")}
                        className="w-full text-left text-[13px] font-medium text-[#3F3D56] bg-[#F5F6FD] hover:bg-[#EEF0FB] hover:text-[#4F46E5] border border-[#E2E4F0] rounded-lg px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        디딤돌 우대금리 계산기
                      </button>
                      <button
                        onClick={() => handleNavigate("tools-cheongyak")}
                        className="w-full text-left text-[13px] font-medium text-[#3F3D56] bg-[#F5F6FD] hover:bg-[#EEF0FB] hover:text-[#4F46E5] border border-[#E2E4F0] rounded-lg px-3 py-2.5 transition-colors cursor-pointer"
                      >
                        신혼특공 가점 계산기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                            "신혼가전": "삼성·LG 패키지 비교, 평수별 가전 사이즈, 빌트인 선택 기준 등 신혼집을 꾸리는데 필요한 실용 가이드를 정리했습니다.",
                            "결혼준비": "스드메 견적의 진실, 웨딩홀 종류별 장단점, 6개월 타임라인 등 결혼을 앞둔 두 사람을 위한 현실적인 안내입니다.",
                          } as Record<string, string>)[categoryName] || "본 카테고리의 글을 모았습니다."
                        : "버진로드의 모든 글을 한자리에서 확인하세요.");

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
                            className="text-[13px] font-semibold text-[#3F3D56] hover:text-[#1E1B2E] inline-flex items-center gap-1 cursor-pointer"
                            aria-label="검색 닫기"
                          >
                            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> 검색 닫기
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-4 mb-8 hide-scrollbar border-b border-[#D5D8E8]">
                  <button
                    className={`whitespace-nowrap px-4 h-9 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                      currentPage === "home" && !searchQuery
                        ? "bg-[#1E1B2E] text-white"
                        : "bg-white text-[#3F3D56] hover:bg-[#F1F3F9] border border-[#D5D8E8]"
                    }`}
                    onClick={() => { setSearchQuery(""); handleNavigate("home"); }}
                  >
                    전체
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`whitespace-nowrap px-4 h-9 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
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
                      <div className="py-20 text-center bg-[#F1F3F9] rounded-xl">
                        <p className="text-[16px] font-semibold text-[#1E1B2E] mb-2">
                          검색 결과가 없습니다
                        </p>
                        <p className="text-[14px] text-[#8A87A0] mb-6">다른 검색어로 다시 시도해 보세요.</p>
                        <button
                          className="text-[13px] font-semibold text-[#1E1B2E] underline underline-offset-4 cursor-pointer"
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
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-[#3730A3] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> 인기 글
                        </h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {["fin-39", "fin-38", "fin-41", "fin-43", "fin-44"]
                          .map(id => allPosts.find(p => p.id === id))
                          .filter((p): p is Post => Boolean(p))
                          .slice(0, 5)
                          .map((post, i) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex gap-2.5 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors cursor-pointer"
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
                    <div className="bg-white border border-[#E2E4F0] rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-[#4F46E5] px-4 py-3">
                        <h3 className="text-[14px] font-bold text-white">📰 최신 글</h3>
                      </div>
                      <ul className="divide-y divide-[#EDEEF7]">
                        {[...allPosts]
                          .slice(0, 5)
                          .map((post) => (
                            <li key={post.id}>
                              <button
                                onClick={() => handleNavigate(`post-${post.id}`)}
                                className="group flex flex-col gap-1 w-full text-left p-3 hover:bg-[#F5F6FD] transition-colors cursor-pointer"
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
