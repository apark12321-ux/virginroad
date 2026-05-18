
interface FooterProps {
  onNavigate: (page: string) => void;
}

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

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#FAFAFA] border-t border-[#DADADA] mt-32" id="site-footer">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 md:gap-6 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-5">
            <button
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2.5 text-[#111111] hover:opacity-70 transition-opacity mb-4"
            >
              <LogoIcon className="w-7 h-7 shrink-0" />
              <div className="flex flex-col items-start leading-none">
                <span className="text-[16px] font-bold tracking-[0.08em] uppercase">
                  VIRGINROAD
                </span>
                <span className="text-[11px] font-medium text-[#888888] mt-1 tracking-wide">
                  버진로드
                </span>
              </div>
            </button>
            <p className="text-[13px] leading-[1.65] text-[#4A4A4A] max-w-md break-keep">
              결혼 준비부터 신혼 자산 형성까지, 두 사람의 새로운 출발에 필요한
              실용 정보를 정리해 드립니다.
            </p>
          </div>

          {/* Categories */}
          <div className="col-span-1 md:col-span-3">
            <h4 className="text-[12px] font-bold text-[#111111] mb-4 tracking-wide">
              카테고리
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate("category-신혼금융")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  신혼금융
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-신혼가전")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  신혼가전
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-결혼준비")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  결혼준비
                </button>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="col-span-1 md:col-span-4">
            <h4 className="text-[12px] font-bold text-[#111111] mb-4 tracking-wide">
              안내
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("announcement")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  공지사항
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("partnership")}
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  제휴 문의
                </button>
              </li>
              <li>
                <a
                  href="mailto:apark12321@gmail.com"
                  className="text-[13px] text-[#4A4A4A] hover:text-[#111111] transition-colors"
                >
                  apark12321@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Business info — AdSense requirement */}
        <div className="border-t border-[#DADADA] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-1.5">
              <p className="text-[12px] text-[#4A4A4A] leading-[1.7]">
                <span className="font-semibold text-[#111111]">알고파트너스</span>
                <span className="mx-2 text-[#DADADA]">·</span>대표 박예준
                <span className="mx-2 text-[#DADADA]">·</span>사업자등록번호 450-07-03104
              </p>
              <p className="text-[12px] text-[#4A4A4A] leading-[1.7]">
                인천광역시 서구 청라커낼로 270
                <span className="mx-2 text-[#DADADA]">·</span>
                <a href="mailto:apark12321@gmail.com" className="hover:text-[#111111]">
                  apark12321@gmail.com
                </a>
              </p>
              <p className="text-[11px] text-[#888888] pt-2">
                © {currentYear} VirginRoad. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-5">
              <button
                onClick={() => onNavigate("privacy")}
                className="text-[12px] font-semibold text-[#111111] hover:underline underline-offset-2"
              >
                개인정보처리방침
              </button>
              <button
                onClick={() => onNavigate("terms")}
                className="text-[12px] text-[#4A4A4A] hover:text-[#111111] hover:underline underline-offset-2"
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
