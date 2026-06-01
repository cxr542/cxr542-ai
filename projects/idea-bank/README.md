# idea-bank — 개발·운영 워크플로 (파일럿)

로컬 아이디어 노트. **코드는 Git**, **아이디어 데이터는 브라우저**에만 있습니다.

| URL | 용도 |
|-----|------|
| https://cxr542.github.io/cxr542-ai/projects/idea-bank/ | **운영** (실제 아이디어) |
| http://localhost:8080/projects/idea-bank/ | **개발** (`npm run preview`) |

## 브랜치

| 브랜치 | 역할 |
|--------|------|
| `develop` | 일상 개발 — commit + push 반복 (브랜치 새로 만들 필요 없음) |
| `main` | 운영 — merge 시 GitHub Pages 자동 배포 |

## 일상 개발 (집·사무실 공통)

```bash
cd cxr542-ai
git checkout develop
git pull origin develop

npm run preview
# → http://localhost:8080/projects/idea-bank/

# ... 수정 후 ...
git add projects/idea-bank/   # 또는 필요한 경로
git commit -m "idea-bank: 변경 요약"
git push origin develop
```

- localhost 데이터와 운영(github.io) 데이터는 **origin이 달라 분리**됩니다.
- 테스트용 아이디어는 localhost, **실제 기록은 운영 URL**에서 관리하는 것을 권장합니다.

## 운영 배포 (릴리스)

1. 운영 URL에서 **JSON보내기**로 백업 (OneDrive 등에 보관)
2. `develop`에서 로컬 preview로 최종 확인
3. GitHub에서 PR: `develop` → `main` (체크리스트 확인)
4. merge 후 Pages 배포 (수 분 소요)
5. 운영 URL에서 동작 확인 — 문제 시 JSON 가져오기로 복구

## 데이터 백업

- **Git에 올라가지 않음:** IndexedDB / localStorage의 아이디어 본문
- **백업:** 툴바 「JSON보내기」
- **복구:** 「JSON 가져오기」
- 운영 URL 사용 시 2주마다 export 권장 (앱 배너에 안내 표시)

## 코드 변경 시 주의 (`js/db.js`)

- `DB_VERSION`을 올리면 기존 사용자 DB 마이그레이션이 필요합니다. **운영 배포 전에 로컬에서 충분히 검증**하세요.
- 시드 데이터(`defaultSeed`) 변경은 **빈 DB에만** 적용됩니다 (`seedIfEmpty`).

## 관련 파일

| 파일 | 설명 |
|------|------|
| `index.html` | 앱 셸 |
| `js/app.js` | UI·라우팅 |
| `js/db.js` | IndexedDB / localStorage |
| `js/hub-checklist.js` | 허브 승격 체크리스트 |
| `../shared/` | project-shell (사이드바·배너) |
