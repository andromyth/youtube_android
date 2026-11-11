/*
 * Television-only CSS for YouTube's mobile web page inside the Android TV
 * WebView. Kept separate from css.ts so the large upstream stylesheet stays
 * untouched; getCoreCss() appends this when window.VideoAppTV is set.
 */
export const cssContentTV = `
  /*
   * Television home: YouTube's mobile web page shows a 2-column video grid,
   * a category chips row across the top and a bottom navigation bar. None of
   * that is remote-friendly on a 1280x720 TV, so strip the chrome and make the
   * grid dense enough to show many tiles at once.
   */

  /* Bottom navigation bar (Home / Shorts / You) -- not needed with a D-pad. */
  ytd-bottom-navigation-renderer,
  ytm-bottom-navigation-renderer,
  #bottom-navigation,
  [class*='bottom-navigation'],
  [class*='BottomNav'],
  [id*='bottom-nav'] {
    display: none !important;
  }

  /* Category / filter chips row across the top of the home feed. */
  ytd-pivot-bar-renderer,
  ytm-pivot-bar-renderer,
  ytm-chip-cloud-renderer,
  ytm-chip-renderer,
  yt-chip-cloud-chip-renderer,
  yt-chip-cloud-renderer,
  #chips,
  ytd-filter-chip-renderer,
  [class*='pivot-bar'],
  [class*='chip-row'],
  [class*='chip-cloud'],
  [class*='ChipCloud'],
  [class*='category-filter'],
  [id*='chips'] {
    display: none !important;
  }

  /*
   * Home feed: YouTube mobile lays the tiles out two across inside
   * .rich-grid-renderer-contents. Four across with the container widened to
   * the full screen turns the same feed into a TV wall of tiles.
   */
  html[data-video-page='home'] .rich-grid-renderer-contents {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 10px 12px !important;
    width: 100% !important;
    max-width: none !important;
    padding: 0 12px !important;
    box-sizing: border-box !important;
  }
  html[data-video-page='home'] ytm-rich-item-renderer {
    width: auto !important;
    min-width: 0 !important;
    margin: 0 !important;
    vertical-align: top !important;
  }
  html[data-video-page='home'] yt-lockup-view-model,
  html[data-video-page='home'] .ytLockupViewModelHost,
  html[data-video-page='home'] .ytLockupViewModelWrapper {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
  }

  /* Trim each tile to thumbnail + title so four rows fit on one screen. */
  html[data-video-page='home'] .ytLockupMetadataViewModelHost,
  html[data-video-page='home'] .yt-lockup-metadata-view-model {
    margin-top: 6px !important;
    padding: 0 !important;
  }
  html[data-video-page='home'] .ytContentMetadataViewModelHost,
  html[data-video-page='home'] .ytContentMetadataViewModelMetadataRow,
  html[data-video-page='home'] .ytContentMetadataViewModelMetadata {
    display: none !important;
  }

  /* The mobile masthead wastes a full row on a logo and menu buttons. Keep
   * just the search entry point, slimmed down. */
  ytm-mobile-topbar-renderer {
    min-height: 0 !important;
  }
  ytm-mobile-topbar-renderer .mobile-topbar-header-brand-container,
  ytm-mobile-topbar-renderer .mobile-topbar-header-sign-in-button,
  ytm-mobile-topbar-renderer ytm-button-renderer.icon-avatar_logged_out,
  ytm-mobile-topbar-renderer button[aria-label*='account' i],
  ytm-mobile-topbar-renderer button[aria-label*='more' i] {
    display: none !important;
  }
`
