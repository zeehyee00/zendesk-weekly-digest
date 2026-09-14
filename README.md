# zendesk-weekly-digest

Zendesk 공식 공지사항(Announcements)/릴리즈노트(Release Notes)를 매주 자동으로 수집·요약해 사내 Zendesk 헬프센터에 초안(draft)으로 등록하는 Node.js 자동화 스크립트입니다.


## Why

- 매주 Zendesk 공식 헬프센터에 올라오는 공지/릴리즈노트를 사람이 직접 찾아 정리해왔음
- 문서 양이 많고, 이어서 확인해야 해서 누락 위험이 있었음
- 정리 과정 자체를 자동화하기 위해 제작



## What it does

1. 매주 월요일 08:00(KST)에 자동 실행
2. Zendesk 공식 사이트(`support.zendesk.com`)에서 Announcements / Release Notes 글 목록 조회 (공개 API, 인증 불필요)
3. 지난주(월~일) 기준으로 필터링
   - Announcements: `edited_at`(수정일) 기준
   - Release Notes: 원문 제목에 박힌 날짜 기준
4. Gemini API로 항목별 데이터 추출 + 카테고리 분류
5. 결과를 HTML 표로 조립
6. 사내 Zendesk 헬프센터에 `draft: true`로 article 생성 (섹션당 1건, OAuth 인증)
7. Microsoft Teams로 완료 알림 전송

> 실제 게시(publish)는 자동으로 하지 않으며, 사람이 초안을 검토한 뒤 직접 게시합니다.



## Tech Stack

| 항목 | 선택 |
|---|---|
| 언어 | Node.js |
| 인증 (사내 헬프센터) | Zendesk OAuth (Client Credentials Grant) |
| 조회 대상 | Zendesk 공식 Help Center API |
| LLM | Google Gemini |
| 알림 | Microsoft Teams (Workflows Webhook) |
| 스케줄링 | node-cron |



## Project Structure

```
zendesk-weekly-digest/
├── .env                  # 비밀값 (git 업로드 안 함)
└── src/
    ├── zendesk.js         # Zendesk API 호출 (공식 사이트 조회 + 사내 헬프센터 draft 생성)
    ├── filterArticles.js  # 지난주 기준 필터링
    ├── summarize.js        # Gemini 호출 + 프롬프트
    ├── htmlBuilder.js      # HTML 표 조립 (디자인)
    ├── format.js            # 날짜/제목 포맷팅
    ├── notify.js            # Teams 알림
    └── index.js             # 전체 흐름 연결 + 스케줄러 등록
```



## Setup

```bash
npm install
```


`.env` 파일을 만들고 아래 값을 채웁니다.

```
# Zendesk (사내 헬프센터)
ZENDESK_SUBDOMAIN=
ZENDESK_CLIENT_ID=
ZENDESK_CLIENT_SECRET=

# Zendesk (공식 사이트, 읽기 전용)
ZENDESK_PUBLIC_BASE=https://support.zendesk.com
SOURCE_ANNOUNCEMENTS_SECTION_ID=
SOURCE_RELEASE_NOTES_SECTION_ID=
TARGET_ANNOUNCEMENTS_SECTION_ID=
TARGET_RELEASE_NOTES_SECTION_ID=

# Gemini
GEMINI_API_KEY=

# Teams
TEAMS_WEBHOOK_URL=
```


## Run

```bash
node src/index.js
```

매주 월요일 08:00(KST)에 자동 실행되도록 스케줄이 등록되며, 프로세스가 계속 실행 중이어야 스케줄이 동작합니다.



## Notes

- 무료 티어 Gemini API의 요청 제한 때문에, 여러 글을 한 번의 프롬프트로 묶어 호출 1회로 처리하도록 설계했습니다.
- Announcements/Release Notes 중 하나라도 요약에 실패하면, 요약 단계 이후의 draft 생성 자체가 실행되지 않도록 해 부분 생성을 방지합니다.