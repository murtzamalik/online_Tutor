import type { Icon } from "@phosphor-icons/react";
import {
  House,
  PencilSimpleLine,
  BookOpenText,
  Exam,
  ChatsCircle,
  ChartLineUp,
  GearSix,
  UsersThree,
  UserPlus,
  CreditCard,
  Bell,
  Lifebuoy,
  Gift,
  Books,
  ChalkboardTeacher,
  ShieldCheck,
  ClipboardText,
  SquaresFour,
  CheckSquareOffset,
  WarningOctagon,
  Graph,
  FileMagnifyingGlass,
  Notebook,
  Palette,
  Headset,
  Siren,
  Robot,
  CurrencyGbp,
  Fingerprint,
  ListChecks,
  Scroll,
} from "@phosphor-icons/react";

export type Role = "student" | "parent" | "school" | "staff" | "guest";

export type NavItem = { href: string; label: string; icon: Icon; roles?: string[]; match?: string[] };
export type NavSection = { title?: string; items: NavItem[] };

const set = (roles: string[] | undefined) => new Set((roles ?? []).map((r) => r.toUpperCase()));

const STAFF_CODES = ["REVIEWER", "REV", "CONTENT_ADMIN", "CNT", "OPS", "OPS_REVIEWER", "DSL", "SUPPORT", "SUP", "COMPLIANCE", "CMP", "AI_ENGINEER", "AIE", "OWN", "PRODUCT_OWNER", "BUSINESS_OWNER", "SAFEGUARDING_LEAD", "PLATFORM_ADMIN", "STAFF"];
const SCHOOL_CODES = ["TEACHER", "TCH", "SCHOOL_ADMIN", "SADM", "SAD", "SBM", "BUSINESS_MANAGER", "SCHOOL_DSL"];

export function roleOf(roles?: string[], kind?: string | null): Role {
  const s = set(roles);
  // School roles first: teacher accounts may also carry kind STAFF.
  if (SCHOOL_CODES.some((r) => s.has(r)) || kind === "SCHOOL" || kind === "TEACHER") return "school";
  if (kind === "STAFF" || STAFF_CODES.some((r) => s.has(r))) return "staff";
  if (kind === "PARENT" || s.has("PARENT") || s.has("PAR")) return "parent";
  if (kind === "STUDENT" || s.has("STUDENT") || s.has("STU")) return "student";
  return "guest";
}

export const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { href: "/home", label: "Home", icon: House },
      { href: "/practice", label: "Practice", icon: PencilSimpleLine, match: ["/practice", "/surprise", "/entrance"] },
      { href: "/revise", label: "Revise", icon: BookOpenText, match: ["/revise"] },
      { href: "/mock/new", label: "Mock exams", icon: Exam, match: ["/mock"] },
      { href: "/tutor", label: "Tutor", icon: ChatsCircle, match: ["/tutor", "/voice"] },
      { href: "/student/map", label: "Progress", icon: ChartLineUp, match: ["/student"] },
      { href: "/settings/accessibility", label: "Settings", icon: GearSix, match: ["/settings"] },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  {
    items: [
      { href: "/parent", label: "Children", icon: UsersThree, match: ["/parent/children/"] },
      { href: "/parent/children/new", label: "Add a child", icon: UserPlus },
      { href: "/parent/plan/subjects", label: "Plan & subjects", icon: Books, match: ["/parent/plan", "/parent/checkout"] },
      { href: "/parent/billing", label: "Billing", icon: CreditCard, match: ["/parent/billing"] },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/parent/referral", label: "Refer a friend", icon: Gift },
      { href: "/settings", label: "Settings", icon: GearSix },
      { href: "/help", label: "Help centre", icon: Lifebuoy, match: ["/help"] },
    ],
  },
];

export const SCHOOL_NAV: NavSection[] = [
  {
    items: [
      { href: "/school/dashboard", label: "Dashboard", icon: SquaresFour },
      { href: "/school/classes", label: "Classes", icon: ChalkboardTeacher, match: ["/school/classes"] },
      { href: "/school/onboarding", label: "Onboarding", icon: ClipboardText },
      { href: "/school/kcsie", label: "KCSIE compliance", icon: ShieldCheck },
      { href: "/school/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/help", label: "Help centre", icon: Lifebuoy },
    ],
  },
];

