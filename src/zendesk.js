import 'dotenv/config';
import { filterLastWeekArticles } from './filterArticles.js';

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

async function getSourceArticles(sectionId) {
    const url = `${process.env.ZENDESK_PUBLIC_BASE}/api/v2/help_center/sections/${sectionId}/articles.json`;

    const response = await fetch(url);
    const data = await response.json();

    return data.articles;

}

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
