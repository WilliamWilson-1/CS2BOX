# Browser verification · 2026-09-29

Verified in the Codex in-app Chromium browser against http://127.0.0.1:5173.

- Single opening: count increased from 0 to 1 and showed an individual result/profit.
- Ten-box opening: count increased from 1 to 11; total cost ¥272.58, net output ¥11.81, profit −¥260.77. Quality counts summed to 11.
- Reload: 11 records persisted with the same totals.
- Fast automatic opening of 10: count increased from 11 to exactly 21, then controls re-enabled.
- Inventory: 21 rows, rarity filter returned 5 restricted items at that point.
- Case search: “突围” selected Operation Breakout; correctly showed 14 normal finishes and opened successfully.
- Settings: key ¥12 + case ¥1 produced a ¥13 cost. A ¥13.96 item with 2.5% fee produced ¥13.61 net and +¥0.61 profit. Older records retained their original costs.
- CSV: export handler generated its download and success message. The in-app browser did not expose a completed download event/path, so delivery to the Downloads folder was not independently verified.
- Auto stop during a normal animated reveal: completed one pending result, then stopped without further openings.
- Mobile: 390px viewport, no document horizontal overflow; loaded images had nonzero natural widths.
- Resize: revealed item remained centered and matched the result text after desktop/mobile breakpoint changes.
- Detail dialog: showed all five regular/StatTrak wear prices and conditional wear probabilities for AK-47 Nightwish.
- Console: no captured JavaScript errors.

The local preview retains 25 generated test records as an example session. Opening `index.html` directly uses its own browser storage origin. Users can reset the preview through the in-app reset dialog.

Probability/accounting tests: `node --test tests/engine.test.cjs`, 11 passing tests, including 250,000 seeded rarity samples and 80,000 capped-float samples. All 451 cached PNG files were also checked for an IEND trailer.
