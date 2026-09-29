# Browser verification · 2026-09-29

## CS2 reel timing update

- Normal roll uses the game's 6000ms duration and `cubic-bezier(0.075, 0.82, 0.165, 1)` curve.
- Browser timing check: still rolling at 5380ms and settled at 6247ms; an automatic run stopped during its first roll completed exactly one result.
- All 42 reel images decoded successfully before the sampled roll.
- Resized to 390px during a roll: retained progress, settled on the recorded winner, no horizontal document overflow.
- Resized back after stopping: pointer position stayed at 28.81% within the same winning tile and the count remained unchanged.
- Keyboard opening still revealed immediately, with no active spinning class afterward; no JavaScript errors captured.
- Probability and accounting regression suite: 14 passing tests.

## Ten-box simultaneous results (2026-09-29)

- Ten-box openings now bypass the reel and show all 10 result cards together, including when fast mode is enabled. Counts increased by exactly 10 per batch.
- Each card has its own saved wear, Float pointer, pattern, quote and profit. All 10 artwork images loaded.
- The dialog shows total batch cost/profit and a single collect-all button. The 390px layout has no horizontal overflow.
- This supersedes the paginated ten-box inspection check below; non-fast single openings retain their inspection dialog.

## Non-fast result dialog (2026-09-29)

- Non-fast single opening automatically displays the saved item's image, rarity, wear, Float, seed, price, cost and profit. Float 0.29087341 placed the white pointer at 29.08734083%.
- Escape closes inspection and re-enables opening. Ten-box inspection navigated from item 10/10 to 9/10 without adding records.
- Fast opening increased the count once with no dialog.
- Normal automatic opening completed its reel, then stayed at 43 records while inspection remained open. Continue produced exactly the next result (44); Stop in the dialog closed it and re-enabled manual opening.
- At 390 × 844 the dialog had no horizontal overflow and its confirmation button was fully inside the visible dialog.
- No browser JavaScript errors captured; all 14 engine regression tests passed.

## Original checks

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
