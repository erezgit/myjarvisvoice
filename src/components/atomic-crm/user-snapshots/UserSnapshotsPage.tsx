import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, File, FolderTree } from "lucide-react";

// --- Data Types ---

type TreeNode = {
  name: string;
  type: "folder" | "file";
  count?: number;
  description?: string;
  children?: TreeNode[];
};

// --- Tree Data ---

const lilahTree: TreeNode[] = [
  {
    name: "Docs",
    type: "folder",
    count: 13,
    description: "Top-level documents and guides",
    children: [
      { name: "מדריך-שימוש.html", type: "file", description: "Usage guide" },
      { name: "הגדרות-מערכת.html", type: "file", description: "System settings" },
      { name: "תבנית-כרטיסייה.html", type: "file", description: "Card template" },
      { name: "רשימת-תיוגים.html", type: "file", description: "Tags list" },
      { name: "סיכום-פגישה.html", type: "file", description: "Meeting summary template" },
      { name: "תהליך-קליטה.html", type: "file", description: "Onboarding process" },
      { name: "מעקב-תשלומים.html", type: "file", description: "Payment tracking" },
      { name: "דוח-חודשי.html", type: "file", description: "Monthly report" },
      { name: "הסכם-שירות.html", type: "file", description: "Service agreement" },
      { name: "טופס-הערכה.html", type: "file", description: "Evaluation form" },
      { name: "תכנית-עבודה.html", type: "file", description: "Work plan" },
      { name: "משוב-לקוח.html", type: "file", description: "Client feedback form" },
      { name: "סיכום-שנתי.html", type: "file", description: "Annual summary" },
    ],
  },
  {
    name: "knowledge-base",
    type: "folder",
    count: 4,
    description: "Reference articles and methodologies",
    children: [
      { name: "coaching-models.html", type: "file", description: "Coaching methodology overview" },
      { name: "session-structures.html", type: "file", description: "Session planning frameworks" },
      { name: "assessment-tools.html", type: "file", description: "Client assessment methods" },
      { name: "resources-library.html", type: "file", description: "Curated external resources" },
    ],
  },
  {
    name: "כרטיסיות",
    type: "folder",
    count: 344,
    description: "10 card types — the core data",
    children: [
      {
        name: "לקוחות-פרטיים",
        type: "folder",
        count: 87,
        description: "Individual coaching clients",
        children: [
          { name: "client-001.html", type: "file", description: "Client profile + session log" },
          { name: "client-002.html", type: "file", description: "Client profile + session log" },
          { name: "... (87 files)", type: "file" },
        ],
      },
      {
        name: "לקוחות-ארגוניים",
        type: "folder",
        count: 23,
        description: "Corporate/org clients",
        children: [
          { name: "org-001.html", type: "file", description: "Organization profile" },
          { name: "... (23 files)", type: "file" },
        ],
      },
      {
        name: "סדנאות",
        type: "folder",
        count: 45,
        description: "Workshops and group sessions",
        children: [
          { name: "workshop-001.html", type: "file", description: "Workshop details + attendance" },
          { name: "... (45 files)", type: "file" },
        ],
      },
      {
        name: "תוכניות",
        type: "folder",
        count: 18,
        description: "Multi-session programs",
        children: [
          { name: "program-001.html", type: "file", description: "Program outline + progress" },
          { name: "... (18 files)", type: "file" },
        ],
      },
      {
        name: "מפגשים",
        type: "folder",
        count: 62,
        description: "Individual session records",
        children: [
          { name: "session-001.html", type: "file", description: "Session notes + action items" },
          { name: "... (62 files)", type: "file" },
        ],
      },
      {
        name: "משימות",
        type: "folder",
        count: 34,
        description: "Tasks and follow-ups",
        children: [
          { name: "task-001.html", type: "file", description: "Task detail" },
          { name: "... (34 files)", type: "file" },
        ],
      },
      {
        name: "הערכות",
        type: "folder",
        count: 28,
        description: "Client assessments",
        children: [
          { name: "assessment-001.html", type: "file", description: "Assessment results" },
          { name: "... (28 files)", type: "file" },
        ],
      },
      {
        name: "חשבוניות",
        type: "folder",
        count: 19,
        description: "Invoices and billing",
        children: [
          { name: "invoice-001.html", type: "file", description: "Invoice record" },
          { name: "... (19 files)", type: "file" },
        ],
      },
      {
        name: "הפניות",
        type: "folder",
        count: 15,
        description: "Referrals tracking",
        children: [
          { name: "referral-001.html", type: "file", description: "Referral source + outcome" },
          { name: "... (15 files)", type: "file" },
        ],
      },
      {
        name: "יומן",
        type: "folder",
        count: 13,
        description: "Calendar/schedule entries",
        children: [
          { name: "entry-001.html", type: "file", description: "Schedule entry" },
          { name: "... (13 files)", type: "file" },
        ],
      },
    ],
  },
  {
    name: "לקוחות",
    type: "folder",
    count: 94,
    description: "Client directory — students + practitioners",
    children: [
      {
        name: "סטודנטיות",
        type: "folder",
        count: 56,
        description: "Students in training",
        children: [
          { name: "student-001.html", type: "file", description: "Student profile" },
          { name: "... (56 files)", type: "file" },
        ],
      },
      {
        name: "מטפלות",
        type: "folder",
        count: 38,
        description: "Practicing therapists/coaches",
        children: [
          { name: "practitioner-001.html", type: "file", description: "Practitioner profile" },
          { name: "... (38 files)", type: "file" },
        ],
      },
    ],
  },
  {
    name: "מסמכים",
    type: "folder",
    count: 16,
    description: "Formal documents and contracts",
    children: [
      { name: "contract-template.html", type: "file", description: "Service contract" },
      { name: "privacy-policy.html", type: "file", description: "Client privacy policy" },
      { name: "terms-of-service.html", type: "file", description: "Terms of service" },
      { name: "... (16 files)", type: "file" },
    ],
  },
  {
    name: "Uploads",
    type: "folder",
    count: 1,
    description: "Uploaded attachments",
    children: [
      { name: "logo.png", type: "file", description: "Practice logo" },
    ],
  },
];

