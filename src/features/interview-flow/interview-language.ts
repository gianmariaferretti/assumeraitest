import type {
  FollowUpReason,
  InterviewQuestion,
  ModuleId
} from "./types";

export type CandidateInterviewLanguageCode = "en" | "it" | "fr";

export interface CandidateInterviewLanguageConfig {
  readonly code: CandidateInterviewLanguageCode;
  readonly label: "English" | "Italian" | "French";
  readonly nativeLabel: "English" | "Italiano" | "Français";
  readonly confirmLabel: string;
  readonly questionLanguageName: "English" | "Italian" | "French";
  readonly htmlLang: "en" | "it" | "fr";
  readonly deepgramLanguage: "en-US" | "it" | "fr";
  readonly countryPalette: readonly [string, string, string];
}

export const DEFAULT_CANDIDATE_INTERVIEW_LANGUAGE: CandidateInterviewLanguageCode = "en";
export const CANDIDATE_INTERVIEW_LANGUAGE_STORAGE_KEY =
  "assumerai:candidate-interview-language:v0";
export const CANDIDATE_INTERVIEW_LANGUAGE_COOKIE = "assumerai_interview_language";
export const CANDIDATE_INTERVIEW_LANGUAGE_FIELD = "candidate_interview_language";

const LANGUAGE_CONFIGS: Record<
  CandidateInterviewLanguageCode,
  CandidateInterviewLanguageConfig
> = {
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    confirmLabel: "Confirm and proceed",
    questionLanguageName: "English",
    htmlLang: "en",
    deepgramLanguage: "en-US",
    countryPalette: ["#1f4fa3", "#ffffff", "#c81e3a"]
  },
  it: {
    code: "it",
    label: "Italian",
    nativeLabel: "Italiano",
    confirmLabel: "Conferma e procedi",
    questionLanguageName: "Italian",
    htmlLang: "it",
    deepgramLanguage: "it",
    countryPalette: ["#008c45", "#ffffff", "#cd212a"]
  },
  fr: {
    code: "fr",
    label: "French",
    nativeLabel: "Français",
    confirmLabel: "Confirmer et continuer",
    questionLanguageName: "French",
    htmlLang: "fr",
    deepgramLanguage: "fr",
    countryPalette: ["#0055a4", "#ffffff", "#ef4135"]
  }
};

export const CANDIDATE_INTERVIEW_LANGUAGE_OPTIONS = [
  LANGUAGE_CONFIGS.en,
  LANGUAGE_CONFIGS.it,
  LANGUAGE_CONFIGS.fr
] as const;

type LocalizedQuestionCopy = {
  readonly prompt: string;
  readonly expectedSignals?: readonly string[];
  readonly evidenceRequirements?: readonly string[];
};

const LOCALIZED_QUESTION_COPY: Record<
  Exclude<CandidateInterviewLanguageCode, "en">,
  Record<string, LocalizedQuestionCopy>
