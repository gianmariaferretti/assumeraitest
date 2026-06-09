import type { CounterfactualFixture } from "../types";
import { communicationFixtures } from "./competencies/communication";
import { problemSolvingFixtures } from "./competencies/problem-solving";
import { domainKnowledgeFixtures } from "./competencies/domain-knowledge";
import { collaborationFixtures } from "./competencies/collaboration";
import { judgmentFixtures } from "./competencies/judgment";

/** All Level-1 competency counterfactual fixtures (20 triples). */
export const allCounterfactualFixtures: readonly CounterfactualFixture[] = [
  ...communicationFixtures,
  ...problemSolvingFixtures,
  ...domainKnowledgeFixtures,
  ...collaborationFixtures,
  ...judgmentFixtures,
];

export {
  communicationFixtures,
  problemSolvingFixtures,
  domainKnowledgeFixtures,
  collaborationFixtures,
  judgmentFixtures,
};
