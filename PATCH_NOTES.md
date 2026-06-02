## v0.x — Light Mode & Theme Polish (Sessions 12–13)

Full light mode support is now live across every screen and component. All 34
files were migrated from the static `Colors` object to the reactive `useColors()`
hook and `ThemeContext`, giving you six themes × two modes (dark/light) with live
switching — no restart required. This release also fixes three theme-switching bugs:
the app no longer snaps back to the Home tab when you change themes, the theme
picker modal no longer flashes a dark box on open, and the per-theme preview cards
now show the correct light-mode swatch when the app is in light mode. The share card
color picker received 6 new light-mode swatches and had 2 redundant dark ones removed,
bringing both palettes to 16 options each.
