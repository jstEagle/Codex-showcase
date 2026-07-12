'use client'

import { gsap } from 'gsap'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { Project } from '../projects'
import { appConfig, type CardAnimation } from '../config/app'
import {
  createAsciiShaderRenderer,
  type ShaderCard,
  type ShaderTrailPoint,
} from '../lib/ascii-shader'
import { ProjectHeroOverlay } from './ProjectHeroOverlay'

type Variant = {
  width: number
  height: number
  weight: number
}

// A handful of card footprints, weighted so most tiles read as modest
// thumbnails with occasional standouts — matching a real portfolio wall
// rather than a uniform grid.
const VARIANTS: Array<Variant> = [
  { width: 132, height: 172, weight: 26 }, // small portrait
  { width: 142, height: 142, weight: 20 }, // small square
  { width: 190, height: 150, weight: 18 }, // landscape
  { width: 172, height: 212, weight: 16 }, // medium portrait
  { width: 232, height: 232, weight: 11 }, // large square (standout)
  { width: 262, height: 172, weight: 9 }, // large landscape (standout)
]
const VARIANT_WEIGHT_TOTAL = VARIANTS.reduce(
  (sum, variant) => sum + variant.weight,
  0,
)

const DRAG_CLICK_THRESHOLD = 6
const MIN_GLIDE_SPEED = 5
const MAX_GLIDE_SPEED = 2200
const ASCII_CHARS = '!<>-_\\/[]{}=+*^?#o1'
const ASCII_FRAME_CHARS = '·:/\\#*+<>^_=o'
const ASCII_FRAME_INTERVAL_MS = 84
const ASCII_TRAIL_DURATION_MS = 720
const MAX_ASCII_TRAIL_POINTS = 8
const ASCII_TRAIL_POINT_DISTANCE = 12

type AsciiTrailPointState = {
  x: number
  y: number
  strength: number
  createdAt: number
}

/** Deterministic 32-bit hash for an integer cell coordinate. Same cell always
 * produces the same card, so the grid is stable as the camera moves. */
function hashCell(x: number, y: number, salt: number) {
  let h = (x * 374761393 + y * 668265263 + salt * 2654435761) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}

function spiralIndex(x: number, y: number) {
  const layer = Math.max(Math.abs(x), Math.abs(y))
  if (layer === 0) {
    return 0
  }

  const side = layer * 2
  const ringStart = (side - 1) ** 2
  if (y === -layer) {
    return ringStart + (x + layer)
  }
  if (x === layer) {
    return ringStart + side + (y + layer)
  }
  if (y === layer) {
    return ringStart + side * 2 + (layer - x)
  }
  return ringStart + side * 3 + (layer - y)
}

function pickVariant(t: number): Variant {
  let remaining = t * VARIANT_WEIGHT_TOTAL
  for (const variant of VARIANTS) {
    if (remaining < variant.weight) {
      return variant
    }
    remaining -= variant.weight
  }
  return VARIANTS[VARIANTS.length - 1]
}

/** One continuous, physical-feeling scale curve. Positions and cards share
 * this scale, so zooming never makes the layout and its contents fight. */
function zoomScale(t: number, min: number, max: number) {
  return min * Math.pow(max / min, t)
}

function easeToward(
  current: number,
  target: number,
  dtFrames: number,
  perFrameFactor: number,
) {
  const factor = 1 - Math.pow(1 - perFrameFactor, dtFrames)
  return current + (target - current) * factor
}

type CellKey = string

type CellEntry = {
  key: CellKey
  cellX: number
  cellY: number
}

type SelectedProject = {
  project: Project
  cellKey: CellKey
}

type CanvasConfig = {
  spacingX: number
  spacingY: number
  minZoomScale: number
  maxZoomScale: number
  restZoom: number
  initialZoom: number
  driftX: number
  driftY: number
  zoomEase: number
  glideFriction: number
  staggerAmount: number
  cardScale: number
  pinchZoomSensitivity: number
}

const CANVAS_CONFIG: CanvasConfig = {
  restZoom: 0.44,
  initialZoom: 0.82,
  minZoomScale: 0.62,
  maxZoomScale: 1.48,
  zoomEase: 0.11,
  spacingX: 500,
  spacingY: 460,
  cardScale: 0.96,
  staggerAmount: 0.22,
  driftX: 12,
  driftY: 6,
  glideFriction: 4.2,
  pinchZoomSensitivity: 0.48,
}