> = {
  it: {
    "sales-motivation-v0": {
      prompt:
        "Descrivi l'ambiente di vendita in cui lavori meglio e un'abitudine che usi per mantenere costante l'outreach.",
      expectedSignals: ["motivazione commerciale chiara", "autogestione", "ritmo outbound realistico"],
      evidenceRequirements: ["abitudine specifica", "esempio di ambiente di vendita"]
    },
    "sales-language-v0": {
      prompt:
        "Scrivi una breve nota di follow-up a un prospect dopo una prima discovery call. Mantienila professionale e basata su evidenze.",
      expectedSignals: ["comunicazione scritta chiara", "orientamento al cliente", "tono professionale"],
      evidenceRequirements: ["contesto del prospect", "prossimo passo"]
    },
    "sales-domain-v0": {
      prompt: "Spiega come qualifichi un account outbound prima di inserirlo in una sequenza.",
      expectedSignals: ["ricerca sull'account", "criteri di qualifica", "disciplina di pipeline"],
      evidenceRequirements: ["passaggi di qualifica", "evidenza CRM o pipeline"]
    },
    "sales-work-sample-v0": {
      prompt:
        "Prepara un piano di outreach in tre passaggi per un prospect che ha aperto la pagina prezzi ma non ha risposto.",
      expectedSignals: ["sequenza", "consapevolezza delle obiezioni", "follow-up misurato"],
      evidenceRequirements: ["tre passaggi", "motivo di ogni passaggio"]
    },
    "sales-case-v0": {
      prompt:
        "Un prospect dice che il prodotto e' interessante ma non ha budget in questo trimestre. Cosa fai dopo?",
      expectedSignals: ["gestione obiezioni", "giudizio commerciale", "chiarezza sul prossimo passo"],
      evidenceRequirements: ["percorso di risposta", "decisione di qualifica"]
    },
    "consulting-motivation-v0": {
      prompt: "Descrivi un problema cliente che ti piacerebbe seguire da brief ambiguo a raccomandazione.",
      expectedSignals: ["orientamento al cliente", "ownership strutturata", "comfort con ambiguita"],
      evidenceRequirements: ["esempio di problema cliente", "ambito di ownership"]
    },
    "consulting-language-v0": {
      prompt:
        "Scrivi un breve aggiornamento per il cliente spiegando un ritardo di consegna e la prossima azione in modo chiaro.",
      expectedSignals: ["chiarezza", "accountability", "comunicazione pronta per il cliente"],
      evidenceRequirements: ["contesto del ritardo", "prossima azione"]
    },
    "consulting-domain-v0": {
      prompt:
        "Spiega come identificheresti e documenteresti il rischio tecnologico in un processo basato su fogli di calcolo.",
      expectedSignals: ["identificazione del rischio", "pensiero sui controlli", "disciplina documentale"],
      evidenceRequirements: ["esempi di rischio", "approccio di documentazione"]
    },
    "consulting-work-sample-v0": {
      prompt:
        "Con un dataset disordinato con duplicati e owner mancanti, indica le prime cinque azioni di pulizia.",
      expectedSignals: ["analisi strutturata", "triage della qualita dati", "prioritizzazione"],
      evidenceRequirements: ["cinque azioni", "motivo dell'ordine"]
    },
    "consulting-case-v0": {
      prompt: "Un cliente non e' d'accordo con la tua valutazione del rischio. Come gestisci la riunione?",
      expectedSignals: ["gestione stakeholder", "ragionamento basato su evidenze", "giudizio professionale"],
      evidenceRequirements: ["approccio alla riunione", "gestione delle evidenze"]
    },
    "ai-analyst-motivation-v0": {
      prompt:
        "Descrivi il lavoro di governance o analisi AI che ti motiva e perche' conta per gli utenti.",
      expectedSignals: ["focus sull'utente", "interesse per governance AI", "motivazione per analisi responsabile"],
      evidenceRequirements: ["esempio di lavoro", "impatto sull'utente"]
    },
    "ai-analyst-language-v0": {
      prompt:
        "Riassumi un limite di un modello AI per uno stakeholder non tecnico usando un linguaggio semplice.",
      expectedSignals: ["spiegazione semplice", "comunicazione del rischio", "accuratezza tecnica"],
      evidenceRequirements: ["limite", "implicazione business"]
    },
    "ai-analyst-domain-v0": {
      prompt:
        "Come valuteresti se l'output di un modello e' abbastanza affidabile per un workflow business?",
      expectedSignals: ["disegno della valutazione", "qualita delle evidenze", "soglie consapevoli del rischio"],
      evidenceRequirements: ["controlli", "criteri decisionali"]
    },
    "ai-analyst-work-sample-v0": {
      prompt:
        "Valuta un chatbot ipotetico che non cita fonti. Quali controlli e guardrail proporresti?",
      expectedSignals: ["consapevolezza delle fonti", "pensiero sui guardrail", "sicurezza utente"],
      evidenceRequirements: ["controlli", "guardrail"]
    },
    "ai-analyst-case-v0": {
      prompt:
        "Un team vuole automatizzare una decisione ad alto impatto con evidenze limitate. Che domande fai prima dell'approvazione?",
      expectedSignals: ["consapevolezza della revisione umana", "triage del rischio", "requisiti di evidenza"],
      evidenceRequirements: ["domande di approvazione", "condizioni di revisione"]
    },
    "python-developer-motivation-v0": {
      prompt:
        "Descrivi il tipo di lavoro backend engineering in cui sei piu' efficace e come collabori sui tradeoff.",
      expectedSignals: ["motivazione backend", "collaborazione", "consapevolezza dei tradeoff"],
      evidenceRequirements: ["esempio di progetto", "dettaglio di collaborazione"]
    },
    "python-developer-language-v0": {
      prompt: "Scrivi una breve nota di pull request che spieghi ai reviewer una correzione di performance del database.",
      expectedSignals: ["chiarezza tecnica", "prontezza per review", "scrittura concisa"],
      evidenceRequirements: ["sintesi della correzione", "nota sui test"]
    },
    "python-developer-domain-v0": {
      prompt:
        "Spiega come progetteresti un endpoint API Python che valida input, scrive su SQL e resta testabile.",
      expectedSignals: ["design API Python", "consapevolezza SQL", "testabilita"],
      evidenceRequirements: ["approccio di validazione", "approccio di persistenza", "piano di test"]
    },
    "python-developer-work-sample-v0": {
      prompt:
        "Un servizio Python restituisce record duplicati dopo una modifica alla paginazione. Spiega il tuo piano di debug.",
      expectedSignals: ["struttura di debugging", "ragionamento sui dati", "test di regressione"],
      evidenceRequirements: ["passaggi di debug", "evidenza di test o monitoraggio"]
    },
    "python-developer-case-v0": {
      prompt:
        "Un product manager ha bisogno di un'integrazione rapida che potrebbe diventare permanente. Come bilanci consegna e manutenibilita?",
      expectedSignals: ["giudizio sulla consegna", "manutenibilita", "comunicazione con prodotto"],
      evidenceRequirements: ["spiegazione del tradeoff", "mitigazione del rischio"]
    },
    "operations-motivation-v0": {
      prompt: "Descrivi un processo operativo che miglioreresti per primo e come decidi che vale la pena cambiarlo.",
      expectedSignals: ["motivazione al miglioramento processo", "prioritizzazione", "consapevolezza dell'impatto"],
      evidenceRequirements: ["esempio di processo", "misura di impatto"]
    },
    "operations-language-v0": {
      prompt: "Scrivi un breve aggiornamento interno su un incidente di processo e il prossimo passo di recupero.",
      expectedSignals: ["aggiornamento chiaro", "ownership operativa", "focus sul recupero"],
      evidenceRequirements: ["contesto incidente", "prossimo passo"]
    },
    "operations-domain-v0": {
      prompt: "Come misureresti se un processo di handoff e' affidabile?",
      expectedSignals: ["selezione metriche", "affidabilita del processo", "pensiero root-cause"],
      evidenceRequirements: ["metriche", "cadenza di review"]
    },
    "operations-work-sample-v0": {
      prompt:
        "Un report settimanale ha dati sorgente non allineati e pressione sulla scadenza. Quali passaggi segui?",
      expectedSignals: ["triage", "riconciliazione dati", "comunicazione stakeholder"],
      evidenceRequirements: ["passaggi di triage", "piano di comunicazione"]
    },
    "operations-case-v0": {
      prompt:
        "Due team non concordano sulla responsabilita di un errore operativo. Come lo risolvi?",
      expectedSignals: ["giudizio cross-funzionale", "raccolta evidenze", "percorso di risoluzione"],
      evidenceRequirements: ["passaggi di risoluzione", "allineamento owner"]
    }
  },
  fr: {
    "sales-motivation-v0": {
      prompt:
        "Decrivez l'environnement commercial ou vous travaillez le mieux et une habitude qui vous aide a garder un rythme de prospection regulier.",
      expectedSignals: ["motivation commerciale claire", "autogestion", "rythme outbound realiste"],
      evidenceRequirements: ["habitude precise", "exemple d'environnement commercial"]
    },
    "sales-language-v0": {
      prompt:
        "Redigez une courte note de suivi a un prospect apres un premier appel de decouverte. Restez professionnel et base sur des preuves.",
      expectedSignals: ["communication ecrite claire", "orientation client", "ton professionnel"],
      evidenceRequirements: ["contexte du prospect", "prochaine etape"]
    },
    "sales-domain-v0": {
      prompt: "Expliquez comment vous qualifiez un compte outbound avant de l'ajouter a une sequence.",
      expectedSignals: ["recherche compte", "criteres de qualification", "discipline de pipeline"],
      evidenceRequirements: ["etapes de qualification", "preuve CRM ou pipeline"]
    },
    "sales-work-sample-v0": {
      prompt:
        "Preparez un plan de prospection en trois etapes pour un prospect qui a ouvert la page tarifs mais n'a pas repondu.",
      expectedSignals: ["sequencage", "conscience des objections", "suivi mesure"],
      evidenceRequirements: ["trois etapes", "raison de chaque etape"]
    },
    "sales-case-v0": {
      prompt:
        "Un prospect dit que le produit est interessant mais pas budgete ce trimestre. Que faites-vous ensuite?",
      expectedSignals: ["gestion des objections", "jugement commercial", "clarte de la prochaine etape"],
      evidenceRequirements: ["chemin de reponse", "decision de qualification"]
    },
    "consulting-motivation-v0": {
      prompt:
        "Decrivez un probleme client que vous aimeriez mener d'un brief ambigu jusqu'a une recommandation.",
      expectedSignals: ["orientation client", "ownership structure", "aisance avec l'ambiguite"],
      evidenceRequirements: ["exemple de probleme client", "perimetre d'ownership"]
    },
    "consulting-language-v0": {
      prompt:
        "Redigez une courte mise a jour client expliquant un retard de livraison et la prochaine action clairement.",
      expectedSignals: ["clarte", "responsabilite", "communication prete pour le client"],
      evidenceRequirements: ["contexte du retard", "prochaine action"]
    },
    "consulting-domain-v0": {
      prompt:
        "Expliquez comment vous identifieriez et documenteriez le risque technologique dans un processus qui depend de tableurs.",
      expectedSignals: ["identification du risque", "pensee controle", "discipline documentaire"],
      evidenceRequirements: ["exemples de risque", "approche de documentation"]
    },
    "consulting-work-sample-v0": {
      prompt:
        "Avec un jeu de donnees desordonne, des doublons et des responsables manquants, indiquez vos cinq premieres actions de nettoyage.",
      expectedSignals: ["analyse structuree", "triage de qualite des donnees", "priorisation"],
      evidenceRequirements: ["cinq actions", "raison de l'ordre"]
    },
    "consulting-case-v0": {
      prompt: "Un client conteste votre evaluation du risque. Comment gerez-vous la reunion?",
      expectedSignals: ["gestion des parties prenantes", "raisonnement base sur preuves", "jugement professionnel"],
      evidenceRequirements: ["approche de reunion", "gestion des preuves"]
    },
    "ai-analyst-motivation-v0": {
      prompt:
        "Decrivez le travail de gouvernance ou d'analyse AI qui vous motive et pourquoi il compte pour les utilisateurs.",
      expectedSignals: ["focus utilisateur", "interet pour la gouvernance AI", "motivation d'analyse responsable"],
      evidenceRequirements: ["exemple de travail", "impact utilisateur"]
    },
    "ai-analyst-language-v0": {
      prompt:
        "Resumez une limite d'un modele AI pour une partie prenante non technique en langage simple.",
      expectedSignals: ["explication simple", "communication du risque", "exactitude technique"],
      evidenceRequirements: ["limite", "implication business"]
    },
    "ai-analyst-domain-v0": {
      prompt:
        "Comment evalueriez-vous si une sortie de modele est assez fiable pour un workflow business?",
      expectedSignals: ["conception d'evaluation", "qualite des preuves", "seuils conscients du risque"],
      evidenceRequirements: ["controles", "criteres de decision"]
    },
    "ai-analyst-work-sample-v0": {
      prompt:
        "Examinez un chatbot hypothetique qui ne cite aucune source. Quels controles et garde-fous proposeriez-vous?",
      expectedSignals: ["conscience des sources", "pensee garde-fous", "securite utilisateur"],
      evidenceRequirements: ["controles", "garde-fous"]
    },
    "ai-analyst-case-v0": {
      prompt:
        "Une equipe veut automatiser une decision a fort impact avec des preuves limitees. Quelles questions posez-vous avant approbation?",
      expectedSignals: ["conscience de la revue humaine", "triage du risque", "exigences de preuves"],
      evidenceRequirements: ["questions d'approbation", "conditions de revue"]
    },
    "python-developer-motivation-v0": {
      prompt:
        "Decrivez le type de travail backend engineering ou vous etes le plus efficace et comment vous collaborez autour des arbitrages.",
      expectedSignals: ["motivation backend", "collaboration", "conscience des arbitrages"],
      evidenceRequirements: ["exemple de projet", "detail de collaboration"]
    },
    "python-developer-language-v0": {
      prompt:
        "Redigez une courte note de pull request expliquant aux reviewers une correction de performance de base de donnees.",
      expectedSignals: ["clarte technique", "pret pour revue", "ecriture concise"],
      evidenceRequirements: ["resume de correction", "note de test"]
    },
    "python-developer-domain-v0": {
      prompt:
        "Expliquez comment vous concevriez un endpoint API Python qui valide les entrees, ecrit dans SQL et reste testable.",
      expectedSignals: ["design API Python", "conscience SQL", "testabilite"],
      evidenceRequirements: ["approche de validation", "approche de persistance", "plan de test"]
    },
    "python-developer-work-sample-v0": {
      prompt:
        "Un service Python retourne des doublons apres un changement de pagination. Presentez votre plan de debug.",
      expectedSignals: ["structure de debug", "raisonnement donnees", "tests de regression"],
      evidenceRequirements: ["etapes de debug", "preuve de test ou monitoring"]
    },
    "python-developer-case-v0": {
      prompt:
        "Un product manager a besoin d'une integration rapide qui pourrait devenir permanente. Comment equilibrez-vous livraison et maintenabilite?",
      expectedSignals: ["jugement de livraison", "maintenabilite", "communication avec produit"],
      evidenceRequirements: ["explication de l'arbitrage", "mitigation du risque"]
    },
    "operations-motivation-v0": {
      prompt:
        "Decrivez un processus operationnel que vous amelioreriez d'abord et comment vous decidez qu'il vaut la peine d'etre change.",
      expectedSignals: ["motivation amelioration processus", "priorisation", "conscience de l'impact"],
      evidenceRequirements: ["exemple de processus", "mesure d'impact"]
    },
    "operations-language-v0": {
      prompt:
        "Redigez une courte mise a jour interne sur un incident de processus et la prochaine etape de recuperation.",
      expectedSignals: ["mise a jour claire", "ownership operationnelle", "focus recuperation"],
      evidenceRequirements: ["contexte incident", "prochaine etape"]
    },
    "operations-domain-v0": {
      prompt: "Comment mesureriez-vous si un processus de transfert est fiable?",
      expectedSignals: ["choix de metriques", "fiabilite du processus", "pensee cause racine"],
      evidenceRequirements: ["metriques", "cadence de revue"]
    },
    "operations-work-sample-v0": {
      prompt:
        "Un rapport hebdomadaire a des donnees sources incoherentes et une forte pression de delai. Quelles etapes suivez-vous?",
      expectedSignals: ["triage", "reconciliation des donnees", "communication parties prenantes"],
      evidenceRequirements: ["etapes de triage", "plan de communication"]
    },
    "operations-case-v0": {
      prompt:
        "Deux equipes ne sont pas d'accord sur la responsabilite d'un echec operationnel. Comment le resolvez-vous?",
      expectedSignals: ["jugement cross-fonctionnel", "collecte de preuves", "chemin de resolution"],
      evidenceRequirements: ["etapes de resolution", "alignement owner"]
    }
  }
};

