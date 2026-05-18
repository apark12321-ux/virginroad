
import { useState, useMemo, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PostCard } from "./components/PostCard";
import { MOCK_POSTS, CATEGORIES } from "./constants";
import { Post } from "./types";
import { Share2, Printer, ArrowRight } from "lucide-react";
import { Button } from "./components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "./lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { calculateReadTime, slugify, stripHtml } from "./lib/utils";

type Page = "home" | "about" | "privacy" | "partnership" | "announcement" | "terms" | `category-${string}` | `post-${string}`;

const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "버진로드";
const DEFAULT_TITLE = "버진로드 - 신혼부부 금융·정책 & 결혼 준비 가이드";
const DEFAULT_DESCRIPTION = "신혼부부 정책 대출, 청약 전략, 혼수 가전 비교, 결혼 준비 체크리스트까지. 인생의 새로운 출발을 위한 실용 정보를 정리해 드립니다.";

function pageFromUrl(): Page {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname;
  if (path === "/" || path === "") return "home";
  if (path === "/about") return "about";
  if (path === "/privacy") return "privacy";
  if (path === "/partnership") return "partnership";
  if (path === "/announcement") return "announcement";
  if (path === "/terms") return "terms";
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
    "author": { "@type": "Person", "name": post.author || "버진로드 편집팀" },
    "publisher": {
      "@type": "Organization",
      "name": "알고파트너스",
      "alternateName": SITE_NAME,
      "url": SITE_URL,
      "logo": { "@type": "ImageObject", "url": `${SITE_URL}/icon.svg` },
      "taxID": "450-07-03104",
      "foundingDate": "2025-03-01"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/post/${slug}`
    },
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
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
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
      description = `${SITE_NAME}는 신혼부부의 새로운 출발을 돕는 실용 정보 미디어입니다.`;
      canonical = `${SITE_URL}/about`;
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
    } else if (currentPage.startsWith("category-")) {
      const cat = currentPage.replace("category-", "");
      const catDescriptions: Record<string, string> = {
        "신혼금융": "디딤돌·보금자리·신생아특례대출, 신혼특공 청약 전략, 혼인 증여공제, 신혼희망타운, IRP·연금저축까지. 신혼부부의 재무 결정에 필요한 정보를 정리한 카테고리입니다.",
        "신혼가전": "삼성·LG 신혼가전 패키지 비교, 평수별 적정 사이즈, 빌트인 가전 선택 기준, 한샘·이케아·리바트·일룸 가구 비교 등 신혼집 꾸리기 실용 가이드를 모았습니다.",
        "결혼준비": "스드메 견적, 웨딩홀 종류별 장단점, 결혼 준비 6개월 타임라인, 예단·예물 합리적 협상법까지. 결혼을 앞둔 두 사람의 현실적인 길잡이가 되어드립니다.",
      };
      title = `${cat} 카테고리 | ${SITE_NAME}`;
      description = catDescriptions[cat] || `${cat} 관련 신혼부부 정보를 모았습니다.`;
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
    <div className="min-h-screen bg-[#FAF7F2] text-[#2A2520] font-sans paper-texture">
      <Navbar onSearch={setSearchQuery} onNavigate={handleNavigate} searchQuery={searchQuery} />

      <main className="pt-20">
        <AnimatePresence mode="wait">
          {currentPage === "home" && !searchQuery && (
            <motion.section
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative pt-12 sm:pt-20 lg:pt-28 pb-16 lg:pb-24 px-6 sm:px-8 lg:px-12 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto">
                {/* Top ornament line */}
                <div className="flex items-center gap-4 mb-8 lg:mb-12">
                  <span className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#7C2D3B]">
                    Est · 2025
                  </span>
                  <span className="flex-1 h-px bg-gradient-to-r from-[#C9A961]/60 to-transparent" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
                  {/* Left: hero copy */}
                  <motion.div
                    className="lg:col-span-7"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                  >
                    <p className="font-eyebrow text-xs sm:text-sm tracking-[0.4em] uppercase text-[#C9A961] mb-6">
                      A New Chapter, Beautifully Planned
                    </p>

                    <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-medium text-[#2A2520] leading-[1.02] tracking-tight mb-8 break-keep">
                      두 사람의<br />
                      <span className="italic text-[#7C2D3B] font-normal">새로운 시작</span>을<br />
                      함께 계획합니다.
                    </h1>

                    <div className="flex items-start gap-4 mb-10 max-w-xl">
                      <span className="w-12 h-px bg-[#C9A961] mt-4 shrink-0" />
                      <p className="text-base sm:text-lg text-[#4A4238] leading-relaxed break-keep">
                        디딤돌·보금자리·신생아특례 정책 대출부터 신혼가전 비교, 결혼 준비 6개월 타임라인까지. 평균값이 아닌 본인 가구에 맞는 답을 찾도록 돕습니다.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Button
                        onClick={() => handleNavigate("category-신혼금융")}
                        className="bg-[#7C2D3B] hover:bg-[#5B1F2A] text-[#FAF7F2] rounded-none px-8 h-12 font-eyebrow text-xs tracking-[0.3em] uppercase border-0"
                      >
                        신혼금융 보기 <ArrowRight className="ml-3 w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleNavigate("category-결혼준비")}
                        className="bg-transparent hover:bg-[#F4EFE7] border border-[#2A2520] text-[#2A2520] rounded-none px-8 h-12 font-eyebrow text-xs tracking-[0.3em] uppercase"
                      >
                        결혼 준비 가이드
                      </Button>
                    </div>
                  </motion.div>

                  {/* Right: image with decorative frame */}
                  <motion.div
                    className="lg:col-span-5 relative"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                  >
                    <div className="relative">
                      {/* Decorative offset */}
                      <div className="absolute -top-4 -left-4 w-full h-full border border-[#C9A961] hidden md:block" />
                      <div className="relative aspect-[3/4] overflow-hidden bg-[#EDE5D6]">
                        <img
                          src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=1000"
                          alt="새로운 시작"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=1000";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2A2520]/30 via-transparent to-transparent" />
                      </div>

                      {/* Caption card */}
                      <div className="absolute -bottom-6 -right-6 bg-[#FAF7F2] border border-[#E5DDD0] p-5 max-w-[200px] hidden md:block">
                        <p className="font-eyebrow text-[10px] tracking-[0.3em] uppercase text-[#7C2D3B] mb-2">
                          Editorial Promise
                        </p>
                        <p className="font-display italic text-sm text-[#4A4238] leading-snug">
                          Honest information for your first chapter together.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Stats / categories preview */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 lg:mt-32 pt-12 border-t border-[#E5DDD0]"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  {[
                    { num: "01", title: "신혼금융", desc: "디딤돌·버팀목·신생아특례·신혼희망타운·IRP까지, 신혼부부 재무 결정의 모든 것", page: "category-신혼금융" },
                    { num: "02", title: "신혼가전", desc: "삼성·LG 패키지 비교, 평수별 적정 사이즈, 가성비 브랜드 매트릭스", page: "category-신혼가전" },
                    { num: "03", title: "결혼준비", desc: "스드메 견적의 진실, 웨딩홀 종류별 장단점, 6개월 타임라인", page: "category-결혼준비" },
                  ].map((item) => (
                    <button
                      key={item.num}
                      onClick={() => handleNavigate(item.page)}
                      className="text-left group"
                    >
                      <p className="font-eyebrow text-xs tracking-[0.4em] uppercase text-[#C9A961] mb-3">
                        No. {item.num}
                      </p>
                      <h3 className="font-display text-3xl font-medium text-[#2A2520] mb-3 group-hover:text-[#7C2D3B] transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#6B6258] leading-relaxed break-keep mb-3">
                        {item.desc}
                      </p>
                      <span className="font-eyebrow text-[11px] tracking-[0.3em] uppercase text-[#7C2D3B] inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        explore <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          )}

          {currentPage === "about" && (
            <motion.div
              key="about-page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24 editorial"
            >
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-6">About</p>
              <h1 className="font-display text-5xl lg:text-6xl font-medium text-[#2A2520] leading-tight mb-8 break-keep">
                버진로드 <span className="italic font-normal text-[#7C2D3B]">소개</span>
              </h1>
              <p className="text-lg text-[#4A4238] leading-relaxed mb-10 break-keep">
                버진로드는 결혼을 앞두거나 신혼 생활을 막 시작한 두 사람을 위한 실용 정보 미디어입니다. 평균값에 묻혀 사라지는 본인의 상황에 맞는 답을 찾도록 돕습니다.
              </p>

              <h2>우리의 목표</h2>
              <p>결혼은 두 사람의 새로운 출발이고, 그 출발에는 수많은 의사결정이 따라옵니다. 디딤돌대출과 보금자리론 중 어느 쪽이 유리한지, 신혼특공 자격이 되는지, 스드메 견적의 광고가와 실제 지출은 왜 다른지. 평균값을 나열하는 기사는 많지만, 본인 가구에 적용하는 방법까지 안내하는 곳은 드뭅니다. 버진로드는 그 격차를 메우고자 합니다.</p>

              <h2>주요 카테고리</h2>
              <ul>
                <li><strong>신혼금융:</strong> 디딤돌·버팀목·신생아특례대출 비교, 신혼특공 청약 전략, 혼인 증여재산 공제 1억 5천만원 활용법, 신혼희망타운, IRP·연금저축 세제혜택까지</li>
                <li><strong>신혼가전:</strong> 삼성·LG 신혼가전 패키지 비교, 평수별 가전 사이즈, 빌트인 vs 일반 가전 선택 기준, 한샘·이케아·리바트·일룸 가구 매트릭스</li>
                <li><strong>결혼준비:</strong> 스드메 견적의 진실, 웨딩홀 종류별 1인당 식대, 결혼 준비 6개월 타임라인, 예단·예물 합리적 협상법</li>
              </ul>

              <h2>콘텐츠 제작 원칙</h2>
              <p>버진로드는 단순한 정보 나열이 아니라 다음 네 가지 원칙을 따라 콘텐츠를 제작합니다.</p>
              <ul>
                <li><strong>1차 자료 우선:</strong> 국토교통부, 한국주택금융공사, 주택도시기금, 청약홈, 국세청, 통계청 등 공공기관의 공식 발표를 기준으로 합니다.</li>
                <li><strong>본인 상황에 적용 가능한 방법론:</strong> 평균값 나열이 아닌, 본인 가구에 적용해 결정할 수 있는 판단 기준을 제공합니다.</li>
                <li><strong>출처 명시:</strong> 본문에 인용된 공공 자료는 원문 링크를 함께 제공해 독자가 직접 확인할 수 있도록 합니다.</li>
                <li><strong>면책 고지:</strong> 세무·법률·금융 등 전문 분야 정보는 일반 안내 목적임을 명시하고, 중요 결정에는 전문가 상담을 권장합니다.</li>
              </ul>

              <h2>편집 검증 프로세스</h2>
              <p>모든 게시물은 세 단계 검토를 거쳐 발행됩니다. 1차 자료 수집과 본문 구성, 수치와 법령 조문의 팩트 체크, 표현의 정확성과 면책 고지의 적절성 검토. 정책이 변경되면 본문을 수정하고 글 하단 갱신 일자를 갱신합니다. 부정확한 부분을 발견하시면 <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>으로 알려 주시면 영업일 3일 이내 검토 후 반영합니다.</p>

              <h2>다루지 않는 영역</h2>
              <p>버진로드는 신혼부부의 실용 정보에 집중합니다. 부동산 투자 종목 추천, 특정 단지의 향후 가격 예측, 개별 사례에 대한 법률·세무 자문, 금융 상품의 가입 권유는 다루지 않습니다. 중요한 결정 시에는 반드시 해당 분야 전문가와 공공기관 공식 자료를 함께 확인해 주시기 바랍니다.</p>

              <h2>운영 정보</h2>
              <ul>
                <li><strong>운영 주체:</strong> 알고파트너스</li>
                <li><strong>대표자:</strong> 박예준</li>
                <li><strong>사업자등록번호:</strong> 450-07-03104</li>
                <li><strong>개업일:</strong> 2025년 3월 1일</li>
                <li><strong>업태/종목:</strong> 정보통신업(미디어콘텐츠창작업, 응용 소프트웨어 개발 및 공급업), 광고 대행업, 전자상거래 소매 중개업</li>
                <li><strong>사업장 주소:</strong> 인천광역시 서구 청라커낼로 270</li>
                <li><strong>문의 이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>사이트:</strong> <a href="https://virginroad.kr" target="_blank" rel="noopener noreferrer">https://virginroad.kr</a></li>
              </ul>
              <p>버진로드는 알고파트너스(서인천세무서 사업자등록번호 450-07-03104)가 운영하는 디지털 미디어입니다. 제휴, 콘텐츠 제보, 정정 요청 등 모든 문의는 위 이메일로 보내주시면 영업일 3일 이내 회신드립니다.</p>
            </motion.div>
          )}

          {currentPage === "privacy" && (
            <motion.div
              key="privacy-page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24 editorial"
            >
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-6">Privacy Policy</p>
              <h1 className="font-display text-5xl lg:text-6xl font-medium text-[#2A2520] leading-tight mb-8 break-keep">
                개인정보 <span className="italic font-normal text-[#7C2D3B]">처리방침</span>
              </h1>
              <p>알고파트너스(이하 '회사')는 「개인정보 보호법」 등 관련 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보 처리에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 본 처리방침을 수립·공개합니다.</p>

              <p className="text-sm text-[#6B6258]">본 개인정보처리방침은 다음과 같은 내용을 담고 있습니다.</p>
              <ol className="text-sm text-[#6B6258]">
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

              <div className="overflow-x-auto my-6 not-prose">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F4EFE7] border-b-2 border-[#C9A961]">
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0] w-32">구분</th>
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0]">수집 항목</th>
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0] w-40">수집 시점</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">자동 수집</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">IP 주소, 브라우저 종류 및 버전, OS 정보, 방문 일시, 방문 페이지, 접속 경로(referrer), 쿠키</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">웹사이트 접속 시</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">이용자 제공</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">이메일 주소(문의자가 직접 기재한 경우), 문의 내용</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">이메일 문의 시</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">제3자 도구</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">Google Analytics 통계 데이터, Google AdSense 광고 식별자</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">웹사이트 접속 시</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>수집 방법: 웹사이트 접속 시 자동 수집, 사용자가 이메일로 직접 발송, Google이 제공하는 분석·광고 도구를 통한 수집</p>

              <h2>3. 개인정보의 처리 및 보유 기간</h2>
              <p>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.</p>
              <ul>
                <li><strong>접속 로그 및 IP 정보:</strong> 「통신비밀보호법」에 따라 3개월간 보관</li>
                <li><strong>이메일 문의 내용:</strong> 회신 완료 후 1년 보관 후 파기 (분쟁 대응 목적)</li>
                <li><strong>쿠키 정보:</strong> 브라우저 설정에 따라 사용자가 임의로 삭제 가능, 미삭제 시 최대 2년</li>
                <li><strong>광고 식별자:</strong> Google AdSense의 정책에 따라 보관 (Google 개인정보처리방침 참조)</li>
              </ul>
              <p>법령에서 정한 별도의 보존 의무가 있는 경우, 회사는 해당 기간 동안 정보를 안전하게 보관한 후 지체 없이 파기합니다.</p>

              <h2>4. 개인정보 처리의 위탁에 관한 사항</h2>
              <p>회사는 원활한 서비스 운영을 위하여 다음과 같이 일부 업무를 외부 전문업체에 위탁하고 있습니다. 위탁 계약 시 「개인정보 보호법」 제26조에 따라 개인정보의 안전한 처리에 관한 사항을 명시하고 있습니다.</p>
              <div className="overflow-x-auto my-6 not-prose">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F4EFE7] border-b-2 border-[#C9A961]">
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0] w-40">수탁자</th>
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0]">위탁 업무 내용</th>
                      <th className="p-3 text-left font-semibold text-[#2A2520] border border-[#E5DDD0] w-44">개인정보 보유·이용 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">Vercel Inc.</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">웹사이트 호스팅 및 콘텐츠 전송망(CDN) 운영</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">위탁계약 종료 시까지</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">Google LLC</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">웹 분석(Google Analytics), 광고 게재(Google AdSense)</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">Google 정책에 따름</td>
                    </tr>
                    <tr>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0] font-medium">Google Firebase</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">데이터베이스 및 인증 서비스</td>
                      <td className="p-3 align-top text-[#4A4238] border border-[#E5DDD0]">위탁계약 종료 시까지</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2>5. 개인정보의 제3자 제공에 관한 사항</h2>
              <p>회사는 정보주체의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만 다음의 경우에 한해 예외적으로 제공할 수 있습니다.</p>
              <ul>
                <li>정보주체로부터 별도의 동의를 받은 경우</li>
                <li>다른 법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우</li>
                <li>법원의 재판 업무 수행을 위하여 제공하는 경우</li>
                <li>범죄의 수사와 공소의 제기 및 유지를 위하여 필요한 경우</li>
                <li>명백히 정보주체 또는 제3자의 급박한 생명, 신체, 재산의 이익을 위하여 필요하다고 인정되는 경우</li>
              </ul>
              <p>본 사이트는 Google AdSense를 통해 광고를 게재하며, Google은 광고 게재를 위해 사용자의 쿠키 정보 등을 활용할 수 있습니다. 자세한 사항은 본 처리방침 제8조 '광고 게재 및 제3자 광고 서비스'를 참고하시기 바랍니다.</p>

              <h2>6. 정보주체와 법정대리인의 권리·의무 및 그 행사 방법</h2>
              <p>정보주체는 회사에 대해 언제든지 다음의 권리를 행사할 수 있습니다.</p>
              <ul>
                <li>개인정보 열람 요구</li>
                <li>개인정보 정정·삭제 요구</li>
                <li>개인정보 처리 정지 요구</li>
                <li>동의 철회 요구</li>
              </ul>
              <p>위 권리 행사는 회사에 대해 이메일(<a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>)을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다. 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여서도 하실 수 있으며, 이 경우 위임장을 제출하셔야 합니다. 만 14세 미만 아동의 개인정보는 수집하지 않습니다.</p>

              <h2>7. 개인정보 자동 수집 장치(쿠키)의 설치·운영 및 거부</h2>
              <p>회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다. 쿠키는 웹사이트를 운영하는 데 이용되는 서버가 이용자의 브라우저에 보내는 소량의 정보이며 이용자의 PC 또는 모바일 기기 내에 저장됩니다.</p>
              <ul>
                <li><strong>쿠키의 사용 목적:</strong> 방문자 통계 집계, 콘텐츠 추천 최적화, 광고 게재 최적화, 서비스 개선</li>
                <li><strong>쿠키의 설치·운영 및 거부:</strong> 이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다.
                  <ul>
                    <li>Chrome: 설정에서 개인정보 보호 및 보안, 쿠키 및 기타 사이트 데이터</li>
                    <li>Safari: 환경설정에서 개인정보 보호, 쿠키 및 웹 사이트 데이터</li>
                    <li>Edge: 설정에서 쿠키 및 사이트 권한, 쿠키 및 사이트 데이터</li>
                  </ul>
                </li>
                <li><strong>쿠키 거부 시 영향:</strong> 쿠키 저장을 거부할 경우 일부 맞춤 서비스 이용에 어려움이 있을 수 있습니다.</li>
              </ul>

              <h2>8. 광고 게재 및 제3자 광고 서비스</h2>
              <p>본 사이트는 Google LLC의 광고 서비스인 Google AdSense를 통해 광고를 게재합니다. Google AdSense는 사용자의 이전 사이트 방문 정보를 토대로 사용자의 관심에 맞는 광고를 게재하기 위해 쿠키 및 광고 식별자를 사용합니다. 이 과정에서 수집되는 정보는 Google의 개인정보처리방침에 따라 관리됩니다.</p>
              <p>사용자는 다음 경로를 통해 맞춤 광고를 거부하실 수 있습니다.</p>
              <ul>
                <li><a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google 광고 설정 페이지</a>에서 맞춤 광고 비활성화</li>
                <li><a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google 광고 정책</a> 확인</li>
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a> 확인</li>
              </ul>
              <p>본 사이트는 광고 클릭이나 광고를 통한 거래에 대해 직접적인 책임을 지지 않으며, 광고주와의 거래에서 발생한 손해는 해당 광고주에게 문의하시기 바랍니다.</p>

              <h2>9. 개인정보의 안전성 확보 조치</h2>
              <p>회사는 개인정보의 안전성 확보를 위하여 다음과 같은 조치를 취하고 있습니다.</p>
              <ul>
                <li><strong>관리적 조치:</strong> 개인정보 취급 직원의 최소화, 정기적인 자체 점검, 내부 관리 계획 수립·시행</li>
                <li><strong>기술적 조치:</strong> SSL/TLS 암호화 통신(HTTPS) 적용, 접근 권한 관리, 보안 프로그램 설치 및 주기적 갱신</li>
                <li><strong>물리적 조치:</strong> 신뢰할 수 있는 클라우드 서비스(Vercel, Google Cloud)를 통한 데이터 보관, 접근 통제 시스템 운영</li>
              </ul>

              <h2>10. 개인정보 보호책임자 및 담당자</h2>
              <p>회사는 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <ul>
                <li><strong>개인정보 보호책임자:</strong> 박예준 (알고파트너스 대표)</li>
                <li><strong>연락처:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>접수 시간:</strong> 평일 오전 9시부터 오후 6시까지 (주말·공휴일 제외)</li>
              </ul>

              <h2>11. 개인정보 열람 청구</h2>
              <p>정보주체는 「개인정보 보호법」 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보주체의 개인정보 열람 청구가 신속하게 처리되도록 노력하겠습니다.</p>
              <ul>
                <li><strong>부서명:</strong> 알고파트너스 고객 응대팀</li>
                <li><strong>담당자:</strong> 박예준</li>
                <li><strong>이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
              </ul>

              <h2>12. 권익 침해 구제 방법</h2>
              <p>정보주체는 개인정보 침해로 인한 신고, 상담이 필요한 경우 아래 기관에 도움을 요청하실 수 있습니다.</p>
              <ul>
                <li><strong>개인정보분쟁조정위원회:</strong> (국번 없이) 1833-6972 / <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer">www.kopico.go.kr</a></li>
                <li><strong>개인정보침해 신고센터:</strong> (국번 없이) 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer">privacy.kisa.or.kr</a></li>
                <li><strong>대검찰청 사이버수사과:</strong> (국번 없이) 1301 / <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer">www.spo.go.kr</a></li>
                <li><strong>경찰청 사이버수사국:</strong> (국번 없이) 182 / <a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer">ecrm.cyber.go.kr</a></li>
              </ul>

              <h2>13. 고지의 의무</h2>
              <p>본 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제, 정정이 있는 경우 변경 사항의 시행 7일 전부터 공지사항 또는 본 페이지를 통하여 고지할 것입니다. 다만, 이용자 권리에 중대한 변경이 발생할 때에는 최소 30일 전에 공지합니다.</p>

              <hr />
              <p className="text-sm text-[#6B6258]"><strong>운영 주체:</strong> 알고파트너스 (대표: 박예준)</p>
              <p className="text-sm text-[#6B6258]"><strong>사업자등록번호:</strong> 450-07-03104</p>
              <p className="text-sm text-[#6B6258]"><strong>주소:</strong> 인천광역시 서구 청라커낼로 270</p>
              <p className="text-sm text-[#6B6258]"><strong>이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></p>
              <p className="text-sm text-[#6B6258]"><strong>공고일자:</strong> 2026년 3월 15일</p>
              <p className="text-sm text-[#6B6258]"><strong>시행일자:</strong> 2026년 3월 15일</p>
            </motion.div>
          )}

          {currentPage === "terms" && (
            <motion.div
              key="terms-page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24 editorial"
            >
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-6">Terms of Service</p>
              <h1 className="font-display text-5xl lg:text-6xl font-medium text-[#2A2520] leading-tight mb-8 break-keep">
                이용 <span className="italic font-normal text-[#7C2D3B]">약관</span>
              </h1>
              <p>본 약관은 버진로드(이하 "사이트")가 제공하는 콘텐츠 및 부가 서비스(이하 "서비스")의 이용과 관련하여 사이트와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

              <h2>제1조 (목적)</h2>
              <p>이 약관은 이용자가 사이트에서 제공하는 서비스를 이용함에 있어 필요한 사항을 규정합니다.</p>

              <h2>제2조 (용어의 정의)</h2>
              <ul>
                <li><strong>"사이트"</strong>란 알고파트너스(대표 박예준)가 운영하는 버진로드(https://virginroad.kr)를 의미합니다.</li>
                <li><strong>"운영자"</strong>란 본 사이트를 운영하는 알고파트너스를 의미합니다.</li>
                <li><strong>"이용자"</strong>란 사이트에 접속하여 서비스를 이용하는 모든 자를 말합니다.</li>
                <li><strong>"콘텐츠"</strong>란 사이트가 게재하는 모든 텍스트, 이미지, 데이터, 영상 등을 의미합니다.</li>
              </ul>

              <h2>제3조 (약관의 효력 및 변경)</h2>
              <p>이 약관은 사이트에 게시함으로써 효력이 발생하며, 사이트는 합리적인 사유가 발생할 경우 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다. 변경된 약관은 사이트에 공지함으로써 효력이 발생합니다.</p>

              <h2>제4조 (서비스의 제공 및 변경)</h2>
              <p>사이트는 신혼금융, 신혼가전, 결혼준비 등 신혼부부 생활과 관련된 정보 콘텐츠를 제공합니다. 사이트는 운영상·기술상 필요한 경우 제공하는 서비스의 내용을 변경할 수 있습니다.</p>

              <h2>제5조 (이용자의 의무)</h2>
              <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
              <ul>
                <li>사이트가 게시한 콘텐츠를 사전 동의 없이 상업적 목적으로 복제·재배포하는 행위</li>
                <li>사이트의 운영을 방해하거나 시스템에 무단으로 접근하는 행위</li>
                <li>타인의 명예를 훼손하거나 권리를 침해하는 행위</li>
                <li>관련 법령 및 본 약관에 위배되는 그 밖의 행위</li>
              </ul>

              <h2>제6조 (콘텐츠의 저작권)</h2>
              <p>사이트가 작성한 모든 콘텐츠의 저작권은 운영자인 알고파트너스에 귀속됩니다. 이용자는 운영자의 사전 서면 동의 없이 콘텐츠를 영리 목적으로 이용하거나 제3자에게 이용하게 할 수 없습니다. 단, 출처를 명시한 비영리적·개인적 인용은 허용됩니다.</p>

              <h2>제7조 (책임의 제한)</h2>
              <p>사이트가 제공하는 정보는 일반적인 안내를 목적으로 하며, 특정 개인의 의사 결정에 대한 법률·세무·금융 자문이 아닙니다. 이용자가 사이트의 정보를 활용하여 내린 결정으로 인해 발생한 손실에 대해 사이트는 법적 책임을 지지 않으며, 중요한 의사 결정 시에는 반드시 해당 분야의 전문가 및 공공기관의 공식 자료를 함께 확인하실 것을 권장합니다.</p>

              <h2>제8조 (광고)</h2>
              <p>사이트는 서비스 운영을 위해 Google AdSense 등 제3자 광고를 게재할 수 있습니다. 광고의 내용 및 그로 인한 거래에 대한 책임은 해당 광고주에게 있으며, 사이트는 이에 대해 책임지지 않습니다.</p>

              <h2>제9조 (준거법 및 관할)</h2>
              <p>이 약관과 관련된 분쟁은 대한민국 법령에 따르며, 분쟁이 발생할 경우 민사소송법상의 관할 법원을 따릅니다.</p>

              <h2>제10조 (운영자 정보)</h2>
              <ul>
                <li><strong>운영 주체:</strong> 알고파트너스</li>
                <li><strong>대표자:</strong> 박예준</li>
                <li><strong>사업자등록번호:</strong> 450-07-03104</li>
                <li><strong>업태/종목:</strong> 정보통신업(미디어콘텐츠창작업, 응용 소프트웨어 개발 및 공급업), 광고 대행업</li>
                <li><strong>사업장 주소:</strong> 인천광역시 서구 청라커낼로 270</li>
                <li><strong>이메일:</strong> <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
                <li><strong>사이트:</strong> https://virginroad.kr</li>
              </ul>

              <p className="text-sm text-[#6B6258] mt-12">공고일자: 2026년 3월 15일 · 시행일자: 2026년 3월 15일</p>
            </motion.div>
          )}

          {currentPage === "announcement" && (
            <motion.div
              key="announcement-page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24 editorial"
            >
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-6">Announcements</p>
              <h1 className="font-display text-5xl lg:text-6xl font-medium text-[#2A2520] leading-tight mb-8 break-keep">
                공지 <span className="italic font-normal text-[#7C2D3B]">사항</span>
              </h1>
              <p>버진로드 운영에 관한 안내 사항을 공지합니다.</p>

              <h2>2026년 5월 13일</h2>
              <h3>신혼가전 카테고리 갱신 — 2026년 상반기 신혼 박람회 시즌 반영</h3>
              <p>2026년 봄 신혼 박람회 시즌(3~4월)에 맞춰 삼성·LG 가전 패키지 가격 정보를 업데이트하고, 가구 브랜드 비교 콘텐츠도 최신 라인업으로 갱신했습니다. 새 시즌의 할인 패턴을 반영한 캘린더 가이드도 함께 정비했습니다.</p>

              <h2>2026년 5월 11일</h2>
              <h3>신혼금융 콘텐츠 정책 변경 사항 반영</h3>
              <p>주택도시기금의 디딤돌·버팀목 대출 우대금리 조건 변경 사항과 신생아특례대출 자격 확대를 반영하여 관련 게시물을 모두 업데이트했습니다. 본문 하단의 갱신 일자를 확인해 주시기 바랍니다.</p>

              <h2>2026년 3월 15일</h2>
              <h3>버진로드 정식 오픈</h3>
              <p>신혼부부의 새로운 출발을 위한 실용 정보 미디어 '버진로드'(virginroad.kr)를 정식 오픈하였습니다. 신혼금융, 신혼가전, 결혼준비 3개 카테고리에 걸쳐 평균값이 아닌 본인 가구에 맞는 답을 찾을 수 있도록 콘텐츠를 차근차근 쌓아갈 계획입니다.</p>

              <hr />
              <h2>운영 안내</h2>
              <p>본 공지사항은 사이트 운영 정책, 콘텐츠 정책, 법령 준수와 관련된 주요 변경 사항을 안내합니다. 중요 사항이 발생할 때마다 본 페이지를 통해 우선 안내드리며, 개인정보 처리에 관한 변경은 별도로 <button onClick={() => handleNavigate("privacy")} className="text-[#7C2D3B] hover:underline">개인정보처리방침</button>을 통해 고지합니다.</p>
              <p>사이트 운영 관련 의견이나 제보는 언제든 <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a>으로 보내주세요.</p>
            </motion.div>
          )}

          {currentPage === "partnership" && (
            <motion.div
              key="partnership-page"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24 editorial"
            >
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-6">Partnership</p>
              <h1 className="font-display text-5xl lg:text-6xl font-medium text-[#2A2520] leading-tight mb-8 break-keep">
                제휴 및 <span className="italic font-normal text-[#7C2D3B]">비즈니스 문의</span>
              </h1>
              <p>버진로드는 신혼부부 대상의 양질의 정보 콘텐츠를 제공하는 미디어입니다. 독자 여러분과 업계 파트너 여러분의 다양한 제안을 환영합니다.</p>

              <h2>제휴 가능 영역</h2>
              <ul>
                <li><strong>콘텐츠 협업:</strong> 금융·웨딩·인테리어 관련 전문가의 인사이트 기고, 인터뷰 협업</li>
                <li><strong>광고·홍보:</strong> 신혼부부 대상 금융 상품, 가전·가구, 결혼 준비 서비스의 홍보 협업</li>
                <li><strong>데이터·서비스 협업:</strong> 결혼·신혼 시장 통계, 가전·가구 가격 정보 등의 데이터 제공·교환</li>
                <li><strong>이벤트·세미나:</strong> 신혼부부 대상 오프라인·온라인 행사 공동 운영</li>
              </ul>

              <h2>제휴 검토 기준</h2>
              <p>버진로드는 독자에게 정확하고 유용한 정보를 제공한다는 원칙을 최우선으로 합니다. 따라서 다음 기준에 부합하는 제휴만 검토합니다.</p>
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
                <li>운영 주체: 알고파트너스</li>
                <li>대표자: 박예준</li>
                <li>사업자등록번호: 450-07-03104</li>
                <li>사업장 주소: 인천광역시 서구 청라커낼로 270</li>
                <li>이메일: <a href="mailto:apark12321@gmail.com">apark12321@gmail.com</a></li>
              </ul>
            </motion.div>
          )}

          {currentPost ? (
            <motion.article
              key="post-detail"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto px-6 lg:px-8 py-16 lg:py-24"
            >
              {/* Breadcrumb */}
              <nav aria-label="breadcrumb" className="mb-8 font-eyebrow text-[11px] tracking-[0.25em] uppercase text-[#6B6258]">
                <ol className="flex flex-wrap items-center gap-2">
                  <li>
                    <button onClick={() => handleNavigate("home")} className="hover:text-[#7C2D3B] transition-colors">홈</button>
                  </li>
                  <li aria-hidden="true" className="text-[#C9A961]">/</li>
                  <li>
                    <button onClick={() => handleNavigate(`category-${currentPost.category}`)} className="hover:text-[#7C2D3B] transition-colors">
                      {currentPost.category}
                    </button>
                  </li>
                </ol>
              </nav>

              {/* Category eyebrow */}
              <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#7C2D3B] mb-6">
                — {currentPost.category}
              </p>

              {/* Title */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-medium leading-[1.1] mb-8 text-[#2A2520] tracking-tight break-keep">
                {currentPost.title}
              </h1>

              {/* Excerpt */}
              <p className="font-display italic text-lg lg:text-xl text-[#4A4238] leading-relaxed mb-10 break-keep border-l-2 border-[#C9A961] pl-5">
                {currentPost.excerpt}
              </p>

              {/* Meta + actions */}
              <div className="flex items-center justify-between py-6 border-y border-[#E5DDD0] mb-12">
                <div>
                  <p className="font-eyebrow text-[11px] tracking-[0.25em] uppercase text-[#7C2D3B]">
                    {currentPost.author}
                  </p>
                  <p className="text-xs text-[#6B6258] mt-1">
                    {currentPost.date.replace(/-/g, ". ")} · {calculateReadTime(currentPost.content)} 읽기
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="w-10 h-10 border border-[#E5DDD0] hover:border-[#7C2D3B] hover:bg-[#F4EFE7] flex items-center justify-center transition-colors"
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
                    <Share2 className="w-4 h-4 text-[#4A4238]" />
                  </button>
                  <button
                    className="w-10 h-10 border border-[#E5DDD0] hover:border-[#7C2D3B] hover:bg-[#F4EFE7] flex items-center justify-center transition-colors"
                    title="인쇄"
                    aria-label="이 글 인쇄하기"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-4 h-4 text-[#4A4238]" />
                  </button>
                </div>
              </div>

              {/* Hero image */}
              <div className="aspect-[21/9] overflow-hidden mb-12 bg-[#EDE5D6]">
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
                className="editorial max-w-none"
                dangerouslySetInnerHTML={{ __html: currentPost.content }}
              />

              {/* Hashtags */}
              {currentPost.hashtags && currentPost.hashtags.length > 0 && (
                <div className="mt-16 pt-8 border-t border-[#E5DDD0]">
                  <p className="font-eyebrow text-[11px] tracking-[0.3em] uppercase text-[#7C2D3B] mb-4">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {currentPost.hashtags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs text-[#6B6258] border border-[#E5DDD0] bg-[#F4EFE7] px-3 py-1.5 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related */}
              {(() => {
                const related = allPosts
                  .filter(p => p.category === currentPost.category && p.id !== currentPost.id)
                  .sort(() => Math.random() - 0.5)
                  .slice(0, 3);
                if (related.length === 0) return null;
                return (
                  <aside className="mt-20 pt-12 border-t border-[#E5DDD0]" aria-label="관련 글">
                    <div className="ornament mb-12">
                      <span>❦</span>
                    </div>
                    <p className="font-eyebrow text-xs tracking-[0.4em] uppercase text-[#C9A961] mb-4 text-center">
                      More from this section
                    </p>
                    <h2 className="font-display text-3xl lg:text-4xl font-medium text-[#2A2520] mb-12 text-center break-keep">
                      <span className="italic text-[#7C2D3B]">{currentPost.category}</span> 카테고리의 다른 글
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                      {related.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => handleNavigate(`post-${p.id}`)}
                          className="text-left group bg-[#FFFDF9] border border-[#E5DDD0] hover:border-[#C9A961] p-6 transition-all"
                        >
                          <p className="font-eyebrow text-[10px] tracking-[0.3em] uppercase text-[#C9A961] mb-3">
                            № {String(idx + 1).padStart(2, "0")}
                          </p>
                          <h3 className="font-display text-lg font-medium text-[#2A2520] mb-3 group-hover:text-[#7C2D3B] transition-colors line-clamp-3 leading-tight break-keep">
                            {p.title}
                          </h3>
                          <p className="text-xs text-[#6B6258] line-clamp-2 leading-relaxed break-keep">
                            {p.excerpt}
                          </p>
                          <p className="font-eyebrow text-[10px] tracking-[0.25em] uppercase text-[#7C2D3B] mt-4">
                            {p.date.replace(/-/g, ". ")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </aside>
                );
              })()}

            </motion.article>
          ) : (
            (currentPage === "home" || currentPage.startsWith("category-") || searchQuery) && (
              <motion.section
                key="post-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-20"
              >
                {/* Section header */}
                <div className="mb-12 lg:mb-16">
                  {(() => {
                    const categoryName = currentPage === "home" ? "" : currentPage.replace("category-", "");
                    const isCategory = currentPage.startsWith("category-");
                    const isSearching = !!searchQuery;
                    const title = isSearching
                      ? `'${searchQuery}' 검색 결과`
                      : (isCategory ? categoryName : "최근 발행");
                    const eyebrow = isSearching
                      ? "Search Results"
                      : (isCategory ? "Category" : "Recent Editions");
                    const desc = isSearching
                      ? `총 ${filteredPosts.length}개의 글이 검색되었습니다.`
                      : (isCategory
                        ? ({
                            "신혼금융": "디딤돌, 보금자리, 신생아특례대출부터 신혼특공, 혼인 증여공제까지 — 신혼부부의 재무 결정에 필요한 모든 정보를 모았습니다.",
                            "신혼가전": "삼성·LG 패키지 비교, 평수별 가전 사이즈, 빌트인 선택 기준 등 신혼집을 꾸리는 데 필요한 실용 가이드를 정리했습니다.",
                            "결혼준비": "스드메 견적의 진실, 웨딩홀 종류별 장단점, 6개월 타임라인 등 결혼을 앞둔 두 사람을 위한 현실적인 안내입니다.",
                          } as Record<string, string>)[categoryName] || "본 카테고리의 글을 모았습니다."
                        : "버진로드의 가장 최근 게시물을 한자리에 모았습니다. 두 사람의 출발에 필요한 정보를 천천히 읽어 보세요.");

                    return (
                      <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div className="max-w-2xl">
                          <p className="font-eyebrow text-xs tracking-[0.5em] uppercase text-[#C9A961] mb-4">
                            — {eyebrow}
                          </p>
                          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium text-[#2A2520] tracking-tight break-keep leading-tight mb-4">
                            {title}
                          </h2>
                          <p className="text-base text-[#6B6258] leading-relaxed break-keep max-w-xl">
                            {desc}
                          </p>
                        </div>
                        {isSearching && (
                          <button
                            type="button"
                            onClick={() => { setSearchQuery(""); handleNavigate("home"); }}
                            className="font-eyebrow text-[11px] tracking-[0.3em] uppercase text-[#7C2D3B] hover:text-[#5B1F2A] border-b border-[#7C2D3B] pb-1 inline-flex items-center gap-2"
                            aria-label="검색 닫기"
                          >
                            <ArrowRight className="w-3 h-3 rotate-180" /> 검색 닫기
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Category pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-12 border-b border-[#E5DDD0]">
                  <button
                    className={`whitespace-nowrap px-5 py-2.5 font-eyebrow text-[11px] tracking-[0.25em] uppercase transition-colors ${
                      currentPage === "home" && !searchQuery
                        ? "bg-[#7C2D3B] text-[#FAF7F2]"
                        : "text-[#4A4238] hover:bg-[#F4EFE7]"
                    }`}
                    onClick={() => handleNavigate("home")}
                  >
                    전체보기
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`whitespace-nowrap px-5 py-2.5 font-eyebrow text-[11px] tracking-[0.25em] uppercase transition-colors ${
                        currentPage === `category-${cat}`
                          ? "bg-[#7C2D3B] text-[#FAF7F2]"
                          : "text-[#4A4238] hover:bg-[#F4EFE7]"
                      }`}
                      onClick={() => handleNavigate(`category-${cat}`)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Posts grid */}
                {filteredPosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                    {filteredPosts.map((post, idx) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx, 6) * 0.08 }}
                      >
                        <PostCard
                          post={post}
                          onClick={(id) => handleNavigate(`post-${id}`)}
                          index={idx}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-32 text-center border border-dashed border-[#E5DDD0] bg-[#F4EFE7]">
                    <p className="font-display italic text-2xl text-[#7C2D3B] mb-4">
                      검색 결과가 없습니다
                    </p>
                    <p className="text-sm text-[#6B6258] mb-6">다른 검색어로 다시 시도해 보세요.</p>
                    <button
                      className="font-eyebrow text-[11px] tracking-[0.3em] uppercase text-[#7C2D3B] border-b border-[#7C2D3B] pb-1"
                      onClick={() => { setSearchQuery(""); handleNavigate("home"); }}
                    >
                      모든 글 보기 →
                    </button>
                  </div>
                )}
              </motion.section>
            )
          )}
        </AnimatePresence>
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
