import { Home, FolderOpen, Gauge, Waves, Sparkles, Palette, BookOpen, CircleHelp, Download, Settings, KeyRound, Zap, type LucideIcon } from "lucide-react";

export const appName = "FLOW Quality";

export interface NavItem {
  id: string;
  labelKey: string;
  path: string;
  icon: LucideIcon;
}

export const nav: NavItem[] = [
  { id: "home", labelKey: "nav.home", path: "/", icon: Home },
  { id: "import", labelKey: "nav.import", path: "/import", icon: FolderOpen },
  { id: "fps", labelKey: "nav.fps", path: "/fps", icon: Gauge },
  { id: "motionBlur", labelKey: "nav.motionBlur", path: "/motion-blur", icon: Waves },
  { id: "enhance", labelKey: "nav.enhance", path: "/enhance", icon: Sparkles },
  { id: "quickQuality", labelKey: "nav.quickQuality", path: "/quick-quality", icon: Zap },
  { id: "presets", labelKey: "nav.presets", path: "/presets", icon: Palette },
  { id: "exportGuides", labelKey: "nav.exportGuides", path: "/export-guides", icon: BookOpen },
  { id: "helpCenter", labelKey: "nav.helpCenter", path: "/help", icon: CircleHelp },
  { id: "downloads", labelKey: "nav.downloads", path: "/downloads", icon: Download },
  { id: "settings", labelKey: "nav.settings", path: "/settings", icon: Settings },
  { id: "license", labelKey: "nav.license", path: "/license", icon: KeyRound },
];
