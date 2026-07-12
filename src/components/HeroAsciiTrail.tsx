'use client'

import { useEffect, useRef } from 'react'

import type { CardAnimation } from '../config/app'
import {
  createAsciiShaderRenderer,
  type ShaderCard,
  type ShaderTrailPoint,
} from '../lib/ascii-shader'

const TRAIL_DURATION_MS = 520
const MAX_TRAIL_POINTS = 6
const MIN_POINT_DISTANCE = 14

type TrailPoint = {
  x: number
  y: number
  createdAt: number
}

export function HeroAsciiTrail({
  animation,
  imageUrl,
}: {
  animation: CardAnimation
  imageUrl?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas || !imageUrl) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) return

    const renderer = createAsciiShaderRenderer(canvas, 1)
    if (!renderer) return

    let width = 1
    let height = 1
    let animationFrame = 0
    let activePointer: number | null = null
    const points: Array<TrailPoint> = []

    const resize = () => {
      const rect = root.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
    }

    const draw = (time: number) => {
      for (let index = points.length - 1; index >= 0; index -= 1) {
        if (time - points[index].createdAt >= TRAIL_DURATION_MS) {
          points.splice(index, 1)
        }
      }

      const card: ShaderCard = {
        x: 0,
        y: 0,
        width,
        height,
        animation,
        seed: 1,
        imageUrl,
        opacity: 0.62,
        borderRadius: 26,
      }
      const trail: Array<ShaderTrailPoint> = points.map((point) => ({
        x: point.x,
        y: point.y,
        strength: 0.68,
        age: Math.min(1, (time - point.createdAt) / TRAIL_DURATION_MS),
      }))

      renderer.render([card], time / 1_000, width, height, trail)
      if (points.length > 0) {
        animationFrame = window.requestAnimationFrame(draw)
      } else {
        animationFrame = 0
      }
    }

    const addPoint = (event: PointerEvent, force = false) => {
      const rect = root.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const previous = points[points.length - 1]
      if (
        !force &&
        previous &&
        Math.hypot(x - previous.x, y - previous.y) < MIN_POINT_DISTANCE
      ) {
        return
      }
      points.push({ x, y, createdAt: performance.now() })
      if (points.length > MAX_TRAIL_POINTS) points.shift()
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(draw)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      activePointer = event.pointerId
      root.setPointerCapture(event.pointerId)
      addPoint(event, true)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return
      addPoint(event)
    }
    const endPointer = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return
      activePointer = null
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId)
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(root)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerup', endPointer)
    root.addEventListener('pointercancel', endPointer)
    resize()

    return () => {
      resizeObserver.disconnect()
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', endPointer)
      root.removeEventListener('pointercancel', endPointer)
      window.cancelAnimationFrame(animationFrame)
      renderer.dispose()
    }
  }, [animation, imageUrl])

  if (!imageUrl) return null

  return (
    <div className="hero-ascii-trail" ref={rootRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
