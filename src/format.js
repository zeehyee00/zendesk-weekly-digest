// Date 객체를 String 변환
function formatDate(date) {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
}

function extractDateFromTitle(title) {
    const match = title.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00`);
}


function formatReleaseNoteTitle(originalTitle) {
    const titleDate = extractDateFromTitle(originalTitle);

    if (!titleDate) {
        return originalTitle;
    }

    return `Release Note[${formatDate(titleDate)}]`;
}
export { formatDate, formatReleaseNoteTitle, extractDateFromTitle };