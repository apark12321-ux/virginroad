
import { useState, useEffect } from "react";
import { Search, X, Menu } from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  searchQuery?: string;
}

// Logo: interlocking rings filled with coral gradient
function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8745F" />
          <stop offset="100%" stopColor="#D45A45" />
        </linearGradient>
      </defs>
      <circle cx="13" cy="18" r="9.5" stroke="url(#ringGrad)" strokeWidth="2.5" />
      <circle cx="23" cy="18" r="9.5" stroke="#1E1B2E" strokeWidth="2.5" />
    </svg>
  );
}

export function Navbar({ onSearch, onNavigate, searchQuery = "" }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goHome = () => {
    onSearch("");
    onNavigate("home");
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: "신혼금융", page: "category-신혼금융", icon: "💰" },
    { label: "신혼가전", page: "category-신혼가전", icon: "🏠" },
    { label: "결혼준비", page: "category-결혼준비", icon: "💍" },
    { label: "정책정보", page: "policy", icon: "📊" },
    { label: "금리 계산기", page: "tools-didimdol", icon: "🧮" },
    { label: "가점 계산기", page: "tools-cheongyak", icon: "🎯" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-[#FAFBFF]/95 backdrop-blur-sm transition-shadow duration-200 ${
          isScrolled ? "border-b border-[#E2E4F0] shadow-sm" : "border-b border-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="flex items-center justify-between h-[68px]">
            {/* Logo */}
            <button
              onClick={goHome}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
              id="site-logo"
              aria-label="홈코노미뉴스 홈"
            >
              <LogoIcon className="w-8 h-8 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[17px] font-bold tracking-[-0.02em] text-[#1E1B2E]">
                    홈코노미뉴스
                  </span>
                  <span className="text-[10px] font-medium text-[#E8745F] tracking-[0.1em] uppercase">
                    Homeconomy News
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#8A87A0] mt-1">
                  가정경제·생활정책 전문 미디어
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  className="px-4 py-2 text-[14px] font-semibold text-[#3F3D56] hover:text-[#4F46E5] hover:bg-[#EEF0FB] rounded-lg transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right */}
            <div className="flex items-center gap-1">
              {/* Desktop search */}
              <div className="hidden md:block relative">
                {isSearchOpen ? (
                  <div className="flex items-center bg-[#F5F6FD] rounded-lg pl-3 pr-1 h-10 w-64 border border-[#E2E4F0]">
                    <Search className="w-4 h-4 text-[#8A87A0] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      placeholder="검색어를 입력하세요"
                      className="bg-transparent border-0 outline-none text-[14px] text-[#1E1B2E] placeholder:text-[#8A87A0] flex-1 px-2"
                    />
                    <button
                      onClick={() => {
                        onSearch("");
                        setIsSearchOpen(false);
                      }}
                      className="p-1.5 rounded text-[#8A87A0] hover:text-[#4F46E5] hover:bg-white transition-colors"
                      aria-label="검색 닫기"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2.5 rounded-lg text-[#3F3D56] hover:text-[#4F46E5] hover:bg-[#EEF0FB] transition-colors"
                    aria-label="검색"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile: hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="md:hidden p-2.5 rounded-lg text-[#3F3D56] hover:bg-[#EEF0FB] transition-colors"
                aria-label="메뉴"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E4F0] bg-white">
            <div className="px-5 py-4 space-y-1">
              <div className="flex items-center bg-[#F5F6FD] rounded-lg pl-3 pr-1 h-11 mb-3 border border-[#E2E4F0]">
                <Search className="w-4 h-4 text-[#8A87A0] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="검색어를 입력하세요"
                  className="bg-transparent border-0 outline-none text-[15px] text-[#1E1B2E] placeholder:text-[#8A87A0] flex-1 px-2"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearch("")}
                    className="p-1.5 rounded text-[#8A87A0] hover:text-[#4F46E5]"
                    aria-label="검색어 지우기"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {navItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-3 text-[16px] font-semibold text-[#1E1B2E] hover:bg-[#EEF0FB] hover:text-[#4F46E5] rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="h-[68px]" />
    </>
  );
}
