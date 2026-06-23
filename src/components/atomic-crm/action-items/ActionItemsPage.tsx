import { useState, useEffect } from "react";
import { useGetList, useUpdate, useNotify } from "ra-core";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanSquare, User, Filter, X } from "lucide-react";

const AMBER = "#f59e0b";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import type { ActionItem, ActionItemStatus, Member } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { status: ActionItemStatus; label: string; color: string }[] = [
  { status: "todo", label: "Todo", color: "#6b7280" },
  { status: "in_progress", label: "In Progress", color: "#3b82f6" },
  { status: "review", label: "Review", color: "#f59e0b" },
  { status: "done", label: "Done", color: "#10b981" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Legal & Entity": "#ef4444",
  "Finance & Operations": "#f59e0b",
  "Sales & Customers": "#3b82f6",
  "Branding & Marketing": "#a78bfa",
  "Product & Platform": "#10b981",
  "Planning & KPIs": "#f0883e",
};

// ─── StrictMode-safe Droppable ────────────────────────────────────────────────

function StrictModeDroppable(props: React.ComponentProps<typeof Droppable>) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(id);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props} />;
}

// ─── Member Avatar ────────────────────────────────────────────────────────────

function MemberAvatar({ member }: { member: Member }) {
  const initials =
    `${member.first_name?.[0] ?? ""}${member.last_name?.[0] ?? ""}`.toUpperCase();
  return (
    <div
      className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0"
      title={`${member.first_name} ${member.last_name}`}
    >
      {initials}
    </div>
  );
}

// ─── Member Assign ────────────────────────────────────────────────────────────

