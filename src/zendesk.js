import 'dotenv/config';
import { logger } from './logger.js';

async function fetchZendeskJson(url, options = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Zendesk API 호출 실패 (${response.status} ${url}): ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error(`Zendesk 호출 최종 실패 (${attempt}/${maxRetries})`, error.message);
                throw error;
            }
            logger.warn(`Zendesk 호출 실패 (${attempt}/${maxRetries})`, error.message);
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }

    }
}


async function getAccessToken() {
    const url = `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/oauth/tokens`;

    const data = await fetchZendeskJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.ZENDESK_CLIENT_ID,
            client_secret: process.env.ZENDESK_CLIENT_SECRET,
            scope: 'hc:write',
        }),
    });

    return data.access_token;
}

// Zendesk 공식 홈페이지에서 기사들 가져오기 (ReleaseNotes 사용)
async function getSourceArticles(sectionId) {
    let url = `${process.env.ZENDESK_PUBLIC_BASE}/api/v2/help_center/sections/${sectionId}/articles.json`;
    let allArticles = [];

    while (url) {
        const data = await fetchZendeskJson(url);
        allArticles = allArticles.concat(data.articles);

        url = data.next_page;
    }

    return allArticles;

}

// zendesk 헬프센터 콘텐츠에 기사 초안 생성
async function createDraftArticle(token, sectionId, title, bodyHtml) {
    const url = `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/help_center/sections/${sectionId}/articles.json`;

    const data = await fetchZendeskJson(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            article: {
                title: title,
                body: bodyHtml,
                draft: true,
                locale: 'ko'
            },
        }),
    });
    return data.article;
}

export { getAccessToken, getSourceArticles, createDraftArticle };