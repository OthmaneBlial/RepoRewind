# WebCodecs constraints for deterministic browser export

Research date: 2026-08-20. Sources are limited to MDN, W3C, and Chrome developer documentation.

## Platform availability and context

- `VideoEncoder` is **not Baseline** on MDN; some widely used browsers still lack it. It must be treated as an optional acceleration path, never as the only export path.
- It is exposed only in a **secure context** and only on `Window` and `DedicatedWorker` (not Service Worker or Shared Worker). Production therefore needs HTTPS. Loopback origins such as `http://localhost` and `http://127.0.0.1` are potentially trustworthy for local development.
- Check `globalThis.isSecureContext`, `typeof VideoEncoder !== "undefined"`, and `typeof VideoFrame !== "undefined"` before presenting MP4/WebCodecs as available. Moving rendering/encoding to a dedicated worker is permitted and is recommended by Chrome to avoid main-thread pressure.

Sources: [MDN VideoEncoder](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder), [W3C WebCodecs VideoEncoder interface](https://www.w3.org/TR/webcodecs/#videoencoder-interface), [MDN secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts), [Chrome WebCodecs guide](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)

## Capability probing and H.264 configuration

- Browser support for WebCodecs does **not** imply H.264 encoding support. W3C explicitly says implementations are not required to support AVC/H.264, and support may change at runtime when hardware/resources change.
- Probe the **exact intended configuration** with `await VideoEncoder.isConfigSupported(config)` before constructing/configuring the encoder: codec profile/level, width, height, bitrate, frame rate, bitrate mode, hardware preference, and the AVC extension. Invalid values reject with `TypeError`; `supported: false` means try another configuration. `configure()` can still fail asynchronously with `NotSupportedError`, so retain the encoder error callback and fallback path.
- Use a fully qualified AVC codec string. MDN demonstrates trying profile/level candidates from higher to lower capability, for example `avc1.64003e`, `avc1.4d0034`, `avc1.42003e`, and `avc1.42001f`, while probing the actual resolution/rate. Do not hard-code one string as universally supported.
- For MP4 muxing, explicitly request `avc: { format: "avc" }` (also the specification default). This produces length-prefixed AVC samples; SPS/PPS are delivered as the `AVCDecoderConfigurationRecord` in `metadata.decoderConfig.description`. Preserve every emitted decoder-config change and give it to the muxer. `annexb` instead carries parameter sets in-band and is described as the live-streaming-oriented form.
- `isConfigSupported()` returns a normalized copy containing only fields the user agent recognized. Comparing it with the request can catch silently ignored optional fields.

Representative probe (the chosen codec/profile and bitrate are policy, not guaranteed support):

```ts
const config: VideoEncoderConfig = {
  codec: "avc1.4d0034",
  width: 1920,
  height: 1080,
  bitrate: 8_000_000,
  framerate: 30,
  bitrateMode: "variable",
  hardwareAcceleration: "no-preference",
  latencyMode: "quality",
  avc: { format: "avc" },
};

const support = await VideoEncoder.isConfigSupported(config);
if (!support.supported) throw new Error("WEB_CODECS_H264_UNSUPPORTED");
```

Sources: [MDN `isConfigSupported()`](https://developer.mozilla.org/en-US/docs/Web/API/VideoEncoder/isConfigSupported_static), [MDN codec selection](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Codec_selection), [W3C configuration support](https://www.w3.org/TR/webcodecs/#check-configuration-support), [W3C AVC registration](https://www.w3.org/TR/webcodecs-avc-codec-registration/)

## Deterministic frame timing

- `VideoFrame` timestamps and optional durations are integers in **microseconds**. The encoder copies the associated input frame's timestamp and duration into the output `EncodedVideoChunk`, so generated timing can be independent of wall-clock speed.
- For frame `i` at `fps`, calculate boundaries from the rational timeline rather than repeatedly adding a rounded duration:

```ts
const startUs = Math.round((i * 1_000_000) / fps);
const endUs = Math.round(((i + 1) * 1_000_000) / fps);
const frame = new VideoFrame(canvas, {
  timestamp: startUs,
  duration: endUs - startUs,
});
```

  This avoids accumulated drift at rates such as 30 fps. Feed the emitted chunk timestamp/duration to the muxer; do not derive media time from callback arrival time.
- `encode()` is asynchronous and clones the frame. Call `frame.close()` immediately after `encode()` to release its backing resources. For an offline/professional export, **never drop a frame** because `encodeQueueSize` is high; apply backpressure by waiting for `dequeue`/a lower queue size. Await `encoder.flush()` after the final frame, then finalize the muxer and `encoder.close()`.
- Request keyframes on a deterministic cadence with `encoder.encode(frame, { keyFrame: true })` where needed. The specification requires a requested keyframe to be encoded as one.

Sources: [MDN `VideoFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/VideoFrame), [W3C output-chunk timing](https://www.w3.org/TR/webcodecs/#output-encodedvideochunks), [W3C encoder methods and queue](https://www.w3.org/TR/webcodecs/#videoencoder-methods), [Chrome WebCodecs guide](https://developer.chrome.com/docs/web-platform/best-practices/webcodecs)

## What “deterministic” can honestly mean

WebCodecs can make the **rendered frame sequence, timestamps, durations, event pacing, and keyframe requests deterministic**. It cannot promise byte-for-byte identical MP4/H.264 files across browsers, operating systems, devices, or even changing hardware resources: the user agent chooses the underlying codec implementation, hardware acceleration is a hint, bitrate fluctuation is implementation-defined, and support is best-effort/dynamic.

If reproducible bytes are a hard requirement, use a pinned software encoder in a controlled native/WASM pipeline. For RepoRewind's browser export, the defensible promise is deterministic visual/media timing, not a bit-identical encoded bitstream.

Sources: [W3C encoder implementation model](https://www.w3.org/TR/webcodecs/#videoencoder-interface), [W3C `VideoEncoderConfig`](https://www.w3.org/TR/webcodecs/#video-encoder-config), [W3C configuration support](https://www.w3.org/TR/webcodecs/#check-configuration-support)

## Recommended RepoRewind fallback order

1. Offer WebCodecs H.264/MP4 only when the secure-context/API checks and an exact `isConfigSupported()` probe succeed.
2. If the preferred profile fails, probe a short ordered list of lower AVC profiles/levels or a reduced resolution preset. Show the actual chosen output settings.
3. If the API is missing, H.264 is unsupported, configuration/encoding fails, or muxer finalization fails, keep the existing MediaRecorder WebM exporter available and surface a clear non-fatal reason. Do not silently relabel WebM as MP4.
4. Abort partial MP4 output, close frames/encoder, and allow an immediate WebM retry. Preserve the user's chosen timeline, duration, camera path, and resolution when the fallback can support them.
5. Test capability at export time rather than caching a permanent browser-support answer, because the specification allows support to change with resources/hardware.

This fallback behavior is an implementation recommendation inferred from the documented optional/dynamic support model and Chrome's guidance to “try another config” when a probe fails.
