# Real Moog 1960

1960년대 대형 Moog 모듈러 시스템의 핵심 사용 경험을 브라우저에서 재구성한 교육용 웹 신디사이저다. 검은 패널, 은색 레일, 물리 노브, 패치 케이블을 당시 장비의 시각 언어로 구성했으며, 화면의 케이블은 실제 Web Audio 신호 그래프를 바꾼다.

> 이 프로젝트는 Moog Music과 관련 없는 독립 교육용 해석이다. 실제 901/902/904A/911 회로를 SPICE 수준으로 복제한 회로 에뮬레이터가 아니라, 그 모듈의 동작과 패칭 방식을 브라우저 오디오 노드로 재현한 웹 악기다.

## 바로 실행하기

빌드와 설치가 필요 없다.

1. ZIP을 푼다.
2. 루트의 `index.html`을 Chrome, Edge, Firefox 또는 Safari에서 연다.
3. 상단 `POWER`를 누른다.
4. 기본 `WARM BASS` 패치에서 화면 건반이나 컴퓨터 키 `A W S E D F T G Y H U J K`를 누른다.

로컬 서버를 사용하려면 프로젝트 루트에서 다음 중 하나를 실행한다.

```bash
python -m http.server 8080
```

```bash
npx serve .
```

그다음 `http://localhost:8080`으로 접속한다. 오디오는 브라우저 정책상 반드시 사용자가 `POWER`를 누른 뒤 시작된다.

## 구현된 기능

- 901 스타일 VCO 3개: sine, triangle, sawtooth, square 동시 출력
- VCO별 옥타브, 세부 튜닝, CV 변조량과 미세한 독립 드리프트
- White/Pink noise와 3파형 LFO
- CP3 스타일 4채널 믹서 및 소프트 새추레이션
- 904A 스타일 저역통과 필터: cutoff, regeneration, CV amount, drive
- 911 스타일 ADSR envelope 2개
- 902 스타일 VCA와 실제 CV 제어
- 8스텝 시퀀서: 스텝별 반음 값, 템포, CV/Gate 출력
- 25건반 화면 키보드, PC 키보드 연주, octave shift, glide
- Audio/CV/Gate를 구분하는 드래그 앤드 드롭 패치 케이블
- 입력 잭 1개당 케이블 1개, 출력 fan-out, 오디오 피드백 순환 방지
- Warm Bass, Glass Lead, Lunar Pulse, Self Sweep, Blank 패치
- 실시간 오실로스코프, VU meter, master safety compressor, Panic
- 마우스 세로 드래그·휠·화살표 키·더블클릭 초기화를 지원하는 노브
- 외부 폰트, 샘플, CDN, API 호출이 없는 완전 정적 구성

## 기본 패치의 신호 흐름

```text
VCO 1/2/3 ──AUDIO──> MIXER ──AUDIO──> FILTER ──AUDIO──> VCA ──AUDIO──> OUTPUT
     ▲                                         ▲
     │                                         │
KEYBOARD CV                          ENVELOPE 1 CONTROL
                                               ▲
KEYBOARD GATE ─────────────────────────────────┘

ENVELOPE 2 CONTROL ──> FILTER CUTOFF
```

검은/은색 잭은 `AUDIO`, 황색 잭은 `CONTROL VOLTAGE`, 적색 잭은 `GATE`다. 서로 다른 신호 유형은 연결되지 않는다.

## 조작법

- 케이블: 출력 잭에서 입력 잭까지 드래그한다. 두 잭을 차례로 클릭하거나 키보드의 Enter/Space로도 연결할 수 있다.
- 케이블 제거: 케이블을 더블클릭하거나 하단 `PATCH CORDS` 목록의 ×를 누른다.
- 노브: 위아래로 드래그하거나 마우스 휠을 사용한다. `Shift`를 누르면 미세 조정한다. 더블클릭하면 기본값이다.
- 건반: 화면 건반 또는 `A W S E D F T G Y H U J K`를 사용한다. `Z/X`는 옥타브를 이동한다.
- 시퀀서: `LUNAR PULSE` 프리셋을 불러오고 `SEQUENCER`를 누르면 동작을 바로 확인할 수 있다.
- 응급 정지: `PANIC`은 모든 Gate와 Envelope를 해제한다.

