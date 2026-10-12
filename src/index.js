import 'dotenv/config';
import {
    getAccessToken,
    getSourceArticles,
    createDraftArticle
} from "./zendesk.js";
import { filterAnnouncementsByEditedDate, filterReleaseNotesByTitleDate, getLastWeekRange } from "./filterArticles.js";
import { summarizeAnnouncements, summarizeReleaseNotes, GeminiCallError, GeminiParseError } from './summarize.js';
import { formatDate, formatReleaseNoteTitle } from './format.js';

// import cron from 'node-cron';
import { notifyTeams } from './notify.js';
import { logger } from './logger.js';

async function main() {

    try {
        const { start, end } = getLastWeekRange();

        logger.info('1. 공식 사이트에서 announcements 조회 중 ..');
        const announcements = await getSourceArticles(process.env.SOURCE_ANNOUNCEMENTS_SECTION_ID);
        const filteredAnnouncements = filterAnnouncementsByEditedDate(announcements);
        logger.info(`   - 전체 ${announcements.length}개 중 ${filteredAnnouncements.length}개 발견`);

        if (filteredAnnouncements.length === 0) {
            logger.warn('이번 주 Announcement가 발견되지 않음');
        }

        logger.info('2. 공식 사이트에서 release notes 조회 중 ..');
        const releaseNotes = await getSourceArticles(process.env.SOURCE_RELEASE_NOTES_SECTION_ID);
        const filteredReleaseNotes = filterReleaseNotesByTitleDate(releaseNotes);
        logger.info(`   - ${filteredReleaseNotes.length}개 발견`);

        if (filteredReleaseNotes.length === 0) {
            logger.warn('이번 주 Release Note가 발견되지 않음');
        }

        const dateRangeLabel = `${formatDate(start)}~${formatDate(end)}`;


        logger.info('3. zendesk accessToken 발급 중 ..');
        const token = await getAccessToken();


        logger.info('4. announcements & releaseNotes 요약 중 ..');

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

        logger.info('5. 요약 완료! draft 생성 ..');

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
        logger.info('6. Teams 알림 전송 중 ..');
        const links = createdDrafts.map((draft) => ({
            title: draft.title,
            url: draft.html_url,
        }));

        const missing = [];
        if (filteredAnnouncements.length === 0) missing.push('Announcements');
        if (filteredReleaseNotes.length === 0) missing.push('Release Note');
        const note = missing.length > 0 ? `\n 이번 주 ${missing.join(', ')} 없음` : '';


        await notifyTeams(
            createdDrafts.length > 0 ? '이번 주 초안 생성 완료' : '이번 주 생성된 초안 없음',
            `${createdDrafts.length}건의 초안이 생성되었습니다.${note}`,
            links
        );

        logger.info('완료!');
    } catch (error) {
        if (error instanceof GeminiCallError) {
            logger.error('Gemini API 호출 자체가 실패했습니다:', error.message);
        } else if (error instanceof GeminiParseError) {
            logger.error('Gemini 응답 파싱 실패했습니다:', error.message);
            logger.error('Gemini가 실제로 보낸 응답:', error.rawResponse)
        } else {
            logger.error('예상하지 못한 에러:', error.message);
        }

        try {
            await notifyTeams('이번 주 초안 생성 실패', error.message, []);
        } catch (notifyError) {
            logger.error('실패 알림 전송도 실패', notifyError.message);
        }
        throw error;
    }
}

main();