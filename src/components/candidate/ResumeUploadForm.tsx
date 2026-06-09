"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type UIEvent
} from "react";

import {
  CandidateProgressRail,
  type CandidateProgressStepId
} from "@/components/candidate/CandidateProgressRail";
import { CandidateInterviewLanguageSelector } from "@/components/candidate/CandidateInterviewLanguageSelector";
import {
  buildPreResumeConsentGate,
  preResumeConsentFieldNames
} from "@/features/candidate-flow/pre-resume-consent-gate";
import { resumeParserModeFieldName } from "@/features/candidate-flow/resume-parser-mode";
import {
  buildResumeUploadTransition,
  type ResumeUploadClientPhase
} from "@/features/candidate-flow/resume-upload-processing-state";
import {
  resolveCandidateInterviewLanguageCode,
  type CandidateInterviewLanguageCode
} from "@/features/interview-flow";

import styles from "./ResumeUploadForm.module.css";

interface ResumeUploadFormProps {
  readonly allowedExtensions: readonly string[];
  readonly defaultDisableClaudeForTesting?: boolean;
  readonly initialInterviewLanguage?: CandidateInterviewLanguageCode;
  readonly initialProgressStep?: ResumeUploadInitialProgressStep;
  readonly rawCvRetentionDays: number;
}

export type ResumeUploadInitialProgressStep = Extract<
  CandidateProgressStepId,
  "privacy" | "resume"
>;

type ResumeUploadStageCopy = {
  readonly label: string;
  readonly title: string;
  readonly detail: string;
};

type ConsentStageCopy = {
  readonly actionLabel: string;
  readonly statusDetail: string;
  readonly missingRequirements: readonly string[];
};

type ResumeUploadCopy = {
  readonly phase: Record<ResumeUploadClientPhase, ResumeUploadStageCopy>;
  readonly uploadStepLabel: string;
  readonly preResumeStep: Record<"read" | "accept", ResumeUploadStageCopy>;
  readonly consentGate: Record<"read" | "accept" | "upload", ConsentStageCopy>;
  readonly transitionTitle: string;
  readonly transitionAction: string;
  readonly selectedResume: string;
  readonly dropResumeHere: string;
  readonly resumeSelected: string;
  readonly supportedFormats: string;
  readonly rawCvRetentionPrefix: string;
  readonly daysWord: string;
  readonly chooseFile: string;
  readonly noFileSelected: string;
  readonly pasteResumeText: string;
  readonly resumeText: string;
  readonly resumeTextPlaceholder: string;
  readonly processingResume: string;
  readonly noResumeError: string;
  readonly noResumeRecovery: string;
  readonly uploadFailureError: string;
  readonly uploadFailureRecovery: string;
  readonly referenceLabel: string;
  readonly privacyIntroTitle: readonly [string, string];
  readonly privacyIntroDetail: string;
  readonly cardEyebrow: string;
  readonly cardTitle: string;
  readonly cardDetail: string;
  readonly policyAriaLabel: string;
  readonly legalSections: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
  }[];
  readonly policyEndTitle: string;
  readonly policyEndDetail: string;
  readonly readingComplete: string;
  readonly readingRequired: string;
  readonly acceptPrivacy: string;
  readonly acceptTerms: string;
};

