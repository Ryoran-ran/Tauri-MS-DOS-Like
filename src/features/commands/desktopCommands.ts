import { dosRequest } from '../dosbox/api';
import { setFullscreen } from '../../services/display';
import type { CommandDefinition, CommandResult } from './types';

export async function runDosGame(code: string): Promise<CommandResult> {
  const reply = await dosRequest({ action: 'launch', code });
  return { output: [reply.message], activeView: 'dosbox', appLaunch: { id: 'dosbox' } };
}
export const desktopCommands: CommandDefinition[] = [
  { name: 'DOSRUN', displayName: 'DOSゲームを起動', aliases: [], category: 'programs',
    description: 'DOSBOXで登録したゲームを、保存した起動設定で実行します。Windowsデスクトップ版専用です。',
    usage: 'DOSRUN <コード>', examples: ['DOSRUN DOS_MYGAME'], arguments: [{ name: 'コード', description: 'DOSBOXで登録した起動コード', required: true }],
    execute: args => runDosGame(args[0]!),
  },
  { name: 'DOSBACKUP', displayName: 'DOSセーブを保存', aliases: [], category: 'programs',
    description: '終了したDOSゲームのフォルダー全体をバックアップします。復元はDOSBOX画面から行います。',
    usage: 'DOSBACKUP <コード>', examples: ['DOSBACKUP DOS_MYGAME'], arguments: [{ name: 'コード', description: 'DOSゲームの起動コード', required: true }],
    execute: async args => {
      const current = await dosRequest({ action: 'status' });
      const game = current.state?.games.find(item => item.config.code === args[0]!.toUpperCase());
      if (!game) return { error: true, output: ['DOSゲームが見つかりません。DOSBOXで登録してください。'] };
      await dosRequest({ action: 'backup', id: game.id });
      return { output: [`${game.config.name} のバックアップを作成しました。`], activeView: 'dosbox', appLaunch: { id: 'dosbox' } };
    },
  },
  { name: 'FULLSCREEN', displayName: '全画面表示', aliases: ['FS'], category: 'system',
    description: 'RetroDOSを全画面にします。F11でも切り替えられます。Escで全画面を解除します。',
    usage: 'FULLSCREEN [ON|OFF]', examples: ['FULLSCREEN', 'FULLSCREEN ON', 'FS OFF'], arguments: [{ name: 'ON / OFF', description: '省略すると切り替え', required: false }],
    execute: async args => {
      const value = args[0]?.toUpperCase();
      if (args.length > 1 || (value !== undefined && !['ON', 'OFF'].includes(value))) return { error: true, output: ['使い方: FULLSCREEN [ON|OFF]'] };
      const enabled = await setFullscreen(value === undefined ? undefined : value === 'ON');
      return { output: [`全画面表示: ${enabled ? 'ON' : 'OFF'}`] };
    },
  },
];
