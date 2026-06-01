## Summary

<!-- develop → main 릴리스 PR. idea-bank 변경이 포함되면 아래 idea-bank 체크리스트를 확인하세요. -->

## idea-bank 릴리스 체크리스트

배포 대상에 `projects/idea-bank/` 변경이 있으면:

- [ ] 운영 URL(https://cxr542.github.io/cxr542-ai/projects/idea-bank/)에서 **JSON보내기** 백업 완료
- [ ] 로컬 `npm run preview` → `/projects/idea-bank/` 에서 목록·새 아이디어·JSON import/export 확인
- [ ] `js/db.js`의 `DB_VERSION` 변경 없음 (또는 마이그레이션 코드 포함·검증 완료)

## Test plan

- [ ] 