const danielTree: TreeNode[] = [
  {
    name: "Docs",
    type: "folder",
    count: 6,
    description: "System docs and templates",
    children: [
      { name: "intake-form.html", type: "file", description: "Patient intake form" },
      { name: "session-template.html", type: "file", description: "Session notes template" },
      { name: "group-agreement.html", type: "file", description: "Group therapy agreement" },
      { name: "billing-guide.html", type: "file", description: "Billing procedures" },
      { name: "referral-form.html", type: "file", description: "Referral form" },
      { name: "progress-note.html", type: "file", description: "Progress note template" },
    ],
  },
  {
    name: "knowledge-base",
    type: "folder",
    count: 12,
    description: "Music therapy techniques and research",
    children: [
      { name: "nordoff-robbins.html", type: "file", description: "Nordoff-Robbins method" },
      { name: "gim-techniques.html", type: "file", description: "Guided Imagery and Music" },
      { name: "neurologic-mt.html", type: "file", description: "Neurologic music therapy" },
      { name: "group-dynamics.html", type: "file", description: "Group therapy dynamics" },
      { name: "assessment-scales.html", type: "file", description: "Standardized assessments" },
      { name: "instrument-guide.html", type: "file", description: "Therapeutic instruments" },
      { name: "autism-protocols.html", type: "file", description: "ASD intervention protocols" },
      { name: "elderly-care.html", type: "file", description: "Geriatric MT approaches" },
      { name: "trauma-informed.html", type: "file", description: "Trauma-informed MT" },
      { name: "research-2024.html", type: "file", description: "Recent research summaries" },
      { name: "insurance-codes.html", type: "file", description: "CPT/billing codes" },
      { name: "supervision-notes.html", type: "file", description: "Supervision framework" },
    ],
  },
  {
    name: "כרטיסיות",
    type: "folder",
    count: 60,
    description: "9 card types — patient and session data",
    children: [
      {
        name: "מטופלים",
        type: "folder",
        count: 15,
        description: "Individual patients",
        children: [
          { name: "patient-001.html", type: "file", description: "Patient profile + treatment plan" },
          { name: "... (15 files)", type: "file" },
        ],
      },
      {
        name: "קבוצות",
        type: "folder",
        count: 6,
        description: "Therapy groups",
        children: [
          { name: "group-001.html", type: "file", description: "Group details + member list" },
          { name: "... (6 files)", type: "file" },
        ],
      },
      {
        name: "מפגשים",
        type: "folder",
        count: 12,
        description: "Session records",
        children: [
          { name: "session-001.html", type: "file", description: "Session notes + observations" },
          { name: "... (12 files)", type: "file" },
        ],
      },
      {
        name: "תוכניות-טיפול",
        type: "folder",
        count: 8,
        description: "Treatment plans",
        children: [
          { name: "plan-001.html", type: "file", description: "Treatment goals + timeline" },
          { name: "... (8 files)", type: "file" },
        ],
      },
      {
        name: "הערכות",
        type: "folder",
        count: 5,
        description: "Clinical assessments",
        children: [
          { name: "assessment-001.html", type: "file", description: "Assessment results" },
          { name: "... (5 files)", type: "file" },
        ],
      },
      {
        name: "משלמים",
        type: "folder",
        count: 4,
        description: "Payers — insurance, parents, orgs",
        children: [
          { name: "payer-001.html", type: "file", description: "Payer details + rates" },
          { name: "... (4 files)", type: "file" },
        ],
      },
      {
        name: "כלי-נגינה",
        type: "folder",
        count: 3,
        description: "Instrument inventory",
        children: [
          { name: "instrument-001.html", type: "file", description: "Instrument details" },
          { name: "... (3 files)", type: "file" },
        ],
      },
      {
        name: "משימות",
        type: "folder",
        count: 4,
        description: "Tasks and to-dos",
        children: [
          { name: "task-001.html", type: "file", description: "Task detail" },
          { name: "... (4 files)", type: "file" },
        ],
      },
      {
        name: "חשבוניות",
        type: "folder",
        count: 3,
        description: "Billing records",
        children: [
          { name: "invoice-001.html", type: "file", description: "Invoice record" },
          { name: "... (3 files)", type: "file" },
        ],
      },
    ],
  },
  {
    name: "Uploads",
    type: "folder",
    count: 23,
    description: "Audio recordings, images, documents",
    children: [
      { name: "session-recording-001.mp3", type: "file", description: "Session audio" },
      { name: "assessment-scan-001.pdf", type: "file", description: "Scanned assessment" },
      { name: "group-photo-001.jpg", type: "file", description: "Group session photo" },
      { name: "... (23 files)", type: "file" },
    ],
  },
  {
    name: "מסמכים",
    type: "folder",
    count: 1,
    description: "Formal documents",
    children: [
      { name: "therapy-agreement.html", type: "file", description: "Therapy agreement template" },
    ],
  },
  {
    name: "פרויקטים",
    type: "folder",
    count: 79,
    description: "Projects — including jarvis-kb app",
    children: [
      {
        name: "jarvis-kb",
        type: "folder",
        count: 72,
        description: "Knowledge base app project",
        children: [
          { name: "src/", type: "folder", count: 45, description: "Source code" },
          { name: "docs/", type: "folder", count: 12, description: "Project documentation" },
          { name: "tests/", type: "folder", count: 8, description: "Test files" },
          { name: "config/", type: "folder", count: 7, description: "Configuration" },
        ],
      },
      {
        name: "research-project",
        type: "folder",
        count: 7,
        description: "MT research project files",
        children: [
          { name: "literature-review.html", type: "file", description: "Literature review" },
          { name: "data-collection.html", type: "file", description: "Data collection plan" },
          { name: "... (7 files)", type: "file" },
        ],
      },
    ],
  },
  {
    name: "משימות-gtd.html",
    type: "file",
    description: "GTD-style master task list",
  },
];

