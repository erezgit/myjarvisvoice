import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
} from "./consts";

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type MemberRole = 'admin' | 'manager' | 'member';

export type MemberFormData = {
  avatar?: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: MemberRole;
  administrator: boolean;
  disabled: boolean;
};

export type Member = {
  first_name: string;
  last_name: string;
  role: MemberRole;
  administrator: boolean;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  state_abbr: string;
  member_id?: Identifier | null;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  phone: string;
  type: "Work" | "Home" | "Other";
};

export type ActivityStatus = 'none' | 'new' | 'no_answer' | 'lost_lead' | 'out_of_queue' | 'follow_up' | 'no_show' | 'appointment_cancelled' | 'appointment_set' | 'purchase';

export type QualificationStatus = 'select' | 'qualified' | 'disqualified';

export type ReadinessToBook = 'high' | 'medium' | 'low';

export type LostReason = 'price' | 'product_fit' | 'distance' | 'solved_with_competitor' | 'timing' | 'other';

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id?: Identifier | null;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: Identifier[];
  gender: string;
  member_id?: Identifier | null;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  lifecycle_stage: string;
  lead_source?: string | null;
  date_of_birth?: string | null;
  // Lead pipeline fields
  activity_status: ActivityStatus;
  qualification_status: QualificationStatus;
  readiness_to_book?: ReadinessToBook | null;
  lost_reason?: LostReason | null;
  lead_bio?: string | null;
  followup_prompt?: string | null;
  followup_date?: string | null;
  last_contact_at?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  manychat_id?: string | null;
  nb_tasks?: number;
  company_name?: string;
  client_preferences?: ClientPreferences;
} & Pick<RaRecord, "id">;

export type ContactNote = {
  contact_id: Identifier;
  text: string;
  date: string;
  member_id: Identifier;
  status: string;
  attachments?: AttachmentNote[];
} & Pick<RaRecord, "id">;

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type Task = {
  contact_id: Identifier;
  type: string;
  text: string;
  due_date: string;
  done_date?: string | null;
  member_id?: Identifier;
} & Pick<RaRecord, "id">;

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';

export type Order = {
  contact_id: Identifier;
  member_id?: Identifier | null;
  status: OrderStatus;
  order_date: string;
  order_number?: string | null;
  description?: string | null;
  // Lifecycle dates
  expected_delivery?: string | null;
  completed_date?: string | null;
  // Financial
  total_amount?: number | null;
  open_balance?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // From orders_summary view
  contact_first_name?: string;
  contact_last_name?: string;
  member_first_name?: string;
  member_last_name?: string;
} & Pick<RaRecord, "id">;

export type ClientPreferences = {
  data?: Record<string, any>;
  liked?: Record<string, any>;
  persona?: Record<string, any>;
};

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  member_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactNoteCreated = {
  type: typeof CONTACT_NOTE_CREATED;
  member_id?: Identifier;
  contactNote: ContactNote;
  date: string;
} & Pick<RaRecord, "id">;

export type Activity = RaRecord &
  (
    | ActivityContactCreated
    | ActivityContactNoteCreated
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;

export type ActionItemStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type ActionItem = {
  text: string;
  status: ActionItemStatus;
  category: string;
  meeting_id?: Identifier | null;
  member_id?: Identifier | null;
  due_date?: string | null;
  done_date?: string | null;
  created_at: string;
} & Pick<RaRecord, 'id'>;

export type AutomationStatus = 'active' | 'paused' | 'archived';
export type AutomationRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type Automation = {
  name: string;
  prompt: string;
  created_by: string;
  max_budget_usd: number;
  max_turns: number;
  status: AutomationStatus;
  heartbeat_seconds?: number | null;
  scheduled_end?: string | null;
  schedule_cron?: string | null;
  last_run_at?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
} & Pick<RaRecord, 'id'>;

export type AutomationRun = {
  automation_id: string;
  started_by: string;
  status: AutomationRunStatus;
  session_id?: string | null;
  result_text?: string | null;
  cost_usd?: number | null;
  error_message?: string | null;
  queued_at: string;
  started_at?: string | null;
  completed_at?: string | null;
} & Pick<RaRecord, 'id'>;

export type PageContent<T extends Record<string, any> = Record<string, any>> = {
  page_slug: string;
  content: T;
  updated_at?: string;
} & Pick<RaRecord, "id">;

export interface NoteStatus {
  value: string;
  label: string;
  color: string;
}

export interface OrderStage {
  value: string;
  label: string;
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}
