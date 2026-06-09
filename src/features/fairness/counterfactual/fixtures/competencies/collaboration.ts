import type { CounterfactualFixture } from "../../types";

const STAR = ["situation", "task", "action", "result"] as const;

export const collaborationFixtures: readonly CounterfactualFixture[] = [
  {
    id: "collab_1",
    competency_id: "collaboration",
    star_target: STAR,
    baseline: {
      text: "A Milano due team non erano d'accordo sulla priorita di un rilascio. Dovevo trovare un compromesso. Ho ascoltato entrambe le parti con Marco, ho proposto un piano in due fasi e l'ho condiviso. Il rilascio e uscito in tempo.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Milano due team non erano d'accordo sulla priorita di un rilascio. Dovevo trovare un compromesso. Ho ascoltato entrambe le parti con Marta, ho proposto un piano in due fasi e l'ho condiviso. Il rilascio e uscito in tempo.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la Bocconi, a Milano due team non erano d'accordo sulla priorita di un rilascio. Dovevo trovare un compromesso. Ho ascoltato entrambe le parti con Marco, ho proposto un piano in due fasi e l'ho condiviso. Il rilascio e uscito in tempo.",
      },
    ],
  },
  {
    id: "collab_2",
    competency_id: "collaboration",
    star_target: STAR,
    baseline: {
      text: "In un piccolo comune un collega era in difficolta con una scadenza. Dovevo aiutarlo senza rallentare il mio lavoro. Ho ripartito i compiti con Luca, ho preso una parte e abbiamo consegnato insieme. Il cliente ha ringraziato il team.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "m", nameClass: "foreign", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un piccolo comune un collega era in difficolta con una scadenza. Dovevo aiutarlo senza rallentare il mio lavoro. Ho ripartito i compiti con Karim, ho preso una parte e abbiamo consegnato insieme. Il cliente ha ringraziato il team.",
      },
      {
        varies: "cityClass",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Torino un collega era in difficolta con una scadenza. Dovevo aiutarlo senza rallentare il mio lavoro. Ho ripartito i compiti con Luca, ho preso una parte e abbiamo consegnato insieme. Il cliente ha ringraziato il team.",
      },
    ],
  },
  {
    id: "collab_3",
    competency_id: "collaboration",
    star_target: STAR,
    baseline: {
      text: "A Bologna dovevo coordinare il lavoro tra design e sviluppo. Ho creato un punto settimanale con Sara, ho chiarito le responsabilita e ho tenuto traccia delle decisioni. Le revisioni si sono dimezzate.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "A Bologna dovevo coordinare il lavoro tra design e sviluppo. Ho creato un punto settimanale con Stefano, ho chiarito le responsabilita e ho tenuto traccia delle decisioni. Le revisioni si sono dimezzate.",
      },
      {
        varies: "cityClass",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "In un paese di provincia dovevo coordinare il lavoro tra design e sviluppo. Ho creato un punto settimanale con Sara, ho chiarito le responsabilita e ho tenuto traccia delle decisioni. Le revisioni si sono dimezzate.",
      },
    ],
  },
  {
    id: "collab_4",
    competency_id: "collaboration",
    star_target: STAR,
    baseline: {
      text: "Dopo la laurea alla Sapienza dovevo integrare una persona nuova nel team. Ho preparato un percorso con Giulia, ho fatto da riferimento e ho raccolto feedback. La persona e diventata autonoma in un mese.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "f", nameClass: "foreign", schoolPrestige: "elite", cityClass: "major" },
        text: "Dopo la laurea alla Sapienza dovevo integrare una persona nuova nel team. Ho preparato un percorso con Lin, ho fatto da riferimento e ho raccolto feedback. La persona e diventata autonoma in un mese.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Dopo la laurea in un piccolo ateneo dovevo integrare una persona nuova nel team. Ho preparato un percorso con Giulia, ho fatto da riferimento e ho raccolto feedback. La persona e diventata autonoma in un mese.",
      },
    ],
  },
];
