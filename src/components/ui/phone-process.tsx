"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import styles from "./phone-process.module.css";

type ProcessStep = {
    number: string
    label: string
    badge: string
    title: string
    body: string
    summary: string
    kind: string
}

type InterviewModule = {
    name: string
    meta: string
}

type MatchPreview = {
    logoSrc: string
    role: string
    location: string
    score: string
}

const MATCH_PREVIEWS = [
    {
        logoSrc: "/companies/ey.png",
        score: "92",
    },
    {
        logoSrc: "/companies/escp.png",
        score: "88",
    },
    {
        logoSrc: "/companies/enel.png",
        score: "84",
    },
]

const CARD_EXIT_MS = 380

export default function PhoneProcessSection() {
    const { t } = useI18n()
    const processSteps = t.process.steps as ProcessStep[]
    const interviewModules = t.process.modules as InterviewModule[]
    const matches = MATCH_PREVIEWS.map((match, index) => ({
        ...match,
        ...t.process.matches[index],
    }))
    const [activeStep, setActiveStep] = useState(0)
    const [exitingStep, setExitingStep] = useState<number | null>(null)
    const [isCopyEngaged, setIsCopyEngaged] = useState(false)
    const [isStepCopyVisible, setIsStepCopyVisible] = useState(false)
    const sectionRef = useRef<HTMLElement | null>(null)
    const panelRefs = useRef<(HTMLDivElement | null)[]>([])
    const previousStepRef = useRef(0)
    const visiblePanelsRef = useRef<boolean[]>(processSteps.map(() => false))

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const panelIndex = Number(
                        entry.target.getAttribute("data-panel-index") ?? -1,
                    )

                    if (panelIndex < 0) {
                        return
                    }

                    visiblePanelsRef.current[panelIndex] = entry.isIntersecting
                })

                const highestVisiblePanel = visiblePanelsRef.current.reduce<number>(
                    (currentHighest, isVisible, index) =>
                        isVisible ? index : currentHighest,
                    -1,
                )

                if (highestVisiblePanel !== -1) {
                    setActiveStep(highestVisiblePanel)
                }
            },
            { threshold: 0.4 },
        )

        panelRefs.current.forEach((panel) => {
            if (panel) {
                observer.observe(panel)
            }
        })

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const updateCopyState = () => {
            const section = sectionRef.current

            if (!section) {
                return
            }

            const rect = section.getBoundingClientRect()
            const viewportHeight = window.innerHeight
            const isInsideProcess =
                rect.top < viewportHeight * 0.68 &&
                rect.bottom > viewportHeight * 0.2

            setIsCopyEngaged(isInsideProcess)
            setIsStepCopyVisible(
                isInsideProcess && rect.top < viewportHeight * 0.18,
            )
        }

        updateCopyState()
        window.addEventListener("scroll", updateCopyState, { passive: true })
        window.addEventListener("resize", updateCopyState)

        return () => {
            window.removeEventListener("scroll", updateCopyState)
            window.removeEventListener("resize", updateCopyState)
        }
    }, [])

    useEffect(() => {
        if (activeStep === previousStepRef.current) {
            return
        }

        const previousStep = previousStepRef.current
        setExitingStep(previousStep)
        previousStepRef.current = activeStep

        const timeout = window.setTimeout(() => {
            setExitingStep((current) =>
                current === previousStep ? null : current,
            )
        }, CARD_EXIT_MS)

        return () => window.clearTimeout(timeout)
    }, [activeStep])

    return (
        <section
            className={cn(
                styles.process,
                isCopyEngaged && styles.processEngaged,
                isStepCopyVisible && styles.processStepCopyVisible,
            )}
            id="how"
            ref={sectionRef}
        >
            <div className={styles.scrollWrapper}>
                <div className={styles.stickyViewport}>
                    <PhoneMock
                        activeStep={activeStep}
                        exitingStep={exitingStep}
                        interviewModules={interviewModules}
                        matches={matches}
                        processSteps={processSteps}
                        readyLabel={t.process.ready}
                        stepLabel={t.process.stepLabel}
                        ofLabel={t.process.ofLabel}
                    />

                    <div className={styles.copyPanel}>
                        <h2 className={styles.processTitle}>
                            {t.process.heading}
                        </h2>
                        <p className={styles.copyText}>
                            {t.process.body}
                        </p>

                        <div className={styles.mobileStepCopyStage}>
                            {processSteps.map((step, index) => (
                                <div
                                    className={cn(
                                        styles.mobileStepCopy,
                                        index === activeStep &&
                                            styles.mobileStepCopyActive,
                                        index === exitingStep &&
                                            styles.mobileStepCopyExit,
                                    )}
                                    key={step.number}
                                >
                                    <p className={styles.mobileStepTitle}>
                                        {step.title}
                                    </p>
                                    <p className={styles.mobileStepBody}>
                                        {step.summary}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className={styles.stepList} aria-label={t.process.heading}>
                            {processSteps.map((step, index) => (
                                <div
                                    className={cn(
                                        styles.sideStep,
                                        index === activeStep &&
                                            styles.sideStepActive,
                                    )}
                                    key={step.number}
                                >
                                    <div className={styles.sideStepLayout}>
                                        <span className={styles.sideStepNumber}>
                                            {step.number}
                                        </span>

                                        <div className={styles.sideStepCopy}>
                                            <p className={styles.sideStepTitle}>
                                                {step.title}
                                            </p>
                                            <p className={styles.sideStepBody}>
                                                {step.summary}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {processSteps.map((step, index) => (
                    <div
                        className={styles.panel}
                        data-panel-index={index}
                        key={step.number}
                        ref={(node) => {
                            panelRefs.current[index] = node
                        }}
                        style={{ top: `${index * 100}vh` }}
                    />
                ))}
            </div>
        </section>
    )
}

function PhoneMock({
    activeStep,
    exitingStep,
    interviewModules,
    matches,
    processSteps,
    readyLabel,
    stepLabel,
    ofLabel,
}: {
    activeStep: number
    exitingStep: number | null
    interviewModules: InterviewModule[]
    matches: MatchPreview[]
    processSteps: ProcessStep[]
    readyLabel: string
    stepLabel: string
    ofLabel: string
}) {
    return (
        <div className={styles.phoneStage}>
            <div className={styles.phoneBezel}>
                <div
                    aria-hidden="true"
                    className={cn(styles.phoneButton, styles.phoneButtonVolumeUp)}
                />
                <div
                    aria-hidden="true"
                    className={cn(
                        styles.phoneButton,
                        styles.phoneButtonVolumeDown,
                    )}
                />
                <div
                    aria-hidden="true"
                    className={cn(styles.phoneButton, styles.phoneButtonPower)}
                />

                <div className={styles.phoneScreen}>
                    <div aria-hidden="true" className={styles.phoneGlare} />
                    <div aria-hidden="true" className={styles.phoneNotch}>
                        <span className={styles.phoneNotchCamera} />
                    </div>

                    <div className={styles.phoneStatusBar}>
                        <span className={styles.phoneTime}>9:41</span>
                    </div>

                    <div className={styles.phoneAppHeader}>
                        <div className={styles.phoneAppAvatar}>
                            <Image
                                alt=""
                                className={styles.phoneAppLogo}
                                height={30}
                                src="/logo_assumerai.png"
                                width={30}
                            />
                        </div>
                        <div>
                            <div className={styles.phoneAppName}>Assumerai</div>
                        </div>
                    </div>

                    <div className={styles.phoneCardsContainer}>
                        {processSteps.map((step, index) => {
                            const isActive = index === activeStep
                            const isExiting = index === exitingStep

                            return (
                                <div
                                    className={cn(
                                        styles.phoneCard,
                                        isActive && styles.phoneCardActive,
                                        isExiting && styles.phoneCardExit,
                                    )}
                                    key={step.number}
                                >
                                    <div className={styles.phoneCardMeta}>
                                        <span>{step.label}</span>
                                        <span
                                            className={cn(
                                                styles.phoneBadge,
                                                step.kind === "matches" &&
                                                    styles.phoneBadgeSuccess,
                                            )}
                                        >
                                            {step.badge}
                                        </span>
                                    </div>

                                    <p className={styles.phoneCardTitle}>
                                        {step.title}
                                    </p>
                                    <p className={styles.phoneCardBody}>
                                        {step.body}
                                    </p>

                                    <PhoneStepPreview
                                        interviewModules={interviewModules}
                                        matches={matches}
                                        readyLabel={readyLabel}
                                        step={step}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    <div className={styles.phoneStepCount}>
                        {stepLabel} {activeStep + 1} {ofLabel} {processSteps.length}
                    </div>

                    <div
                        className={styles.phoneHomeIndicator}
                        aria-hidden="true"
                    />
                </div>
            </div>
        </div>
    )
}

function PhoneStepPreview({
    interviewModules,
    matches,
    readyLabel,
    step,
}: {
    interviewModules: InterviewModule[]
    matches: MatchPreview[]
    readyLabel: string
    step: ProcessStep
}) {
    if (step.kind === "upload") {
        return (
            <div className={styles.uploadFileRow}>
                <div className={styles.uploadFileIcon}>
                    CV
                </div>

                <div className={styles.uploadFileBody}>
                    <div className={styles.uploadFileTop}>
                        <span className={styles.uploadFileName}>
                            Marco_Belluzzi_CV.pdf
                        </span>
                        <span className={styles.uploadReady}>{readyLabel}</span>
                    </div>
                    <div className={styles.uploadProgress}>
                        <span className={styles.uploadProgressBar} />
                    </div>
                </div>
            </div>
        )
    }

    if (step.kind === "interview") {
        return (
            <div className={styles.moduleList}>
                {interviewModules.map((module) => (
                    <div className={styles.moduleRow} key={module.name}>
                        <span className={styles.moduleName}>{module.name}</span>
                        <span className={styles.moduleMeta}>{module.meta}</span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={styles.matchList}>
            {matches.map((match) => (
                <div className={styles.matchRow} key={match.role}>
                    <span className={styles.matchLogo}>
                        <Image
                            alt=""
                            className={styles.matchLogoImage}
                            height={22}
                            src={match.logoSrc}
                            width={22}
                        />
                    </span>
                    <span className={styles.matchInfo}>
                        <span className={styles.matchRole}>{match.role}</span>
                        <span className={styles.matchLocation}>
                            {match.location}
                        </span>
                    </span>
                    <span className={styles.matchScore}>{match.score}</span>
                </div>
            ))}
        </div>
    )
}