export function resolveCandidateInterviewLanguageCode(
  value: unknown
): CandidateInterviewLanguageCode {
  return (
    resolveExplicitCandidateInterviewLanguageCode(value) ??
    DEFAULT_CANDIDATE_INTERVIEW_LANGUAGE
  );
}

export function resolveExplicitCandidateInterviewLanguageCode(
  value: unknown
): CandidateInterviewLanguageCode | undefined {
  return value === "it" || value === "fr" || value === "en" ? value : undefined;
}

export function resolveCandidateInterviewLanguage(
  value: unknown
): CandidateInterviewLanguageConfig {
  return LANGUAGE_CONFIGS[resolveCandidateInterviewLanguageCode(value)];
}

export function localizeInterviewQuestions(
  questions: readonly InterviewQuestion[],
  value: unknown
): InterviewQuestion[] {
  const language = resolveCandidateInterviewLanguageCode(value);
  if (language === "en") {
    return questions.map((question) => ({ ...question }));
  }

  const localized = LOCALIZED_QUESTION_COPY[language];
  return questions.map((question) => {
    const copy = localized[question.id] ?? localized[question.id.replace(/_/g, "-")];
    if (!copy) {
      return { ...question };
    }

    return {
      ...question,
      prompt: copy.prompt,
      expectedSignals: copy.expectedSignals ? [...copy.expectedSignals] : question.expectedSignals,
      evidenceRequirements: copy.evidenceRequirements
        ? [...copy.evidenceRequirements]
        : question.evidenceRequirements
    };
  });
}

