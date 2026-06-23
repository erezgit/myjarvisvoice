import {
  type CoreAdminProps,
  CustomRoutes,
  localStorageStore,
  Resource,
  type AuthProvider,
  type DataProvider,
} from "ra-core";
import { useEffect } from "react";
import { Navigate, Route } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { Admin } from "@/components/admin/admin";
import { ForgotPasswordPage } from "@/components/supabase/forgot-password-page";
import { SetPasswordPage } from "@/components/supabase/set-password-page";
import { OAuthConsentPage } from "@/components/supabase/oauth-consent-page";

import contacts from "../contacts";
import leads from "../leads";
import orders from "../orders";
import { Dashboard } from "../dashboard/Dashboard";
import { MobileDashboard } from "../dashboard/MobileDashboard";
import { Layout } from "../layout/Layout";
import { MobileLayout } from "../layout/MobileLayout";
import { SignupPage } from "../login/SignupPage";
import { ConfirmationRequired } from "../login/ConfirmationRequired";
import { ImportPage } from "../misc/ImportPage";
import {
  authProvider as defaultAuthProvider,
  dataProvider as defaultDataProvider,
} from "../providers/supabase";
import { autoLoginAuthProvider } from "../providers/autoLoginAuthProvider";
import members from "../members";
import { SalesAnalytics } from "../analytics/SalesAnalytics";
import { SettingsPage } from "../settings/SettingsPage";
import { BlockLibraryPage } from "../block-library/BlockLibraryPage";
import { UserSnapshotsPage } from "../user-snapshots/UserSnapshotsPage";
import { AppWireframePage } from "../app-wireframe/AppWireframePage";
import { MemoryPage } from "../kb/MemoryPage";
import { RoadmapPage } from "../kb/RoadmapPage";
import { AutomationsPage } from "../automations/AutomationsPage";
import { ActionItemsPage } from "../action-items/ActionItemsPage";
import { MeetingsPage } from "../meetings/MeetingsPage";
import { MeetingDetailPage } from "../meetings/MeetingDetailPage";
import { ComponentLibraryPage } from "../kb/ComponentLibraryPage";
import { KnowledgeBasePage } from "../kb/KnowledgeBasePage";
import { QALogPage } from "../qa-log/QALogPage";
import { VoicePalPage } from "../voice-pal/VoicePalPage";
import { LikesPage } from "../voice-pal/LikesPage";
import { VoiceOptionsPage } from "../voice-pal/VoiceOptionsPage";
import { CostAnalyticsPage } from "../voice-pal/CostAnalyticsPage";
import { AvatarShowcasePage } from "../voice-pal/AvatarShowcasePage";
import { LoginPage } from "../voice-pal/LoginPage";
import { InsightsPage } from "../insights/InsightsPage";
import { FilesPage } from "../files/FilesPage";
import { TicketsPage } from "../tickets/TicketsPage";
import { WelcomePage } from "../kb/WelcomePage";
import { HowItWorksPage } from "../kb/HowItWorksPage";
import { UseCasesPage } from "../kb/UseCasesPage";
import type { ConfigurationContextValue } from "./ConfigurationContext";
import { ConfigurationProvider, useConfigurationContext } from "./ConfigurationContext";
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
} from "./defaultConfiguration";
import { i18nProvider } from "./i18nProvider";
import { StartPage } from "../login/StartPage.tsx";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { MobileTasksList } from "../tasks/MobileTasksList.tsx";
import { ContactListMobile } from "../contacts/ContactList.tsx";
import { ContactShow } from "../contacts/ContactShow.tsx";
import { NoteShowPage } from "../notes/NoteShowPage.tsx";

export type CRMProps = {
  dataProvider?: DataProvider;
  authProvider?: AuthProvider;
  singleUserMode?: boolean;
  disableTelemetry?: boolean;
} & Partial<ConfigurationContextValue>;

