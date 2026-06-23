import { createContext, useContext } from "react";

export type activityLogContextValue = "contact" | "all";

export const ActivityLogContext = createContext<activityLogContextValue>("all");

export const useActivityLogContext = () => {
  const context = useContext(ActivityLogContext);

  return context;
};
