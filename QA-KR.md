# Real Moog 1960 v1.0.0 QA

검증일: 2026-09-19

## 자동 검증 결과

`node tests/smoke.mjs` 통과.

| 항목 | 결과 |
|---|---:|
| 초기 건반 생성 | 25 keys |
| Warm Bass 기본 패치 | 13 cords |
| 오디오 발진기 | 12 oscillators |
| 등록 입력 | 14 inputs |
| 등록 출력 | 26 outputs |
| 중복 HTML ID | 0 |

검사 범위:

- JavaScript 6개 파일 구문 검사
- Web Audio 전원 초기화, resume, suspend
- 초기 패치 케이블과 실제 오디오 그래프 연결 수 일치
- 1 V/octave 기준 keyboard CV 반영
- 필터 노브 값이 2단 필터의 `AudioParam`에 반영
- Lunar Pulse 프리셋 전환과 8-step sequencer start/stop
- 케이블 전체 제거, 재연결, 동일 모듈 피드백 차단
- 25건반 DOM과 고유 ID 확인

## 수동 확인 체크리스트

- [x] 모든 파일이 상대 경로로 연결됨
- [x] 외부 CDN, 폰트, 샘플, API 요청 없음
- [x] `index.html` 직접 열기 호환을 위해 ES module 미사용
- [x] 데스크톱 랙 전체 레이아웃과 모바일 가로 스크롤 규칙 구성
- [x] Audio/CV/Gate 잭 색과 연결 호환성 분리
- [x] 브라우저 사용자 제스처 이후에만 AudioContext 시작
- [x] Master gain, compressor, Panic 및 오디오 순환 차단 적용
- [x] GitHub Pages 하위 경로 호환

## 알려진 범위

- 실제 904A transistor ladder 회로의 부품 단위 모델이 아니라, 직렬 Biquad 필터와 비선형 waveshaping을 사용한 청감적 근사다.
- 브라우저/오디오 장치에 따라 출력 레벨과 latency가 조금 다를 수 있다.
- 브라우저 자동재생 정책 때문에 페이지를 연 직후에는 무음이며 `POWER` 또는 건반의 사용자 입력이 필요하다.
