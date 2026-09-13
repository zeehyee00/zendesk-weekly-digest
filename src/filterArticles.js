// 가져온 기사들 중 정한 범위 내 해당하는 기사들만 필터링
function filterLastWeekArticles(articles) {
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

// 지난주 월요일 - 일요일 까지 범위 설정  참고) 일요일 = 0
function getLastWeekRange() {
    const now = new Date();
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
export { filterLastWeekArticles, getLastWeekRange };