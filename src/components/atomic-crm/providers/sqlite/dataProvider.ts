import {
  withLifecycleCallbacks,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import type {
  ContactNote,
  Member,
  MemberFormData,
  SignUpData,
} from "../../types";
import { getActivityLog } from "../commons/activity";
import type { CrmDataProvider } from "../types";
import { mergeContacts as clientMergeContacts } from "../commons/mergeContacts";

const API_URL = import.meta.env.DEV
  ? `${import.meta.env.BASE_URL}api`
  : "http://localhost:3001/api";

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const contentRange = response.headers.get("Content-Range");
  const json = await response.json();

  return { json, contentRange };
}

const baseDataProvider: DataProvider = {
  async getList(resource: string, params: GetListParams) {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    const query = new URLSearchParams({
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify(params.filter),
    });

    const { json, contentRange } = await fetchJson(
      `${API_URL}/${resource}?${query}`
    );

    // Parse total from Content-Range header: "resource 0-24/100"
    let total = json.length;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) total = parseInt(match[1], 10);
    }

    return { data: json, total };
  },

  async getOne(resource: string, params: { id: any }) {
    const { json } = await fetchJson(`${API_URL}/${resource}/${params.id}`);
    return { data: json };
  },

  async getMany(resource: string, params: { ids: any[] }) {
    const query = new URLSearchParams({
      filter: JSON.stringify({ id: params.ids }),
    });
    const { json } = await fetchJson(`${API_URL}/${resource}?${query}`);
    return { data: json };
  },

  async getManyReference(resource: string, params: any) {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;

    const filter = { ...params.filter, [params.target]: params.id };
    const query = new URLSearchParams({
      sort: JSON.stringify([field, order]),
      range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
      filter: JSON.stringify(filter),
    });

    const { json, contentRange } = await fetchJson(
      `${API_URL}/${resource}?${query}`
    );

    let total = json.length;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)/);
      if (match) total = parseInt(match[1], 10);
    }

    return { data: json, total };
  },

  async create(resource: string, params: { data: any }) {
    const { json } = await fetchJson(`${API_URL}/${resource}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  async update(resource: string, params: { id: any; data: any }) {
    const { json } = await fetchJson(`${API_URL}/${resource}/${params.id}`, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: json };
  },

  async updateMany(resource: string, params: { ids: any[]; data: any }) {
    const { json } = await fetchJson(`${API_URL}/${resource}`, {
      method: "PUT",
      body: JSON.stringify({ ids: params.ids, data: params.data }),
    });
    return { data: json };
  },

  async delete(resource: string, params: { id: any; previousData?: any }) {
    const { json } = await fetchJson(`${API_URL}/${resource}/${params.id}`, {
      method: "DELETE",
    });
    return { data: json };
  },

  async deleteMany(resource: string, params: { ids: any[] }) {
    const query = new URLSearchParams({
      ids: JSON.stringify(params.ids),
    });
    const { json } = await fetchJson(`${API_URL}/${resource}?${query}`, {
      method: "DELETE",
    });
    return { data: json };
  },
};

// Extend with CRM custom methods
const dataProviderWithCustomMethods: CrmDataProvider = {
  ...baseDataProvider,

  async getList(resource: string, params: GetListParams) {
    // Redirect to summary views (server handles the view query)
    if (resource === "companies") {
      return baseDataProvider.getList("companies_summary", params);
    }
    if (resource === "contacts") {
      return baseDataProvider.getList("contacts_summary", params);
    }
    if (resource === "orders") {
      return baseDataProvider.getList("orders_summary", params);
    }
    return baseDataProvider.getList(resource, params);
  },

  async getOne(resource: string, params: any) {
    if (resource === "companies") {
      return baseDataProvider.getOne("companies_summary", params);
    }
    if (resource === "contacts") {
      return baseDataProvider.getOne("contacts_summary", params);
    }
    if (resource === "orders") {
      return baseDataProvider.getOne("orders_summary", params);
    }
    return baseDataProvider.getOne(resource, params);
  },

  async signUp({ email, password, first_name, last_name }: SignUpData) {
    const { json } = await fetchJson(`${API_URL}/custom/signup`, {
      method: "POST",
      body: JSON.stringify({ email, password, first_name, last_name }),
    });
    return json;
  },

  async isInitialized() {
    const { json } = await fetchJson(`${API_URL}/custom/is-initialized`);
    return json.initialized;
  },

  async membersCreate(data: MemberFormData) {
    const { json } = await fetchJson(`${API_URL}/custom/members-create`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return json;
  },

  async membersUpdate(
    id: Identifier,
    data: Partial<Omit<MemberFormData, "password">>
  ) {
    const { json } = await fetchJson(
      `${API_URL}/custom/members-update/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
    return json;
  },

  async updatePassword(id: Identifier) {
    const { json } = await fetchJson(
      `${API_URL}/custom/update-password/${id}`,
      {
        method: "PATCH",
      }
    );
    return json;
  },

  async getActivityLog(companyId?: Identifier) {
    return getActivityLog(dataProvider, companyId);
  },

  async mergeContacts(sourceId: Identifier, targetId: Identifier) {
    return clientMergeContacts(sourceId, targetId, baseDataProvider);
  },
};

// Lifecycle callbacks — same pattern as FakeRest and Supabase providers
const lifeCycleCallbacks: ResourceCallbacks[] = [
  {
    resource: "contacts",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "first_name",
        "last_name",
        "company_name",
        "title",
        "email_jsonb",
        "phone_jsonb",
        "background",
      ])(params);
    },
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["first_name", "last_name"])(params);
    },
  },
  {
    resource: "contact_notes",
    beforeSave: async (data: ContactNote) => {
      // In SQLite mode, attachments are stored as JSON (no bucket upload)
      return data;
    },
  },
];

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  lifeCycleCallbacks
);

// Full-text search transformation (same as Supabase provider)
const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce(
        (acc, column) => ({
          ...acc,
          [`${column}@ilike`]: q,
        }),
        {}
      ),
    },
  };
};
