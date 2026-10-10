import { builtinApps } from '../apps/catalog';
import { launchProgram } from '../programs/launch';
import type { CommandDefinition } from './types';

const pathArgument = [{ name: 'パス', description: '開く仮想ファイルまたはフォルダー', required: false }];
export const appCommands: CommandDefinition[] = builtinApps.map((app): CommandDefinition => ({
  name: app.command, displayName: app.name, aliases: app.manifest.aliases,
  category: 'programs', description: `${app.description}。専用タブで開きます。`,
  usage: app.id === 'calculator' ? 'CALC [式]' : ['files', 'paint', 'markdown'].includes(app.id) ? `${app.command} [パス]` : app.command,
  examples: app.id === 'calculator' ? ['CALC', 'CALC "(12 + 8) * 3"'] : app.id === 'files' ? ['FILES', 'FILES DOCS'] : app.id === 'paint' ? ['PAINT', 'PAINT DOCS\\ART.ASC'] : app.id === 'markdown' ? ['MARKDOWN', 'MARKDOWN DOCS\\NOTE.MD'] : [app.command],
  arguments: app.id === 'calculator' ? [{ name: '式', description: '四則演算、括弧、^、%に対応', required: false, variadic: true }] : ['files', 'paint', 'markdown'].includes(app.id) ? pathArgument : [],
  execute: (args, context) => launchProgram(app.manifest, args, context),
}));
