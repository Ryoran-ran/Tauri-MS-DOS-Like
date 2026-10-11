import type { Dispatch, SetStateAction } from 'react';
import type { ActiveView } from '../../types/workspace';
import type { FileSystem } from '../filesystem/types';
import type { BuiltinAppId } from './catalog';
import type { AppSettings } from './storage';
import { FileManager } from './FileManager';
import { Todo } from './Todo';
import { Calendar } from './Calendar';
import { Calculator } from './Calculator';
import { AsciiPaint } from './AsciiPaint';
import { Markdown } from './Markdown';
import { SystemInfo } from './SystemInfo';
import { Settings } from './Settings';
import { DosGameManager } from '../dosbox/DosGameManager';

interface Props {
  activeView: ActiveView; openViews: ActiveView[]; closeView: (id: BuiltinAppId) => void;
  fileSystem: FileSystem; fileRevision: number;
  appLaunches: Partial<Record<BuiltinAppId, { path?: string; expression?: string; request: number }>>;
  runCommand: (command: string) => Promise<void>;
  settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>; storageError: string;
}
export function BuiltinApps(props: Props) {
  const { openViews, activeView, closeView, fileSystem, appLaunches, fileRevision, runCommand, settings, setSettings, storageError } = props;
  const common = (id: BuiltinAppId) => ({ active: activeView === id, onClose: () => closeView(id) });
  return <>
    {openViews.includes('dosbox') && <DosGameManager {...common('dosbox')} />}
    {openViews.includes('files') && <FileManager {...common('files')} fileSystem={fileSystem} initialPath={appLaunches.files?.path ?? 'C:\\'} request={appLaunches.files?.request ?? 0} revision={fileRevision} runCommand={runCommand} />}
    {openViews.includes('todo') && <Todo {...common('todo')} />}
    {openViews.includes('calendar') && <Calendar {...common('calendar')} weekStart={settings.weekStart} />}
    {openViews.includes('calculator') && <Calculator {...common('calculator')} initialExpression={appLaunches.calculator?.expression ?? ''} request={appLaunches.calculator?.request ?? 0} />}
    {openViews.includes('paint') && <AsciiPaint {...common('paint')} fileSystem={fileSystem} initialPath={appLaunches.paint?.path ?? 'C:\\ART.ASC'} request={appLaunches.paint?.request ?? 0} />}
    {openViews.includes('markdown') && <Markdown {...common('markdown')} fileSystem={fileSystem} initialPath={appLaunches.markdown?.path ?? ''} request={appLaunches.markdown?.request ?? 0} runCommand={runCommand} />}
    {openViews.includes('sysinfo') && <SystemInfo {...common('sysinfo')} fileSystem={fileSystem} revision={fileRevision} tabCount={openViews.length} />}
    {openViews.includes('settings') && <Settings {...common('settings')} settings={settings} setSettings={setSettings} storageError={storageError} />}
  </>;
}
