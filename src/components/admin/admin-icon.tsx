import {
  BadgePercent,
  Banknote,
  Bot,
  ChartColumn,
  Contact2,
  Crown,
  FileText,
  Gamepad2,
  Gift,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ADMIN_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  ChartColumn,
  Users,
  Contact2,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  BadgePercent,
  Gift,
  Trophy,
  Crown,
  Swords,
  FileText,
  Gamepad2,
  Megaphone,
  LifeBuoy,
  MessageSquare,
  Mail,
  MapPin,
  ScrollText,
  Settings,
  Inbox,
  Bot,
  Banknote,
  Wallet,
  History,
  Star,
};

export function AdminIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ADMIN_ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}
