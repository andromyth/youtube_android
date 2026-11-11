import { isWatchUrl } from '../lib/split-watch-url'
import { emit } from './utils'

/*
 * Remote-first navigation for the Android TV build.
 *
 * YouTube's mobile page is built around touch: the focusable thing inside a
 * video tile is often the channel avatar, and pressing OK on it opens the
 * channel -- not the video. This layer treats a video tile as one target and
 * sends OK to the watch page, while keeping ordinary links (channel rows,
 * search results, menus) usable.
 */

const tileSelector = [
  'ytm-media-item',
  'ytm-compact-video-renderer',
  'ytm-video-with-context-renderer',
  'ytm-rich-item-renderer',
  'ytd-video-renderer',
  'ytd-compact-video-renderer',
  'ytd-grid-video-renderer',
  'ytd-rich-item-renderer',
  'ytd-rich-grid-media',
  'yt-lockup-view-model',
  'yt-lockup-metadata-view-model',
].join(',')

// Buttons that are part of a tile but are not "play this video".
const tileActionSelector = [
  'button[aria-label*="more" i]',
  'button[aria-label*="action" i]',
  'button[aria-label*="save" i]',
  'button[aria-label*="share" i]',
  'button[aria-label*="download" i]',
  'button[aria-label*="queue" i]',
].join(',')

const focusableSelector = 'a[href],button,[role="button"],[tabindex]:not([tabindex="-1"])'
const playerSelector = '#movie_player,.html5-video-player,#player,#player-container-id,ytm-player,ytd-player,#shorts-player'
const videoPlayerControlsSelector = '#_video_fs_panel, #_video_fs_btn, #_video_lock_overlay'
const focusClass = '_video_remote_focused'
const tileFocusClass = '_video_remote_focused_tile'
const remoteClass = '_video_remote_navigation'
const fullPlayerClass = '_video_native_fullscreen'
type Direction = 'left' | 'right' | 'up' | 'down'

const focusStyle = `
  html.${remoteClass} :focus {
    outline: none !important;
  }
  html.${remoteClass} .${focusClass} {
    position: relative !important;
    z-index: 2147483000 !important;
    outline: 3px solid #ff8b68 !important;
    outline-offset: 3px !important;
    border-radius: 10px !important;
    box-shadow: 0 0 0 6px rgba(9, 9, 11, .92), 0 0 22px rgba(255, 139, 104, .9) !important;
  }
  html.${remoteClass} .${tileFocusClass} {
    position: relative !important;
    z-index: 2147482999 !important;
    outline: 3px solid #ff8b68 !important;
    outline-offset: 2px !important;
    border-radius: 14px !important;
    box-shadow: 0 0 0 7px rgba(9, 9, 11, .94), 0 0 26px rgba(255, 139, 104, .88) !important;
    scroll-margin-block: 84px 96px !important;
  }
`

function isEditable(element: Element | null) {
  return Boolean(
    element &&
      (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement ||
        (element as HTMLElement).isContentEditable),
  )
}

function isVisible(element: HTMLElement) {
  if (!element.isConnected || element.closest('[hidden],[aria-hidden="true"]')) return false
  const style = getComputedStyle(element)
  const rect = element.getBoundingClientRect()
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0 &&
    rect.width >= 8 &&
    rect.height >= 8
  )
}

function getTile(element: Element) {
  return element.closest(tileSelector) as HTMLElement | null
}

function isTileAction(element: Element) {
  return Boolean(element.closest(tileActionSelector))
}

function isSearchInput(element: Element | null): element is HTMLInputElement {
  if (!(element instanceof HTMLInputElement)) return false
  const label = `${element.id} ${element.name} ${element.getAttribute('aria-label') || ''} ${
    element.placeholder || ''
  }`.toLowerCase()
  return element.matches('#search,[name="search_query"]') || label.includes('search')
}

/* Search suggestions on mobile YouTube are a mix of anchors, role=option rows
 * and plain divs. Collect the visible rows that open below the search field so
 * D-pad Down can move into the list and OK can activate the row. */
