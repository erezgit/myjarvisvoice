import type { ComponentType } from "react";
import { DecisionsSection } from "./DecisionsSection";
import { ActionItemsSection } from "./ActionItemsSection";
import { TimelineSection } from "./TimelineSection";
import { DebatesSection } from "./DebatesSection";
import { DeepDivesSection } from "./DeepDivesSection";
import { OpenQuestionsSection } from "./OpenQuestionsSection";
import { ContactsSection } from "./ContactsSection";
import { KeyValueSection } from "./KeyValueSection";
import { MarkdownSection } from "./MarkdownSection";
import { TableSection } from "./TableSection";
import { ChecklistSection } from "./ChecklistSection";
import { KpiCardsSection } from "./KpiCardsSection";
import { TranscriptSection } from "./TranscriptSection";

export type SectionData = {
  type: string;
  title: string;
  data: any;
};

export type SectionComponentProps = {
  data: any;
};

export const SECTION_REGISTRY: Record<string, ComponentType<SectionComponentProps>> = {
  decisions: DecisionsSection,
  action_items: ActionItemsSection,
  timeline: TimelineSection,
  debates: DebatesSection,
  deep_dives: DeepDivesSection,
  open_questions: OpenQuestionsSection,
  contacts: ContactsSection,
  key_value: KeyValueSection,
  markdown: MarkdownSection,
  table: TableSection,
  checklist: ChecklistSection,
  kpi_cards: KpiCardsSection,
  transcript: TranscriptSection,
};
