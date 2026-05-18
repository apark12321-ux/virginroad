
import { Mail } from "lucide-react";

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#F4EFE7] border-t border-[#E5DDD0] pt-20 pb-12 mt-24" id="site-footer">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Ornament */}
        <div className="ornament mb-16">
          <span>❦</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-1 md:col-span-5">
            <div
              className="inline-flex items-center gap-3 mb-6 cursor-pointer group"
              onClick={() => onNavigate("home")}
            >
              <div className="relative">
                <div className="w-12 h-12 border border-[#7C2D3B] flex items-center justify-center">
                  <span className="font-display font-medium text-2xl text-[#7C2D3B] italic">V</span>
                </div>
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C9A961]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-2xl font-medium text-[#2A2520]">
                  버진로드
                </span>
                <span className="font-eyebrow text-[10px] tracking-[0.4em] text-[#7C2D3B] uppercase mt-1">
                  Virgin · Road
                </span>
              </div>
            </div>

            <p className="text-sm text-[#6B6258] leading-relaxed mb-6 max-w-md break-keep">
              인생의 새로운 출발을 앞둔 두 사람에게, 결혼 준비부터 신혼 자산 형성까지 가장 현실적인 정보를 정리해 전해 드립니다. 평균값이 아닌 본인 상황에 맞는 답을 찾도록 돕는 것이 버진로드의 목표입니다.
            </p>

            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="w-3.5 h-3.5 text-[#C9A961] shrink-0" />
              <a
                href="mailto:apark12321@gmail.com"
                className="text-[#4A4238] hover:text-[#7C2D3B] transition-colors"
              >
                apark12321@gmail.com
              </a>
            </div>
          </div>

          {/* Sections */}
          <div className="col-span-1 md:col-span-3">
            <h4 className="font-eyebrow text-[11px] tracking-[0.35em] uppercase text-[#7C2D3B] mb-5">
              Sections
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("category-신혼금융")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 신혼금융
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-신혼가전")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 신혼가전
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("category-결혼준비")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 결혼준비
                </button>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="col-span-1 md:col-span-4">
            <h4 className="font-eyebrow text-[11px] tracking-[0.35em] uppercase text-[#7C2D3B] mb-5">
              About
            </h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("announcement")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 공지사항
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("partnership")}
                  className="text-sm text-[#4A4238] hover:text-[#7C2D3B] hover:translate-x-1 transition-all inline-flex items-center gap-2"
                >
                  <span className="text-[#C9A961]">—</span> 제휴 문의
                </button>
              </li>
            </ul>

            <div className="mt-8 p-5 bg-[#FAF7F2] border-l-2 border-[#C9A961]">
              <p className="font-eyebrow text-[10px] tracking-[0.3em] uppercase text-[#7C2D3B] mb-2">
                Editorial Notice
              </p>
              <p className="text-[11px] text-[#6B6258] leading-relaxed break-keep">
                버진로드의 모든 콘텐츠는 일반 정보 제공을 목적으로 합니다. 금융·세무·법률 관련 결정 시에는 반드시 해당 분야 전문가 또는 공공기관의 공식 자료를 함께 확인해 주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        {/* Business info */}
        <div className="border-t border-[#E5DDD0] pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-[11px] text-[#4A4238] font-medium">알고파트너스</span>
                <span className="text-[11px] text-[#6B6258]">대표 박예준</span>
                <span className="text-[11px] text-[#6B6258]">사업자등록번호 450-07-03104</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-[11px] text-[#6B6258]">인천광역시 서구 청라커낼로 270</span>
                <span className="text-[11px] text-[#6B6258]">apark12321@gmail.com</span>
              </div>
              <p className="text-[10px] text-[#B8AC9C] tracking-wider pt-2 font-eyebrow uppercase">
                © {currentYear} Virgin Road · A new beginning, beautifully planned
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button
                className="text-[11px] text-[#4A4238] hover:text-[#7C2D3B] transition-colors font-medium border-b border-[#7C2D3B] pb-0.5"
                onClick={() => onNavigate("privacy")}
              >
                개인정보처리방침
              </button>
              <button
                className="text-[11px] text-[#6B6258] hover:text-[#7C2D3B] transition-colors"
                onClick={() => onNavigate("terms")}
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
