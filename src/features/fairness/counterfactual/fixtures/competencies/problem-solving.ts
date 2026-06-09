import type { CounterfactualFixture } from "../../types";

const STAR = ["situation", "task", "action", "result"] as const;

export const problemSolvingFixtures: readonly CounterfactualFixture[] = [
  {
    id: "ps_1",
    competency_id: "problem_solving",
    star_target: STAR,
    baseline: {
      text: "A Milano un report settimanale aveva dati incoerenti. Dovevo trovare la causa. Ho isolato la fonte con Marco, ho corretto la query e ho aggiunto un controllo. Gli errori sono spariti per due mesi.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Milano un report settimanale aveva dati incoerenti. Dovevo trovare la causa. Ho isolato la fonte con Marta, ho corretto la query e ho aggiunto un controllo. Gli errori sono spariti per due mesi.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo il Politecnico, a Milano un report settimanale aveva dati incoerenti. Dovevo trovare la causa. Ho isolato la fonte con Marco, ho corretto la query e ho aggiunto un controllo. Gli errori sono spariti per due mesi.",
      },
    ],
  },
  {
    id: "ps_2",
    competency_id: "problem_solving",
    star_target: STAR,
    baseline: {
      text: "In un piccolo comune un servizio restituiva record duplicati. Dovevo risolvere prima del rilascio. Ho ricostruito il flusso con Luca, ho trovato la paginazione errata e ho scritto un test. Il bug non si e ripresentato.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "m", nameClass: "foreign", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un piccolo comune un servizio restituiva record duplicati. Dovevo risolvere prima del rilascio. Ho ricostruito il flusso con Omar, ho trovato la paginazione errata e ho scritto un test. Il bug non si e ripresentato.",
      },
      {
        varies: "cityClass",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Napoli un servizio restituiva record duplicati. Dovevo risolvere prima del rilascio. Ho ricostruito il flusso con Luca, ho trovato la paginazione errata e ho scritto un test. Il bug non si e ripresentato.",
      },
    ],
  },
  {
    id: "ps_3",
    competency_id: "problem_solving",
    star_target: STAR,
    baseline: {
      text: "A Bologna un processo manuale richiedeva troppe ore. Dovevo ridurre il tempo. Ho mappato gli step con Sara, ho automatizzato due passaggi e ho misurato l'impatto. Abbiamo risparmiato sei ore a settimana.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Bologna un processo manuale richiedeva troppe ore. Dovevo ridurre il tempo. Ho mappato gli step con Stefano, ho automatizzato due passaggi e ho misurato l'impatto. Abbiamo risparmiato sei ore a settimana.",
      },
      {
        varies: "cityClass",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un paese di provincia un processo manuale richiedeva troppe ore. Dovevo ridurre il tempo. Ho mappato gli step con Sara, ho automatizzato due passaggi e ho misurato l'impatto. Abbiamo risparmiato sei ore a settimana.",
      },
    ],
  },
  {
    id: "ps_4",
    competency_id: "problem_solving",
    star_target: STAR,
    baseline: {
      text: "Dopo la laurea alla Bocconi dovevo capire perche un imbuto di vendita perdeva clienti. Ho analizzato i dati con Chiara, ho individuato uno step confuso e ho proposto una modifica. La conversione e salita del 12%.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "f", nameClass: "foreign", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la laurea alla Bocconi dovevo capire perche un imbuto di vendita perdeva clienti. Ho analizzato i dati con Mei, ho individuato uno step confuso e ho proposto una modifica. La conversione e salita del 12%.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Dopo la laurea in un piccolo ateneo dovevo capire perche un imbuto di vendita perdeva clienti. Ho analizzato i dati con Chiara, ho individuato uno step confuso e ho proposto una modifica. La conversione e salita del 12%.",
      },
    ],
  },
];
