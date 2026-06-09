import type { CounterfactualFixture } from "../../types";

const STAR = ["situation", "task", "action", "result"] as const;

export const judgmentFixtures: readonly CounterfactualFixture[] = [
  {
    id: "judg_1",
    competency_id: "judgment",
    star_target: STAR,
    baseline: {
      text: "A Milano un cliente chiedeva uno sconto fuori politica. Dovevo decidere senza perdere il rapporto. Ho valutato i rischi con Marco, ho proposto un'alternativa di valore e ho spiegato i limiti. Il cliente ha accettato.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Milano un cliente chiedeva uno sconto fuori politica. Dovevo decidere senza perdere il rapporto. Ho valutato i rischi con Marta, ho proposto un'alternativa di valore e ho spiegato i limiti. Il cliente ha accettato.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la Bocconi, a Milano un cliente chiedeva uno sconto fuori politica. Dovevo decidere senza perdere il rapporto. Ho valutato i rischi con Marco, ho proposto un'alternativa di valore e ho spiegato i limiti. Il cliente ha accettato.",
      },
    ],
  },
  {
    id: "judg_2",
    competency_id: "judgment",
    star_target: STAR,
    baseline: {
      text: "In un piccolo comune un team voleva automatizzare una decisione con poche evidenze. Dovevo decidere se approvare. Ho posto domande di rischio con Luca, ho chiesto piu dati e ho rimandato il rilascio. Abbiamo evitato un errore costoso.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "m", nameClass: "foreign", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un piccolo comune un team voleva automatizzare una decisione con poche evidenze. Dovevo decidere se approvare. Ho posto domande di rischio con Hassan, ho chiesto piu dati e ho rimandato il rilascio. Abbiamo evitato un errore costoso.",
      },
      {
        varies: "cityClass",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Roma un team voleva automatizzare una decisione con poche evidenze. Dovevo decidere se approvare. Ho posto domande di rischio con Luca, ho chiesto piu dati e ho rimandato il rilascio. Abbiamo evitato un errore costoso.",
      },
    ],
  },
  {
    id: "judg_3",
    competency_id: "judgment",
    star_target: STAR,
    baseline: {
      text: "A Firenze dovevo scegliere tra consegnare in fretta o rifare un'integrazione fragile. Ho pesato i tradeoff con Sara, ho scelto una soluzione manutenibile e ho spiegato la scelta al PM. Nessun incidente nei mesi successivi.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Firenze dovevo scegliere tra consegnare in fretta o rifare un'integrazione fragile. Ho pesato i tradeoff con Sergio, ho scelto una soluzione manutenibile e ho spiegato la scelta al PM. Nessun incidente nei mesi successivi.",
      },
      {
        varies: "cityClass",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un paese di provincia dovevo scegliere tra consegnare in fretta o rifare un'integrazione fragile. Ho pesato i tradeoff con Sara, ho scelto una soluzione manutenibile e ho spiegato la scelta al PM. Nessun incidente nei mesi successivi.",
      },
    ],
  },
  {
    id: "judg_4",
    competency_id: "judgment",
    star_target: STAR,
    baseline: {
      text: "Dopo la laurea alla Sapienza dovevo gestire un reclamo delicato di un cliente. Ho raccolto i fatti con Giulia, ho riconosciuto l'errore e ho proposto un rimedio concreto. Il cliente e rimasto con noi.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "f", nameClass: "foreign", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la laurea alla Sapienza dovevo gestire un reclamo delicato di un cliente. Ho raccolto i fatti con Yuki, ho riconosciuto l'errore e ho proposto un rimedio concreto. Il cliente e rimasto con noi.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Dopo la laurea in un piccolo ateneo dovevo gestire un reclamo delicato di un cliente. Ho raccolto i fatti con Giulia, ho riconosciuto l'errore e ho proposto un rimedio concreto. Il cliente e rimasto con noi.",
      },
    ],
  },
];
