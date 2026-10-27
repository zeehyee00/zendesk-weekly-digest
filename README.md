# zendesk-weekly-digest

Zendesk 공식 공지사항(Announcements)/릴리즈노트(Release Notes)를 매주 자동으로 수집·요약해 사내 Zendesk 헬프센터에 초안(draft)으로 등록하는 Node.js 자동화 스크립트입니다.

## Why

- 매주 Zendesk 공식 헬프센터에 올라오는 공지/릴리즈노트를 사람이 직접 찾아 정리해왔음
- 문서 양이 많고, 이어서 확인해야 해서 누락 위험이 있었음
- 정리 과정 자체를 자동화하기 위해 제작

## What it does

1. 매주 월요일 07:33(KST)에 GitHub Actions로 자동 실행
2. Zendesk 공식 사이트(`support.zendesk.com`)에서 Announcements / Release Notes 글 목록 조회 (공개 API, 인증 불필요, 페이지네이션 처리)
3. 지난주(월~일) 기준으로 필터링
   - Announcements: `edited_at`(수정일) 기준
   - Release Notes: 원문 제목에 박힌 날짜 기준
4. Gemini API로 항목별 데이터 추출 + 카테고리 분류
5. 결과를 HTML 표로 조립
6. 사내 Zendesk 헬프센터에 `draft: true`로 article 생성 (섹션당 1건, OAuth 인증)
7. Microsoft Teams로 완료 알림 전송 (이번 주 Announcements/Release Note가 없으면 알림에 표시)

> 실제 게시(publish)는 자동으로 하지 않으며, 사람이 초안을 검토한 뒤 직접 게시합니다.

## Tech Stack

| 항목 | 선택 |
|---|---|
| 언어 | Node.js |
| 인증 (사내 헬프센터) | Zendesk OAuth (Client Credentials Grant, scope: `hc:write`) |
| 조회 대상 | Zendesk 공식 Help Center API |
| LLM | Google Gemini |
| 알림 | Microsoft Teams (Workflows Webhook) |
| 스케줄링/배포 | GitHub Actions (`schedule`, `workflow_dispatch`) |

## Project Structure