function getSuggestionTargets(box: DOMRect) {
  const selector = [
    'a[href*="search_query"]',
    'a[href*="/results"]',
    '[role="option"]',
    '[role="link"]',
    'yt-searchbox a[href]',
    'ytm-searchbox a[href]',
  ].join(',')

  const rows: HTMLElement[] = []
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    if (!isVisible(element) || isEditable(element)) continue
    const rect = element.getBoundingClientRect()
    // Only rows under the input: the suggestion panel opens downwards.
    if (rect.top < box.bottom - 4) continue
    rows.push(element)
  }

  rows.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.top - rb.top || ra.left - rb.left
  })

  // Collapse nested matches (an anchor inside a role=option row) to one element
  // per visual row, preferring the first (usually the anchor with a URL).
  const unique: HTMLElement[] = []
  for (const row of rows) {
    const rect = row.getBoundingClientRect()
    if (unique.some((u) => Math.abs(u.getBoundingClientRect().top - rect.top) < 8)) continue
    unique.push(row)
  }
  return unique
}

/* Mark which YouTube surface is showing so the TV CSS can scope the dense
 * home grid without touching search results or the watch page. */
function markPage() {
  const root = document.documentElement
  if (!root) return
  const path = location.pathname
  const page =
    path === '/' || path.startsWith('/feed')
      ? 'home'
      : path.startsWith('/results')
        ? 'results'
        : path.startsWith('/watch')
          ? 'watch'
          : 'other'
  if (root.dataset.videoPage !== page) {
    root.dataset.videoPage = page
  }
}

function isPlayableLink(link: HTMLAnchorElement) {
  try {
    const url = new URL(link.getAttribute('href') || '', location.href)
    return (
      url.origin === location.origin &&
      (url.pathname === '/watch' || /^\/shorts\/[^/]+/.test(url.pathname))
    )
  } catch {
    return false
  }
}

function area(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  return rect.width * rect.height
}

/* A tile usually contains a thumbnail link, a title link and a channel link.
 * Pick the largest visible play link rather than the first anchor in DOM order:
 * the first one can be the channel avatar. */
function getVideoLink(tile: HTMLElement) {
  const links = Array.from(tile.querySelectorAll<HTMLAnchorElement>('a[href]')).filter(
    (link) => isPlayableLink(link) && isVisible(link),
  )
  return links.sort((a, b) => area(b) - area(a))[0] || null
}

function getVideoUrl(tile: HTMLElement) {
  const link = getVideoLink(tile)
  if (link) {
    return link.href
  }

  const videoId =
    tile.getAttribute('video-id') ||
    tile.getAttribute('data-video-id') ||
    tile.querySelector('[video-id]')?.getAttribute('video-id') ||
    tile.querySelector('[data-video-id]')?.getAttribute('data-video-id')
  return videoId ? new URL(`/watch?v=${encodeURIComponent(videoId)}`, location.origin).href : null
}

/* The single focus target for a tile. Keeping focus on the real play link lets
 * the screen reader announce the title; the visible outline is painted on the
 * tile itself (see setFocus). */
function getTileTarget(tile: HTMLElement) {
  const link = getVideoLink(tile)
  if (link) {
    return link
  }
  const title = tile.querySelector<HTMLElement>(
    'a#video-title, #video-title, a[href*="/watch"], .yt-lockup-metadata-view-model-wiz__title',
  )
  if (title && isVisible(title)) {
    return title
  }
  return tile.matches(focusableSelector) && isVisible(tile) ? tile : null
}

function setFocus(element: HTMLElement) {
  const root = window as any
  const previous = root.__nouRemoteFocused as HTMLElement | undefined
  const previousTile = root.__nouRemoteFocusedTile as HTMLElement | undefined
  const tile = getTile(element)
  const tileTarget = tile && !isTileAction(element)

  previous?.classList.remove(focusClass)
  if (previousTile && previousTile !== tile) previousTile.classList.remove(tileFocusClass)

  if (tileTarget) {
    // One ring for the whole tile, not a second ring around the avatar/button.
    tile.classList.add(tileFocusClass)
  } else {
    element.classList.add(focusClass)
    tile?.classList.add(tileFocusClass)
  }

  root.__nouRemoteFocused = element
  root.__nouRemoteFocusedTile = tile

  // role=option suggestion rows and plain wrappers are not focusable by
  // default; give them a programmatic tab stop so focus/OK can reach them.
  if (!element.matches('a[href],button,input,select,textarea,[tabindex]')) {
    element.setAttribute('tabindex', '-1')
  }

  if (document.activeElement !== element) {
    element.focus({ preventScroll: true })
  }
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
}

