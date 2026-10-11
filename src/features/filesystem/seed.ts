import type { DirectoryNode } from './types';

const exampleGamePlugin = JSON.stringify({
  format: 'retrodos.game', manifestVersion: 1, id: 'hello-cave', code: 'CAVE', name: 'HELLO CAVE',
  description: 'ゲームプラグイン形式の短いサンプル', version: '1.0.0', author: 'RetroDOS User', start: 'entrance',
  scenes: [
    { id: 'entrance', title: '洞窟の入口', text: '青い光が奥から漏れている。', choices: [{ label: '奥へ進む', to: 'goal', score: 100 }, { label: '引き返す', to: 'leave' }] },
    { id: 'goal', title: '青い端末', text: '端末に HELLO, PLAYER! と表示された。', choices: [], ending: 'win' },
    { id: 'leave', title: '帰還', text: '安全を優先して町へ戻った。', choices: [], ending: 'lose' },
  ], achievements: [{ id: 'found-terminal', name: '洞窟の端末', description: '青い端末を発見した', scene: 'goal' }],
}, null, 2);

const exampleWebGamePlugin = JSON.stringify({
  format: 'retrodos.game', manifestVersion: 2, runtime: 'web', id: 'pixel-catch', code: 'PIXEL', name: 'PIXEL CATCH',
  description: '矢印キーで星を取るWebゲーム形式のサンプル', version: '1.0.0', author: 'RetroDOS User',
  display: { width: 640, height: 400, scale: 'pixel', background: '#000000' },
  source: {
    html: '<main><h1>PIXEL CATCH</h1><p id="hud">SCORE 000</p><pre id="board" tabindex="0" autofocus aria-label="PIXEL CATCH盤面"></pre><p id="message">ARROW KEYS: MOVE @ TO *</p><button id="restart" type="button">RESTART</button></main>',
    css: 'body{display:grid;place-items:center;color:#55ffff;background:#000;font:20px monospace}main{width:min(92%,560px);text-align:center}h1{color:#ffff55;font-size:28px}#board{padding:24px;color:#fff;background:#0000aa;border:6px double #55ffff;outline:none;font-size:32px;line-height:1.4}#board:focus{border-color:#ffff55}button{padding:8px 16px;color:#000;background:#55ffff;border:3px outset #fff;font:inherit}',
    javascript: "const board=document.querySelector('#board');const hud=document.querySelector('#hud');const message=document.querySelector('#message');let player;let done;function render(){const cells=Array(15).fill('.');cells[2]='*';cells[player]='@';board.textContent=[cells.slice(0,5).join(' '),cells.slice(5,10).join(' '),cells.slice(10).join(' ')].join('\\n')}function reset(){player=0;done=false;hud.textContent='SCORE 000';message.textContent='ARROW KEYS: MOVE @ TO *';render();board.focus()}board.addEventListener('keydown',event=>{if(done)return;const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-5,ArrowDown:5}[event.key];if(step===undefined)return;event.preventDefault();const next=player+step;if(next<0||next>=15||Math.abs(next%5-player%5)>1)return;player=next;render();if(player===2){done=true;hud.textContent='SCORE 100';message.textContent='MISSION COMPLETE';RetroDOSGame.setScore(100);RetroDOSGame.finish({score:100,won:true,achievements:['first-star']})}});document.querySelector('#restart').addEventListener('click',reset);RetroDOSGame.ready();reset();",
  },
  achievements: [{ id: 'first-star', name: 'FIRST STAR', description: '最初の星を取得した' }],
}, null, 2);

