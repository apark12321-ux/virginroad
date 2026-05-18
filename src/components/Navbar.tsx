
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

interface NavbarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  searchQuery?: string;
}

// Logo: interlocking rings (wedding band motif)
function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="16" r="9" />
      <circle cx="20" cy="16" r="9" />
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
    { label: "신혼금융", page: "category-신혼금융" },
    { label: "신혼가전", page: "category-신혼가전" },
    { label: "결혼준비", page: "category-결혼준비" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-200 ${
          isScrolled ? "border-b border-[#DADADA]" : "border-b border-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="flex items-center justify-between h-16">
            {/* Logo: icon + English wordmark + Korean subline */}
            <button
              onClick={goHome}
              className="flex items-center gap-2.5 text-[#111111] hover:opacity-70 transition-opacity"
              id="site-logo"
              aria-label="버진로드 홈"
            >
              <LogoIcon className="w-7 h-7 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[15px] font-bold tracking-[0.08em] uppercase">
                  VIRGINROAD
                </span>
                <span className="text-[10px] font-medium text-[#888888] mt-1 tracking-wide">
                  버진로드
                </span>
              </div>
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  className="px-4 py-2 text-[14px] font-medium text-[#333333] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right: search + mobile menu */}
            <div className="flex items-center gap-1">
              {/* Desktop search */}
              <div className="hidden md:block relative">
                {isSearchOpen ? (
                  <div className="flex items-center bg-[#F5F5F5] rounded-md pl-3 pr-1 h-9 w-64">
                    <Search className="w-4 h-4 text-[#888888] shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      placeholder="검색어를 입력하세요"
                      className="bg-transparent border-0 outline-none text-[14px] text-[#111111] placeholder:text-[#888888] flex-1 px-2"
                    />
                    <button
                      onClick={() => {
                        onSearch("");
                        setIsSearchOpen(false);
                      }}
                      className="p-1.5 rounded text-[#888888] hover:text-[#111111] hover:bg-[#DADADA]/40 transition-colors"
                      aria-label="검색 닫기"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2.5 rounded-md text-[#333333] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                    aria-label="검색"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile: hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="md:hidden p-2.5 rounded-md text-[#333333] hover:bg-[#F5F5F5] transition-colors"
                aria-label="메뉴"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#DADADA] bg-white">
            <div className="px-5 py-4 space-y-1">
              <div className="flex items-center bg-[#F5F5F5] rounded-md pl-3 pr-1 h-11 mb-3">
                <Search className="w-4 h-4 text-[#888888] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="검색어를 입력하세요"
                  className="bg-transparent border-0 outline-none text-[15px] text-[#111111] placeholder:text-[#888888] flex-1 px-2"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearch("")}
                    className="p-1.5 rounded text-[#888888] hover:text-[#111111]"
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
                  className="block w-full text-left px-3 py-3 text-[16px] font-medium text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="h-16" />
    </>
  );
}
