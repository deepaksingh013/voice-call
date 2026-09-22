import {
  AudioLines,
  Users,
  Gamepad2,
  User,
  SlidersHorizontal,
  History,
  Crown,
  CreditCard,
  Bell,
  Languages,
  ShieldCheck,
  UserX,
  LifeBuoy,
  Trash2,
  type LucideIcon,
} from "lucide-react";

/**
 * One navigation model, two presentations: the bottom tab bar plus drawer on
 * phones, and the persistent sidebar on laptops and desktops. Keeping the
 * source of truth here is what stops the two drifting apart.
 */

export type NavItem = {
  label: string;
  href: string;
  Icon: LucideIcon;
  /** Needs an account — shows a padlock and routes to signup for guests. */
  needsAccount?: boolean;
  /** Part of Pro. */
  pro?: boolean;
  tone?: "default" | "gold" | "danger";
};

/** The four primary destinations — the tab bar on phones. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Talk", href: "/talk", Icon: AudioLines },
  { label: "Friends", href: "/friends", Icon: Users, needsAccount: true },
  { label: "Games", href: "/games", Icon: Gamepad2 },
  { label: "You", href: "/profile", Icon: User },
];

export const CALLING_NAV: NavItem[] = [
  {
    label: "Filters",
    href: "/filters",
    Icon: SlidersHorizontal,
    needsAccount: true,
  },
  { label: "Call history", href: "/history", Icon: History },
  { label: "Friends", href: "/friends", Icon: Users, needsAccount: true },
  { label: "Games", href: "/games", Icon: Gamepad2 },
];

export const ACCOUNT_NAV: NavItem[] = [
  {
    label: "Upgrade to Pro",
    href: "/paywall",
    Icon: Crown,
    pro: true,
    tone: "gold",
  },
  { label: "Payments & billing", href: "/billing", Icon: CreditCard },
  { label: "Notifications", href: "/notifications", Icon: Bell },
  { label: "App language", href: "/app-language", Icon: Languages },
];

export const SAFETY_NAV: NavItem[] = [
  { label: "Community guidelines", href: "/guidelines", Icon: ShieldCheck },
  { label: "Blocked users", href: "/blocked", Icon: UserX },
  { label: "Help & contact", href: "/help", Icon: LifeBuoy },
  // Not decoration: DPDP requires a working deletion path.
  { label: "Delete my data", href: "/delete-data", Icon: Trash2, tone: "danger" },
];
