# Browser video export research plan

## Main question

What current, open-source browser APIs and muxing library can RepoRewind use to render deterministic MP4 time-lapse video entirely on-device, alongside its existing MediaRecorder WebM path?

## Subtopics

1. MediaBunny official API and licensing
   - Current package and license
   - Canvas or raw-frame video source API
   - MP4/H.264 output configuration and finalization
   - Browser capability checks and documented limitations

2. WebCodecs platform constraints
   - Official browser API requirements and availability
   - H.264 configuration probing
   - Deterministic timestamp/frame handling
   - Appropriate fallback behavior when unsupported

## Synthesis

Choose the smallest maintained dependency and API path that keeps source code and frames local, produces standards-compatible MP4 when supported, retains WebM fallback, and can be tested without claiming unsupported browser coverage.

Decision recorded in `docs/decisions/browser-video-export.md`: MediaBunny 1.55.1 with explicit canvas timestamps and awaited backpressure for H.264/MP4, plus the existing MediaRecorder WebM compatibility path. Deterministic timing is in scope; byte-identical hardware-encoded output is not.
