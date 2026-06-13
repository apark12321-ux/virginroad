interface FooterProps {
  onNavigate: (page: string) => void;
}

function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="footerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8745F" />
          <stop offset="100%" stopColor="#D45A45" />
        </linearGradient>
      </defs>
      <circle cx="13" cy="18" r="9.5" stroke="url(#footerRingGrad)" strokeWidth="2.5" />
      <circle cx="23" cy="18" r="9.5" stroke="#1E1B2E" strokeWidth="2.5" />
    </svg>
  );
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-[#F5F6FD] to-[#EEF0FB] border-t border-[#E2E4F0] mt-24" id="site-footer">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-5 cursor-pointer"
            >
              <LogoIcon className="w-9 h-9 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-bold tracking-[-0.02em] text-[#1E1B2E]">
                    버진로드
                  </span>
                  <span className="text-[11px] font-medium text-[#E8745F] tracking-[0.1em] uppercase">
                    Virginroad
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#8A87A0] mt-1.5">
                  결혼 준비 & 신혼 금융 생활 백서
                </span>
              </div>
            </button>
            <p className="text-[13px] leading-[1.7] text-[#3F3D56] max-w-md break-keep">
              결혼 준비부터 신혼부부 디딤돌대출, 버팀목대출, 신생아 특례대출 금리 계산기, 청약 가점 시뮬레이션까지 함께하는 신혼 금융 생활 백서, 버진로드입니다.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="badge-coral">정부·공공기관 자료 기반</span>
              <span className="badge-coral">정책 변경 신속 반영</span>
            </div>
          </div>

          {/* Categories */}
          <div className="col-span-1 md:col-span-3">
            <h4 className="text-[11px] font-bold text-[#4F46E5] mb-4 tracking-[0.1em] uppercase">
              카테고리
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("category-신혼금융")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  신혼금융
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-신혼가전")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  신혼가전
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-결혼준비")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  결혼준비
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("policy")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  정책정보
                </button>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="col-span-1 md:col-span-4">
            <h4 className="text-[11px] font-bold text-[#4F46E5] mb-4 tracking-[0.1em] uppercase">
              안내
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("announcement")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  공지사항
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("partnership")}
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors cursor-pointer"
                >
                  제휴 문의
                </button>
              </li>
              <li>
                <a
                  href="mailto:apark12321@gmail.com"
                  className="text-[14px] font-medium text-[#1E1B2E] hover:text-[#4F46E5] transition-colors"
                >
                  apark12321@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Business info — AdSense requirement */}
        <div className="border-t border-[#E2E4F0] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-2">
              <p className="text-[13px] text-[#3F3D56] leading-[1.7]">
                <span className="font-bold text-[#1E1B2E]">상상아트</span>
                <span className="mx-2 text-[#B5B3C8]">·</span>사업자등록번호 272-14-01256
                <span className="mx-2 text-[#B5B3C8]">·</span>통신판매업 신고번호 제2023-화성동탄-1098호
              </p>
              <p className="text-[13px] text-[#3F3D56] leading-[1.7]">
                <a href="mailto:apark12321@gmail.com" className="hover:text-[#4F46E5] transition-colors">
                  apark12321@gmail.com
                </a>
              </p>
              <p className="text-[11px] text-[#8A87A0] pt-2">
                © {currentYear} Virginroad · 상상아트. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => onNavigate("privacy")}
                className="text-[12px] font-bold text-[#E8745F] hover:text-[#B0432F] hover:underline underline-offset-2 cursor-pointer"
              >
                개인정보처리방침
              </button>
              <button
                onClick={() => onNavigate("terms")}
                className="text-[12px] font-medium text-[#3F3D56] hover:text-[#4F46E5] hover:underline underline-offset-2 cursor-pointer"
              >
                이용약관
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
