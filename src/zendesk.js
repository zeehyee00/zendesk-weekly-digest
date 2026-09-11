import 'dotenv/config';

async function getSourceArticles(sectionId) {
    const url = `${process.env.ZENDESK_PUBLIC_BASE}/api/v2/help_center/sections/${sectionId}/articles.json`;

    const response = await fetch(url);
    const data = await response.json();

    return data.articles;

}
