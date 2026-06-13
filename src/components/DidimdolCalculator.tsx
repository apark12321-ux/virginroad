import { useState, useMemo } from "react";

type IncomeBand = "low" | "mid" | "high";

interface CalcInput {
  income: IncomeBand; // 소득 구간 (기본금리 결정)
  loanAmount: number; // 대출 희망 금액 (만원)
  loanTerm: number; // 만기 (년)
  children: 0 | 1 | 2 | 3; // 자녀 수
  isNewlywed: boolean; // 결혼 7년 이내
  jeongyak: 0 | 1 | 2 | 3 | 4; // 청약통장 가입연수 (>=10년 → 4 등 단계)
  jeongyakMonths: number; // 청약통장 납입 회차
  eContract: boolean; // 부동산 전자계약
  under30pct: boolean; // 가능액의 30% 이하 신청
}

const initialInput: CalcInput = {
  income: "mid",
  loanAmount: 30000,
  loanTerm: 30,
  children: 1,
  isNewlywed: true,
  jeongyak: 2,
  jeongyakMonths: 60,
  eContract: false,
  under30pct: false,
};

// 한국주택금융공사 2026.05.01 공시 기준 (참고용 추정 구간)
function getBaseRate(income: IncomeBand, term: number): number {
  const base: Record<IncomeBand, number> = {
    low: 2.6, // 소득 4천만원 이하
    mid: 3.1, // 소득 4천~7천
    high: 3.45, // 소득 7천~8.5천
  };
  const termAdj = term <= 15 ? -0.1 : term <= 20 ? 0 : term <= 30 ? 0.1 : 0.2;
  return Math.round((base[income] + termAdj) * 100) / 100;
}

// 자녀 우대 (택1: 신혼 0.2 vs 자녀 0.3/0.5/0.7) — 더 큰 쪽 자동 선택
function getChildDiscount(children: number, isNewlywed: boolean): { rate: number; reason: string } {
  const childRate = children === 0 ? 0 : children === 1 ? 0.3 : children === 2 ? 0.5 : 0.7;
  const newlywedRate = isNewlywed ? 0.2 : 0;
  if (childRate >= newlywedRate && childRate > 0) {
    return { rate: childRate, reason: `자녀 ${children}명 우대` };
  }
  if (newlywedRate > 0) {
    return { rate: newlywedRate, reason: "신혼부부 우대 (혼인 7년 이내)" };
  }
  return { rate: 0, reason: "해당 없음" };
}

// 청약통장 추가우대 (가입연수·납입회차 둘 다 만족해야 더 큰 폭 인정)
function getJeongyakDiscount(years: number, months: number): { rate: number; reason: string } {
  if (years >= 4 && months >= 60) {
    return { rate: 0.5, reason: "청약통장 10년+, 60회차+ (최대)" };
  }
  if (years >= 3 && months >= 36) {
    return { rate: 0.3, reason: "청약통장 5~10년, 36회차+" };
  }
  if (years >= 2 && months >= 24) {
    return { rate: 0.2, reason: "청약통장 3~5년, 24회차+" };
  }
  if (years >= 1) {
    return { rate: 0.1, reason: "청약통장 1~3년" };
  }
  return { rate: 0, reason: "청약통장 우대 미적용" };
}