const commandGuide = `RetroDOS v1.0 コマンドガイド

HELP          コマンド一覧
HELP CD       コマンドの詳細
DIR           ファイル一覧
CD DOCS       ディレクトリ移動
PWD           現在位置
TREE          ツリー表示
FIND RetroDOS ファイル・本文検索
MORE README.TXT  ページ表示
STAT README.TXT  ファイル情報
MKDIR NOTES   フォルダー作成
TYPE README.TXT  テキストを表示
VIM MEMO.TXT  Vim風エディタ
COPY A.TXT B.TXT  コピー
REN B.TXT C.TXT   名前変更
MOVE C.TXT DOCS   移動
DEL *.TXT         ワイルドカード削除
RMDIR EMPTY       空フォルダー削除
RMDIR /S OLD      中身ごとフォルダー削除
UNDO          直前の操作を取り消す
EXPORT        ドライブ書き出し
IMPORT        ドライブ取り込み
SET NAME=RETRODOS 環境変数
ALIAS LL=DIR      エイリアス
DEF HI=ECHO Hello %1  ユーザー定義コマンド
CALL SCRIPTS\\DEMO.BAT  BAT実行
CD DOCS && DIR    複数コマンド
ECHO hello > NOTE.TXT  リダイレクト
DIR | FIND ".TXT"    パイプ
PROGRAMS      プログラム一覧
DOSBOX        DOSゲーム登録・設定・セーブ管理（Windows版）
DOSRUN DOS_MYGAME  登録したDOSゲームを起動
DOSBACKUP DOS_MYGAME  ゲーム全体をバックアップ
FULLSCREEN    全画面切替（F11でも切替、Escで解除）
APPS          PROGRAMSの別名
FILES         ファイルマネージャー
TODO          ToDoリスト
CALENDAR      カレンダー
CALC          電卓
PAINT         ASCIIペイント
MARKDOWN      Markdownビューア
SYSINFO       システム情報
SETTINGS      設定
GAMES         ゲーム一覧
GUESS         数当てゲーム
SNAKE         SNAKE
MINES         マインスイーパー
BLOCKS        落ちものパズル
ADVENTURE     テキストアドベンチャー
ROGUE         ローグライク
GAMEIMPORT C:\\GAMES\\EXAMPLE.RGAME.JSON  ゲーム追加
GAMEPROMPT    ゲーム作成をAIに相談

↑ / ↓: 履歴   Tab: 補完   Esc: 候補を閉じる・全画面解除
Ctrl+W: アプリを閉じる   Ctrl+K: コマンド検索   Ctrl+L: ターミナルをクリア`;

export const initialFileSystem: DirectoryNode = {
  kind: 'directory', name: 'C:', children: [
    { kind: 'directory', name: 'GAMES', children: [
      { kind: 'file', name: 'GUESS.TXT', content: 'GUESS — 数当てゲーム\n1〜100の数字を当ててください。\n起動コマンド: GUESS\nゲーム終了時にはターミナルへ戻ります。' },
      { kind: 'file', name: 'EXAMPLE.RGAME.JSON', content: exampleGamePlugin },
      { kind: 'file', name: 'PIXEL.RGAME.JSON', content: exampleWebGamePlugin },
    ] },
    { kind: 'directory', name: 'DOCS', children: [
      { kind: 'file', name: 'COMMANDS.TXT', content: commandGuide },
      { kind: 'file', name: 'WELCOME NOTE.TXT', content: 'ようこそ、RetroDOSへ。\nスペースを含むパスは引用符で囲んでください。\n例: TYPE "WELCOME NOTE.TXT"' },
    ] },
    { kind: 'directory', name: 'SCRIPTS', children: [
      { kind: 'file', name: 'DEMO.BAT', content: '@ECHO OFF\nREM RetroDOS v0.3 shell demo\nSET PROJECT=RETRODOS\nECHO %PROJECT% shell is ready > C:\\SHELL-DEMO.TXT\nTYPE C:\\SHELL-DEMO.TXT' },
    ] },
    { kind: 'directory', name: 'SYSTEM', children: [
      { kind: 'file', name: 'VERSION.TXT', content: 'RetroDOS Version 1.0.0\n仮想ファイルシステム / 永続ストレージ\nBAT / パイプ / リダイレクト / 環境変数\n6本の内蔵ゲーム / スコア・実績 / v1・v2ゲームプラグイン\nDOSBox連携 / 所有ゲームの登録・起動設定・セーブ管理（Windows版）\n全画面 / CRT表示 / 起動音' },
    ] },
    { kind: 'file', name: 'README.TXT', content: 'Welcome to RetroDOS.\n\nレトロなコマンド操作 × 現代的なデスクトップUI\n\nHELP でコマンド一覧を表示します。\nCALL SCRIPTS\\DEMO.BAT でv0.3のシェル機能を試せます。\nPROGRAMS でプログラム一覧を開きます。\nGAMES でゲームだけを表示します。\nGUESS / SNAKE / MINES / BLOCKS / ADVENTURE / ROGUE を利用できます。\nGAMEIMPORT C:\\GAMES\\EXAMPLE.RGAME.JSON で分岐型サンプルを追加できます。\nGAMEIMPORT C:\\GAMES\\PIXEL.RGAME.JSON でWebゲーム形式を試せます。\nGAMEPROMPT で作りたいゲームをAIと相談できます。\n\nここにあるファイルはすべて仮想ファイルです。\n実際のPCのファイルやOSコマンドは操作しません。' },
  ],
};
