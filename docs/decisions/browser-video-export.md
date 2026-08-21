# Browser video export decision

Status: accepted on 2026-08-20.

RepoRewind offers two explicit browser-native film delivery paths:

1. H.264/MP4 through MediaBunny when the exact resolution and quality pass a runtime WebCodecs capability probe.
2. MediaRecorder WebM as a visible compatibility path, preferring VP9 and then VP8.

The MP4 renderer owns its frame schedule. Each canvas frame has an explicit timestamp and duration, encoder/writer backpressure is awaited, frames are never intentionally dropped, and keyframes use a fixed cadence. This makes visual frame selection and timeline semantics reproducible. Hardware and browser codecs may still produce different H.264 bytes, so byte-identical files are not part of the product contract.

The current short-film presets use an in-memory fast-start MP4. If future presets can produce materially larger files, switch to a streaming target or the File System API rather than increasing memory use without a bound.

Primary references:

- [MediaBunny writing files](https://mediabunny.dev/guide/writing-media-files)
- [MediaBunny CanvasSource](https://mediabunny.dev/api/CanvasSource)
- [MediaBunny capability probe](https://mediabunny.dev/api/canEncodeVideo)
- [W3C WebCodecs](https://www.w3.org/TR/webcodecs/)
- [W3C AVC registration](https://www.w3.org/TR/webcodecs-avc-codec-registration/)
- [MDN VideoEncoder](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder)
