# Evidence-backed archaeology desk

The **Insights** action opens eight deterministic views of the archive that is already loaded in RepoRewind. The desk does not read source contents, call a remote service, or assign intent, risk, ownership, or quality. Every ranked result is a keyboard-reachable button that moves the main timeline to a supporting commit and selects its path when one is available.

## Metric contract

| View                                   | Definition                                                                                                  | Visible limit                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Frequently changed paths               | Rename-aware file-change entry count, then total additions plus deletions.                                  | Five current paths. A touch is a recorded change entry, not time spent or code quality. |
| Recent versus historical churn         | Added plus deleted lines per commit in the final 20% of the archive versus the preceding 80%.               | Two commit-count windows. Generated files and formatting can dominate line totals.      |
| Contributor concentration by district  | Largest share of recorded commit touches by one contributor in each top-level path.                         | Five districts. This is observed concentration, not authority or maintainership.        |
| Ownership handoffs                     | Transitions where consecutive commits touching a district use different archive contributor IDs.            | Five districts. Alternating authorship is not proof of a formal ownership transfer.     |
| Dormant or deleted high-activity paths | Frequently touched paths that are deleted at the endpoint or have no touch in the final quarter of commits. | Five paths. Dormant in the archive does not mean unused or obsolete.                    |
| Release-to-release structural deltas   | Recorded file-change entries and net line delta between consecutive analyzed tags.                          | Five tag ranges. Missing or out-of-ref tags cannot appear.                              |
| Large renames and migrations           | Commits ranked by renamed-path count, then total changed files.                                             | Five commits. Results depend on the rename evidence reported by Git analysis.           |
| Activity distribution over time        | Commit count and line churn grouped by UTC author year.                                                     | Five highest-commit years. Commit size and author dates can distort comparisons.        |

Ties use stable text or archive-order fallbacks, so the same schema-v1 archive produces the same ordering. Empty sections say that no matching evidence exists instead of inventing a conclusion.

## Archive limits

The desk shows an explicit warning when:

- the archive is truncated, so rankings cover only the retained history;
- only one contributor exists, so handoffs cannot be observed;
- fewer than two analyzed release tags exist, so release deltas are unavailable.

Monorepositories remain separated by top-level district. Rename-heavy histories carry the newest known path while retaining a jump to the commit that supplied the rename evidence.

## Non-WebGL use

The complete desk is rendered as semantic text and controls outside the Three.js scene. It can therefore explain the archive and navigate the shared timeline when the city is unavailable. The dedicated non-WebGL evidence workspace remains a separate roadmap item; this desk is its deterministic data contract.

## Verification

`src/core/archaeology.test.ts` protects deterministic output, bounded evidence indexes, single-author and no-tag archives, truncated monorepo-like histories, and rename-heavy histories. `src/App.test.tsx` exercises the text-only panel and evidence navigation with the 3D scene replaced by a test double.