function getTargets() {
  const targets: HTMLElement[] = []
  const seenTiles = new Set<HTMLElement>()
  const seenActions = new Set<HTMLElement>()

  for (const element of document.querySelectorAll<HTMLElement>(focusableSelector)) {
    const inPlayer = element.closest(playerSelector)
    if (inPlayer && !element.closest(videoPlayerControlsSelector)) continue
    if (!isVisible(element) || isEditable(element) || element.matches(':disabled,[aria-disabled="true"]')) {
      continue
    }

    const tile = getTile(element)
    if (tile) {
      // The "More actions" button is reachable, but it must not replace the
      // play target for the tile.
      if (isTileAction(element)) {
        if (!seenActions.has(element)) {
          seenActions.add(element)
          targets.push(element)
        }
        continue
      }
      if (seenTiles.has(tile)) continue
      seenTiles.add(tile)
      const target = getTileTarget(tile)
      if (target) targets.push(target)
      continue
    }

    targets.push(element)
  }

  return targets
}

function point(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function isPrimaryTileTarget(element: HTMLElement) {
  const tile = getTile(element)
  return Boolean(tile && !isTileAction(element))
}

function findNext(current: HTMLElement | null, targets: HTMLElement[], direction: Direction) {
  if (!current) {
    const axis = direction === 'up' || direction === 'down' ? 'y' : 'x'
    return targets.sort((a, b) => {
      const aPoint = point(a)
      const bPoint = point(b)
      return direction === 'up' || direction === 'left'
        ? aPoint[axis] - bPoint[axis]
        : bPoint[axis] - aPoint[axis]
    })[0]
  }

  const from = point(current)
  const ahead = targets.filter((element) => {
    if (element === current) return false
    const to = point(element)
    return direction === 'left'
      ? to.x < from.x - 1
      : direction === 'right'
        ? to.x > from.x + 1
        : direction === 'up'
          ? to.y < from.y - 1
          : to.y > from.y + 1
  })

  // Stay in the video grid when possible. Header chrome and the "More actions"
  // buttons remain fallbacks for the edges of the page.
  const playable = ahead.filter(isPrimaryTileTarget)
  const pool = playable.length ? playable : ahead.filter((element) => !isTileAction(element))
  const candidates = pool.length ? pool : ahead

  return candidates.sort((a, b) => {
    const score = (element: HTMLElement) => {
      const to = point(element)
      const primary =
        direction === 'left' || direction === 'right'
          ? Math.abs(to.x - from.x)
          : Math.abs(to.y - from.y)
      const cross =
        direction === 'left' || direction === 'right'
          ? Math.abs(to.y - from.y)
          : Math.abs(to.x - from.x)
      return primary + cross * 2.6
    }
    return score(a) - score(b)
  })[0]
}

function findSearchControl() {
  const selectors = [
    'ytm-searchbox button',
    'button[aria-label*="search" i]',
    '[role="button"][aria-label*="search" i]',
    'a[aria-label*="search" i]',
    'input[aria-label*="search" i]',
    'input[placeholder*="search" i]',
  ]
  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element && isVisible(element)) return element
  }
  return null
}

function playTile(tile: HTMLElement) {
  const url = getVideoUrl(tile)
  if (!url) return false

  // In the split view the native side owns the player webview. Hand the watch
  // URL straight to it instead of navigating the browse page first.
  if (window.VideoAppRole && isWatchUrl(url)) {
    emit('open-watch', { url })
    return true
  }

  location.assign(url)
  return true
}

