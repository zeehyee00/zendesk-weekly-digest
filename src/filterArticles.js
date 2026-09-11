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