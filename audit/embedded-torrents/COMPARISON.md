# Movie sources: final comparison

- cinema-comparison-1.png: real Stremio X11 / initial compact native rows.
- cinema-comparison-2.png: same Stremio reference / final 2.3 cinema view. Different films (Hope vs Tenzing), same 1920px source width; compare layout/density, not artwork.
- Final right rail touches right/bottom viewport edges: at 1080p x1440, width480, top75.95, bottom1079.98; no rounded floating frame. Card view comes from inspected TorrentsRedesign: quality tile, full raw release title, audio flags, real size/seed/peer/bitrate. Header/search/menu have no movie-page fill.
- Added actual logo with Ukrainian/English captions; Tenzing and Parasite logos are monochrome, therefore palette comes from their posters. Native ratings/actions/status nodes remain.
- cinema-sort-menu.png, cinema-filters-menu.png, cinema-filter-options.png demonstrate owned Select skin and nested filter styling. Sort menu has its own tested panel geometry at 720/1080/4K. Native Select root needed explicit viewport bounds: otherwise absolute content collapsed to a 42px stripe. This was fixed and visually rechecked.
- Lower content remains native scrolling; no separate details/cast button. One hero wrapper keeps source selectors outside FullStart navigation collection. Subtitle chips removed; Sub inside full raw filename is intentionally retained.
- Differences retained: Lampa sidebar/actions/ratings and recommendation rows; no Stremio add-on logic or author-logo substitution. No claim of pixel identity, physical-TV performance or real stream playback.