function activate(element: HTMLElement) {
  const tile = getTile(element)

  // Explicit tile actions (more/save/share) keep their own behaviour.
  if (tile && isTileAction(element)) {
    element.click()
    return true
  }

  if (tile) {
    return playTile(tile)
  }

  // Not inside a tile: a standalone link (channel, search suggestion, menu).
  // Navigate directly rather than relying on .click(), which the suggestion
  // rows do not always honor from a remote key press.
  const link =
    (element.closest('a[href]') as HTMLAnchorElement | null) ||
    (element.querySelector('a[href]') as HTMLAnchorElement | null)
  if (link) {
    location.assign(link.href)
    return true
  }

  // Suggestion rows are often buttons/role=option wrappers around text with no
  // anchor at all. Turn the row's text into a real search rather than clicking
  // a wrapper whose only handlers expect touch events.
  const text = (element.textContent || '').trim()
  const inSearchBox = Boolean(
    element.closest('ytm-searchbox, ytd-searchbox, yt-searchbox, [role="search"], form'),
  )
  if (text && (inSearchBox || element.matches('[role="option"], [role="link"]'))) {
    location.assign(`/results?search_query=${encodeURIComponent(text)}`)
    return true
  }

  element.click()
  return true
}

export function installRemoteNavigation() {
  // Remote-first feed navigation is for the television build only. Phones keep
  // YouTube's touch layout, and the embed modal opts out explicitly.
  if (!window.isAndroid || !window.VideoAppTV) return

  const root = window as Window & typeof globalThis & {
    __nouRemoteNavigationInit?: boolean
    __nouHandleBack?: () => boolean
    __nouRemoteFocused?: HTMLElement
    __nouRemoteFocusedTile?: HTMLElement
  }
  if (root.__nouRemoteNavigationInit) return
  root.__nouRemoteNavigationInit = true

  const style = document.createElement('style')
  style.id = '_video_remote_navigation_style'
  style.textContent = focusStyle
  const addStyle = () => {
    if (!style.isConnected) (document.head || document.documentElement)?.appendChild(style)
  }
  addStyle()
  if (!style.isConnected) document.addEventListener('DOMContentLoaded', addStyle, { once: true })

  // Keep the page marker current across YouTube's SPA navigations, so the TV
  // grid rules apply on the home feed and are dropped on results/watch.
  markPage()
  setInterval(markPage, 800)

  root.__nouHandleBack = () => {
    const active = document.activeElement
    if (!(active instanceof HTMLInputElement)) return false

    const searchLabel = `${active.id} ${active.name} ${active.getAttribute('aria-label') || ''} ${
      active.placeholder
    }`.toLowerCase()
    if (!active.matches('#search,[name="search_query"]') && !searchLabel.includes('search')) return false
    if (location.pathname.startsWith('/results')) return false

    const closeSelector = [
      'button[aria-label*="close" i]',
      '[role="button"][aria-label*="close" i]',
      'button[aria-label*="back" i]',
      '[role="button"][aria-label*="back" i]',
      'button[aria-label*="cancel" i]',
      '[role="button"][aria-label*="cancel" i]',
      '#searchbox-cancel',
      '#cancel-button',
    ].join(',')
    const searchBox = active.closest('ytm-searchbox,ytd-searchbox')
    const close = searchBox?.querySelector<HTMLElement>(closeSelector) || document.querySelector<HTMLElement>(closeSelector)

    if (close && isVisible(close)) {
      close.click()
    } else {
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      active.blur()
    }
    return true
  }

  document.addEventListener(
    'focusin',
    (event) => {
      const element = event.target instanceof HTMLElement ? event.target : null
      if (!element) return
      document.documentElement.classList.add(remoteClass)
      setFocus(element)
    },
    true,
  )

  let focusObserver: MutationObserver | undefined
  const restoreRemoteFocus = () => {
    const current = root.__nouRemoteFocused
    if (current && isVisible(current)) return
    if (isEditable(document.activeElement)) return

    const targets = getTargets()
    const firstTile = targets.find(isPrimaryTileTarget)
    const firstContent = targets.find(
      (element) => !element.closest('ytm-mobile-topbar-renderer,ytd-masthead,ytm-pivot-bar-renderer'),
    )
    const first = firstTile || firstContent || targets[0]
    if (!first) return

    document.documentElement.classList.add(remoteClass)
    setFocus(first)
    focusObserver?.disconnect()
    focusObserver = undefined
  }
  focusObserver = new MutationObserver(restoreRemoteFocus)
  if (document.documentElement) {
    focusObserver?.observe(document.documentElement, { childList: true, subtree: true })
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreRemoteFocus, { once: true })
  } else {
    requestAnimationFrame(restoreRemoteFocus)
  }

  document.addEventListener(
    'keydown',
    (event) => {
      const key = event.key.toLowerCase()
      const direction: Direction | null =
        key === 'arrowleft' || event.keyCode === 21
          ? 'left'
          : key === 'arrowright' || event.keyCode === 22
            ? 'right'
            : key === 'arrowup' || event.keyCode === 19
              ? 'up'
              : key === 'arrowdown' || event.keyCode === 20
                ? 'down'
                : null
      const isOk =
        key === 'enter' || key === 'numpadenter' || key === 'select' || event.keyCode === 23 || event.keyCode === 66

      // In the native full player there is no page focus ring. A key is the
      // remote's way of asking for the app's own control bar; the bar takes
      // focus, so the page will not see the following presses.
      if (document.documentElement.classList.contains(fullPlayerClass)) {
        if (isOk || direction === 'up' || direction === 'down') {
          event.preventDefault()
          event.stopImmediatePropagation()
          emit('player-key', { key, keyCode: event.keyCode })
        }
        return
      }

      const target = event.target instanceof Element ? event.target : null
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const keyTarget = target || active

      if (direction) {
        const isVideoPlayerControl = Boolean(keyTarget?.closest(videoPlayerControlsSelector))
        // Typing in the search field: Down steps into the suggestion list so
        // OK picks a row instead of re-triggering the soft keyboard. Blur hides
        // the keyboard; Up from the first suggestion returns to the field.
        if (isEditable(active)) {
          if (isSearchInput(active) && direction === 'down') {
            const suggestions = getSuggestionTargets(active.getBoundingClientRect())
            const first = suggestions[0]
            if (first) {
              event.preventDefault()
              event.stopImmediatePropagation()
              active.blur()
              document.documentElement.classList.add(remoteClass)
              setFocus(first)
              return
            }
          }
          return
        }
        if (
          (keyTarget?.closest(playerSelector) && !isVideoPlayerControl) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        ) {
          return
        }

        document.documentElement.classList.add(remoteClass)
        const current = root.__nouRemoteFocused
        const next = findNext(current && isVisible(current) ? current : null, getTargets(), direction)
        event.preventDefault()
        event.stopImmediatePropagation()
        if (next) {
          setFocus(next)
        } else if (direction === 'up' || direction === 'down') {
          window.scrollBy({
            top: window.innerHeight * (direction === 'down' ? 0.78 : -0.78),
            behavior: 'smooth',
          })
        }
        return
      }

      // OK on a focused search input: submit the search instead of ignoring it.
      if (isEditable(active)) {
        if (isOk && isSearchInput(active)) {
          event.preventDefault()
          event.stopImmediatePropagation()
          const form = active.closest('form, ytm-searchbox, ytd-searchbox, yt-searchbox')
          if (form && typeof (form as HTMLFormElement).requestSubmit === 'function') {
            ;(form as HTMLFormElement).requestSubmit()
          } else {
            active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
          }
        }
        return
      }
      if (!isOk) return
      const isVideoPlayerControl = Boolean(keyTarget?.closest(videoPlayerControlsSelector))
      if (keyTarget?.closest(playerSelector) && !isVideoPlayerControl) return

      const current = root.__nouRemoteFocused
      if (current && isVisible(current)) {
        event.preventDefault()
        event.stopImmediatePropagation()
        activate(current)
        return
      }

      // Search opens on OK activation only; arrowing onto its control never
      // opens it.
      const search = findSearchControl()
      if (search) {
        event.preventDefault()
        event.stopImmediatePropagation()
        document.documentElement.classList.add(remoteClass)
        setFocus(search)
        search.click()
      }
    },
    true,
  )
}
