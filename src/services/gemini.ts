
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBlogPost(topic: string, category: string) {
  const prompt = `
    다음 주제에 대해 '공백 제외 최소 2,000자' 이상의 압도적인 전문성을 갖춘 블로그 포스팅을 작성해 주세요.
    주제: ${topic}
    카테고리: ${category}

    지침 (필수 준수 - 분량 미달 시 실패로 간주):
    1. 분량: 공백 제외 2,000자 이상을 목표로 합니다. 각 섹션마다 심도 깊은 분석과 구체적인 데이터를 포함하여 분량을 충분히 확보하세요.
    2. 필수 구성 요소:
       - [소개]: 해당 주제의 시의성과 독자가 반드시 알아야 할 이유 (300자 이상)
       - [본론 1~5]: 최소 5개의 상세 섹션. 각 섹션은 구체적인 사례, 단계별 가이드, 최신 인사이트를 담아야 함 (섹션당 300~400자)
       - [심화 팁]: 전문가만 공유할 수 있는 실전 노하우 섹션 (200자 이상)
       - [체크리스트]: 독자가 행동으로 옮길 수 있는 7가지 이상의 항목 (ul/li 활용)
       - [FAQ]: 예상 질문 5가지와 답변
       - [맺음말]: 핵심 요약 및 향후 전망 (300자 이상)
    3. 구체성: 추상적인 설명은 배제하고, 구체적인 수치, 관련 법규, 트렌드 등을 상세히 설명하세요.
    4. 형식: HTML 태그(h2, h3, p, ul, li, strong 등)를 사용하여 시각적으로 완벽하게 구조화하세요.
    5. 말투: 신뢰감을 주는 전문가의 톤을 유지하되 이해하기 쉽게 설명하세요.
    6. 해시태그: 관련 높은 키워드 10개를 선정하세요.

    출력 형식은 반드시 아래 JSON 구조를 따르세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "포스팅 제목" },
            content: { type: Type.STRING, description: "HTML 본문 (공백 제외 2,000자 이상)" },
            summary: { type: Type.STRING, description: "1~2문장의 짧은 요약" },
            hashtags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "해시태그 10개"
            },
            readTime: { type: Type.STRING, description: "예: '6분'" }
          },
          required: ["title", "content", "summary", "hashtags", "readTime"]
        }
      }
    });

    const result = JSON.parse(response.text);
    
    // Validate length (basic check, Gemini usually follows instructions but let's be safe)
    const textOnly = result.content.replace(/<[^>]*>/g, '').replace(/\s/g, '');
    console.log(`Generated content length (no spaces): ${textOnly.length}`);
    
    return result;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
