"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from "react";

import { APP_LANGUAGE_STORAGE_KEY, useI18n } from "@/lib/i18n";
import {
  CANDIDATE_INTERVIEW_LANGUAGE_FIELD,
  CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS,
  CANDIDATE_INTERVIEW_LANGUAGE_STORAGE_KEY,
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";

const SUPPORTED_LANGUAGE_LABELS = "English, Italiano, Français";
const languageSelectionCopy = {
  en: {
    selectedSuffix: "selected"
  },
  it: {
    selectedSuffix: "selezionato"
  },
  fr: {
    selectedSuffix: "selectionne"
  }
} satisfies Record<CandidateInterviewLanguageCode, { readonly selectedSuffix: string }>;

const CONFETTI_PARTICLES = [
  [-112, -86, -18],
  [-82, -118, 24],
  [-48, -92, -38],
  [-18, -130, 12],
  [22, -112, -28],
  [58, -86, 34],
  [96, -116, -14],
  [124, -76, 28],
  [-132, -28, 40],
  [-92, -48, -32],
  [-38, -58, 22],
  [38, -60, -20],
  [82, -44, 32],
  [132, -28, -36],
  [-72, -8, 18],
  [-22, -24, -12],
  [28, -18, 16],
  [76, -6, -24]
] as const;

interface CandidateInterviewLanguageSelectorProps {
  readonly initialLanguage?: CandidateInterviewLanguageCode;
}

export function CandidateInterviewLanguageSelector({
  initialLanguage
}: CandidateInterviewLanguageSelectorProps = {}) {
  const { setLanguage } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const languageInputRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<number | null>(null);
  const submitAfterAnimationRef = useRef(false);
  const [selectedLanguage, setSelectedLanguage] =
    useState<CandidateInterviewLanguageCode>(
      resolveCandidateInterviewLanguageCode(initialLanguage)
    );
  const [isLaunching, setIsLaunching] = useState(false);
  const selectedConfig =
    CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS.find(
      (language) => language.code === selectedLanguage
    ) ?? CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS[0];
  const selectedLanguageCopy = languageSelectionCopy[selectedLanguage];
  const languageStyle = {
    "--language-color-a": selectedConfig.countryPalette[0],
    "--language-color-b": selectedConfig.countryPalette[1],
    "--language-color-c": selectedConfig.countryPalette[2]
  } as CSSProperties & Record<string, string>;

  useEffect(() => {
    if (initialLanguage) {
      setSelectedLanguage(resolveCandidateInterviewLanguageCode(initialLanguage));
      return;
    }

    const saved = window.localStorage.getItem(
      CANDIDATE_INTERVIEW_LANGUAGE_STORAGE_KEY
    );
    setSelectedLanguage(resolveCandidateInterviewLanguageCode(saved));
  }, [initialLanguage]);

  useEffect(
    () => () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    },
    []
  );

  function rememberLanguage(language: CandidateInterviewLanguageCode) {
    window.localStorage.setItem(CANDIDATE_INTERVIEW_LANGUAGE_STORAGE_KEY, language);
    window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    if (languageInputRef.current) {
      languageInputRef.current.value = language;
    }
    setLanguage(language);
  }

  function chooseLanguage(
    language: CandidateInterviewLanguageCode
  ) {
    if (isLaunching) {
      return;
    }

    const nextLanguage = resolveCandidateInterviewLanguageCode(language);
    setSelectedLanguage(nextLanguage);
    rememberLanguage(nextLanguage);
  }

  function handleConfirmLanguage(event: FormEvent<HTMLFormElement>) {
    if (submitAfterAnimationRef.current) {
      return;
    }

    event.preventDefault();

    if (isLaunching) {
      return;
    }

    rememberLanguage(selectedLanguage);
    setIsLaunching(true);

    submitTimerRef.current = window.setTimeout(() => {
      submitAfterAnimationRef.current = true;
      formRef.current?.requestSubmit();
    }, 820);
  }

  return (
    <form
      ref={formRef}
      action="/candidate/interview-language"
      aria-label={`Choose interview language: ${SUPPORTED_LANGUAGE_LABELS}`}
      aria-labelledby="begin-language-title"
      className={[
        "begin-language-panel",
        isLaunching ? "begin-language-panel-launching" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-selected-language={selectedLanguage}
      method="post"
      onSubmit={handleConfirmLanguage}
      style={languageStyle}
    >
      <h1 id="begin-language-title">Your language?</h1>

      <div
        className="begin-language-options"
        role="radiogroup"
        data-language-labels="English Italiano Français"
        aria-labelledby="begin-language-title"
      >
        {CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS.map((language) => (
          <button
            aria-checked={selectedLanguage === language.code}
            className="begin-language-option"
            data-selected={selectedLanguage === language.code}
            disabled={isLaunching}
            key={language.code}
            onClick={() => chooseLanguage(language.code)}
            role="radio"
            type="button"
          >
            <span>{language.nativeLabel}</span>
          </button>
        ))}
      </div>

      <input
        name={CANDIDATE_INTERVIEW_LANGUAGE_FIELD}
        readOnly
        ref={languageInputRef}
        type="hidden"
        value={selectedLanguage}
      />

      <div className="language-confetti" aria-hidden="true">
        {CONFETTI_PARTICLES.map(([x, y, rotation], index) => (
          <span
            key={`${x}-${y}-${rotation}`}
            style={
              {
                "--confetti-delay": `${index * 16}ms`,
                "--confetti-rotation": `${rotation}deg`,
                "--confetti-x": `${x}px`,
                "--confetti-y": `${y}px`
              } as CSSProperties & Record<string, string>
            }
          />
        ))}
      </div>

      <p aria-live="polite" className="begin-language-status">
        {isLaunching
          ? `${selectedConfig.nativeLabel} ${selectedLanguageCopy.selectedSuffix}`
          : " "}
      </p>

      <button
        className="begin-language-confirm"
        disabled={isLaunching}
        type="submit"
      >
        {isLaunching
          ? `${selectedConfig.nativeLabel} ${selectedLanguageCopy.selectedSuffix}`
          : selectedConfig.confirmLabel}
      </button>
    </form>
  );
}