export const STAFF_NAV: NavSection[] = [
  {
    title: "Marking",
    items: [
      { href: "/staff/review", label: "A-Level review", icon: CheckSquareOffset, roles: ["REVIEWER", "REV", "OPS", "OWN"] },
      { href: "/staff/marking/exceptions", label: "Exceptions", icon: WarningOctagon, roles: ["REVIEWER", "REV", "OPS", "OPS_REVIEWER", "OWN"] },
      { href: "/staff/marking/systemic", label: "Systemic issues", icon: Graph, roles: ["OPS", "OPS_REVIEWER", "OWN", "AIE", "AI_ENGINEER"] },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/staff/content/qc", label: "Question QC", icon: FileMagnifyingGlass, roles: ["CONTENT_ADMIN", "CNT", "OWN"] },
      { href: "/staff/content/authoring", label: "Past papers", icon: Notebook, roles: ["CONTENT_ADMIN", "CNT", "OWN"] },
      { href: "/staff/spec", label: "Specifications", icon: ListChecks, roles: ["CONTENT_ADMIN", "CNT", "OWN"], match: ["/staff/spec"] },
      { href: "/staff/style", label: "Board style", icon: Palette, roles: ["CONTENT_ADMIN", "CNT", "OWN"] },
    ],
  },
  {
    title: "Safety & support",
    items: [
      { href: "/staff/safety", label: "Safety flags", icon: Siren, roles: ["DSL", "SAFEGUARDING_LEAD", "COMPLIANCE", "CMP", "OWN"] },
      { href: "/staff/safeguarding", label: "Safeguarding", icon: ShieldCheck, roles: ["DSL", "SAFEGUARDING_LEAD", "COMPLIANCE", "CMP"] },
      { href: "/staff/support", label: "Support", icon: Headset, roles: ["SUPPORT", "SUP", "OPS", "OPS_REVIEWER", "OWN", "PRODUCT_OWNER"] },
    ],
  },
  {
    title: "AI operations",
    items: [
      { href: "/staff/ai/prompts", label: "Prompts", icon: Robot, roles: ["AI_ENGINEER", "AIE", "OWN", "PRODUCT_OWNER"] },
      { href: "/staff/ai/eval", label: "Evaluation", icon: ListChecks, roles: ["AI_ENGINEER", "AIE", "OWN", "PRODUCT_OWNER"] },
      { href: "/staff/ai/cost", label: "AI cost", icon: CurrencyGbp, roles: ["OWN", "PRODUCT_OWNER", "BUSINESS_OWNER"] },
      { href: "/staff/ai/boundary", label: "Data boundary", icon: Fingerprint, roles: ["AI_ENGINEER", "AIE", "COMPLIANCE", "CMP", "OWN"] },
      { href: "/staff/audit", label: "Audit log", icon: Scroll, roles: ["COMPLIANCE", "CMP", "OWN", "PRODUCT_OWNER"] },
    ],
  },
];

/** Keeps only the items a staff member's roles can open; shows everything when roles are unknown. */
export function filterNav(sections: NavSection[], roles?: string[]): NavSection[] {
  const s = set(roles);
  if (s.size === 0) return sections;
  return sections
    .map((sec) => ({ ...sec, items: sec.items.filter((i) => !i.roles || i.roles.some((r) => s.has(r))) }))
    .filter((sec) => sec.items.length > 0);
}

export function navFor(role: Role, roles?: string[]): NavSection[] {
  switch (role) {
    case "student":
      return STUDENT_NAV;
    case "parent":
      return PARENT_NAV;
    case "school":
      return SCHOOL_NAV;
    case "staff":
      return filterNav(STAFF_NAV, roles);
    default:
      return [];
  }
}

export function homeFor(role: Role): string {
  return { student: "/home", parent: "/parent", school: "/school/dashboard", staff: "/staff", guest: "/" }[role];
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.match?.some((m) => pathname.startsWith(m))) return true;
  return item.href !== "/parent" && item.href !== "/home" && pathname.startsWith(item.href + "/");
}
