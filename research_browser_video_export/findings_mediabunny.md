# MediaBunny browser MP4 findings

Checked 2026-08-20 against MediaBunny's official docs, repository, and npm registry metadata.

## Recommendation

Use MediaBunny's `CanvasSource` for RepoRewind's deterministic offline renderer. It accepts explicit timestamps and durations instead of sampling wall-clock time, and `add()` returns a promise that must be awaited for encoder/writer backpressure. Use AVC/H.264 (`codec: 'avc'`) inside `Mp4OutputFormat`, `latencyMode: 'quality'` so the encoder cannot drop frames, and `output.addVideoTrack(source, { frameRate })` so media timestamps are snapped to the chosen frame grid.

This makes frame selection, timing, and duration deterministic. It does **not** promise byte-identical MP4 files across browsers or machines: the actual WebCodecs/hardware encoder and generated codec configuration may differ. Test deterministic frame count/timestamps and decoded visual results, not an MP4 byte hash.

## Current package and license

- Package: `mediabunny`; official npm metadata reported `1.55.1` as `latest` on 2026-08-20. Pin `"mediabunny": "1.55.1"` while implementing because this API is moving quickly.
- License: Mozilla Public License 2.0 (`MPL-2.0`), a weak file-level copyleft license. Normal use from an open- or closed-source project is allowed. If MediaBunny's own licensed source is modified and the modification is distributed, those modified source files must be published under MPL-2.0. Keep its license/copyright notices.
- npm: https://www.npmjs.com/package/mediabunny
- official repository and license explanation: https://github.com/Vanilagy/mediabunny

## Exact canvas-to-MP4 API

```ts
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeVideo,
} from 'mediabunny';

const fps = 30;
const width = 1920;
const height = 1080;
const quality = new Quality({ bitrate: 12_000_000 });

// Probe the actual browser, dimensions, quality, and encoding mode. AVC is the
// MediaBunny codec name for H.264.
const canMakeMp4 =
  new Mp4OutputFormat().getSupportedVideoCodecs().includes('avc') &&
  await canEncodeVideo('avc', {
    width,
    height,
    quality,
    latencyMode: 'quality',
  });

if (!canMakeMp4) throw new Error('AVC/H.264 MP4 encoding is unavailable');

const target = new BufferTarget();
const output = new Output({
  format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
  target,
});

const source = new CanvasSource(canvas, {
  codec: 'avc',
  quality,
  keyFrameInterval: 2,       // seconds; also the documented default
  latencyMode: 'quality',    // quality mode cannot drop frames
  alpha: 'discard',
});

output.addVideoTrack(source, { frameRate: fps });
await output.start();

for (let frame = 0; frame < frameCount; frame++) {
  renderExactRepoRewindFrame(frame); // synchronous render into canvas
  await source.add(
    frame / fps,               // timestamp in seconds
    1 / fps,                   // duration in seconds
    { keyFrame: frame % (2 * fps) === 0 },
  );
}

await output.finalize();
if (!target.buffer) throw new Error('MP4 target did not finalize');
const mp4 = new Blob([target.buffer], { type: 'video/mp4' });
```

Relevant exact signatures:

- `new CanvasSource(canvas: HTMLCanvasElement | OffscreenCanvas, encodingConfig: VideoEncodingConfig)`
- `CanvasSource.add(timestamp: number, duration?: number, encodeOptions?: VideoEncoderEncodeOptions): Promise<void>`; timestamps/durations are seconds.
- `new Output({ format: new Mp4OutputFormat(options), target: new BufferTarget() })`
- `output.addVideoTrack(source, { frameRate })`, `await output.start()`, `await output.finalize()`
- `BufferTarget.buffer: ArrayBuffer | null`; it becomes available after finalization.

Official sources:

- output lifecycle and canvas example: https://mediabunny.dev/guide/writing-media-files
- `CanvasSource` API: https://mediabunny.dev/api/CanvasSource
- media source examples and backpressure: https://mediabunny.dev/guide/media-sources
- `VideoEncodingConfig`: https://mediabunny.dev/api/VideoEncodingConfig
- `Mp4OutputFormat`: https://mediabunny.dev/api/Mp4OutputFormat
- `BufferTarget`: https://mediabunny.dev/api/BufferTarget

## Raw-frame alternative

For a renderer that already owns `VideoFrame`, `CanvasImageSource`, or raw RGBA buffers, replace `CanvasSource` with `VideoSampleSource` and create a timestamped `VideoSample` per frame:

```ts
import { Quality, VideoSample, VideoSampleSource } from 'mediabunny';

const source = new VideoSampleSource({
  codec: 'avc',
  quality: new Quality({ bitrate: 12_000_000 }),
  latencyMode: 'quality',
});
output.addVideoTrack(source, { frameRate: fps });

const sample = new VideoSample(rgbaBytes, {
  format: 'RGBA',
  codedWidth: width,
  codedHeight: height,
  timestamp: frame / fps,
  duration: 1 / fps,
});
try {
  await source.add(sample, { keyFrame: frame % (2 * fps) === 0 });
} finally {
  sample.close();
}
```

`VideoSampleSource.add(sample, encodeOptions?)` is awaitable. `VideoSample` can wrap a `VideoFrame`, a `CanvasImageSource`, an `AllowSharedBufferSource` with pixel metadata, or a custom resource. Close samples promptly.

Official sources:

- `VideoSampleSource`: https://mediabunny.dev/api/VideoSampleSource
- `VideoSample` constructors: https://mediabunny.dev/api/VideoSample
- timestamp/duration and raw pixel fields: https://mediabunny.dev/api/VideoSampleInit

## Browser capability and fallback policy

1. Call `await canEncodeVideo('avc', { width, height, quality, latencyMode: 'quality' })`. Its documented signature returns `Promise<boolean>` and checks the current browser with those parameters; do not infer support from browser name alone.
2. Also confirm the container accepts AVC with `new Mp4OutputFormat().getSupportedVideoCodecs().includes('avc')` (container compatibility, not device encoding capability).
3. Keep RepoRewind's existing MediaRecorder/WebM path when the probe is false. Also catch runtime encoder/start/finalize failures and offer WebM without discarding the user's render settings.
4. Use `latencyMode: 'quality'`: official docs state this mode cannot drop frames; `realtime` may drop frames under load.
5. Omit `fullCodecString` unless a tested playback requirement demands a particular AVC profile/level. MediaBunny constructs a fitting codec string automatically; over-constraining it can reduce support.

Capability source: https://mediabunny.dev/api/canEncodeVideo

## MP4 layout choice

- `Mp4OutputFormat({ fastStart: 'in-memory' })` creates a regular compact Fast Start MP4 suitable for upload/playback, but holds media chunks in memory until finalization.
- `BufferTarget` is officially recommended only for small-ish files (roughly under 100 MB); long 4K exports should use `StreamTarget`/the File System API and a suitable MP4 layout.
- Avoid choosing `fastStart: 'fragmented'` as the default download: official docs warn fragmented MP4 is less widely supported and some players cannot seek it.
- Calling `await output.finalize()` completes remaining encoding and writes the remaining MP4 data. No frames may be added afterward.

Official format/target details: https://mediabunny.dev/guide/output-formats and https://mediabunny.dev/guide/writing-media-files
