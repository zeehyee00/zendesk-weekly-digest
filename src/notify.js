async function notifyTeams(title, message, links) {
    const url = process.env.TEAMS_WEBHOOK_URL;

    const facts = links.map((link) => ({
        title: link.title,
        value: link.url
    }));

    const card = {
        type: 'message',
        attachments: [
            {
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                    version: '1.4',
                    body: [
                        {
                            type: 'TextBlock',
                            text: title,
                            weight: 'Bolder',
                            size: 'Medium',
                        },
                        {
                            type: 'TextBlock',
                            text: message,
                            wrap: true,
                        },
                        { // 링크 목록
                            type: 'FactSet',
                            facts: facts,
                        },
                    ],
                },
            },
        ],
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
    });

    console.log('Teams 응답 상태코드:', response.status);
    const responseText = await response.text();
    console.log('Teams 응답 내용:', responseText);
}
export { notifyTeams };