"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { LanguageSelector } from "@/components/layout/language-selector";
import {
  ACCOUNT_ROLE_PARAM,
  DEFAULT_ACCOUNT_ROLE,
  getAccountRoleFromProfilePath,
  getProfilePathForRole,
  getSafeProfileNextPath,
  type AccountRole,
} from "@/lib/auth/account-role";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Gem,
  Loader,
  Lock,
  Mail,
  PartyPopper,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  AnimatePresence,
  motion,
  useInView,
  type Transition,
  type Variants,
} from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import React, {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type ConfettiOptions = {
  angle?: number;
  origin?: { x: number; y: number };
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  ticks?: number;
};

type ConfettiApi = { fire: (options?: ConfettiOptions) => void };
export type ConfettiRef = ConfettiApi | null;

const Confetti = forwardRef<
  ConfettiRef,
  React.ComponentPropsWithRef<"canvas"> & { manualstart?: boolean }
>(({ manualstart = false, ...rest }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const fire = useCallback((options: ConfettiOptions = {}) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particleCount = options.particleCount ?? 48;
    const ticks = options.ticks ?? 70;
    const origin = options.origin ?? { x: 0.5, y: 0.5 };
    const baseAngle = ((options.angle ?? 90) * Math.PI) / 180;
    const spread = ((options.spread ?? 90) * Math.PI) / 180;
    const startVelocity = options.startVelocity ?? 28;
    const colors = ["#f7c8d9", "#e0b8e6", "#b9b8ee", "#a8c5f1", "#ffffff"];
    const particles = Array.from({ length: particleCount }, (_, index) => {
      const direction = baseAngle + (Math.random() - 0.5) * spread;
      const velocity = startVelocity * (0.35 + Math.random() * 0.75);

      return {
        x: origin.x * width,
        y: origin.y * height,
        vx: Math.cos(direction) * velocity,
        vy: -Math.sin(direction) * velocity,
        color: colors[index % colors.length],
        size: 4 + Math.random() * 6,
        spin: Math.random() * Math.PI,
        rotation: Math.random() * Math.PI,
      };
    });

    let frame = 0;

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }

    const draw = () => {
      frame += 1;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.6;
        particle.vx *= 0.985;
        particle.rotation += particle.spin;

        const opacity = Math.max(0, 1 - frame / ticks);
        context.save();
        context.globalAlpha = opacity;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.fillRect(
          -particle.size / 2,
          -particle.size / 2,
          particle.size,
          particle.size * 0.62,
        );
        context.restore();
      });

      if (frame < ticks) {
        rafRef.current = window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
        rafRef.current = null;
      }
    };

    draw();
  }, []);

  const api = useMemo(() => ({ fire }), [fire]);

  useImperativeHandle(ref, () => api, [api]);

  useEffect(() => {
    if (!manualstart) {
      fire();
    }

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [fire, manualstart]);

  return <canvas ref={canvasRef} {...rest} />;
});

Confetti.displayName = "Confetti";

type TextLoopProps = {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
  stopOnEnd?: boolean;
};

