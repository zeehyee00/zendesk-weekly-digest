import { extractDateFromTitle } from "./format.js";

// 가져온 기사들 중 정한 범위 내 해당하는 기사들만 필터링
function filterAnnouncementsByEditedDate(articles) {
    const { start, end } = getLastWeekRange();

    const filtered = [];

    for (const article of articles) {
        const editedDate = new Date(article.edited_at);

        if (editedDate >= start && editedDate <= end) {
            filtered.push(article)
        }
    }

    return filtered;
}

function filterReleaseNotesByTitleDate(articles) {
    const { start, end } = getLastWeekRange();

    const filtered = [];

    for (const article of articles) {
        const titleDate = extractDateFromTitle(article.title);

        // 제목에서 날짜를 못 찾으면 안전하게 건너뜀
        if (titleDate && titleDate >= start && titleDate <= end) {
            filtered.push(article);
        }
    }

    return filtered;
}

// 지난주 월요일 - 일요일 까지 범위 설정  참고) 일요일 = 0
function getLastWeekRange() {
    const now = process.env.TEST_DATE ? new Date(process.env.TEST_DATE) : new Date();

    const dayOfWeek = now.getDay();

    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const thisMonday = new Date(now);
    thisMonday.setHours(0, 0, 0, 0);
    thisMonday.setDate(now.getDate() - daysSinceMonday);

    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const lastSunday = new Date(thisMonday);
    lastSunday.setMilliseconds(-1);

    return { start: lastMonday, end: lastSunday };

}
export { filterAnnouncementsByEditedDate, filterReleaseNotesByTitleDate, getLastWeekRange };