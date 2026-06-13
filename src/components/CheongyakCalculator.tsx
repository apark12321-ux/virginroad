import { useState, useMemo } from "react";

interface CalcInput {
  // 신혼특공 가점
  children: 0 | 1 | 2 | 3; // 미성년 자녀 수 (태아 제외)
  marriageYears: number; // 혼인 기간 (개월 단위로 처리)
  jeongyakMonths: number; // 청약통장 납입 회차
  spouseJeongyakMonths: number; // 배우자 청약통장 납입 회차 (50% 합산, 최대 3점)
  noHouseYears: number; // 무주택 기간 (년)
  regionYears: number; // 해당 지역 연속 거주 기간 (년)
  hasNewborn: boolean; // 만 2세 이하 신생아 가구 (2025년 신설 가점)
  isMultiChild: boolean; // 다자녀(3명 이상)
  // 부수: 일반 청약가점제용
  payingFamily: number; // 부양가족 수 (본인 제외)
}

const initialInput: CalcInput = {
  children: 1,
  marriageYears: 3,
  jeongyakMonths: 60,
  spouseJeongyakMonths: 0,
  noHouseYears: 3,
  regionYears: 3,
  hasNewborn: false,
  isMultiChild: false,
  payingFamily: 1,
};

// ── 신혼부부 특공(공공분양) 가점 ──
// 자녀 수: 3명 3점, 2명 2점, 1명 1점, 0명 0점
function childPoints(c: number): number {
  return Math.min(c, 3);
}

// 혼인 기간: 3년 이하 3점, 3~5년 2점, 5~7년 1점, 7년 초과 0점 (참고: 혼인 기간 짧을수록 가점)
function marriagePoints(years: number): number {
  if (years <= 3) return 3;
  if (years <= 5) return 2;
  if (years <= 7) return 1;
  return 0;
}

// 청약통장 납입 회차 (본인): 24회+ 3점, 12~23회 2점, 6~11회 1점, 6회 미만 0점
// 배우자: 본인 점수의 50%, 최대 3점 합산 (2024년 개정)
function jeongyakPoints(mySelf: number, spouse: number): { self: number; spouseAdd: number; total: number } {
  const self = mySelf >= 24 ? 3 : mySelf >= 12 ? 2 : mySelf >= 6 ? 1 : 0;
  const spouseScore = spouse >= 24 ? 3 : spouse >= 12 ? 2 : spouse >= 6 ? 1 : 0;
  const spouseAdd = Math.min(Math.floor(spouseScore * 0.5 * 10) / 10, 3); // 50% 가산
  return { self, spouseAdd, total: Math.min(self + spouseAdd, 6) };
}

// 무주택 기간: 3년 이상 3점, 1~3년 2점, 1년 미만 1점, 유주택 이력 없음 0점
function noHousePoints(years: number): number {
  if (years >= 3) return 3;
  if (years >= 1) return 2;
  if (years > 0) return 1;
  return 0;
}

// 해당 지역 연속 거주: 3년 이상 3점, 1~3년 2점, 1년 미만 1점
function regionPoints(years: number): number {
  if (years >= 3) return 3;
  if (years >= 1) return 2;
  if (years > 0) return 1;
  return 0;
}

// ── 일반 청약가점제 (참고용) ──
// 무주택 기간(가점 최대 32점): 15년 이상 32점, 1년당 약 2점씩 증가 (단순화)
function generalNoHouse(years: number): number {
  if (years >= 15) return 32;
  if (years <= 0) return 0;
  return Math.min(Math.round(2 + years * 2), 32);
}

// 부양가족(최대 35점): 본인+가족 1인당 5점, 0명 5점부터 시작
function generalFamily(count: number): number {
  return Math.min(5 + count * 5, 35);
}

// 청약통장(최대 17점): 15년 이상 17점, 1년당 1점씩
function generalJeongyak(months: number): number {
  const years = months / 12;
  if (years >= 15) return 17;
  if (years <= 0) return 0;
  return Math.min(Math.round(1 + years), 17);
}