function TextLoop({
  children,
  className,
  interval = 2,
  transition = { duration: 0.3 },
  variants,
  onIndexChange,
  stopOnEnd = false,
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = Children.toArray(children);

  useEffect(() => {
    const intervalMs = interval * 1000;
    const timer = window.setInterval(() => {
      setCurrentIndex((current) => {
        if (stopOnEnd && current === items.length - 1) {
          window.clearInterval(timer);
          return current;
        }

        const next = (current + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [items.length, interval, onIndexChange, stopOnEnd]);

  const motionVariants: Variants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  };

  return (
    <div className={cn("relative inline-block whitespace-nowrap", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          variants={variants || motionVariants}
        >
          {items[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: { hidden: { y: number }; visible: { y: number } };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: `${number}px` | `${number}%`;
  blur?: string;
}

function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})` },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };
  const combinedVariants = variant || defaultVariants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      exit="hidden"
      variants={combinedVariants}
      transition={{ delay: 0.04 + delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const glassButtonVariants = cva(
  "relative isolate cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 transition-all disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "text-base font-medium",
        sm: "text-sm font-medium",
        lg: "text-lg font-medium",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { size: "default" },
  },
);

const glassButtonTextVariants = cva(
  "glass-button-text relative block select-none tracking-normal",
  {
    variants: {
      size: {
        default: "px-6 py-3.5",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "flex h-10 w-10 items-center justify-center",
      },
    },
    defaultVariants: { size: "default" },
  },
);

interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  contentClassName?: string;
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, children, size, contentClassName, onClick, ...props }, ref) => {
    const handleWrapperClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target instanceof Element && event.target.closest("button")) {
        return;
      }

      const button = event.currentTarget.querySelector("button");
      button?.click();
    };

    return (
      <div
        className={cn("glass-button-wrap relative cursor-pointer rounded-full", className)}
        onClick={handleWrapperClick}
      >
        <button
          className={cn("glass-button relative z-10", glassButtonVariants({ size }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>
            {children}
          </span>
        </button>
        <div className="glass-button-shadow pointer-events-none rounded-full" />
      </div>
    );
  },
);

GlassButton.displayName = "GlassButton";

const GradientBackground = React.memo(() => (
  <>
    <style>
      {`
        @keyframes auth-float-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-1.5rem, 1rem, 0) scale(1.04); }
        }
        @keyframes auth-float-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(1.25rem, -1rem, 0) scale(1.03); }
        }
        @media (max-width: 768px) {
          .auth-bg-float-a,
          .auth-bg-float-b {
            animation: none !important;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-bg-float-a,
          .auth-bg-float-b {
            animation: none !important;
          }
        }
      `}
    </style>
    <div className="absolute inset-0 bg-[#f8f6fb]" />
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 900 680"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="auth_grad_1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7c8d9" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#d8c2ee" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a8c5f1" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="auth_grad_2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dceef8" stopOpacity="0.92" />
          <stop offset="55%" stopColor="#efe1f3" stopOpacity="0.86" />
          <stop offset="100%" stopColor="#fff7dc" stopOpacity="0.72" />
        </linearGradient>
        <filter id="auth_blur_wide" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="36" />
        </filter>
      </defs>
      <g
        className="auth-bg-float-a"
        style={{ animation: "auth-float-a 22s ease-in-out infinite" }}
      >
        <path
          d="M-66 541C57 408 192 356 340 385C488 414 537 513 694 482C851 451 934 302 995 182V768H-66V541Z"
          fill="url(#auth_grad_1)"
          filter="url(#auth_blur_wide)"
        />
      </g>
      <g
        className="auth-bg-float-b"
        style={{ animation: "auth-float-b 28s ease-in-out infinite" }}
      >
        <path
          d="M-58 64C86 15 223 36 350 127C477 218 633 206 772 82C911 -42 1006 -43 1059 -2V381C912 437 769 435 629 374C489 313 354 329 223 422C92 515 -13 537 -92 488L-58 64Z"
          fill="url(#auth_grad_2)"
          filter="url(#auth_blur_wide)"
        />
      </g>
    </svg>
  </>
));
GradientBackground.displayName = "GradientBackground";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <g fillRule="evenodd" fill="none">
      <g fillRule="nonzero" transform="translate(3, 2)">
        <path
          fill="#4285F4"
          d="M57.812 30.152c0-2.425-.197-4.195-.623-6.03H29.496v10.946h16.256c-.328 2.72-2.098 6.817-6.031 9.57l-.055.366 8.756 6.783.607.061c5.571-5.146 8.783-12.717 8.783-21.696"
        />
        <path
          fill="#34A853"
          d="M29.496 58.992c7.964 0 14.65-2.622 19.533-7.144l-9.308-7.211c-2.49 1.737-5.833 2.95-10.225 2.95-7.8 0-14.42-5.145-16.78-12.257l-.346.029-9.105 7.046-.119.331c4.85 9.636 14.814 16.256 26.35 16.256"
        />
        <path
          fill="#FBBC05"
          d="M12.716 35.33a18.26 18.26 0 0 1-.983-5.834c0-2.032.36-3.998.95-5.834l-.016-.39-9.219-7.16-.302.143A29.44 29.44 0 0 0 0 29.496c0 4.752 1.147 9.242 3.146 13.24l9.57-7.406"
        />
        <path
          fill="#EB4335"
          d="M29.496 11.405c5.539 0 9.275 2.393 11.405 4.392l8.325-8.128C44.113 2.917 37.46 0 29.496 0 17.96 0 7.997 6.62 3.146 16.255l9.537 7.407c2.393-7.111 9.013-12.257 16.813-12.257"
        />
      </g>
    </g>
  </svg>
);

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    className="h-6 w-6"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
);

type AuthStep = "email" | "password" | "confirmPassword";
type ModalStatus = "closed" | "loading" | "error" | "success";
type OAuthProvider = "google" | "github";

const TEXT_LOOP_INTERVAL = 1.5;
const AUTH_REDIRECT_PATH = "/auth/callback";
const AUTH_STEP_TRANSITION: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };
const AUTH_COPY_TRANSITION: Transition = { duration: 0.42, ease: [0.22, 1, 0.36, 1] };
const AUTH_COPY_PANEL_CLASS = "relative h-[188px] w-full sm:h-[200px]";
const AUTH_COPY_ITEM_CLASS = "absolute inset-x-0 top-0 flex w-full flex-col items-center gap-4 text-center";
const AUTH_FORM_PANEL_CLASS = "relative h-[172px] w-full";
const AUTH_FORM_STACK_CLASS = "absolute inset-x-0 top-0 w-full space-y-6";
const AUTH_FORM_SINGLE_CLASS = "absolute inset-x-0 top-0 w-full";
const AUTH_FOOTER_SLOT_CLASS = "relative h-6 w-full";
const AUTH_FOOTER_TEXT_CLASS =
  "absolute inset-x-0 top-0 text-center text-sm font-medium text-muted-foreground";

const loadingStepIcons = [
  <Loader key="checking" className="h-12 w-12 animate-spin text-primary" />,
  <Loader key="preparing" className="h-12 w-12 animate-spin text-primary" />,
  <Loader key="finalizing" className="h-12 w-12 animate-spin text-primary" />,
];

const oauthProviders = {
  google: { provider: "google" },
  github: { provider: "github" },
} satisfies Record<OAuthProvider, { provider: OAuthProvider }>;

function DefaultLogo() {
  return (
    <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_10px_24px_rgba(168,197,241,0.35)] ring-1 ring-white/80">
      <Image
        src="/logo_assumerai.png"
        alt=""
        width={36}
        height={36}
        className="size-9 scale-[1.58] object-contain"
        preload
      />
    </span>
  );
}

function AuthModal({
  isSignup,
  modalErrorMessage,
  modalStatus,
  onClose,
}: {
  isSignup: boolean;
  modalErrorMessage: string;
  modalStatus: ModalStatus;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {modalStatus !== "closed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/65 bg-white/75 p-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            {(modalStatus === "error" || modalStatus === "success") && (
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full p-1 text-slate-500 transition-colors hover:text-slate-900"
                aria-label={t.auth.closeDialog}
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {modalStatus === "error" && (
              <>
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-medium text-foreground">
                  {modalErrorMessage}
                </p>
                <GlassButton onClick={onClose} size="sm" className="mt-4">
                  {t.auth.tryAgain}
                </GlassButton>
              </>
            )}
            {modalStatus === "loading" && (
              <TextLoop interval={TEXT_LOOP_INTERVAL} stopOnEnd>
                {t.auth.loading.map((message, index) => (
                  <div key={message} className="flex flex-col items-center gap-4">
                    {loadingStepIcons[index] ?? loadingStepIcons[0]}
                    <p className="text-lg font-medium text-foreground">
                      {message}
                    </p>
                  </div>
                ))}
              </TextLoop>
            )}
            {modalStatus === "success" && (
              <div className="flex flex-col items-center gap-4">
                <PartyPopper className="h-12 w-12 text-emerald-500" />
                <p className="text-lg font-medium text-foreground">
                  {isSignup ? t.auth.successSignup : t.auth.successLogin}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface AuthComponentProps {
  logo?: React.ReactNode;
  brandName?: string;
  mode?: "login" | "signup";
}

export function AuthComponent({
  logo = <DefaultLogo />,
  brandName = "Assumerai",
  mode = "signup",
}: AuthComponentProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("email");
  const [modalStatus, setModalStatus] = useState<ModalStatus>("closed");
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const [accountRole, setAccountRole] =
    useState<AccountRole>(DEFAULT_ACCOUNT_ROLE);
  const [requestedNextPath, setRequestedNextPath] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const { t } = useI18n();

  const isSignup = mode === "signup";
  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;
  const roleOptions = useMemo(
    () => [
      {
        role: "candidate" as const,
        label: t.auth.candidateAccount,
        description: t.auth.candidateAccountHint,
        icon: UserRound,
      },
      {
        role: "company" as const,
        label: t.auth.companyAccount,
        description: t.auth.companyAccountHint,
        icon: Building2,
      },
    ],
    [
      t.auth.candidateAccount,
      t.auth.candidateAccountHint,
      t.auth.companyAccount,
      t.auth.companyAccountHint,
    ],
  );

  const fireSideCanons = useCallback(() => {
    const fire = confettiRef.current?.fire;

    if (!fire) return;

    const defaults = { startVelocity: 30, spread: 80, ticks: 70 };
    fire({ ...defaults, particleCount: 56, origin: { x: 0, y: 1 }, angle: 55 });
    fire({ ...defaults, particleCount: 56, origin: { x: 1, y: 1 }, angle: 125 });
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const nextPath = getSafeProfileNextPath(searchParams.get("next"));
      const nextRole = getAccountRoleFromProfilePath(nextPath);

      setRequestedNextPath(nextPath);

      if (nextRole) {
        setAccountRole(nextRole);
      }

      const authError = searchParams.get("auth_error");
      if (authError) {
        setModalErrorMessage(t.auth.errorMessage);
        setModalStatus("error");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [t.auth.errorMessage]);

  const getSuccessPathForRole = useCallback(
    (role: AccountRole) => {
      const requestedRole = getAccountRoleFromProfilePath(requestedNextPath);

      if (requestedNextPath && requestedRole === role) {
        return requestedNextPath;
      }

      return getProfilePathForRole(role);
    },
    [requestedNextPath],
  );

  const getAuthRedirectUrl = useCallback(
    (role: AccountRole) => {
      const successPath = getSuccessPathForRole(role);
      const redirectUrl = new URL(AUTH_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("next", successPath);
      redirectUrl.searchParams.set(ACCOUNT_ROLE_PARAM, role);

      return redirectUrl.toString();
    },
    [getSuccessPathForRole],
  );

  const submitAuth = useCallback(async () => {
    if (modalStatus !== "closed" || isSubmittingRef.current) return;

    if (!isEmailValid || !isPasswordValid) {
      setModalErrorMessage(t.auth.emailInvalid);
      setModalStatus("error");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setModalErrorMessage(t.auth.passwordsMismatch);
      setModalStatus("error");
      return;
    }

    isSubmittingRef.current = true;
    setModalStatus("loading");

    try {
      const { data, error } = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getAuthRedirectUrl(accountRole),
              data: {
                role: accountRole,
                account_role: accountRole,
              },
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

      if (error) {
        isSubmittingRef.current = false;
        setModalErrorMessage(error.message);
        setModalStatus("error");
        return;
      }

      if (!isSignup) {
        const { error: roleError } = await supabase.auth.updateUser({
          data: {
            role: accountRole,
            account_role: accountRole,
          },
        });

        if (roleError) {
          isSubmittingRef.current = false;
          setModalErrorMessage(roleError.message);
          setModalStatus("error");
          return;
        }
      }

      const successPath = getSuccessPathForRole(accountRole) ?? getProfilePathForRole(accountRole);
      fireSideCanons();
      setModalStatus("success");
      router.refresh();
      if (!isSignup || data.session) {
        router.push(successPath);
      }
    } catch (error) {
      isSubmittingRef.current = false;
      setModalErrorMessage(error instanceof Error ? error.message : t.auth.errorMessage);
      setModalStatus("error");
    }
  }, [
    accountRole,
    confirmPassword,
    fireSideCanons,
    getAuthRedirectUrl,
    getSuccessPathForRole,
    email,
    isEmailValid,
    isPasswordValid,
    isSignup,
    modalStatus,
    password,
    router,
    supabase,
    t.auth,
  ]);

  const handleOAuthSignIn = useCallback(
    async (selectedProvider: OAuthProvider) => {
      if (modalStatus !== "closed" || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setModalStatus("loading");

      const { provider } = oauthProviders[selectedProvider];
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl(accountRole),
        },
      });

      if (error) {
        isSubmittingRef.current = false;
        setModalErrorMessage(error.message);
        setModalStatus("error");
      }
    },
    [accountRole, getAuthRedirectUrl, modalStatus, supabase],
  );

  const handleProgressStep = () => {
    if (authStep === "email" && isEmailValid) {
      setAuthStep("password");
      return;
    }

    if (authStep === "password" && isPasswordValid) {
      if (isSignup) {
        setAuthStep("confirmPassword");
      } else {
        void submitAuth();
      }
    }
  };

  const handleFinalSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (authStep === "confirmPassword" || !isSignup) {
      void submitAuth();
    } else {
      handleProgressStep();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleProgressStep();
    }
  };

  const handleGoBack = () => {
    if (authStep === "confirmPassword") {
      setAuthStep("password");
      setConfirmPassword("");
    } else if (authStep === "password") {
      setAuthStep("email");
      setPassword("");
    }
  };

  const closeModal = () => {
    isSubmittingRef.current = false;
    setModalStatus("closed");
    setModalErrorMessage("");
  };

  useEffect(() => {
    if (authStep === "password") {
      const timeout = window.setTimeout(() => passwordInputRef.current?.focus(), 420);
      return () => window.clearTimeout(timeout);
    }

    if (authStep === "confirmPassword") {
      const timeout = window.setTimeout(
        () => confirmPasswordInputRef.current?.focus(),
        420,
      );
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [authStep]);

  useEffect(() => {
    if (modalStatus === "success") {
      fireSideCanons();
    }
  }, [fireSideCanons, modalStatus]);

  const titleByStep = {
    email: isSignup ? t.auth.getStarted : t.auth.welcomeBack,
    password: isSignup ? t.auth.createPassword : t.auth.enterPassword,
    confirmPassword: t.auth.oneLastStep,
  };

  const descriptionByStep = {
    email: isSignup
      ? t.auth.continueWith
      : t.auth.continueWithAccount,
    password: isSignup
      ? t.auth.passwordHint
      : t.auth.loginPasswordHint,
    confirmPassword: t.auth.confirmHint,
  };

  return (
    <div className="auth-surface relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <style>{`
        .auth-surface,
        .auth-surface button,
        .auth-surface input {
          font-family: var(--font-geist-sans), sans-serif;
        }

        .auth-surface input[type="password"]::-ms-reveal,
        .auth-surface input[type="password"]::-ms-clear {
          display: none !important;
        }

        @property --angle-1 {
          syntax: "<angle>";
          inherits: false;
          initial-value: -75deg;
        }

        @property --angle-2 {
          syntax: "<angle>";
          inherits: false;
          initial-value: -45deg;
        }

        .glass-button-wrap,
        .glass-input-wrap {
          --auth-time: 400ms;
          --auth-ease: cubic-bezier(0.25, 1, 0.5, 1);
          --auth-border: clamp(1px, 0.0625em, 4px);
          z-index: 2;
          transform-style: preserve-3d;
          transition: transform var(--auth-time) var(--auth-ease);
        }

        .glass-button-wrap:has(.glass-button:active) {
          transform: rotateX(22deg);
        }

        .glass-button-shadow {
          position: absolute;
          inset: -1em;
          z-index: 0;
          filter: blur(7px);
          transition: filter var(--auth-time) var(--auth-ease);
        }

        .glass-button-shadow::after {
          content: "";
          position: absolute;
          inset: 0.85em 1em 1.15em 0.75em;
          border-radius: 9999px;
          background: linear-gradient(180deg, rgb(15 23 42 / 0.18), rgb(15 23 42 / 0.08));
          opacity: 0.8;
        }

        .glass-button,
        .glass-input {
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(9px);
          background: linear-gradient(-75deg, rgb(255 255 255 / 0.28), rgb(255 255 255 / 0.58), rgb(255 255 255 / 0.28));
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 0.72),
            inset 0 -1px 0 rgb(255 255 255 / 0.28),
            0 14px 34px rgb(15 23 42 / 0.11),
            0 0 0 1px rgb(255 255 255 / 0.48);
          transition:
            box-shadow var(--auth-time) var(--auth-ease),
            transform var(--auth-time) var(--auth-ease);
        }

        .glass-button:hover,
        .glass-input-wrap:focus-within .glass-input {
          transform: scale(0.985);
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 0.8),
            inset 0 -1px 0 rgb(255 255 255 / 0.34),
            0 11px 24px rgb(15 23 42 / 0.13),
            0 0 0 1px rgb(255 255 255 / 0.68);
        }

        .glass-button::after,
        .glass-input::after {
          content: "";
          position: absolute;
          inset: calc(var(--auth-border) * -0.5);
          z-index: 1;
          border-radius: 9999px;
          padding: var(--auth-border);
          background:
            conic-gradient(from var(--angle-1) at 50% 50%, rgb(15 23 42 / 0.34) 0%, transparent 7% 42%, rgb(255 255 255 / 0.64) 50%, transparent 60% 94%, rgb(15 23 42 / 0.28) 100%),
            linear-gradient(180deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.22));
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          pointer-events: none;
          transition: --angle-1 500ms ease;
        }

        .glass-button:hover::after,
        .glass-input-wrap:focus-within .glass-input::after {
          --angle-1: -125deg;
        }

        .glass-button-text {
          color: rgb(15 23 42 / 0.88);
          text-shadow: 0 1px 0 rgb(255 255 255 / 0.55);
        }

        .glass-button-text::after,
        .glass-input-text-area::after {
          content: "";
          position: absolute;
          inset: var(--auth-border);
          z-index: 3;
          border-radius: 9999px;
          background: linear-gradient(var(--angle-2), transparent 0%, rgb(255 255 255 / 0.45) 40% 50%, transparent 56%);
          background-position: 0% 50%;
          background-size: 200% 200%;
          mix-blend-mode: screen;
          pointer-events: none;
          transition:
            background-position calc(var(--auth-time) * 1.25) var(--auth-ease),
            --angle-2 calc(var(--auth-time) * 1.25) var(--auth-ease);
        }

        .glass-button:hover .glass-button-text::after,
        .glass-input-wrap:focus-within .glass-input-text-area::after {
          background-position: 25% 50%;
        }

        .glass-input-wrap {
          position: relative;
          border-radius: 9999px;
        }

        .glass-input {
          position: relative;
          display: flex;
          width: 100%;
          align-items: center;
          gap: 0.5rem;
          border-radius: 9999px;
          padding: 0.25rem;
        }

        .glass-input-text-area {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .glass-button,
          .glass-input {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: rgb(255 255 255 / 0.86);
            transition:
              box-shadow 200ms var(--auth-ease),
              transform 200ms var(--auth-ease);
          }

          .glass-button::after,
          .glass-input::after {
            display: none;
          }

          .glass-button-text::after,
          .glass-input-text-area::after {
            display: none;
          }

          .glass-button-shadow {
            display: none;
          }
        }
      `}</style>

      <Confetti
        ref={confettiRef}
        manualstart
        className="fixed left-0 top-0 z-[999] h-full w-full pointer-events-none"
      />
      <AuthModal
        isSignup={isSignup}
        modalErrorMessage={modalErrorMessage}
        modalStatus={modalStatus}
        onClose={closeModal}
      />

      <Link
        href="/"
        className={cn(
          "fixed left-4 top-4 z-20 flex items-center gap-2",
          "md:left-1/2 md:-translate-x-1/2",
        )}
      >
        {logo}
        <h1 className="text-base font-bold tracking-tight text-slate-950">
          {brandName}
        </h1>
      </Link>

      <LanguageSelector className="fixed right-4 top-4 z-20 block max-[420px]:right-3" />

      <div className="relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-card px-4 py-24">
        <div className="absolute inset-0 z-0">
          <GradientBackground />
        </div>

        <fieldset
          disabled={modalStatus !== "closed"}
          className="relative z-10 mx-auto flex w-full max-w-[300px] flex-col items-center gap-8"
        >
          <div className={AUTH_COPY_PANEL_CLASS}>
            <AnimatePresence initial={false}>
              {authStep === "email" && (
                <motion.div
                  key="email-content"
                  initial={{ y: 12, opacity: 0, filter: "blur(8px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -12, opacity: 0, filter: "blur(8px)" }}
                  transition={AUTH_COPY_TRANSITION}
                  className={AUTH_COPY_ITEM_CLASS}
                >
                  <div className="text-center">
                    <p className="whitespace-nowrap text-4xl font-light tracking-normal text-foreground sm:text-5xl">
                      {titleByStep.email}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {descriptionByStep.email}
                  </p>
                  <div className="flex w-full items-center justify-center gap-4">
                    <GlassButton
                      type="button"
                      onClick={() => void handleOAuthSignIn("google")}
                      contentClassName="flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <GoogleIcon />
                      <span className="font-semibold text-foreground">Google</span>
                    </GlassButton>
                    <GlassButton
                      type="button"
                      onClick={() => void handleOAuthSignIn("github")}
                      contentClassName="flex items-center justify-center gap-2"
                      size="sm"
                    >
                      <GitHubIcon />
                      <span className="font-semibold text-foreground">GitHub</span>
                    </GlassButton>
                  </div>
                  <div className="flex w-full items-center gap-2 py-2">
                    <hr className="w-full border-border" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t.auth.or}
                    </span>
                    <hr className="w-full border-border" />
                  </div>
                </motion.div>
              )}

              {authStep === "password" && (
                <motion.div
                  key="password-title"
                  initial={{ y: 12, opacity: 0, filter: "blur(8px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -12, opacity: 0, filter: "blur(8px)" }}
                  transition={AUTH_COPY_TRANSITION}
                  className={AUTH_COPY_ITEM_CLASS}
                >
                  <p className="whitespace-nowrap text-4xl font-light tracking-normal text-foreground sm:text-5xl">
                    {titleByStep.password}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {descriptionByStep.password}
                  </p>
                </motion.div>
              )}

              {authStep === "confirmPassword" && (
                <motion.div
                  key="confirm-title"
                  initial={{ y: 12, opacity: 0, filter: "blur(8px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -12, opacity: 0, filter: "blur(8px)" }}
                  transition={AUTH_COPY_TRANSITION}
                  className={AUTH_COPY_ITEM_CLASS}
                >
                  <p className="whitespace-nowrap text-4xl font-light tracking-normal text-foreground sm:text-5xl">
                    {titleByStep.confirmPassword}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {descriptionByStep.confirmPassword}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t.auth.accountTypeLabel}
            </p>
            <div className="grid grid-cols-2 gap-1 rounded-full border border-white/70 bg-white/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = accountRole === option.role;

                return (
                  <button
                    key={option.role}
                    type="button"
                    aria-pressed={isSelected}
                    title={option.description}
                    onClick={() => setAccountRole(option.role)}
                    className={cn(
                      "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold transition-all",
                      isSelected
                        ? "bg-[#040817] text-white shadow-[0_10px_24px_rgba(4,8,23,0.18)]"
                        : "text-slate-700 hover:bg-white/70 hover:text-slate-950",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={AUTH_FORM_PANEL_CLASS}>
            <form onSubmit={handleFinalSubmit} className="relative h-full w-full">
              <AnimatePresence>
                {authStep !== "confirmPassword" && (
                  <motion.div
                    key="email-password-fields"
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={AUTH_STEP_TRANSITION}
                    className={AUTH_FORM_STACK_CLASS}
                  >
                    <BlurFade delay={authStep === "email" ? 0.72 : 0} className="w-full">
                      <div className="relative w-full">
                        <AnimatePresence>
                          {authStep === "password" && (
                            <motion.div
                              initial={{ y: -10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.4 }}
                              className="absolute -top-6 left-4 z-10"
                            >
                              <label className="text-xs font-semibold text-muted-foreground">
                                {t.auth.emailLabel}
                              </label>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="glass-input-wrap w-full">
                          <div className="glass-input">
                            <span className="glass-input-text-area" />
                            <div
                              className={cn(
                                "relative z-10 flex shrink-0 items-center justify-center overflow-hidden transition-all duration-300 ease-in-out",
                                email.length > 20 && authStep === "email"
                                  ? "w-0 px-0"
                                  : "w-10 pl-2",
                              )}
                            >
                              <Mail className="h-5 w-5 shrink-0 text-foreground/80" />
                            </div>
                            <input
                              type="email"
                              placeholder={t.auth.emailPlaceholder}
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              onKeyDown={handleKeyDown}
                              className={cn(
                                "relative z-10 h-10 w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none",
                                isEmailValid && authStep === "email" ? "pr-2" : "pr-0",
                              )}
                            />
                            <div
                              className={cn(
                                "relative z-10 shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
                                isEmailValid && authStep === "email" ? "w-10 pr-1" : "w-0",
                              )}
                            >
                              <GlassButton
                                type="button"
                                onClick={handleProgressStep}
                                size="icon"
                                aria-label={t.auth.continueWithEmail}
                                contentClassName="text-foreground/80 hover:text-foreground"
                              >
                                <ArrowRight className="h-5 w-5" />
                              </GlassButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    </BlurFade>

                  <AnimatePresence>
                    {authStep === "password" && (
                      <BlurFade key="password-field" className="w-full">
                        <div className="relative w-full">
                          <AnimatePresence>
                            {password.length > 0 && (
                              <motion.div
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="absolute -top-6 left-4 z-10"
                              >
                                <label className="text-xs font-semibold text-muted-foreground">
                                  {t.auth.passwordLabel}
                                </label>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="glass-input-wrap w-full">
                            <div className="glass-input">
                              <span className="glass-input-text-area" />
                              <div className="relative z-10 flex w-10 shrink-0 items-center justify-center pl-2">
                                {isPasswordValid ? (
                                  <button
                                    type="button"
                                    aria-label={t.auth.togglePassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground"
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-5 w-5" />
                                    ) : (
                                      <Eye className="h-5 w-5" />
                                    )}
                                  </button>
                                ) : (
                                  <Lock className="h-5 w-5 shrink-0 text-foreground/80" />
                                )}
                              </div>
                              <input
                                ref={passwordInputRef}
                                type={showPassword ? "text" : "password"}
                                placeholder={t.auth.passwordPlaceholder}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={handleKeyDown}
                                className="relative z-10 h-10 w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                              />
                              <div className="relative z-10 w-10 shrink-0 overflow-hidden pr-1">
                                <GlassButton
                                  type="button"
                                  onClick={handleProgressStep}
                                  size="icon"
                                  disabled={!isPasswordValid}
                                  aria-label={
                                    isSignup ? t.auth.submitPassword : t.auth.signIn
                                  }
                                  className={cn(
                                    "transition-opacity duration-200 ease-out",
                                    isPasswordValid
                                      ? "opacity-100"
                                      : "pointer-events-none opacity-0",
                                  )}
                                  contentClassName="text-foreground/80 hover:text-foreground"
                                >
                                  <ArrowRight className="h-5 w-5" />
                                </GlassButton>
                              </div>
                            </div>
                          </div>
                        </div>
                        <BlurFade delay={0.2}>
                          <button
                            type="button"
                            onClick={handleGoBack}
                            className="mt-4 flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            {t.auth.goBack}
                          </button>
                        </BlurFade>
                      </BlurFade>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
              </AnimatePresence>

              <AnimatePresence>
                {authStep === "confirmPassword" && (
                  <BlurFade key="confirm-password-field" className={AUTH_FORM_SINGLE_CLASS}>
                    <div className="relative w-full">
                      <AnimatePresence>
                        {confirmPassword.length > 0 && (
                          <motion.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="absolute -top-6 left-4 z-10"
                          >
                            <label className="text-xs font-semibold text-muted-foreground">
                              {t.auth.confirmPasswordLabel}
                            </label>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="glass-input-wrap w-full">
                        <div className="glass-input">
                          <span className="glass-input-text-area" />
                          <div className="relative z-10 flex w-10 shrink-0 items-center justify-center pl-2">
                            {isConfirmPasswordValid ? (
                              <button
                                type="button"
                                aria-label={t.auth.toggleConfirmPassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="rounded-full p-2 text-foreground/80 transition-colors hover:text-foreground"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            ) : (
                              <Lock className="h-5 w-5 shrink-0 text-foreground/80" />
                            )}
                          </div>
                          <input
                            ref={confirmPasswordInputRef}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder={t.auth.confirmPasswordPlaceholder}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="relative z-10 h-10 w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/60 focus:outline-none"
                          />
                          <div className="relative z-10 w-10 shrink-0 overflow-hidden pr-1">
                            <GlassButton
                              type="submit"
                              size="icon"
                              disabled={!isConfirmPasswordValid}
                              aria-label={t.auth.finishSignUp}
                              className={cn(
                                "transition-opacity duration-200 ease-out",
                                isConfirmPasswordValid
                                  ? "opacity-100"
                                  : "pointer-events-none opacity-0",
                              )}
                              contentClassName="text-foreground/80 hover:text-foreground"
                            >
                              <ArrowRight className="h-5 w-5" />
                            </GlassButton>
                          </div>
                        </div>
                      </div>
                    </div>
                    <BlurFade delay={0.2}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="mt-4 flex items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t.auth.goBack}
                      </button>
                    </BlurFade>
                  </BlurFade>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className={AUTH_FOOTER_SLOT_CLASS}>
            <motion.p
              initial={{ opacity: 0, y: 4, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.18, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={AUTH_FOOTER_TEXT_CLASS}
            >
              {isSignup ? t.auth.alreadyHaveAccount : t.auth.needAccount}{" "}
              <Link
                href={isSignup ? "/login" : "/signup"}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {isSignup ? t.auth.loginLink : t.auth.signupLink}
              </Link>
            </motion.p>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export function AuthFallbackLogo() {
  return (
    <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
      <Gem className="h-4 w-4" />
    </div>
  );
}