const resumeUploadCopy = {
  en: {
    phase: {
      idle: {
        label: "Step 1",
        title: "Upload your CV",
        detail:
          "Drop your resume here, or choose a file. Add text when you want the local parser to extract facts immediately."
      },
      uploading: {
        label: "Uploading",
        title: "Resume is being received.",
        detail: "The raw file is staying candidate-owned while the upload finishes."
      },
      parsing: {
        label: "Parsing",
        title: "Extracting profile evidence.",
        detail:
          "AssumerAI is reading role history, education, skills, languages, and missing data for your review."
      },
      handoff: {
        label: "Ready",
        title: "Opening the processing step.",
        detail:
          "You will review the parsed profile before scoring, interviewing, or matching can use it."
      },
      error: {
        label: "Needs retry",
        title: "Resume was not processed.",
        detail: "Try another supported file, or paste resume text and upload again."
      }
    },
    uploadStepLabel: "Step 2 of 2",
    preResumeStep: {
      read: {
        label: "Step 1 of 2",
        title: "Read privacy and terms.",
        detail:
          "Resume upload opens only after the required notice has been scrolled to the end."
      },
      accept: {
        label: "Step 1 of 2",
        title: "Confirm privacy and terms.",
        detail:
          "Both acknowledgements are required before AssumerAI can receive resume data."
      }
    },
    consentGate: {
      read: {
        actionLabel: "Read privacy and terms first",
        statusDetail:
          "Read the policy and terms panel to the end before upload unlocks.",
        missingRequirements: [
          "Scroll to the end of the Privacy Policy and Terms of Service.",
          "Accept the Privacy Policy.",
          "Accept the Terms of Service."
        ]
      },
      accept: {
        actionLabel: "Accept privacy and terms",
        statusDetail: "Accept both documents before upload unlocks.",
        missingRequirements: [
          "Accept the Privacy Policy.",
          "Accept the Terms of Service."
        ]
      },
      upload: {
        actionLabel: "Process resume",
        statusDetail:
          "Privacy Policy and Terms of Service accepted. Resume upload is unlocked.",
        missingRequirements: []
      }
    },
    transitionTitle: "Amazing, lets go to resume screen",
    transitionAction: "Continue",
    selectedResume: "Selected resume",
    dropResumeHere: "Drop resume here",
    resumeSelected: "Resume selected",
    supportedFormats: "PDF, HTML, JSON, text export, or pasted resume text",
    rawCvRetentionPrefix: "Raw CV retention",
    daysWord: "days",
    chooseFile: "Choose file",
    noFileSelected: "No file selected",
    pasteResumeText: "Paste resume text instead",
    resumeText: "Resume text",
    resumeTextPlaceholder: "Paste resume text here for immediate local parsing.",
    processingResume: "Processing resume",
    noResumeError: "Upload a resume file or paste resume text before continuing.",
    noResumeRecovery:
      "Use a PDF, HTML, JSON, text export, or paste the resume text directly.",
    uploadFailureError: "Resume upload could not be completed. Try again later.",
    uploadFailureRecovery:
      "Try again with a clearer PDF, text export, or pasted resume text.",
    referenceLabel: "Reference",
    privacyIntroTitle: ["Go through our privacy policy", "and terms"],
    privacyIntroDetail:
      "Resume upload opens only after the required notice has been scrolled to the end.",
    cardEyebrow: "Required before resume",
    cardTitle: "Privacy Policy and Terms of Service",
    cardDetail:
      "This is the only thing to handle first. Upload appears after the required read-through and both acknowledgements.",
    policyAriaLabel: "Privacy Policy and Terms of Service",
    legalSections: [
      {
        title: "Privacy Policy",
        paragraphs: [
          "AssumerAI collects resume content, pasted profile text, contact details, work history, education, skills, language evidence, preferences, audit metadata, and later interview answers only for candidate-controlled screening, profile confirmation, matching, retention, export, deletion, and legal obligations.",
          "Your raw CV stays candidate-owned and retention-limited. The default local retention period shown on this page applies to raw CV storage while the profile draft is prepared for your review.",
          "No employer can see your CV, parsed profile, scorecard, transcript, match explanation, or identity just because you upload a resume. Employer visibility requires a later company-role match acceptance with explicit consent.",
          "AssumerAI must not infer or score protected attributes, chronological age, biometrics, face, emotion, personality, accent, native status, family status, health, pregnancy, caregiving, religion, race, ethnicity, nationality, disability, sexual orientation, or similar traits.",
          "You keep the right to correct profile data before scoring, challenge score errors, request export, request deletion, and decline company sharing. Low confidence means review is needed, not that you are a weak candidate."
        ]
      },
      {
        title: "Terms of Service",
        paragraphs: [
          "This MVP provides evidence-backed recommendations for human review. It does not make final hiring, rejection, or employment decisions, and employers must complete meaningful human review before any next step.",
          "You agree to upload only your own resume or profile text, or data you are allowed to provide. Do not upload secrets, third-party confidential files, or protected information that is not needed for role-relevant screening.",
          "Resume parsing can be incomplete or wrong. You are responsible for reviewing and correcting the parsed profile before any scoring, interview planning, or matching step can use it.",
          "Interview and matching outputs are informational, confidence-scored, and auditable. They should support candidate control and reviewer judgment, not hidden automated rejection.",
          "By continuing, you acknowledge this pre-upload disclosure, the current retention notice, the candidate consent boundary, and the fact that future employer sharing remains separate and match-specific."
        ]
      }
    ],
    policyEndTitle: "End of required reading",
    policyEndDetail: "Scroll position recorded for this upload attempt.",
    readingComplete: "Reading complete",
    readingRequired: "Reading required",
    acceptPrivacy: "I have read and accept the Privacy Policy.",
    acceptTerms: "I have read and accept the Terms of Service."
  },
  it: {
    phase: {
      idle: {
        label: "Passaggio 1",
        title: "Carica il tuo CV",
        detail:
          "Trascina qui il curriculum o scegli un file. Aggiungi testo se vuoi che il parser locale estragga subito i dati."
      },
      uploading: {
        label: "Caricamento",
        title: "Il CV viene ricevuto.",
        detail: "Il file grezzo resta di proprieta del candidato mentre il caricamento termina."
      },
      parsing: {
        label: "Analisi",
        title: "Estrazione delle evidenze del profilo.",
        detail:
          "AssumerAI legge ruoli, istruzione, competenze, lingue e dati mancanti per la tua revisione."
      },
      handoff: {
        label: "Pronto",
        title: "Apertura del passaggio di elaborazione.",
        detail:
          "Rivedrai il profilo estratto prima che punteggi, colloquio o matching possano usarlo."
      },
      error: {
        label: "Serve riprovare",
        title: "Il CV non e stato elaborato.",
        detail: "Prova un altro file supportato oppure incolla il testo del CV."
      }
    },
    uploadStepLabel: "Passaggio 2 di 2",
    preResumeStep: {
      read: {
        label: "Passaggio 1 di 2",
        title: "Leggi privacy e termini.",
        detail:
          "Il caricamento del CV si apre solo dopo aver letto fino in fondo l'avviso richiesto."
      },
      accept: {
        label: "Passaggio 1 di 2",
        title: "Conferma privacy e termini.",
        detail:
          "Entrambe le conferme sono richieste prima che AssumerAI possa ricevere il CV."
      }
    },
    consentGate: {
      read: {
        actionLabel: "Leggi prima privacy e termini",
        statusDetail:
          "Leggi il pannello privacy e termini fino alla fine prima di sbloccare il caricamento.",
        missingRequirements: [
          "Scorri fino alla fine della Privacy Policy e dei Termini di servizio.",
          "Accetta la Privacy Policy.",
          "Accetta i Termini di servizio."
        ]
      },
      accept: {
        actionLabel: "Accetta privacy e termini",
        statusDetail: "Accetta entrambi i documenti prima di sbloccare il caricamento.",
        missingRequirements: [
          "Accetta la Privacy Policy.",
          "Accetta i Termini di servizio."
        ]
      },
      upload: {
        actionLabel: "Elabora CV",
        statusDetail:
          "Privacy Policy e Termini di servizio accettati. Il caricamento del CV e sbloccato.",
        missingRequirements: []
      }
    },
    transitionTitle: "Perfetto, passiamo alla schermata del CV",
    transitionAction: "Continua",
    selectedResume: "CV selezionato",
    dropResumeHere: "Trascina qui il CV",
    resumeSelected: "CV selezionato",
    supportedFormats: "PDF, HTML, JSON, esportazione testo o testo CV incollato",
    rawCvRetentionPrefix: "Conservazione CV grezzo",
    daysWord: "giorni",
    chooseFile: "Scegli file",
    noFileSelected: "Nessun file selezionato",
    pasteResumeText: "Incolla invece il testo del CV",
    resumeText: "Testo del CV",
    resumeTextPlaceholder: "Incolla qui il testo del CV per l'analisi locale immediata.",
    processingResume: "Elaborazione CV",
    noResumeError: "Carica un file CV o incolla il testo del CV prima di continuare.",
    noResumeRecovery:
      "Usa un PDF, HTML, JSON, esportazione testo, oppure incolla direttamente il testo del CV.",
    uploadFailureError: "Non e stato possibile completare il caricamento del CV. Riprova piu tardi.",
    uploadFailureRecovery:
      "Riprova con un PDF piu chiaro, un'esportazione testo o il testo del CV incollato.",
    referenceLabel: "Riferimento",
    privacyIntroTitle: ["Leggi informativa privacy e termini", "prima di continuare"],
    privacyIntroDetail:
      "Il caricamento del CV si apre solo dopo aver letto fino in fondo l'avviso richiesto.",
    cardEyebrow: "Richiesto prima del CV",
    cardTitle: "Privacy Policy e Termini di servizio",
    cardDetail:
      "Questa e la prima cosa da gestire. Il caricamento appare dopo la lettura completa e le due conferme.",
    policyAriaLabel: "Privacy Policy e Termini di servizio",
    legalSections: [
      {
        title: "Privacy Policy",
        paragraphs: [
          "AssumerAI raccoglie contenuto del CV, testo profilo incollato, contatti, storico lavorativo, istruzione, competenze, evidenze linguistiche, preferenze, metadati di audit e poi risposte al colloquio solo per screening controllato dal candidato, conferma profilo, matching, conservazione, esportazione, eliminazione e obblighi legali.",
          "Il CV grezzo resta di proprieta del candidato e con conservazione limitata. Il periodo indicato in questa pagina vale mentre la bozza profilo viene preparata per la tua revisione.",
          "Nessun datore di lavoro puo vedere CV, profilo estratto, scorecard, trascrizione, spiegazione match o identita solo perche carichi un CV. La visibilita richiede un consenso esplicito successivo su uno specifico match azienda-ruolo.",
          "AssumerAI non deve inferire o valutare attributi protetti, eta cronologica, biometria, volto, emozione, personalita, accento, status madrelingua, famiglia, salute, gravidanza, caregiving, religione, razza, etnia, nazionalita, disabilita, orientamento sessuale o tratti simili.",
          "Puoi correggere i dati del profilo prima del punteggio, contestare errori, richiedere esportazione, richiedere eliminazione e rifiutare condivisioni aziendali. Bassa confidenza significa revisione necessaria, non candidato debole."
        ]
      },
      {
        title: "Termini di servizio",
        paragraphs: [
          "Questo MVP fornisce raccomandazioni basate su evidenze per revisione umana. Non prende decisioni finali di assunzione, rifiuto o impiego, e i datori di lavoro devono completare una revisione umana significativa prima di ogni passo successivo.",
          "Accetti di caricare solo il tuo CV o testo profilo, o dati che sei autorizzato a fornire. Non caricare segreti, file confidenziali di terzi o informazioni protette non necessarie allo screening rilevante per il ruolo.",
          "L'analisi del CV puo essere incompleta o errata. Sei responsabile di rivedere e correggere il profilo estratto prima che punteggio, pianificazione colloquio o matching possano usarlo.",
          "Output di colloquio e matching sono informativi, con confidenza e audit. Devono supportare controllo del candidato e giudizio del revisore, non rifiuti automatizzati nascosti.",
          "Continuando, riconosci questa informativa pre-caricamento, l'avviso di conservazione corrente, il confine di consenso del candidato e il fatto che la condivisione futura con aziende resta separata e specifica per match."
        ]
      }
    ],
    policyEndTitle: "Fine della lettura richiesta",
    policyEndDetail: "Posizione di scorrimento registrata per questo caricamento.",
    readingComplete: "Lettura completata",
    readingRequired: "Lettura richiesta",
    acceptPrivacy: "Ho letto e accetto la Privacy Policy.",
    acceptTerms: "Ho letto e accetto i Termini di servizio."
  },
  fr: {
    phase: {
      idle: {
        label: "Etape 1",
        title: "Importez votre CV",
        detail:
          "Deposez votre CV ici ou choisissez un fichier. Ajoutez du texte si vous voulez que le parseur local extrait les faits immediatement."
      },
      uploading: {
        label: "Import",
        title: "Le CV est en cours de reception.",
        detail: "Le fichier brut reste controle par le candidat pendant la fin de l'import."
      },
      parsing: {
        label: "Analyse",
        title: "Extraction des preuves du profil.",
        detail:
          "AssumerAI lit les roles, la formation, les competences, les langues et les donnees manquantes pour votre revue."
      },
      handoff: {
        label: "Pret",
        title: "Ouverture de l'etape de traitement.",
        detail:
          "Vous reverrez le profil extrait avant que score, entretien ou matching puissent l'utiliser."
      },
      error: {
        label: "A retenter",
        title: "Le CV n'a pas ete traite.",
        detail: "Essayez un autre fichier supporte ou collez le texte du CV."
      }
    },
    uploadStepLabel: "Etape 2 sur 2",
    preResumeStep: {
      read: {
        label: "Etape 1 sur 2",
        title: "Lisez confidentialite et conditions.",
        detail:
          "L'import du CV s'ouvre seulement apres lecture jusqu'a la fin de l'avis requis."
      },
      accept: {
        label: "Etape 1 sur 2",
        title: "Confirmez confidentialite et conditions.",
        detail:
          "Les deux confirmations sont requises avant qu'AssumerAI puisse recevoir le CV."
      }
    },
    consentGate: {
      read: {
        actionLabel: "Lisez d'abord confidentialite et conditions",
        statusDetail:
          "Lisez la politique et les conditions jusqu'a la fin avant de debloquer l'import.",
        missingRequirements: [
          "Faites defiler jusqu'a la fin de la politique de confidentialite et des conditions.",
          "Acceptez la politique de confidentialite.",
          "Acceptez les conditions de service."
        ]
      },
      accept: {
        actionLabel: "Accepter confidentialite et conditions",
        statusDetail: "Acceptez les deux documents avant de debloquer l'import.",
        missingRequirements: [
          "Acceptez la politique de confidentialite.",
          "Acceptez les conditions de service."
        ]
      },
      upload: {
        actionLabel: "Traiter le CV",
        statusDetail:
          "Politique de confidentialite et conditions acceptees. L'import du CV est debloque.",
        missingRequirements: []
      }
    },
    transitionTitle: "Parfait, passons a l'ecran CV",
    transitionAction: "Continuer",
    selectedResume: "CV selectionne",
    dropResumeHere: "Deposez le CV ici",
    resumeSelected: "CV selectionne",
    supportedFormats: "PDF, HTML, JSON, export texte ou texte CV colle",
    rawCvRetentionPrefix: "Conservation du CV brut",
    daysWord: "jours",
    chooseFile: "Choisir un fichier",
    noFileSelected: "Aucun fichier selectionne",
    pasteResumeText: "Coller plutot le texte du CV",
    resumeText: "Texte du CV",
    resumeTextPlaceholder: "Collez ici le texte du CV pour une analyse locale immediate.",
    processingResume: "Traitement du CV",
    noResumeError: "Importez un fichier CV ou collez le texte du CV avant de continuer.",
    noResumeRecovery:
      "Utilisez un PDF, HTML, JSON, export texte, ou collez directement le texte du CV.",
    uploadFailureError: "L'import du CV n'a pas pu etre termine. Reessayez plus tard.",
    uploadFailureRecovery:
      "Reessayez avec un PDF plus clair, un export texte ou le texte du CV colle.",
    referenceLabel: "Reference",
    privacyIntroTitle: [
      "Lisez la politique de confidentialite et les conditions",
      "avant de continuer"
    ],
    privacyIntroDetail:
      "L'import du CV s'ouvre seulement apres lecture jusqu'a la fin de l'avis requis.",
    cardEyebrow: "Requis avant le CV",
    cardTitle: "Politique de confidentialite et conditions de service",
    cardDetail:
      "C'est la premiere chose a faire. L'import apparait apres lecture complete et les deux confirmations.",
    policyAriaLabel: "Politique de confidentialite et conditions de service",
    legalSections: [
      {
        title: "Politique de confidentialite",
        paragraphs: [
          "AssumerAI collecte le contenu du CV, le texte de profil colle, les coordonnees, l'historique de travail, la formation, les competences, les preuves linguistiques, les preferences, les metadonnees d'audit et plus tard les reponses d'entretien uniquement pour le screening controle par le candidat, la confirmation du profil, le matching, la conservation, l'export, la suppression et les obligations legales.",
          "Votre CV brut reste controle par le candidat et avec conservation limitee. La periode indiquee sur cette page s'applique pendant que la brouillon de profil est prepare pour votre revue.",
          "Aucun employeur ne peut voir votre CV, profil extrait, scorecard, transcription, explication de match ou identite simplement parce que vous importez un CV. La visibilite employeur exige un consentement explicite ulterieur pour un match entreprise-role precis.",
          "AssumerAI ne doit pas inferer ou scorer des attributs proteges, l'age chronologique, la biometrie, le visage, l'emotion, la personnalite, l'accent, le statut natif, la famille, la sante, la grossesse, l'aide familiale, la religion, la race, l'ethnie, la nationalite, le handicap, l'orientation sexuelle ou des traits similaires.",
          "Vous gardez le droit de corriger les donnees du profil avant scoring, contester les erreurs, demander l'export, demander la suppression et refuser le partage entreprise. Une faible confiance signifie qu'une revue est necessaire, pas que vous etes un candidat faible."
        ]
      },
      {
        title: "Conditions de service",
        paragraphs: [
          "Ce MVP fournit des recommandations appuyees par des preuves pour revue humaine. Il ne prend pas de decisions finales d'embauche, de rejet ou d'emploi, et les employeurs doivent faire une revue humaine significative avant toute etape suivante.",
          "Vous acceptez d'importer seulement votre propre CV ou texte de profil, ou des donnees que vous etes autorise a fournir. N'importez pas de secrets, fichiers confidentiels tiers ou informations protegees inutiles au screening lie au role.",
          "Le parsing du CV peut etre incomplet ou incorrect. Vous etes responsable de revoir et corriger le profil extrait avant que scoring, planification d'entretien ou matching puissent l'utiliser.",
          "Les sorties d'entretien et de matching sont informatives, avec confiance et audit. Elles doivent soutenir le controle candidat et le jugement humain, pas un rejet automatise cache.",
          "En continuant, vous reconnaissez cette information pre-import, l'avis de conservation actuel, la limite de consentement candidat et le fait que le partage futur employeur reste separe et specifique au match."
        ]
      }
    ],
    policyEndTitle: "Fin de la lecture requise",
    policyEndDetail: "Position de defilement enregistree pour cette tentative.",
    readingComplete: "Lecture terminee",
    readingRequired: "Lecture requise",
    acceptPrivacy: "J'ai lu et j'accepte la politique de confidentialite.",
    acceptTerms: "J'ai lu et j'accepte les conditions de service."
  }
} satisfies Record<CandidateInterviewLanguageCode, ResumeUploadCopy>;

