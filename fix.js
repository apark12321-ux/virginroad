
const fs = require('fs');
const FILE_PATH = 'src/constants.ts';
let content = fs.readFileSync(FILE_PATH, 'utf8');

// 1. Fix the finance-6 sandwich
content = content.replace(/<h3\s+id: "finance-6",/g, '      <h3>결론: 여러분에게 맞는 방식은?</h3>\n    `,\n    category: "전월세",\n    author: "하우징허브 편집팀",\n    date: "2026-03-25",\n    readTime: "20분",\n    hashtags: ["묵시적갱신", "재계약", "중개수수료", "전세계약해지", "복비계산"]\n  },\n  {\n    id: "finance-6",');

// 2. Fix the line 601 corruption (it has special chars)
content = content.replace(/image: ".*?",.*현명한 판단을 내릴 수 있도록 하우징허브가 돕겠습니다.<\/p>/, '      <p>현명한 판단을 내릴 수 있도록 하우징허브가 돕겠습니다.</p>');

// 3. Fix the sub-4/sub-9 mix artifacts
content = content.replace(/뉴:홈/, '뉴:홈 정책은 청년들에게 내 집 마련의 기회를 제공하는 중요한 정책입니다.');
content = content.replace(/hashtags:\s+\["청년주택드림통장",\s+"청약통장전환",\s+"저금리대출",\s+"청년지원",\s+"재테크"\]/, 'hashtags: ["뉴홈", "공공분양", "내집마련", "주거지원", "청약"]');

// 4. Fix the sub-10 artifacts
content = content.replace(/유망 단지은/, '유망 단지를 찾는 것이 현실적인 대안입니다.');

// 5. Remove any other garbage visible in grep
content = content.replace(/image: ".*?",\n\s+`/, '      <p>부동산 정보의 중심, 하우징허브와 함께하세요.</p>\n    `');

// 6. Remove all image lines
const lines = content.split('\n');
const finalLines = lines.filter(line => !line.trim().startsWith('image: '));

fs.writeFileSync(FILE_PATH, finalLines.join('\n'));
console.log('Finished fixing src/constants.ts');
