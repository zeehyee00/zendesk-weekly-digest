import 'dotenv/config';
import {
    getAccessToken,
    getSourceArticles,
    createDraftArticle
} from "./zendesk.js";
import { filterLastWeekArticles, getLastWeekRange } from "./filterArticles.js";
import { summarizeAnnouncements } from './summarize.js';
import { formatDate, formatReleaseNoteTitle } from './format.js';

// 원문 나열
function buildTempSummaryHtml(articles) {
    if (articles.length === 0) {
        return '<p>지난주에 수정된 글이 없습니다.</p>';
    }

    let html = '';
    for (const article of articles) {
        html += `<h3>${article.title}</h3>`;
        html += `<p>원문 링크: <a href="${article.html_url}">${article.html_url}</a></p>`;
        html += `<p>수정일: ${article.edited_at}</p>`;
        html += `<hr>`;
    }
    return html;
}


// TEST 진행
async function main() {
    console.log('1. 공식 사이트에서 announcements 조회 중 ..');

    const announcements = await getSourceArticles(process.env.SOURCE_ANNOUNCEMENTS_SECTION_ID);
    const filteredAnnouncements = filterLastWeekArticles(announcements);
    console.log(`   - ${filteredAnnouncements.length}개 발견`);

    console.log('2. 공식 사이트에서 release notes 조회 중 ..');
    const releaseNotes = await getSourceArticles(process.env.SOURCE_RELEASE_NOTES_SECTION_ID);
    const filteredReleaseNotes = filterLastWeekArticles(releaseNotes);
    console.log(`   - ${filteredReleaseNotes.length}개 발견`);

    if (filteredAnnouncements.length === 0 && filteredReleaseNotes.length === 0) {
        console.log('이번 주에 변경된 글이 없습니다.');
        return;
    }

    const { start, end } = getLastWeekRange();
    const dateRangeLabel = `${formatDate(start)}~${formatDate(end)}`;


    console.log('3. zendesk accessToken 발급 중 ..');
    const token = await getAccessToken();

    console.log('4. announcements draft 생성 중 ..');
    if (filteredAnnouncements.length > 0) {
        const announcementsHtml = await summarizeAnnouncements(filteredAnnouncements);
        await createDraftArticle(
            token,
            process.env.TARGET_ANNOUNCEMENTS_SECTION_ID,
            `Announcements[${dateRangeLabel}]`,
            announcementsHtml
        );
    }

    console.log('5. 릴리즈노트 요약 및 draft 생성 중 (임시 버전) ..');
    if (filteredReleaseNotes.length > 0) {
        const releaseNotesHtml = buildTempSummaryHtml(filteredReleaseNotes);
        const releaseNoteTitle = formatReleaseNoteTitle(filteredReleaseNotes[0].title);

        await createDraftArticle(
            token,
            process.env.TARGET_RELEASE_NOTES_SECTION_ID,
            releaseNoteTitle,
            releaseNotesHtml
        );
    }
    console.log('6. 완료!');
}

main();