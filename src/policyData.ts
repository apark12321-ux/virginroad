// ────────────────────────────────────────────────────────────
// 정책정보 데이터 — 2026년 최신 신혼부부 정책·금리
// 정책이 바뀌면 이 파일만 수정하면 됩니다.
// 모든 수치는 정부·공공기관 공시 자료 기준 (출처 명시)
// 최종 점검: 2026-05-19
// ────────────────────────────────────────────────────────────

export const POLICY_LAST_UPDATED = "2026-05-19";

// 마감 임박 정책 (D-day 카운터)
export interface DeadlinePolicy {
  title: string;
  deadline: string;          // ISO date
  description: string;
  source: string;
  sourceName: string;
}

export const DEADLINE_POLICIES: DeadlinePolicy[] = [
  {
    title: "결혼세액공제 100만원",
    deadline: "2026-12-31",
    description: "2024~2026년 혼인신고분까지만 적용되는 한시적 제도. 부부 합산 100만원(1인당 50만원)을 세액에서 직접 차감. 생애 1회.",
    source: "https://www.hometax.go.kr",
    sourceName: "홈택스",
  },
  {
    title: "부동산 전자계약 우대금리 0.1%p",
    deadline: "2026-12-31",
    description: "디딤돌·버팀목·신생아특례 대출 신청 시 부동산 전자계약 체결하면 0.1%p 금리 인하. 2026년 12월 31일 신규 접수분까지.",
    source: "https://nhuf.molit.go.kr",
    sourceName: "주택도시기금",
  },
];

// 대출 금리 비교표
export interface LoanRate {
  name: string;
  target: string;
  incomeLimit: string;
  rate: string;
  limit: string;
  note: string;
}

export const LOAN_RATES: LoanRate[] = [
  {
    name: "신생아 특례 디딤돌",
    target: "2년 내 출산 가구",
    incomeLimit: "부부 합산 1.3억",
    rate: "1.8~4.5%",
    limit: "최대 5억",
    note: "우대금리 모두 적용 시 최저 1.2%. 추가 출산 시 최장 15년 특례",
  },
  {
    name: "신혼부부 디딤돌(주택구입)",
    target: "결혼 7년 이내 무주택",
    incomeLimit: "부부 합산 8,500만",
    rate: "2.45~3.55%",
    limit: "최대 4억",
    note: "생애최초·신혼 우대 0.2%p, 청약통장 0.3~0.5%p 중복 가능",
  },
  {
    name: "신생아 특례 버팀목(전세)",
    target: "2년 내 출산 가구",
    incomeLimit: "부부 합산 1.3억",
    rate: "1.1~3.0%",
    limit: "수도권 3억",
    note: "우대금리 적용 시 최저 1.0%. 전세보증금 80% 이내",
  },
  {
    name: "신혼부부 버팀목(전세)",
    target: "결혼 7년 이내 무주택",
    incomeLimit: "부부 합산 7,500만",
    rate: "1.8~2.7%",
    limit: "수도권 3억",
    note: "자녀 있으면 소득 한도 9,000만으로 완화",
  },
];

// 출산 현금 지원
export interface CashSupport {
  name: string;
  amount: string;
  period: string;
  note: string;
}

export const CASH_SUPPORTS: CashSupport[] = [
  { name: "부모급여 (만 0세)", amount: "월 100만원", period: "0~11개월", note: "소득 무관, 출생신고만 하면 지급" },
  { name: "부모급여 (만 1세)", amount: "월 50만원", period: "12~23개월", note: "소득 무관" },
  { name: "첫만남이용권", amount: "200만원", period: "출생 1회", note: "국민행복카드 바우처, 1년 내 사용" },
  { name: "아동수당", amount: "월 10만원", period: "만 8세까지", note: "부모급여와 중복 수급 가능" },
];

// 핵심 정책 변경 사항 (타임라인)
export interface PolicyChange {
  date: string;
  title: string;
  detail: string;
}

export const POLICY_CHANGES: PolicyChange[] = [
  {
    date: "2026.01.01",
    title: "신생아특례 특례금리 조정",
    detail: "특례금리 1.8~4.5%로 적용 (지방 소재 0.2%p 인하). 청약통장 우대금리 적용기준 강화.",
  },
  {
    date: "2025.07.04",
    title: "LTV 70% 규제 강화",
    detail: "수도권·규제지역 주택담보대출 LTV 최대 70%로 축소. 5억 아파트 기준 한도 5,000만원 감소.",
  },
  {
    date: "2025.01.01",
    title: "결혼세액공제 시행",
    detail: "혼인신고 시 부부 합산 100만원 세액공제. 2024~2026년 혼인신고분 한정.",
  },
  {
    date: "2025.1분기",
    title: "모바일 주민등록증 전면 발급",
    detail: "17세 이상 국민 누구나 발급 가능. 신혼부부 행정 처리 간소화.",
  },
];
