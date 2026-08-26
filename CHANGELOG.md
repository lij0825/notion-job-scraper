# 릴리즈 패치노트 (Changelog)

이 문서는 **Notion Job Scraper** 프로젝트의 버전별 주요 변경사항, 신규 기능, 개선사항 및 버그 수정 내역을 기록합니다.
버전 체계는 [Semantic Versioning (SemVer)](https://semver.org/lang/ko/)을 따릅니다.

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
