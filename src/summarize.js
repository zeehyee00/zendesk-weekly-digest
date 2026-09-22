import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { buildAnnouncementsTable, buildReleaseNotesTable } from './htmlBuilder.js';


class GeminiCallError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GeminiCallError';
    }
}

class GeminiParseError extends Error {
    constructor(message, rawResponse) {
        super(message);
        this.name = 'GeminiParseError';
        this.rawResponse = rawResponse;
    }
}

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
                throw new GeminiCallError(`Gemini API 호출에 최종 실패했습니다: ${error.message}`)
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

    try {
        return JSON.parse(response.text);
    } catch (error) {
        throw new GeminiParseError(
            `[extractAllAnnouncements] Gemini 응답을 JSON으로 파싱하지 못했습니다: ${error.message}`,
            response.text
        );
    }
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
    다음은 Zendesk 공식 릴리즈노트 원문(HTML)입니다. 원문의 제목 구조(h2, h3, h4 태그)를 기준으로 카테고리를 판단해서, 각 카테고리마다 "신규"와 "변경" 내용을 나눠서 한국어로 정리해주세요.

    카테고리 판단 규칙:
    - 원문은 큰 제목(h2)들로 나뉘어 있고, 그 h2 섹션 안에 더 작은 소제목(h3)들이 있을 수도, 없을 수도 있습니다.
    - 오직 h2 제목이 "Knowledge and AI agents"인 경우에만 예외적으로, 그 h2 이름은 카테고리로 쓰지 말고, 그 섹션 안에 있는 h3 소제목들(예: "AI Copilot Procedures", "AI Agents Insights", "AI agents - Advanced", "Knowledge in Agent Workspace", "Knowledge Editor" 등)을 각각 독립된 카테고리로 사용하세요.
    - 그 외 모든 h2 섹션(예: "Contact Center", "Mobile SDKs", "Apps and integrations")은, 그 안에 h3 소제목이 있든 없든 상관없이 **h2 제목 자체를 카테고리로** 사용하세요. h3가 있어도 무시하고 h2로만 묶으세요.
    - "Dependency Updates:" 같은 h4 수준의 하위 소제목과 그 안의 내용(예: 라이브러리/의존성 버전 업데이트 목록)은 카테고리로도, 내용으로도 포함하지 마세요. 완전히 무시하세요.
    - "products with no updates this week" 같은 카테고리는 결과에서 완전히 제외하세요.
    - 카테고리를 서로 합치지 마세요. 각 소제목/제목은 독립된 카테고리 객체가 되어야 합니다.
    - 카테고리 이름은 원문에 쓰인 이름을 그대로 사용하세요 (번역하지 말고 영문 그대로).

    내용 작성 규칙:
    - newItems와 changedItems 안의 내용(설명 텍스트)은 반드시 한국어로 작성하세요.
    - 원문에서 하나의 기능/변경사항으로 구분되는 항목(원문의 각 <li> 단위)마다 배열의 별도 원소로 나누세요. 여러 항목을 한 문자열에 합치지 마세요.
    - 각 항목은 최대 2줄 이내로 읽을 수 있는 간결한 문장이어야 합니다. 해당 없으면 빈 배열([])로 두세요.
    - 예외: 카테고리가 "Apps and integrations"인 경우, 각 항목은 설명 문장이 아니라 "기능/앱 이름 + 핵심 동작" 정도의 짧은 명사구로만 작성하세요. 예: "Aktie Send: WhatsApp 템플릿 메시지 발송", "Public Comment Alert: 공개 답변 전 확인 모달 표시".
    - 설명이나 다른 텍스트 없이 JSON 배열로만 응답하세요.

    원문:
    ${bodyText}

    JSON 형식:
    [{"category": "카테고리명", "newItems": ["항목1", "항목2"], "changedItems": ["항목1"]}, ...]
    `;

    const response = await callGeminiWithRetry(prompt);
    try {
        return JSON.parse(response.text);
    } catch (error) {
        throw new GeminiParseError(
            `[extractAllReleaseNotes] Gemini 응답을 JSON으로 파싱하지 못했습니다: ${error.message}`,
            response.text
        );
    }
}


async function summarizeReleaseNotes(articles) {
    if (articles.length === 0) {
        return buildReleaseNotesTable([]);
    }
    console.log('   - 릴리즈노트를 Gemini로 카테고리별 정리 중...')
    const items = await extractAllReleaseNotes(articles);
    return buildReleaseNotesTable(items);
}


export { summarizeAnnouncements, summarizeReleaseNotes, GeminiCallError, GeminiParseError };