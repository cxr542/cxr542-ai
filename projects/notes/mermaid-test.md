# Mermaid 미리보기 테스트

아래 다이어그램이 미리보기에서 보이면 설치가 정상입니다.

`Ctrl+Shift+V` 또는 `Ctrl+K V`로 미리보기를 열어 확인하세요.

```mermaid
flowchart LR
    A[시작] --> B{조건}
    B -->|예| C[완료]
    B -->|아니오| A
```

```mermaid
flowchart TD
    Install[확장 설치] --> OpenMD[.md 파일 작성]
    OpenMD --> Preview[Ctrl+Shift+V 미리보기]
    Preview --> Done[다이어그램 표시]
```
