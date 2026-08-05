# Notion Job Scraper Browser Extension

한국 주요 채용 사이트에서 채용 공고를 자동으로 스크래핑하여 Notion 데이터베이스에 동기화하는 크로스 브라우저(Chrome/Firefox) 확장 프로그램입니다.

## 지원 사이트

| 사이트 | URL 패턴 | 파싱 전략 |
|--------|----------|-----------|
| 자소설닷컴 | `jasoseol.com/recruit/*` | DOM 선택자 + og:title fallback |
| 원티드 | `www.wanted.co.kr/jobdetail/*` | `__NEXT_DATA__` JSON + DOM fallback + SPA 감지 |
| 사람인 | `www.saramin.co.kr/zf_user/jobs/view*` | JSON-LD + DOM fallback |
| 잡코리아 | `www.jobkorea.co.kr/Recruit/GI_Read/*` | JSON-LD + DOM fallback |

---

## 프로젝트 구조

```
notion-job-scraper/
├── extension/                     # WXT 브라우저 확장 프로그램
│   ├── wxt.config.ts              # WXT 설정 (Chrome/Firefox MV3)
│   ├── package.json
│   ├── entrypoints/
│   │   ├── popup/                 # React UI 팝업
│   │   ├── content/               # 사이트별 스크래퍼
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

| 속성명 | 타입 | 설명 |
|--------|------|------|
| `Title` | 제목 | 직무명 (기본 속성) |
| `Company` | 텍스트 | 회사명 |
| `URL` | URL | 채용 공고 링크 |
| `Deadline` | 날짜 | 마감일 (캘린더 동기화용) |
| `Status` | 선택 | 지원 상태 (기본값: "지원 예정") |

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
# → .output/firefox-mv3/ 디렉토리에 빌드 결과 생성
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
3. `.output/firefox-mv3/manifest.json` 파일 선택

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

## 사용 방법

1. 지원하는 채용 사이트에서 채용 공고 상세 페이지 열기
2. 브라우저 툴바에서 **Notion Job Scraper** 아이콘 클릭
3. 스크래핑된 공고 정보 확인 (제목, 회사, 마감일, 설명)
4. 상시채용인 경우 날짜 선택기에서 마감일 직접 입력 (선택사항)
5. **"Notion에 저장"** 버튼 클릭

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