// --- Components ---

function TreeNodeRow({
  node,
  depth,
  expanded,
  onToggle,
  path,
  accentColor,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  path: string;
  accentColor: string;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expanded.has(path);
  const hasChildren = isFolder && node.children && node.children.length > 0;

  return (
    <>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && onToggle(path)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isFolder ? (
          <Folder
            className="h-4 w-4 shrink-0"
            style={{ color: accentColor }}
          />
        ) : (
          <File className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-foreground">{node.name}</span>
        {node.count != null && (
          <span
            className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {node.count}
          </span>
        )}
      </button>
      {node.description && (
        <div
          className="pb-1 text-xs text-muted-foreground"
          style={{ paddingLeft: `${depth * 20 + 52}px` }}
        >
          {node.description}
        </div>
      )}
      {hasChildren && isExpanded &&
        node.children!.map((child, i) => (
          <TreeNodeRow
            key={`${path}/${child.name}`}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            path={`${path}/${child.name}`}
            accentColor={accentColor}
          />
        ))}
    </>
  );
}

function UserTreeColumn({
  name,
  subtitle,
  totalFiles,
  accentColor,
  tree,
}: {
  name: string;
  subtitle: string;
  totalFiles: number;
  accentColor: string;
  tree: TreeNode[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const onToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    const paths = new Set<string>();
    const walk = (nodes: TreeNode[], prefix: string) => {
      for (const node of nodes) {
        const p = `${prefix}/${node.name}`;
        if (node.type === "folder" && node.children) {
          paths.add(p);
          walk(node.children, p);
        }
      }
    };
    walk(tree, "");
    setExpanded(paths);
  };

  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-base font-semibold" style={{ color: accentColor }}>
            {name}
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${accentColor}20`,
              color: accentColor,
            }}
          >
            {totalFiles} files
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={expandAll}
              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>
      <div className="max-h-[calc(100svh-220px)] overflow-y-auto p-2">
        {tree.map((node) => (
          <TreeNodeRow
            key={node.name}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
            path={`/${node.name}`}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  );
}

export function UserSnapshotsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <FolderTree className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">User Snapshots</h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side comparison of real user data structures
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <UserTreeColumn
          name="Lilah"
          subtitle="Coaching Practice — Training & Individual Sessions"
          totalFiles={472}
          accentColor="#B48EAD"
          tree={lilahTree}
        />
        <UserTreeColumn
          name="Daniel"
          subtitle="Music Therapy — Patients, Groups & Sessions"
          totalFiles={182}
          accentColor="#5E81AC"
          tree={danielTree}
        />
      </div>
    </div>
  );
}

UserSnapshotsPage.path = "/user-snapshots";
