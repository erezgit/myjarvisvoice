import { Link, matchPath, useLocation } from "react-router";
import {
  Settings,
  Home,
  Heart,
  AudioLines,
  LogOut,
  DollarSign,
  Video,
} from "lucide-react";
import { useGetIdentity, useLogout } from "ra-core";
import { cn } from "@/lib/utils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type NavItem = { label: string; to: string; icon: typeof Home; pattern: string };

const navItems: NavItem[] = [
  { label: "Home", to: "/voice-pal", icon: Home, pattern: "/voice-pal" },
  { label: "Likes", to: "/voice-pal/likes", icon: Heart, pattern: "/voice-pal/likes" },
  { label: "Voice Options", to: "/voice-pal/voices", icon: AudioLines, pattern: "/voice-pal/voices" },
  { label: "Meetings", to: "/meetings", icon: Video, pattern: "/meetings" },
  { label: "Costs", to: "/cost-analytics", icon: DollarSign, pattern: "/cost-analytics" },
];

export function CrmSidebar() {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();
  const { data: identity } = useGetIdentity();
  const logout = useLogout();

  const allNavItems = navItems;

  return (
    <aside className="flex h-svh w-52 shrink-0 flex-col border-r bg-[#f6f6f7] dark:bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4 mb-4">
        <Link to="/" className="flex items-center gap-2">
          <img
            className="[.light_&]:hidden h-7 w-7"
            src={darkModeLogo}
            alt={title}
          />
          <img
            className="[.dark_&]:hidden h-7 w-7"
            src={lightModeLogo}
            alt={title}
          />
          <span className="text-sm font-semibold" style={{ fontFamily: '"Nunito", "SF Pro Rounded", "Rounded Mplus 1c", system-ui, sans-serif', letterSpacing: '0.01em' }}>{title}</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {allNavItems.map((item) => {
          const isActive =
            item.pattern === "/"
              ? !!matchPath("/", location.pathname)
              : !!matchPath(item.pattern, location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[#e3e3e6] dark:bg-sidebar-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-[#e3e3e6] dark:hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: settings + user */}
      <div className="px-2 pb-3 pt-2 space-y-0.5">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            !!matchPath("/settings", location.pathname)
              ? "bg-[#e3e3e6] dark:bg-sidebar-accent text-foreground font-medium"
              : "text-muted-foreground hover:bg-[#e3e3e6] dark:hover:bg-sidebar-accent hover:text-foreground"
          )}
        >
          <Settings className="h-[18px] w-[18px]" />
          Settings
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-[#e3e3e6] dark:hover:bg-sidebar-accent hover:text-foreground transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={identity?.avatar} />
                <AvatarFallback className="text-xs">{identity?.fullName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{identity?.fullName ?? 'User'}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