## GitHub Pages 배포

이 프로젝트는 상대 경로만 쓰는 정적 사이트다.

1. 파일 구조를 그대로 저장소 루트에 올린다.
2. GitHub 저장소의 `Settings → Pages`로 이동한다.
3. `Deploy from a branch`, `main`, `/ (root)`를 선택한다.
4. 별도 빌드 명령은 필요 없다.

프로젝트 페이지 저장소에서도 절대 경로를 사용하지 않으므로 `https://계정.github.io/저장소명/`에서 실행된다.

## 파일 구조

```text
Real-Moog-1960/
├── index.html
├── assets/
│   └── favicon.svg
├── css/
│   └── style.css
├── js/
│   ├── knob.js
│   ├── audio-engine.js
│   ├── patch-bay.js
│   ├── sequencer.js
│   ├── visualizer.js
│   └── app.js
├── tests/
│   └── smoke.mjs
├── QA-KR.md
├── README.md
├── README-KR.md
└── LICENSE
```

`index.html`은 ES module을 사용하지 않는 일반 스크립트를 순서대로 로드한다. 따라서 로컬 `file://`로 직접 열어도 모듈 CORS 오류가 없다.

## 오디오 구현

외부 Tone.js 번들을 넣는 대신 같은 모듈형 신호 그래프를 브라우저 네이티브 Web Audio API로 구현했다. 덕분에 네트워크 없이 실행되고 GitHub Pages에도 별도 빌드 없이 배포할 수 있다.

- VCO: `OscillatorNode`
- Mixer/VCA/CV attenuator: `GainNode`
- Envelope와 keyboard/sequencer CV: `ConstantSourceNode + AudioParam automation`
- 904A 근사: 직렬 `BiquadFilterNode` 2개 + 입력 waveshaping
- CP3/출력 warmth: oversampled `WaveShaperNode`
- 안전 출력: `DynamicsCompressorNode + GainNode`
- 모니터: `AnalyserNode`

필터는 24 dB/octave의 응답과 포화감을 교육적으로 근사하지만, 실제 Moog transistor ladder의 온도·부품 편차·비선형 피드백을 회로 단위로 모델링하지는 않는다.

## 테스트

웹앱 실행에는 Node.js가 필요 없지만 자동 검증에는 Node.js 20 이상을 사용할 수 있다.

```bash
npm install
npm test
```

Smoke test는 초기 DOM, 25건반, 13개 기본 케이블, 12개 오디오 발진기, 전원/정지, 노브→AudioParam 반영, 프리셋 전환, 시퀀서, 케이블 라우팅과 피드백 차단을 검사한다.

## 설계 참고 자료

- [1967 R.A. Moog Catalog — Bob Moog Foundation](https://moogfoundation.org/wp-content/uploads/1967-R.A.-Moog-Catalog.pdf)
- [Moog 901 Voltage Controlled Oscillator — Smithsonian](https://americanhistory.si.edu/collections/object/nmah_609212)
- [Moog 904A Voltage Controlled Low Pass Filter — Smithsonian](https://americanhistory.si.edu/collections/object/nmah_609209)
- [Moog 902 Voltage Controlled Amplifier — Smithsonian](https://www.americanhistory.si.edu/collections/object/nmah_609216)
- [Tone.js Envelope reference](https://tonejs.github.io/docs/15.1.22/classes/Envelope.html)
- [Web Audio API specification](https://webaudio.github.io/web-audio-api/)

## 라이선스

코드는 MIT License다. Moog 및 관련 제품명은 각 권리자의 상표일 수 있으며, 본 프로젝트의 교육적 식별·설명 용도로만 사용된다.