export function ResumeUploadForm({
  allowedExtensions,
  defaultDisableClaudeForTesting = false,
  initialInterviewLanguage,
  initialProgressStep = "privacy",
  rawCvRetentionDays
}: ResumeUploadFormProps) {
  const router = useRouter();
  const startsAtResume = initialProgressStep === "resume";
  const needsInterviewLanguageSelection =
    !startsAtResume && !initialInterviewLanguage;
  const [phase, setPhase] = useState<ResumeUploadClientPhase>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recoveryAction, setRecoveryAction] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [policyScrolledToEnd, setPolicyScrolledToEnd] = useState(startsAtResume);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(startsAtResume);
  const [termsOfServiceAccepted, setTermsOfServiceAccepted] = useState(startsAtResume);
  const [resumeScreenStarted, setResumeScreenStarted] = useState(startsAtResume);
  const [resumeTransitionExiting, setResumeTransitionExiting] = useState(false);
  const resumeTransitionTimer = useRef<number | null>(null);
  const navigationTimer = useRef<number | null>(null);
  const parserTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (parserTimer.current !== null) {
        window.clearTimeout(parserTimer.current);
      }
      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current);
      }
      if (resumeTransitionTimer.current !== null) {
        window.clearTimeout(resumeTransitionTimer.current);
      }
    },
    []
  );

  const activeInterviewLanguage =
    resolveCandidateInterviewLanguageCode(initialInterviewLanguage);
  const localizedCopy = resumeUploadCopy[activeInterviewLanguage];
  const copy = localizedCopy.phase[phase];
  const isBusy = phase === "uploading" || phase === "parsing" || phase === "handoff";
  const consentGate = buildPreResumeConsentGate({
    policyScrolledToEnd,
    privacyPolicyAccepted,
    termsOfServiceAccepted
  });
  const localizedConsentGate = {
    ...consentGate,
    ...localizedCopy.consentGate[consentGate.stage]
  };
  const formCopy =
    consentGate.stage === "upload"
      ? {
          ...copy,
          label: phase === "idle" ? localizedCopy.uploadStepLabel : copy.label
        }
      : localizedCopy.preResumeStep[consentGate.stage];
  const resumeInputsEnabled = !isBusy && consentGate.canProvideResume;
  const canSubmit = resumeInputsEnabled;
  const currentProgressStep =
    consentGate.stage === "upload" && resumeScreenStarted ? "resume" : "privacy";
  const showIntro = needsInterviewLanguageSelection;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) {
      return;
    }

    if (!localizedConsentGate.canProvideResume) {
      setPhase("error");
      setUploadError(localizedConsentGate.statusDetail);
      setRecoveryAction(localizedConsentGate.missingRequirements.join(" "));
      setCorrelationId(null);
      return;
    }

    clearTimers();
    setUploadError(null);
    setRecoveryAction(null);
    setCorrelationId(null);
    setPhase("uploading");
    parserTimer.current = window.setTimeout(() => setPhase("parsing"), 420);

    const form = event.currentTarget;
    if (!selectedFile && resumeText.trim().length === 0) {
      clearParserTimer();
      setPhase("error");
      setUploadError(localizedCopy.noResumeError);
      setRecoveryAction(localizedCopy.noResumeRecovery);
      return;
    }

    const formData = new FormData(form);
    if (selectedFile) {
      formData.set("resume", selectedFile);
    }

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await readResponsePayload(response);
      const transition = buildResumeUploadTransition({
        ok: response.ok,
        status: response.status,
        payload
      });

      if (transition.phase === "handoff") {
        clearParserTimer();
        setPhase("handoff");
        navigationTimer.current = window.setTimeout(() => {
          router.push(transition.processingHref);
        }, 360);
        return;
      }

      clearParserTimer();
      setPhase("error");
      setUploadError(transition.message);
      setRecoveryAction(transition.recoveryAction);
      setCorrelationId(transition.correlationId ?? null);
    } catch {
      clearParserTimer();
      setPhase("error");
      setUploadError(localizedCopy.uploadFailureError);
      setRecoveryAction(localizedCopy.uploadFailureRecovery);
      setCorrelationId(null);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (!resumeInputsEnabled) {
      return;
    }

    const file = event.dataTransfer.files.item(0);
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      setRecoveryAction(null);
      setCorrelationId(null);
      setPhase("idle");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0) ?? null;
    setSelectedFile(file);
    if (file) {
      setUploadError(null);
      setRecoveryAction(null);
      setCorrelationId(null);
      setPhase("idle");
    }
  }

  function handleResumeTransitionContinue() {
    if (resumeTransitionExiting) {
      return;
    }

    if (resumeTransitionTimer.current !== null) {
      window.clearTimeout(resumeTransitionTimer.current);
    }

    setResumeTransitionExiting(true);
    resumeTransitionTimer.current = window.setTimeout(() => {
      setResumeScreenStarted(true);
      setResumeTransitionExiting(false);
      resumeTransitionTimer.current = null;
      if (!startsAtResume) {
        router.replace("/candidate/resume");
      }
    }, 520);
  }

  function clearTimers() {
    clearParserTimer();
    if (navigationTimer.current !== null) {
      window.clearTimeout(navigationTimer.current);
      navigationTimer.current = null;
    }
  }

  function clearParserTimer() {
    if (parserTimer.current !== null) {
      window.clearTimeout(parserTimer.current);
      parserTimer.current = null;
    }
  }

  function handlePolicyScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const reachedEnd =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 8;

    if (reachedEnd) {
      setPolicyScrolledToEnd(true);
    }
  }

  return (
    <div className="candidate-flow-shell">
      {!showIntro ? (
        <div className="candidate-flow-top">
          <CandidateProgressRail
            current={currentProgressStep}
            language={activeInterviewLanguage}
          />
        </div>
      ) : null}

      {showIntro ? (
        <section
          className="candidate-splash candidate-splash-language-gate"
          aria-labelledby="begin-language-title"
        >
          <div className="candidate-splash-content">
            <CandidateInterviewLanguageSelector
              initialLanguage={initialInterviewLanguage}
            />
          </div>
        </section>
      ) : (
        <form
          action="/candidate/resume/upload"
          className={`resume-supply resume-supply-${phase}`}
          encType="multipart/form-data"
          method="post"
          onSubmit={handleSubmit}
        >
          <input
            name={preResumeConsentFieldNames.policyScrolledToEnd}
            type="hidden"
            value={policyScrolledToEnd ? "true" : "false"}
          />

          {consentGate.stage === "upload" ? (
            <>
              <input
                name={preResumeConsentFieldNames.privacyPolicyAccepted}
                type="hidden"
                value="accepted"
              />
              <input
                name={preResumeConsentFieldNames.termsOfServiceAccepted}
                type="hidden"
                value="accepted"
              />
              {defaultDisableClaudeForTesting ? (
                <input
                  name={resumeParserModeFieldName}
                  type="hidden"
                  value="local"
                />
              ) : null}

              {!resumeScreenStarted ? (
                <section
                  aria-busy={resumeTransitionExiting}
                  aria-live="polite"
                  className={[
                    "resume-transition-stage",
                    styles.transitionStage,
                    resumeTransitionExiting ? styles.transitionStageExit : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <h2 className={styles.transitionCopy}>
                    {localizedCopy.transitionTitle}
                  </h2>
                  <button
                    className={styles.transitionAction}
                    disabled={resumeTransitionExiting}
                    onClick={handleResumeTransitionContinue}
                    type="button"
                  >
                    {localizedCopy.transitionAction}
                  </button>
                </section>
              ) : (
                <section className="resume-upload-stage" aria-labelledby="resume-upload-title">
                  <div className="resume-upload-heading">
                    <h2 id="resume-upload-title">{formCopy.title}</h2>
                    <p>{formCopy.detail}</p>
                  </div>

                  <div className="resume-upload-card">
                    <label
                      aria-disabled={!resumeInputsEnabled}
                      className={[
                        "file-zone",
                        isDragging ? "file-zone-dragging" : "",
                        resumeInputsEnabled ? "" : "file-zone-disabled"
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      htmlFor="resume"
                      onDragLeave={() => setIsDragging(false)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (resumeInputsEnabled) {
                          setIsDragging(true);
                        }
                      }}
                      onDrop={handleDrop}
                    >
                      <span>
                        {selectedFile
                          ? localizedCopy.selectedResume
                          : localizedCopy.dropResumeHere}
                      </span>
                      <strong>
                        {selectedFile
                          ? localizedCopy.resumeSelected
                          : localizedCopy.supportedFormats}
                      </strong>
                      <small>
                        {localizedCopy.rawCvRetentionPrefix}: {rawCvRetentionDays}{" "}
                        {localizedCopy.daysWord}
                      </small>
                      <span className="resume-file-picker">
                        <span>{localizedCopy.chooseFile}</span>
                        <small>{selectedFile?.name ?? localizedCopy.noFileSelected}</small>
                      </span>
                      <input
                        accept={allowedExtensions.join(",")}
                        className="resume-file-input"
                        disabled={!resumeInputsEnabled}
                        id="resume"
                        name="resume"
                        onChange={handleFileChange}
                        type="file"
                      />
                    </label>

                    <details className="resume-text-details">
                      <summary>{localizedCopy.pasteResumeText}</summary>
                      <label
                        aria-disabled={!resumeInputsEnabled}
                        className={
                          resumeInputsEnabled ? "text-zone" : "text-zone text-zone-disabled"
                        }
                        htmlFor="resume_text"
                      >
                        <span>{localizedCopy.resumeText}</span>
                        <textarea
                          disabled={!resumeInputsEnabled}
                          id="resume_text"
                          name="resume_text"
                          onChange={(event) => setResumeText(event.target.value)}
                          placeholder={localizedCopy.resumeTextPlaceholder}
                          rows={8}
                          value={resumeText}
                        />
                      </label>
                    </details>

                  </div>

                  <div className="upload-status" aria-live="polite">
                    <div className="upload-status-steps" aria-hidden="true">
                      <span
                        className={
                          phase === "uploading"
                            ? "status-dot status-dot-active"
                            : "status-dot"
                        }
                      />
                      <span
                        className={
                          phase === "parsing"
                            ? "status-dot status-dot-active"
                            : "status-dot"
                        }
                      />
                      <span
                        className={
                          phase === "handoff" ? "status-dot status-dot-active" : "status-dot"
                        }
                      />
                    </div>
                    <p>{uploadError ?? copy.detail}</p>
                    {recoveryAction ? <small>{recoveryAction}</small> : null}
                    {correlationId ? (
                      <small>
                        {localizedCopy.referenceLabel}: {correlationId}
                      </small>
                    ) : null}
                  </div>

                  <button disabled={!canSubmit} type="submit">
                    {isBusy ? localizedCopy.processingResume : localizedConsentGate.actionLabel}
                  </button>
                </section>
              )}
            </>
          ) : (
            <section
              className={`pre-resume-gate pre-resume-gate-${consentGate.stage}`}
              aria-labelledby="pre-resume-gate-title"
            >
              <div className="pre-resume-intro">
                <h2 id="pre-resume-gate-title">
                  {localizedCopy.privacyIntroTitle[0]}
                  <br />
                  {localizedCopy.privacyIntroTitle[1]}
                </h2>
                <p>{localizedCopy.privacyIntroDetail}</p>
              </div>

              <div className="pre-resume-card">
                <div className="pre-resume-gate-heading">
                  <p>{localizedCopy.cardEyebrow}</p>
                  <h3>{localizedCopy.cardTitle}</h3>
                  <span>{localizedCopy.cardDetail}</span>
                </div>

                <div
                  aria-label={localizedCopy.policyAriaLabel}
                  className="policy-scroll"
                  onScroll={handlePolicyScroll}
                  tabIndex={0}
                >
                  {localizedCopy.legalSections.map((section) => (
                    <article className="policy-document" key={section.title}>
                      <h4>{section.title}</h4>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </article>
                  ))}
                  <div className="policy-end-marker">
                    <strong>{localizedCopy.policyEndTitle}</strong>
                    <span>{localizedCopy.policyEndDetail}</span>
                  </div>
                </div>

                <div className="consent-progress" aria-live="polite">
                  <strong>
                    {policyScrolledToEnd
                      ? localizedCopy.readingComplete
                      : localizedCopy.readingRequired}
                  </strong>
                  <span>{localizedConsentGate.statusDetail}</span>
                </div>

                <div className="consent-checks">
                  <label className="consent-check">
                    <input
                      checked={privacyPolicyAccepted}
                      disabled={!policyScrolledToEnd || isBusy}
                      name={preResumeConsentFieldNames.privacyPolicyAccepted}
                      onChange={(event) =>
                        setPrivacyPolicyAccepted(event.currentTarget.checked)
                      }
                      type="checkbox"
                      value="accepted"
                    />
                    <span>{localizedCopy.acceptPrivacy}</span>
                  </label>
                  <label className="consent-check">
                    <input
                      checked={termsOfServiceAccepted}
                      disabled={!policyScrolledToEnd || isBusy}
                      name={preResumeConsentFieldNames.termsOfServiceAccepted}
                      onChange={(event) =>
                        setTermsOfServiceAccepted(event.currentTarget.checked)
                      }
                      type="checkbox"
                      value="accepted"
                    />
                    <span>{localizedCopy.acceptTerms}</span>
                  </label>
                </div>
              </div>
            </section>
          )}
        </form>
      )}
    </div>
  );
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return undefined;
  }

  return response.json();
}
