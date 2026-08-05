# Notion Job Scraper Browser Extension

한국 주요 채용 사이트에서 채용 공고를 **사용자가 직접 스크래핑**하여, 원하는 필드만 선택·편집한 뒤 Notion 데이터베이스에 저장하는 크로스 브라우저(Chrome/Firefox) 확장 프로그램입니다.

> **⚠️ 이 확장 프로그램은 절대로 자동으로 데이터를 수집하거나 전송하지 않습니다.**
> 모든 스크래핑과 저장은 사용자가 명시적으로 실행해야만 동작합니다.

## 지원 사이트

| 사이트 | URL 패턴 | 파싱 전략 |
|--------|----------|-----------|
| 자소설닷컴 | `jasoseol.com/recruit/*` | DOM 선택자 + og:title fallback |
| 원티드 | `www.wanted.co.kr/jobdetail/*` | `__NEXT_DATA__` JSON + DOM fallback + SPA 감지 |
| 사람인 | `www.saramin.co.kr/zf_user/jobs/view*` | JSON-LD + DOM fallback |
| 잡코리아 | `www.jobkorea.co.kr/Recruit/GI_Read/*` | JSON-LD + DOM fallback |

---

## 스크래핑 방식 (사용자 워크플로우)

이 확장 프로그램은 **완전한 수동 트리거 방식**으로 동작합니다. 채용 공고 페이지를 방문하는 것만으로는 어떤 데이터도 수집·전송·저장되지 않습니다.

### Step 1: 채용 공고 페이지 이동

지원하는 4개 채용 사이트(자소설닷컴, 원티드, 사람인, 잡코리아) 중 하나에서 관심 있는 채용 공고의 **상세 페이지**를 엽니다.

### Step 2: 확장 아이콘 클릭 (수동 실행)

브라우저 툴바에서 **Notion Job Scraper** 확장 아이콘을 클릭합니다.
- 이 시점에서 **처음으로** 현재 페이지의 DOM을 파싱하여 채용 공고 데이터를 추출합니다.
- 확장 아이콘을 클릭하지 않으면 아무 일도 일어나지 않습니다.

### Step 3: 데이터 검토·편집·필드 선택/해제

팝업 UI에 스크래핑된 데이터가 **편집 가능한 폼**으로 표시됩니다:

| 필드 | 편집 | 선택 해제 | 설명 |
|------|------|-----------|------|
| **직무명** (Title) | ✅ | ❌ (필수) | Notion 페이지 제목으로 사용 |
| **회사명** (Company) | ✅ | ✅ | 체크 해제 시 Notion에 저장하지 않음 |
| **마감일** (Deadline) | ✅ (DatePicker) | ✅ | 상시채용이면 직접 날짜 입력 가능 |
| **공고 URL** | ✅ | ❌ (필수) | 원본 채용 공고 링크 |
| **직무 설명** (Description) | ✅ (textarea) | ✅ | 체크 해제 시 본문 블록 제외 |

- 스크래핑된 값이 정확하지 않으면 **직접 수정**할 수 있습니다.
- 마감일만 필요하고 설명은 필요 없다면 **Description 체크박스를 해제**하면 됩니다.
- 필수 필드(Title, URL)는 체크 해제할 수 없습니다.

### Step 4: "선택한 항목 Notion에 저장" 클릭

확인이 끝나면 **"📥 선택한 항목 Notion에 저장"** 버튼을 클릭합니다.
- 체크된 필드만 Notion API로 전송됩니다.
- 저장 성공 시 ✅ 확인 메시지가 표시됩니다.
- 같은 공고를 실수로 두 번 저장해도 매번 새 페이지가 생성됩니다 (중복 방지는 Notion DB에서 직접 관리).

---

## 프로젝트 구조

