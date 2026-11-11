import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { useValue } from '@legendapp/state/react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { VideoText } from '@/components/VideoText'
import { settings$ } from '@/states/settings'
import { ui$ } from '@/states/ui'
import { closePlayer, hidePlayer, showPlayer } from '@/lib/split-view'

type ControlId = 'play' | 'seekBack' | 'seekForward' | 'quality' | 'speed' | 'mini' | 'close'

const CONTROL_ORDER: ControlId[] = [
  'play',
  'seekBack',
  'seekForward',
  'quality',
  'speed',
  'mini',
  'close',
]

const MARGIN = 12
const MAX_WIDTH = 260
const WIDTH_RATIO = 0.58
const HIDE_DELAY_MS = 6000

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const buttonStyle = {
  position: 'absolute' as const,
  top: 6,
  width: 28,
  height: 28,
  borderRadius: 999,
  backgroundColor: 'rgba(0,0,0,0.62)',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

/* One button in the TV control bar. The bar is a single row of these, so the
 * D-pad only has to move left and right once it has focus; OK activates.
 * `onFocus` also tells the bar that the user is still active, which is what
 * keeps the auto-hide timer from taking the controls away mid-navigation. */
const PlayerControl: React.FC<{
  id: ControlId
  icon: React.ComponentProps<typeof MaterialIcons>['name']
  label: string
  onPress: () => void
  focusRef?: (view: View | null) => void
  preferred?: boolean
}> = ({ id, icon, label, onPress, focusRef, preferred }) => {
  const [focused, setFocused] = useState(false)
  const handleFocus = () => {
    setFocused(true)
    ui$.playerControlsActivity.set(Date.now())
    ui$.playerFocusedControl.set(id)
  }
  return (
    <Pressable
      ref={focusRef}
      accessibilityRole="button"
      accessibilityLabel={label}
      focusable
      hasTVPreferredFocus={preferred}
      onFocus={handleFocus}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.control, focused && styles.controlFocused]}
    >
      <MaterialIcons name={icon} size={25} color="#fff" />
      <VideoText style={[styles.controlLabel, focused && styles.controlLabelFocused]}>{label}</VideoText>
    </Pressable>
  )
}

/**
 * Holds the player webview in whichever shape the split watch view is in:
 * covering the browsing page, shrunk into the mini player, or waiting out of
 * sight while still playing.
 *
 * The element tree is deliberately identical in all three -- only styles and
 * the mini chrome change. Swapping the wrapper instead would make React
 * remount the webview, which would reload the video and lose its position, and
 * that is the whole thing this feature exists to avoid. The page lays itself
 * out for the small box on its own (see setNativeMini in
 * content/split-view.ts); the controls live here because the box is too small
 * to hit YouTube's own, and a tap on it means "give me the video back".
 */
