import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

// Gemni API key 등록
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

// 여러 글을 하나의 프롬프트에 번호 매겨서 다 담기
// 공지사항 요약
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

function buildAnnouncementsTable(items) {
    if (items.length === 0) {
        return '<p>지난주에 변경된 Announcements가 없습니다.</p>';
    }

    let rows = '';
    for (const item of items) {
        rows += `
      <tr>
        <td><a href="${item.url}">${item.topic}</a></td>
        <td>[발표일] ${item.announceDate}<br><br>[배포일] ${item.deployStart}<br><br>[종료일] ${item.deployEnd}</td>
        <td>${item.whatChanges}</td>
        <td>[변경 이유] ${item.reason}<br><br>[조치 사항] ${item.action}</td>
      </tr>
    `;
    }

    return `
    <table border="1" style="border-collapse:collapse;width:100%;">
      <thead>
        <tr><th>주제</th><th>날짜</th><th>무엇이 변경되는가</th><th>변경 이유와 조치</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function summarizeAnnouncements(articles) {
    if (articles.length === 0) {
        return buildAnnouncementsTable([]);
    }

    console.log(`   - ${articles.length}개 글을 한 번에 Gemini로 요약 요청 중...`);
    const items = await extractAllAnnouncements(articles);
    return buildAnnouncementsTable(items);
}

//릴리즈노트 요약
async function extractAllReleaseNotes(articles) {
    let bodyText = '';

    articles.forEach((article) => {
        bodyText += `\n${article.body}`;
    });

    const prompt = `
        다음은 Zendesk 공식 릴리즈노트 원문입니다. 이 안의 내용을 기능 카테고리별로 분류하고, 각 카테고리마다 "신규"와 "변경" 내용을 나눠서 한국어로 정리해주세요.

    규칙:
    - 카테고리는 원문에 있는 기준(예: AI Agents, Knowledge, Help Center, Voice, Apps and integrations 등)을 그대로 따르세요.
    - 각 카테고리의 "신규"와 "변경" 내용은 한국어로 간결하게 요약하세요. 해당 없으면 빈 문자열("")로 두세요.
    - 여러 항목이 있으면 줄바꿈(\\n)으로 구분된 하나의 문자열로 합치세요.
    - 설명이나 다른 텍스트 없이 JSON 배열로만 응답하세요.

    원문:
    ${bodyText}

    JSON 형식:
    [{"category": "카테고리명", "newItems": "신규 내용", "changedItems": "변경 내용"}, ...]
    `;

    const response = await callGeminiWithRetry(prompt);
    return JSON.parse(response.text);
}

// 정해진 포맷으로 변경
function buildReleaseNotesTable(items) {
    if (items.length === 0) {
        return '<p>지난주에 변경된 릴리즈노트가 없습니다.</p>';
    }

    let rows = '';
    for (const item of items) {
        const newPart = item.newItems
            ? `<strong>신규 : </strong><br>${item.newItems.replace(/\n/g, '<br>')}` : '';
        const changedPart = item.changedItems
            ? `<strong>변경 : </strong><br>${item.changedItems.replace(/\n/g, '<br>')}` : '';

        const separator = newPart && changedPart ? '<br><br>' : '';

        rows += `
            <tr>
                <td>${item.category}</td>
                <td>${newPart}${separator}${changedPart}</td>
            </tr>
        `;
    }

    return `
        <table border="1" style="border-collapse:collapse;width:100%;">
        <thead>
            <tr><th>카테고리</th><th>내용</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        </table>
    `;
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