import 'dotenv/config';
import {
    getAccessToken,
    getSourceArticles,
    createDraftArticle
} from "./zendesk.js";
import { filterAnnouncementsByEditedDate, filterReleaseNotesByTitleDate, getLastWeekRange } from "./filterArticles.js";
import { summarizeAnnouncements, summarizeReleaseNotes } from './summarize.js';
import { formatDate, formatReleaseNoteTitle } from './format.js';
import cron from 'node-cron';
import { notifyTeams } from './notify.js';


// TEST 진행
async function main() {
    console.log('1. 공식 사이트에서 announcements 조회 중 ..');

    const announcements = await getSourceArticles(process.env.SOURCE_ANNOUNCEMENTS_SECTION_ID);
    const filteredAnnouncements = filterAnnouncementsByEditedDate(announcements);
    console.log(`   - ${filteredAnnouncements.length}개 발견`);

    if (filteredAnnouncements.length === 0) {
        console.log('이번 주에 변경된 글이 없습니다.');
    }

    console.log('2. 공식 사이트에서 release notes 조회 중 ..');
    const releaseNotes = await getSourceArticles(process.env.SOURCE_RELEASE_NOTES_SECTION_ID);
    const filteredReleaseNotes = filterReleaseNotesByTitleDate(releaseNotes);
    console.log(`   - ${filteredReleaseNotes.length}개 발견`);

    if (filteredReleaseNotes.length === 0) {
        console.log('이번 주에 변경된 글이 없습니다.');
    }

    const { start, end } = getLastWeekRange();
    const dateRangeLabel = `${formatDate(start)}~${formatDate(end)}`;


    console.log('3. zendesk accessToken 발급 중 ..');
    const token = await getAccessToken();


    console.log('4. announcements & releaseNotes 요약 중 ..');

    let announcementsHtml = null;
    let releaseNotesHtml = null;
    let releaseNoteTitle = null;

    if (filteredAnnouncements.length > 0) {
        announcementsHtml = await summarizeAnnouncements(filteredAnnouncements);
    }

    if (filteredReleaseNotes.length > 0) {
        releaseNotesHtml = await summarizeReleaseNotes(filteredReleaseNotes);
        releaseNoteTitle = formatReleaseNoteTitle(filteredReleaseNotes[0].title);
    }

    console.log('5. 요약 완료! draft 생성 ..');

    const createdDrafts = [];

    if (announcementsHtml) {
        const draft = await createDraftArticle(
            token,
            process.env.TARGET_ANNOUNCEMENTS_SECTION_ID,
            `Announcements [${dateRangeLabel}]`,
            announcementsHtml
        );

        createdDrafts.push(draft);
    }

    if (releaseNotesHtml) {

        const draft = await createDraftArticle(
            token,
            process.env.TARGET_RELEASE_NOTES_SECTION_ID,
            releaseNoteTitle,
            releaseNotesHtml
        );

        createdDrafts.push(draft);
    }
    // 작업 실행 + 완료 즉시 Teams 알림
    console.log('6. Teams 알림 전송 중 ..');
    const links = createdDrafts.map((draft) => ({
        title: draft.title,
        url: draft.html_url,
    }));

    await notifyTeams(
        '이번 주 초안 생성 완료',
        `${createdDrafts.length}건의 초안이 생성되었습니다.`,
        links
    );

    console.log('완료!');
}

main();

// // 매주 월요일 08:00  참고) [분] [시] [일] [월] [요일]
// cron.schedule('0 8 * * 1', () => {
//     console.log('예약된 작업 시작:', new Date().toLocaleString());
//     main();
// }, {
//     timezone: 'Asia/Seoul',
// });

// console.log('스케줄러 등록 완료. 매주 월요일 08:00(KST)에 실행됩니다.');