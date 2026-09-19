# Real Moog 1960

An offline, static educational web synthesizer inspired by the patching workflow and visual language of large 1960s Moog modular systems. Patch cords alter the actual Web Audio graph; knobs, CV, gates, envelopes, sequencer, keyboard, scope, and output all work in real time.

> Independent educational interpretation. Not affiliated with or endorsed by Moog Music. This is not a transistor-level/SPICE clone of the original circuits.

## Run

No build is required. Open `index.html` directly, press **POWER**, and play with the on-screen keyboard or `A W S E D F T G Y H U J K`.

Optional local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Highlights

- Three 901-style oscillators with simultaneous sine, triangle, saw, and square outputs
- White/pink noise, three-wave LFO, four-channel saturated mixer
- 904A-style 24 dB/oct low-pass approximation with drive and CV input
- Dual 911-style ADSR contours and a 902-style VCA
- Eight-step CV/gate sequencer and a 25-key performance keyboard
- Drag-and-drop Audio/CV/Gate patch cords that rewire the live graph
- Four playable presets plus a blank panel
- Oscilloscope, VU meter, output compressor, and panic control
- No CDN, samples, fonts, analytics, network calls, or runtime dependencies

Native Web Audio is used instead of a hosted Tone.js bundle so the instrument works offline and from GitHub Pages without a build step. The architecture uses `OscillatorNode`, `GainNode`, `ConstantSourceNode`, automated `AudioParam`s, cascaded `BiquadFilterNode`s, `WaveShaperNode`, and `AnalyserNode`.

## GitHub Pages

Commit the folder contents at the repository root, then select **Settings → Pages → Deploy from a branch → main → /(root)**. All assets use relative paths, so project pages are supported.

## Controls

- Drag an output jack to a compatible input jack; Audio, CV, and Gate types are color coded.
- Double-click a cable, or use the × in **PATCH CORDS**, to remove it.
- Drag knobs vertically, use the mouse wheel, or use arrow keys. Shift gives fine adjustment; double-click restores a default.
- Use `Z/X` to shift keyboard octaves.
- Load **Lunar Pulse** and press **SEQUENCER** for an immediate sequencer demo.

See [README-KR.md](README-KR.md) for detailed Korean documentation and [QA-KR.md](QA-KR.md) for the verification record.

## References

- [1967 R.A. Moog Catalog](assets/1967-R.A.-Moog-Catalog.pdf)
- [Smithsonian Moog 901 VCO](https://americanhistory.si.edu/collections/object/nmah_609212)
- [Tone.js Envelope reference](https://tonejs.github.io/docs/15.1.22/classes/Envelope.html)
- [Web Audio API specification](https://webaudio.github.io/web-audio-api/)

## License

MIT. Moog and related product names may be trademarks of their respective owners and are used only for educational identification and commentary.
