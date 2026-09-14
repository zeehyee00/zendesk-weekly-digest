import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { buildAnnouncementsTable, buildReleaseNotesTable } from './htmlBuilder.js';


// Gemni API key 등록
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 표 스타일 지정
const HEADER_STYLE = 'background-color:#1f4e2c;color:#ffffff;padding:8px;';
const CELL_STYLE = 'padding:8px;vertical-align:top;';

// API 호출 실패 시 재시도 설정
async function callGeminiWithRetry(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash-lite',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                },
            });
            return response;
        } catch (error) {
            console.log(`   Gemini 호출 실패 (${attempt}/${maxRetries}차 시도):`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
        }
    }
}

//  --- announcements --- //

async function extractAllAnnouncements(articles) {
    let articlesText = '';
    articles.forEach((article, index) => {
        articlesText += `\n--- 글 ${index + 1} ---\n`;
        articlesText += `제목: ${article.title}\n`;
        articlesText += `링크: ${article.html_url}\n`;
        articlesText += `본문: ${article.body}\n`;
    });

    const prompt = `
다음은 Zendesk 공식 공지사항 글 ${articles.length}개입니다. 각 글마다 아래 항목들을 추출해서, 글 순서대로 된 JSON 배열로만 응답해주세요. 설명이나 다른 텍스트는 절대 포함하지 마세요.

각 글의 항목:
- topic: 글의 핵심 주제를 한국어로 한 줄 요약
- url: 그 글의 링크 (주어진 링크 그대로)
- announceDate: 발표일 (YYYY.MM.DD 형식, 못 찾으면 "확인필요")
- deployStart: 배포 시작일 (YYYY.MM.DD 형식, 못 찾으면 "확인필요")
- deployEnd: 배포 종료일 (YYYY.MM.DD 형식, 없으면 "해당없음")
- whatChanges: 무엇이 변경되는지 한국어로 2~3문장 요약
- reason: 변경 이유를 한국어로 1~2문장 요약
- action: 사용자가 취해야 할 조치사항, 없으면 "별도 조치 불필요"

${articlesText}

JSON 배열 형식 (글 ${articles.length}개만큼의 배열):
[{"topic": "", "url": "", "announceDate": "", "deployStart": "", "deployEnd": "", "whatChanges": "", "reason": "", "action": ""}, ...]
`;

    const response = await callGeminiWithRetry(prompt);
    return JSON.parse(response.text);
}


async function summarizeAnnouncements(articles) {
    if (articles.length === 0) {
        return buildAnnouncementsTable([]);
    }

    console.log(`   - ${articles.length}개 글을 한 번에 Gemini로 요약 요청 중...`);
    const items = await extractAllAnnouncements(articles);
    return buildAnnouncementsTable(items);
}


// ── ReleaseNotes ── //

async function extractAllReleaseNotes(articles) {
    let bodyText = '';

    articles.forEach((article) => {
        bodyText += `\n${article.body}\n`;
    });

    const prompt = `
        다음은 Zendesk 공식 릴리즈노트 원문입니다. 이 안의 내용을 기능 카테고리별로 분류하고, 각 카테고리마다 "신규"와 "변경" 내용을 나눠서 한국어로 정리해주세요.

    규칙:
    - 원문에 등장하는 카테고리(예: AI Agents, Knowledge, Help Center, Voice, Apps and integrations 등)을 절대 서로 합치지 말고, 각각 독립된 항목으로 분리하세요.
        예를 들어 원문에 "Knowledge and AI agents" 제목 아래 "AI Agents", "Knowledge", "Help Center"가 각각 별도 섹션으로 있다면, 결과 JSON에도 반드시 "AI Agents", "Knowledge", "Help Center" 3개의 별도 객체로 나와야 합니다. "Knowledge and AI agents"처럼 여러 카테고리명을 하나로 합쳐서 쓰지 마세요.
    - 카테고리 이름은 원문에 쓰인 이름을 그대로 사용하세요 (번역하지 말고 영문 그대로, 예: "AI Agents", "Voice", "Apps and integrations").
    - "이번 주에 업데이트 없음" 같은 카테고리(예: "products with no updates this week")는 결과에서 완전히 제외하세요.
    - newItems와 changedItems는 각각 "짧은 항목들의 배열"로 응답하세요. 각 항목(문자열 하나)은 최대 2줄 이내로 읽을 수 있는 간결한 문장이어야 합니다. 해당 없으면 빈 배열([])로 두세요.
    - 원문에서 하나의 기능/변경사항으로 구분되는 건마다 배열의 별도 원소로 나누세요. 여러 개의 기능 변경사항을 한 문자열에 합쳐서 넣지 마세요 — 각 사실(fact) 하나당 배열 원소 하나입니다. (예: 원문에 "Agentic Messaging"과 "Agentic Email" 두 가지 변경이 있으면, newItems 배열에 두 개의 별도 문자열로 나와야 합니다.)
    - 예외: 카테고리가 "Apps and integrations"인 경우, 각 항목은 설명 문장이 아니라 "기능/앱 이름 + 핵심 동작" 정도의 짧은 명사구로만 작성하세요. 예: "Aisle 테마 추가", "CXConnect: WhatsApp 캠페인 지원"
    - 설명이나 다른 텍스트 없이 JSON 배열로만 응답하세요.

    원문:
    ${bodyText}

    JSON 형식:
    [{"category": "카테고리명", "newItems": ["항목1", "항목2"], "changedItems": ["항목1"]}, ...]
    `;

    const response = await callGeminiWithRetry(prompt);
    return JSON.parse(response.text);
}


async function summarizeReleaseNotes(articles) {
    if (articles.length === 0) {
        return buildReleaseNotesTable([]);
    }
    console.log('   - 릴리즈노트를 Gemini로 카테고리별 정리 중...')
    const items = await extractAllReleaseNotes(articles);
    return buildReleaseNotesTable(items);
}


export { summarizeAnnouncements, summarizeReleaseNotes };