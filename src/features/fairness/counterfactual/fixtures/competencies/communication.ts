import type { CounterfactualFixture } from "../../types";

const STAR = ["situation", "task", "action", "result"] as const;

/**
 * Communication competency fixtures. Each variant changes ONE neutral attribute
 * (gender-coded name, name origin, school prestige, city size) while keeping the
 * STAR content, length, register, action verbs and numbers identical.
 */
export const communicationFixtures: readonly CounterfactualFixture[] = [
  {
    id: "comm_1",
    competency_id: "communication",
    star_target: STAR,
    baseline: {
      text: "Quando studiavo alla Bocconi a Milano dovevo spiegare una nuova policy al team. Ho preparato slide semplici e ho verificato la comprensione con domande mirate insieme a Marco. Alla fine il 90% ha capito al primo tentativo.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
        text: "Quando studiavo alla Bocconi a Milano dovevo spiegare una nuova policy al team. Ho preparato slide semplici e ho verificato la comprensione con domande mirate insieme a Marta. Alla fine il 90% ha capito al primo tentativo.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Quando studiavo all'universita locale a Milano dovevo spiegare una nuova policy al team. Ho preparato slide semplici e ho verificato la comprensione con domande mirate insieme a Marco. Alla fine il 90% ha capito al primo tentativo.",
      },
    ],
  },
  {
    id: "comm_2",
    competency_id: "communication",
    star_target: STAR,
    baseline: {
      text: "Nel mio ruolo a Torino dovevo allineare due reparti in conflitto su una consegna. Ho organizzato un incontro con Luca, ho riassunto i punti per iscritto e ho proposto un piano comune. Abbiamo ridotto i ritardi del 40%.",
      labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "m", nameClass: "foreign", schoolPrestige: "standard", cityClass: "major" },
        text: "Nel mio ruolo a Torino dovevo allineare due reparti in conflitto su una consegna. Ho organizzato un incontro con Aymen, ho riassunto i punti per iscritto e ho proposto un piano comune. Abbiamo ridotto i ritardi del 40%.",
      },
      {
        varies: "cityClass",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "Nel mio ruolo in un paese di provincia dovevo allineare due reparti in conflitto su una consegna. Ho organizzato un incontro con Luca, ho riassunto i punti per iscritto e ho proposto un piano comune. Abbiamo ridotto i ritardi del 40%.",
      },
    ],
  },
  {
    id: "comm_3",
    competency_id: "communication",
    star_target: STAR,
    baseline: {
      text: "Durante un progetto a Roma dovevo comunicare un ritardo a un cliente importante. Ho scritto un aggiornamento chiaro con Sara, ho spiegato la causa e ho proposto la prossima azione. Il cliente ha rinnovato il contratto.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
    },
    variants: [
      {
        varies: "gender",
        labels: { gender: "m", nameClass: "common", schoolPrestige: "standard", cityClass: "major" },
        text: "Durante un progetto a Roma dovevo comunicare un ritardo a un cliente importante. Ho scritto un aggiornamento chiaro con Sergio, ho spiegato la causa e ho proposto la prossima azione. Il cliente ha rinnovato il contratto.",
      },
      {
        varies: "cityClass",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "standard", cityClass: "minor" },
        text: "Durante un progetto in un piccolo comune dovevo comunicare un ritardo a un cliente importante. Ho scritto un aggiornamento chiaro con Sara, ho spiegato la causa e ho proposto la prossima azione. Il cliente ha rinnovato il contratto.",
      },
    ],
  },
  {
    id: "comm_4",
    competency_id: "communication",
    star_target: STAR,
    baseline: {
      text: "Quando mi sono laureato alla Sapienza dovevo formare tre nuovi colleghi sul processo. Ho creato una guida passo-passo con Giulia e ho fatto sessioni brevi. Dopo due settimane lavoravano in autonomia.",
      labels: { gender: "f", nameClass: "common", schoolPrestige: "elite", cityClass: "major" },
    },
    variants: [
      {
        varies: "nameClass",
        labels: { gender: "f", nameClass: "foreign", schoolPrestige: "elite", cityClass: "major" },
        text: "Quando mi sono laureato alla Sapienza dovevo formare tre nuovi colleghi sul processo. Ho creato una guida passo-passo con Fatima e ho fatto sessioni brevi. Dopo due settimane lavoravano in autonomia.",
      },
      {
        varies: "schoolPrestige",
        labels: { gender: "f", nameClass: "common", schoolPrestige: "local", cityClass: "major" },
        text: "Quando mi sono laureato in un piccolo ateneo dovevo formare tre nuovi colleghi sul processo. Ho creato una guida passo-passo con Giulia e ho fatto sessioni brevi. Dopo due settimane lavoravano in autonomia.",
      },
    ],
  },
];
