'use client'

import { gsap } from 'gsap'
import { useEffect, useLayoutEffect, useRef } from 'react'

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const youRef = useRef<HTMLSpanElement>(null)
  const canRef = useRef<HTMLSpanElement>(null)
  const justRef = useRef<HTMLSpanElement>(null)
  const buildRef = useRef<HTMLSpanElement>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useLayoutEffect(() => {
    const container = containerRef.current
    const words = [
      youRef.current,
      canRef.current,
      justRef.current,
      buildRef.current,
    ]
    if (!container || words.some((word) => !word)) {
      onCompleteRef.current()
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReducedMotion) {
      gsap.set(words, { opacity: 1, clearProps: 'transform,filter,clipPath' })
      const timeout = window.setTimeout(() => onCompleteRef.current(), 500)
      return () => window.clearTimeout(timeout)
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        delay: 0.2,
        onComplete: () => onCompleteRef.current(),
      })

      timeline
        .fromTo(
          youRef.current,
          { opacity: 0, scale: 0.35, filter: 'blur(14px)' },
          {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.62,
            ease: 'back.out(1.9)',
          },
        )
        .fromTo(
          canRef.current,
          { opacity: 0, x: -28, rotate: -7, clipPath: 'inset(0 100% 0 0)' },
          {
            opacity: 1,
            x: 0,
            rotate: 0,
            clipPath: 'inset(0 0% 0 0)',
            duration: 0.48,
            ease: 'power4.out',
          },
          '+=0.08',
        )
        .fromTo(
          justRef.current,
          { opacity: 0, y: 24, rotateX: -75, skewX: -12 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            skewX: 0,
            duration: 0.7,
            ease: 'elastic.out(1, 0.55)',
          },
          '+=0.15',
        )
        .fromTo(
          buildRef.current,
          { opacity: 0, y: -16, scaleX: 0.72, letterSpacing: '-0.08em' },
          {
            opacity: 1,
            y: 0,
            scaleX: 1,
            letterSpacing: '0em',
            duration: 0.78,
            ease: 'expo.out',
          },
          '+=0.1',
        )
        .to(container, {
          opacity: 0,
          scale: 1.06,
          duration: 0.85,
          ease: 'power2.inOut',
          delay: 0.85,
        })
    }, container)

    return () => ctx.revert()
  }, [])

  return (
    <div className="intro-sequence" ref={containerRef}>
      <p className="intro-sequence__line">
        <span className="intro-word" ref={youRef}>
          You
        </span>
        <span className="intro-word" ref={canRef}>
          can
        </span>
        <span className="intro-word intro-word--serif" ref={justRef}>
          just
        </span>
        <span className="intro-word intro-word--accent" ref={buildRef}>
          build things
        </span>
      </p>
    </div>
  )
}
