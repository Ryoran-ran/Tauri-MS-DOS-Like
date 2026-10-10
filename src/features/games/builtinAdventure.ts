import type { StoryGamePluginManifest } from './gamePlugin';

export const builtinAdventure: StoryGamePluginManifest = {
  format: 'retrodos.game', manifestVersion: 1, id: 'adventure', code: 'ADVENTURE', name: 'LOST TERMINAL',
  description: '停止した地下端末から脱出する短編テキストアドベンチャー', version: '0.5.0', author: 'RetroDOS', start: 'boot',
  scenes: [
    { id: 'boot', title: 'C:\UNKNOWN>', text: '非常灯だけが点く地下端末室で目を覚ました。机には磁気カード、北には施錠された扉、東には暗い保守通路がある。', choices: [
      { label: '磁気カードを取る', to: 'card', give: 'keycard', score: 20 }, { label: '保守通路へ進む', to: 'tunnel' }, { label: '端末を調べる', to: 'terminal', score: 10 },
    ] },
    { id: 'card', title: 'ACCESS CARD', text: 'カードには「SECTOR 5」と書かれている。北の扉の読取機が青く点滅した。', choices: [{ label: '北の扉を開ける', to: 'exit', requires: 'keycard', score: 80 }, { label: '端末を調べる', to: 'terminal' }] },
    { id: 'terminal', title: 'SYSTEM LOG', text: 'ログには「保守通路の床は崩落。出口はSECTOR 5」と残されていた。', choices: [{ label: '机へ戻る', to: 'boot' }, { label: '北の扉へ向かう', to: 'exit', requires: 'keycard', score: 80 }] },
    { id: 'tunnel', title: 'MAINTENANCE SHAFT', text: '一歩踏み出すと金属床が崩れた。暗闇の底で通信が途切れる。', choices: [], ending: 'lose' },
    { id: 'exit', title: 'OUTSIDE', text: 'カードが認証され、朝の光が差し込む。遠くでRetroDOSの起動音が聞こえた。', choices: [], ending: 'win' },
  ],
  achievements: [
    { id: 'log-reader', name: 'ログ解析', description: 'SYSTEM LOGを発見した', scene: 'terminal' },
    { id: 'escaped', name: 'LOST NO MORE', description: '地下端末から脱出した', scene: 'exit' },
  ],
};
