import { Suspense, useState, useEffect, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Import, Settings, User } from "lucide-react";
import { CanAccess, useUserMenu } from "ra-core";
import { Link } from "react-router";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { CrmSidebar } from "./CrmSidebar";
import { useUserStateTracker } from "../hooks/useUserStateTracker";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { ImportPage } from "../misc/ImportPage";
import { ChatPanel } from "./ChatPanel";
import { ChatColumn } from "./ChatColumn";
import { SettingsProvider } from "../chat/contexts/SettingsContext";
import { useSettings } from "../chat/hooks/useSettings";
import { TerminalOverlay } from "@/components/desktop/terminal/TerminalOverlay";
import { MemberConfigProvider } from "../contexts/MemberConfigContext";

export const Layout = ({ children }: { children: ReactNode }) => {
  useUserStateTracker();
  useRealtimeRefresh();
  return (
    <MemberConfigProvider>
      <SettingsProvider>
        <LayoutInner>{children}</LayoutInner>
      </SettingsProvider>
    </MemberConfigProvider>
  );
};

/** Inner component that can access SettingsContext for parallelChat */
const LayoutInner = ({ children }: { children: ReactNode }) => {
  const { parallelChat, chatVisible } = useSettings();
  const [miniMode, setMiniMode] = useState(false);

  useEffect(() => {
    // Check initial mini mode state
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_mini_mode").then((v) => setMiniMode(v as boolean)).catch(() => {});
    }).catch(() => {});

    // Listen for mini mode changes
    import("@tauri-apps/api/event").then(({ listen }) => {
      const unlisten = listen("mini-mode-changed", (event) => {
        setMiniMode(event.payload as boolean);
      });
      return () => { unlisten.then((fn) => fn()); };
    }).catch(() => {});
  }, []);

  return (
    <div className={`flex h-svh ${miniMode ? "bg-[#f6f6f7]" : "bg-white"}`}>
      {!miniMode && <CrmSidebar />}
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={chatVisible && !miniMode ? 70 : 100} minSize={40}>
          <div className={`flex h-full flex-col overflow-auto ${miniMode ? "bg-[#f6f6f7]" : "bg-white dark:bg-background"}`}>
            <main className="flex-1 mx-auto w-full" style={miniMode ? {} : { maxWidth: "860px" }} id="main-content">
              <ErrorBoundary FallbackComponent={Error}>
                <Suspense
                  fallback={<Skeleton className="h-12 w-12 rounded-full" />}
                >
                  {children}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </Panel>
        {chatVisible && !miniMode && (
          <>
            <PanelResizeHandle className="w-px bg-border hover:bg-ring transition-colors" />
            <Panel defaultSize={30} minSize={20} maxSize={50}>
              {parallelChat ? <ChatColumn /> : <ChatPanel />}
            </Panel>
          </>
        )}
      </PanelGroup>
      <Notification />
      <TerminalOverlay />
    </div>
  );
};

const UsersMenu = () => {
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<UsersMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/members" className="flex items-center gap-2">
        <User /> Users
      </Link>
    </DropdownMenuItem>
  );
};

const ConfigurationMenu = () => {
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ConfigurationMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings />
        My info
      </Link>
    </DropdownMenuItem>
  );
};

const ImportFromJsonMenuItem = () => {
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ImportFromJsonMenuItem> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to={ImportPage.path} className="flex items-center gap-2">
        <Import /> Import data
      </Link>
    </DropdownMenuItem>
  );
};