export function localizedModuleDefinition(
  moduleId: ModuleId,
  value: unknown
): { readonly title?: string; readonly purpose?: string } {
  const language = resolveCandidateInterviewLanguageCode(value);
  if (language === "it") {
    return {
      motivation: {
        title: "Motivazione e preferenze di lavoro",
        purpose: "Capire interesse per il ruolo, stile di lavoro preferito e aspettative realistiche."
      },
      language: {
        title: "Comunicazione per il ruolo",
        purpose:
          "Raccogliere evidenza di comunicazione rilevante per il ruolo senza segnali di accento o madrelingua."
      },
      domain: {
        title: "Conoscenza del dominio",
        purpose: "Verificare ragionamento specifico del ruolo e conoscenze tecniche o commerciali."
      },
      work_sample: {
        title: "Esempio di lavoro",
        purpose: "Raccogliere un piccolo prodotto di lavoro o approccio strutturato rilevante per il ruolo."
      },
      case: {
        title: "Giudizio su scenario",
        purpose: "Osservare giudizio nell'ambiguita in uno scenario realistico del ruolo."
      }
    }[moduleId];
  }

  if (language === "fr") {
    return {
      motivation: {
        title: "Motivation et preferences de travail",
        purpose:
          "Comprendre l'interet pour le role, le style de travail prefere et les attentes realistes."
      },
      language: {
        title: "Communication pour le role",
        purpose:
          "Recueillir des preuves de communication liees au role sans signaux d'accent ou de langue maternelle."
      },
      domain: {
        title: "Connaissance du domaine",
        purpose:
          "Verifier le raisonnement specifique au role et les connaissances techniques ou commerciales."
      },
      work_sample: {
        title: "Exemple de travail",
        purpose:
          "Recueillir un petit livrable ou une approche structuree pertinente pour le role."
      },
      case: {
        title: "Jugement en scenario",
        purpose: "Observer le jugement dans l'ambiguite dans un scenario realiste du role."
      }
    }[moduleId];
  }

  return {};
}

