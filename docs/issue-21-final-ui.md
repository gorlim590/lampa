# Issue #21 — transparent Hybrid UI follow-up

Status: **PARTIAL; reviewable UI changes, functional acceptance pending**.
Baseline main `67bad5f5432022030a93bd1c2b1ceef3bb7c63e6`. Previous PR #34
implemented a neutral opaque header; the reopened requirement explicitly replaces
that design. Its old checked boxes do not certify this follow-up.

## Changes

Hybrid 2.8.0 reuses its existing native search, profile action, avatar URL setting,
Select callbacks and minute clock. No replacement search/profile/clock engine.

* Header, body/action layers and header pseudo backgrounds are transparent.
  Search is centered against the full header width, with a pill radius and subtle
  translucent fill. Interface+'s neutral background is overridden only while
  Hybrid is enabled; disabling Hybrid restores existing presentation.
* Profile uses a compact right-hand native Select panel. Other native menus share
  a dark translucent surface, wrapping labels and focus styling. Profile styling
  cannot inherit the currently focused torrent filter panel; temporary classes
  are cleared through existing Select lifecycle listeners.
* Description previews use a three-line CSS clamp without modifying source text.
  A native-controller `.selector` action expands/collapses inline, retaining the
  same focus target and `aria-expanded`. One owned handler/action per detail root;
  teardown removes both. Detached action bars are rebound on adaptation and native
  search close. New roots/reactivation start collapsed.
* ButtonsPlus rewrites unknown `.full-start__button` labels to “Кнопка”. The new
  description action deliberately uses its own class while remaining in the
  native selector collection, preserving its label and other actions' behavior.
* Torrent rail grows from 25vw to 30vw with matching information-column clearance.
  Native release titles wrap without the previous two-line clamp. Existing Cinema
  quality, HDR, size, peers, languages and source labels remain intact.
* Darker navigation; reduced-motion rules; no new polling, global observer, font,
  cache, parser, timer loop or keyboard interception. Search-close reuses the
  existing bounded adaptation queue. Trakt/watched and playback logic unchanged.

## Dependencies and scope boundaries

| Work | State / effect on this change |
|---|---|
| #14 / Draft #42 | Native torrent routing, Files and real playback acceptance remain open. Not imported; no legacy removal or functionality certification here. |
| #20 | Sources button versus autoload benchmark open. Existing lazy/button behavior unchanged. |
| #25 | Home History exists in main; further real history acceptance open. No row/progress changes. |
| #28 | Dorama Hub still proposed. Shared Full styling applies, but future provider screens are not certified. |
| #30 | Existing Home policy/order in main; new loading-performance work open. No order or API changes. |
| #8 / Draft #29 | Vertical-only/Trakt YDesign work remains separate. No horizontal mode added or restored by this PR; its old main code is not replaced with the draft. |

Only `ui/stremio-hybrid.js` changes production behavior. Interface+, Cardify,
ButtonsPlus, YDesign, Seasons Info, Trakt+, Cinema, Screensaver and Home modules
are not rewritten. Pending functional dependencies prevent automatic merge of
the full Issue #21 scope. No user settings/credentials/history changes or migrations.

## Actual verification

* Seven new unit tests PASS: independent detail state, duplicate prevention,
  cleanup/reactivation, native Enter toggling, ButtonsPlus label isolation,
  profile/filter ownership, detached action bar cleanup.
* Eleven existing upper-details/Trakt ownership tests PASS, unchanged after that
  successful run. Repository checker PASS: 62 JS, 454 URLs. Changed JS/CJS syntax
  and whitespace checks PASS. New units added to existing season/details CI.
* Final CDP pass: **15 PASS / 0 FAIL**, JavaScript exceptions `[]`. Existing test
  tab/profile only, no browser launch/context creation or closure of user tabs.
  Memory-only test storage writes and blocked mutation HTTP; no real Trakt writes.
* Loaded JS hashes recorded in [browser.json](../audit/issue-21-final/browser.json).
  Hybrid bytes match product commit `010fd56b9641c3dd1842386f411a2d4e04f2386d`
  (`7dadd41bc1179d9b078e56ede282bde7101b3468944192c65d39ee1e49325e6f`).
  YDesign and Interface initialization explicitly confirmed before final checks;
  Cardify/ButtonsPlus/Cinema actual source bytes loaded. Other script paths are
  an inventory, not proof every external extension initialized successfully.
* Header transparency, center geometry, clock/profile non-overlap at requested
  windows 1280×720, 1920×1080 and 3840×2160; native inherited zoom meant actual
  `innerWidth` was 5120/7680/15360. Zoom was not changed. These are window-size
  adaptation checks, **not 1:1 TV CSS viewport or physical 4K certification**.
* Native profile Enter/Down/Back, search open/close, Settings header. Actual active
  Full owner was verified as TV/anime ID105248; description uses temporary long
  Ukrainian text to exercise overflow, full-text preservation, Enter/focus,
  collapse and theme off/on cleanup. Restored by reloading the original test URL.
* Torrent long-title/UA/EN/source/quality row and native Select menu are explicitly
  **presentation fixtures**. No parser result/filter/season/playback claim.
* Earlier attempts exposed a generic ButtonsPlus label and stale post-search
  action. Fixes and targeted regressions followed; only final browser.json is
  acceptance evidence. No FPS/memory improvement measured or claimed.

## Visual review and remaining acceptance

[Header](../audit/issue-21-final/header-after.jpg) ·
[Details](../audit/issue-21-final/details-after.jpg) ·
[Torrent layout fixture](../audit/issue-21-final/torrent-layout-fixture.jpg).
JPEG review copies preserve screenshot dimensions; original PNGs remain local.
Historical opaque reference is [PR #34 Home](../audit/issue-21/home-1920.png),
on different content, not a controlled side-by-side comparison.

Still needed: real movie/multi-season/dorama screens and Home/catalog acceptance;
actual torrent filters/source/season flows after #14; Trakt/Home/Screensaver
end-to-end regressions where those functional issues remain open; long UA date
and user scale variations; physical Google TV arrows/OK/Back and visual approval.
No automatic merge, issue closure, post-merge CI or Pages deployment is claimed.

After a future approved release, refresh the existing Hybrid URL cache query to
`?v=2.8.0` rather than adding another plugin. Current main stays unchanged.
