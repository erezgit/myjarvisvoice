import { createContext, useContext, type ReactNode } from "react";

import type { ContactGender, NoteStatus, OrderStage } from "../types";
import {
  defaultContactGender,
  defaultDarkModeLogo,
  defaultLightModeLogo,
  defaultNoteStatuses,
  defaultTaskTypes,
  defaultTitle,
  defaultLifecycleStages,
  defaultLeadSources,
  defaultOrderStages,
  defaultActivityStatuses,
  defaultQualificationStatuses,
  defaultReadinessLevels,
  defaultLostReasons,
  defaultFeatures,
  type FeatureFlags,
} from "./defaultConfiguration";

// Define types for the context value
export interface ConfigurationContextValue {
  noteStatuses: NoteStatus[];
  taskTypes: string[];
  title: string;
  darkModeLogo: string;
  lightModeLogo: string;
  contactGender: ContactGender[];
  lifecycleStages: { value: string; label: string }[];
  leadSources: { value: string; label: string }[];
  orderStages: OrderStage[];
  activityStatuses: { value: string; label: string; color: string }[];
  qualificationStatuses: { value: string; label: string; color: string }[];
  readinessLevels: { value: string; label: string; color: string }[];
  lostReasons: { value: string; label: string }[];
  features: FeatureFlags;
  googleWorkplaceDomain?: string;
  disableEmailPasswordAuthentication?: boolean;
}

export interface ConfigurationProviderProps extends ConfigurationContextValue {
  children: ReactNode;
}

// Create context with default value
// eslint-disable-next-line react-refresh/only-export-components
export const ConfigurationContext = createContext<ConfigurationContextValue>({
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
  contactGender: defaultContactGender,
  lifecycleStages: defaultLifecycleStages,
  leadSources: defaultLeadSources,
  orderStages: defaultOrderStages,
  activityStatuses: defaultActivityStatuses,
  qualificationStatuses: defaultQualificationStatuses,
  readinessLevels: defaultReadinessLevels,
  lostReasons: defaultLostReasons,
  features: defaultFeatures,
  disableEmailPasswordAuthentication: false,
});

export const ConfigurationProvider = ({
  children,
  darkModeLogo,
  lightModeLogo,
  noteStatuses,
  taskTypes,
  title,
  contactGender,
  lifecycleStages,
  leadSources,
  orderStages,
  activityStatuses,
  qualificationStatuses,
  readinessLevels,
  lostReasons,
  features,
  googleWorkplaceDomain,
  disableEmailPasswordAuthentication,
}: ConfigurationProviderProps) => (
  <ConfigurationContext.Provider
    value={{
      darkModeLogo,
      lightModeLogo,
      noteStatuses,
      title,
      taskTypes,
      contactGender,
      lifecycleStages,
      leadSources,
      orderStages,
      activityStatuses,
      qualificationStatuses,
      readinessLevels,
      lostReasons,
      features,
      googleWorkplaceDomain,
      disableEmailPasswordAuthentication,
    }}
  >
    {children}
  </ConfigurationContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components
export const useConfigurationContext = () => useContext(ConfigurationContext);
