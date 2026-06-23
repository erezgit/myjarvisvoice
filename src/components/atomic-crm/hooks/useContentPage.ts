import { useGetList, useUpdate } from "ra-core";
import { useCallback } from "react";
import type { PageContent } from "../types";

/**
 * Hook for reading and writing structured page content from the page_content table.
 * Each page stores its content as a JSON blob keyed by page_slug.
 *
 * @param pageSlug - Unique identifier for the page (e.g., "welcome", "paamon/teacher-guide")
 * @returns { content, isPending, record, updateContent, updateField }
 */
export function useContentPage<T extends Record<string, any>>(pageSlug: string) {
  const { data, isPending } = useGetList<PageContent<T>>("page_content", {
    filter: { "page_slug@eq": pageSlug },
    pagination: { page: 1, perPage: 1 },
    sort: { field: "id", order: "ASC" },
  });

  const record = data?.[0];
  const content = (record?.content ?? {}) as T;

  const [update] = useUpdate();

  /** Replace the entire content object */
  const updateContent = useCallback(
    (newContent: T) => {
      if (!record) return;
      update("page_content", {
        id: record.id,
        data: { content: newContent },
        previousData: record,
      });
    },
    [record, update]
  );

  /** Update a single field by dot-path (e.g., "features.0.title") */
  const updateField = useCallback(
    (path: string, value: any) => {
      if (!record) return;
      const updated = deepSet({ ...content }, path, value);
      update("page_content", {
        id: record.id,
        data: { content: updated },
        previousData: record,
      });
    },
    [record, content, update]
  );

  return { content, isPending, record, updateContent, updateField };
}

/**
 * Deep set a value in a nested object by dot-path.
 * Handles both object keys and array indices.
 * e.g., deepSet(obj, "features.0.title", "New Title")
 */
function deepSet<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const result = { ...obj };
  let current: any = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const nextKey = keys[i + 1];
    const idx = Number(key);
    const accessKey = isNaN(idx) ? key : idx;

    // Clone the next level (array or object) to avoid mutation
    if (Array.isArray(current[accessKey])) {
      current[accessKey] = [...current[accessKey]];
    } else if (typeof current[accessKey] === "object" && current[accessKey] !== null) {
      current[accessKey] = { ...current[accessKey] };
    } else {
      // Create intermediate structure based on whether next key is numeric
      current[accessKey] = isNaN(Number(nextKey)) ? {} : [];
    }
    current = current[accessKey];
  }

  const lastKey = keys[keys.length - 1];
  const lastIdx = Number(lastKey);
  current[isNaN(lastIdx) ? lastKey : lastIdx] = value;

  return result;
}
