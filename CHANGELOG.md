# 릴리즈 패치노트 (Changelog)

이 문서는 **Notion Job Scraper** 프로젝트의 버전별 주요 변경사항, 신규 기능, 개선사항 및 버그 수정 내역을 기록합니다.
버전 체계는 [Semantic Versioning (SemVer)](https://semver.org/lang/ko/)을 따릅니다.

---

## [v1.1.1] - 2026-08-31

### 🐛 버그 수정 (Bug Fixes)
- **Vercel 프로덕션 OAuth 프록시 서버 라우팅 및 독립형 엔드포인트 구축**
	- Vercel 서버리스 모노레포 구조에 맞춘 루트 `api/token.ts` 엔드포인트 및 CORS 헤더 적용
	- 실제 Vercel 프로덕션 도메인(`https://notion-job-scraper.vercel.app`) 연결
- **OAuth 로그인 응답 타임아웃 3분 연장 및 워크스페이스 연결 상태 동기화**
	- 팝업 Background 메시지 응답 대기 시간을 3초에서 180초로 늘려 사용자의 Notion 권한 승인 대기 시간 확보
	- 로그인 승인 완료 후 워크스페이스 연결 완료 화면으로 실시간 탭 자동 전환 처리

---

## [v1.1.0] - 2026-08-31

### ✨ 신규 기능 (Features)
- **Notion 내부 통합 토큰 및 링크 직접 연동(Manual Auth) 모드 추가**
	- Notion 개발자 콘솔(`notion.so/profile/integrations`)에서 발급한 시크릿 키(`secret_...`)와 페이지/DB 링크를 직접 입력하여 연동하는 기능 지원
	- 별도의 OAuth 프록시 서버 없이도 브라우저 확장 단독으로 Notion API 통신 및 스크래핑 저장 가능
	- `SAVE_MANUAL_AUTH` 백그라운드 메시지 프로토콜 및 DB 유효성 검증 파이프라인 구현

### 🐛 버그 수정 (Bug Fixes)
- **설정 페이지 뒤로가기 네비게이션 미작동 버그 수정**
	- 메인 라우트(`/`) `beforeLoad` 가드의 강제 `/settings` 리다이렉트를 제거하여, 미연결 상태에서도 메인 스크래퍼 화면과 설정 화면 간 원활한 뒤로가기 및 탭 이동 보장
	- 미연결 상태일 때 메인 뷰 상단에 워크스페이스 연동 필요 안내 배너 제공 및 저장 검증 처리
- **OAuth 토큰 교환 에러 메시지 왜곡 수정**
	- OAuth 프록시 서버 통신 실패(404 / 500 등) 시 데이터베이스 미존재로 오분류되던 에러 처리 로직 개선
	- 서버 상태 점검 및 직접 연동(API 키) 권장 안내 메시지 분리

---

## [v1.0.14] - 2026-08-27

### 🐛 버그 수정 (Bug Fixes)
- **프로덕션 배포 시 `localhost:3000` 참조 오류 해결**
	- Vite / WXT 빌드 시점 환경 변수 검증 가드(Fail-fast) 도입 (`wxt.config.ts`)
	- 프로덕션 환경에서 Vercel 프록시 URL(`https://notion-job-scraper-server.vercel.app`) 자동 리졸브 및 `.env.production` 환경 분리
	- 배포 번들 내 `localhost` 잔존 여부를 사전 검사하는 자동 무결성 검증 스크립트(`scripts/verify-bundle.mjs`) 구축

### 🚀 개선 및 리팩토링 (Improvements)
- **사용자 친화적 에러 핸들링 시스템 구축 (`utils/errors.ts`)**
	- 기술 디버그 로그(콘솔/Sentry)와 사용자 안내 문구(UI Toast/Callout) 분리
	- 네트워크 단절, Vercel 5xx 서버 점검, 세션 만료, Notion DB 권한 오류별 명확한 상황별 사용자 안내 메시지 매핑
- **WXT Background Message Listener 타입 정의 및 비동기 응답 표준화**
	- `browser.runtime.onMessage.addListener` 비동기 `return true;` 반환 보장 및 TypeScript 진단 정합성 확보

---

## [v1.0.13] - 2026-08-26

### ✨ 신규 기능 및 개선 (Features & Improvements)
- **사람인(Saramin) 실공고 파싱 정밀화 및 메타데이터 추출 안정화**
	- `og:title` 내 D-Day 접미사(`(D-5)`, `(D-0)` 등) 및 회사명 브라켓 접두사 정규식 분리 처리 고도화
	- 메타 설명문(`meta[name="description"]`) 내 마감일 문자열 감지 및 Notion 표준 날짜 포맷(`YYYY-MM-DD`) 변환 안정성 강화
- **Firefox 브라우저 확장 배포 빌드 및 패키징 지원**
	- Firefox Manifest V2 환경에 맞춘 WXT 빌드 및 번들 패키징(`build:firefox`, `zip:firefox`)
	- 크로스 브라우저 환경에서의 단위/통합 테스트 전수 검증 완료

---

## [v1.0.12] - 2026-08-24

### ✨ 신규 기능 (Features)
- **사람인(Saramin) 채용 공고 스크래퍼 정밀 파싱 지원**
	- `JSON-LD` 구조화 데이터 스키마 파싱 및 다중 DOM 선택자 폴백(Fallback) 전략 구현
	- 공고 직무명, 회사명, 마감일, 본문 설명(Description) 추출 정확도 대폭 향상
	- 사람인 스크래퍼 단위 테스트 케이스 추가 (`saramin.test.ts`)
- **커스텀 마감일 캘린더 (DatePicker) 컴포넌트 구현**
	- 직관적인 달력 UI를 통한 공고 마감일 수동 선택/변경 기능 추가
	- 상시채용 및 날짜 파싱 실패 시 사용자가 손쉽게 날짜를 지정할 수 있는 입력 경험 제공
	- Notion 지원 날짜 형식(`YYYY-MM-DD`) 자동 포맷팅 및 상태 동기화

### 🔧 개선 및 리팩토링 (Improvements)
- 웹(Web) 및 브라우저 확장 프로그램(Extension) 공통 모듈 초기화 로직 안정화
- 팝업 진입 시 Sentry 에러 트래킹 초기화 및 라우팅 파이프라인 동기화 최적화

---

## [v1.0.11] - 2026-08-24

### ✨ 신규 기능 (Features)
- **Notion OAuth 2.0 토큰 교환 플로우 완성**
	- Vercel 서버리스 프록시와 웹 라우트를 연계한 OAuth 인증 콜백 플로우 구현 (`/oauth/callback`)
	- Notion API 토큰 교환 및 안전한 브라우저 스토리지 저장 파이프라인 구축
- **TanStack Router 기반 웹 대시보드 인프라 도입**
	- 저장된 채용 공고를 조회 및 필터링할 수 있는 대시보드 UI (`/jobs`) 기초 구축
	- Notion Database 연동 상태 및 헤더 컴포넌트(`NotionHeader`) 추가

### 🔧 개선 및 리팩토링 (Improvements)
- 확장 프로그램 팝업 내 네비게이션 라우터(`extension/router`) 구조 고도화
- TanStack Query 훅(`useAuthQuery`)을 통한 인증 세션 상태 관리 효율화

---

## [v1.0.1] - 2026-08-24

### ✨ 신규 기능 (Features)
- **채용 공고 수동 입력(Manual Entry) 모드 정식 도입**
	- 지원하지 않는 채용 사이트나 직접 작성하고 싶은 공고를 위한 빈 폼 입력 지원
	- 수동 입력 워크플로우에 대한 Playwright E2E 브라우저 자동화 테스트 스펙 추가 (`manual-entry.spec.ts`)
- **브라우저 확장 고해상도 브랜드 아이콘 에셋 적용**
	- 브라우저 툴바, 팝업, 확장 관리자용 다중 해상도 아이콘(16px, 32px, 48px, 128px) 반영

### 🛡️ 보안 및 안정성 (Security & Reliability)
- React Query 훅 기반 인증 상태 확인 및 에러 복구 로직 강화
- 브라우저 팝업 UI 전용 Sentry 에러 캡처 파이프라인 통합

---

## [v1.0.0] - 2026-08-16

### 🚀 최초 공식 릴리즈 (Initial Release)

#### 1. 채용 공고 스크래핑 엔진
- **자소설닷컴**: DOM 셀렉터 파싱 및 `og:title` 메타태그 폴백 지원
- **원티드 (Wanted)**: `__NEXT_DATA__` JSON 파싱 및 DOM 폴백, `/wd/` 및 `/jobdetail/` SPA 라우팅 지원
- **잡코리아 (JobKorea)**: `JSON-LD` 스키마 데이터 파싱 및 DOM 폴백 지원

#### 2. 사용자 중심 수동 스크래핑 & 편집 워크플로우
- **완전 수동 트리거 방식**: 백그라운드 무단 수집 배제, 확장 아이콘 클릭 시에만 현재 탭 분석
- **필드별 선택/해제/수정 폼**:
	- **직무명(Title)**: 필수 필드, Notion 페이지 제목으로 매핑
	- **회사명(Company)**: 선택 저장 및 직접 수정 가능
	- **마감일(Deadline)**: 날짜 문자열 자동 추출 및 수정 가능
	- **공고 URL**: 원본 링크 자동 기입
	- **직무 설명(Description)**: 텍스트 추출 및 본문 블록 저장 여부 선택 가능

#### 3. 모던 프론트엔드 & 아키텍처
- **WXT (Web Extension Tools)**: Chrome Manifest V3 및 Firefox Manifest V2 동시 호환
- **shadcn/ui & Tailwind CSS**: 다크 모드 및 글래스모피즘(Glassmorphism) 기반 Notion 스타일 UI
- **상태 관리**: Zustand (전역 인증 및 폼 상태) + TanStack React Query (서버 상태)

#### 4. 보안 & 개인정보 보호 (PII Sanitization)
- Notion API Key 및 OAuth Access Token 클라이언트 직접 노출 방지 (Vercel Serverless Proxy 활용)
- Sentry 에러 로깅 시 개인 식별 정보(PII), 인증 토큰, 쿠키, 이메일 자동 마스킹 필터 구현

#### 5. 품질 보증 & 테스트 인프라
- **Unit & Integration Test**: Vitest + jsdom + Firefox Browser Mock + HTML Fixtures
- **E2E Automation Test**: Playwright 기반 실제 브라우저 공고 수집 및 연동 테스트 스위트
- Vite / React 플러그인 의존성 정렬 (`overrides`)
