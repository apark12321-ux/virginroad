
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
      <circle cx="23" cy="18" r="9.5" stroke="#2C2419" strokeWidth="2.5" />
    </svg>
  );
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-[#FFF6EE] to-[#FFE9D9] border-t border-[#E8DDCB] mt-24" id="site-footer">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-5"
            >
              <LogoIcon className="w-9 h-9 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[18px] font-bold tracking-[-0.02em] text-[#2C2419]">
                    버진로드
                  </span>
                  <span className="text-[11px] font-medium text-[#E8745F] tracking-[0.1em] uppercase">
                    VirginRoad
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#968670] mt-1.5">
                  신혼부부를 위한 가장 정확한 가이드
                </span>
              </div>
            </button>
            <p className="text-[13px] leading-[1.7] text-[#4A3F30] max-w-md break-keep">
              결혼 준비부터 신혼 자산 형성까지, 두 사람의 새로운 출발에 필요한
              실용 정보를 정성껏 정리해 드립니다. 평균값이 아닌 본인 가구에 맞는 답을 함께 찾아보세요.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="badge-coral">신뢰</span>
              <span className="badge-coral">전문성</span>
              <span className="badge-coral">최신 정책</span>
            </div>
          </div>

          {/* Categories */}
          <div className="col-span-1 md:col-span-3">
            <h4 className="text-[11px] font-bold text-[#E8745F] mb-4 tracking-[0.1em] uppercase">
              카테고리
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("category-신혼금융")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  신혼금융
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-신혼가전")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  신혼가전
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-결혼준비")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  결혼준비
                </button>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="col-span-1 md:col-span-4">
            <h4 className="text-[11px] font-bold text-[#E8745F] mb-4 tracking-[0.1em] uppercase">
              안내
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("announcement")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  공지사항
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("partnership")}
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  제휴 문의
                </button>
              </li>
              <li>
                <a
                  href="mailto:apark12321@gmail.com"
                  className="text-[14px] font-medium text-[#2C2419] hover:text-[#E8745F] transition-colors"
                >
                  apark12321@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Business info — AdSense requirement */}
        <div className="border-t border-[#E8DDCB] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-2">
              <p className="text-[13px] text-[#4A3F30] leading-[1.7]">
                <span className="font-bold text-[#2C2419]">알고파트너스</span>
                <span className="mx-2 text-[#C8BBA8]">·</span>대표 박예준
                <span className="mx-2 text-[#C8BBA8]">·</span>사업자등록번호 450-07-03104
              </p>
              <p className="text-[13px] text-[#4A3F30] leading-[1.7]">
                인천광역시 서구 청라커낼로 270
                <span className="mx-2 text-[#C8BBA8]">·</span>
                <a href="mailto:apark12321@gmail.com" className="hover:text-[#E8745F] transition-colors">
                  apark12321@gmail.com
                </a>
              </p>
              <p className="text-[11px] text-[#968670] pt-2">
                © {currentYear} VirginRoad · 알고파트너스. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => onNavigate("privacy")}
                className="text-[12px] font-bold text-[#E8745F] hover:text-[#B0432F] hover:underline underline-offset-2"
              >
                개인정보처리방침
              </button>
              <button
                onClick={() => onNavigate("terms")}
                className="text-[12px] font-medium text-[#4A3F30] hover:text-[#E8745F] hover:underline underline-offset-2"
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
