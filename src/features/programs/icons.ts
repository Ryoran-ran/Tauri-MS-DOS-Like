import { AppWindow, Calculator, CalendarDays, CheckSquare, FileCode2, FileText, FolderOpen, Monitor, Paintbrush, Settings, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
const icons: Record<string, LucideIcon> = { folder: FolderOpen, todo: CheckSquare, calendar: CalendarDays, calculator: Calculator, paint: Paintbrush, markdown: FileCode2, editor: FileText, target: Target, monitor: Monitor, settings: Settings };
export const getProgramIcon = (name: string) => icons[name] ?? AppWindow;