export const PlayerFrame: React.FC<{
  children: React.ReactNode
  mode: 'full' | 'mini' | 'hidden'
  playing: boolean
  onTogglePlay: () => void
  onSeek: (delta: number) => void
}> = ({ children, mode, playing, onTogglePlay, onSeek }) => {
  const isMini = mode === 'mini'
  const isFull = mode === 'full'
  // Measured rather than taken from the window: the frame lives inside the
  // webview container, which the toolbar has already inset.
  const [area, setArea] = useState({ width: 0, height: 0 })
  const corner = (useValue(settings$.miniPlayerCorner) || 'bottom-right') as Corner
  const controlsVisible = useValue(ui$.playerControlsVisible)
  const controlsActivity = useValue(ui$.playerControlsActivity)
  const qualityOpen = useValue(ui$.playbackQualityModalOpen)
  const speedOpen = useValue(ui$.playbackSpeedModalOpen)
  const modalOpen = qualityOpen || speedOpen
  const boxWidth = Math.min(area.width * WIDTH_RATIO, MAX_WIDTH)
  const boxHeight = Math.round((boxWidth * 9) / 16)
  const playRef = useRef<View | null>(null)
  const lastFocusedRef = useRef<View | null>(null)

  // One ref per control bar button, in left-to-right order, so the remote can
  // walk the bar with Left/Right and press the focused button with OK.
  const controlRefs = useRef<Record<ControlId, View | null>>({
    play: null,
    seekBack: null,
    seekForward: null,
    quality: null,
    speed: null,
    mini: null,
    close: null,
  })
  const controlHandlers = useRef<Record<ControlId, () => void>>({
    play: () => undefined,
    seekBack: () => undefined,
    seekForward: () => undefined,
    quality: () => undefined,
    speed: () => undefined,
    mini: () => undefined,
    close: () => undefined,
  })
  const focusedIndexRef = useRef(0)

  const setFocusedIndex = (index: number) => {
    focusedIndexRef.current = index
    const id = CONTROL_ORDER[index]
    const view = controlRefs.current[id]
    view?.focus?.()
    lastFocusedRef.current = view
  }

  const focusNext = () => {
    setFocusedIndex((focusedIndexRef.current + 1) % CONTROL_ORDER.length)
  }

  const focusPrev = () => {
    setFocusedIndex((focusedIndexRef.current - 1 + CONTROL_ORDER.length) % CONTROL_ORDER.length)
  }

  const pressFocused = () => {
    const id = CONTROL_ORDER[focusedIndexRef.current]
    controlHandlers.current[id]()
  }

  // When the parent (MainPageContent) tells us which control should be focused
  // (via remote D-pad Left/Right), move the focus ring there.
  const focusedControl = useValue(ui$.playerFocusedControl)
  useEffect(() => {
    if (!focusedControl) return
    const index = CONTROL_ORDER.indexOf(focusedControl as ControlId)
    if (index >= 0) setFocusedIndex(index)
  }, [focusedControl])
  const base = useMemo(
    () => ({
      x: corner.endsWith('left') ? MARGIN : Math.max(MARGIN, area.width - boxWidth - MARGIN),
      y: corner.startsWith('top') ? MARGIN : Math.max(MARGIN, area.height - boxHeight - MARGIN),
    }),
    [corner, area, boxWidth, boxHeight],
  )

  // The drag moves the view directly instead of going through state: a
  // re-render mid-drag would re-render the webview inside the frame.
  const frameRef = useRef<View>(null)

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Capture, not the bubbling variant: the expand Pressable below covers
        // the whole box and claims the responder on touch down, and RN only
        // asks ancestors on capture once a descendant holds it.
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          isMini && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
        onPanResponderMove: (_evt, gesture) => {
          frameRef.current?.setNativeProps({
            style: { left: base.x + gesture.dx, top: base.y + gesture.dy },
          })
        },
        onPanResponderRelease: (_evt, gesture) => {
          // Snap to whichever corner the box was let go nearest to.
          const centerX = base.x + gesture.dx + boxWidth / 2
          const centerY = base.y + gesture.dy + boxHeight / 2
          const next = `${centerY < area.height / 2 ? 'top' : 'bottom'}-${
            centerX < area.width / 2 ? 'left' : 'right'
          }` as Corner
          if (next === corner) {
            // The same corner re-renders nothing on its own, so put it back.
            frameRef.current?.setNativeProps({ style: { left: base.x, top: base.y } })
            return
          }
          settings$.miniPlayerCorner.set(next)
        },
      }),
    [base, boxWidth, boxHeight, corner, area, isMini],
  )

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setArea((current) => (current.width === width && current.height === height ? current : { width, height }))
  }

  // A TV player should not leave its controls burned over the video. Any focus
  // move bumps the activity timestamp and restarts this timer; an open quality
  // or speed dialog pauses it so the bar is still there when the dialog closes.
  useEffect(() => {
    if (!isFull || !controlsVisible || modalOpen) return
    const timer = setTimeout(() => ui$.playerControlsVisible.set(false), HIDE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isFull, controlsVisible, modalOpen, controlsActivity])

  // The bar is the only focusable thing over the player. Put the remote on
  // Play when it appears (or back on the button that opened the dialog), so a
  // single OK after summoning the bar is already useful.
  useEffect(() => {
    if (!isFull || !controlsVisible || modalOpen) return
    const timer = setTimeout(() => {
      const target = lastFocusedRef.current || playRef.current
      target?.focus?.()
    }, 60)
    return () => clearTimeout(timer)
  }, [isFull, controlsVisible, modalOpen])

  // The controls are unmounted when they hide, so their refs cannot outlive a
  // session -- otherwise the next show would try to focus a dead view.
  useEffect(() => {
    if (!isFull || !controlsVisible) {
      lastFocusedRef.current = null
    }
  }, [isFull, controlsVisible])

  const trackFocus = (view: View | null) => {
    if (view) lastFocusedRef.current = view
  }

  const frameStyle = isMini
    ? {
        position: 'absolute' as const,
        left: base.x,
        top: base.y,
        width: boxWidth,
        height: boxHeight,
        zIndex: 1,
        borderRadius: 8,
        overflow: 'hidden' as const,
        backgroundColor: '#000',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.42,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      }
    : [StyleSheet.absoluteFill, { opacity: isFull ? 1 : 0, zIndex: isFull ? 1 : 0 }]

  return (
    // box-none in the mini player: only the small box takes touches, the
    // browsing page keeps the rest of the screen.
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isFull ? 'auto' : isMini ? 'box-none' : 'none'}
      onLayout={onLayout}
    >
      <View ref={frameRef} style={frameStyle} {...(isMini ? panResponder.panHandlers : {})}>
        {children}
        {/* Over the webview, so the page never sees these taps. */}
        {isMini ? (
          <>
            <Pressable style={StyleSheet.absoluteFill} onPress={showPlayer} accessibilityLabel="Expand video" />
            <Pressable style={[buttonStyle, { left: 6 }]} onPress={onTogglePlay}>
              <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={18} color="#fff" />
            </Pressable>
            <Pressable style={[buttonStyle, { right: 6 }]} onPress={closePlayer}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </Pressable>
          </>
        ) : isFull && controlsVisible ? (
          <View style={styles.barWrap} pointerEvents="box-none">
            <View style={styles.bar} accessibilityRole="toolbar">
              <PlayerControl
                id="play"
                icon={playing ? 'pause' : 'play-arrow'}
                label={playing ? 'Pause' : 'Play'}
                onPress={onTogglePlay}
                focusRef={(view) => {
                  controlRefs.current.play = view
                  controlHandlers.current.play = onTogglePlay
                  playRef.current = view
                  trackFocus(view)
                }}
                preferred
              />
              <PlayerControl
                id="seekBack"
                icon="replay-10"
                label="-10s"
                onPress={() => onSeek(-10)}
                focusRef={(view) => {
                  controlRefs.current.seekBack = view
                  controlHandlers.current.seekBack = () => onSeek(-10)
                  trackFocus(view)
                }}
              />
              <PlayerControl
                id="seekForward"
                icon="forward-10"
                label="+10s"
                onPress={() => onSeek(10)}
                focusRef={(view) => {
                  controlRefs.current.seekForward = view
                  controlHandlers.current.seekForward = () => onSeek(10)
                  trackFocus(view)
                }}
              />
              <View style={styles.divider} />
              <PlayerControl
                id="quality"
                icon="high-quality"
                label="Quality"
                onPress={() => {
                  ui$.playerControlsActivity.set(Date.now())
                  ui$.playbackQualityModalOpen.set(true)
                }}
                focusRef={(view) => {
                  controlRefs.current.quality = view
                  controlHandlers.current.quality = () => {
                    ui$.playerControlsActivity.set(Date.now())
                    ui$.playbackQualityModalOpen.set(true)
                  }
                  trackFocus(view)
                }}
              />
              <PlayerControl
                id="speed"
                icon="speed"
                label="Speed"
                onPress={() => {
                  ui$.playerControlsActivity.set(Date.now())
                  ui$.playbackSpeedModalOpen.set(true)
                }}
                focusRef={(view) => {
                  controlRefs.current.speed = view
                  controlHandlers.current.speed = () => {
                    ui$.playerControlsActivity.set(Date.now())
                    ui$.playbackSpeedModalOpen.set(true)
                  }
                  trackFocus(view)
                }}
              />
              <View style={styles.divider} />
              <PlayerControl
                id="mini"
                icon="picture-in-picture-alt"
                label="Mini"
                onPress={() => {
                  ui$.playerControlsVisible.set(false)
                  hidePlayer()
                }}
                focusRef={(view) => {
                  controlRefs.current.mini = view
                  controlHandlers.current.mini = () => {
                    ui$.playerControlsVisible.set(false)
                    hidePlayer()
                  }
                  trackFocus(view)
                }}
              />
              <PlayerControl
                id="close"
                icon="close"
                label="Close"
                onPress={() => {
                  ui$.playerControlsVisible.set(false)
                  closePlayer()
                }}
                focusRef={(view) => {
                  controlRefs.current.close = view
                  controlHandlers.current.close = () => {
                    ui$.playerControlsVisible.set(false)
                    closePlayer()
                  }
                  trackFocus(view)
                }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  barWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 22,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(9,9,11,0.9)',
  },
  control: {
    minWidth: 58,
    height: 58,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  controlFocused: {
    borderColor: '#ff8b68',
    backgroundColor: 'rgba(255,139,104,0.2)',
  },
  controlLabel: {
    marginTop: 2,
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
  },
  controlLabelFocused: {
    color: '#ffffff',
  },
  divider: {
    width: 1,
    height: 34,
    marginHorizontal: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
})