```
notion-job-scraper/
├── extension/                     # WXT 브라우저 확장 프로그램
│   ├── wxt.config.ts              # WXT 설정 (Chrome MV3 / Firefox MV2)
│   ├── package.json
│   ├── entrypoints/
│   │   ├── popup/                 # React UI 팝업 (편집 폼 + 필드 선택)
│   │   │   ├── App.tsx            # 메인 앱 컴포넌트
│   │   │   ├── main.tsx           # React 엔트리포인트
│   │   │   ├── popup.css          # 다크 모드 + 글래스모피즘 스타일
│   │   │   └── components/
│   │   │       ├── ScrapingView.tsx  # 편집 가능 폼 + 체크박스 선택
│   │   │       ├── AuthView.tsx     # Notion OAuth + DB ID 설정
│   │   │       ├── DatePicker.tsx   # 마감일 선택 컴포넌트
│   │   │       └── StatusBadge.tsx  # 연결 상태 뱃지
│   │   ├── content/               # 사이트별 스크래퍼 (수동 트리거만)
│   │   │   ├── index.ts           # SCRAPE 메시지 수신 시에만 파싱
│   │   │   └── scrapers/          # 사이트별 DOM 파싱 로직
│   │   └── background/            # Notion SDK & OAuth 핸들러
│   └── utils/                     # 공유 유틸리티 (타입, 스토리지, Notion SDK)
│
└── server/                        # Vercel OAuth Proxy
    └── api/token.ts               # 토큰 교환 서버리스 함수
```

---

## 사전 준비물

1. **Node.js** 18 이상
2. **Notion 계정** 및 Public Integration 생성
3. **Vercel 계정** (서버 배포용)

---

## Step 1: Notion Public Integration 생성

### 1-1. Integration 등록

1. [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) 접속
2. **"+ 새 통합"** 클릭
3. 통합 이름 입력 (예: `Job Scraper`)
4. **유형**: **"Public"** 선택 (중요!)
5. **Company name** 입력
6. **Redirect URI** 설정:
   - Chrome: `https://<extension-id>.chromiumapp.org/` (설치 후 확인)
   - Firefox: `https://<extension-id>.extensions.allizom.org/`
   - 개발 중에는 임시로 `https://localhost/` 추가 가능

> **⚠️ 주의**: "Public" 통합만 OAuth 2.0 플로우를 지원합니다. "Internal" 통합은 사용 불가합니다.

### 1-2. 인증 정보 확인

통합 설정 페이지에서 다음 값을 복사합니다:
- **OAuth client ID** → `NOTION_CLIENT_ID`
- **OAuth client secret** → `NOTION_CLIENT_SECRET`

### 1-3. Notion Database 준비

스크래핑된 공고를 저장할 Notion Database에 다음 속성을 추가합니다:

| 속성명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `Title` | 제목 | ✅ | 직무명 (기본 속성) |
| `Company` | 텍스트 | ❌ | 회사명 (선택 해제 시 비워짐) |
| `URL` | URL | ✅ | 채용 공고 링크 |
| `Deadline` | 날짜 | ❌ | 마감일 (캘린더 동기화용, 선택 해제 가능) |
| `Status` | 선택 | — | 지원 상태 (기본값: "지원 예정") |

> **참고**: Company와 Deadline은 사용자가 팝업에서 체크 해제하면 Notion에 저장되지 않습니다.
> Description(직무 설명)은 속성이 아닌 페이지 본문 블록으로 저장됩니다.

---

## Step 2: OAuth Proxy 서버 배포 (Vercel)

### 2-1. 서버 의존성 설치

```bash
cd server
npm install
```

### 2-2. Vercel CLI 설치 및 로그인

```bash
npm install -g vercel
vercel login
```

### 2-3. 환경변수 설정

```bash
vercel env add NOTION_CLIENT_ID
# → Step 1에서 복사한 OAuth client ID 입력

vercel env add NOTION_CLIENT_SECRET
# → Step 1에서 복사한 OAuth client secret 입력
```

### 2-4. 배포

```bash
# server/ 디렉토리에서 실행
vercel --prod
```

배포 완료 후 출력되는 URL을 복사합니다. (예: `https://notion-job-scraper-server.vercel.app`)

### 2-5. 로컬 개발 서버 (선택사항)

```bash
# server/.env.local 파일 생성
NOTION_CLIENT_ID=your_client_id
NOTION_CLIENT_SECRET=your_client_secret

vercel dev
# → http://localhost:3000/api/token 에서 실행됨
```

---

## Step 3: 확장 프로그램 빌드

### 3-1. 환경변수 설정

`extension/` 디렉토리에 `.env` 파일 생성:

```env
# Notion OAuth Client ID (공개 정보 — 안전하게 클라이언트에 포함 가능)
VITE_NOTION_CLIENT_ID=your_notion_client_id

# Vercel 배포 URL (Step 2에서 획득)
VITE_PROXY_URL=https://your-vercel-app.vercel.app

# 로컬 개발 시 (Vercel dev 실행 중인 경우)
# VITE_PROXY_URL=http://localhost:3000
```

