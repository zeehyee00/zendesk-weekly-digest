import 'dotenv/config';
import {
    getAccessToken,
    getSourceArticles,
    createDraftArticle
} from "./zendesk.js";
import { filterLastWeekArticles, getLastWeekRange } from "./filterArticles.js";
import { summarizeAnnouncements, summarizeReleaseNotes } from './summarize.js';
import { formatDate, formatReleaseNoteTitle } from './format.js';



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
            `Announcements [${dateRangeLabel}]`,
            announcementsHtml
        );
    }

    console.log('5. 릴리즈노트 요약 및 draft 생성 중 ..');
    if (filteredReleaseNotes.length > 0) {
        const releaseNotesHtml = await summarizeReleaseNotes(filteredReleaseNotes);
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