/**
 * CRM Component
 *
 * This component sets up and renders the main CRM application using `ra-core`. It provides
 * default configurations and themes but allows for customization through props. The component
 * wraps the application with a `ConfigurationProvider` to provide configuration values via context.
 *
 * @param {Array<ContactGender>} contactGender - The gender options for contacts used in the application.
 * @param {RaThemeOptions} darkTheme - The theme to use when the application is in dark mode.
 * @param {RaThemeOptions} lightTheme - The theme to use when the application is in light mode.
 * @param {string} logo - The logo used in the CRM application.
 * @param {NoteStatus[]} noteStatuses - The statuses of notes used in the application.
 * @param {string[]} taskTypes - The types of tasks used in the application.
 * @param {string} title - The title of the CRM application.
 *
 * @returns {JSX.Element} The rendered CRM application.
 *
 * @example
 * // Basic usage of the CRM component
 * import { CRM } from '@/components/atomic-crm/dashboard/CRM';
 *
 * const App = () => (
 *     <CRM
 *         logo="/path/to/logo.png"
 *         title="My Custom CRM"
 *         lightTheme={{
 *             ...defaultTheme,
 *             palette: {
 *                 primary: { main: '#0000ff' },
 *             },
 *         }}
 *     />
 * );
 *
 * export default App;
 */
export const CRM = ({
  contactGender = defaultContactGender,
  darkModeLogo = defaultDarkModeLogo,
  lightModeLogo = defaultLightModeLogo,
  noteStatuses = defaultNoteStatuses,
  taskTypes = defaultTaskTypes,
  title = defaultTitle,
  lifecycleStages = defaultLifecycleStages,
  leadSources = defaultLeadSources,
  orderStages = defaultOrderStages,
  activityStatuses = defaultActivityStatuses,
  qualificationStatuses = defaultQualificationStatuses,
  readinessLevels = defaultReadinessLevels,
  lostReasons = defaultLostReasons,
  features = defaultFeatures,
  dataProvider = defaultDataProvider,
  authProvider: authProviderProp,
  singleUserMode = import.meta.env.VITE_SINGLE_USER_MODE === "true",
  googleWorkplaceDomain = import.meta.env.VITE_GOOGLE_WORKPLACE_DOMAIN,
  disableEmailPasswordAuthentication = import.meta.env
    .VITE_DISABLE_EMAIL_PASSWORD_AUTHENTICATION === "true",
  disableTelemetry,
  ...rest
}: CRMProps) => {
  const authProvider = authProviderProp ?? (singleUserMode ? autoLoginAuthProvider : defaultAuthProvider);
  useEffect(() => {
    if (
      disableTelemetry ||
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      typeof window.location === "undefined" ||
      typeof Image === "undefined"
    ) {
      return;
    }
    const img = new Image();
    img.src = `https://atomic-crm-telemetry.marmelab.com/atomic-crm-telemetry?domain=${window.location.hostname}`;
  }, [disableTelemetry]);

  // Always use DesktopAdmin — mini mode hides sidebar in Layout, not via MobileAdmin
  const ResponsiveAdmin = DesktopAdmin;

  return (
    <ConfigurationProvider
      contactGender={contactGender}
      darkModeLogo={darkModeLogo}
      lightModeLogo={lightModeLogo}
      noteStatuses={noteStatuses}
      taskTypes={taskTypes}
      title={title}
      lifecycleStages={lifecycleStages}
      leadSources={leadSources}
      orderStages={orderStages}
      activityStatuses={activityStatuses}
      qualificationStatuses={qualificationStatuses}
      readinessLevels={readinessLevels}
      lostReasons={lostReasons}
      features={features}
      googleWorkplaceDomain={googleWorkplaceDomain}
      disableEmailPasswordAuthentication={disableEmailPasswordAuthentication}
    >
      <ResponsiveAdmin
        dataProvider={dataProvider}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        store={localStorageStore(undefined, "CRM")}
        loginPage={singleUserMode ? false : StartPage}
        requireAuth={!singleUserMode}
        disableTelemetry
        {...rest}
      />
    </ConfigurationProvider>
  );
};

