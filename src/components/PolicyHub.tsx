import {
  POLICY_LAST_UPDATED,
  DEADLINE_POLICIES,
  LOAN_RATES,
  CASH_SUPPORTS,
  POLICY_CHANGES,
} from "../policyData";
import { Calendar, TrendingDown, Gift, FileText, AlertCircle, ExternalLink } from "lucide-react";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface PolicyHubProps {
  compact?: boolean;            // true = 홈 요약 카드, false = 전체 페이지
  onNavigate?: (page: string) => void;
}

export function PolicyHub({ compact = false, onNavigate }: PolicyHubProps) {
  // ───────────── 홈 요약 버전 ─────────────
  if (compact) {
    return (
      <section className="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-16 border-t border-[#E2E4F0]">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-[#E8745F] rounded-full" />
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#E8745F]">
                Policy Hub
              </p>
            </div>
            <h2 className="text-[24px] sm:text-[30px] font-bold text-[#1E1B2E] tracking-[-0.025em]">
              📊 최신 정책·금리 한눈에
            </h2>
            <p className="text-[13px] text-[#5B5870] mt-1">
              가정에 바로 영향 주는 핵심 정책을 항상 최신으로 정리해요 · 정부 공식 자료 기준
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("policy")}
              className="text-[13px] font-bold text-[#4F46E5] hover:text-[#3730A3] inline-flex items-center gap-1.5 bg-[#EEF0FB] hover:bg-[#E2E4F0] px-4 py-2 rounded-full transition-all whitespace-nowrap cursor-pointer"
            >
              전체 정책 보기
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* D-day 카드 + 금리 미니 테이블 */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* 마감 임박 */}
          <div className="lg:col-span-5 space-y-4">
            {DEADLINE_POLICIES.map((p) => {
              const d = daysUntil(p.deadline);
              return (
                <div key={p.title} className="card-warm p-5 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge-coral">
                      <Calendar className="w-3 h-3 text-[#3730A3]" /> 마감 임박
                    </span>
                    <span className="text-[20px] font-bold text-[#E8745F] tabular-nums">
                      D-{d > 0 ? d : 0}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1E1B2E] mb-1.5">{p.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-[#5B5870] break-keep">
                    {p.description}
                  </p>
                  <p className="text-[11px] text-[#8A87A0] mt-3">
                    마감 {p.deadline.replace(/-/g, ". ")} · 출처 {p.sourceName}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 대출 금리 미니 테이블 */}
          <div className="lg:col-span-7 card-warm p-5 overflow-hidden bg-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-[#E8745F]" />
              <h3 className="text-[15px] font-bold text-[#1E1B2E]">2026 신혼부부 대출 금리</h3>
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E2E4F0]">
                    <th className="pb-2 text-[11px] font-bold text-[#8A87A0] uppercase">상품</th>
                    <th className="pb-2 text-[11px] font-bold text-[#8A87A0] uppercase">금리</th>
                    <th className="pb-2 text-[11px] font-bold text-[#8A87A0] uppercase">한도</th>
                  </tr>
                </thead>
                <tbody>
                  {LOAN_RATES.map((l) => (
                    <tr key={l.name} className="border-b border-[#EDEEF7] last:border-0">
                      <td className="py-2.5 text-[13px] font-semibold text-[#1E1B2E] break-keep">{l.name}</td>
                      <td className="py-2.5 text-[13px] font-bold text-[#E8745F] whitespace-nowrap">{l.rate}</td>
                      <td className="py-2.5 text-[13px] text-[#5B5870] whitespace-nowrap">{l.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#8A87A0] mt-3">
              출처: 주택도시기금·한국주택금융공사 공시 ({POLICY_LAST_UPDATED.replace(/-/g, ". ")} 기준)
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ───────────── 전체 페이지 버전 ─────────────
  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 lg:py-14 bg-white">
      {/* 헤더 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-coral">
            <FileText className="w-3 h-3 text-[#3730A3]" /> Policy Hub
          </span>
          <span className="text-[12px] text-[#8A87A0]">
            최종 업데이트 {POLICY_LAST_UPDATED.replace(/-/g, ". ")}
          </span>
        </div>
        <h1 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.03em] text-[#1E1B2E] mb-3 break-keep">
          2026 가정경제·생활정책 한눈에
        </h1>
        <p className="text-[15px] leading-[1.7] text-[#3F3D56] max-w-2xl break-keep">
          대출 금리, 세금 혜택, 출산 지원금처럼 가정에 바로 영향을 주는 정책을
          정부·공공기관 공식 자료 기준으로 모았어요. 정책이 바뀌면 그때그때 업데이트합니다.
        </p>
      </div>

      {/* 마감 임박 정책 */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <AlertCircle className="w-5 h-5 text-[#E8745F]" />
          <h2 className="text-[20px] font-bold text-[#1E1B2E]">마감 임박 — 놓치면 못 받습니다</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {DEADLINE_POLICIES.map((p) => {
            const d = daysUntil(p.deadline);
            return (
              <div key={p.title} className="card-warm p-6 relative overflow-hidden bg-white">
                <div className="absolute top-0 right-0 gradient-coral text-white px-4 py-2 rounded-bl-xl">
                  <span className="text-[18px] font-bold tabular-nums">D-{d > 0 ? d : 0}</span>
                </div>
                <h3 className="text-[17px] font-bold text-[#1E1B2E] mb-2 pr-16">{p.title}</h3>
                <p className="text-[14px] leading-[1.65] text-[#3F3D56] break-keep mb-4">
                  {p.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-[#EDEEF7]">
                  <span className="text-[12px] text-[#8A87A0]">
                    마감 {p.deadline.replace(/-/g, ". ")}
                  </span>
                  <a
                    href={p.source}
                    rel="noopener noreferrer"
                    className="text-[12px] font-semibold text-[#E8745F] hover:text-[#B0432F] inline-flex items-center gap-1"
                  >
                    {p.sourceName} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 대출 금리 비교 */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="w-5 h-5 text-[#E8745F]" />
          <h2 className="text-[20px] font-bold text-[#1E1B2E]">신혼부부 대출 금리 비교</h2>
        </div>
        <div className="card-warm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EEF0FB]">
                  <th className="px-4 py-3 text-[12px] font-bold text-[#1E1B2E]">상품</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-[#1E1B2E]">대상</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-[#1E1B2E] whitespace-nowrap">소득 한도</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-[#1E1B2E]">금리</th>
                  <th className="px-4 py-3 text-[12px] font-bold text-[#1E1B2E]">한도</th>
                </tr>
              </thead>
              <tbody>
                {LOAN_RATES.map((l) => (
                  <tr key={l.name} className="border-b border-[#EDEEF7] last:border-0 align-top">
                    <td className="px-4 py-3.5 text-[13px] font-bold text-[#1E1B2E] break-keep">{l.name}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#3F3D56] break-keep">{l.target}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#3F3D56] whitespace-nowrap">{l.incomeLimit}</td>
                    <td className="px-4 py-3.5 text-[13px] font-bold text-[#E8745F] whitespace-nowrap">{l.rate}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#3F3D56] whitespace-nowrap">{l.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {LOAN_RATES.map((l) => (
            <p key={l.name} className="text-[12px] text-[#8A87A0] leading-[1.5]">
              <span className="font-semibold text-[#5B5870]">{l.name}:</span> {l.note}
            </p>
          ))}
        </div>
        <p className="text-[11px] text-[#8A87A0] mt-3">
          출처: 주택도시기금(nhuf.molit.go.kr)·한국주택금융공사(hf.go.kr) 공시 · {POLICY_LAST_UPDATED.replace(/-/g, ". ")} 기준
        </p>
      </section>

      {/* 출산 현금 지원 */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Gift className="w-5 h-5 text-[#E8745F]" />
          <h2 className="text-[20px] font-bold text-[#1E1B2E]">출산 현금 지원 — 출생신고만 하면</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CASH_SUPPORTS.map((c) => (
            <div key={c.name} className="card-warm p-5 bg-white">
              <h3 className="text-[14px] font-bold text-[#1E1B2E] mb-1 break-keep">{c.name}</h3>
              <p className="text-[22px] font-bold text-[#E8745F] mb-1">{c.amount}</p>
              <p className="text-[12px] text-[#8A87A0] mb-2">{c.period}</p>
              <p className="text-[12px] leading-[1.5] text-[#5B5870] break-keep">{c.note}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#8A87A0] mt-3">
          출처: 보건복지부·복지로(bokjiro.go.kr) · 첫 해 누적 약 1,520만원 (지자체 추가 지원 별도)
        </p>
      </section>

      {/* 정책 변경 타임라인 */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="w-5 h-5 text-[#E8745F]" />
          <h2 className="text-[20px] font-bold text-[#1E1B2E]">최근 정책 변경 타임라인</h2>
        </div>
        <div className="card-warm p-6 bg-white">
          <ul className="space-y-5">
            {POLICY_CHANGES.map((c, idx) => (
              <li key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#E8745F] mt-1.5 shrink-0" />
                  {idx < POLICY_CHANGES.length - 1 && (
                    <div className="w-[2px] flex-1 bg-[#E2E4F0] mt-1" />
                  )}
                </div>
                <div className="pb-2">
                  <span className="text-[12px] font-bold text-[#E8745F] tabular-nums">{c.date}</span>
                  <h3 className="text-[15px] font-bold text-[#1E1B2E] mt-0.5 mb-1 break-keep">{c.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-[#3F3D56] break-keep">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 면책 */}
      <div className="bg-[#F5F6FD] border border-[#E2E4F0] rounded-xl p-5">
        <p className="text-[12px] leading-[1.7] text-[#8A87A0] break-keep">
          본 정보는 정부·공공기관 공시 자료를 바탕으로 정리한 참고용 자료입니다. 실제 대출 금리·한도·자격은
          개인 신용, 소득, 주택 조건에 따라 달라질 수 있으며, 정책은 예고 없이 변경될 수 있습니다. 신청 전
          반드시 해당 기관(주택도시기금, 한국주택금융공사, 홈택스, 복지로 등)의 공식 안내를 확인하시기 바랍니다.
        </p>
      </div>
    </div>
  );
}
