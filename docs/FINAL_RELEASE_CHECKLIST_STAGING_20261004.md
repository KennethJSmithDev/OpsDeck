# OpsDeck final release checklist staging — 2026-10-04

> Do not execute publication steps until architecture freeze and explicit final-release approval.

## Architecture freeze

- [ ] Final source checkpoint committed/pushed
- [ ] Full regression PASS
- [ ] Capability inventory regenerated
- [ ] Representation/performance measurements regenerated
- [ ] No accepted milestone reopened without contradictory evidence
- [ ] Known blockers/debt recorded

## Exact release package qualification

- [ ] Clean install from release candidate
- [ ] Upgrade/reinstall path
- [ ] Uninstall/cleanup
- [ ] Unrelated IRIS/package state preserved
- [ ] Browser assets match package source hashes
- [ ] Native connected smoke
- [ ] Observe Only / rehearsal / verified mutation smoke
- [ ] Package install/remove smoke
- [ ] Vector/Embedded Python smoke
- [ ] Mobile/short-height smoke
- [ ] Privacy/secret scan

## Public product

- [ ] Merge accepted release to Main
- [ ] Verify Main remote tree
- [ ] Update public version / internal version / release label
- [ ] Tag v1.0.0 only after exact release qualification
- [ ] Publish GitHub release
- [ ] Publish/update IPM registry package
- [ ] Verify `zpm "install opsdeck"` from public registry
- [ ] Update Open Exchange listing
- [ ] Verify GitHub Pages safe demo
- [ ] Verify no accidental canary/provenance-control wording is public

## Presentation

- [ ] README regenerated from final capability/evidence ledger
- [ ] “For judges: two minutes”
- [ ] Compact-by-architecture block with final measurements
- [ ] Community Ideas Implemented section
- [ ] Capability/evidence counts
- [ ] architecture diagram
- [ ] screenshots
- [ ] favicon/logo/BrandKit
- [ ] final known limitations

## Bonuses

- [ ] Embedded Python evidence link
- [ ] Vector Search evidence link
- [ ] Docker evidence link
- [ ] DPI-I-261 evidence link
- [ ] existing IPM credit verified
- [ ] existing Online Demo credit verified
- [ ] First Time Contribution credit verified
- [ ] article 1 published/linked
- [ ] article 2/translation published/linked
- [ ] YouTube video published/linked
- [ ] Embedded Python bug only if independently reproduced and reportable
- [ ] submit one evidence-linked correction comment on bonus-results post

## Final outreach

- [ ] Contest entry points to final Open Exchange/Main/demo
- [ ] Developer Community final update/comment
- [ ] Discord final update
- [ ] video linked from README/Open Exchange/article
- [ ] final links tested in logged-out/private browser context