export function ProjectCanvas({
  projects,
  active,
  initialProject,
  hasMore,
  loadingMore,
  onNeedMore,
}: {
  projects: Array<Project>
  active: boolean
  initialProject?: Project
  hasMore: boolean
  loadingMore: boolean
  onNeedMore: () => void
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const shaderCanvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const cardElements = useRef(new Map<CellKey, HTMLDivElement>())
  const labelElements = useRef(new Map<CellKey, HTMLSpanElement>())
  const labelAnimations = useRef(new Map<CellKey, number>())
  const asciiFrameAnimations = useRef(new Map<CellKey, number>())
  const pauseCanvasRef = useRef<() => void>(() => undefined)
  const focusCardRef = useRef<(key: CellKey, immediate?: boolean) => void>(
    () => undefined,
  )
  const releaseFocusRef = useRef<(onComplete: () => void) => void>(
    (onComplete) => onComplete(),
  )
  const revealAsciiRef = useRef<(key: CellKey) => void>(() => undefined)
  const focusScrollRef = useRef<(scrollTop: number) => void>(() => undefined)
  const openingProjectRef = useRef(false)
  const initialProjectOpenedRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<SelectedProject | null>(null)
  const [cells, setCells] = useState<Array<CellEntry>>([])
  const projectCountRef = useRef(projects.length)
  const hasMoreRef = useRef(hasMore)
  const loadingMoreRef = useRef(loadingMore)
  const onNeedMoreRef = useRef(onNeedMore)

  const closeProject = useCallback(
    (updateUrl = true) => {
      const selectedCard = selected
        ? cardElements.current.get(selected.cellKey)
        : undefined
      releaseFocusRef.current(() => {
        openingProjectRef.current = false
        setSelected(null)
        if (updateUrl && window.location.pathname !== '/') {
          window.history.pushState({}, '', '/')
        }
        window.requestAnimationFrame(() => {
          selectedCard?.querySelector<HTMLAnchorElement>('a')?.focus()
        })
      })
    },
    [selected],
  )

  useEffect(() => {
    projectCountRef.current = projects.length
    hasMoreRef.current = hasMore
    loadingMoreRef.current = loadingMore
    onNeedMoreRef.current = onNeedMore
  }, [hasMore, loadingMore, onNeedMore, projects.length])

  function stopLabelAnimation(key: CellKey) {
    const animation = labelAnimations.current.get(key)
    if (animation !== undefined) {
      window.clearInterval(animation)
      labelAnimations.current.delete(key)
    }
  }

  function stopAsciiFrameAnimation(key: CellKey) {
    const animation = asciiFrameAnimations.current.get(key)
    if (animation !== undefined) {
      window.clearInterval(animation)
      asciiFrameAnimations.current.delete(key)
    }

    cardElements.current
      .get(key)
      ?.querySelectorAll<HTMLElement>('.gallery-card__ascii-frame-line')
      .forEach((line) => {
        if (line.dataset.baseText) {
          line.textContent = line.dataset.baseText
        }
      })
  }

  function startAsciiFrameAnimation(key: CellKey) {
    const card = cardElements.current.get(key)
    if (!card) return

    stopAsciiFrameAnimation(key)
    const lines = Array.from(
      card.querySelectorAll<HTMLElement>('.gallery-card__ascii-frame-line'),
    )
    lines.forEach((line) => {
      line.dataset.baseText = line.textContent ?? ''
    })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const animation = window.setInterval(() => {
      lines.forEach((line, lineIndex) => {
        const baseText = line.dataset.baseText ?? ''
        line.textContent = Array.from(baseText)
          .map((character, characterIndex) => {
            if (/\s/.test(character)) return character

            const wave = (characterIndex * 3 + frame + lineIndex * 5) % 13
            if (wave > 3) return character

            const glyphIndex =
              (characterIndex * 7 + frame * 3 + lineIndex * 11) %
              ASCII_FRAME_CHARS.length
            return ASCII_FRAME_CHARS[glyphIndex]
          })
          .join('')
      })
      frame += 1
    }, ASCII_FRAME_INTERVAL_MS)

    asciiFrameAnimations.current.set(key, animation)
  }

  function revealProjectName(key: CellKey, title: string) {
    const label = labelElements.current.get(key)
    if (!label) {
      return
    }

    stopLabelAnimation(key)
    const caption = label.parentElement
    label.closest('.gallery-card')?.classList.add('is-ascii-active')
    startAsciiFrameAnimation(key)
    caption?.classList.remove('is-project-name')
    caption?.classList.add('is-revealing')
    label.classList.remove('is-project-name')
    label.classList.add('is-revealing')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      label.textContent = title
      label.classList.remove('is-revealing')
      label.classList.add('is-project-name')
      caption?.classList.remove('is-revealing')
      caption?.classList.add('is-project-name')
      return
    }

    const characters = Array.from(title)
    const totalFrames = 24
    let frame = 0
    const animation = window.setInterval(() => {
      const progress = Math.min(1, frame / totalFrames)
      const decodeProgress = Math.max(0, (progress - 0.12) / 0.88)
      const settledCharacters = Math.floor(
        (1 - Math.pow(1 - decodeProgress, 3)) * characters.length,
      )

      label.textContent = characters
        .map((character, index) => {
          if (character === ' ' || index < settledCharacters) {
            return character
          }
          return ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
        })
        .join('')

      frame += 1
      if (frame > totalFrames) {
        stopLabelAnimation(key)
        label.textContent = title
        label.classList.remove('is-revealing')
        label.classList.add('is-project-name')
        caption?.classList.remove('is-revealing')
        caption?.classList.add('is-project-name')
      }
    }, 36)

    labelAnimations.current.set(key, animation)
  }

  function restoreProjectNumber(key: CellKey, index: number) {
    const label = labelElements.current.get(key)
    stopLabelAnimation(key)
    stopAsciiFrameAnimation(key)
    if (!label) {
      return
    }

    label.closest('.gallery-card')?.classList.remove('is-ascii-active')
    label.parentElement?.classList.remove('is-revealing', 'is-project-name')
    label.classList.remove('is-revealing', 'is-project-name')
    label.textContent = String(index).padStart(2, '0')
  }

  useEffect(
    () => () => {
      labelAnimations.current.forEach((animation) =>
        window.clearInterval(animation),
      )
      labelAnimations.current.clear()
      asciiFrameAnimations.current.forEach((animation) =>
        window.clearInterval(animation),
      )
      asciiFrameAnimations.current.clear()
    },
    [],
  )

  const cellContent = useMemo(() => {
    return (cellX: number, cellY: number) => {
      if (projects.length === 0) {
        return null
      }
      const ordinal = spiralIndex(cellX, cellY)
      const projectIndex = ordinal % projects.length
      const variant = pickVariant(hashCell(cellX, cellY, 2))
      const project = projects[projectIndex]
      return {
        project,
        variant,
        index: projectIndex + 1,
        ordinal,
      }
    }
  }, [projects])

  useEffect(() => {
    const container = containerRef.current
    const shaderCanvas = shaderCanvasRef.current
    const world = worldRef.current
    if (!container || !shaderCanvas || !world) {
      return
    }

    const shaderRenderer = appConfig.gallery.interactiveAsciiEnabled
      ? createAsciiShaderRenderer(
          shaderCanvas,
          appConfig.gallery.shaderMaxDevicePixelRatio,
        )
      : null

    let viewportWidth = 0
    let viewportHeight = 0

    const camera = { x: 0, y: 0, velocityX: 0, velocityY: 0 }
    let zoomT = CANVAS_CONFIG.initialZoom
    let targetZoomT = CANVAS_CONFIG.initialZoom
    let autoPanEnabled = false
    let zoomAnchor = { x: 0, y: 0 }
    let previousScale = zoomScale(
      zoomT,
      CANVAS_CONFIG.minZoomScale,
      CANVAS_CONFIG.maxZoomScale,
    )

    const pointer = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      lastMoveTime: 0,
      dragged: false,
    }
    const activePointers = new Map<number, { x: number; y: number }>()
    const pinch = {
      active: false,
      startDistance: 1,
      startZoomT: targetZoomT,
    }
    const focus = { key: null as CellKey | null, progress: 0, scrollTop: 0 }
    let focusTween: gsap.core.Tween | null = null
    let heroRect = projectHeroRect(viewportWidth, viewportHeight)
    let disposed = false
    let animationId = 0
    let lastTime = 0
    let lastRangeCheck = 0
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const asciiTrail: Array<AsciiTrailPointState> = []
    let lastTrailPoint = { x: -10_000, y: -10_000, createdAt: 0 }

    const currentRangeRef = { minX: 1, maxX: 0, minY: 1, maxY: 0 }

    const computeVisibleRange = () => {
      const config = CANVAS_CONFIG
      const scale = zoomScale(zoomT, config.minZoomScale, config.maxZoomScale)
      const spanX = config.spacingX * scale
      const spanY = config.spacingY * scale
      const halfW = viewportWidth / 2 + spanX * 1.8
      const halfH = viewportHeight / 2 + spanY * 1.8
      return {
        minX: Math.floor((camera.x - halfW) / spanX),
        maxX: Math.ceil((camera.x + halfW) / spanX),
        minY: Math.floor((camera.y - halfH) / spanY),
        maxY: Math.ceil((camera.y + halfH) / spanY),
      }
    }

    const refreshCellsIfNeeded = (force: boolean) => {
      const range = computeVisibleRange()
      const prev = currentRangeRef
      const changed =
        force ||
        range.minX < prev.minX ||
        range.maxX > prev.maxX ||
        range.minY < prev.minY ||
        range.maxY > prev.maxY ||
        range.minX > prev.minX + 1 ||
        range.maxX < prev.maxX - 1 ||
        range.minY > prev.minY + 1 ||
        range.maxY < prev.maxY - 1

      if (!changed) {
        return
      }

      currentRangeRef.minX = range.minX
      currentRangeRef.maxX = range.maxX
      currentRangeRef.minY = range.minY
      currentRangeRef.maxY = range.maxY

      const next: Array<CellEntry> = []
      let highestOrdinal = 0
      for (let cy = range.minY; cy <= range.maxY; cy += 1) {
        for (let cx = range.minX; cx <= range.maxX; cx += 1) {
          next.push({ key: `${cx}:${cy}`, cellX: cx, cellY: cy })
          highestOrdinal = Math.max(highestOrdinal, spiralIndex(cx, cy))
        }
      }
      setCells(next)

      if (
        hasMoreRef.current &&
        !loadingMoreRef.current &&
        highestOrdinal + appConfig.gallery.prefetchDistance >=
          projectCountRef.current
      ) {
        loadingMoreRef.current = true
        onNeedMoreRef.current()
      }
    }

    const resize = () => {
      const rect = container.getBoundingClientRect()
      viewportWidth = rect.width
      viewportHeight = rect.height
      heroRect = projectHeroRect(viewportWidth, viewportHeight)
      container.style.setProperty('--project-hero-x', `${heroRect.x}px`)
      container.style.setProperty('--project-hero-y', `${heroRect.y}px`)
      container.style.setProperty('--project-hero-width', `${heroRect.width}px`)
      container.style.setProperty(
        '--project-hero-height',
        `${heroRect.height}px`,
      )
      refreshCellsIfNeeded(true)
    }

    const addAsciiTrailPoint = (
      x: number,
      y: number,
      strength = 1,
      force = false,
    ) => {
      if (prefersReducedMotion || focus.key) return

      const now = performance.now()
      if (
        !force &&
        now - lastTrailPoint.createdAt < 22 &&
        Math.hypot(x - lastTrailPoint.x, y - lastTrailPoint.y) <
          ASCII_TRAIL_POINT_DISTANCE
      ) {
        return
      }

      asciiTrail.push({
        x,
        y,
        strength: Math.min(1.25, Math.max(0.45, strength)),
        createdAt: now,
      })
      if (asciiTrail.length > MAX_ASCII_TRAIL_POINTS) asciiTrail.shift()
      lastTrailPoint = { x, y, createdAt: now }
    }

    revealAsciiRef.current = (key) => {
      const card = cardElements.current.get(key)
      if (!card) return
      const cardRect = card.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      addAsciiTrailPoint(
        cardRect.left + cardRect.width / 2 - containerRect.left,
        cardRect.top + cardRect.height / 2 - containerRect.top,
        1.1,
        true,
      )
    }

    const pinchMetrics = () => {
      const points = Array.from(activePointers.values())
      if (points.length < 2) return null
      const first = points[0]
      const second = points[1]
      return {
        distance: Math.max(
          1,
          Math.hypot(second.x - first.x, second.y - first.y),
        ),
        midpointX: (first.x + second.x) / 2,
        midpointY: (first.y + second.y) / 2,
      }
    }

    const beginPinch = () => {
      const metrics = pinchMetrics()
      if (!metrics) return

      pinch.active = true
      pinch.startDistance = metrics.distance
      pinch.startZoomT = zoomT
      targetZoomT = zoomT
      const rect = container.getBoundingClientRect()
      // Keep one anchor for the whole gesture. Touch pointers report their
      // moves independently, so following each intermediate midpoint makes
      // the camera bounce between fingers on mobile browsers.
      zoomAnchor = {
        x: metrics.midpointX - rect.left - viewportWidth / 2,
        y: metrics.midpointY - rect.top - viewportHeight / 2,
      }
      pointer.active = true
      pointer.dragged = true
      autoPanEnabled = false
      camera.velocityX = 0
      camera.velocityY = 0
      setDragging(true)

      activePointers.forEach((_, pointerId) => {
        if (!container.hasPointerCapture(pointerId)) {
          container.setPointerCapture(pointerId)
        }
      })
    }

    const onPointerDown = (event: PointerEvent) => {
      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })

      if (activePointers.size >= 2) {
        beginPinch()
        return
      }

      pointer.active = true
      pointer.dragged = false
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.startX = event.clientX
      pointer.startY = event.clientY
      pointer.lastMoveTime = performance.now()
      camera.velocityX = 0
      camera.velocityY = 0
      const rect = container.getBoundingClientRect()
      addAsciiTrailPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        1.1,
        true,
      )
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (!activePointers.has(event.pointerId)) {
        addAsciiTrailPoint(
          event.clientX - rect.left,
          event.clientY - rect.top,
          0.68,
        )
        return
      }

      activePointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })

      if (pinch.active || activePointers.size >= 2) {
        if (!pinch.active) beginPinch()
        const metrics = pinchMetrics()
        if (!metrics) return

        const distanceRatio = metrics.distance / pinch.startDistance
        targetZoomT = Math.min(
          1,
          Math.max(
            0,
            pinch.startZoomT +
              Math.log2(distanceRatio) * CANVAS_CONFIG.pinchZoomSensitivity,
          ),
        )
        return
      }

      const dx = event.clientX - pointer.x
      const dy = event.clientY - pointer.y
      const now = performance.now()
      const elapsed = Math.max(now - pointer.lastMoveTime, 8) / 1000
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.lastMoveTime = now
      const speed = Math.hypot(dx, dy) / elapsed
      addAsciiTrailPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        0.72 + Math.min(speed / 2_600, 0.5),
      )

      if (
        !pointer.dragged &&
        Math.hypot(
          event.clientX - pointer.startX,
          event.clientY - pointer.startY,
        ) > DRAG_CLICK_THRESHOLD
      ) {
        pointer.dragged = true
        autoPanEnabled = false
        setDragging(true)
        // Capturing on pointerdown retargets an ordinary click to the canvas
        // in some browsers. Capture only once this is definitely a drag.
        if (!container.hasPointerCapture(event.pointerId)) {
          container.setPointerCapture(event.pointerId)
        }
      }

      if (pointer.dragged) {
        camera.x -= dx
        camera.y -= dy
        const sampleX = Math.max(
          -MAX_GLIDE_SPEED,
          Math.min(MAX_GLIDE_SPEED, -dx / elapsed),
        )
        const sampleY = Math.max(
          -MAX_GLIDE_SPEED,
          Math.min(MAX_GLIDE_SPEED, -dy / elapsed),
        )
        camera.velocityX = camera.velocityX * 0.35 + sampleX * 0.65
        camera.velocityY = camera.velocityY * 0.35 + sampleY * 0.65
      }
    }

    const endDrag = (event: PointerEvent) => {
      activePointers.delete(event.pointerId)
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId)
      }

      if (pinch.active) {
        if (activePointers.size >= 2) {
          beginPinch()
          return
        }

        pinch.active = false
        camera.velocityX = 0
        camera.velocityY = 0
        const remainingPointer = activePointers.values().next().value as
          | { x: number; y: number }
          | undefined
        if (remainingPointer) {
          pointer.active = true
          pointer.dragged = true
          pointer.x = remainingPointer.x
          pointer.y = remainingPointer.y
          pointer.startX = remainingPointer.x
          pointer.startY = remainingPointer.y
          pointer.lastMoveTime = performance.now()
          return
        }

        pointer.active = false
        setDragging(false)
        return
      }

      const releaseDelay = performance.now() - pointer.lastMoveTime
      if (releaseDelay > 80) {
        const releaseDecay = Math.max(0, 1 - (releaseDelay - 80) / 180)
        camera.velocityX *= releaseDecay
        camera.velocityY *= releaseDecay
      }
      pointer.active = false
      setDragging(false)
    }

    const onWheel = (event: WheelEvent) => {
      if (
        focus.key ||
        (event.target instanceof Element &&
          event.target.closest('.project-hero'))
      ) {
        return
      }
      event.preventDefault()
      autoPanEnabled = false
      const rect = container.getBoundingClientRect()
      zoomAnchor = {
        x: event.clientX - rect.left - viewportWidth / 2,
        y: event.clientY - rect.top - viewportHeight / 2,
      }
      // Scroll up (negative deltaY) zooms in; scroll down zooms out.
      targetZoomT = Math.min(
        1,
        Math.max(0, targetZoomT - event.deltaY * 0.00085),
      )
    }

    const onClickCapture = (event: MouseEvent) => {
      if (pointer.dragged) {
        event.preventDefault()
        event.stopPropagation()
        // The browser emits one click after a drag. Consume only that click,
        // so the next deliberate activation is never swallowed.
        pointer.dragged = false
      }
    }

    pauseCanvasRef.current = () => {
      autoPanEnabled = false
      camera.velocityX = 0
      camera.velocityY = 0
      pointer.active = false
      pointer.dragged = false
      activePointers.clear()
      pinch.active = false
      setDragging(false)
    }

    focusCardRef.current = (key, immediate = false) => {
      pauseCanvasRef.current()
      focusTween?.kill()
      focus.key = key
      focus.scrollTop = 0

      if (prefersReducedMotion || immediate) {
        focus.progress = 1
        return
      }

      focusTween = gsap.to(focus, {
        progress: 1,
        duration: 1.08,
        ease: 'expo.inOut',
      })
    }

    focusScrollRef.current = (scrollTop) => {
      focus.scrollTop = scrollTop
    }

    releaseFocusRef.current = (onComplete) => {
      focusTween?.kill()
      focus.scrollTop = 0

      const finish = () => {
        focus.key = null
        focus.progress = 0
        cardElements.current.forEach((element) => {
          element.style.opacity = '1'
        })
        onComplete()
      }

      if (prefersReducedMotion) {
        finish()
        return
      }

      focusTween = gsap.to(focus, {
        progress: 0,
        duration: 0.82,
        ease: 'expo.inOut',
        onComplete: finish,
      })
    }

    const resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(container)
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', endDrag)
    container.addEventListener('pointercancel', endDrag)
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('click', onClickCapture, true)

    const frame = (time: number) => {
      if (disposed) {
        return
      }
      if (lastTime === 0) {
        lastTime = time
      }
      const dt = Math.min(time - lastTime, 100)
      lastTime = time
      const dtFrames = dt / (1000 / 60)
      const dtSeconds = dt / 1000
      const config = CANVAS_CONFIG

      if (autoPanEnabled) {
        camera.x += config.driftX * dtSeconds
        camera.y += config.driftY * dtSeconds
      } else if (!pointer.active) {
        camera.x += camera.velocityX * dtSeconds
        camera.y += camera.velocityY * dtSeconds
        const decay = Math.exp(-config.glideFriction * dtSeconds)
        camera.velocityX *= decay
        camera.velocityY *= decay
        if (Math.hypot(camera.velocityX, camera.velocityY) < MIN_GLIDE_SPEED) {
          camera.velocityX = 0
          camera.velocityY = 0
        }
      }

      zoomT = easeToward(zoomT, targetZoomT, dtFrames, config.zoomEase)

      const scale = zoomScale(zoomT, config.minZoomScale, config.maxZoomScale)
      if (scale !== previousScale) {
        const ratio = scale / previousScale
        camera.x = (camera.x + zoomAnchor.x) * ratio - zoomAnchor.x
        camera.y = (camera.y + zoomAnchor.y) * ratio - zoomAnchor.y
        previousScale = scale
      }
      const size = scale * config.cardScale
      const spanX = config.spacingX * scale
      const spanY = config.spacingY * scale
      const centerX = viewportWidth / 2
      const centerY = viewportHeight / 2
      for (let index = asciiTrail.length - 1; index >= 0; index -= 1) {
        if (time - asciiTrail[index].createdAt >= ASCII_TRAIL_DURATION_MS) {
          asciiTrail.splice(index, 1)
        }
      }
      const shaderTrailPoints: Array<ShaderTrailPoint> = prefersReducedMotion
        ? []
        : asciiTrail.map((point) => ({
            x: point.x,
            y: point.y,
            strength: point.strength,
            age: Math.min(
              1,
              (time - point.createdAt) / ASCII_TRAIL_DURATION_MS,
            ),
          }))

      const visibleShaderCards: Array<ShaderCard> = []
      let focusedShaderCard: ShaderCard | null = null
      cardElements.current.forEach((element, key) => {
        const [cx, cy] = key.split(':').map(Number)
        const jitterX =
          (hashCell(cx, cy, 4) - 0.5) * 2 * config.staggerAmount * spanX
        const jitterY =
          (hashCell(cx, cy, 5) - 0.5) * 2 * config.staggerAmount * spanY
        const screenX = centerX + cx * spanX + jitterX - camera.x
        const screenY = centerY + cy * spanY + jitterY - camera.y
        const baseW = Number(element.dataset.w)
        const baseH = Number(element.dataset.h)

        const renderedWidth = baseW * size
        const renderedHeight = baseH * size
        const left = screenX - renderedWidth / 2
        const top = screenY - renderedHeight / 2
        const isFocusedCard = focus.key === key
        const backgroundOpacity = focus.key ? 1 - focus.progress : 1

        const drawRect = isFocusedCard
          ? {
              x: lerp(left, heroRect.x, focus.progress),
              y: lerp(top, heroRect.y - focus.scrollTop, focus.progress),
              width: lerp(renderedWidth, heroRect.width, focus.progress),
              height: lerp(renderedHeight, heroRect.height, focus.progress),
            }
          : {
              x: left,
              y: top,
              width: renderedWidth,
              height: renderedHeight,
            }

        if (isFocusedCard) {
          element.classList.add('gallery-card--focused')
          element.style.width = `${drawRect.width}px`
          element.style.height = `${drawRect.height}px`
          element.style.transform = `translate3d(${drawRect.x}px, ${drawRect.y}px, 0)`
          element.style.opacity = '1'
          element.style.setProperty(
            '--gallery-card-radius',
            `${lerp(0, 26, focus.progress)}px`,
          )
        } else {
          element.classList.remove('gallery-card--focused')
          element.style.width = `${baseW}px`
          element.style.height = `${baseH}px`
          element.style.transform = `translate3d(${screenX - baseW / 2}px, ${screenY - baseH / 2}px, 0) scale(${size})`
          element.style.opacity = String(backgroundOpacity)
          element.style.setProperty('--gallery-card-radius', '0px')
        }

        const shaderCard: ShaderCard = {
          ...drawRect,
          animation: element.dataset.animation as CardAnimation,
          seed: Number(element.dataset.seed),
          imageUrl: element.dataset.imageUrl || undefined,
          opacity: isFocusedCard ? 1 : backgroundOpacity,
          borderRadius: isFocusedCard ? lerp(0, 26, focus.progress) : 0,
          effect:
            isFocusedCard && !prefersReducedMotion
              ? Math.sin(Math.PI * focus.progress) * 0.96
              : 0,
        }

        if (
          drawRect.x < viewportWidth &&
          drawRect.y < viewportHeight &&
          drawRect.x + drawRect.width > 0 &&
          drawRect.y + drawRect.height > 0
        ) {
          if (isFocusedCard) {
            focusedShaderCard = shaderCard
          } else if (backgroundOpacity > 0.01) {
            visibleShaderCards.push(shaderCard)
          }
        }
      })

      if (focusedShaderCard) {
        visibleShaderCards.push(focusedShaderCard)
      }

      shaderRenderer?.render(
        visibleShaderCards,
        prefersReducedMotion ? 0 : time / 1_000,
        viewportWidth,
        viewportHeight,
        shaderTrailPoints,
      )

      lastRangeCheck += dt
      if (lastRangeCheck > 160) {
        lastRangeCheck = 0
        refreshCellsIfNeeded(false)
      }

      animationId = window.requestAnimationFrame(frame)
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (animationId) {
          window.cancelAnimationFrame(animationId)
          animationId = 0
        }
      } else if (!disposed && animationId === 0) {
        lastTime = 0
        animationId = window.requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    resize()
    animationId = window.requestAnimationFrame(frame)

    const revealTimeout = window.setTimeout(() => {
      if (active && !disposed) {
        targetZoomT = CANVAS_CONFIG.restZoom
        autoPanEnabled = true
      }
    }, 30)

    return () => {
      disposed = true
      focusTween?.kill()
      pauseCanvasRef.current = () => undefined
      focusCardRef.current = () => undefined
      focusScrollRef.current = () => undefined
      revealAsciiRef.current = () => undefined
      releaseFocusRef.current = (onComplete) => onComplete()
      shaderRenderer?.dispose()
      window.clearTimeout(revealTimeout)
      window.cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', endDrag)
      container.removeEventListener('pointercancel', endDrag)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('click', onClickCapture, true)
    }
  }, [active])

  useEffect(() => {
    if (
      !active ||
      !initialProject ||
      initialProjectOpenedRef.current ||
      cells.length === 0
    ) {
      return
    }

    const candidates = Array.from(cardElements.current.entries())
      .filter(
        ([, element]) => element.dataset.projectSlug === initialProject.slug,
      )
      .sort(([, a], [, b]) => {
        const aRect = a.getBoundingClientRect()
        const bRect = b.getBoundingClientRect()
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        const aDistance = Math.hypot(
          aRect.left + aRect.width / 2 - centerX,
          aRect.top + aRect.height / 2 - centerY,
        )
        const bDistance = Math.hypot(
          bRect.left + bRect.width / 2 - centerX,
          bRect.top + bRect.height / 2 - centerY,
        )
        return aDistance - bDistance
      })
    const candidate = candidates[0]
    if (!candidate) return

    initialProjectOpenedRef.current = true
    openingProjectRef.current = true
    setSelected({ project: initialProject, cellKey: candidate[0] })
    focusCardRef.current(candidate[0], true)
  }, [active, cells.length, initialProject])

  useEffect(() => {
    if (!selected) return

    const onPopState = () => {
      if (window.location.pathname === '/') {
        closeProject(false)
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [closeProject, selected])

  function openProject(
    event: ReactMouseEvent<HTMLAnchorElement>,
    project: Project,
    cellKey: CellKey,
  ) {
    if (event.defaultPrevented) {
      return
    }

    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    if (openingProjectRef.current) {
      return
    }

    revealAsciiRef.current(cellKey)
    openingProjectRef.current = true
    window.history.pushState(
      { codexShowcaseProject: project.slug },
      '',
      `/projects/${project.slug}`,
    )
    setSelected({ project, cellKey })
    focusCardRef.current(cellKey)
  }

  return (
    <div
      ref={containerRef}
      className={`project-canvas${dragging ? ' project-canvas--dragging' : ''}${selected ? ' project-canvas--focused' : ''}`}
    >
      <canvas
        ref={shaderCanvasRef}
        aria-hidden="true"
        className="project-canvas__shader"
      />
      <div
        ref={worldRef}
        className="project-canvas__world"
        aria-hidden={selected ? true : undefined}
        inert={selected ? true : undefined}
      >
        {cells.map(({ key, cellX, cellY }) => {
          const content = cellContent(cellX, cellY)
          if (!content) {
            return null
          }
          const { project, variant, index } = content
          const coverImage = projectCoverImage(project)
          return (
            <div
              key={key}
              ref={(element) => {
                if (element) {
                  cardElements.current.set(key, element)
                } else {
                  cardElements.current.delete(key)
                }
              }}
              className="gallery-card"
              data-cell={key}
              data-w={variant.width}
              data-h={variant.height}
              data-animation={project.cardAnimation}
              data-image-url={coverImage ?? undefined}
              data-project-slug={project.slug}
              data-seed={Math.floor(hashCell(cellX, cellY, 7) * 10_000)}
              style={
                {
                  width: variant.width,
                  height: variant.height,
                } as CSSProperties
              }
            >
              <Link
                href={`/projects/${project.slug}`}
                className={`gallery-card__link${coverImage ? '' : ' gallery-card__link--empty'}`}
                draggable={false}
                aria-label={`${project.title} — ${project.maker}`}
                onClick={(event) => openProject(event, project, key)}
                onBlur={() => restoreProjectNumber(key, index)}
                onFocus={() => {
                  router.prefetch(`/projects/${project.slug}`)
                  revealAsciiRef.current(key)
                  revealProjectName(key, project.title)
                }}
                onMouseEnter={() => {
                  router.prefetch(`/projects/${project.slug}`)
                  revealAsciiRef.current(key)
                  revealProjectName(key, project.title)
                }}
                onMouseLeave={() => restoreProjectNumber(key, index)}
              >
                <span
                  className="gallery-card__photo"
                  style={
                    coverImage
                      ? { backgroundImage: `url(${coverImage})` }
                      : undefined
                  }
                />
              </Link>
              <div className="gallery-card__ascii-frame" aria-hidden="true">
                <span className="gallery-card__ascii-frame-line gallery-card__ascii-frame-line--top">
                  · · · / / #{String(index).padStart(2, '0')}
                </span>
                <span className="gallery-card__ascii-frame-line gallery-card__ascii-frame-line--right">
                  &gt;^·+ #{String(index).padStart(2, '0')}
                </span>
                <span className="gallery-card__ascii-frame-line gallery-card__ascii-frame-line--bottom">
                  *+_&lt;&gt;{String(index).padStart(2, '0')}##//::···
                </span>
                <span className="gallery-card__ascii-frame-line gallery-card__ascii-frame-line--left">
                  ·:1+·#/o^&gt;
                </span>
              </div>
              <div className="gallery-card__caption" aria-hidden="true">
                <span
                  className="gallery-card__index"
                  ref={(element) => {
                    if (element) {
                      labelElements.current.set(key, element)
                    } else {
                      labelElements.current.delete(key)
                      stopLabelAnimation(key)
                    }
                  }}
                >
                  {String(index).padStart(2, '0')}
                </span>
                <span className="gallery-card__maker">
                  Ambassador · {project.maker}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="project-canvas__frame" aria-hidden="true">
        <span className="project-canvas__corner project-canvas__corner--tl">
          Codex Ambassador
        </span>
        <span className="project-canvas__corner project-canvas__corner--tr">
          Showcase
        </span>
        <span className="project-canvas__corner project-canvas__corner--bl">
          Community Project
        </span>
        <span className="project-canvas__corner project-canvas__corner--br">
          {new Date().getFullYear()}
        </span>
      </div>

      {selected ? (
        <ProjectHeroOverlay
          project={selected.project}
          onClose={() => closeProject(true)}
          onScroll={(scrollTop) => focusScrollRef.current(scrollTop)}
        />
      ) : null}
    </div>
  )
}

function projectHeroRect(viewportWidth: number, viewportHeight: number) {
  const mobile = viewportWidth < 640
  const x = mobile ? 16 : Math.min(96, Math.max(40, viewportWidth * 0.065))
  const y = mobile ? 72 : 84
  const width = Math.max(1, viewportWidth - x * 2)
  const height = Math.max(
    1,
    Math.min(
      width * (mobile ? 0.76 : 0.52),
      viewportHeight * (mobile ? 0.54 : 0.62),
    ),
  )

  return { x, y, width, height }
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function projectCoverImage(project: Project) {
  return (
    project.media.find((item) => item.cover && item.kind === 'image')?.url ??
    project.media.find((item) => item.kind === 'image')?.url ??
    project.heroImageUrl ??
    null
  )
}