### 3-2. 의존성 설치

```bash
cd extension
npm install
```

### 3-3. Chrome 빌드

```bash
npm run build
# → .output/chrome-mv3/ 디렉토리에 빌드 결과 생성
```

### 3-4. Firefox 빌드

```bash
npm run build:firefox
# → .output/firefox-mv2/ 디렉토리에 빌드 결과 생성
```

### 3-5. 개발 모드 (핫 리로드)

```bash
# Chrome 개발 모드
npm run dev

# Firefox 개발 모드
npm run dev:firefox
```

---

## Step 4: 확장 프로그램 설치

### Chrome

1. `chrome://extensions/` 접속
2. **개발자 모드** 활성화 (우측 상단 토글)
3. **"압축 해제된 확장 프로그램 로드"** 클릭
4. `.output/chrome-mv3/` 디렉토리 선택

5. 설치 후 확장 프로그램 ID 확인:
   - `chrome://extensions/` 페이지의 확장 프로그램 카드에서 ID 복사
   - Notion Integration의 **Redirect URI**에 `https://<ID>.chromiumapp.org/` 추가

### Firefox

1. `about:debugging` 접속
2. **"이 Firefox"** → **"임시 확장 기능 로드"**
3. `.output/firefox-mv2/manifest.json` 파일 선택

---

## Step 5: 초기 설정 (사용자)

1. 확장 프로그램 아이콘 클릭
2. **"Notion으로 연결하기"** 버튼 클릭
3. Notion OAuth 화면에서 **워크스페이스 선택** 및 **권한 허용**
4. 설정 화면에서 저장할 **Database ID** 입력:
   - Notion Database 페이지의 URL에서 32자리 ID 복사
   - 또는 전체 URL 붙여넣기 (자동 추출)
5. **"저장"** 버튼 클릭 → Database 연결 확인

---

## 환경변수 전체 목록

### Extension (`extension/.env`)

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `VITE_NOTION_CLIENT_ID` | ✅ | Notion OAuth Client ID |
| `VITE_PROXY_URL` | ✅ | Vercel Proxy 서버 URL (기본값: `http://localhost:3000`) |

### Server (`server/.env.local` 또는 Vercel 환경변수)

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NOTION_CLIENT_ID` | ✅ | Notion OAuth Client ID |
| `NOTION_CLIENT_SECRET` | ✅ | Notion OAuth Client Secret (**절대 공개 금지**) |

---

## 자주 묻는 질문 (FAQ)

**Q. 페이지를 방문하면 자동으로 데이터가 수집되나요?**
A. **아니요.** 확장 아이콘을 클릭해야만 스크래핑이 시작됩니다. 페이지 방문만으로는 어떤 데이터도 수집·전송되지 않습니다.

**Q. 특정 필드만 저장하고 싶어요.**
A. 팝업에서 각 필드 옆의 **체크박스를 해제**하면 해당 필드가 Notion에 저장되지 않습니다. 단, 직무명(Title)과 URL은 필수 필드이므로 해제할 수 없습니다.

**Q. 스크래핑된 데이터를 수정할 수 있나요?**
A. 네. 팝업의 모든 필드(직무명, 회사명, 마감일, URL, 직무 설명)는 저장 전에 자유롭게 편집할 수 있습니다.

**Q. "Database를 찾을 수 없습니다" 오류가 발생합니다.**
A. Notion Database에 Extension Integration이 공유되어 있는지 확인하세요.
   Database 페이지 → 우측 상단 `···` 메뉴 → **"연결"** → Integration 검색 후 추가

**Q. 스크래핑 후 데이터가 비어있습니다.**
A. 해당 사이트의 HTML 구조가 변경되었을 수 있습니다. `issues`에 URL과 함께 제보해 주세요.

**Q. 원티드에서 다른 공고로 이동해도 데이터가 갱신되지 않습니다.**
A. 팝업을 닫고 다시 열면 현재 페이지의 최신 데이터가 스크래핑됩니다.

**Q. Firefox에서 "Extension ID not found" 오류가 발생합니다.**
A. Firefox 임시 설치의 경우 매번 ID가 변경됩니다. 영구 설치 후 테스트해 주세요.

---

## 라이선스

MIT License
