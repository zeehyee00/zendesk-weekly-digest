// 날짜 형식 변환 yy.mm.dd
function formatDate(date) {
    const yy = String(date.getFullYear()).slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
}

// 문자열에서 날짜만 뽑아서 DATE 객체로 변환
function extractDateFromTitle(title) {
    const match = title.match(/(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}T00:00:00`);
}

// release note 제목 형식 변환 
function formatReleaseNoteTitle(originalTitle) {
    const titleDate = extractDateFromTitle(originalTitle);

    if (!titleDate) {
        return originalTitle;
    }

    return `Release Note[${formatDate(titleDate)}]`;
}
export { formatDate, formatReleaseNoteTitle, extractDateFromTitle };