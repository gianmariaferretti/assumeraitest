"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "it", label: "Italiano", shortLabel: "IT" },
  { code: "fr", label: "Français", shortLabel: "FR" },
] as const;

export type Language = (typeof languages)[number]["code"];

const defaultLanguage: Language = "en";
export const APP_LANGUAGE_STORAGE_KEY = "assumerai-language";

const candidateExperienceEn = {
  heroTitle: "Here's exactly what happens when you join",
  heroAccent: "AssumerAI.",
  revealHighlight: "not to do",
  revealText:
    "No marketing fluff. Every step explained including what we do with your data, and what we promise not to do with it.",
  horizontalCards: {
    dontDoLabel: "What we don't do",
    cards: [
      {
        body:
          "Drop in your CV. Our AI extracts your profile in seconds, role, experience, key wins. You confirm what's right. You correct what isn't.",
        eyebrow: "Sign up",
        title: "The CV becomes a living profile.",
        visualAlt: "Postal document preview",
        visualSrc: "/cards_for_candidates/postal.png",
      },
      {
        body:
          "Pick a slot that fits your week. Evenings, weekends, lunch breaks, whatever works. Reschedule once, no questions.",
        dontDo:
          "We don't lock you into a 9-to-5 window or charge for changing your mind.",
        eyebrow: "Schedule your interview",
        title: "Schedule your interview.",
        visualAlt: "Calendar scheduling preview",
        visualSrc: "/cards_for_candidates/calendar.png",
      },
      {
        body:
          "A quiet room, headphones, water nearby. We send a one-page guide so you know what to expect. No homework, no slides to memorise.",
        dontDo: "We don't grade your background, your accent, or your webcam.",
        eyebrow: "Prepare",
        title: "Prepare.",
        visualAlt: "Interview studio preparation preview",
        visualSrc: "/cards_for_candidates/studio.png",
      },
      {
        body:
          "An adaptive voice conversation calibrated to your CV. Real questions about real situations you've actually lived. The AI follows up like a good interviewer would.",
        dontDo: "No trick questions. No brain teasers. No 'sell me this pen'.",
        eyebrow: "The interview",
        meta: "20 min",
        title: "The interview",
        visualAlt: "Adaptive interview preview",
        visualSrc: "/cards_for_candidates/interview.png",
      },
      {
        body:
          "You see exactly what companies will see strengths, growth areas, the signal behind each score. Nothing hidden behind a paywall or a CTA.",
        dontDo:
          "We don't show a different scorecard to employers than we show you.",
        eyebrow: "Your scorecard",
        meta: "instant",
        title: "Your scorecard",
        visualAlt: "Candidate scorecard preview",
        visualSrc: "/cards_for_candidates/scorecard.png",
      },
      {
        body:
          "Only companies that fit your profile see you, and only if you opt in. They decide within 14 days. You get a yes, a no, or a reason never silence.",
        dontDo: "We don't keep you in a 'we'll let you know' loop",
        eyebrow: "Your matches",
        matchLabel: "It's a match",
        meta: "14 days max",
        title: "Your matches",
      },
    ],
  },
  clarity: {
    eyebrow: "Interview",
    heading: "What it is. And just as importantly, what it isn't.",
    columns: [
      {
        eyebrow: "What it is",
        intro: "A focused interview layer built to explain real work clearly.",
        items: [
          {
            body: "Spoken, paced like a normal interview, with follow-ups.",
            title: "A conversation",
          },
          {
            body: "Questions are drawn from what you've actually done.",
            title: "Calibrated to your CV",
          },
          {
            body: "SDR, BDR, AE, CSM - the work, not abstractions.",
            title: "Built for commercial roles",
          },
          {
            body: "You talk. You don't type essays. You don't record video.",
            title: "Voice-first",
          },
        ],
      },
      {
        eyebrow: "What it isn't",
        intro:
          "No theater, hidden labels, or personality guessing dressed up as signal.",
        items: [
          {
            body: "No animal metaphors, mood labels, or identity boxes.",
            title: "Not a personality test",
          },
          {
            body: "No timed puzzles. No coding katas.",
            title: "Not an IQ test",
          },
          {
            body: "A human reviews every below-threshold case.",
            title: "Not an automated rejection",
          },
          {
            body: "Just signal about a fit for a specific job.",
            title: "Not a judgment of you as a person",
          },
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Candidate privacy",
    heading: "Your data stays yours.",
    body:
      "Five things we promise. The kind of promises we'll let you screenshot.",
    items: [
      {
        title: "Your current employer never sees you here.",
        description:
          "We block company domains you list. Your face and name aren't searchable from outside.",
      },
      {
        title: "Delete everything in one click.",
        description:
          'One button, no email confirmation chain, no "are you sure" survey. Gone in 24h.',
      },
      {
        title: "Your answers don't train models for other companies.",
        description:
          "Your interview is used to match you. Period. Not as training data, not as a benchmark.",
      },
      {
        title: "European servers. GDPR by design. AI Act compliant.",
        description:
          "Data residency in the EU. Audit trail on every AI decision that touches your profile.",
      },
      {
        title: "We never sell your data - to anyone.",
        description:
          "Not to recruiters, not to data brokers, not as anonymised insights. Our business model doesn't need it.",
      },
    ],
  },
  commitments: {
    eyebrow: "Candidate commitments",
    heading: "Three commitments. No fine print.",
    items: [
      {
        body:
          "If a company doesn't decide within 14 days, they're removed from the platform. Your time is not a free option for someone else's hiring committee.",
        label: "14 days",
        title: "Response in 14 days, always.",
      },
      {
        body:
          'No five-round gauntlets. No "one more call with the founder" three weeks in. If they need more than two, they need a different process.',
        label: "Max 2",
        title: "Two human interviews after the AI. No more.",
      },
      {
        body:
          "Every decision comes with a reason. Not a template. The actual thing that didn't fit, so the next interview is better than this one.",
        label: "Always",
        title: "Feedback always - even on a no.",
      },
    ],
  },
};

const candidateExperienceIt: typeof candidateExperienceEn = {
  heroTitle: "Ecco esattamente cosa succede quando entri in",
  heroAccent: "AssumerAI.",
  revealHighlight: "non fare",
  revealText:
    "Niente frasi da marketing. Ogni passaggio e spiegato, incluso cosa facciamo con i tuoi dati e cosa promettiamo di non fare.",
  horizontalCards: {
    dontDoLabel: "Cosa non facciamo",
    cards: [
      {
        body:
          "Carica il CV. La nostra AI estrae il profilo in pochi secondi: ruolo, esperienza, risultati chiave. Confermi cosa e giusto. Correggi cosa non lo e.",
        eyebrow: "Registrazione",
        title: "Il CV diventa un profilo vivo.",
        visualAlt: "Anteprima documento profilo",
        visualSrc: "/cards_for_candidates/postal.png",
      },
      {
        body:
          "Scegli uno slot adatto alla tua settimana. Sera, weekend, pausa pranzo: quando funziona per te. Puoi riprogrammare una volta, senza domande.",
        dontDo:
          "Non ti blocchiamo in una finestra 9-17 e non ti facciamo pagare se cambi idea.",
        eyebrow: "Prenota il colloquio",
        title: "Prenota il colloquio.",
        visualAlt: "Anteprima calendario colloquio",
        visualSrc: "/cards_for_candidates/calendar.png",
      },
      {
        body:
          "Una stanza tranquilla, cuffie, acqua vicino. Ti mandiamo una guida di una pagina per sapere cosa aspettarti. Niente compiti, niente slide da memorizzare.",
        dontDo: "Non valutiamo il tuo background, il tuo accento o la webcam.",
        eyebrow: "Preparazione",
        title: "Preparati.",
        visualAlt: "Anteprima preparazione colloquio",
        visualSrc: "/cards_for_candidates/studio.png",
      },
      {
        body:
          "Una conversazione vocale adattiva calibrata sul tuo CV. Domande reali su situazioni reali che hai vissuto. L'AI approfondisce come farebbe un buon intervistatore.",
        dontDo: "Niente domande trabocchetto. Niente rompicapi. Niente 'vendimi questa penna'.",
        eyebrow: "Il colloquio",
        meta: "20 min",
        title: "Il colloquio",
        visualAlt: "Anteprima colloquio adattivo",
        visualSrc: "/cards_for_candidates/interview.png",
      },
      {
        body:
          "Vedi esattamente cio che vedranno le aziende: punti forti, aree di crescita, il segnale dietro ogni punteggio. Nulla nascosto dietro paywall o CTA.",
        dontDo:
          "Non mostriamo ai datori una scorecard diversa da quella che mostriamo a te.",
        eyebrow: "La tua scorecard",
        meta: "subito",
        title: "La tua scorecard",
        visualAlt: "Anteprima scorecard candidato",
        visualSrc: "/cards_for_candidates/scorecard.png",
      },
      {
        body:
          "Solo aziende adatte al tuo profilo ti vedono, e solo se dai il consenso. Decidono entro 14 giorni. Ricevi un si, un no o una motivazione: mai silenzio.",
        dontDo: "Non ti lasciamo nel loop del 'ti faremo sapere'.",
        eyebrow: "I tuoi match",
        matchLabel: "E un match",
        meta: "massimo 14 giorni",
        title: "I tuoi match",
      },
    ],
  },
  clarity: {
    eyebrow: "Colloquio",
    heading: "Che cos'e. E altrettanto importante, cosa non e.",
    columns: [
      {
        eyebrow: "Che cos'e",
        intro: "Un livello di colloquio pensato per spiegare bene il lavoro reale.",
        items: [
          {
            body: "Parlato, con il ritmo di un colloquio normale e domande di follow-up.",
            title: "Una conversazione",
          },
          {
            body: "Le domande partono da quello che hai davvero fatto.",
            title: "Calibrato sul tuo CV",
          },
          {
            body: "SDR, BDR, AE, CSM: il lavoro concreto, non astrazioni.",
            title: "Pensato per ruoli commerciali",
          },
          {
            body: "Parli. Non scrivi temi. Non registri video.",
            title: "Prima la voce",
          },
        ],
      },
      {
        eyebrow: "Cosa non e",
        intro:
          "Niente teatro, etichette nascoste o ipotesi sulla personalita travestite da segnale.",
        items: [
          {
            body: "Niente metafore, mood label o caselle identitarie.",
            title: "Non e un test di personalita",
          },
          {
            body: "Niente puzzle a tempo. Niente coding kata.",
            title: "Non e un test IQ",
          },
          {
            body: "Un umano rivede ogni caso sotto soglia.",
            title: "Non e un rifiuto automatico",
          },
          {
            body: "Solo segnale sulla compatibilita con un lavoro specifico.",
            title: "Non e un giudizio sulla persona",
          },
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy candidato",
    heading: "I tuoi dati restano tuoi.",
    body:
      "Cinque promesse. Il tipo di promesse che puoi anche salvare con uno screenshot.",
    items: [
      {
        title: "Il tuo attuale datore di lavoro non ti vede qui.",
        description:
          "Blocchiamo i domini aziendali che indichi. Il tuo volto e il tuo nome non sono cercabili dall'esterno.",
      },
      {
        title: "Cancelli tutto con un click.",
        description:
          "Un pulsante, niente catene di email, niente questionari. Sparisce entro 24 ore.",
      },
      {
        title: "Le tue risposte non addestrano modelli per altre aziende.",
        description:
          "Il colloquio serve ad abbinarti. Punto. Non come dati di training, non come benchmark.",
      },
      {
        title: "Server europei. GDPR by design. Conforme all'AI Act.",
        description:
          "Dati residenti in UE. Traccia di audit per ogni decisione AI che tocca il tuo profilo.",
      },
      {
        title: "Non vendiamo mai i tuoi dati, a nessuno.",
        description:
          "Non ai recruiter, non ai data broker, non come insight anonimizzati. Il nostro modello non ne ha bisogno.",
      },
    ],
  },
  commitments: {
    eyebrow: "Impegni per candidati",
    heading: "Tre impegni. Nessuna nota nascosta.",
    items: [
      {
        body:
          "Se un'azienda non decide entro 14 giorni, viene rimossa dalla piattaforma. Il tuo tempo non e un'opzione gratuita per il comitato di selezione di qualcun altro.",
        label: "14 giorni",
        title: "Risposta entro 14 giorni, sempre.",
      },
      {
        body:
          "Niente percorsi da cinque colloqui. Niente 'un'altra call con il founder' dopo tre settimane. Se servono piu di due incontri, serve un processo diverso.",
        label: "Max 2",
        title: "Due colloqui umani dopo l'AI. Non di piu.",
      },
      {
        body:
          "Ogni decisione arriva con una motivazione. Non un template: il punto reale che non combaciava, cosi il prossimo colloquio sara migliore.",
        label: "Sempre",
        title: "Feedback sempre, anche su un no.",
      },
    ],
  },
};

const candidateExperienceFr: typeof candidateExperienceEn = {
  heroTitle: "Voici exactement ce qui se passe quand vous rejoignez",
  heroAccent: "AssumerAI.",
  revealHighlight: "ne pas faire",
  revealText:
    "Pas de discours marketing. Chaque etape est expliquee, y compris ce que nous faisons de vos donnees et ce que nous promettons de ne pas faire.",
  horizontalCards: {
    dontDoLabel: "Ce que nous ne faisons pas",
    cards: [
      {
        body:
          "Importez votre CV. Notre IA extrait votre profil en quelques secondes : role, experience, reussites cles. Vous confirmez ce qui est juste. Vous corrigez le reste.",
        eyebrow: "Inscription",
        title: "Le CV devient un profil vivant.",
        visualAlt: "Apercu du document profil",
        visualSrc: "/cards_for_candidates/postal.png",
      },
      {
        body:
          "Choisissez un creneau adapte a votre semaine. Soirees, week-ends, pause dejeuner : ce qui vous arrange. Vous pouvez reprogrammer une fois, sans question.",
        dontDo:
          "Nous ne vous enfermons pas dans une fenetre 9h-17h et nous ne facturons pas un changement d'avis.",
        eyebrow: "Planifier l'entretien",
        title: "Planifier l'entretien.",
        visualAlt: "Apercu calendrier entretien",
        visualSrc: "/cards_for_candidates/calendar.png",
      },
      {
        body:
          "Une piece calme, un casque, de l'eau a portee de main. Nous envoyons un guide d'une page pour savoir a quoi vous attendre. Pas de devoir, pas de slides a memoriser.",
        dontDo:
          "Nous ne notons pas votre parcours, votre accent ou votre webcam.",
        eyebrow: "Preparation",
        title: "Preparez-vous.",
        visualAlt: "Apercu preparation entretien",
        visualSrc: "/cards_for_candidates/studio.png",
      },
      {
        body:
          "Une conversation vocale adaptative calibree sur votre CV. De vraies questions sur de vraies situations vecues. L'IA relance comme le ferait un bon intervieweur.",
        dontDo: "Pas de questions pieges. Pas de casse-tetes. Pas de 'vendez-moi ce stylo'.",
        eyebrow: "L'entretien",
        meta: "20 min",
        title: "L'entretien",
        visualAlt: "Apercu entretien adaptatif",
        visualSrc: "/cards_for_candidates/interview.png",
      },
      {
        body:
          "Vous voyez exactement ce que les entreprises verront : forces, axes de progression, signal derriere chaque score. Rien cache derriere un paiement ou un CTA.",
        dontDo:
          "Nous ne montrons pas aux employeurs une scorecard differente de celle que vous voyez.",
        eyebrow: "Votre scorecard",
        meta: "instantane",
        title: "Votre scorecard",
        visualAlt: "Apercu scorecard candidat",
        visualSrc: "/cards_for_candidates/scorecard.png",
      },
      {
        body:
          "Seules les entreprises qui correspondent a votre profil vous voient, et seulement si vous acceptez. Elles decident sous 14 jours. Vous recevez un oui, un non ou une raison : jamais le silence.",
        dontDo: "Nous ne vous laissons pas dans la boucle 'on vous tient au courant'.",
        eyebrow: "Vos matchs",
        matchLabel: "C'est un match",
        meta: "14 jours max",
        title: "Vos matchs",
      },
    ],
  },
  clarity: {
    eyebrow: "Entretien",
    heading: "Ce que c'est. Et tout aussi important, ce que ce n'est pas.",
    columns: [
      {
        eyebrow: "Ce que c'est",
        intro: "Une couche d'entretien concentree sur le travail reel.",
        items: [
          {
            body: "Parle, rythme comme un entretien normal, avec des relances.",
            title: "Une conversation",
          },
          {
            body: "Les questions partent de ce que vous avez vraiment fait.",
            title: "Calibre sur votre CV",
          },
          {
            body: "SDR, BDR, AE, CSM : le travail concret, pas des abstractions.",
            title: "Concu pour les roles commerciaux",
          },
          {
            body: "Vous parlez. Vous ne tapez pas d'essais. Vous n'enregistrez pas de video.",
            title: "D'abord la voix",
          },
        ],
      },
      {
        eyebrow: "Ce que ce n'est pas",
        intro:
          "Pas de theatre, d'etiquettes cachees ou de suppositions de personnalite deguisees en signal.",
        items: [
          {
            body: "Pas de metaphores, d'etiquettes d'humeur ou de cases d'identite.",
            title: "Pas un test de personnalite",
          },
          {
            body: "Pas de puzzles chronometres. Pas de coding katas.",
            title: "Pas un test de QI",
          },
          {
            body: "Un humain relit chaque cas sous le seuil.",
            title: "Pas un rejet automatise",
          },
          {
            body: "Seulement du signal sur l'adequation a un poste precis.",
            title: "Pas un jugement sur vous",
          },
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Confidentialite candidat",
    heading: "Vos donnees restent les votres.",
    body:
      "Cinq promesses. Le genre de promesses que vous pouvez capturer en ecran.",
    items: [
      {
        title: "Votre employeur actuel ne vous voit jamais ici.",
        description:
          "Nous bloquons les domaines d'entreprise que vous indiquez. Votre visage et votre nom ne sont pas cherchables depuis l'exterieur.",
      },
      {
        title: "Supprimez tout en un clic.",
        description:
          "Un bouton, pas de chaine d'emails, pas de questionnaire. Tout disparait sous 24h.",
      },
      {
        title: "Vos reponses n'entrainent pas de modeles pour d'autres entreprises.",
        description:
          "Votre entretien sert a vous matcher. Point. Pas comme donnees d'entrainement, pas comme benchmark.",
      },
      {
        title: "Serveurs europeens. GDPR by design. Conforme a l'AI Act.",
        description:
          "Residence des donnees en UE. Journal d'audit pour chaque decision IA qui touche votre profil.",
      },
      {
        title: "Nous ne vendons jamais vos donnees, a personne.",
        description:
          "Pas aux recruteurs, pas aux courtiers en donnees, pas comme insights anonymises. Notre modele n'en a pas besoin.",
      },
    ],
  },
  commitments: {
    eyebrow: "Engagements candidat",
    heading: "Trois engagements. Pas de petites lignes.",
    items: [
      {
        body:
          "Si une entreprise ne decide pas sous 14 jours, elle est retiree de la plateforme. Votre temps n'est pas une option gratuite pour le comite de recrutement de quelqu'un d'autre.",
        label: "14 jours",
        title: "Reponse sous 14 jours, toujours.",
      },
      {
        body:
          "Pas de parcours a cinq entretiens. Pas de 'dernier appel avec le fondateur' trois semaines plus tard. S'ils ont besoin de plus de deux, il leur faut un autre processus.",
        label: "Max 2",
        title: "Deux entretiens humains apres l'IA. Pas plus.",
      },
      {
        body:
          "Chaque decision vient avec une raison. Pas un modele : le vrai point qui ne correspondait pas, pour que le prochain entretien soit meilleur.",
        label: "Toujours",
        title: "Feedback toujours, meme sur un non.",
      },
    ],
  },
};

const hiringTeamsExperienceEn = {
  hero: {
    title:
      "The complete picture: why AssumerAI works, when it doesn't, and how we compare.",
    body:
      "We'll tell you when you shouldn't use us. Because trust matters more than another signup.",
    metrics: [
      { value: "90%", label: "less screening" },
      { value: "14d", label: "decision SLA" },
      { value: "\u20ac200", label: "per hire" },
    ],
  },
  reasons: {
    ariaLabel: "Five quantified reasons AssumerAI works for hiring teams",
    heading: "Five reasons. With numbers behind each.",
    listAriaLabel: "Five reasons with quantified proof points",
    reasonLabel: "REASON",
    proofPointLabel: "PROOF POINT",
    items: [
      {
        body:
          "From 23 hours to 2\u20133 hours per role. The AI does first-round, your team meets only the top 5\u201310%.",
        label: "SCREENING TIME",
        metric: "90%",
        number: "01",
        title: "Cut screening time by 90%.",
      },
      {
        body:
          "We back-test interview scores against 12-month performance \u2014 quota attainment, retention, ramp time. The signal is real, and we publish it.",
        label: "outcome data",
        metric: "12 mo",
        number: "02",
        title: "Reduce mis-hires with predictive matching.",
      },
      {
        body:
          "Platform \u20ac400. \u20ac200 per hire. Performance: lets speak. No retainer, no per-search fee.",
        label: "per hire",
        metric: "\u20ac200",
        number: "03",
        title: "Pay only when hiring works.",
      },
      {
        body:
          "Audit trail per decision, bias detection per cohort, GDPR data residency in the EU. We pass your DPO review on first try.",
        label: "compliance",
        metric: "Day 0",
        number: "04",
        title: "AI Act compliant by design.",
      },
      {
        body:
          "No heavy ATS rebuild. Greenhouse, Lever, Recruitee, Workable \u2014 connect in a kickoff call, hire in the same week.",
        label: "to live",
        metric: "7 days",
        number: "05",
        title: "Live in 1 week, not 3 months.",
      },
    ],
  },
  antiFit: {
    bottomNoteBody: "We're for companies who take hiring seriously.",
    bottomNoteTitle: "We're not for everyone.",
    headingEmphasis: "not",
    headingLine1: "Four reasons",
    headingLine2: "to use AssumerAI.",
    noteAriaLabel: "Not for everyone note",
    noteLabel: "NOT FOR EVERYONE.",
    noteLine: "And that's okay.",
    subtitle:
      "If you recognise yourself here, we'd rather tell you now than charge you and watch it fail.",
    cards: [
      {
        alt: "Soft red calendar and hiring folder representing rare one-off hiring.",
        body:
          "AssumerAI is built for repeat hiring. If you have one role, a freelance recruiter will be cheaper and faster.",
        cta: "Use a freelance recruiter",
        title: "You hire one person every six months.",
      },
      {
        alt: "Ivory chess king and candidate folders representing senior executive hiring.",
        body:
          "Executive search is relationship work \u2014 references, market mapping, off-radar candidates. The AI interview isn't the right tool.",
        cta: "Use a human-led executive search",
        title: "You're hiring C-level or senior executives.",
      },
      {
        alt: "Red and cream decision timer representing the 14-day decision commitment.",
        body:
          "The 14-day SLA isn't a feature, it's the contract that makes everything else work. Candidates trust the system because it holds. If you can't, AssumerAI breaks.",
        cta: "Fix the bottleneck first",
        title: "You can't commit to 14-day decisions.",
      },
      {
        alt: "Red megaphone spray can representing volume candidate outreach.",
        body:
          "If your strategy is wide-funnel outreach, LinkedIn Recruiter is built for that. We're built for the opposite shape.",
        cta: "Use LinkedIn for volume",
        title: "You want to \"spam\" candidates.",
      },
    ],
  },
  comparison: {
    caption:
      "Comparison of AssumerAI against job boards, AI interview platforms, and staffing agencies.",
    title: "How we line up against the alternatives.",
    subtitle:
      "No row was edited to make us win. If a competitor is better at something, we say so.",
    statusLabels: {
      positive: "Positive",
      negative: "Negative",
      neutral: "Neutral",
    },
    columns: [
      {
        key: "criterion",
        title: "Criterion",
      },
      {
        highlighted: true,
        key: "assumerai",
        label: "AI interview + outcome pricing",
        title: "AssumerAI",
      },
      {
        key: "jobBoards",
        label: "LinkedIn \u00b7 Indeed",
        title: "Job boards",
      },
      {
        key: "aiPlatforms",
        label: "Sapia \u00b7 HireVue",
        title: "AI interview platforms",
      },
      {
        key: "staffing",
        label: "Reverse \u00b7 Adecco",
        title: "Staffing agencies",
      },
    ],
    rows: [
      {
        criterion: "Pricing model",
        assumerai: "Platform \u20ac400 + \u20ac200/hire + lets speak performance",
        jobBoards: "Subscription + sponsored",
        aiPlatforms: "Per-seat SaaS",
        staffing: "20\u201325% of salary",
      },
      {
        criterion: "Time to first qualified candidate",
        assumerai: "3\u20135 days",
        jobBoards: "2\u20134 weeks (sift)",
        aiPlatforms: "1\u20132 weeks (setup)",
        staffing: "2\u20136 weeks",
      },
      {
        criterion: "Cost per hire (avg)",
        assumerai: "\u20ac400 platform + \u20ac200/hire",
        jobBoards: "\u20ac1.5K\u2013\u20ac4K",
        aiPlatforms: "\u20ac8K\u2013\u20ac20K platform fee",
        staffing: "\u20ac8K\u2013\u20ac18K per hire",
      },
      {
        criterion: "Pre-screening included",
        assumerai: { text: "AI + human review", status: "positive" },
        jobBoards: { text: "You do it", status: "negative" },
        aiPlatforms: { text: "AI only", status: "positive" },
        staffing: { text: "Recruiter-led", status: "positive" },
      },
      {
        criterion: "Outcome accountability",
        assumerai: { text: "14-day SLA", status: "positive" },
        jobBoards: { text: "None", status: "negative" },
        aiPlatforms: { text: "None", status: "negative" },
        staffing: { text: "Guarantee period", status: "neutral" },
      },
      {
        criterion: "Best for",
        assumerai: "Repeat commercial hiring",
        jobBoards: "Volume top-funnel",
        aiPlatforms: "High-volume screening",
        staffing: "Senior / exec search",
      },
      {
        criterion: "Setup complexity",
        assumerai: "Low \u2014 1 week",
        jobBoards: "Low \u2014 instant",
        aiPlatforms: "Medium \u2014 4\u20138 weeks",
        staffing: "Low \u2014 kickoff call",
      },
      {
        criterion: "Italian market depth",
        assumerai: { text: "Beachhead", status: "positive" },
        jobBoards: { text: "Broad, shallow", status: "neutral" },
        aiPlatforms: { text: "Mostly US/UK", status: "negative" },
        staffing: { text: "Deep, expensive", status: "positive" },
      },
      {
        criterion: "Performance dataset",
        assumerai: { text: "12-mo, closed loop", status: "positive" },
        jobBoards: { text: "\u2014", status: "negative" },
        aiPlatforms: { text: "Aggregate", status: "neutral" },
        staffing: { text: "\u2014", status: "negative" },
      },
    ],
  },
};

const hiringTeamsExperienceIt: typeof hiringTeamsExperienceEn = {
  hero: {
    title:
      "Il quadro completo: perche AssumerAI funziona, quando no, e come ci confrontiamo.",
    body:
      "Ti diciamo anche quando non dovresti usarci. Perche la fiducia conta piu di una registrazione.",
    metrics: [
      { value: "90%", label: "screening in meno" },
      { value: "14g", label: "SLA decisione" },
      { value: "\u20ac200", label: "per hire" },
    ],
  },
  reasons: {
    ariaLabel: "Cinque motivi quantificati per cui AssumerAI funziona per i team di selezione",
    heading: "Cinque motivi. Con numeri dietro ognuno.",
    listAriaLabel: "Cinque motivi con prove quantificate",
    reasonLabel: "MOTIVO",
    proofPointLabel: "PROVA",
    items: [
      {
        body:
          "Da 23 ore a 2-3 ore per ruolo. L'IA fa il primo round, il team incontra solo il 5-10% migliore.",
        label: "TEMPO DI SCREENING",
        metric: "90%",
        number: "01",
        title: "Riduci il tempo di screening del 90%.",
      },
      {
        body:
          "Verifichiamo i punteggi dei colloqui contro 12 mesi di performance: quota, retention, tempo di ramp. Il segnale e reale, e lo pubblichiamo.",
        label: "dati sui risultati",
        metric: "12 mesi",
        number: "02",
        title: "Riduci i mis-hire con matching predittivo.",
      },
      {
        body:
          "Piattaforma \u20ac400. \u20ac200 per hire. Performance: lets speak. Niente retainer, niente fee per ricerca.",
        label: "per hire",
        metric: "\u20ac200",
        number: "03",
        title: "Paghi solo quando l'assunzione funziona.",
      },
      {
        body:
          "Audit trail per decisione, rilevazione bias per coorte, dati GDPR residenti in UE. Superiamo la review DPO al primo giro.",
        label: "compliance",
        metric: "Giorno 0",
        number: "04",
        title: "Conforme all'AI Act by design.",
      },
      {
        body:
          "Nessuna ricostruzione pesante dell'ATS. Greenhouse, Lever, Recruitee, Workable: colleghi tutto in una kickoff call e assumi nella stessa settimana.",
        label: "per andare live",
        metric: "7 giorni",
        number: "05",
        title: "Live in 1 settimana, non in 3 mesi.",
      },
    ],
  },
  antiFit: {
    bottomNoteBody: "Siamo per aziende che prendono sul serio le assunzioni.",
    bottomNoteTitle: "Non siamo per tutti.",
    headingEmphasis: "per non",
    headingLine1: "Quattro motivi",
    headingLine2: "usare AssumerAI.",
    noteAriaLabel: "Nota non per tutti",
    noteLabel: "NON PER TUTTI.",
    noteLine: "E va bene cosi.",
    subtitle:
      "Se ti riconosci qui, preferiamo dirtelo subito invece di farti pagare e guardare il processo fallire.",
    cards: [
      {
        alt: "Calendario rosso morbido e cartella candidato per assunzioni una tantum.",
        body:
          "AssumerAI e costruito per assunzioni ripetute. Se hai un solo ruolo, un recruiter freelance sara piu economico e veloce.",
        cta: "Usa un recruiter freelance",
        title: "Assumi una persona ogni sei mesi.",
      },
      {
        alt: "Re degli scacchi color avorio e cartelle candidato per hiring executive.",
        body:
          "L'executive search e lavoro di relazione: referenze, mappatura mercato, candidati fuori radar. Il colloquio IA non e lo strumento giusto.",
        cta: "Usa executive search umano",
        title: "Stai assumendo C-level o senior executive.",
      },
      {
        alt: "Timer decisionale rosso e crema per l'impegno a decidere in 14 giorni.",
        body:
          "La SLA a 14 giorni non e una feature, e il contratto che fa funzionare tutto il resto. I candidati si fidano perche regge. Se non puoi, AssumerAI si rompe.",
        cta: "Sistema prima il collo di bottiglia",
        title: "Non puoi impegnarti a decidere in 14 giorni.",
      },
      {
        alt: "Megafono spray rosso per outreach candidato ad alto volume.",
        body:
          "Se la tua strategia e outreach a imbuto largo, LinkedIn Recruiter e fatto per quello. Noi siamo costruiti per la forma opposta.",
        cta: "Usa LinkedIn per il volume",
        title: "Vuoi fare \"spam\" ai candidati.",
      },
    ],
  },
  comparison: {
    caption:
      "Confronto tra AssumerAI, job board, piattaforme di colloquio IA e agenzie staffing.",
    title: "Come ci confrontiamo con le alternative.",
    subtitle:
      "Nessuna riga e stata modificata per farci vincere. Se un competitor e migliore in qualcosa, lo diciamo.",
    statusLabels: {
      positive: "Positivo",
      negative: "Negativo",
      neutral: "Neutro",
    },
    columns: [
      {
        key: "criterion",
        title: "Criterio",
      },
      {
        highlighted: true,
        key: "assumerai",
        label: "Colloquio IA + prezzo a risultato",
        title: "AssumerAI",
      },
      {
        key: "jobBoards",
        label: "LinkedIn \u00b7 Indeed",
        title: "Job board",
      },
      {
        key: "aiPlatforms",
        label: "Sapia \u00b7 HireVue",
        title: "Piattaforme colloqui IA",
      },
      {
        key: "staffing",
        label: "Reverse \u00b7 Adecco",
        title: "Agenzie staffing",
      },
    ],
    rows: [
      {
        criterion: "Modello di prezzo",
        assumerai: "Piattaforma \u20ac400 + \u20ac200/hire + performance lets speak",
        jobBoards: "Abbonamento + sponsored",
        aiPlatforms: "SaaS per seat",
        staffing: "20-25% della RAL",
      },
      {
        criterion: "Tempo al primo candidato qualificato",
        assumerai: "3-5 giorni",
        jobBoards: "2-4 settimane (scrematura)",
        aiPlatforms: "1-2 settimane (setup)",
        staffing: "2-6 settimane",
      },
      {
        criterion: "Costo per hire medio",
        assumerai: "\u20ac400 piattaforma + \u20ac200/hire",
        jobBoards: "\u20ac1.5K-\u20ac4K",
        aiPlatforms: "\u20ac8K-\u20ac20K fee piattaforma",
        staffing: "\u20ac8K-\u20ac18K per hire",
      },
      {
        criterion: "Pre-screening incluso",
        assumerai: { text: "IA + review umana", status: "positive" },
        jobBoards: { text: "Lo fai tu", status: "negative" },
        aiPlatforms: { text: "Solo IA", status: "positive" },
        staffing: { text: "Guidato dal recruiter", status: "positive" },
      },
      {
        criterion: "Accountability sul risultato",
        assumerai: { text: "SLA 14 giorni", status: "positive" },
        jobBoards: { text: "Nessuna", status: "negative" },
        aiPlatforms: { text: "Nessuna", status: "negative" },
        staffing: { text: "Periodo garanzia", status: "neutral" },
      },
      {
        criterion: "Ideale per",
        assumerai: "Hiring commerciale ripetuto",
        jobBoards: "Top-funnel a volume",
        aiPlatforms: "Screening ad alto volume",
        staffing: "Senior / exec search",
      },
      {
        criterion: "Complessita setup",
        assumerai: "Bassa - 1 settimana",
        jobBoards: "Bassa - subito",
        aiPlatforms: "Media - 4-8 settimane",
        staffing: "Bassa - kickoff call",
      },
      {
        criterion: "Profondita mercato italiano",
        assumerai: { text: "Beachhead", status: "positive" },
        jobBoards: { text: "Ampio, superficiale", status: "neutral" },
        aiPlatforms: { text: "Soprattutto US/UK", status: "negative" },
        staffing: { text: "Profondo, costoso", status: "positive" },
      },
      {
        criterion: "Dataset performance",
        assumerai: { text: "12 mesi, closed loop", status: "positive" },
        jobBoards: { text: "-", status: "negative" },
        aiPlatforms: { text: "Aggregato", status: "neutral" },
        staffing: { text: "-", status: "negative" },
      },
    ],
  },
};

const hiringTeamsExperienceFr: typeof hiringTeamsExperienceEn = {
  hero: {
    title:
      "Le tableau complet : pourquoi AssumerAI fonctionne, quand ce n'est pas le bon choix, et comment nous nous comparons.",
    body:
      "Nous disons aussi quand vous ne devriez pas nous utiliser. La confiance compte plus qu'une inscription de plus.",
    metrics: [
      { value: "90%", label: "screening en moins" },
      { value: "14j", label: "SLA decision" },
      { value: "\u20ac200", label: "per hire" },
    ],
  },
  reasons: {
    ariaLabel: "Cinq raisons quantifiees pour lesquelles AssumerAI fonctionne pour les equipes RH",
    heading: "Cinq raisons. Avec des chiffres derriere chacune.",
    listAriaLabel: "Cinq raisons avec preuves quantifiees",
    reasonLabel: "RAISON",
    proofPointLabel: "PREUVE",
    items: [
      {
        body:
          "De 23 heures a 2-3 heures par poste. L'IA fait le premier tour, votre equipe rencontre seulement les meilleurs 5-10%.",
        label: "TEMPS DE SCREENING",
        metric: "90%",
        number: "01",
        title: "Reduisez le temps de screening de 90%.",
      },
      {
        body:
          "Nous testons les scores d'entretien contre 12 mois de performance : quota, retention, temps de ramp. Le signal est reel, et nous le publions.",
        label: "donnees resultat",
        metric: "12 mois",
        number: "02",
        title: "Reduisez les erreurs de recrutement avec le matching predictif.",
      },
      {
        body:
          "Plateforme \u20ac400. \u20ac200 per hire. Performance: lets speak. Pas de retainer, pas de frais par recherche.",
        label: "per hire",
        metric: "\u20ac200",
        number: "03",
        title: "Payez seulement quand le recrutement marche.",
      },
      {
        body:
          "Audit trail par decision, detection des biais par cohorte, donnees GDPR residentes dans l'UE. Nous passons la revue DPO du premier coup.",
        label: "conformite",
        metric: "Jour 0",
        number: "04",
        title: "Conforme a l'AI Act by design.",
      },
      {
        body:
          "Pas de reconstruction lourde de l'ATS. Greenhouse, Lever, Recruitee, Workable : connexion en kickoff call, recrutement la meme semaine.",
        label: "pour etre live",
        metric: "7 jours",
        number: "05",
        title: "Live en 1 semaine, pas en 3 mois.",
      },
    ],
  },
  antiFit: {
    bottomNoteBody: "Nous sommes pour les entreprises qui prennent le recrutement au serieux.",
    bottomNoteTitle: "Nous ne sommes pas pour tout le monde.",
    headingEmphasis: "de ne pas",
    headingLine1: "Quatre raisons",
    headingLine2: "utiliser AssumerAI.",
    noteAriaLabel: "Note pas pour tout le monde",
    noteLabel: "PAS POUR TOUS.",
    noteLine: "Et c'est tres bien.",
    subtitle:
      "Si vous vous reconnaissez ici, nous preferons vous le dire maintenant plutot que vous facturer et voir le processus echouer.",
    cards: [
      {
        alt: "Calendrier rouge souple et dossier candidat pour un recrutement ponctuel.",
        body:
          "AssumerAI est concu pour le recrutement repete. Si vous avez un seul role, un recruteur freelance sera moins cher et plus rapide.",
        cta: "Utiliser un recruteur freelance",
        title: "Vous recrutez une personne tous les six mois.",
      },
      {
        alt: "Roi d'echecs ivoire et dossiers candidat pour recrutement executive.",
        body:
          "L'executive search est un travail de relation : references, cartographie du marche, candidats hors radar. L'entretien IA n'est pas le bon outil.",
        cta: "Utiliser une recherche executive humaine",
        title: "Vous recrutez C-level ou senior executives.",
      },
      {
        alt: "Timer de decision rouge et creme pour l'engagement en 14 jours.",
        body:
          "Le SLA de 14 jours n'est pas une fonctionnalite, c'est le contrat qui fait fonctionner le reste. Les candidats font confiance au systeme parce qu'il tient. Sinon, AssumerAI casse.",
        cta: "Corriger le goulot d'abord",
        title: "Vous ne pouvez pas vous engager sur des decisions en 14 jours.",
      },
      {
        alt: "Megaphone spray rouge pour outreach candidat a fort volume.",
        body:
          "Si votre strategie est l'outreach large funnel, LinkedIn Recruiter est fait pour ca. Nous sommes construits pour la forme opposee.",
        cta: "Utiliser LinkedIn pour le volume",
        title: "Vous voulez \"spammer\" les candidats.",
      },
    ],
  },
  comparison: {
    caption:
      "Comparaison d'AssumerAI avec les job boards, les plateformes d'entretien IA et les agences staffing.",
    title: "Comment nous nous comparons aux alternatives.",
    subtitle:
      "Aucune ligne n'a ete modifiee pour nous faire gagner. Si un concurrent est meilleur sur un point, nous le disons.",
    statusLabels: {
      positive: "Positif",
      negative: "Negatif",
      neutral: "Neutre",
    },
    columns: [
      {
        key: "criterion",
        title: "Critere",
      },
      {
        highlighted: true,
        key: "assumerai",
        label: "Entretien IA + prix au resultat",
        title: "AssumerAI",
      },
      {
        key: "jobBoards",
        label: "LinkedIn \u00b7 Indeed",
        title: "Job boards",
      },
      {
        key: "aiPlatforms",
        label: "Sapia \u00b7 HireVue",
        title: "Plateformes entretien IA",
      },
      {
        key: "staffing",
        label: "Reverse \u00b7 Adecco",
        title: "Agences staffing",
      },
    ],
    rows: [
      {
        criterion: "Modele de prix",
        assumerai: "Plateforme \u20ac400 + \u20ac200/hire + performance lets speak",
        jobBoards: "Abonnement + sponsorise",
        aiPlatforms: "SaaS par seat",
        staffing: "20-25% du salaire",
      },
      {
        criterion: "Temps au premier candidat qualifie",
        assumerai: "3-5 jours",
        jobBoards: "2-4 semaines (tri)",
        aiPlatforms: "1-2 semaines (setup)",
        staffing: "2-6 semaines",
      },
      {
        criterion: "Cout par hire moyen",
        assumerai: "\u20ac400 plateforme + \u20ac200/hire",
        jobBoards: "\u20ac1.5K-\u20ac4K",
        aiPlatforms: "\u20ac8K-\u20ac20K fee plateforme",
        staffing: "\u20ac8K-\u20ac18K par hire",
      },
      {
        criterion: "Pre-screening inclus",
        assumerai: { text: "IA + revue humaine", status: "positive" },
        jobBoards: { text: "Vous le faites", status: "negative" },
        aiPlatforms: { text: "IA seule", status: "positive" },
        staffing: { text: "Mene par recruteur", status: "positive" },
      },
      {
        criterion: "Accountability resultat",
        assumerai: { text: "SLA 14 jours", status: "positive" },
        jobBoards: { text: "Aucune", status: "negative" },
        aiPlatforms: { text: "Aucune", status: "negative" },
        staffing: { text: "Periode garantie", status: "neutral" },
      },
      {
        criterion: "Ideal pour",
        assumerai: "Recrutement commercial repete",
        jobBoards: "Top-funnel volume",
        aiPlatforms: "Screening haut volume",
        staffing: "Senior / exec search",
      },
      {
        criterion: "Complexite setup",
        assumerai: "Basse - 1 semaine",
        jobBoards: "Basse - instant",
        aiPlatforms: "Moyenne - 4-8 semaines",
        staffing: "Basse - kickoff call",
      },
      {
        criterion: "Profondeur marche italien",
        assumerai: { text: "Beachhead", status: "positive" },
        jobBoards: { text: "Large, superficiel", status: "neutral" },
        aiPlatforms: { text: "Surtout US/UK", status: "negative" },
        staffing: { text: "Profond, cher", status: "positive" },
      },
      {
        criterion: "Dataset performance",
        assumerai: { text: "12 mois, closed loop", status: "positive" },
        jobBoards: { text: "-", status: "negative" },
        aiPlatforms: { text: "Agrege", status: "neutral" },
        staffing: { text: "-", status: "negative" },
      },
    ],
  },
};

const productPagesEn = {
  productNavLabel: "Product pages",
  pages: {
    candidates: {
      eyebrow: "Candidate product",
      title: "Candidate OS",
      accent: "one profile that keeps working.",
      body:
        "A dedicated space for the person applying: CV intake, one adaptive interview, calibrated scorecards, match control, and a calm dashboard for every next step.",
      primaryCta: "Take the interview",
      secondaryCta: "See hiring teams",
      productNavLabel: "Product pages",
      stageKicker: "Candidate signal",
      stageTitle: "The work happens once, then compounds quietly.",
      metrics: [
        { value: "1", label: "profile carried across every matching company" },
        { value: "20m", label: "adaptive interview instead of repeat applications" },
        { value: "48h", label: "first match window after the interview is complete" },
      ],
      heroNodes: [
        { label: "CV state", value: "verified" },
        { label: "Interview", value: "complete" },
        { label: "Match control", value: "private" },
        { label: "Feedback", value: "human" },
      ],
      chapters: [
        {
          meta: "01 intake",
          title: "The CV becomes a living profile.",
          body:
            "Candidates upload once, review the extraction, and keep control of what becomes visible. The product turns repeated form filling into a single editable source of truth.",
        },
        {
          meta: "02 interview",
          title: "The interview captures signal without pressure theater.",
          body:
            "Short modules collect communication, judgement, language, and role preference. Follow-ups appear only where they add useful signal.",
        },
        {
          meta: "03 matches",
          title: "Every match arrives with context, not mystery.",
          body:
            "Candidates see the role, the reason, and the next step before sharing more. They can accept, decline, or stay private without being chased by noise.",
        },
      ],
      capabilities: [
        {
          meta: "Privacy",
          title: "Consent-led visibility",
          body:
            "No company gets a candidate profile until the candidate says yes. That principle stays visible across the page and product flow.",
        },
        {
          meta: "Signal",
          title: "One scorecard",
          body:
            "The same calibrated evidence travels with the candidate, so every company evaluates the same clean signal instead of a rewritten pitch.",
        },
        {
          meta: "Momentum",
          title: "Reasoned next steps",
          body:
            "Matches and rejections are written as clear next actions, making the product feel respectful even when the answer is no.",
        },
      ],
      finalHeading: "You deserve a real conversation, not a silent inbox.",
      finalBody: "free · 20 minutes · no commitment",
      finalCta: "Take your AI interview",
      candidateExperience: candidateExperienceEn,
    },
    hiringTeams: {
      eyebrow: "Hiring team product",
      title: "Hiring Control Room",
      accent: "skim the signal, not the pile.",
      body:
        "A product page for recruiters and managers: calibrated candidate intake, evidence-backed scorecards, review queues, transcripts, scheduling, and performance-aligned pricing.",
      primaryCta: "Book a walkthrough",
      secondaryCta: "See candidates",
      productNavLabel: "Product pages",
      stageKicker: "Team workflow",
      stageTitle: "A quieter dashboard for faster, better hiring decisions.",
      metrics: [
        { value: "14", label: "qualified candidates to review instead of 312" },
        { value: "9:08", label: "calendar invites sent from a morning shortlist" },
        { value: "1", label: "shared evidence view for every debrief" },
      ],
      heroNodes: [
        { label: "Pipeline", value: "ranked" },
        { label: "Evidence", value: "timestamped" },
        { label: "Calendar", value: "synced" },
        { label: "Debrief", value: "shared" },
      ],
      chapters: [
        {
          meta: "01 calibrate",
          title: "Set the bar before candidates arrive.",
          body:
            "Teams define role thresholds and priorities up front, then receive candidates already scored against the same standard.",
        },
        {
          meta: "02 review",
          title: "Open the evidence, not another spreadsheet.",
          body:
            "Each candidate view connects scores to transcript moments, role preferences, and proof points that the hiring team can discuss together.",
        },
        {
          meta: "03 schedule",
          title: "Move from shortlist to conversation quickly.",
          body:
            "The dashboard turns a qualified review into a calendar action, so teams spend less time triaging and more time interviewing the right people.",
        },
      ],
      capabilities: [
        {
          meta: "Calibration",
          title: "Role-specific thresholds",
          body:
            "Scorecards can weight language, role imagination, coding, customer judgement, or any signal that matters for the specific role.",
        },
        {
          meta: "Review",
          title: "Timestamped transcripts",
          body:
            "Hiring teams can jump to the exact moment that explains a score instead of trusting a black-box summary.",
        },
        {
          meta: "Ops",
          title: "Calendar handoff",
          body:
            "Scheduling is treated as part of the product flow, not a separate admin chore after the useful review is done.",
        },
      ],
      finalHeading: "Make the hiring page feel like the actual product.",
      finalBody:
        "This route gives hiring teams a focused story with dashboards, proof, and workflow rather than another generic landing section.",
      finalCta: "Talk to hiring teams",
      hiringTeamsExperience: hiringTeamsExperienceEn,
    },
    pricing: {
      eyebrow: "Pricing product",
      title: "Aligned Economics",
      accent: "paid when hiring works.",
      body:
        "A product page for the business model: \u20ac400 platform access, \u20ac200 per hire, and performance terms that start with lets speak.",
      primaryCta: "Book a walkthrough",
      secondaryCta: "See hiring teams",
      productNavLabel: "Product pages",
      stageKicker: "Commercial model",
      stageTitle: "Pricing is designed to reward useful matches, not busywork.",
      metrics: [
        { value: "\u20ac400", label: "platform access for the hiring workflow" },
        { value: "\u20ac200", label: "per hire when a matched candidate is hired" },
        { value: "lets speak", label: "performance terms" },
      ],
      heroNodes: [
        { label: "Base", value: "platform" },
        { label: "Core", value: "per hire" },
        { label: "Aligned", value: "retention" },
        { label: "Risk", value: "shared" },
      ],
      chapters: [
        {
          meta: "01 base",
          title: "A clear platform fee keeps the workflow available.",
          body:
            "Teams pay for the dashboard, scorecards, interview intake, and operating layer that make the hiring process repeatable.",
        },
        {
          meta: "02 success",
          title: "The success fee triggers only when a match becomes a hire.",
          body:
            "Assumerai earns more when the product creates a real hiring outcome, not when candidates are pushed into another funnel.",
        },
        {
          meta: "03 retention",
          title: "The long-term incentive rewards quality.",
          body:
            "The performance component starts with lets speak, keeping the model pointed at durable matches without pretending one number fits every team.",
        },
      ],
      capabilities: [
        {
          meta: "SaaS",
          title: "Predictable base",
          body:
            "The platform fee supports the operating layer teams use every month, independent of hiring spikes.",
        },
        {
          meta: "Outcome",
          title: "Success-linked fee",
          body:
            "The per-hire component is easy to understand and tied to a completed hire rather than lead volume.",
        },
        {
          meta: "Quality",
          title: "Retention incentive",
          body:
            "The performance conversation stays bespoke for teams that care about lasting fit.",
        },
      ],
      finalHeading: "Make the pricing page feel like a product promise.",
      finalBody:
        "The commercial story gets a page with the same care as the interface: clear, calm, and tied to outcomes.",
      finalCta: "Discuss pricing",
    },
  },
};

const productPagesIt: typeof productPagesEn = {
  ...productPagesEn,
  productNavLabel: "Pagine prodotto",
  pages: {
    ...productPagesEn.pages,
    candidates: {
      eyebrow: "Prodotto per candidati",
      title: "Spazio candidato",
      accent: "un profilo che continua a lavorare.",
      body:
        "Uno spazio dedicato a chi si candida: import del CV, un colloquio adattivo, scorecard calibrate, controllo dei match e una dashboard tranquilla per ogni passo successivo.",
      primaryCta: "Fai il colloquio",
      secondaryCta: "Vedi i team di selezione",
      productNavLabel: "Pagine prodotto",
      stageKicker: "Segnale candidato",
      stageTitle: "Il lavoro si fa una volta, poi cresce in silenzio.",
      metrics: [
        { value: "1", label: "profilo usato con ogni azienda compatibile" },
        { value: "20m", label: "colloquio adattivo invece di candidature ripetute" },
        { value: "48h", label: "prima finestra di match dopo il colloquio completo" },
      ],
      heroNodes: [
        { label: "Stato CV", value: "verificato" },
        { label: "Colloquio", value: "completo" },
        { label: "Controllo match", value: "privato" },
        { label: "Feedback", value: "umano" },
      ],
      chapters: [
        {
          meta: "01 profilo",
          title: "Il CV diventa un profilo vivo.",
          body:
            "I candidati caricano tutto una volta, controllano l'estrazione e decidono cosa diventa visibile. Il prodotto trasforma i moduli ripetuti in una fonte unica e modificabile.",
        },
        {
          meta: "02 colloquio",
          title: "Il colloquio raccoglie segnale senza pressione.",
          body:
            "Moduli brevi raccolgono comunicazione, giudizio, lingua e preferenze di ruolo. Le domande di follow-up appaiono solo dove aggiungono segnale utile.",
        },
        {
          meta: "03 match",
          title: "Ogni match arriva con contesto, non mistero.",
          body:
            "I candidati vedono ruolo, motivo e passo successivo prima di condividere altro. Possono accettare, rifiutare o restare privati senza rumore.",
        },
      ],
      capabilities: [
        {
          meta: "Privacy",
          title: "Visibilita guidata dal consenso",
          body:
            "Nessuna azienda vede il profilo di un candidato finche il candidato dice si. Questo principio resta visibile in tutta la pagina e nel flusso del prodotto.",
        },
        {
          meta: "Segnale",
          title: "Una sola scorecard",
          body:
            "La stessa evidenza calibrata segue il candidato, cosi ogni azienda valuta lo stesso segnale pulito invece di un pitch riscritto.",
        },
        {
          meta: "Slancio",
          title: "Prossimi passi spiegati",
          body:
            "Match e rifiuti sono scritti come azioni chiare, rendendo il prodotto rispettoso anche quando la risposta e no.",
        },
      ],
      finalHeading: "Meriti una vera conversazione, non una inbox silenziosa.",
      finalBody: "gratis - 20 minuti - senza impegno",
      finalCta: "Fai il tuo colloquio AI",
      candidateExperience: candidateExperienceIt,
    },
    hiringTeams: {
      ...productPagesEn.pages.hiringTeams,
      eyebrow: "Prodotto per team di selezione",
      title: "Sala controllo assunzioni",
      accent: "leggi il segnale, non la pila.",
      body:
        "Una pagina prodotto per recruiter e manager: intake candidato calibrato, scorecard basate su evidenze, code di review, trascrizioni, scheduling e pricing allineato alla performance.",
      primaryCta: "Prenota una demo",
      secondaryCta: "Vedi candidati",
      productNavLabel: "Pagine prodotto",
      stageKicker: "Workflow team",
      stageTitle: "Una dashboard piu silenziosa per decisioni di hiring piu veloci e migliori.",
      metrics: [
        { value: "14", label: "candidati qualificati da rivedere invece di 312" },
        { value: "9:08", label: "inviti calendario inviati da una shortlist mattutina" },
        { value: "1", label: "vista evidenze condivisa per ogni debrief" },
      ],
      heroNodes: [
        { label: "Pipeline", value: "ordinata" },
        { label: "Evidenze", value: "timestamp" },
        { label: "Calendario", value: "sincronizzato" },
        { label: "Debrief", value: "condiviso" },
      ],
      chapters: [
        {
          meta: "01 calibra",
          title: "Definisci l'asticella prima che arrivino i candidati.",
          body:
            "I team impostano soglie e priorita del ruolo in anticipo, poi ricevono candidati gia valutati contro lo stesso standard.",
        },
        {
          meta: "02 review",
          title: "Apri le evidenze, non un altro spreadsheet.",
          body:
            "Ogni vista candidato collega punteggi a momenti della trascrizione, preferenze di ruolo e prove che il team puo discutere insieme.",
        },
        {
          meta: "03 agenda",
          title: "Passa dalla shortlist alla conversazione rapidamente.",
          body:
            "La dashboard trasforma una review qualificata in un'azione calendario, cosi i team passano meno tempo a smistare e piu tempo a intervistare le persone giuste.",
        },
      ],
      capabilities: [
        {
          meta: "Calibrazione",
          title: "Soglie specifiche per ruolo",
          body:
            "Le scorecard possono pesare lingua, immaginazione di ruolo, coding, giudizio cliente o qualsiasi segnale conti per quel ruolo.",
        },
        {
          meta: "Review",
          title: "Trascrizioni timestampate",
          body:
            "I team saltano al momento esatto che spiega un punteggio invece di fidarsi di un riassunto black-box.",
        },
        {
          meta: "Ops",
          title: "Passaggio al calendario",
          body:
            "Lo scheduling e parte del flusso prodotto, non un'attivita admin separata dopo la review utile.",
        },
      ],
      finalHeading: "Fai sembrare la pagina hiring come il prodotto reale.",
      finalBody:
        "Questa route offre ai team di selezione una storia focalizzata con dashboard, prove e workflow invece di un'altra sezione landing generica.",
      finalCta: "Parla con il team hiring",
      hiringTeamsExperience: hiringTeamsExperienceIt,
    },
  },
};

const productPagesFr: typeof productPagesEn = {
  ...productPagesEn,
  productNavLabel: "Pages produit",
  pages: {
    ...productPagesEn.pages,
    candidates: {
      eyebrow: "Produit candidat",
      title: "Espace candidat",
      accent: "un profil qui continue a travailler.",
      body:
        "Un espace dedie a la personne qui postule : import du CV, entretien adaptatif, scorecards calibrees, controle des matchs et tableau de bord calme pour chaque prochaine etape.",
      primaryCta: "Passer l'entretien",
      secondaryCta: "Voir les equipes RH",
      productNavLabel: "Pages produit",
      stageKicker: "Signal candidat",
      stageTitle: "Le travail se fait une fois, puis continue en silence.",
      metrics: [
        { value: "1", label: "profil porte vers chaque entreprise compatible" },
        { value: "20m", label: "entretien adaptatif au lieu de candidatures repetees" },
        { value: "48h", label: "premiere fenetre de match apres l'entretien termine" },
      ],
      heroNodes: [
        { label: "Etat du CV", value: "verifie" },
        { label: "Entretien", value: "termine" },
        { label: "Controle match", value: "prive" },
        { label: "Feedback", value: "humain" },
      ],
      chapters: [
        {
          meta: "01 profil",
          title: "Le CV devient un profil vivant.",
          body:
            "Les candidats importent une fois, verifient l'extraction et gardent le controle de ce qui devient visible. Le produit remplace les formulaires repetes par une source unique et modifiable.",
        },
        {
          meta: "02 entretien",
          title: "L'entretien capte le signal sans theatre de pression.",
          body:
            "Des modules courts recueillent communication, jugement, langue et preferences de role. Les relances apparaissent seulement quand elles ajoutent un signal utile.",
        },
        {
          meta: "03 matchs",
          title: "Chaque match arrive avec du contexte, pas du mystere.",
          body:
            "Les candidats voient le role, la raison et la prochaine etape avant de partager plus. Ils peuvent accepter, refuser ou rester prives sans bruit.",
        },
      ],
      capabilities: [
        {
          meta: "Confidentialite",
          title: "Visibilite par consentement",
          body:
            "Aucune entreprise ne voit le profil candidat tant que le candidat ne dit pas oui. Ce principe reste visible dans la page et dans le flux produit.",
        },
        {
          meta: "Signal",
          title: "Une seule scorecard",
          body:
            "La meme preuve calibree accompagne le candidat, pour que chaque entreprise evalue le meme signal propre au lieu d'un pitch reecrit.",
        },
        {
          meta: "Elan",
          title: "Prochaines etapes expliquees",
          body:
            "Les matchs et les refus sont rediges comme des actions claires, ce qui rend le produit respectueux meme quand la reponse est non.",
        },
      ],
      finalHeading: "Vous meritez une vraie conversation, pas une boite mail silencieuse.",
      finalBody: "gratuit - 20 minutes - sans engagement",
      finalCta: "Passer votre entretien IA",
      candidateExperience: candidateExperienceFr,
    },
    hiringTeams: {
      ...productPagesEn.pages.hiringTeams,
      eyebrow: "Produit equipe RH",
      title: "Salle de controle recrutement",
      accent: "lire le signal, pas la pile.",
      body:
        "Une page produit pour recruteurs et managers : intake candidat calibre, scorecards avec preuves, files de revue, transcriptions, planification et prix aligne sur la performance.",
      primaryCta: "Reserver une demo",
      secondaryCta: "Voir candidats",
      productNavLabel: "Pages produit",
      stageKicker: "Workflow equipe",
      stageTitle: "Un tableau de bord plus calme pour des decisions de recrutement plus rapides et meilleures.",
      metrics: [
        { value: "14", label: "candidats qualifies a revoir au lieu de 312" },
        { value: "9:08", label: "invitations calendrier envoyees depuis une shortlist du matin" },
        { value: "1", label: "vue preuve partagee pour chaque debrief" },
      ],
      heroNodes: [
        { label: "Pipeline", value: "classe" },
        { label: "Preuves", value: "timestamp" },
        { label: "Calendrier", value: "synchronise" },
        { label: "Debrief", value: "partage" },
      ],
      chapters: [
        {
          meta: "01 calibrer",
          title: "Fixez le niveau avant l'arrivee des candidats.",
          body:
            "Les equipes definissent les seuils et priorites du role en amont, puis recoivent des candidats deja scores selon le meme standard.",
        },
        {
          meta: "02 revue",
          title: "Ouvrez les preuves, pas une autre feuille de calcul.",
          body:
            "Chaque vue candidat relie les scores aux moments de transcription, preferences de role et preuves que l'equipe peut discuter ensemble.",
        },
        {
          meta: "03 planifier",
          title: "Passez rapidement de la shortlist a la conversation.",
          body:
            "Le tableau de bord transforme une revue qualifiee en action calendrier, pour que les equipes passent moins de temps a trier et plus de temps a interviewer les bonnes personnes.",
        },
      ],
      capabilities: [
        {
          meta: "Calibration",
          title: "Seuils specifiques au role",
          body:
            "Les scorecards peuvent ponderer langue, imagination du role, code, jugement client ou tout signal important pour le role.",
        },
        {
          meta: "Revue",
          title: "Transcriptions timestamp",
          body:
            "Les equipes sautent au moment exact qui explique un score au lieu de faire confiance a un resume black-box.",
        },
        {
          meta: "Ops",
          title: "Passage calendrier",
          body:
            "La planification fait partie du flux produit, pas d'une tache admin separee apres la revue utile.",
        },
      ],
      finalHeading: "Faites ressembler la page hiring au vrai produit.",
      finalBody:
        "Cette route donne aux equipes RH une histoire focalisee avec dashboards, preuves et workflow plutot qu'une autre section landing generique.",
      finalCta: "Parler aux equipes RH",
      hiringTeamsExperience: hiringTeamsExperienceFr,
    },
  },
};

const en = {
  brand: "Assumerai",
  nav: {
    how: "How it works",
    candidates: "For candidates",
    companies: "For companies",
    pricing: "Pricing",
    contact: "Contact",
  },
  common: {
    signIn: "Sign in",
    signOut: "Sign out",
    userAccount: "User account",
    begin: "Begin",
    takeInterview: "Take the interview",
    hiringTeams: "For hiring teams",
  },
  language: {
    label: "Language",
    ariaLabel: "Select language",
    switchTo: "Switch language to",
  },
  auth: {
    accountTypeLabel: "Account type",
    candidateAccount: "Candidate",
    candidateAccountHint: "Create or enter a private candidate account.",
    companyAccount: "Company",
    companyAccountHint: "Create or enter a hiring team account.",
    continueWith: "Continue with",
    continueWithAccount: "Continue with your account",
    getStarted: "Get started with us",
    welcomeBack: "Welcome back",
    createPassword: "Create your password",
    enterPassword: "Enter your password",
    passwordHint: "Your password must be at least 6 characters long.",
    loginPasswordHint: "Use the password connected to your Assumerai account.",
    oneLastStep: "One last step",
    confirmHint: "Confirm your password to continue.",
    emailLabel: "Email",
    passwordLabel: "Password",
    confirmPasswordLabel: "Confirm Password",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    confirmPasswordPlaceholder: "Confirm Password",
    continueWithEmail: "Continue with email",
    submitPassword: "Submit password",
    signIn: "Sign in",
    finishSignUp: "Finish sign-up",
    togglePassword: "Toggle password visibility",
    toggleConfirmPassword: "Toggle confirm password visibility",
    goBack: "Go back",
    alreadyHaveAccount: "Already have an account?",
    needAccount: "Need an account?",
    loginLink: "Log in",
    signupLink: "Sign up",
    or: "OR",
    tryAgain: "Try again",
    closeDialog: "Close dialog",
    emailInvalid: "Enter a valid email and password.",
    passwordsMismatch: "Passwords do not match.",
    errorMessage: "Something went wrong. Please try again.",
    successSignup: "Welcome aboard!",
    successLogin: "Welcome back!",
    loading: [
      "Checking your details...",
      "Preparing your dashboard...",
      "Finalizing...",
    ],
  },
  profile: {
    candidate: {
      eyebrow: "Candidate profile",
      accountSuffix: "account",
      emailFallback: "Signed-in Assumerai account",
      settingsCta: "Account settings",
      stateLabel: "Account state",
      stateValue: "Private",
      stateBody:
        "Your profile is visible only to you until you approve company access.",
      joinedLabel: "Joined",
      activeLabel: "Active",
      readinessItems: [
        { label: "Account verified", value: "Done" },
        { label: "CV intake", value: "Ready" },
        { label: "Interview record", value: "Pending" },
        { label: "Visibility controls", value: "Private" },
      ],
      workflowCards: [
        {
          title: "Profile readiness",
          body:
            "Your reusable candidate profile starts with account identity, then grows with CV intake, interview answers, and consent choices.",
        },
        {
          title: "Visibility controls",
          body:
            "You decide when matched companies can see your profile. Until then, this account stays private by default.",
        },
        {
          title: "Interview record",
          body:
            "Your structured interview and scorecard will live here once the candidate workflow is connected to your account.",
        },
      ],
      preferenceTitle: "Match preferences",
      preferenceItems: [
        "Hybrid roles",
        "EU-based teams",
        "Human feedback required",
      ],
      timelineTitle: "Account timeline",
      timeline: [
        {
          label: "Account created",
          detail: "Your login is active and protected by Supabase session cookies.",
        },
        {
          label: "Profile workspace ready",
          detail: "The next product step is connecting CV intake and interview progress.",
        },
        {
          label: "Company sharing locked",
          detail: "Hiring teams cannot see your profile until you explicitly opt in.",
        },
      ],
      workspaceHref: "/candidate",
      workspaceCta: "Start candidate process",
    },
    company: {
      eyebrow: "Company profile",
      accountSuffix: "account",
      emailFallback: "Signed-in company account",
      settingsCta: "Workspace settings",
      stateLabel: "Workspace state",
      stateValue: "Active",
      stateBody:
        "Candidate access stays consent-gated while your team workspace is ready for role intake and review.",
      joinedLabel: "Joined",
      activeLabel: "Active",
      readinessItems: [
        { label: "Company verified", value: "Active" },
        { label: "Team workspace", value: "Ready" },
        { label: "Role intake", value: "Ready" },
        { label: "Candidate access", value: "Gated" },
      ],
      workflowCards: [
        {
          title: "Workspace readiness",
          body:
            "Your hiring workspace is prepared for role criteria, team reviewers, and candidate evidence once live intake is connected.",
        },
        {
          title: "Candidate access controls",
          body:
            "Companies only see candidate profiles after explicit consent, with every shared view tied to the hiring workflow.",
        },
        {
          title: "Decision record",
          body:
            "Reviews, scorecard notes, and next-step decisions will collect here so the hiring process stays accountable.",
        },
      ],
      preferenceTitle: "Hiring workspace",
      preferenceItems: [
        "Team review queue",
        "Consent-gated candidate visibility",
        "Human decision record",
      ],
      timelineTitle: "Workspace timeline",
      timeline: [
        {
          label: "Company account created",
          detail: "Your login is active and protected by Supabase session cookies.",
        },
        {
          label: "Role intake ready",
          detail: "The next product step is connecting role setup and candidate review queues.",
        },
        {
          label: "Candidate access gated",
          detail: "No candidate profile is exposed until the candidate has approved company access.",
        },
      ],
      workspaceHref: "/company/dashboard",
      workspaceCta: "Open company dashboard",
    },
    settings: {
      backLabel: "Profile",
      eyebrow: "Account settings",
      activeLabel: "Active",
      signOutTitle: "Sign out",
      signOutBody:
        "End this session on the current browser and return to the login page.",
      signOutCta: "Sign out",
      candidate: {
        emailFallback: "Signed-in Assumerai account",
        groups: [
          {
            title: "Profile identity",
            rows: [
              "Display name comes from your auth profile",
              "Candidate profile is private",
            ],
          },
          {
            title: "Privacy defaults",
            rows: [
              "Company visibility is off by default",
              "Consent is required before sharing",
            ],
          },
          {
            title: "Notifications",
            rows: [
              "Match updates will use your account email",
              "No marketing preferences are enabled here",
            ],
          },
        ],
      },
      company: {
        emailFallback: "Signed-in company account",
        groups: [
          {
            title: "Company identity",
            rows: [
              "Company name comes from your auth profile",
              "Workspace access is tied to this account",
            ],
          },
          {
            title: "Team access",
            rows: [
              "Candidate visibility remains consent-gated",
              "Reviewers will join through controlled invitations",
            ],
          },
          {
            title: "Hiring notifications",
            rows: [
              "Review updates will use your account email",
              "No marketing preferences are enabled here",
            ],
          },
        ],
      },
    },
  },
  companyDashboard: {
    workspaceLabel: "Company workspace",
    actions: {
      companyProfile: "Company profile",
      companyDetails: "Company details",
      newRole: "New role",
      finishSetup: "Finish company setup",
      createFirstRole: "Create first role",
      completeOnboarding: "Complete onboarding",
      saveEdits: "Save edits",
      pause: "Pause",
      close: "Close",
      activate: "Activate",
      reopen: "Reopen",
    },
    onboarding: {
      title: "Onboarding incomplete",
      body:
        "Add company name, website, hiring locations, team size, and primary contact before reviewing candidates.",
    },
    metrics: {
      activeRoles: "Active roles",
      acceptedCandidates: "Accepted candidates",
      overdueReviews: "Overdue reviews",
      unresolvedHolds: "Unresolved holds",
    },
    nav: {
      label: "Company dashboard navigation",
      workspace: "Hiring workspace",
      overview: "Overview",
      roles: "Roles",
      candidates: "Candidates",
      schedule: "Schedule",
      analytics: "Analytics",
      settings: "Team settings",
      visibleMatches: "visible matches",
    },
    search: {
      label: "Search company workspace",
      placeholder: "Search candidates, roles, transcripts...",
    },
    overview: {
      greeting: "Good morning",
      focusLabel: "Role workspace",
      focusPrefix: "Reviewing",
      summary:
        "Review accepted candidates, role health, and deadlines from one compact workspace.",
      allSystems: "All systems calm",
      consentGated: "Consent-gated",
    },
    metricDetails: {
      activeRoles: "Open roles your team can match against.",
      acceptedCandidates: "Candidates who accepted sharing.",
      overdueReviews: "Review deadlines that need attention.",
      unresolvedHolds: "Holds still waiting for follow-up.",
    },
    firstRun: {
      startLabel: "Start here",
      firstRunTitle:
        "Set up one role, then review candidates as they accept sharing.",
      body: "The dashboard stays simple until there is a role to match against.",
      stepsLabel: "Company setup steps",
      companyDetails: "Company details",
      companyDetailsTodo: "Add the company basics.",
      ready: "Ready.",
      firstRole: "First role",
      firstRoleBody: "Create the role candidates should match to.",
      candidateQueue: "Candidate queue",
      candidateQueueBody: "Accepted candidate matches appear here.",
      fallbackTitle: "Set up your hiring workspace",
      fallbackBody:
        "Confirm the company details once, then create the first role your team wants candidates matched against.",
      stepLabel: "Step",
      backToProfile: "Back to company profile",
    },
    panels: {
      workspaceMetrics: "Workspace metrics",
      roleDetail: "Role detail",
      roles: "Roles",
      queueViews: "queue views",
      candidateQueues: "Candidate queues",
      candidateQueuesHint: "Consent-gated matches awaiting human review",
    },
    queues: {
      new: {
        label: "New",
        description: "Candidate accepted",
      },
      hold: {
        label: "On hold",
        description: "Follow-up scheduled",
      },
      overdue: {
        label: "Overdue",
        description: "Review deadline passed",
      },
      advanced: {
        label: "Advanced",
        description: "Next step requested",
      },
      declined: {
        label: "Declined",
        description: "Feedback sent",
      },
    },
    empty: {
      roles: "Create a structured role before candidates can match.",
      queue: "No candidates in this queue.",
      noMatches:
        "Accepted candidate matches will appear here after candidates choose to share with your company.",
      noUpcomingReviews: "No review deadlines are waiting right now.",
      noSearchResults: "No accepted matches or roles match this search.",
    },
    candidateTable: {
      title: "Ready for review",
      subtitle: "Accepted candidate matches, sorted for fast human review.",
      controls: "Candidate table controls",
      filters: "Filters",
      sortScore: "Sort score",
      candidate: "Candidate",
      role: "Role",
      score: "Score",
      status: "Status",
      action: "Action",
      allRoles: "All roles",
      emptyTitle: "No accepted candidates yet",
      contactVisible: "Contact visible",
      contactHidden: "Contact hidden",
      openReview: "Review",
    },
    rolePipeline: {
      title: "Role pipeline",
      subtitle: "Open roles and review pressure by queue.",
      allRoles: "All roles",
      accepted: "accepted",
      overdue: "late",
      emptyTitle: "No roles yet",
      roleDetailHint: "Edit this role and manage its lifecycle.",
    },
    scheduleReview: {
      title: "Schedule and review",
      subtitle: "Deadlines, holds, and next human actions.",
      emptyTitle: "No scheduled reviews",
      noDate: "No date set",
      overdue: "Overdue",
      followUp: "Follow-up",
      review: "Review",
    },
    analytics: {
      title: "Analytics",
      subtitle: "Simple hiring signals from accepted matches.",
      advanceRate: "Advance rate",
      averageScore: "Average score",
      reviewLoad: "Review load",
      noData: "No data",
    },
    role: {
      locationPending: "Location pending",
      open: "Open",
      overdue: "Overdue",
      title: "Role title",
      locations: "Locations",
      workModes: "Work modes",
      requiredSkills: "Required skills",
      clientFacingPercentage: "Client-facing percentage",
      meetingLoad: "Meeting load",
      meetingMedium: "Medium",
      meetingLow: "Low",
      meetingHigh: "High",
      statusClosed: "Closed",
      statusPaused: "Paused",
      statusActive: "Active",
    },
    match: {
      daysLeft: "{days} days left",
      dueToday: "Verdict due today",
      overdueByDays: "Overdue by {days} days",
      advanced: "Advanced",
      hold: "On hold",
      declined: "Declined",
      new: "New",
      reviewDueAt: "Review due",
      pending: "pending",
    },
  },
  companyOnboarding: {
    eyebrow: "Company onboarding",
    title: "Confirm the workspace profile",
    body:
      "This keeps candidate evidence consent-gated and gives reviewers the right company context.",
    companyProfile: "Company profile",
    companyName: "Company name",
    website: "Website",
    websitePlaceholder: "https://example.com",
    domain: "Company domain",
    domainPlaceholder: "example.com",
    domainHelp:
      "Used for company verification and current-employer privacy blocking.",
    hiringLocations: "Hiring locations",
    hiringLocationsPlaceholder: "Italy, Remote EU, CET overlap",
    teamSize: "Team size",
    selectTeamSize: "Select team size",
    primaryContact: "Primary contact",
    contactName: "Contact name",
    contactEmail: "Contact email",
    submit: "Save profile",
    errors: {
      missing_required_fields:
        "Company name, website or domain, hiring locations, team size, and primary contact are required.",
      save_failed: "The company profile could not be saved. Try again.",
      default: "Check the company profile details and try again.",
    },
  },
  companyRoleWizard: {
    eyebrow: "Structured role intake",
    title: "New role",
    basics: "Basics",
    requirements: "Requirements",
    dailyWork: "Daily work reality",
    calibration: "Calibration",
    roleTitle: "Role title",
    roleTitlePlaceholder: "Tech Risk Analyst",
    locationConstraints: "Location or time-zone constraints",
    locationConstraintsPlaceholder: "Italy, Remote EU, CET overlap",
    workModes: "Work modes",
    workModesPlaceholder: "Hybrid, Remote, Office",
    requiredSkills: "Required skills",
    requiredSkillsPlaceholder: "SQL analysis, client documentation, risk controls",
    niceToHaveSkills: "Nice-to-have skills",
    niceToHaveSkillsPlaceholder: "Python, audit tooling, process mining",
    hardGates: "Hard gates with lawful basis",
    hardGatesPlaceholder:
      "Work authorization for Italy | Role-essential client access requirement",
    clientFacingPercentage: "Client-facing percentage",
    meetingLoad: "Meeting load",
    deliveryPace: "Delivery pace",
    travel: "Travel",
    teamPattern: "Team pattern",
    ambiguityLevel: "Ambiguity level",
    requiredEvidence: "Required evidence",
    requiredEvidencePlaceholder: "Customer scenario, SQL evidence, risk reasoning",
    interviewModules: "Interview modules",
    interviewModulesPlaceholder: "client_scenario, risk_reasoning",
    submit: "Create role",
    errorDefault: "Check the role details and complete the required fields.",
    options: {
      medium: "Medium",
      low: "Low",
      high: "High",
      steady: "Steady",
      fast: "Fast",
      variable: "Variable",
      none: "None",
      occasional: "Occasional",
      frequent: "Frequent",
      mixed: "Mixed",
      mostlyTeam: "Mostly team",
      mostlySolo: "Mostly solo",
    },
  },
  companyReview: {
    evidenceReview: "Evidence review",
    reviewDue: "Review due",
    reviewDuePending: "Review due date pending",
    consentScope: "Consent scope",
    rawCvMediaExcluded:
      "Raw CV files and raw interview media stay excluded from company review.",
    scorecard: "Scorecard",
    matchScore: "Match score",
    confidence: "Confidence",
    contact: "Contact",
    contactVisible: "Visible after advance",
    contactHidden: "Hidden until advance",
    matchExplanation: "Match explanation",
    transcript: "Transcript",
    excerpt: "Excerpt",
    fullTranscript: "Full transcript",
    rawMediaExcluded: "Raw interview media is not shared.",
    integritySignals: "Interview integrity signals",
    integritySignalsIntro:
      "Neutral session signals collected during the interview (tab switches, focus changes, long pauses). They are context for your human review and never affect any score.",
    integrityNoSignals: "No integrity signals were recorded for this interview.",
    integrityNeverScored: "These signals are informational only — they are never used in score computation.",
    auditHistory: "Audit history",
    currentStatus: "Current status",
    humanReviewReason: "Human review reason",
    noDecision: "No company decision recorded yet.",
    nextStep: "Next step",
    pending: "Pending",
    followUp: "Follow-up",
    notScheduled: "Not scheduled",
    decision: "Decision",
    decisionBody:
      "Record a human decision with a candidate-visible reason. Holds keep the SLA unresolved until a later review.",
    reason: "Reason",
    reasonPlaceholder: "Clear candidate-visible reason",
    nextStepPlaceholder:
      "Recruiter screen, case review, hiring manager review",
    followUpDate: "Follow-up date",
    advance: "Advance",
    hold: "Hold",
    decline: "Decline",
    consentCategories: {
      profile: "Profile",
      scorecard: "Scorecard",
      match_explanation: "Match explanation",
      interview_transcript: "Interview transcript",
    },
    statuses: {
      advanced: "Advanced",
      hold: "On hold",
      declined: "Declined",
      candidateAccepted: "Candidate accepted",
    },
  },
  mobileNav: {
    open: "Open navigation menu",
    close: "Close navigation menu",
  },
  hero: {
    line1: "The job app",
    line2: "you'll only ever use",
    line3: "once.",
    freeForCandidates: "Free for candidates, always.",
    testRoute: "Test route: isolated hero with mobile optimization",
  },
  videoHero: {
    eyebrow: "Free for candidates, always.",
    titleLead: "One CV. One interview.",
    titleAccent: "Get matched.",
    columns: [
      {
        title: "one",
        word: "Resume",
        note: "It's environmentally friendly",
      },
      {
        title: "one",
        word: "Interview",
        note: "Enough for skilled",
      },
      {
        title: "GET",
        word: "Matched",
        note: "",
      },
    ],
    alwaysFree: "Always free",
    body:
      "Upload your CV once, then stop repeating yourself. One profile, matched to companies that fit.",
    primaryCta: "Start the interview",
    secondaryCta: "For companies",
  },
  globe: {
    headingLine1: "Job hunting is",
    headingLine2: "a tax on everyone.",
    body:
      "Candidates rewrite the same CV thirty times. Recruiters skim 312 applications to find 14. Both sides are exhausted before the first conversation that matters. We thought: what if you did the work once, and the system did the rest?",
    stats: [
      {
        value: "312",
        label: "applications a recruiter skims to find one hire",
      },
      {
        value: "38",
        label: "days the average graduate spends searching",
      },
      {
        value: "8%",
        label: 'of applicants ever hear a "no" with a reason',
      },
    ],
  },
  process: {
    heading: "Three steps. Then you're done.",
    body:
      'No cover letters, no LinkedIn rituals, no waiting for someone to "review your application."',
    stepLabel: "Step",
    ofLabel: "of",
    ready: "Ready",
    steps: [
      {
        number: "01",
        label: "STEP 01",
        badge: "8 min",
        title: "Drop your CV. We extract, you confirm.",
        body:
          "PDF, DOCX, or your LinkedIn export. We pull out experience, education, languages - you sanity-check, edit anything that's off.",
        summary:
          "Upload a CV or LinkedIn export, then quickly check and edit what Assumerai extracts.",
        kind: "upload",
      },
      {
        number: "02",
        label: "STEP 02",
        badge: "20 min",
        title: "Take one calm, adaptive interview.",
        body:
          "Five short modules - video, written, code. The AI listens, asks one follow-up where it matters, then steps back.",
        summary:
          "A short adaptive interview captures how you think, communicate, and solve problems.",
        kind: "interview",
      },
      {
        number: "03",
        label: "STEP 03",
        badge: "Forever",
        title: "Companies come to you. Already sold.",
        body:
          "Each match shows the role, the score, and a real sentence from the hiring team explaining why they think you fit. Decline kindly or accept.",
        summary:
          "Matches arrive with role context, fit scores, and a real reason from the hiring team.",
        kind: "matches",
      },
    ],
    modules: [
      { name: "Imagine the role", meta: "Video, 4Q" },
      { name: "English fluency", meta: "Video, 2Q" },
      { name: "AI knowledge", meta: "Text, 3Q" },
      { name: "Python live coding", meta: "Code, 1Q" },
    ],
    matches: [
      {
        role: "EY - Tech Risk Wave 24",
        location: "Milano - Hybrid",
      },
      {
        role: "ESCP - Programme Officer",
        location: "Torino - Onsite",
      },
      {
        role: "Enel - Energy Solutions",
        location: "Roma - Hybrid",
      },
    ],
  },
  outcomes: {
    headingLine1: "You did the work.",
    headingLine2: "Now let it work for you.",
    body:
      "No more tell us why you are a good fit essays. Take the interview once, in your own time, then track every match in one calm dashboard.",
    imageAlt: "Candidate calmly working while abstract hiring match panels organize around them",
    points: [
      {
        title: "One scorecard, every time",
        body:
          "No more guessing what recruiters want to see. Every company reads the same calibrated view of your strengths.",
      },
      {
        title: "Bubble selectors",
        body:
          "Tell us what your ideal company feels like, then we weight matches around the details that matter to you.",
      },
      {
        title: "Real reasons, every time",
        body:
          "Every match and every no thanks comes with a sentence from a human at the company. No black box.",
      },
      {
        title: "Your data, your call",
        body:
          "No company sees your CV without your explicit accept. Recordings are destroyed after scoring.",
      },
    ],
  },
  interview: {
    headingLine1: "Five modules.",
    headingLine2: "One quiet voice.",
    body:
      "No trick questions. No timed stress. The AI listens - and asks one good follow-up where it matters.",
    modules: [
      {
        eyebrow: "Currently asking",
        prompt: '"What kind of customer do you most want to spend your time with?"',
        meta: "Video - 4 questions",
        title: "Imagine the role",
        description:
          '"What\'s the room you walk into Monday at 9am?" We start by listening to the work you actually want.',
      },
      {
        meta: "Video - 2 questions",
        title: "English fluency",
        description:
          "A pitch and a difficult-customer story, in English. We grade thinking, not accent.",
      },
      {
        meta: "Text - 3 questions",
        title: "AI knowledge",
        description:
          "Plain-language fundamentals - hallucination, RAG vs fine-tune. We're checking judgement, not jargon.",
      },
      {
        meta: "Code - 1 task",
        title: "Python - live coding",
        description:
          "A small, real task - moving averages over a dict of sales - with tests you can run.",
      },
      {
        meta: "Video - 3 questions",
        title: "Case study - client scenario",
        description:
          'A short brief, eight minutes of you out loud. We watch how you frame ambiguity, not whether you "solve" it.',
      },
    ],
  },
  dashboard: {
    headingLine1: "Skim 14,",
    headingLine2: "not 312.",
    body:
      "Every candidate arrives pre-interviewed and pre-scored to your role's bar. Open the dashboard at 9am, send three calendar invites by 9:08, and get back to your real work.",
    cta: "Book a 20-min walkthrough",
    dashboardAlt:
      "Assumer recruiter dashboard overview with candidate scores, review actions, pipeline status, and team queue",
    dashboardViewAlt: "Assumer dashboard overview view",
    slide: "Slide",
    ofLabel: "of",
    previousScreenshot: "Previous dashboard screenshot",
    nextScreenshot: "Next dashboard screenshot",
    showScreenshot: "Show dashboard screenshot",
    shots: {
      analytics: "Analytics",
      calendar: "Calendar",
      review: "Review",
      overview: "Overview",
    },
    features: [
      {
        title: "Calibrated scoring per role",
        body:
          "Define the bar - outbound rigor >= 85, written DE >= 80 - and only candidates clearing it surface.",
      },
      {
        title: "Transcripts with timestamps",
        body:
          "Jump to the moment a candidate handled an objection, framed an English pitch, or wrote German that landed.",
      },
      {
        title: "Calendar in lockstep",
        body:
          "Propose three slots, the candidate picks one, your team's calendars stay clean. Workday and Slack tied in.",
      },
    ],
  },
  testimonials: {
    heading: "A few honest sentences.",
    body:
      "Real outcomes from candidates and teams after one interview starts carrying the signal.",
    items: [
      {
        initials: "MB",
        text:
          "I sent zero applications. By week three I had four real conversations and one offer I actually wanted.",
        name: "Marco Belluzzi",
        role: "Now at EY - Tech Risk Wave 24",
      },
      {
        initials: "AP",
        text:
          "We cut our time-to-hire from 28 days to 14 - and the people we hired are the kind of hire we used to take three months to find.",
        name: "Anna Pellegrini",
        role: "Head of People - Maremma SRL",
      },
      {
        initials: "AC",
        text: "It felt like the first interview that actually wanted to listen.",
        name: "Aïssatou Conti",
        role: "Programme Officer at ESCP",
      },
      {
        initials: "TR",
        text:
          "The transcripts changed how my team debriefs. We argue from evidence now.",
        name: "Tobias Reiner",
        role: "VP Sales",
      },
      {
        initials: "LP",
        text:
          "I got a thoughtful 'no' once. It made me a better candidate the next time.",
        name: "Lukas Pernigotti",
        role: "Recent grad",
      },
    ],
  },
  pricing: {
    headingLine1: "We get paid",
    headingLine2: "when hiring works.",
    plans: [
      {
        eyebrow: "BASE",
        name: "Platform",
        price: "\u20ac400",
        cadence: "platform",
        body:
          "Unlimited AI interviews, ATS sync, scorecards. Predictable SaaS revenue from day one.",
        iconAlt: "HR platform dashboard icon",
      },
      {
        eyebrow: "CORE",
        name: "Per hire",
        price: "\u20ac200",
        cadence: "per hire",
        body:
          "Triggered when a matched candidate is hired. Replaces external recruiters at 1/4 the cost.",
        iconAlt: "Successful hiring handshake icon",
      },
      {
        eyebrow: "ALIGNED",
        name: "Performance",
        price: "lets speak",
        cadence: "",
        body: "",
        iconAlt: "Employee performance retention icon",
      },
    ],
  },
  finalCta: {
    headingLine1: "Twenty calm minutes.",
    headingLine2Prefix: "Then it's",
    headingEmphasis: "someone else's",
    headingLine2Suffix: "turn to do the work.",
    body: "Take the interview now. We'll send your first matches within 48 hours.",
    takeInterview: "Take the interview",
    hiringTeam: "I'm a hiring team",
  },
  contactTeam: {
    eyebrow: "Contact Assumerai",
    title: "Contact us",
    body: "Reach out and we'll get in touch within 24 hours.",
    formLabel: "Contact Assumerai form",
    orbitAlt:
      "Circular portraits arranged around subtle orbit lines for the Assumerai contact page",
    fields: {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      emailPlaceholder: "Email address",
      teamSize: "Team size",
      location: "Location",
      message: "Message",
      messagePlaceholder: "Leave us a message...",
    },
    teamSizeOptions: [
      "1-50 people",
      "51-200 people",
      "201-1,000 people",
      "1,000+ people",
    ],
    locationOptions: ["Italy", "Europe", "United Kingdom", "United States"],
    privacyPrefix: "You agree to our friendly",
    privacyLink: "privacy policy",
    submit: "Send message",
    trustLabel: "Trusted signals across hiring teams",
    socials: [
      { label: "hello@assumer.ai", href: "mailto:hello@assumer.ai", kind: "mail" },
      { label: "@Assumerai", href: "https://www.linkedin.com", kind: "linkedin" },
      { label: "Talk to us", href: "#team", kind: "message" },
    ],
    team: {
      title: "Our team",
      body:
        "We craft calm hiring products through careful analysis, candidate empathy, and collaborative work with teams who want clearer signal.",
      members: [
        {
          name: "Gianmaria Ferretti",
          role: "Candidate experience, product",
          image: "/cofounders/gmaria.jpeg",
          imageAlt: "Portrait of Gianmaria Ferretti",
        },
        {
          name: "Lazar Kovacevic",
          role: "Hiring teams, architecture",
          image: "/cofounders/lazark.jpg",
          imageAlt: "Portrait of Lazar Kovacevic",
        },
      ],
    },
  },
  productPages: productPagesEn,
  footer: {
    tagline:
      "The job app you'll only ever use once. Made in Milano + Berlin, by people who've been on both sides of the table.",
    navigationLabel: "Footer navigation",
    stayClose: "Stay close",
    workEmail: "Work email",
    mailingListLabel: "Join the footer mailing list",
    note: "One short note a season. No churn-bait.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "How it works", href: "/#how" },
          { label: "For candidates", href: "/product/candidates" },
          { label: "For companies", href: "/product/hiring-teams" },
          { label: "Pricing", href: "/product/pricing" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "/contact#team" },
          { label: "Careers", href: "#" },
          { label: "Press kit", href: "#" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Trust",
        links: [
          { label: "Privacy policy", href: "/privacy-policy" },
          { label: "Terms of use", href: "/terms-of-use" },
          { label: "DPA", href: "#" },
          { label: "Bias audit", href: "#" },
          { label: "Security", href: "#" },
        ],
      },
    ],
  },
};

type TranslationContent = typeof en;

const it: TranslationContent = {
  brand: "Assumerai",
  nav: {
    how: "Come funziona",
    candidates: "Per candidati",
    companies: "Per aziende",
    pricing: "Prezzi",
    contact: "Contatti",
  },
  common: {
    signIn: "Accedi",
    signOut: "Esci",
    userAccount: "Account utente",
    begin: "Inizia",
    takeInterview: "Fai il colloquio",
    hiringTeams: "Per team di selezione",
  },
  language: {
    label: "Lingua",
    ariaLabel: "Seleziona lingua",
    switchTo: "Cambia lingua in",
  },
  auth: {
    accountTypeLabel: "Tipo di account",
    candidateAccount: "Candidato",
    candidateAccountHint: "Crea o entra in un account candidato privato.",
    companyAccount: "Azienda",
    companyAccountHint: "Crea o entra in un account per team di selezione.",
    continueWith: "Continua con",
    continueWithAccount: "Continua con il tuo account",
    getStarted: "Inizia con noi",
    welcomeBack: "Bentornato",
    createPassword: "Crea la tua password",
    enterPassword: "Inserisci la password",
    passwordHint: "La password deve avere almeno 6 caratteri.",
    loginPasswordHint: "Usa la password collegata al tuo account Assumerai.",
    oneLastStep: "Ultimo passaggio",
    confirmHint: "Conferma la password per continuare.",
    emailLabel: "Email",
    passwordLabel: "Password",
    confirmPasswordLabel: "Conferma password",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Password",
    confirmPasswordPlaceholder: "Conferma password",
    continueWithEmail: "Continua con email",
    submitPassword: "Invia password",
    signIn: "Accedi",
    finishSignUp: "Completa registrazione",
    togglePassword: "Mostra o nascondi password",
    toggleConfirmPassword: "Mostra o nascondi conferma password",
    goBack: "Indietro",
    alreadyHaveAccount: "Hai gia un account?",
    needAccount: "Ti serve un account?",
    loginLink: "Accedi",
    signupLink: "Registrati",
    or: "O",
    tryAgain: "Riprova",
    closeDialog: "Chiudi finestra",
    emailInvalid: "Inserisci email e password validi.",
    passwordsMismatch: "Le password non coincidono.",
    errorMessage: "Qualcosa e andato storto. Riprova.",
    successSignup: "Benvenuto a bordo!",
    successLogin: "Bentornato!",
    loading: [
      "Controllo i dati...",
      "Preparo la dashboard...",
      "Finalizzo...",
    ],
  },
  profile: {
    candidate: {
      eyebrow: "Profilo candidato",
      accountSuffix: "account",
      emailFallback: "Account Assumerai connesso",
      settingsCta: "Impostazioni account",
      stateLabel: "Stato account",
      stateValue: "Privato",
      stateBody:
        "Il tuo profilo e visibile solo a te finche non approvi l'accesso di un'azienda.",
      joinedLabel: "Iscrizione",
      activeLabel: "Attivo",
      readinessItems: [
        { label: "Account verificato", value: "Fatto" },
        { label: "Import CV", value: "Pronto" },
        { label: "Colloquio", value: "In attesa" },
        { label: "Controlli visibilita", value: "Privato" },
      ],
      workflowCards: [
        {
          title: "Profilo pronto",
          body:
            "Il profilo candidato riutilizzabile parte dall'identita account, poi cresce con CV, risposte e consensi.",
        },
        {
          title: "Controlli visibilita",
          body:
            "Decidi tu quando le aziende abbinate possono vedere il profilo. Fino ad allora resta privato.",
        },
        {
          title: "Registro colloquio",
          body:
            "Il colloquio strutturato e la scorecard appariranno qui quando il workflow candidato sara collegato al tuo account.",
        },
      ],
      preferenceTitle: "Preferenze match",
      preferenceItems: [
        "Ruoli ibridi",
        "Team basati in UE",
        "Feedback umano richiesto",
      ],
      timelineTitle: "Timeline account",
      timeline: [
        {
          label: "Account creato",
          detail: "Il login e attivo e protetto dai cookie di sessione Supabase.",
        },
        {
          label: "Workspace profilo pronto",
          detail: "Il prossimo passo e collegare import CV e avanzamento colloquio.",
        },
        {
          label: "Condivisione aziende bloccata",
          detail: "I team di selezione non vedono il profilo finche non dai consenso.",
        },
      ],
      workspaceHref: "/candidate",
      workspaceCta: "Avvia percorso candidato",
    },
    company: {
      eyebrow: "Profilo azienda",
      accountSuffix: "account",
      emailFallback: "Account azienda connesso",
      settingsCta: "Impostazioni workspace",
      stateLabel: "Stato workspace",
      stateValue: "Attivo",
      stateBody:
        "L'accesso ai candidati resta vincolato al consenso mentre il workspace del team e pronto per ruoli e review.",
      joinedLabel: "Iscrizione",
      activeLabel: "Attivo",
      readinessItems: [
        { label: "Azienda verificata", value: "Attiva" },
        { label: "Workspace team", value: "Pronto" },
        { label: "Intake ruolo", value: "Pronto" },
        { label: "Accesso candidati", value: "Limitato" },
      ],
      workflowCards: [
        {
          title: "Workspace pronto",
          body:
            "Il workspace hiring e preparato per criteri ruolo, revisori del team ed evidenze candidato appena l'intake sara collegato.",
        },
        {
          title: "Controlli accesso candidati",
          body:
            "Le aziende vedono i profili candidato solo dopo consenso esplicito, con ogni vista legata al workflow di hiring.",
        },
        {
          title: "Registro decisioni",
          body:
            "Review, note scorecard e prossimi passi saranno raccolti qui per mantenere responsabile il processo.",
        },
      ],
      preferenceTitle: "Workspace hiring",
      preferenceItems: [
        "Coda review team",
        "Visibilita candidati con consenso",
        "Registro decisioni umano",
      ],
      timelineTitle: "Timeline workspace",
      timeline: [
        {
          label: "Account azienda creato",
          detail: "Il login e attivo e protetto dai cookie di sessione Supabase.",
        },
        {
          label: "Intake ruolo pronto",
          detail: "Il prossimo passo e collegare setup ruolo e code review candidati.",
        },
        {
          label: "Accesso candidati limitato",
          detail: "Nessun profilo candidato e esposto finche il candidato non approva.",
        },
      ],
      workspaceHref: "/company/dashboard",
      workspaceCta: "Apri dashboard aziendale",
    },
    settings: {
      backLabel: "Profilo",
      eyebrow: "Impostazioni account",
      activeLabel: "Attivo",
      signOutTitle: "Esci",
      signOutBody:
        "Termina questa sessione nel browser corrente e torna alla pagina di login.",
      signOutCta: "Esci",
      candidate: {
        emailFallback: "Account Assumerai connesso",
        groups: [
          {
            title: "Identita profilo",
            rows: [
              "Il nome visibile arriva dal profilo auth",
              "Il profilo candidato e privato",
            ],
          },
          {
            title: "Privacy predefinita",
            rows: [
              "La visibilita alle aziende e disattiva",
              "Serve consenso prima della condivisione",
            ],
          },
          {
            title: "Notifiche",
            rows: [
              "Gli aggiornamenti match useranno l'email account",
              "Nessuna preferenza marketing e abilitata qui",
            ],
          },
        ],
      },
      company: {
        emailFallback: "Account azienda connesso",
        groups: [
          {
            title: "Identita azienda",
            rows: [
              "Il nome azienda arriva dal profilo auth",
              "L'accesso al workspace e legato a questo account",
            ],
          },
          {
            title: "Accesso team",
            rows: [
              "La visibilita candidati resta vincolata al consenso",
              "I revisori entreranno tramite inviti controllati",
            ],
          },
          {
            title: "Notifiche hiring",
            rows: [
              "Gli aggiornamenti review useranno l'email account",
              "Nessuna preferenza marketing e abilitata qui",
            ],
          },
        ],
      },
    },
  },
  companyDashboard: {
    workspaceLabel: "Workspace aziendale",
    actions: {
      companyProfile: "Profilo azienda",
      companyDetails: "Dettagli azienda",
      newRole: "Nuovo ruolo",
      finishSetup: "Completa setup aziendale",
      createFirstRole: "Crea primo ruolo",
      completeOnboarding: "Completa onboarding",
      saveEdits: "Salva modifiche",
      pause: "Metti in pausa",
      close: "Chiudi",
      activate: "Attiva",
      reopen: "Riapri",
    },
    onboarding: {
      title: "Onboarding incompleto",
      body:
        "Aggiungi nome azienda, sito, sedi hiring, dimensione team e contatto principale prima di rivedere candidati.",
    },
    metrics: {
      activeRoles: "Ruoli attivi",
      acceptedCandidates: "Candidati accettati",
      overdueReviews: "Review scadute",
      unresolvedHolds: "Hold aperti",
    },
    nav: {
      label: "Navigazione dashboard azienda",
      workspace: "Workspace hiring",
      overview: "Overview",
      roles: "Ruoli",
      candidates: "Candidati",
      schedule: "Agenda",
      analytics: "Analytics",
      settings: "Impostazioni team",
      visibleMatches: "match visibili",
    },
    search: {
      label: "Cerca nel workspace azienda",
      placeholder: "Cerca candidati, ruoli, trascrizioni...",
    },
    overview: {
      greeting: "Buongiorno",
      focusLabel: "Workspace ruolo",
      focusPrefix: "Review di",
      summary:
        "Rivedi candidati accettati, salute dei ruoli e scadenze da un workspace compatto.",
      allSystems: "Tutto sotto controllo",
      consentGated: "Vincolato al consenso",
    },
    metricDetails: {
      activeRoles: "Ruoli aperti su cui il team puo fare match.",
      acceptedCandidates: "Candidati che hanno accettato la condivisione.",
      overdueReviews: "Scadenze review che richiedono attenzione.",
      unresolvedHolds: "Hold ancora in attesa di follow-up.",
    },
    firstRun: {
      startLabel: "Inizia qui",
      firstRunTitle:
        "Configura un ruolo, poi rivedi i candidati quando accettano la condivisione.",
      body: "La dashboard resta semplice finche non c'e un ruolo su cui fare match.",
      stepsLabel: "Passaggi setup azienda",
      companyDetails: "Dettagli azienda",
      companyDetailsTodo: "Aggiungi le informazioni azienda.",
      ready: "Pronto.",
      firstRole: "Primo ruolo",
      firstRoleBody: "Crea il ruolo a cui i candidati devono corrispondere.",
      candidateQueue: "Coda candidati",
      candidateQueueBody: "I match candidato accettati appariranno qui.",
      fallbackTitle: "Configura il workspace hiring",
      fallbackBody:
        "Conferma una volta i dettagli azienda, poi crea il primo ruolo su cui il team vuole ricevere match.",
      stepLabel: "Step",
      backToProfile: "Torna al profilo azienda",
    },
    panels: {
      workspaceMetrics: "Metriche workspace",
      roleDetail: "Dettaglio ruolo",
      roles: "Ruoli",
      queueViews: "viste coda",
      candidateQueues: "Code candidati",
      candidateQueuesHint: "Match con consenso in attesa di review umana",
    },
    queues: {
      new: {
        label: "Nuovi",
        description: "Candidato accettato",
      },
      hold: {
        label: "In attesa",
        description: "Follow-up programmato",
      },
      overdue: {
        label: "Scaduti",
        description: "Deadline review superata",
      },
      advanced: {
        label: "Avanzati",
        description: "Prossimo step richiesto",
      },
      declined: {
        label: "Rifiutati",
        description: "Feedback inviato",
      },
    },
    empty: {
      roles: "Crea un ruolo strutturato prima che i candidati possano fare match.",
      queue: "Nessun candidato in questa coda.",
      noMatches:
        "I match candidati accettati appariranno qui dopo che i candidati scelgono di condividere con la tua azienda.",
      noUpcomingReviews: "Nessuna scadenza review in attesa ora.",
      noSearchResults: "Nessun match accettato o ruolo corrisponde a questa ricerca.",
    },
    candidateTable: {
      title: "Pronti per la review",
      subtitle: "Match candidati accettati, ordinati per review umana rapida.",
      controls: "Controlli tabella candidati",
      filters: "Filtri",
      sortScore: "Ordina score",
      candidate: "Candidato",
      role: "Ruolo",
      score: "Score",
      status: "Stato",
      action: "Azione",
      allRoles: "Tutti i ruoli",
      emptyTitle: "Nessun candidato accettato",
      contactVisible: "Contatto visibile",
      contactHidden: "Contatto nascosto",
      openReview: "Review",
    },
    rolePipeline: {
      title: "Pipeline ruoli",
      subtitle: "Ruoli aperti e pressione review per coda.",
      allRoles: "Tutti i ruoli",
      accepted: "accettati",
      overdue: "in ritardo",
      emptyTitle: "Nessun ruolo",
      roleDetailHint: "Modifica questo ruolo e gestisci il ciclo di vita.",
    },
    scheduleReview: {
      title: "Agenda e review",
      subtitle: "Scadenze, hold e prossime azioni umane.",
      emptyTitle: "Nessuna review programmata",
      noDate: "Nessuna data",
      overdue: "Scaduta",
      followUp: "Follow-up",
      review: "Review",
    },
    analytics: {
      title: "Analytics",
      subtitle: "Segnali hiring semplici dai match accettati.",
      advanceRate: "Tasso avanzamento",
      averageScore: "Score medio",
      reviewLoad: "Carico review",
      noData: "Nessun dato",
    },
    role: {
      locationPending: "Sede in attesa",
      open: "Aperti",
      overdue: "Scaduti",
      title: "Titolo ruolo",
      locations: "Sedi",
      workModes: "Modalita lavoro",
      requiredSkills: "Skill richieste",
      clientFacingPercentage: "Percentuale cliente",
      meetingLoad: "Carico meeting",
      meetingMedium: "Medio",
      meetingLow: "Basso",
      meetingHigh: "Alto",
      statusClosed: "Chiuso",
      statusPaused: "In pausa",
      statusActive: "Attivo",
    },
    match: {
      daysLeft: "Mancano {days} giorni",
      dueToday: "Verdetto in scadenza oggi",
      overdueByDays: "In ritardo di {days} giorni",
      advanced: "Avanzato",
      hold: "In attesa",
      declined: "Rifiutato",
      new: "Nuovo",
      reviewDueAt: "Review entro",
      pending: "in attesa",
    },
  },
  companyOnboarding: {
    eyebrow: "Onboarding azienda",
    title: "Conferma il profilo workspace",
    body:
      "Mantiene le evidenze candidato vincolate al consenso e da ai reviewer il contesto aziendale corretto.",
    companyProfile: "Profilo azienda",
    companyName: "Nome azienda",
    website: "Sito web",
    websitePlaceholder: "https://example.com",
    domain: "Dominio azienda",
    domainPlaceholder: "example.com",
    domainHelp:
      "Usato per verifica azienda e blocco privacy dell'attuale datore di lavoro.",
    hiringLocations: "Sedi di hiring",
    hiringLocationsPlaceholder: "Italia, Remote EU, sovrapposizione CET",
    teamSize: "Dimensione team",
    selectTeamSize: "Seleziona dimensione team",
    primaryContact: "Contatto principale",
    contactName: "Nome contatto",
    contactEmail: "Email contatto",
    submit: "Salva profilo",
    errors: {
      missing_required_fields:
        "Nome azienda, sito o dominio, sedi hiring, dimensione team e contatto principale sono obbligatori.",
      save_failed: "Il profilo azienda non e stato salvato. Riprova.",
      default: "Controlla i dettagli del profilo azienda e riprova.",
    },
  },
  companyRoleWizard: {
    eyebrow: "Intake ruolo strutturato",
    title: "Nuovo ruolo",
    basics: "Base",
    requirements: "Requisiti",
    dailyWork: "Realta quotidiana del lavoro",
    calibration: "Calibrazione",
    roleTitle: "Titolo ruolo",
    roleTitlePlaceholder: "Tech Risk Analyst",
    locationConstraints: "Vincoli sede o fuso orario",
    locationConstraintsPlaceholder: "Italia, Remote EU, sovrapposizione CET",
    workModes: "Modalita lavoro",
    workModesPlaceholder: "Ibrido, remoto, ufficio",
    requiredSkills: "Skill richieste",
    requiredSkillsPlaceholder: "Analisi SQL, documentazione clienti, controlli rischio",
    niceToHaveSkills: "Skill preferite",
    niceToHaveSkillsPlaceholder: "Python, audit tooling, process mining",
    hardGates: "Requisiti bloccanti con base lecita",
    hardGatesPlaceholder:
      "Autorizzazione lavoro per Italia | Requisito essenziale per accesso cliente",
    clientFacingPercentage: "Percentuale verso clienti",
    meetingLoad: "Carico meeting",
    deliveryPace: "Ritmo delivery",
    travel: "Trasferte",
    teamPattern: "Schema team",
    ambiguityLevel: "Livello ambiguita",
    requiredEvidence: "Evidenze richieste",
    requiredEvidencePlaceholder: "Scenario cliente, evidenza SQL, ragionamento rischio",
    interviewModules: "Moduli colloquio",
    interviewModulesPlaceholder: "client_scenario, risk_reasoning",
    submit: "Crea ruolo",
    errorDefault: "Controlla i dettagli ruolo e completa i campi richiesti.",
    options: {
      medium: "Medio",
      low: "Basso",
      high: "Alto",
      steady: "Stabile",
      fast: "Veloce",
      variable: "Variabile",
      none: "Nessuna",
      occasional: "Occasionale",
      frequent: "Frequente",
      mixed: "Misto",
      mostlyTeam: "Soprattutto team",
      mostlySolo: "Soprattutto individuale",
    },
  },
  companyReview: {
    evidenceReview: "Review evidenze",
    reviewDue: "Review entro",
    reviewDuePending: "Data review in attesa",
    consentScope: "Ambito consenso",
    rawCvMediaExcluded:
      "CV grezzi e media colloquio grezzi restano esclusi dalla review azienda.",
    scorecard: "Scorecard",
    matchScore: "Punteggio match",
    confidence: "Confidenza",
    contact: "Contatto",
    contactVisible: "Visibile dopo avanzamento",
    contactHidden: "Nascosto fino ad avanzamento",
    matchExplanation: "Spiegazione match",
    transcript: "Trascrizione",
    excerpt: "Estratto",
    fullTranscript: "Trascrizione completa",
    rawMediaExcluded: "Il media grezzo del colloquio non e condiviso.",
    integritySignals: "Segnali di integrita del colloquio",
    integritySignalsIntro:
      "Segnali di sessione neutri raccolti durante il colloquio (cambi di scheda, perdite di focus, pause lunghe). Sono contesto per la tua revisione umana e non influenzano mai alcun punteggio.",
    integrityNoSignals: "Nessun segnale di integrita registrato per questo colloquio.",
    integrityNeverScored: "Questi segnali sono solo informativi: non vengono mai usati nel calcolo dei punteggi.",
    auditHistory: "Storico audit",
    currentStatus: "Stato attuale",
    humanReviewReason: "Motivo review umana",
    noDecision: "Nessuna decisione azienda registrata.",
    nextStep: "Prossimo step",
    pending: "In attesa",
    followUp: "Follow-up",
    notScheduled: "Non programmato",
    decision: "Decisione",
    decisionBody:
      "Registra una decisione umana con motivo visibile al candidato. Gli hold lasciano la SLA aperta fino alla review successiva.",
    reason: "Motivo",
    reasonPlaceholder: "Motivo chiaro visibile al candidato",
    nextStepPlaceholder:
      "Screen recruiter, case review, review hiring manager",
    followUpDate: "Data follow-up",
    advance: "Avanza",
    hold: "Hold",
    decline: "Rifiuta",
    consentCategories: {
      profile: "Profilo",
      scorecard: "Scorecard",
      match_explanation: "Spiegazione match",
      interview_transcript: "Trascrizione colloquio",
    },
    statuses: {
      advanced: "Avanzato",
      hold: "In attesa",
      declined: "Rifiutato",
      candidateAccepted: "Candidato accettato",
    },
  },
  mobileNav: {
    open: "Apri il menu di navigazione",
    close: "Chiudi il menu di navigazione",
  },
  hero: {
    line1: "L'app per il lavoro",
    line2: "che userai una sola volta",
    line3: "soltanto.",
    freeForCandidates: "Gratis per i candidati, sempre.",
    testRoute: "Percorso di test: hero isolata con ottimizzazione mobile",
  },
  videoHero: {
    eyebrow: "Gratis per i candidati, sempre.",
    titleLead: "Un CV. Un colloquio.",
    titleAccent: "Match migliori.",
    columns: [
      {
        title: "un",
        word: "CV",
        note: "Piu sostenibile",
      },
      {
        title: "un",
        word: "Colloquio",
        note: "Basta se hai talento",
      },
      {
        title: "TROVA",
        word: "Match",
        note: "",
      },
    ],
    alwaysFree: "Sempre gratis",
    body:
      "Carica il CV una sola volta, poi smetti di ripeterti. Un solo profilo, abbinato ad aziende in linea con te.",
    primaryCta: "Inizia il colloquio",
    secondaryCta: "Per aziende",
  },
  globe: {
    headingLine1: "Cercare lavoro è",
    headingLine2: "una tassa per tutti.",
    body:
      "I candidati riscrivono lo stesso CV trenta volte. I recruiter scorrono 312 candidature per trovarne 14. Entrambe le parti sono esauste prima della prima conversazione che conta. Ci siamo chiesti: e se facessi il lavoro una volta sola e il sistema facesse il resto?",
    stats: [
      {
        value: "312",
        label: "candidature che un recruiter scorre per trovare una persona da assumere",
      },
      {
        value: "38",
        label: "giorni che un laureato medio passa a cercare",
      },
      {
        value: "8%",
        label: 'dei candidati riceve mai un "no" con una motivazione',
      },
    ],
  },
  process: {
    heading: "Tre passaggi. Poi hai finito.",
    body:
      'Niente lettere motivazionali, niente rituali su LinkedIn, niente attese mentre qualcuno "rivede la tua candidatura".',
    stepLabel: "Passaggio",
    ofLabel: "di",
    ready: "Pronto",
    steps: [
      {
        number: "01",
        label: "PASSO 01",
        badge: "8 min",
        title: "Carica il CV. Estraiamo, tu confermi.",
        body:
          "PDF, DOCX o export LinkedIn. Tiriamo fuori esperienze, formazione e lingue: tu controlli, correggi e sistemi ciò che non torna.",
        summary:
          "Carica un CV o un export LinkedIn, poi controlla e modifica rapidamente ciò che Assumerai estrae.",
        kind: "upload",
      },
      {
        number: "02",
        label: "PASSO 02",
        badge: "20 min",
        title: "Fai un solo colloquio calmo e adattivo.",
        body:
          "Cinque moduli brevi: video, scritto, codice. L'AI ascolta, fa un follow-up quando serve, poi si ferma.",
        summary:
          "Un breve colloquio adattivo cattura come pensi, comunichi e risolvi problemi.",
        kind: "interview",
      },
      {
        number: "03",
        label: "PASSO 03",
        badge: "Sempre",
        title: "Le aziende vengono da te. Già convinte.",
        body:
          "Ogni match mostra ruolo, punteggio e una frase reale del team di selezione sul perché pensa che tu sia adatto. Rifiuta con gentilezza o accetta.",
        summary:
          "I match arrivano con contesto sul ruolo, punteggi di fit e una motivazione reale del team.",
        kind: "matches",
      },
    ],
    modules: [
      { name: "Immagina il ruolo", meta: "Video, 4D" },
      { name: "Fluenza in inglese", meta: "Video, 2D" },
      { name: "Conoscenza AI", meta: "Testo, 3D" },
      { name: "Python live coding", meta: "Codice, 1D" },
    ],
    matches: [
      {
        role: "EY - Tech Risk Wave 24",
        location: "Milano - Ibrido",
      },
      {
        role: "ESCP - Programme Officer",
        location: "Torino - In sede",
      },
      {
        role: "Enel - Energy Solutions",
        location: "Roma - Ibrido",
      },
    ],
  },
  outcomes: {
    headingLine1: "Hai fatto il lavoro.",
    headingLine2: "Ora lascia che lavori per te.",
    body:
      "Basta temi sul perché sei la persona giusta. Fai il colloquio una volta, quando vuoi, poi segui ogni match in una dashboard tranquilla.",
    imageAlt:
      "Candidato che lavora con calma mentre pannelli astratti di match si organizzano intorno",
    points: [
      {
        title: "Una scorecard, ogni volta",
        body:
          "Niente più dubbi su cosa vogliono vedere i recruiter. Ogni azienda legge la stessa vista calibrata dei tuoi punti di forza.",
      },
      {
        title: "Selettori a bolle",
        body:
          "Dicci che sensazione deve darti l'azienda ideale, poi pesiamo i match sui dettagli che contano per te.",
      },
      {
        title: "Motivi reali, sempre",
        body:
          "Ogni match e ogni no grazie arrivano con una frase di una persona dell'azienda. Nessuna scatola nera.",
      },
      {
        title: "I tuoi dati, la tua scelta",
        body:
          "Nessuna azienda vede il tuo CV senza il tuo consenso esplicito. Le registrazioni vengono eliminate dopo il punteggio.",
      },
    ],
  },
  interview: {
    headingLine1: "Cinque moduli.",
    headingLine2: "Una voce calma.",
    body:
      "Niente domande trabocchetto. Niente stress a tempo. L'AI ascolta e fa un buon follow-up dove serve.",
    modules: [
      {
        eyebrow: "Domanda in corso",
        prompt: '"Con che tipo di cliente vorresti passare più tempo?"',
        meta: "Video - 4 domande",
        title: "Immagina il ruolo",
        description:
          '"Qual è la stanza in cui entri lunedì alle 9?" Iniziamo ascoltando il lavoro che vuoi davvero.',
      },
      {
        meta: "Video - 2 domande",
        title: "Fluenza in inglese",
        description:
          "Un pitch e una storia su un cliente difficile, in inglese. Valutiamo il ragionamento, non l'accento.",
      },
      {
        meta: "Testo - 3 domande",
        title: "Conoscenza AI",
        description:
          "Fondamentali in linguaggio semplice: hallucination, RAG vs fine-tuning. Cerchiamo giudizio, non gergo.",
      },
      {
        meta: "Codice - 1 task",
        title: "Python - live coding",
        description:
          "Un compito piccolo e reale: medie mobili su un dizionario di vendite, con test che puoi eseguire.",
      },
      {
        meta: "Video - 3 domande",
        title: "Case study - scenario cliente",
        description:
          'Un brief breve, otto minuti a voce alta. Guardiamo come inquadri l\'ambiguità, non se lo "risolvi".',
      },
    ],
  },
  dashboard: {
    headingLine1: "Guarda 14,",
    headingLine2: "non 312.",
    body:
      "Ogni candidato arriva già intervistato e valutato rispetto alla soglia del ruolo. Apri la dashboard alle 9, invii tre inviti calendario alle 9:08 e torni al lavoro vero.",
    cta: "Prenota una demo da 20 min",
    dashboardAlt:
      "Panoramica della dashboard recruiter Assumer con punteggi, azioni di review, pipeline e coda del team",
    dashboardViewAlt: "Vista panoramica della dashboard Assumer",
    slide: "Slide",
    ofLabel: "di",
    previousScreenshot: "Screenshot dashboard precedente",
    nextScreenshot: "Screenshot dashboard successivo",
    showScreenshot: "Mostra screenshot della dashboard",
    shots: {
      analytics: "Analytics",
      calendar: "Calendario",
      review: "Review",
      overview: "Panoramica",
    },
    features: [
      {
        title: "Punteggi calibrati per ruolo",
        body:
          "Definisci la soglia: rigore outbound >= 85, DE scritto >= 80. Emergono solo i candidati che la superano.",
      },
      {
        title: "Trascrizioni con timestamp",
        body:
          "Vai al momento in cui un candidato gestisce un'obiezione, imposta un pitch in inglese o scrive un tedesco efficace.",
      },
      {
        title: "Calendari sincronizzati",
        body:
          "Proponi tre slot, il candidato ne sceglie uno e i calendari del team restano puliti. Workday e Slack integrati.",
      },
    ],
  },
  testimonials: {
    heading: "Qualche frase sincera.",
    body:
      "Risultati reali da candidati e team dopo che un solo colloquio inizia a portare il segnale.",
    items: [
      {
        initials: "MB",
        text:
          "Ho inviato zero candidature. Alla terza settimana avevo quattro conversazioni vere e un'offerta che volevo davvero.",
        name: "Marco Belluzzi",
        role: "Ora in EY - Tech Risk Wave 24",
      },
      {
        initials: "AP",
        text:
          "Abbiamo ridotto il time-to-hire da 28 a 14 giorni, e le persone assunte sono quelle che prima impiegavamo tre mesi a trovare.",
        name: "Anna Pellegrini",
        role: "Head of People - Maremma SRL",
      },
      {
        initials: "AC",
        text: "È sembrato il primo colloquio che volesse davvero ascoltare.",
        name: "Aïssatou Conti",
        role: "Programme Officer presso ESCP",
      },
      {
        initials: "TR",
        text:
          "Le trascrizioni hanno cambiato i debrief del mio team. Ora discutiamo partendo dalle prove.",
        name: "Tobias Reiner",
        role: "VP Sales",
      },
      {
        initials: "LP",
        text:
          "Una volta ho ricevuto un 'no' ragionato. Mi ha reso un candidato migliore la volta dopo.",
        name: "Lukas Pernigotti",
        role: "Neolaureato",
      },
    ],
  },
  pricing: {
    headingLine1: "Veniamo pagati",
    headingLine2: "quando l'assunzione funziona.",
    plans: [
      {
        eyebrow: "BASE",
        name: "Platform",
        price: "\u20ac400",
        cadence: "platform",
        body:
          "Colloqui AI illimitati, sync ATS, scorecard. Ricavi SaaS prevedibili dal primo giorno.",
        iconAlt: "Icona dashboard piattaforma HR",
      },
      {
        eyebrow: "CORE",
        name: "Per assunzione",
        price: "\u20ac200",
        cadence: "per hire",
        body:
          "Si attiva quando un candidato abbinato viene assunto. Sostituisce i recruiter esterni a un quarto del costo.",
        iconAlt: "Icona stretta di mano per assunzione riuscita",
      },
      {
        eyebrow: "ALLINEATO",
        name: "Performance",
        price: "lets speak",
        cadence: "",
        body: "",
        iconAlt: "Icona retention e performance dipendente",
      },
    ],
  },
  finalCta: {
    headingLine1: "Venti minuti tranquilli.",
    headingLine2Prefix: "Poi tocca a",
    headingEmphasis: "qualcun altro",
    headingLine2Suffix: "fare il lavoro.",
    body: "Fai il colloquio ora. Ti invieremo i primi match entro 48 ore.",
    takeInterview: "Fai il colloquio",
    hiringTeam: "Sono un team di selezione",
  },
  contactTeam: {
    eyebrow: "Contatta Assumerai",
    title: "Contattaci",
    body: "Scrivici e ti risponderemo entro 24 ore.",
    formLabel: "Modulo di contatto Assumerai",
    orbitAlt:
      "Ritratti circolari disposti su orbite leggere per la pagina contatti di Assumerai",
    fields: {
      firstName: "Nome",
      lastName: "Cognome",
      email: "Email",
      emailPlaceholder: "Indirizzo email",
      teamSize: "Dimensione team",
      location: "Localita",
      message: "Messaggio",
      messagePlaceholder: "Lasciaci un messaggio...",
    },
    teamSizeOptions: [
      "1-50 persone",
      "51-200 persone",
      "201-1.000 persone",
      "1.000+ persone",
    ],
    locationOptions: ["Italia", "Europa", "Regno Unito", "Stati Uniti"],
    privacyPrefix: "Accetti la nostra",
    privacyLink: "privacy policy",
    submit: "Invia messaggio",
    trustLabel: "Segnali affidabili per team di selezione",
    socials: [
      { label: "hello@assumer.ai", href: "mailto:hello@assumer.ai", kind: "mail" },
      { label: "@Assumerai", href: "https://www.linkedin.com", kind: "linkedin" },
      { label: "Parla con noi", href: "#team", kind: "message" },
    ],
    team: {
      title: "Il team",
      body:
        "Creiamo prodotti di hiring calmi attraverso analisi attente, empatia per i candidati e lavoro collaborativo con team che vogliono segnali piu chiari.",
      members: [
        {
          name: "Gianmaria Ferretti",
          role: "Esperienza candidati, prodotto",
          image: "/cofounders/gmaria.jpeg",
          imageAlt: "Ritratto di Gianmaria Ferretti",
        },
        {
          name: "Lazar Kovacevic",
          role: "Team di selezione, architettura",
          image: "/cofounders/lazark.jpg",
          imageAlt: "Ritratto di Lazar Kovacevic",
        },
      ],
    },
  },
  productPages: productPagesIt,
  footer: {
    tagline:
      "L'app per il lavoro che userai una sola volta. Made in Milano + Berlin, da persone che sono state da entrambi i lati del tavolo.",
    navigationLabel: "Navigazione footer",
    stayClose: "Resta vicino",
    workEmail: "Email di lavoro",
    mailingListLabel: "Iscriviti alla mailing list del footer",
    note: "Una nota breve a stagione. Nessun contenuto acchiappa-click.",
    columns: [
      {
        title: "Prodotto",
        links: [
          { label: "Come funziona", href: "/#how" },
          { label: "Per candidati", href: "/product/candidates" },
          { label: "Per aziende", href: "/product/hiring-teams" },
          { label: "Prezzi", href: "/product/pricing" },
        ],
      },
      {
        title: "Azienda",
        links: [
          { label: "Chi siamo", href: "/contact#team" },
          { label: "Carriere", href: "#" },
          { label: "Press kit", href: "#" },
          { label: "Contatti", href: "/contact" },
        ],
      },
      {
        title: "Fiducia",
        links: [
          { label: "Privacy", href: "/privacy-policy" },
          { label: "Termini", href: "/terms-of-use" },
          { label: "DPA", href: "#" },
          { label: "Audit bias", href: "#" },
          { label: "Sicurezza", href: "#" },
        ],
      },
    ],
  },
};

const fr: TranslationContent = {
  brand: "Assumerai",
  nav: {
    how: "Fonctionnement",
    candidates: "Pour candidats",
    companies: "Pour entreprises",
    pricing: "Tarifs",
    contact: "Contact",
  },
  common: {
    signIn: "Se connecter",
    signOut: "Se deconnecter",
    userAccount: "Compte utilisateur",
    begin: "Commencer",
    takeInterview: "Passer l'entretien",
    hiringTeams: "Pour équipes RH",
  },
  language: {
    label: "Langue",
    ariaLabel: "Choisir la langue",
    switchTo: "Changer la langue vers",
  },
  auth: {
    accountTypeLabel: "Type de compte",
    candidateAccount: "Candidat",
    candidateAccountHint: "Creez ou ouvrez un compte candidat prive.",
    companyAccount: "Entreprise",
    companyAccountHint: "Creez ou ouvrez un compte equipe RH.",
    continueWith: "Continuer avec",
    continueWithAccount: "Continuer avec votre compte",
    getStarted: "Commencez avec nous",
    welcomeBack: "Bon retour",
    createPassword: "Creez votre mot de passe",
    enterPassword: "Entrez votre mot de passe",
    passwordHint: "Votre mot de passe doit contenir au moins 6 caracteres.",
    loginPasswordHint: "Utilisez le mot de passe lie a votre compte Assumerai.",
    oneLastStep: "Derniere etape",
    confirmHint: "Confirmez votre mot de passe pour continuer.",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    confirmPasswordLabel: "Confirmer le mot de passe",
    emailPlaceholder: "Email",
    passwordPlaceholder: "Mot de passe",
    confirmPasswordPlaceholder: "Confirmer le mot de passe",
    continueWithEmail: "Continuer avec email",
    submitPassword: "Envoyer le mot de passe",
    signIn: "Se connecter",
    finishSignUp: "Terminer l'inscription",
    togglePassword: "Afficher ou masquer le mot de passe",
    toggleConfirmPassword: "Afficher ou masquer la confirmation",
    goBack: "Retour",
    alreadyHaveAccount: "Vous avez deja un compte ?",
    needAccount: "Besoin d'un compte ?",
    loginLink: "Se connecter",
    signupLink: "S'inscrire",
    or: "OU",
    tryAgain: "Reessayer",
    closeDialog: "Fermer la fenetre",
    emailInvalid: "Entrez un email et un mot de passe valides.",
    passwordsMismatch: "Les mots de passe ne correspondent pas.",
    errorMessage: "Une erreur est survenue. Reessayez.",
    successSignup: "Bienvenue a bord !",
    successLogin: "Bon retour !",
    loading: [
      "Verification des informations...",
      "Preparation du tableau de bord...",
      "Finalisation...",
    ],
  },
  profile: {
    candidate: {
      eyebrow: "Profil candidat",
      accountSuffix: "compte",
      emailFallback: "Compte Assumerai connecte",
      settingsCta: "Parametres du compte",
      stateLabel: "Etat du compte",
      stateValue: "Prive",
      stateBody:
        "Votre profil reste visible uniquement par vous tant que vous n'approuvez pas l'acces d'une entreprise.",
      joinedLabel: "Inscription",
      activeLabel: "Actif",
      readinessItems: [
        { label: "Compte verifie", value: "Fait" },
        { label: "Import CV", value: "Pret" },
        { label: "Entretien", value: "En attente" },
        { label: "Controle visibilite", value: "Prive" },
      ],
      workflowCards: [
        {
          title: "Profil pret",
          body:
            "Votre profil candidat reutilisable part de l'identite du compte, puis grandit avec le CV, les reponses et les choix de consentement.",
        },
        {
          title: "Controle visibilite",
          body:
            "Vous decidez quand les entreprises compatibles peuvent voir votre profil. Jusque-la, il reste prive.",
        },
        {
          title: "Historique entretien",
          body:
            "Votre entretien structure et votre scorecard apparaitront ici une fois le workflow candidat connecte au compte.",
        },
      ],
      preferenceTitle: "Preferences de match",
      preferenceItems: [
        "Roles hybrides",
        "Equipes basees en UE",
        "Feedback humain requis",
      ],
      timelineTitle: "Timeline du compte",
      timeline: [
        {
          label: "Compte cree",
          detail: "Votre login est actif et protege par les cookies de session Supabase.",
        },
        {
          label: "Workspace profil pret",
          detail: "La prochaine etape relie l'import CV et l'avancement entretien.",
        },
        {
          label: "Partage entreprise bloque",
          detail: "Les equipes RH ne voient pas votre profil sans votre consentement.",
        },
      ],
      workspaceHref: "/candidate",
      workspaceCta: "Demarrer le parcours candidat",
    },
    company: {
      eyebrow: "Profil entreprise",
      accountSuffix: "compte",
      emailFallback: "Compte entreprise connecte",
      settingsCta: "Parametres workspace",
      stateLabel: "Etat du workspace",
      stateValue: "Actif",
      stateBody:
        "L'acces candidat reste soumis au consentement pendant que votre workspace est pret pour les roles et les revues.",
      joinedLabel: "Inscription",
      activeLabel: "Actif",
      readinessItems: [
        { label: "Entreprise verifiee", value: "Active" },
        { label: "Workspace equipe", value: "Pret" },
        { label: "Intake role", value: "Pret" },
        { label: "Acces candidats", value: "Controle" },
      ],
      workflowCards: [
        {
          title: "Workspace pret",
          body:
            "Votre workspace hiring est prepare pour les criteres de role, les reviewers et les preuves candidat des que l'intake est connecte.",
        },
        {
          title: "Controle acces candidats",
          body:
            "Les entreprises voient les profils candidat seulement apres consentement explicite, avec chaque vue liee au workflow hiring.",
        },
        {
          title: "Historique decisions",
          body:
            "Reviews, notes de scorecard et prochaines etapes seront rassembles ici pour garder le processus accountable.",
        },
      ],
      preferenceTitle: "Workspace hiring",
      preferenceItems: [
        "File review equipe",
        "Visibilite candidat avec consentement",
        "Historique decision humain",
      ],
      timelineTitle: "Timeline workspace",
      timeline: [
        {
          label: "Compte entreprise cree",
          detail: "Votre login est actif et protege par les cookies de session Supabase.",
        },
        {
          label: "Intake role pret",
          detail: "La prochaine etape relie le setup role et les files review candidat.",
        },
        {
          label: "Acces candidat controle",
          detail: "Aucun profil candidat n'est expose sans approbation du candidat.",
        },
      ],
      workspaceHref: "/company/dashboard",
      workspaceCta: "Ouvrir le tableau entreprise",
    },
    settings: {
      backLabel: "Profil",
      eyebrow: "Parametres du compte",
      activeLabel: "Actif",
      signOutTitle: "Se deconnecter",
      signOutBody:
        "Terminez cette session dans le navigateur actuel et revenez a la page de connexion.",
      signOutCta: "Se deconnecter",
      candidate: {
        emailFallback: "Compte Assumerai connecte",
        groups: [
          {
            title: "Identite profil",
            rows: [
              "Le nom affiche vient du profil auth",
              "Le profil candidat est prive",
            ],
          },
          {
            title: "Confidentialite par defaut",
            rows: [
              "La visibilite entreprise est desactivee",
              "Le consentement est requis avant partage",
            ],
          },
          {
            title: "Notifications",
            rows: [
              "Les mises a jour match utiliseront l'email du compte",
              "Aucune preference marketing n'est activee ici",
            ],
          },
        ],
      },
      company: {
        emailFallback: "Compte entreprise connecte",
        groups: [
          {
            title: "Identite entreprise",
            rows: [
              "Le nom entreprise vient du profil auth",
              "L'acces workspace est lie a ce compte",
            ],
          },
          {
            title: "Acces equipe",
            rows: [
              "La visibilite candidat reste soumise au consentement",
              "Les reviewers rejoindront via invitations controlees",
            ],
          },
          {
            title: "Notifications hiring",
            rows: [
              "Les mises a jour review utiliseront l'email du compte",
              "Aucune preference marketing n'est activee ici",
            ],
          },
        ],
      },
    },
  },
  companyDashboard: {
    workspaceLabel: "Espace entreprise",
    actions: {
      companyProfile: "Profil entreprise",
      companyDetails: "Details entreprise",
      newRole: "Nouveau role",
      finishSetup: "Terminer la configuration",
      createFirstRole: "Creer le premier role",
      completeOnboarding: "Terminer l'onboarding",
      saveEdits: "Enregistrer",
      pause: "Mettre en pause",
      close: "Fermer",
      activate: "Activer",
      reopen: "Rouvrir",
    },
    onboarding: {
      title: "Onboarding incomplet",
      body:
        "Ajoutez nom d'entreprise, site, lieux de recrutement, taille d'equipe et contact principal avant de revoir des candidats.",
    },
    metrics: {
      activeRoles: "Roles actifs",
      acceptedCandidates: "Candidats acceptes",
      overdueReviews: "Revues en retard",
      unresolvedHolds: "Holds ouverts",
    },
    nav: {
      label: "Navigation dashboard entreprise",
      workspace: "Workspace hiring",
      overview: "Vue d'ensemble",
      roles: "Roles",
      candidates: "Candidats",
      schedule: "Planning",
      analytics: "Analytics",
      settings: "Parametres equipe",
      visibleMatches: "matchs visibles",
    },
    search: {
      label: "Rechercher dans le workspace entreprise",
      placeholder: "Rechercher candidats, roles, transcriptions...",
    },
    overview: {
      greeting: "Bonjour",
      focusLabel: "Workspace role",
      focusPrefix: "Revue de",
      summary:
        "Examinez candidats acceptes, sante des roles et deadlines dans un workspace compact.",
      allSystems: "Tout est calme",
      consentGated: "Soumis au consentement",
    },
    metricDetails: {
      activeRoles: "Roles ouverts sur lesquels l'equipe peut matcher.",
      acceptedCandidates: "Candidats qui ont accepte le partage.",
      overdueReviews: "Deadlines de revue qui demandent attention.",
      unresolvedHolds: "Holds encore en attente de suivi.",
    },
    firstRun: {
      startLabel: "Commencez ici",
      firstRunTitle:
        "Configurez un role, puis examinez les candidats lorsqu'ils acceptent le partage.",
      body: "Le tableau reste simple tant qu'il n'y a pas de role pour matcher.",
      stepsLabel: "Etapes configuration entreprise",
      companyDetails: "Details entreprise",
      companyDetailsTodo: "Ajoutez les informations entreprise.",
      ready: "Pret.",
      firstRole: "Premier role",
      firstRoleBody: "Creez le role auquel les candidats doivent correspondre.",
      candidateQueue: "File candidats",
      candidateQueueBody: "Les matchs candidat acceptes apparaitront ici.",
      fallbackTitle: "Configurez votre workspace hiring",
      fallbackBody:
        "Confirmez une fois les details entreprise, puis creez le premier role sur lequel votre equipe veut recevoir des matchs.",
      stepLabel: "Etape",
      backToProfile: "Retour au profil entreprise",
    },
    panels: {
      workspaceMetrics: "Metriques workspace",
      roleDetail: "Detail du role",
      roles: "Roles",
      queueViews: "vues de file",
      candidateQueues: "Files candidats",
      candidateQueuesHint: "Matchs avec consentement en attente de revue humaine",
    },
    queues: {
      new: {
        label: "Nouveaux",
        description: "Candidat accepte",
      },
      hold: {
        label: "En attente",
        description: "Suivi planifie",
      },
      overdue: {
        label: "En retard",
        description: "Deadline de revue depassee",
      },
      advanced: {
        label: "Avances",
        description: "Prochaine etape demandee",
      },
      declined: {
        label: "Refuses",
        description: "Feedback envoye",
      },
    },
    empty: {
      roles: "Creez un role structure avant que les candidats puissent matcher.",
      queue: "Aucun candidat dans cette file.",
      noMatches:
        "Les matchs candidats acceptes apparaitront ici apres que les candidats choisissent de partager avec votre entreprise.",
      noUpcomingReviews: "Aucune deadline de revue en attente maintenant.",
      noSearchResults: "Aucun match accepte ou role ne correspond a cette recherche.",
    },
    candidateTable: {
      title: "Pret pour la revue",
      subtitle: "Matchs candidats acceptes, tries pour une revue humaine rapide.",
      controls: "Controles tableau candidats",
      filters: "Filtres",
      sortScore: "Trier score",
      candidate: "Candidat",
      role: "Role",
      score: "Score",
      status: "Statut",
      action: "Action",
      allRoles: "Tous les roles",
      emptyTitle: "Aucun candidat accepte",
      contactVisible: "Contact visible",
      contactHidden: "Contact cache",
      openReview: "Revoir",
    },
    rolePipeline: {
      title: "Pipeline roles",
      subtitle: "Roles ouverts et pression de revue par file.",
      allRoles: "Tous les roles",
      accepted: "acceptes",
      overdue: "en retard",
      emptyTitle: "Aucun role",
      roleDetailHint: "Modifiez ce role et gerez son cycle de vie.",
    },
    scheduleReview: {
      title: "Planning et revue",
      subtitle: "Deadlines, holds et prochaines actions humaines.",
      emptyTitle: "Aucune revue planifiee",
      noDate: "Aucune date",
      overdue: "En retard",
      followUp: "Suivi",
      review: "Revue",
    },
    analytics: {
      title: "Analytics",
      subtitle: "Signaux hiring simples depuis les matchs acceptes.",
      advanceRate: "Taux d'avance",
      averageScore: "Score moyen",
      reviewLoad: "Charge revue",
      noData: "Aucune donnee",
    },
    role: {
      locationPending: "Lieu en attente",
      open: "Ouverts",
      overdue: "En retard",
      title: "Titre du role",
      locations: "Lieux",
      workModes: "Modes de travail",
      requiredSkills: "Competences requises",
      clientFacingPercentage: "Pourcentage client",
      meetingLoad: "Charge meetings",
      meetingMedium: "Moyenne",
      meetingLow: "Basse",
      meetingHigh: "Haute",
      statusClosed: "Ferme",
      statusPaused: "En pause",
      statusActive: "Actif",
    },
    match: {
      daysLeft: "{days} jours restants",
      dueToday: "Verdict attendu aujourd'hui",
      overdueByDays: "En retard de {days} jours",
      advanced: "Avance",
      hold: "En attente",
      declined: "Refuse",
      new: "Nouveau",
      reviewDueAt: "Revue avant",
      pending: "en attente",
    },
  },
  companyOnboarding: {
    eyebrow: "Onboarding entreprise",
    title: "Confirmez le profil workspace",
    body:
      "Cela garde les preuves candidat soumises au consentement et donne aux reviewers le bon contexte entreprise.",
    companyProfile: "Profil entreprise",
    companyName: "Nom entreprise",
    website: "Site web",
    websitePlaceholder: "https://example.com",
    domain: "Domaine entreprise",
    domainPlaceholder: "example.com",
    domainHelp:
      "Utilise pour verifier l'entreprise et bloquer l'employeur actuel cote confidentialite.",
    hiringLocations: "Lieux de recrutement",
    hiringLocationsPlaceholder: "Italie, Remote EU, chevauchement CET",
    teamSize: "Taille equipe",
    selectTeamSize: "Selectionner la taille equipe",
    primaryContact: "Contact principal",
    contactName: "Nom du contact",
    contactEmail: "Email du contact",
    submit: "Enregistrer le profil",
    errors: {
      missing_required_fields:
        "Nom entreprise, site ou domaine, lieux de recrutement, taille equipe et contact principal sont requis.",
      save_failed: "Le profil entreprise n'a pas pu etre enregistre. Reessayez.",
      default: "Verifiez les details du profil entreprise et reessayez.",
    },
  },
  companyRoleWizard: {
    eyebrow: "Intake role structure",
    title: "Nouveau role",
    basics: "Bases",
    requirements: "Exigences",
    dailyWork: "Realite quotidienne du travail",
    calibration: "Calibration",
    roleTitle: "Titre du role",
    roleTitlePlaceholder: "Tech Risk Analyst",
    locationConstraints: "Contraintes lieu ou fuseau horaire",
    locationConstraintsPlaceholder: "Italie, Remote EU, chevauchement CET",
    workModes: "Modes de travail",
    workModesPlaceholder: "Hybride, remote, bureau",
    requiredSkills: "Competences requises",
    requiredSkillsPlaceholder: "Analyse SQL, documentation client, controles risque",
    niceToHaveSkills: "Competences appreciees",
    niceToHaveSkillsPlaceholder: "Python, audit tooling, process mining",
    hardGates: "Criteres bloquants avec base licite",
    hardGatesPlaceholder:
      "Autorisation de travail Italie | Exigence essentielle d'acces client",
    clientFacingPercentage: "Pourcentage face client",
    meetingLoad: "Charge meetings",
    deliveryPace: "Rythme delivery",
    travel: "Deplacements",
    teamPattern: "Mode equipe",
    ambiguityLevel: "Niveau d'ambiguite",
    requiredEvidence: "Preuves requises",
    requiredEvidencePlaceholder: "Scenario client, preuve SQL, raisonnement risque",
    interviewModules: "Modules entretien",
    interviewModulesPlaceholder: "client_scenario, risk_reasoning",
    submit: "Creer le role",
    errorDefault: "Verifiez les details du role et completez les champs requis.",
    options: {
      medium: "Moyen",
      low: "Bas",
      high: "Haut",
      steady: "Stable",
      fast: "Rapide",
      variable: "Variable",
      none: "Aucun",
      occasional: "Occasionnel",
      frequent: "Frequent",
      mixed: "Mixte",
      mostlyTeam: "Surtout equipe",
      mostlySolo: "Surtout solo",
    },
  },
  companyReview: {
    evidenceReview: "Revue des preuves",
    reviewDue: "Revue avant",
    reviewDuePending: "Date de revue en attente",
    consentScope: "Perimetre du consentement",
    rawCvMediaExcluded:
      "Les CV bruts et medias d'entretien bruts restent exclus de la revue entreprise.",
    scorecard: "Scorecard",
    matchScore: "Score match",
    confidence: "Confiance",
    contact: "Contact",
    contactVisible: "Visible apres avance",
    contactHidden: "Cache jusqu'a avance",
    matchExplanation: "Explication du match",
    transcript: "Transcription",
    excerpt: "Extrait",
    fullTranscript: "Transcription complete",
    rawMediaExcluded: "Le media brut de l'entretien n'est pas partage.",
    integritySignals: "Signaux d'integrite de l'entretien",
    integritySignalsIntro:
      "Signaux de session neutres collectes pendant l'entretien (changements d'onglet, pertes de focus, longues pauses). Ils servent de contexte a votre revue humaine et n'affectent jamais aucun score.",
    integrityNoSignals: "Aucun signal d'integrite enregistre pour cet entretien.",
    integrityNeverScored: "Ces signaux sont purement informatifs : ils ne sont jamais utilises dans le calcul des scores.",
    auditHistory: "Historique audit",
    currentStatus: "Statut actuel",
    humanReviewReason: "Raison de revue humaine",
    noDecision: "Aucune decision entreprise enregistree.",
    nextStep: "Prochaine etape",
    pending: "En attente",
    followUp: "Suivi",
    notScheduled: "Non planifie",
    decision: "Decision",
    decisionBody:
      "Enregistrez une decision humaine avec une raison visible par le candidat. Les holds gardent la SLA ouverte jusqu'a une revue ulterieure.",
    reason: "Raison",
    reasonPlaceholder: "Raison claire visible par le candidat",
    nextStepPlaceholder:
      "Screen recruiter, case review, revue hiring manager",
    followUpDate: "Date de suivi",
    advance: "Avancer",
    hold: "Hold",
    decline: "Refuser",
    consentCategories: {
      profile: "Profil",
      scorecard: "Scorecard",
      match_explanation: "Explication du match",
      interview_transcript: "Transcription entretien",
    },
    statuses: {
      advanced: "Avance",
      hold: "En attente",
      declined: "Refuse",
      candidateAccepted: "Candidat accepte",
    },
  },
  mobileNav: {
    open: "Ouvrir le menu de navigation",
    close: "Fermer le menu de navigation",
  },
  hero: {
    line1: "L'app emploi",
    line2: "que vous n'utiliserez",
    line3: "qu'une fois.",
    freeForCandidates: "Gratuit pour les candidats, toujours.",
    testRoute: "Route de test : hero isolé avec optimisation mobile",
  },
  videoHero: {
    eyebrow: "Gratuit pour les candidats, toujours.",
    titleLead: "Un CV. Un entretien.",
    titleAccent: "De vrais matchs.",
    columns: [
      {
        title: "un",
        word: "CV",
        note: "Plus durable",
      },
      {
        title: "un",
        word: "Entretien",
        note: "Assez si vous etes qualifie",
      },
      {
        title: "MATCH",
        word: "Trouve",
        note: "",
      },
    ],
    alwaysFree: "Toujours gratuit",
    body:
      "Importez votre CV une seule fois, puis arrêtez de vous répéter. Un seul profil, associé aux entreprises qui vous correspondent.",
    primaryCta: "Commencer l'entretien",
    secondaryCta: "Pour entreprises",
  },
  globe: {
    headingLine1: "Chercher un emploi est",
    headingLine2: "une taxe pour tout le monde.",
    body:
      "Les candidats réécrivent le même CV trente fois. Les recruteurs parcourent 312 candidatures pour en trouver 14. Les deux côtés sont épuisés avant la première conversation qui compte. Nous nous sommes demandé : et si vous faisiez le travail une seule fois, puis que le système faisait le reste ?",
    stats: [
      {
        value: "312",
        label: "candidatures qu'un recruteur parcourt pour trouver une embauche",
      },
      {
        value: "38",
        label: "jours qu'un diplômé moyen passe à chercher",
      },
      {
        value: "8%",
        label: 'des candidats reçoivent un "non" avec une raison',
      },
    ],
  },
  process: {
    heading: "Trois étapes. Puis c'est fini.",
    body:
      'Pas de lettres de motivation, pas de rituels LinkedIn, pas d\'attente pendant que quelqu\'un "étudie votre candidature".',
    stepLabel: "Étape",
    ofLabel: "sur",
    ready: "Prêt",
    steps: [
      {
        number: "01",
        label: "ÉTAPE 01",
        badge: "8 min",
        title: "Déposez votre CV. Nous extrayons, vous confirmez.",
        body:
          "PDF, DOCX ou export LinkedIn. Nous extrayons expériences, formation et langues ; vous vérifiez, corrigez ce qui cloche.",
        summary:
          "Importez un CV ou un export LinkedIn, puis vérifiez et modifiez vite ce qu'Assumerai extrait.",
        kind: "upload",
      },
      {
        number: "02",
        label: "ÉTAPE 02",
        badge: "20 min",
        title: "Passez un seul entretien calme et adaptatif.",
        body:
          "Cinq modules courts : vidéo, écrit, code. L'IA écoute, pose une relance quand elle compte, puis se retire.",
        summary:
          "Un court entretien adaptatif capte votre façon de penser, communiquer et résoudre les problèmes.",
        kind: "interview",
      },
      {
        number: "03",
        label: "ÉTAPE 03",
        badge: "Toujours",
        title: "Les entreprises viennent à vous. Déjà convaincues.",
        body:
          "Chaque match montre le rôle, le score et une vraie phrase de l'équipe de recrutement expliquant pourquoi elle pense que vous correspondez. Refusez gentiment ou acceptez.",
        summary:
          "Les matchs arrivent avec le contexte du rôle, des scores de fit et une vraie raison de l'équipe.",
        kind: "matches",
      },
    ],
    modules: [
      { name: "Imaginer le rôle", meta: "Vidéo, 4Q" },
      { name: "Aisance en anglais", meta: "Vidéo, 2Q" },
      { name: "Connaissance IA", meta: "Texte, 3Q" },
      { name: "Python live coding", meta: "Code, 1Q" },
    ],
    matches: [
      {
        role: "EY - Tech Risk Wave 24",
        location: "Milan - Hybride",
      },
      {
        role: "ESCP - Programme Officer",
        location: "Turin - Sur site",
      },
      {
        role: "Enel - Energy Solutions",
        location: "Rome - Hybride",
      },
    ],
  },
  outcomes: {
    headingLine1: "Vous avez fait le travail.",
    headingLine2: "Laissez-le travailler pour vous.",
    body:
      "Fini les dissertations pour expliquer pourquoi vous êtes le bon profil. Passez l'entretien une fois, à votre rythme, puis suivez chaque match dans un dashboard calme.",
    imageAlt:
      "Candidat travaillant calmement tandis que des panneaux abstraits de recrutement s'organisent autour de lui",
    points: [
      {
        title: "Une scorecard, à chaque fois",
        body:
          "Plus besoin de deviner ce que les recruteurs veulent voir. Chaque entreprise lit la même vue calibrée de vos forces.",
      },
      {
        title: "Sélecteurs à bulles",
        body:
          "Dites-nous ce que votre entreprise idéale doit vous faire ressentir, puis nous pondérons les matchs autour des détails importants.",
      },
      {
        title: "De vraies raisons, toujours",
        body:
          "Chaque match et chaque non merci viennent avec une phrase d'une personne de l'entreprise. Pas de boîte noire.",
      },
      {
        title: "Vos données, votre décision",
        body:
          "Aucune entreprise ne voit votre CV sans votre accord explicite. Les enregistrements sont détruits après scoring.",
      },
    ],
  },
  interview: {
    headingLine1: "Cinq modules.",
    headingLine2: "Une voix calme.",
    body:
      "Pas de questions pièges. Pas de stress chronométré. L'IA écoute et pose une bonne relance là où ça compte.",
    modules: [
      {
        eyebrow: "Question en cours",
        prompt: '"Avec quel type de client voulez-vous le plus passer votre temps ?"',
        meta: "Vidéo - 4 questions",
        title: "Imaginer le rôle",
        description:
          '"Dans quelle pièce entrez-vous lundi à 9 h ?" Nous commençons par écouter le travail que vous voulez vraiment.',
      },
      {
        meta: "Vidéo - 2 questions",
        title: "Aisance en anglais",
        description:
          "Un pitch et une histoire de client difficile, en anglais. Nous évaluons la pensée, pas l'accent.",
      },
      {
        meta: "Texte - 3 questions",
        title: "Connaissance IA",
        description:
          "Les fondamentaux en langage simple : hallucination, RAG vs fine-tuning. Nous cherchons le jugement, pas le jargon.",
      },
      {
        meta: "Code - 1 tâche",
        title: "Python - live coding",
        description:
          "Une petite tâche réelle : moyennes mobiles sur un dictionnaire de ventes, avec des tests à lancer.",
      },
      {
        meta: "Vidéo - 3 questions",
        title: "Étude de cas - scénario client",
        description:
          'Un brief court, huit minutes à voix haute. Nous observons comment vous cadrez l\'ambiguïté, pas si vous la "résolvez".',
      },
    ],
  },
  dashboard: {
    headingLine1: "Lisez 14,",
    headingLine2: "pas 312.",
    body:
      "Chaque candidat arrive déjà interviewé et scoré selon le niveau du rôle. Ouvrez le dashboard à 9 h, envoyez trois invitations calendrier à 9 h 08, puis revenez au vrai travail.",
    cta: "Réserver une démo de 20 min",
    dashboardAlt:
      "Vue du dashboard recruteur Assumer avec scores candidats, actions de revue, pipeline et file d'équipe",
    dashboardViewAlt: "Vue d'ensemble du dashboard Assumer",
    slide: "Slide",
    ofLabel: "sur",
    previousScreenshot: "Capture dashboard précédente",
    nextScreenshot: "Capture dashboard suivante",
    showScreenshot: "Afficher une capture du dashboard",
    shots: {
      analytics: "Analytics",
      calendar: "Calendrier",
      review: "Review",
      overview: "Vue d'ensemble",
    },
    features: [
      {
        title: "Scoring calibré par rôle",
        body:
          "Définissez le niveau : rigueur outbound >= 85, DE écrit >= 80. Seuls les candidats au-dessus remontent.",
      },
      {
        title: "Transcriptions horodatées",
        body:
          "Allez au moment où un candidat gère une objection, structure un pitch anglais ou écrit un allemand convaincant.",
      },
      {
        title: "Calendrier synchronisé",
        body:
          "Proposez trois créneaux, le candidat en choisit un et les calendriers restent propres. Workday et Slack intégrés.",
      },
    ],
  },
  testimonials: {
    heading: "Quelques phrases sincères.",
    body:
      "Des résultats réels de candidats et d'équipes après qu'un seul entretien commence à porter le signal.",
    items: [
      {
        initials: "MB",
        text:
          "J'ai envoyé zéro candidature. À la troisième semaine, j'avais quatre vraies conversations et une offre que je voulais vraiment.",
        name: "Marco Belluzzi",
        role: "Aujourd'hui chez EY - Tech Risk Wave 24",
      },
      {
        initials: "AP",
        text:
          "Nous avons réduit notre time-to-hire de 28 à 14 jours, et les personnes recrutées sont celles que nous mettions trois mois à trouver.",
        name: "Anna Pellegrini",
        role: "Head of People - Maremma SRL",
      },
      {
        initials: "AC",
        text: "C'était le premier entretien qui semblait vraiment vouloir écouter.",
        name: "Aïssatou Conti",
        role: "Programme Officer chez ESCP",
      },
      {
        initials: "TR",
        text:
          "Les transcriptions ont changé les débriefs de mon équipe. Maintenant, nous débattons à partir des preuves.",
        name: "Tobias Reiner",
        role: "VP Sales",
      },
      {
        initials: "LP",
        text:
          "J'ai reçu un 'non' réfléchi une fois. Cela a fait de moi un meilleur candidat la fois suivante.",
        name: "Lukas Pernigotti",
        role: "Jeune diplômé",
      },
    ],
  },
  pricing: {
    headingLine1: "Nous sommes payés",
    headingLine2: "quand le recrutement fonctionne.",
    plans: [
      {
        eyebrow: "BASE",
        name: "Platform",
        price: "\u20ac400",
        cadence: "platform",
        body:
          "Entretiens IA illimités, sync ATS, scorecards. Revenu SaaS prévisible dès le premier jour.",
        iconAlt: "Icône dashboard plateforme RH",
      },
      {
        eyebrow: "CORE",
        name: "Par embauche",
        price: "\u20ac200",
        cadence: "per hire",
        body:
          "Déclenché quand un candidat matché est recruté. Remplace les recruteurs externes à un quart du coût.",
        iconAlt: "Icône poignée de main pour embauche réussie",
      },
      {
        eyebrow: "ALIGNÉ",
        name: "Performance",
        price: "lets speak",
        cadence: "",
        body: "",
        iconAlt: "Icône performance et rétention employé",
      },
    ],
  },
  finalCta: {
    headingLine1: "Vingt minutes calmes.",
    headingLine2Prefix: "Puis c'est au tour de",
    headingEmphasis: "quelqu'un d'autre",
    headingLine2Suffix: "de faire le travail.",
    body: "Passez l'entretien maintenant. Nous enverrons vos premiers matchs sous 48 heures.",
    takeInterview: "Passer l'entretien",
    hiringTeam: "Je suis une équipe RH",
  },
  contactTeam: {
    eyebrow: "Contacter Assumerai",
    title: "Contactez-nous",
    body: "Ecrivez-nous et nous reviendrons vers vous sous 24 heures.",
    formLabel: "Formulaire de contact Assumerai",
    orbitAlt:
      "Portraits circulaires disposes autour de lignes orbitales discretes pour la page contact Assumerai",
    fields: {
      firstName: "Prenom",
      lastName: "Nom",
      email: "Email",
      emailPlaceholder: "Adresse email",
      teamSize: "Taille de l'equipe",
      location: "Localisation",
      message: "Message",
      messagePlaceholder: "Laissez-nous un message...",
    },
    teamSizeOptions: [
      "1-50 personnes",
      "51-200 personnes",
      "201-1 000 personnes",
      "1 000+ personnes",
    ],
    locationOptions: ["Italie", "Europe", "Royaume-Uni", "Etats-Unis"],
    privacyPrefix: "Vous acceptez notre",
    privacyLink: "politique de confidentialite",
    submit: "Envoyer le message",
    trustLabel: "Des signaux fiables pour les equipes RH",
    socials: [
      { label: "hello@assumer.ai", href: "mailto:hello@assumer.ai", kind: "mail" },
      { label: "@Assumerai", href: "https://www.linkedin.com", kind: "linkedin" },
      { label: "Parlez-nous", href: "#team", kind: "message" },
    ],
    team: {
      title: "Notre equipe",
      body:
        "Nous creons des produits de recrutement calmes grace a une analyse attentive, de l'empathie candidat et un travail collaboratif avec les equipes.",
      members: [
        {
          name: "Gianmaria Ferretti",
          role: "Experience candidat, produit",
          image: "/cofounders/gmaria.jpeg",
          imageAlt: "Portrait de Gianmaria Ferretti",
        },
        {
          name: "Lazar Kovacevic",
          role: "Equipes RH, architecture",
          image: "/cofounders/lazark.jpg",
          imageAlt: "Portrait de Lazar Kovacevic",
        },
      ],
    },
  },
  productPages: productPagesFr,
  footer: {
    tagline:
      "L'app emploi que vous n'utiliserez qu'une fois. Made in Milano + Berlin, par des personnes qui ont connu les deux côtés de la table.",
    navigationLabel: "Navigation du pied de page",
    stayClose: "Restons proches",
    workEmail: "Email professionnel",
    mailingListLabel: "Rejoindre la liste d'information du pied de page",
    note: "Une courte note par saison. Pas de contenu piège.",
    columns: [
      {
        title: "Produit",
        links: [
          { label: "Fonctionnement", href: "/#how" },
          { label: "Pour candidats", href: "/product/candidates" },
          { label: "Pour entreprises", href: "/product/hiring-teams" },
          { label: "Tarifs", href: "/product/pricing" },
        ],
      },
      {
        title: "Entreprise",
        links: [
          { label: "À propos", href: "/contact#team" },
          { label: "Carrières", href: "#" },
          { label: "Kit presse", href: "#" },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Confiance",
        links: [
          { label: "Confidentialité", href: "/privacy-policy" },
          { label: "Conditions", href: "/terms-of-use" },
          { label: "DPA", href: "#" },
          { label: "Audit biais", href: "#" },
          { label: "Sécurité", href: "#" },
        ],
      },
    ],
  },
};

export const translations: Record<Language, TranslationContent> = {
  en,
  it,
  fr,
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationContent;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getSupportedLanguage(value: string | null | undefined): Language | null {
  if (!value) return null;

  const normalized = value.toLowerCase().slice(0, 2);
  return languages.some((language) => language.code === normalized)
    ? (normalized as Language)
    : null;
}

function getPreferredLanguage(): Language {
  const storedLanguage = getSupportedLanguage(
    window.localStorage.getItem(APP_LANGUAGE_STORAGE_KEY),
  );

  if (storedLanguage) {
    return storedLanguage;
  }

  for (const language of window.navigator.languages ?? []) {
    const supportedLanguage = getSupportedLanguage(language);

    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return getSupportedLanguage(window.navigator.language) ?? defaultLanguage;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLanguageState(getPreferredLanguage());
      setHasLoadedPreference(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;

    if (hasLoadedPreference) {
      window.localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, language);
    }
  }, [hasLoadedPreference, language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setHasLoadedPreference(true);
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }

  return context;
}