function fmtMoney(won: number): string {
  if (won >= 10000) {
    const eok = Math.floor(won / 10000);
    const rem = won % 10000;
    if (rem === 0) return `${eok}억원`;
    return `${eok}억 ${rem.toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}만원`;
}

// 월 원리금균등상환액 계산 (만원 단위 입력 → 원 단위 출력)
function calcMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  const P = principal * 10000; // 만원 → 원
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return P / n;
  return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function DidimdolCalculator() {
  const [input, setInput] = useState<CalcInput>(initialInput);

  const result = useMemo(() => {
    const baseRate = getBaseRate(input.income, input.loanTerm);
    const childPart = getChildDiscount(input.children, input.isNewlywed);
    const jyPart = getJeongyakDiscount(input.jeongyak, input.jeongyakMonths);
    const ePart = input.eContract ? 0.1 : 0;
    const u30Part = input.under30pct ? 0.1 : 0;

    const totalDiscount =
      Math.round((childPart.rate + jyPart.rate + ePart + u30Part) * 100) / 100;
    let finalRate = Math.round((baseRate - totalDiscount) * 100) / 100;
    
    //하한선 1.2% 가정
    const hitFloor = finalRate < 1.2;
    if (hitFloor) finalRate = 1.2;

    const monthly = calcMonthlyPayment(input.loanAmount, finalRate, input.loanTerm);
    const baseMonthly = calcMonthlyPayment(input.loanAmount, baseRate, input.loanTerm);
    const monthlySave = baseMonthly - monthly;
    const totalSave = monthlySave * input.loanTerm * 12;

    return {
      baseRate,
      finalRate,
      totalDiscount,
      hitFloor,
      childPart,
      jyPart,
      ePart,
      u30Part,
      monthly,
      baseMonthly,
      monthlySave,
      totalSave,
    };
  }, [input]);

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-8 sm:py-10 bg-white">
      <header className="mb-8">
        <span className="badge-coral mb-3">실용 도구</span>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] text-[#151320] leading-[1.25] mt-3">
          디딤돌 우대금리 계산기
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B5870] leading-[1.7] mt-3 break-keep max-w-2xl">
          본인 가구 조건을 입력하시면 한국주택금융공사 2026년 5월 1일 공시 기준으로
          단계별 우대금리 적용 과정과 월 상환액을 시뮬레이션해 드립니다. 평균값이
          아닌 본인 가구 기준의 답을 확인하세요.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* 입력 영역 */}
        <section className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
          <h2 className="text-[18px] font-bold text-[#151320] mb-5">조건 입력</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                부부 합산 연소득
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["low", "~4천만원"],
                  ["mid", "4~7천만원"],
                  ["high", "7~8.5천만원"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInput({ ...input, income: v })}
                    className={`py-2.5 text-[13px] font-medium rounded-[8px] border transition-colors cursor-pointer ${
                      input.income === v
                        ? "bg-[#E8745F] border-[#E8745F] text-white"
                        : "bg-white border-[#E2E4F0] text-[#3F3D56] hover:border-[#FFD2BD]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                대출 희망 금액: <span className="text-[#E8745F]">{fmtMoney(input.loanAmount)}</span>
              </label>
              <input
                type="range"
                min={5000}
                max={50000}
                step={1000}
                value={input.loanAmount}
                onChange={(e) => setInput({ ...input, loanAmount: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
              <div className="flex justify-between text-[11px] text-[#8A87A0] mt-1">
                <span>5천만원</span>
                <span>5억원(최대)</span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                대출 만기: <span className="text-[#E8745F]">{input.loanTerm}년</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 40].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setInput({ ...input, loanTerm: y })}
                    className={`py-2 text-[13px] font-medium rounded-[8px] border transition-colors cursor-pointer ${
                      input.loanTerm === y
                        ? "bg-[#E8745F] border-[#E8745F] text-white"
                        : "bg-white border-[#E2E4F0] text-[#3F3D56] hover:border-[#FFD2BD]"
                    }`}
                  >
                    {y}년
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                자녀 수
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setInput({ ...input, children: c as 0 | 1 | 2 | 3 })}
                    className={`py-2 text-[13px] font-medium rounded-[8px] border transition-colors cursor-pointer ${
                      input.children === c
                        ? "bg-[#E8745F] border-[#E8745F] text-white"
                        : "bg-white border-[#E2E4F0] text-[#3F3D56] hover:border-[#FFD2BD]"
                    }`}
                  >
                    {c === 3 ? "3명+" : `${c}명`}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={input.isNewlywed}
                onChange={(e) => setInput({ ...input, isNewlywed: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#E8745F]"
              />
              <span className="text-[13.5px] text-[#1E1B2E] leading-[1.5]">
                <strong className="font-bold">결혼 7년 이내</strong> 신혼부부
                <span className="block text-[12px] text-[#8A87A0] mt-0.5">자녀 우대와 비교해 더 큰 쪽만 적용됩니다</span>
              </span>
            </label>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                청약통장 가입 기간
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  [0, "1년 미만"],
                  [1, "1~3년"],
                  [2, "3~5년"],
                  [3, "5~10년"],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setInput({ ...input, jeongyak: v as 0 | 1 | 2 | 3 })}
                    className={`py-2 text-[12.5px] font-medium rounded-[8px] border transition-colors cursor-pointer ${
                      input.jeongyak === v
                        ? "bg-[#E8745F] border-[#E8745F] text-white"
                        : "bg-white border-[#E2E4F0] text-[#3F3D56] hover:border-[#FFD2BD]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2">
                <label className="block text-[12px] text-[#5B5870] mb-1">
                  납입 회차: <span className="font-medium text-[#3F3D56]">{input.jeongyakMonths}회</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={6}
                  value={input.jeongyakMonths}
                  onChange={(e) => setInput({ ...input, jeongyakMonths: Number(e.target.value) })}
                  className="w-full accent-[#E8745F]"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={input.eContract}
                onChange={(e) => setInput({ ...input, eContract: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#E8745F]"
              />
              <span className="text-[13.5px] text-[#1E1B2E] leading-[1.5]">
                <strong className="font-bold">부동산 전자계약</strong> 이용 (0.1%p)
                <span className="block text-[12px] text-[#8A87A0] mt-0.5">국토부 부동산거래 전자계약시스템(irds.kr) 이용 시</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={input.under30pct}
                onChange={(e) => setInput({ ...input, under30pct: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#E8745F]"
              />
              <span className="text-[13.5px] text-[#1E1B2E] leading-[1.5]">
                <strong className="font-bold">가능 한도의 30% 이하 신청</strong> (0.1%p)
                <span className="block text-[12px] text-[#8A87A0] mt-0.5">자기자금 충분히 확보해 소액 대출하는 경우</span>
              </span>
            </label>
          </div>
        </section>

        {/* 결과 영역 */}
        <section className="space-y-4">
          <div className="bg-gradient-to-br from-[#EEF0FB] to-[#F5F6FD] border border-[#FFD2BD] rounded-[14px] p-6 sm:p-7">
            <div className="text-[12px] font-bold text-[#B0432F] uppercase tracking-[0.1em] mb-2">
              최종 적용 예상 금리
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-[44px] sm:text-[52px] font-bold text-[#151320] tracking-[-0.03em] leading-none">
                {result.finalRate.toFixed(2)}
              </span>
              <span className="text-[20px] font-bold text-[#151320]">%</span>
              {result.hitFloor && (
                <span className="text-[11px] text-[#B0432F] bg-white px-2 py-0.5 rounded-full font-medium">
                  하한선 도달
                </span>
              )}
            </div>
            <div className="text-[13px] text-[#5B5870] mt-2">
              기본금리 {result.baseRate.toFixed(2)}%에서 우대 {result.totalDiscount.toFixed(2)}%p 인하
            </div>
          </div>

          <div className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
            <h3 className="text-[15px] font-bold text-[#151320] mb-4">단계별 인하 시뮬레이션</h3>
            <div className="space-y-2.5 text-[13.5px]">
              <div className="flex justify-between items-center pb-2.5 border-b border-[#EDEEF7]">
                <span className="text-[#3F3D56]">기본금리 ({input.income === "low" ? "저소득" : input.income === "mid" ? "중간소득" : "고소득"} · {input.loanTerm}년)</span>
                <span className="font-bold text-[#151320]">{result.baseRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#5B5870]">▼ {result.childPart.reason}</span>
                <span className={result.childPart.rate > 0 ? "font-medium text-[#B0432F]" : "text-[#8A87A0]"}>
                  {result.childPart.rate > 0 ? `-${result.childPart.rate.toFixed(2)}%p` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#5B5870]">▼ {result.jyPart.reason}</span>
                <span className={result.jyPart.rate > 0 ? "font-medium text-[#B0432F]" : "text-[#8A87A0]"}>
                  {result.jyPart.rate > 0 ? `-${result.jyPart.rate.toFixed(2)}%p` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#5B5870]">▼ 부동산 전자계약</span>
                <span className={result.ePart > 0 ? "font-medium text-[#B0432F]" : "text-[#8A87A0]"}>
                  {result.ePart > 0 ? `-${result.ePart.toFixed(2)}%p` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[#5B5870]">▼ 30% 이하 신청</span>
                <span className={result.u30Part > 0 ? "font-medium text-[#B0432F]" : "text-[#8A87A0]"}>
                  {result.u30Part > 0 ? `-${result.u30Part.toFixed(2)}%p` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-[#EEF0FB]">
                <span className="font-bold text-[#151320]">최종 금리</span>
                <span className="font-bold text-[#E8745F] text-[16px]">{result.finalRate.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
            <h3 className="text-[15px] font-bold text-[#151320] mb-4">월 상환액 (원리금균등)</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] text-[#5B5870]">우대 적용 후 월 상환액</span>
                <span className="font-bold text-[20px] text-[#151320] tracking-[-0.02em]">
                  {Math.round(result.monthly).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-baseline text-[12.5px] text-[#8A87A0]">
                <span>기본금리 적용 시</span>
                <span>{Math.round(result.baseMonthly).toLocaleString()}원</span>
              </div>
              <div className="pt-3 mt-3 border-t border-[#EDEEF7] bg-[#F5F6FD] -mx-5 sm:-mx-6 px-5 sm:px-6 pb-3 rounded-b-[14px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[13px] font-bold text-[#B0432F]">총 절감액 ({input.loanTerm}년)</span>
                  <span className="font-bold text-[18px] text-[#B0432F] tracking-[-0.02em]">
                    {Math.round(result.totalSave / 10000).toLocaleString()}만원
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 면책 및 출처 */}
      <section className="mt-10 bg-[#F5F6FD] border border-[#E2E4F0] rounded-[12px] p-5 sm:p-6">
        <h3 className="text-[13px] font-bold text-[#151320] mb-3 uppercase tracking-[0.08em]">
          이 계산기에 대해
        </h3>
        <div className="space-y-2.5 text-[13px] text-[#5B5870] leading-[1.7]">
          <p>
            본 계산기는 <strong className="text-[#3F3D56]">한국주택금융공사 2026년 5월 1일 공시 기준</strong>과 주택도시기금 디딤돌대출 안내 자료를 토대로 작성됐습니다.
            기본금리·우대금리 적용 폭은 정책에 따라 수시로 변경되며, 본인의 신용평점·담보 주택 평가·소득 산정 결과에 따라
            실제 적용 금리는 본 계산 결과와 다를 수 있습니다.
          </p>
          <p>
            <strong className="text-[#3F3D56]">계산기 한계:</strong> 자녀 우대금리는 2025년 3월 24일 신규 접수분부터
            '자녀 1명당 5년, 최대 15년'으로 적용 기간이 제한됩니다. 본 계산기는 전체 만기에 우대가 유지된다는 단순 가정으로
            계산되므로, 실제로는 자녀 연령에 따라 중도에 우대가 종료될 수 있습니다.
            정확한 정보는 신청 직전 공식 사이트에서 반드시 확인하시기 바랍니다.
          </p>
          <p className="pt-2">
            <strong className="text-[#3F3D56]">참고 출처:</strong>{" "}
            <a href="https://www.hf.go.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">한국주택금융공사 디딤돌대출 금리안내</a>
            {" · "}
            <a href="https://nhuf.molit.go.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">주택도시기금포털</a>
            {" · "}
            <a href="https://irds.molit.go.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">부동산거래 전자계약시스템</a>
          </p>
          <p className="text-[12px] text-[#8A87A0] pt-2">
            버진로드 편집부 · 최종 갱신 2026.05.31
          </p>
        </div>
      </section>
    </div>
  );
}
