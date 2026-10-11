import { programCatalog } from '../programs/catalog';
import { launchProgram } from '../programs/launch';
import type { CommandDefinition } from './types';

export const gameCommands: CommandDefinition[] = programCatalog.filter(program => program.category === 'games').map(program => ({
  name: program.code, displayName: program.name, aliases: program.aliases, category: 'programs',
  description: `${program.description}。スコアと実績は自動保存されます。`, usage: program.code, examples: [program.code], arguments: [],
  execute: (args, context) => launchProgram(program, args, context),
}));
