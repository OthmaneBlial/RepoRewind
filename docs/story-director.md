# Deterministic Story Director

Story Director turns one archive into a proposed, evidence-backed narrative without a language model. Open **Export film**, expand **Review chapter plan and Git evidence**, then reorder, exclude, or retitle chapters before rendering. **View Git evidence** moves the local timeline to the commit supporting that chapter.

The same schema-v1 archive produces the same initial chapter plan. Scores use only the commits present in the archive; the current clock, network services, popularity data, and source contents never participate.

## Chapter definitions

| Chapter            | Selection rule                                                                                | Tie break                                       |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Origins            | First commit through the first recorded release; without releases, the opening 20% of commits | First release by commit order, then lexical tag |
| Growth spurt       | Highest positive line growth plus 40 points per created file in a bounded 2–8 commit window   | Earliest window                                 |
| Rebuild            | 100 points per rename, 25 per deletion, 5 per modification, and 30 for a merge                | Earliest commit                                 |
| Release to release | Consecutive release range with the most recorded file-change entries                          | Earliest range                                  |
| Ownership journey  | District with 100 points per author handoff plus commit touches                               | Lexical district name                           |
| Ruins              | Path still deleted at the endpoint with 100 points per historical touch plus deleted lines    | Lexical path                                    |
| The last year      | Commits in the final 365 days anchored to the archive’s last commit                           | Not ranked                                      |

Every chapter records its exact inclusive commit range, human-readable reason, numeric score, and one or more evidence entries containing an archive commit index and hash. Evidence is used only inside the local application; public Share Safety still controls what enters a trailer, README snippet, privacy report, or manifest.

## Editing and export

- Checked chapters divide the selected 12, 16, or 24 second timeline evenly in their visible order.
- Activity pacing advances evenly through each chapter’s commits. Calendar pacing maps frames to commit timestamps inside each chapter.
- A chapter title appears in the trailer overlay and in the story-pack README/manifest.
- Retitling any chapter under the public preset disables export until the custom titles receive an explicit review.
- Markdown generation strips active markup characters from custom titles before producing a numbered chapter list.
- Excluding every chapter falls back to the complete archive timeline.

Public and private reports record the number of included chapters and whether titles were customized, never discarded title values. Video encoders may produce different bytes across hardware, but frame selection, chapter order, titles, and evidence scoring are deterministic.

## Limits

A shallow or otherwise truncated archive is labeled **partial history**, and the plan explains that it scored only available commits. Missing tags omit the release-to-release chapter. Ownership means recorded commit touches by contributor and top-level path district; it does not claim maintainership, code quality, or organizational authority.

The automated contract covers exact ties, renames, merges, truncated history, archives without tags, and three checked-in public fixtures with different commit counts.
