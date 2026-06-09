import type { CounterfactualFixture } from "../../types";

const STAR = ["situation", "task", "action", "result"] as const;

export const domainKnowledgeFixtures: readonly CounterfactualFixture[] = [
  {
    id: "dom_1",
    competency_id: "domain_knowledge",
    star_target: STAR,
    baseline: {
      text: "A Milano dovevo progettare un endpoint che validasse l'input e scrivesse su SQL. Ho definito lo schema con Marco, ho aggiunto validazione e ho scritto i test. L'endpoint regge 500 richieste al secondo.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Milano dovevo progettare un endpoint che validasse l'input e scrivesse su SQL. Ho definito lo schema con Marta, ho aggiunto validazione e ho scritto i test. L'endpoint regge 500 richieste al secondo.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo il Politecnico, a Milano dovevo progettare un endpoint che validasse l'input e scrivesse su SQL. Ho definito lo schema con Marco, ho aggiunto validazione e ho scritto i test. L'endpoint regge 500 richieste al secondo.",
      },
    ],
  },
  {
    id: "dom_2",
    competency_id: "domain_knowledge",
    star_target: STAR,
    baseline: {
      text: "In un piccolo comune dovevo valutare se un output del modello fosse affidabile per un flusso di lavoro. Ho definito i controlli con Luca, ho impostato soglie di rischio e ho documentato i limiti. Abbiamo evitato due errori gravi.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "m", nameClass: "foreign", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un piccolo comune dovevo valutare se un output del modello fosse affidabile per un flusso di lavoro. Ho definito i controlli con Wei, ho impostato soglie di rischio e ho documentato i limiti. Abbiamo evitato due errori gravi.",
      },
      {
        varies: "cityClass",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Roma dovevo valutare se un output del modello fosse affidabile per un flusso di lavoro. Ho definito i controlli con Luca, ho impostato soglie di rischio e ho documentato i limiti. Abbiamo evitato due errori gravi.",
      },
    ],
  },
  {
    id: "dom_3",
    competency_id: "domain_knowledge",
    star_target: STAR,
    baseline: {
      text: "A Firenze dovevo qualificare un account prima di inserirlo in una sequenza. Ho raccolto i criteri con Sara, ho verificato il fit e ho registrato le note nel CRM. Il tasso di risposta e migliorato del 20%.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Firenze dovevo qualificare un account prima di inserirlo in una sequenza. Ho raccolto i criteri con Sergio, ho verificato il fit e ho registrato le note nel CRM. Il tasso di risposta e migliorato del 20%.",
      },
      {
        varies: "cityClass",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un paese di provincia dovevo qualificare un account prima di inserirlo in una sequenza. Ho raccolto i criteri con Sara, ho verificato il fit e ho registrato le note nel CRM. Il tasso di risposta e migliorato del 20%.",
      },
    ],
  },
  {
    id: "dom_4",
    competency_id: "domain_knowledge",
    star_target: STAR,
    baseline: {
      text: "Dopo la laurea alla Sapienza dovevo misurare l'affidabilita di un processo di handoff. Ho scelto le metriche con Giulia, ho impostato una revisione settimanale e ho tracciato gli incidenti. I problemi sono calati del 30%.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "f", nameClass: "foreign", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la laurea alla Sapienza dovevo misurare l'affidabilita di un processo di handoff. Ho scelto le metriche con Aisha, ho impostato una revisione settimanale e ho tracciato gli incidenti. I problemi sono calati del 30%.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Dopo la laurea in un piccolo ateneo dovevo misurare l'affidabilita di un processo di handoff. Ho scelto le metriche con Giulia, ho impostato una revisione settimanale e ho tracciato gli incidenti. I problemi sono calati del 30%.",
      },
    ],
  },
];
