import type { MemberRole } from "../../types";

// FIXME: This should be exported from the ra-core package
type CanAccessParams<
  RecordType extends Record<string, any> = Record<string, any>,
> = {
  action: string;
  resource: string;
  record?: RecordType;
};

// Permission matrix: resource → action → allowed roles
const PERMISSIONS: Record<string, Record<string, MemberRole[]>> = {
  members: {
    list: ["admin"],
    create: ["admin"],
    edit: ["admin"],
    delete: ["admin"],
    show: ["admin"],
    export: ["admin"],
  },
  contacts: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager", "member", "office"],
    edit: ["admin", "manager", "member"],
    delete: ["admin", "manager", "member"],
    show: ["admin", "manager", "member", "office"],
    export: ["admin", "manager", "office"],
  },
  contact_notes: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager", "member"],
    edit: ["admin", "manager", "member"],
    delete: ["admin", "manager", "member"],
  },
  tasks: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager", "member"],
    edit: ["admin", "manager", "member"],
    delete: ["admin", "manager", "member"],
    show: ["admin", "manager", "member", "office"],
  },
  companies: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager", "member", "office"],
    edit: ["admin", "manager"],
    delete: ["admin", "manager"],
    show: ["admin", "manager", "member", "office"],
  },
  tags: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager"],
    edit: ["admin", "manager"],
    delete: ["admin", "manager"],
  },
  orders: {
    list: ["admin", "manager", "member", "office"],
    create: ["admin", "manager", "member", "office"],
    edit: ["admin", "manager", "member"],
    delete: ["admin", "manager"],
    show: ["admin", "manager", "member", "office"],
  },
  sales_analytics: {
    list: ["admin", "manager"],
  },
};

export const canAccess = <
  RecordType extends Record<string, any> = Record<string, any>,
>(
  role: MemberRole,
  params: CanAccessParams<RecordType>,
) => {
  if (role === "admin") return true;

  const resourcePermissions = PERMISSIONS[params.resource];
  if (!resourcePermissions) {
    return false;
  }

  const allowedRoles = resourcePermissions[params.action];
  if (!allowedRoles) {
    return ["admin", "manager"].includes(role);
  }

  return allowedRoles.includes(role);
};