export function CheongyakCalculator() {
  const [input, setInput] = useState<CalcInput>(initialInput);

  const result = useMemo(() => {
    // 신혼특공
    const cp = childPoints(input.children);
    const mp = marriagePoints(input.marriageYears);
    const jp = jeongyakPoints(input.jeongyakMonths, input.spouseJeongyakMonths);
    const np = noHousePoints(input.noHouseYears);
    const rp = regionPoints(input.regionYears);
    const newbornBonus = input.hasNewborn ? 3 : 0;
    const multiChildBonus = input.isMultiChild ? 2 : 0;
    const specialTotal = cp + mp + jp.total + np + rp + newbornBonus + multiChildBonus;

    // 일반 청약가점제 (참고)
    const gNoHouse = generalNoHouse(input.noHouseYears);
    const gFamily = generalFamily(input.payingFamily);
    const gJeongyak = generalJeongyak(input.jeongyakMonths);
    const generalTotal = gNoHouse + gFamily + gJeongyak;

    return {
      cp, mp, jp, np, rp, newbornBonus, multiChildBonus, specialTotal,
      gNoHouse, gFamily, gJeongyak, generalTotal,
    };
  }, [input]);

  // 예상 당첨 가능성 판단 (특공 기준)
  const winChance = useMemo(() => {
    const s = result.specialTotal;
    if (s >= 18) return { label: "매우 높음", color: "#15803D", bg: "#DCFCE7" };
    if (s >= 14) return { label: "높음", color: "#1F7A3D", bg: "#D6F4E1" };
    if (s >= 10) return { label: "중간", color: "#B0432F", bg: "#EEF0FB" };
    if (s >= 6) return { label: "낮음", color: "#A04D14", bg: "#FFE0CC" };
    return { label: "매우 낮음", color: "#7A2A1A", bg: "#FFD6CC" };
  }, [result.specialTotal]);

  return (
    <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-8 sm:py-10 bg-white">
      <header className="mb-8">
        <span className="badge-coral mb-3">실용 도구</span>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.025em] text-[#151320] leading-[1.25] mt-3">
          신혼부부 특별공급 가점 계산기
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B5870] leading-[1.7] mt-3 break-keep max-w-2xl">
          본인 가구 조건을 입력하시면 신혼부부 특별공급(공공분양) 가점과 일반 청약가점제 점수를
          동시에 계산해 드립니다. 「주택공급에 관한 규칙」과 신혼특공 운영지침을 토대로 했으며,
          단지별·지역별 세부 가점은 청약홈 공고문을 함께 확인하세요.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        {/* 입력 */}
        <section className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
          <h2 className="text-[18px] font-bold text-[#151320] mb-5">조건 입력</h2>

          <div className="space-y-5">
            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                미성년 자녀 수
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setInput({ ...input, children: c as 0 | 1 | 2 | 3, isMultiChild: c >= 3 })}
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

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                혼인 기간: <span className="text-[#E8745F]">{input.marriageYears}년</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={input.marriageYears}
                onChange={(e) => setInput({ ...input, marriageYears: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
              <div className="flex justify-between text-[11px] text-[#8A87A0] mt-1">
                <span>혼인 직후</span>
                <span>7년 초과 (가점 0)</span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                본인 청약통장 납입 회차: <span className="text-[#E8745F]">{input.jeongyakMonths}회</span>
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
              <div className="flex justify-between text-[11px] text-[#8A87A0] mt-1">
                <span>미가입</span>
                <span>24회+ (3점)</span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                배우자 청약통장 납입 회차: <span className="text-[#E8745F]">{input.spouseJeongyakMonths}회</span>
                <span className="block text-[11px] text-[#8A87A0] font-normal mt-0.5">2024년 개정: 배우자 점수의 50% 합산 (최대 3점)</span>
              </label>
              <input
                type="range"
                min={0}
                max={120}
                step={6}
                value={input.spouseJeongyakMonths}
                onChange={(e) => setInput({ ...input, spouseJeongyakMonths: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                무주택 기간: <span className="text-[#E8745F]">{input.noHouseYears}년</span>
              </label>
              <input
                type="range"
                min={0}
                max={15}
                step={1}
                value={input.noHouseYears}
                onChange={(e) => setInput({ ...input, noHouseYears: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
              <div className="flex justify-between text-[11px] text-[#8A87A0] mt-1">
                <span>유주택</span>
                <span>15년+ (일반가점 32점)</span>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                해당 지역 연속 거주: <span className="text-[#E8745F]">{input.regionYears}년</span>
              </label>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={input.regionYears}
                onChange={(e) => setInput({ ...input, regionYears: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#3F3D56] mb-2">
                부양가족 (본인 제외, 일반가점용): <span className="text-[#E8745F]">{input.payingFamily}명</span>
              </label>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={input.payingFamily}
                onChange={(e) => setInput({ ...input, payingFamily: Number(e.target.value) })}
                className="w-full accent-[#E8745F]"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={input.hasNewborn}
                onChange={(e) => setInput({ ...input, hasNewborn: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#E8745F]"
              />
              <span className="text-[13.5px] text-[#1E1B2E] leading-[1.5]">
                <strong className="font-bold">신생아 가구</strong> (만 2세 이하 자녀)
                <span className="block text-[12px] text-[#8A87A0] mt-0.5">2024년 신설된 신생아 우선공급 가산점 (+3점)</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={input.isMultiChild}
                onChange={(e) => setInput({ ...input, isMultiChild: e.target.checked })}
                className="mt-1 w-4 h-4 accent-[#E8745F]"
              />
              <span className="text-[13.5px] text-[#1E1B2E] leading-[1.5]">
                <strong className="font-bold">다자녀 가구</strong> (3명 이상)
                <span className="block text-[12px] text-[#8A87A0] mt-0.5">자녀 3명 이상 시 별도 가산 (+2점)</span>
              </span>
            </label>
          </div>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          <div
            className="rounded-[14px] p-6 sm:p-7 border"
            style={{ backgroundColor: winChance.bg, borderColor: winChance.color + "40" }}
          >
            <div
              className="text-[12px] font-bold uppercase tracking-[0.1em] mb-2"
              style={{ color: winChance.color }}
            >
              신혼부부 특별공급 예상 가점
            </div>
            <div className="flex items-baseline gap-3">
              <span
                className="text-[44px] sm:text-[52px] font-bold tracking-[-0.03em] leading-none"
                style={{ color: winChance.color }}
              >
                {result.specialTotal}
              </span>
              <span className="text-[20px] font-bold" style={{ color: winChance.color }}>
                점
              </span>
              <span
                className="text-[11px] bg-white px-2 py-0.5 rounded-full font-medium ml-auto"
                style={{ color: winChance.color }}
              >
                당첨 가능성: {winChance.label}
              </span>
            </div>
            <div className="text-[13px] mt-2" style={{ color: winChance.color + "CC" }}>
              자녀·혼인·청약통장·무주택·거주·신생아·다자녀 가점 합산
            </div>
          </div>

          <div className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
            <h3 className="text-[15px] font-bold text-[#151320] mb-4">신혼특공 항목별 가점</h3>
            <div className="space-y-2 text-[13.5px]">
              <ScoreRow label="자녀 수" value={result.cp} max={3} />
              <ScoreRow label="혼인 기간 (짧을수록 유리)" value={result.mp} max={3} />
              <ScoreRow
                label={`본인 청약통장 (${input.jeongyakMonths}회)`}
                value={result.jp.self}
                max={3}
              />
              {result.jp.spouseAdd > 0 && (
                <ScoreRow
                  label="배우자 청약통장 50% 가산"
                  value={result.jp.spouseAdd}
                  max={3}
                  faint
                />
              )}
              <ScoreRow label="무주택 기간" value={result.np} max={3} />
              <ScoreRow label="해당 지역 거주" value={result.rp} max={3} />
              {result.newbornBonus > 0 && (
                <ScoreRow label="신생아 가구 가산" value={result.newbornBonus} max={3} />
              )}
              {result.multiChildBonus > 0 && (
                <ScoreRow label="다자녀 가구 가산" value={result.multiChildBonus} max={2} />
              )}
              <div className="flex justify-between pt-2.5 mt-1 border-t border-[#EEF0FB]">
                <span className="font-bold text-[#151320]">합계</span>
                <span className="font-bold text-[#E8745F] text-[16px]">
                  {result.specialTotal}점
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E4F0] rounded-[14px] p-5 sm:p-6">
            <h3 className="text-[15px] font-bold text-[#151320] mb-1">참고: 일반 청약가점제</h3>
            <p className="text-[12px] text-[#8A87A0] mb-4 leading-[1.5]">
              신혼특공이 안 될 때 일반 청약(추첨제 외) 도전 시의 예상 점수
            </p>
            <div className="space-y-2 text-[13.5px]">
              <ScoreRow label="무주택 기간" value={result.gNoHouse} max={32} faint />
              <ScoreRow label="부양가족" value={result.gFamily} max={35} faint />
              <ScoreRow label="청약통장 가입 기간" value={result.gJeongyak} max={17} faint />
              <div className="flex justify-between pt-2.5 mt-1 border-t border-[#EDEEF7]">
                <span className="font-bold text-[#3F3D56]">합계 (84점 만점)</span>
                <span className="font-bold text-[#3F3D56] text-[16px]">{result.generalTotal}점</span>
              </div>
              <p className="text-[12px] text-[#8A87A0] pt-2 leading-[1.55]">
                인기 단지 일반 청약 당첨 커트라인은 보통 60점 이상입니다. 신혼특공 가점이 낮다면
                일반 청약 추첨제 물량을 노리는 전략도 함께 검토하세요.
              </p>
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
            본 계산기는 <strong className="text-[#3F3D56]">「주택공급에 관한 규칙」 별표1 가점 산정 기준</strong>과
            신혼부부 특별공급 운영지침의 표준 가점 체계를 토대로 작성됐습니다. 2024년 개정으로 도입된
            배우자 청약통장 50% 합산, 신생아 가구 가산점도 반영됐습니다.
          </p>
          <p>
            <strong className="text-[#3F3D56]">계산기 한계:</strong> 실제 단지별 가점표는 공공·민영
            여부, 공급 지역, 모집공고 시점에 따라 세부 기준이 다릅니다. 특히 동점자 처리 우선순위
            (자녀 수 &gt; 무주택 기간 &gt; 청약통장 순), 임신·태아 인정 여부, 부모님 60세 이상 동거
            가구의 무주택 인정 등은 공고문 우선이며 본 계산기에는 반영되지 않습니다. 신청 직전 청약홈
            공식 가점 계산기와 단지 공고문을 반드시 함께 확인하세요.
          </p>
          <p className="pt-2">
            <strong className="text-[#3F3D56]">참고 출처:</strong>{" "}
            <a href="https://www.applyhome.co.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">청약홈(applyhome.co.kr) 공식 가점 계산기</a>
            {" · "}
            <a href="https://www.law.go.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">주택공급에 관한 규칙(법제처)</a>
            {" · "}
            <a href="https://www.molit.go.kr" rel="noopener noreferrer" className="text-[#D45A45] underline underline-offset-2">국토교통부 신혼부부 특별공급 운영지침</a>
          </p>
          <p className="text-[12px] text-[#8A87A0] pt-2">
            버진로드 편집부 · 최종 갱신 2026.05.31
          </p>
        </div>
      </section>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  max,
  faint = false,
}: {
  label: string;
  value: number;
  max: number;
  faint?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3 py-1">
      <span className={`text-[13px] flex-shrink-0 ${faint ? "text-[#8A87A0]" : "text-[#3F3D56]"} w-[45%]`}>
        {label}
      </span>
      <div className="flex-1 h-[6px] bg-[#EDEEF7] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${faint ? "bg-[#B5B3C8]" : "bg-[#E8745F]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-[13px] font-bold tabular-nums w-[60px] text-right ${faint ? "text-[#5B5870]" : "text-[#151320]"}`}
      >
        {value}/{max}점
      </span>
    </div>
  );
}
