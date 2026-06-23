import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  ListTodo,
  BookOpen,
  Calendar,
  AppWindow,
} from "lucide-react";

// --- Types ---

type PageId = "dashboard" | "patients" | "groups" | "tasks" | "kb" | "sessions";

type SidebarItem = {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
};

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "groups", label: "Groups", icon: UsersRound },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "kb", label: "Knowledge Base", icon: BookOpen },
  { id: "sessions", label: "Sessions", icon: Calendar },
];

// --- Wireframe Components ---

function PlaceholderBox({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 ${className}`}>
      {children}
    </div>
  );
}

function WireframeDashboard() {
  const stats = [
    { label: "Active Patients", value: "24" },
    { label: "This Week", value: "12 sessions" },
    { label: "Revenue (MTD)", value: "₪18,400" },
    { label: "Pending Tasks", value: "7" },
  ];

  const recentActivity = [
    "Session with Noam B. — completed",
    "Group \"Children 5-7\" — 8/12 attended",
    "Invoice #042 sent to קופת חולים",
    "New referral from Dr. Shapira",
    "Assessment due: Yael M. (tomorrow)",
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <PlaceholderBox key={s.label} className="flex flex-col items-center justify-center p-4">
            <span className="text-2xl font-bold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </PlaceholderBox>
        ))}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Recent Activity</h3>
        <PlaceholderBox className="divide-y divide-muted-foreground/10 p-1">
          {recentActivity.map((item) => (
            <div key={item} className="px-3 py-2 text-sm text-foreground">
              {item}
            </div>
          ))}
        </PlaceholderBox>
      </div>
    </div>
  );
}

function WireframePatients() {
  const patients = [
    { name: "Noam B.", payer: "קופת חולים", rate: "₪280/hr", hours: "2/wk", status: "Active" },
    { name: "Yael M.", payer: "Private", rate: "₪350/hr", hours: "1/wk", status: "Active" },
    { name: "Amit K.", payer: "משרד החינוך", rate: "₪240/hr", hours: "2/wk", status: "Active" },
    { name: "Shira L.", payer: "Parent", rate: "₪300/hr", hours: "1/wk", status: "On Hold" },
    { name: "David R.", payer: "קופת חולים", rate: "₪280/hr", hours: "1/wk", status: "Assessment" },
    { name: "Tamar G.", payer: "Private", rate: "₪350/hr", hours: "2/wk", status: "Active" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Patients</h2>
      <PlaceholderBox className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-muted-foreground/20 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Payer</th>
              <th className="px-3 py-2 font-medium">Rate</th>
              <th className="px-3 py-2 font-medium">Hours</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.name} className="border-b border-muted-foreground/10">
                <td className="px-3 py-2 font-medium text-foreground">{p.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.payer}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.rate}</td>
                <td className="px-3 py-2 text-muted-foreground">{p.hours}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "Active"
                      ? "bg-green-500/10 text-green-500"
                      : p.status === "On Hold"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PlaceholderBox>
    </div>
  );
}

function WireframeGroups() {
  const groups = [
    { name: "Children 5-7", capacity: "8/12", color: "#5E81AC", desc: "Mon & Wed, 16:00" },
    { name: "Teens 13-16", capacity: "6/8", color: "#A3BE8C", desc: "Tue, 17:00" },
    { name: "Adults — Anxiety", capacity: "10/10", color: "#BF616A", desc: "Thu, 19:00" },
    { name: "Elderly Care", capacity: "5/8", color: "#D08770", desc: "Fri, 10:00" },
    { name: "ASD Integration", capacity: "4/6", color: "#B48EAD", desc: "Sun, 14:00" },
    { name: "Post-Trauma", capacity: "7/8", color: "#EBCB8B", desc: "Wed, 18:00" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Groups</h2>
      <div className="grid grid-cols-3 gap-3">
        {groups.map((g) => {
          const [current, max] = g.capacity.split("/").map(Number);
          const pct = (current / max) * 100;
          return (
            <PlaceholderBox key={g.name} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.capacity}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: g.color }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{g.desc}</span>
            </PlaceholderBox>
          );
        })}
      </div>
    </div>
  );
}

function WireframeTasks() {
  const columns = {
    Now: [
      "Send assessment report — Yael M.",
      "Call Dr. Shapira re: referral",
      "Prepare group materials — Children 5-7",
    ],
    Next: [
      "Update treatment plan — Amit K.",
      "Order replacement drum heads",
      "Submit insurance claim #043",
    ],
    Waiting: [
      "Waiting: Parent approval — Shira L.",
      "Waiting: Insurance response — David R.",
    ],
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(columns).map(([col, tasks]) => (
          <div key={col} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{col}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {tasks.map((task) => (
                <PlaceholderBox key={task} className="px-3 py-2 text-sm text-foreground">
                  {task}
                </PlaceholderBox>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WireframeKB() {
  const articles = [
    { title: "Nordoff-Robbins Method", category: "Techniques", updated: "2 weeks ago" },
    { title: "GIM Techniques", category: "Techniques", updated: "1 month ago" },
    { title: "ASD Intervention Protocols", category: "Populations", updated: "3 days ago" },
    { title: "Insurance Billing Codes", category: "Admin", updated: "1 week ago" },
    { title: "Group Dynamics", category: "Techniques", updated: "2 months ago" },
    { title: "Trauma-Informed MT", category: "Populations", updated: "5 days ago" },
    { title: "Assessment Scales", category: "Clinical", updated: "3 weeks ago" },
    { title: "Instrument Guide", category: "Resources", updated: "1 month ago" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Knowledge Base</h2>
      <div className="grid grid-cols-2 gap-3">
        {articles.map((a) => (
          <PlaceholderBox key={a.title} className="flex flex-col gap-1 p-4">
            <span className="text-sm font-medium text-foreground">{a.title}</span>
            <div className="flex items-center justify-between">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {a.category}
              </span>
              <span className="text-xs text-muted-foreground">{a.updated}</span>
            </div>
          </PlaceholderBox>
        ))}
      </div>
    </div>
  );
}

function WireframeSessions() {
  const sessions = [
    { time: "09:00", patient: "Noam B.", type: "Individual", duration: "45 min", room: "Room A" },
    { time: "10:00", patient: "Yael M.", type: "Individual", duration: "45 min", room: "Room A" },
    { time: "11:00", patient: "—", type: "Break", duration: "30 min", room: "" },
    { time: "11:30", patient: "Amit K.", type: "Individual", duration: "45 min", room: "Room B" },
    { time: "14:00", patient: "ASD Integration", type: "Group", duration: "60 min", room: "Room C" },
    { time: "16:00", patient: "Children 5-7", type: "Group", duration: "45 min", room: "Room C" },
    { time: "17:00", patient: "David R.", type: "Assessment", duration: "60 min", room: "Room A" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Sessions — Today</h2>
      <PlaceholderBox className="divide-y divide-muted-foreground/10 p-1">
        {sessions.map((s) => (
          <div
            key={s.time + s.patient}
            className={`flex items-center gap-4 px-3 py-2.5 ${s.type === "Break" ? "opacity-50" : ""}`}
          >
            <span className="w-12 text-sm font-medium text-muted-foreground">{s.time}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{s.patient}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              s.type === "Individual"
                ? "bg-blue-500/10 text-blue-500"
                : s.type === "Group"
                  ? "bg-purple-500/10 text-purple-500"
                  : s.type === "Assessment"
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-muted text-muted-foreground"
            }`}>
              {s.type}
            </span>
            <span className="w-14 text-xs text-muted-foreground">{s.duration}</span>
            <span className="w-16 text-xs text-muted-foreground">{s.room}</span>
          </div>
        ))}
      </PlaceholderBox>
    </div>
  );
}

function WireframeSidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <div className="flex w-48 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b px-4 py-3">
        <span className="text-sm font-semibold text-foreground">Daniel's App</span>
        <p className="text-xs text-muted-foreground">Music Therapy</p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activePage === item.id
                ? "bg-[#5E81AC]/15 font-medium text-[#5E81AC]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const pages: Record<PageId, () => JSX.Element> = {
  dashboard: WireframeDashboard,
  patients: WireframePatients,
  groups: WireframeGroups,
  tasks: WireframeTasks,
  kb: WireframeKB,
  sessions: WireframeSessions,
};

export function AppWireframePage() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const PageComponent = pages[activePage];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <AppWindow className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-semibold">App Wireframe</h1>
          <p className="text-sm text-muted-foreground">
            Interactive low-fidelity prototype — Daniel's music therapy app
          </p>
        </div>
      </div>
      <div className="flex h-[600px] overflow-hidden rounded-lg border bg-card">
        <WireframeSidebar activePage={activePage} onNavigate={setActivePage} />
        <div className="flex-1 overflow-y-auto p-6">
          <PageComponent />
        </div>
      </div>
    </div>
  );
}

AppWireframePage.path = "/app-wireframe";