function MemberAssign({
  item,
  members,
}: {
  item: ActionItem;
  members: Member[];
}) {
  const [update] = useUpdate();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const assigned = members.find((m) => m.id === item.member_id);

  const assign = (memberId: number | null) => {
    update(
      "action_items",
      { id: item.id, data: { member_id: memberId }, previousData: item },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["action_items"] });
          notify("Member assigned", { type: "success" });
        },
      }
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="shrink-0 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {assigned ? (
            <MemberAvatar member={assigned} />
          ) : (
            <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {members.map((m) => (
          <DropdownMenuItem
            key={String(m.id)}
            onClick={(e) => {
              e.stopPropagation();
              assign(m.id as number);
            }}
            className="cursor-pointer gap-2"
          >
            <MemberAvatar member={m} />
            {m.first_name} {m.last_name}
          </DropdownMenuItem>
        ))}
        {item.member_id && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              assign(null);
            }}
            className="cursor-pointer gap-2 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Unassign
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  members,
}: {
  item: ActionItem;
  members: Member[];
}) {
  const catColor = CATEGORY_COLORS[item.category] ?? "#6b7280";
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5 hover:border-accent transition-colors">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm line-clamp-2">{item.text}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {item.category && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: catColor, backgroundColor: `${catColor}20` }}
              >
                {item.category}
              </span>
            )}
            {item.meeting_id && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                Meeting #{String(item.meeting_id)}
              </span>
            )}
          </div>
        </div>
        <MemberAssign item={item} members={members} />
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({
  categories,
  members,
  catFilter,
  memberFilter,
  meetingFilter,
  setCatFilter,
  setMemberFilter,
  setMeetingFilter,
}: {
  categories: string[];
  members: Member[];
  catFilter: string;
  memberFilter: string;
  meetingFilter: string;
  setCatFilter: (v: string) => void;
  setMemberFilter: (v: string) => void;
  setMeetingFilter: (v: string) => void;
}) {
  const active =
    catFilter !== "all" || memberFilter !== "all" || meetingFilter !== "all";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={catFilter}
        onChange={(e) => setCatFilter(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-xs"
      >
        <option value="all">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={memberFilter}
        onChange={(e) => setMemberFilter(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-xs"
      >
        <option value="all">All Members</option>
        <option value="unassigned">Unassigned</option>
        {members.map((m) => (
          <option key={String(m.id)} value={String(m.id)}>
            {m.first_name} {m.last_name}
          </option>
        ))}
      </select>
      <select
        value={meetingFilter}
        onChange={(e) => setMeetingFilter(e.target.value)}
        className="rounded-md border bg-background px-2 py-1 text-xs"
      >
        <option value="all">All Meetings</option>
        <option value="1">Meeting #1</option>
        <option value="2">Meeting #2</option>
      </select>
      {active && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs cursor-pointer"
          onClick={() => {
            setCatFilter("all");
            setMemberFilter("all");
            setMeetingFilter("all");
          }}
        >
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ActionItemsPage() {
  const [catFilter, setCatFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [meetingFilter, setMeetingFilter] = useState("all");
  const [update] = useUpdate();
  const queryClient = useQueryClient();

  const { data: allItems, isPending } = useGetList<ActionItem>(
    "action_items",
    {
      pagination: { page: 1, perPage: 200 },
      sort: { field: "id", order: "ASC" },
    }
  );

  const { data: members } = useGetList<Member>("members", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "id", order: "ASC" },
  });

  const categories = [
    ...new Set((allItems ?? []).map((i) => i.category).filter(Boolean)),
  ];

  const items = (allItems ?? []).filter((i) => {
    if (catFilter !== "all" && i.category !== catFilter) return false;
    if (memberFilter === "unassigned" && i.member_id) return false;
    if (
      memberFilter !== "all" &&
      memberFilter !== "unassigned" &&
      String(i.member_id) !== memberFilter
    )
      return false;
    if (meetingFilter !== "all" && String(i.meeting_id) !== meetingFilter)
      return false;
    return true;
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as ActionItemStatus;
    const itemId = result.draggableId;
    const item = (allItems ?? []).find((i) => String(i.id) === itemId);
    if (!item || item.status === newStatus) return;
    update(
      "action_items",
      {
        id: item.id,
        data: {
          status: newStatus,
          done_date:
            newStatus === "done" ? new Date().toISOString() : null,
        },
        previousData: item,
      },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: ["action_items"] }),
      }
    );
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const total = allItems?.length ?? 0;
  const done = (allItems ?? []).filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col gap-5 max-w-5xl px-6 pb-6 pt-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in srgb, ${AMBER} 15%, transparent)` }}
        >
          <KanbanSquare className="w-5 h-5" style={{ color: AMBER }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Action Items</h1>
          <p className="text-sm text-muted-foreground">
            {done}/{total} completed from Founders Meetings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {COLUMNS.map((col) => {
          const count = items.filter((i) => i.status === col.status).length;
          return (
            <div
              key={col.status}
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <span className="text-lg font-bold" style={{ color: col.color }}>
                {count}
              </span>
              <span className="text-xs text-muted-foreground">{col.label}</span>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <FilterBar
        categories={categories}
        members={members ?? []}
        catFilter={catFilter}
        memberFilter={memberFilter}
        meetingFilter={meetingFilter}
        setCatFilter={setCatFilter}
        setMemberFilter={setMemberFilter}
        setMeetingFilter={setMeetingFilter}
      />

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: 400 }}
        >
          {COLUMNS.map((col) => {
            const colItems = items.filter((i) => i.status === col.status);
            return (
              <StrictModeDroppable
                droppableId={col.status}
                key={col.status}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 min-w-[240px] max-w-[320px] rounded-xl border bg-muted/30 p-3 flex flex-col",
                      snapshot.isDraggingOver && "bg-accent/20"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="text-sm font-semibold truncate">
                        {col.label}
                      </span>
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{
                          color: col.color,
                          backgroundColor: `${col.color}20`,
                        }}
                      >
                        {colItems.length}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[60vh]">
                      {colItems.map((item, index) => (
                        <Draggable
                          key={String(item.id)}
                          draggableId={String(item.id)}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                dragSnapshot.isDragging && "opacity-80"
                              )}
                            >
                              <ItemCard
                                item={item}
                                members={members ?? []}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </StrictModeDroppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

ActionItemsPage.path = "/action-items";