const DesktopAdmin = (props: CoreAdminProps) => {
  const { features } = useConfigurationContext();
  const effectiveDashboard = () => <Navigate to="/voice-pal" replace />;
  // ra-core uses createHashRouter internally — routing lives in the URL hash (#/...),
  // not the pathname. Vite's base config handles the /preview/ asset prefix.
  return (
    <Admin layout={Layout} dashboard={effectiveDashboard} {...props}>
      <CustomRoutes noLayout>
        <Route path={SignupPage.path} element={<SignupPage />} />
        <Route
          path={ConfirmationRequired.path}
          element={<ConfirmationRequired />}
        />
        <Route path={SetPasswordPage.path} element={<SetPasswordPage />} />
        <Route
          path={ForgotPasswordPage.path}
          element={<ForgotPasswordPage />}
        />
        <Route path={OAuthConsentPage.path} element={<OAuthConsentPage />} />
        <Route path={LoginPage.path} element={<LoginPage />} />
      </CustomRoutes>

      <CustomRoutes>
        <Route path={MeetingsPage.path} element={<MeetingsPage />} />
        <Route path={MeetingDetailPage.path} element={<MeetingDetailPage />} />
        <Route path={MemoryPage.path} element={<MemoryPage />} />
        <Route path={RoadmapPage.path} element={<RoadmapPage />} />
        <Route path={SettingsPage.path} element={<SettingsPage />} />
        <Route path={ImportPage.path} element={<ImportPage />} />
        <Route path={BlockLibraryPage.path} element={<BlockLibraryPage />} />
        <Route path={UserSnapshotsPage.path} element={<UserSnapshotsPage />} />
        <Route path={AppWireframePage.path} element={<AppWireframePage />} />
        <Route path={AutomationsPage.path} element={<AutomationsPage />} />
        <Route path={ActionItemsPage.path} element={<ActionItemsPage />} />
        <Route path={ComponentLibraryPage.path} element={<ComponentLibraryPage />} />
        <Route path={KnowledgeBasePage.path} element={<KnowledgeBasePage />} />
        <Route path={QALogPage.path} element={<QALogPage />} />
        <Route path={VoicePalPage.path} element={<VoicePalPage />} />

        <Route path={LikesPage.path} element={<LikesPage />} />
        <Route path={VoiceOptionsPage.path} element={<VoiceOptionsPage />} />
        <Route path={CostAnalyticsPage.path} element={<CostAnalyticsPage />} />
        <Route path={AvatarShowcasePage.path} element={<AvatarShowcasePage />} />
        <Route path={InsightsPage.path} element={<InsightsPage />} />
        <Route path={FilesPage.path} element={<FilesPage />} />
        <Route path={TicketsPage.path} element={<TicketsPage />} />
        <Route path={WelcomePage.path} element={<WelcomePage />} />
        <Route path={HowItWorksPage.path} element={<HowItWorksPage />} />
        <Route path={UseCasesPage.path} element={<UseCasesPage />} />
        {features.analytics && (
          <Route path="/analytics" element={<SalesAnalytics />} />
        )}
      </CustomRoutes>
      {features.contacts && <Resource name="contacts" {...contacts} />}
      {features.leads && <Resource name="leads" {...leads} />}
      {features.companies && <Resource name="companies" />}
      {features.notes && <Resource name="contact_notes" />}
      {features.tasks && <Resource name="tasks" />}
      {features.members && <Resource name="members" {...members} />}
      {features.tags && <Resource name="tags" />}
      {features.orders && <Resource name="orders" {...orders} />}
    </Admin>
  );
};

const MobileAdmin = (props: CoreAdminProps) => {
  const { features } = useConfigurationContext();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
      },
    },
  });
  const asyncStoragePersister = createAsyncStoragePersister({
    storage: localStorage,
  });

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Admin
        queryClient={queryClient}
        layout={MobileLayout}
        dashboard={MobileDashboard}
        {...props}
      >
        <CustomRoutes noLayout>
          <Route path={SignupPage.path} element={<SignupPage />} />
          <Route
            path={ConfirmationRequired.path}
            element={<ConfirmationRequired />}
          />
          <Route path={SetPasswordPage.path} element={<SetPasswordPage />} />
          <Route
            path={ForgotPasswordPage.path}
            element={<ForgotPasswordPage />}
          />
          <Route path={OAuthConsentPage.path} element={<OAuthConsentPage />} />
        </CustomRoutes>
        {features.contacts && (
          <Resource
            name="contacts"
            list={ContactListMobile}
            show={ContactShow}
            recordRepresentation={contacts.recordRepresentation}
          >
            <Route path=":id/notes/:noteId" element={<NoteShowPage />} />
          </Resource>
        )}
        {features.companies && <Resource name="companies" />}
        {features.tasks && <Resource name="tasks" list={MobileTasksList} />}
      </Admin>
    </PersistQueryClientProvider>
  );
};
