import { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  desc: string;
  icon: LucideIcon;
  badge?: number;
  roles: string[];
};
