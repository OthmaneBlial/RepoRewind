# Three.js compatibility decision

Status: accepted on 2026-08-21.

RepoRewind pins Three.js and its TypeScript declarations to r182 while using React Three Fiber 9.7.

React Three Fiber 9.7 constructs `THREE.Clock` internally. Three.js deprecated that API in r183 in favor of `THREE.Timer`, which creates a browser-console warning even though RepoRewind does not instantiate the clock directly. Fiber's declared peer range supports r182, and RepoRewind does not require a newer Three.js API.

The Canvas receives an explicit `PCFShadowMap` object instead of Fiber's soft-shadow default, avoiding the separate `PCFSoftShadowMap` deprecation path.

This is a compatibility pin, not an abandoned dependency. Re-test the latest Three.js release after React Three Fiber migrates its internal root clock. The upgrade gate is a clean browser console plus the complete visual, interaction, type, test, and production-build validation loop.
