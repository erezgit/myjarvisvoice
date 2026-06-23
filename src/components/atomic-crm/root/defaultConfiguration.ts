import { Mars, NonBinary, Venus } from "lucide-react";

export const defaultDarkModeLogo = "./logos/logo_jarvis_dark.svg";
export const defaultLightModeLogo = "./logos/logo_jarvis_light.svg";

export const defaultTitle = "My Jarvis Voice";

export const defaultNoteStatuses = [
  { value: "draft", label: "Draft", color: "#8b949e" },
  { value: "active", label: "Active", color: "#58a6ff" },
  { value: "important", label: "Important", color: "#f0883e" },
  { value: "resolved", label: "Resolved", color: "#3fb950" },
];

export const defaultTaskTypes = [
  "None",
  "Todo",
  "Meeting",
  "Call",
  "Email",
  "Follow-up",
  "Review",
  "Research",
];

export const defaultContactGender = [
  { value: "male", label: "He/Him", icon: Mars },
  { value: "female", label: "She/Her", icon: Venus },
  { value: "nonbinary", label: "They/Them", icon: NonBinary },
];

export const defaultLifecycleStages = [
  { value: "new_lead", label: "New Lead" },
  { value: "active", label: "Active" },
  { value: "returning", label: "Returning" },
  { value: "vip", label: "VIP" },
  { value: "inactive", label: "Inactive" },
];

export const defaultLeadSources = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social Media" },
  { value: "organic", label: "Organic" },
  { value: "paid", label: "Paid" },
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "other", label: "Other" },
];

export const defaultOrderStages = [
  { value: "pending", label: "Pending", color: "#58a6ff" },
  { value: "processing", label: "Processing", color: "#f0883e" },
  { value: "shipped", label: "Shipped", color: "#a78bfa" },
  { value: "completed", label: "Completed", color: "#3fb950" },
  { value: "cancelled", label: "Cancelled", color: "#6e7681" },
];

export const defaultActivityStatuses = [
  { value: "none", label: "None", color: "#6e7681" },
  { value: "new", label: "New", color: "#58a6ff" },
  { value: "no_answer", label: "No Answer", color: "#8b949e" },
  { value: "follow_up", label: "Follow Up", color: "#f0883e" },
  { value: "appointment_set", label: "Appointment Set", color: "#a78bfa" },
  { value: "appointment_cancelled", label: "Cancelled", color: "#f85149" },
  { value: "no_show", label: "No Show", color: "#f85149" },
  { value: "purchase", label: "Purchase", color: "#3fb950" },
  { value: "lost_lead", label: "Lost", color: "#f85149" },
  { value: "out_of_queue", label: "Out of Queue", color: "#6e7681" },
];

export const defaultQualificationStatuses = [
  { value: "select", label: "Unqualified", color: "#8b949e" },
  { value: "qualified", label: "Qualified", color: "#3fb950" },
  { value: "disqualified", label: "Disqualified", color: "#f85149" },
];

export const defaultReadinessLevels = [
  { value: "high", label: "High", color: "#f85149" },
  { value: "medium", label: "Medium", color: "#f0883e" },
  { value: "low", label: "Low", color: "#58a6ff" },
];

export const defaultLostReasons = [
  { value: "price", label: "Price" },
  { value: "product_fit", label: "Product Fit" },
  { value: "distance", label: "Distance" },
  { value: "solved_with_competitor", label: "Competitor" },
  { value: "timing", label: "Timing" },
  { value: "other", label: "Other" },
];

export type FeatureFlags = {
  contacts: boolean;
  tasks: boolean;
  notes: boolean;
  tags: boolean;
  dashboard: boolean;
  companies: boolean;
  orders: boolean;
  members: boolean;
  analytics: boolean;
  leads: boolean;
};

export const defaultFeatures: FeatureFlags = {
  contacts: false,
  tasks: false,
  notes: false,
  tags: false,
  dashboard: true,
  companies: false,
  orders: false,
  members: false,
  analytics: false,
  leads: false,
};
