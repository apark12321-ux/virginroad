
import { useState, useEffect } from "react";
import { Search, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  onSearch: (query: string) => void;
  onNavigate: (page: string) => void;
  searchQuery?: string;
}

export function Navbar({ onSearch, onNavigate, searchQuery = "" }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const goHome = () => {
    onSearch("");
    onNavigate("home");
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E5DDD0] py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={goHome}
            id="site-logo"
          >
            {/* Ornamental V monogram */}
            <div className="relative">
              <div className="w-11 h-11 border border-[#7C2D3B] flex items-center justify-center group-hover:bg-[#7C2D3B] transition-colors duration-300">
                <span className="font-display font-medium text-xl text-[#7C2D3B] group-hover:text-[#FAF7F2] transition-colors duration-300 italic">
                  V
                </span>
              </div>
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C9A961]" />
            </div>

            <div className="flex flex-col leading-none">
              <span className="font-display text-xl sm:text-2xl font-medium text-[#2A2520] tracking-tight">
                버진로드
              </span>
              <span className="font-eyebrow text-[10px] tracking-[0.4em] text-[#7C2D3B] uppercase mt-0.5">
                Virgin · Road
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => onNavigate("category-신혼금융")}
              className="font-eyebrow text-xs tracking-[0.25em] uppercase text-[#4A4238] hover:text-[#7C2D3B] transition-colors relative group"
            >
              신혼금융
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#C9A961] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </button>
            <button
              onClick={() => onNavigate("category-신혼가전")}
              className="font-eyebrow text-xs tracking-[0.25em] uppercase text-[#4A4238] hover:text-[#7C2D3B] transition-colors relative group"
            >
              신혼가전
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#C9A961] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </button>
            <button
              onClick={() => onNavigate("category-결혼준비")}
              className="font-eyebrow text-xs tracking-[0.25em] uppercase text-[#4A4238] hover:text-[#7C2D3B] transition-colors relative group"
            >
              결혼준비
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#C9A961] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </button>
          </div>

          {/* Search + mobile button */}
          <div className="flex items-center gap-2">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B8AC9C] group-focus-within:text-[#7C2D3B]" />
              <Input
                className="pl-9 pr-9 bg-[#F4EFE7] border border-transparent focus-visible:border-[#7C2D3B] focus-visible:ring-0 w-40 md:w-56 rounded-none text-sm placeholder:text-[#B8AC9C] h-9"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#EDE5D6] transition-colors"
                  aria-label="검색어 지우기"
                >
                  <X className="w-3 h-3 text-[#6B6258]" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-[#F4EFE7] rounded-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-[#FAF7F2] border-t border-[#E5DDD0] absolute top-full left-0 right-0 shadow-sm"
          >
            <div className="px-6 py-8 flex flex-col gap-5">
              <button
                onClick={() => {
                  onNavigate("category-신혼금융");
                  setIsMobileMenuOpen(false);
                }}
                className="font-display text-2xl text-[#2A2520] text-left flex items-center gap-3"
              >
                <span className="font-eyebrow text-xs text-[#C9A961] tracking-[0.3em]">01</span>
                신혼금융
              </button>
              <button
                onClick={() => {
                  onNavigate("category-신혼가전");
                  setIsMobileMenuOpen(false);
                }}
                className="font-display text-2xl text-[#2A2520] text-left flex items-center gap-3"
              >
                <span className="font-eyebrow text-xs text-[#C9A961] tracking-[0.3em]">02</span>
                신혼가전
              </button>
              <button
                onClick={() => {
                  onNavigate("category-결혼준비");
                  setIsMobileMenuOpen(false);
                }}
                className="font-display text-2xl text-[#2A2520] text-left flex items-center gap-3"
              >
                <span className="font-eyebrow text-xs text-[#C9A961] tracking-[0.3em]">03</span>
                결혼준비
              </button>

              <div className="pt-4 border-t border-[#E5DDD0]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8AC9C]" />
                  <Input
                    className="pl-9 pr-9 bg-[#F4EFE7] border-none rounded-none"
                    placeholder="검색어를 입력하세요"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#EDE5D6] transition-colors"
                      aria-label="검색어 지우기"
                    >
                      <X className="w-3.5 h-3.5 text-[#6B6258]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
