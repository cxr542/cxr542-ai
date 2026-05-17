# AI 학습·실험 허브

김윤형의 AI 도구·Cursor 실험 카드 대시보드 (프로필 사이트와 동일 톤).

- **허브:** https://cxr542.github.io/cxr542-ai/
- **프로필:** https://cxr542.github.io/
- **작업 공간:** 상위 `cursorstudy/` — [SETUP.md](../SETUP.md)

## 명령 (Windows / macOS 동일)

```bash
npm install
npm run sync:projects    # ../experiments, ../notes → ai/projects.json
npm run preview          # http://localhost:8080
npm run deploy:react_test
npm run deploy:notes
npm run deploy:all
```

## 구조

| 경로 | 설명 |
|------|------|
| `index.html` | 랜딩 |
| `ai/services.json` | AI 서비스 카드 |
| `ai/projects.json` | cursorstudy 실험·메모 카드 |
| `projects/<id>/` | Pages 데모 산출물 |
| `scripts/sync-projects.mjs` | 프로젝트 목록 동기화 |
| `scripts/deploy-project.mjs` | 빌드 후 `projects/` 복사 |

## 배포

`main`에 push하면 GitHub Pages에 반영됩니다.  
실험 데모 URL: `https://cxr542.github.io/cxr542-ai/projects/<id>/`
