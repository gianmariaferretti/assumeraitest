"use client";

import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { languages, type Language, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSelectorProps = {
  className?: string;
  onSelect?: () => void;
  variant?: "desktop" | "mobile";
};

export function LanguageSelector({
  className,
  onSelect,
  variant = "desktop",
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const isMobile = variant === "mobile";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const currentLanguage =
    languages.find((item) => item.code === language) ?? languages[0];

  useEffect(() => {
    if (isMobile || !isOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobile, isOpen]);

  const handleSelect = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setIsOpen(false);
    onSelect?.();
  };

  if (isMobile) {
    return (
      <div
        aria-label={t.language.ariaLabel}
        className={cn("grid gap-2", className)}
        role="group"
      >
        <p className="px-2 text-[0.68rem] font-bold uppercase leading-none tracking-[0.28em] text-slate-400">
          {t.language.label}
        </p>
        <div className="inline-flex w-fit max-w-full gap-1 rounded-2xl bg-slate-100/80 p-1">
          {languages.map((item) => {
            const isActive = item.code === language;

            return (
              <button
                aria-label={`${t.language.switchTo} ${item.label}`}
                aria-pressed={isActive}
                className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-[12px] font-bold transition-colors ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                key={item.code}
                onClick={() => handleSelect(item.code)}
                title={item.label}
                type="button"
              >
                <span aria-hidden="true">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={t.language.ariaLabel}
      className={cn("relative hidden lg:block", className)}
      ref={containerRef}
      role="group"
    >
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${t.language.ariaLabel}: ${currentLanguage.label}`}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/75 bg-white/80 px-3 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_12px_26px_rgba(15,23,42,0.08)] backdrop-blur transition-colors hover:bg-white hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        onClick={() => setIsOpen((current) => !current)}
        title={t.language.label}
        type="button"
      >
        <Globe2 className="size-4" aria-hidden="true" strokeWidth={2.1} />
        <span className="min-w-5 text-[12px] font-bold leading-none tracking-[0.08em]">
          {currentLanguage.shortLabel}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-3.5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] w-44 overflow-hidden rounded-2xl border border-white/75 bg-white p-1.5 shadow-[0_22px_60px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.82)]"
          id={menuId}
          role="menu"
        >
          {languages.map((item) => {
            const isActive = item.code === language;

            return (
              <button
                aria-checked={isActive}
                aria-label={`${t.language.switchTo} ${item.label}`}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                key={item.code}
                onClick={() => handleSelect(item.code)}
                role="menuitemradio"
                type="button"
              >
                <span>{item.label}</span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className={
                      isActive
                        ? "text-[11px] font-bold text-white/70"
                        : "text-[11px] font-bold text-slate-400"
                    }
                  >
                    {item.shortLabel}
                  </span>
                  {isActive && (
                    <Check
                      className="size-4"
                      aria-hidden="true"
                      strokeWidth={2.2}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
