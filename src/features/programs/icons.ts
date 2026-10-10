import { AppWindow, Bomb, BookOpen, Boxes, Calculator, CalendarDays, CheckSquare, FileCode2, FileText, FolderOpen, Gamepad2, Monitor, Paintbrush, Settings, Skull, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
const icons: Record<string, LucideIcon> = { folder: FolderOpen, todo: CheckSquare, calendar: CalendarDays, calculator: Calculator, paint: Paintbrush, markdown: FileCode2, editor: FileText, target: Target, snake: Gamepad2, bomb: Bomb, blocks: Boxes, adventure: BookOpen, rogue: Skull, monitor: Monitor, settings: Settings };
export const getProgramIcon = (name: string) => icons[name] ?? AppWindow;
