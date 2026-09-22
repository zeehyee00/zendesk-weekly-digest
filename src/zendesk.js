import 'dotenv/config';
import { filterAnnouncementsByEditedDate, filterReleaseNotesByTitleDate } from './filterArticles.js';

async function getAccessToken() {
    const url = `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/oauth/tokens`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.ZENDESK_CLIENT_ID,
            client_secret: process.env.ZENDESK_CLIENT_SECRET,
            scope: 'read users:read hc:read hc:write',
        }),
    });
    const data = await response.json();
    return data.access_token;
}

// Zendesk 공식 홈페이지에서 기사들 가져오기
async function getSourceArticles(sectionId) {
    let url = `${process.env.ZENDESK_PUBLIC_BASE}/api/v2/help_center/sections/${sectionId}/articles.json`;
    let allArticles = [];

    while (url) {
        const response = await fetch(url);
        const data = await response.json();
        allArticles = allArticles.concat(data.articles);

        url = data.next_page;
    }

    return allArticles;

}

// zendesk 헬프센터 콘텐츠에 기사 초안 생성
async function createDraftArticle(token, sectionId, title, bodyHtml) {
    const url = `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/help_center/sections/${sectionId}/articles.json`;

    const response = await fetch(url, {
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

    const data = await response.json();
    return data.article;
}

export { getAccessToken, getSourceArticles, createDraftArticle };