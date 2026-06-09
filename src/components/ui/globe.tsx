"use client";

import Image from "next/image";
import createGlobe, { type COBEOptions } from "cobe";
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const FeaturedGlobeSection = memo(function FeaturedGlobeSection() {
    const { t } = useI18n()

    return (
        <section className="relative w-full overflow-hidden bg-white px-6 py-16 md:px-16 md:py-24">
            <div className="flex flex-col-reverse items-center justify-between gap-10 md:flex-row">
                <div
                    className="z-10 max-w-2xl text-left"
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                >
                    <h1 className="text-3xl font-light leading-[1.0] tracking-tighter text-slate-900 dark:text-white md:text-5xl">
                        <span className="block">{t.globe.headingLine1}</span>
                        {t.globe.headingLine2}
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
                        {t.globe.body}
                    </p>
                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {t.globe.stats.map((stat) => (
                            <div
                                className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-white/5"
                                key={stat.value}
                            >
                                <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                    {stat.value}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="relative h-[300px] w-full max-w-xl md:h-[360px]">
                    <DeferredGlobe className="left-auto right-[-3rem] top-1/2 -translate-y-1/2 scale-[1.05] md:right-[-4rem]" />
                </div>
            </div>
        </section>
    );
});

FeaturedGlobeSection.displayName = "FeaturedGlobeSection";

export default FeaturedGlobeSection;

const ROTATION_SPEED = 0.0035
const GLOBE_RADIUS = 0.8
const GLOBE_MOUNT_ROOT_MARGIN = "200px 0px"

function DeferredGlobe({
    className,
    config,
}: {
    className?: string
    config?: COBEOptions
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [shouldMountGlobe, setShouldMountGlobe] = useState(false)

    useEffect(() => {
        if (shouldMountGlobe) {
            return
        }

        const container = containerRef.current

        if (!container) {
            return
        }

        if (!("IntersectionObserver" in window)) {
            const fallbackFrame = requestAnimationFrame(() => {
                setShouldMountGlobe(true)
            })

            return () => cancelAnimationFrame(fallbackFrame)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setShouldMountGlobe(true)
                    observer.disconnect()
                }
            },
            {
                rootMargin: GLOBE_MOUNT_ROOT_MARGIN,
                threshold: 0,
            },
        )

        observer.observe(container)

        return () => observer.disconnect()
    }, [shouldMountGlobe])

    return (
        <div ref={containerRef} className="absolute inset-0">
            {shouldMountGlobe && <Globe className={className} config={config} />}
        </div>
    )
}

type AvatarMarker = {
    location: [number, number]
    size: number
    src: string
}

const AVATAR_MARKERS: AvatarMarker[] = [
    { location: [14.5995, 120.9842], size: 38, src: "/avatar/woman.png" },
    { location: [19.076, 72.8777], size: 46, src: "/avatar/guy.png" },
    { location: [23.8103, 90.4125], size: 40, src: "/avatar/man.png" },
    { location: [30.0444, 31.2357], size: 42, src: "/avatar/woman.png" },
    { location: [39.9042, 116.4074], size: 42, src: "/avatar/man.png" },
    { location: [-23.5505, -46.6333], size: 46, src: "/avatar/guy.png" },
    { location: [19.4326, -99.1332], size: 46, src: "/avatar/woman.png" },
    { location: [40.7128, -74.006], size: 50, src: "/avatar/man.png" },
    { location: [34.6937, 135.5022], size: 40, src: "/avatar/guy.png" },
    { location: [41.0082, 28.9784], size: 40, src: "/avatar/woman.png" },
]

const GLOBE_CONFIG: COBEOptions = {
    width: 600,
    height: 600,
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.25,
    dark: 0.1,
    diffuse: 1,
    mapSamples: 20000,
    mapBrightness: 6,
    mapBaseBrightness: 0.35,
    baseColor: [0.82, 0.85, 0.9],
    markerColor: [251 / 255, 100 / 255, 21 / 255],
    glowColor: [0.95, 0.97, 1],
    markerElevation: 0.04,
    markers: [],
}

function coordinateToVector([latitude, longitude]: [number, number]) {
    const latitudeRadians = (latitude * Math.PI) / 180
    const longitudeRadians = (longitude * Math.PI) / 180 - Math.PI
    const radius = Math.cos(latitudeRadians)

    return [
        -radius * Math.cos(longitudeRadians),
        Math.sin(latitudeRadians),
        radius * Math.sin(longitudeRadians),
    ] as const
}

function projectAvatarMarker({
    location,
    phi,
    theta,
    width,
    height,
    scale,
    offset,
    markerElevation,
}: {
    location: [number, number]
    phi: number
    theta: number
    width: number
    height: number
    scale: number
    offset: [number, number]
    markerElevation: number
}) {
    const [unitX, unitY, unitZ] = coordinateToVector(location)
    const radius = GLOBE_RADIUS + markerElevation
    const pointX = unitX * radius
    const pointY = unitY * radius
    const pointZ = unitZ * radius
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const cosPhi = Math.cos(phi)
    const sinPhi = Math.sin(phi)
    const projectedX = cosPhi * pointX + sinPhi * pointZ
    const projectedY =
        sinPhi * sinTheta * pointX +
        cosTheta * pointY -
        cosPhi * sinTheta * pointZ
    const projectedZ =
        -sinPhi * cosTheta * pointX +
        sinTheta * pointY +
        cosPhi * cosTheta * pointZ
    const aspectRatio = width / height

    return {
        x: (projectedX / aspectRatio * scale + (offset[0] * scale) / width + 1) / 2,
        y: (-projectedY * scale + (offset[1] * scale) / height + 1) / 2,
        depth: projectedZ,
        visible:
            projectedZ >= 0 ||
            projectedX * projectedX + projectedY * projectedY >=
                GLOBE_RADIUS * GLOBE_RADIUS,
    }
}

export function Globe({
    className,
    config = GLOBE_CONFIG,
}: {
    className?: string
    config?: COBEOptions
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const avatarRefs = useRef<Array<HTMLDivElement | null>>([])
    const widthRef = useRef(0)
    const heightRef = useRef(0)
    const phiRef = useRef(config.phi)
    const dragRotationRef = useRef(0)
    const pointerStartRef = useRef<number | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) {
            return
        }

        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)

        phiRef.current = config.phi
        dragRotationRef.current = 0
        pointerStartRef.current = null

        const updateAvatarPositions = (phi: number) => {
            const width = Math.max(widthRef.current, 1)
            const height = Math.max(heightRef.current, 1)
            const markerElevation = config.markerElevation ?? 0.05
            const scale = config.scale ?? 1
            const offset = config.offset ?? [0, 0]

            AVATAR_MARKERS.forEach((marker, index) => {
                const element = avatarRefs.current[index]

                if (!element) {
                    return
                }

                const projected = projectAvatarMarker({
                    location: marker.location,
                    phi,
                    theta: config.theta,
                    width,
                    height,
                    scale,
                    offset,
                    markerElevation,
                })
                const markerDepth = Math.max(
                    0,
                    Math.min(1, projected.depth / (GLOBE_RADIUS + markerElevation)),
                )
                const avatarScale = 0.86 + markerDepth * 0.18

                element.style.left = `${projected.x * 100}%`
                element.style.top = `${projected.y * 100}%`
                element.style.opacity = projected.visible ? "1" : "0"
                element.style.filter = projected.visible ? "blur(0)" : "blur(6px)"
                element.style.transform = `translate(-50%, -50%) scale(${
                    projected.visible ? avatarScale : 0.72
                })`
                element.style.zIndex = `${Math.round(100 + projected.depth * 100)}`
            })
        }

        const globe = createGlobe(canvas, {
            ...config,
            devicePixelRatio,
            width: config.width,
            height: config.height,
        })

        const updateSize = (nextWidth?: number) => {
            widthRef.current = nextWidth ?? canvas.offsetWidth
            heightRef.current = canvas.offsetHeight
            const size = Math.max(widthRef.current, heightRef.current, 1)
            globe.update({
                width: size,
                height: size,
            })
            updateAvatarPositions(phiRef.current + dragRotationRef.current)
        }

        let animationFrame = 0
        const render = () => {
            if (pointerStartRef.current === null) {
                phiRef.current += ROTATION_SPEED
            }

            globe.update({
                phi: phiRef.current + dragRotationRef.current,
            })
            updateAvatarPositions(phiRef.current + dragRotationRef.current)
            animationFrame = window.requestAnimationFrame(render)
        }

        updateSize(canvas.offsetWidth)
        render()

        const resizeObserver = new ResizeObserver(() => {
            updateSize()
        })

        resizeObserver.observe(canvas)
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement)
        }

        const fadeFrame = requestAnimationFrame(() => {
            canvas.style.opacity = "1"
        })

        return () => {
            cancelAnimationFrame(fadeFrame)
            cancelAnimationFrame(animationFrame)
            resizeObserver.disconnect()
            globe.destroy()
        }
    }, [config])

    const endPointerInteraction = () => {
        if (pointerStartRef.current === null) {
            return
        }

        phiRef.current += dragRotationRef.current
        dragRotationRef.current = 0
        pointerStartRef.current = null

        if (canvasRef.current) {
            canvasRef.current.style.cursor = "grab"
        }
    }

    return (
        <div
            className={cn(
                "absolute left-0 top-0 aspect-square w-full max-w-[600px]",
                className,
            )}
        >
            <canvas
                className={cn(
                    "size-full cursor-grab touch-none opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
                )}
                ref={canvasRef}
                onPointerDown={(event) => {
                    pointerStartRef.current = event.clientX
                    event.currentTarget.setPointerCapture(event.pointerId)
                    event.currentTarget.style.cursor = "grabbing"
                }}
                onPointerMove={(event) => {
                    if (pointerStartRef.current === null) {
                        return
                    }

                    dragRotationRef.current =
                        (event.clientX - pointerStartRef.current) / 200
                }}
                onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                    }

                    endPointerInteraction()
                }}
                onPointerCancel={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId)
                    }

                    endPointerInteraction()
                }}
                onPointerLeave={endPointerInteraction}
            />
            <div className="pointer-events-none absolute inset-0">
                {AVATAR_MARKERS.map((marker, index) => (
                    <div
                        aria-hidden="true"
                        className="absolute overflow-hidden rounded-full border-2 border-white/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/10 dark:border-slate-100/80 dark:bg-slate-950"
                        key={`${marker.src}-${marker.location.join(",")}`}
                        ref={(element) => {
                            avatarRefs.current[index] = element
                        }}
                        style={{
                            height: marker.size,
                            left: "50%",
                            opacity: 0,
                            top: "50%",
                            transform: "translate(-50%, -50%) scale(0.72)",
                            transition: "opacity 180ms ease, filter 180ms ease",
                            width: marker.size,
                        }}
                    >
                        <Image
                            alt=""
                            className="size-full object-cover"
                            draggable={false}
                            height={marker.size}
                            src={marker.src}
                            width={marker.size}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
