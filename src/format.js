function formatDate(date) {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
}

function formatReleaseNoteTitle(originalTitle) {
    const match = originalTitle.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return originalTitle;
    }

    const [, year, month, day] = match;
    const shortYear = year.slice(2);
    return `Release Note[${shortYear}.${month}.${day}]`;
}

export { formatDate, formatReleaseNoteTitle };