export function localizeResumeAwarePrompt(
  moduleId: ModuleId,
  context: {
    readonly roleTitle: string;
    readonly primaryExperience: string;
    readonly resumeEvidence: string;
    readonly requirement: string;
    readonly missing?: string;
  },
  value: unknown
): string | undefined {
  const language = resolveCandidateInterviewLanguageCode(value);
  if (language === "it") {
    switch (moduleId) {
      case "motivation":
        return `Rispondi con un esempio passato specifico in formato STAR: Situazione, Compito, Azione, Risultato. Il tuo CV confermato cita ${context.primaryExperience}. Per il ruolo ${context.roleTitle}, raccontami un esempio in cui quell'esperienza mostra il requisito ${context.requirement}${context.missing ? ` e includi cosa un reviewer deve ancora capire su ${context.missing}` : ""}.`;
      case "language":
        return `Completa un breve controllo linguistico CEFR nella lingua target dichiarata nel tuo CV: una frase per grammatica/vocabolario, un breve riassunto per comprensione scritta e una risposta parlata per produzione orale. Collega il contenuto a ${context.resumeEvidence} e ai requisiti del ruolo ${context.roleTitle} usando solo evidenza di comunicazione.`;
      case "domain":
        return context.missing
          ? `Rispondi con un esempio passato specifico in formato STAR: Situazione, Compito, Azione, Risultato. Il tuo CV confermato cita ${context.primaryExperience} e ${context.resumeEvidence}. Raccontami quando hai usato quell'evidenza per ${context.requirement} e cosa un reviewer deve ancora capire su ${context.missing}.`
          : `Rispondi con un esempio passato specifico in formato STAR: Situazione, Compito, Azione, Risultato. Il tuo CV confermato cita ${context.primaryExperience} e ${context.resumeEvidence}. Raccontami quando hai usato quell'evidenza per supportare ${context.requirement}.`;
      case "work_sample":
        return `Rispondi con un esempio passato specifico in formato STAR: Situazione, Compito, Azione, Risultato. Usando l'evidenza del tuo CV da ${context.resumeEvidence}, raccontami quando hai creato un lavoro comparabile per ${context.roleTitle}, includendo i controlli che un reviewer dovrebbe usare per ${context.requirement}.`;
      case "case":
        return `Rispondi con un esempio passato specifico in formato STAR: Situazione, Compito, Azione, Risultato. Raccontami quando l'evidenza del tuo CV da ${context.resumeEvidence} ti ha aiutato a prendere una decisione ambigua per un lavoro simile a ${context.roleTitle}, includendo il requisito ${context.requirement}.`;
    }
  }

  if (language === "fr") {
    switch (moduleId) {
      case "motivation":
        return `Repondez avec un exemple passe precis au format STAR: Situation, Tache, Action, Resultat. Votre CV confirme mentionne ${context.primaryExperience}. Pour le role ${context.roleTitle}, racontez un exemple ou cette experience montre l'exigence ${context.requirement}${context.missing ? ` et incluez ce qu'un reviewer doit encore comprendre sur ${context.missing}` : ""}.`;
      case "language":
        return `Completez un court controle linguistique CEFR dans la langue cible declaree dans votre CV: une phrase pour grammaire/vocabulaire, un bref resume pour comprehension ecrite et une reponse parlee pour production orale. Reliez le contenu a ${context.resumeEvidence} et aux exigences du role ${context.roleTitle} en utilisant seulement des preuves de communication.`;
      case "domain":
        return context.missing
          ? `Repondez avec un exemple passe precis au format STAR: Situation, Tache, Action, Resultat. Votre CV confirme mentionne ${context.primaryExperience} et ${context.resumeEvidence}. Racontez quand vous avez utilise cette preuve pour ${context.requirement} et ce qu'un reviewer doit encore comprendre sur ${context.missing}.`
          : `Repondez avec un exemple passe precis au format STAR: Situation, Tache, Action, Resultat. Votre CV confirme mentionne ${context.primaryExperience} et ${context.resumeEvidence}. Racontez quand vous avez utilise cette preuve pour soutenir ${context.requirement}.`;
      case "work_sample":
        return `Repondez avec un exemple passe precis au format STAR: Situation, Tache, Action, Resultat. En utilisant la preuve de votre CV depuis ${context.resumeEvidence}, racontez quand vous avez produit un travail comparable pour ${context.roleTitle}, avec les controles qu'un reviewer devrait utiliser pour ${context.requirement}.`;
      case "case":
        return `Repondez avec un exemple passe precis au format STAR: Situation, Tache, Action, Resultat. Racontez quand la preuve de votre CV depuis ${context.resumeEvidence} vous a aide a prendre une decision ambigue pour un travail proche de ${context.roleTitle}, avec l'exigence ${context.requirement}.`;
    }
  }

  return undefined;
}

