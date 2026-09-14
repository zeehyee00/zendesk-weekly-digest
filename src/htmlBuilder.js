const HEADER_STYLE = 'background-color:#1f4e2c;color:#ffffff;padding:8px;';
const CELL_STYLE = 'padding:8px;vertical-align:top;';

// 해당없을 경우 작성 제외 및 확인필요 표시
function buildDateCell(item) {
    const isAnnounceMissing = !item.announceDate || item.announceDate === '확인필요' || item.announceDate === '해당없음';
    const isDeployStartMissing = !item.deployStart || item.deployStart === '확인필요' || item.deployStart === '해당없음';
    const isDeployEndMissing = !item.deployEnd || item.deployEnd === '확인필요' || item.deployEnd === '해당없음';

    if (isAnnounceMissing && isDeployStartMissing && isDeployEndMissing) {
        return '확인필요';
    }

    const lines = [];
    if (item.announceDate && item.announceDate !== '해당없음') {
        lines.push(`발표일: ${item.announceDate}`);
    }
    if (item.deployStart && item.deployStart !== '해당없음') {
        lines.push(`배포일: ${item.deployStart}`);
    }
    if (item.deployEnd && item.deployEnd !== '해당없음') {
        lines.push(`종료일: ${item.deployEnd}`);
    }
    return lines.join('<br><br>');
}

function buildAnnouncementsTable(items) {
    if (items.length === 0) {
        return '<p>지난주에 변경된 Announcements가 없습니다.</p>';
    }

    let rows = '';
    for (const item of items) {
        rows += `
      <tr>
        <td style="${CELL_STYLE}"><a href="${item.url}">${item.topic}</a></td>
        <td style="${CELL_STYLE}">${buildDateCell(item)}</td>
        <td style="${CELL_STYLE}">${item.whatChanges}</td>
        <td style="${CELL_STYLE}">[변경 이유]<br> ${item.reason}<br><br>[조치 사항]<br> ${item.action}</td>
      </tr>
    `;
    }

    return `
    <table border="1" style="border-collapse:collapse;width:auto;table-layout:auto;">
      <thead>
        <tr>
          <th style="${HEADER_STYLE}">주제</th>
          <th style="${HEADER_STYLE}">날짜</th>
          <th style="${HEADER_STYLE}">무엇이 변경되는가</th>
          <th style="${HEADER_STYLE}">변경 이유와 조치</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// 글머리글기호 적용
function buildBulletList(items) {
    if (!items || items.length === 0) return '';
    const listItems = items.map((item) => `<li>${item}</li>`).join('');
    return `<ul style="margin:0;padding-left:18px;">${listItems}</ul>`;
}

function buildReleaseNotesTable(items) {
    const filtered = items.filter(
        (item) => (item.newItems && item.newItems.length > 0) || (item.changedItems && item.changedItems.length > 0)
    );

    if (filtered.length === 0) {
        return '<p>지난주 릴리즈노트 내용이 없습니다.</p>';
    }

    let rows = '';
    for (const item of filtered) {
        const newPart = item.newItems && item.newItems.length > 0
            ? `<strong>신규</strong>${buildBulletList(item.newItems)}`
            : '';
        const changedPart = item.changedItems && item.changedItems.length > 0
            ? `<strong>변경</strong>${buildBulletList(item.changedItems)}`
            : '';
        const separator = newPart && changedPart ? '<br>' : '';

        rows += `
      <tr>
        <td style="${CELL_STYLE}">${item.category}</td>
        <td style="${CELL_STYLE}">${newPart}${separator}${changedPart}</td>
      </tr>
    `;
    }

    return `
    <table border="1" style="border-collapse:collapse;width:auto;table-layout:auto;">
      <thead>
        <tr>
          <th style="${HEADER_STYLE}">카테고리</th>
          <th style="${HEADER_STYLE}">내용</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export { buildAnnouncementsTable, buildReleaseNotesTable };