export function localizeFollowUpPrompt(
  parentQuestion: InterviewQuestion,
  reason: FollowUpReason,
  evidenceTarget: string,
  value: unknown
): string | undefined {
  const language = resolveCandidateInterviewLanguageCode(value);
  if (language === "it") {
    switch (reason) {
      case "clarify_evidence":
        return `Aggiungi un esempio concreto o un artefatto che supporti la tua risposta precedente su ${evidenceTarget}.`;
      case "validate_role_requirement":
        return `Collega la tua risposta precedente al requisito del ruolo per ${evidenceTarget}.`;
      case "resolve_contradiction":
        return "Chiarisci la sequenza degli eventi cosi' un reviewer puo' capire il possibile conflitto nelle risposte.";
      case "increase_confidence":
        return "Dai una versione breve e passo per passo della risposta con l'evidenza su cui un reviewer dovrebbe basarsi.";
    }
  }

  if (language === "fr") {
    switch (reason) {
      case "clarify_evidence":
        return `Ajoutez un exemple concret ou un artefact qui soutient votre reponse precedente sur ${evidenceTarget}.`;
      case "validate_role_requirement":
        return `Reliez votre reponse precedente a l'exigence du role pour ${evidenceTarget}.`;
      case "resolve_contradiction":
        return "Clarifiez la sequence des evenements afin qu'un reviewer comprenne le conflit apparent dans vos reponses.";
      case "increase_confidence":
        return "Donnez une version courte et etape par etape de votre reponse avec les preuves sur lesquelles un reviewer devrait s'appuyer.";
    }
  }

  void parentQuestion;
  return undefined;
}
