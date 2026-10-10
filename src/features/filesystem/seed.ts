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

const commandGuide = `RetroDOS v0.5 コマンドガイド

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
GAMEPROMPT    ゲーム作成プロンプトをコピー

↑ / ↓: 履歴   Tab: 補完   Esc: 候補を閉じる
Ctrl+K: コマンド検索   Ctrl+L: ターミナルをクリア`;

export const initialFileSystem: DirectoryNode = {
  kind: 'directory', name: 'C:', children: [
    { kind: 'directory', name: 'GAMES', children: [
      { kind: 'file', name: 'GUESS.TXT', content: 'GUESS — 数当てゲーム\n1〜100の数字を当ててください。\n起動コマンド: GUESS\nゲーム終了時にはターミナルへ戻ります。' },
      { kind: 'file', name: 'EXAMPLE.RGAME.JSON', content: exampleGamePlugin },
    ] },
    { kind: 'directory', name: 'DOCS', children: [
      { kind: 'file', name: 'COMMANDS.TXT', content: commandGuide },
      { kind: 'file', name: 'WELCOME NOTE.TXT', content: 'ようこそ、RetroDOSへ。\nスペースを含むパスは引用符で囲んでください。\n例: TYPE "WELCOME NOTE.TXT"' },
    ] },
    { kind: 'directory', name: 'SCRIPTS', children: [
      { kind: 'file', name: 'DEMO.BAT', content: '@ECHO OFF\nREM RetroDOS v0.3 shell demo\nSET PROJECT=RETRODOS\nECHO %PROJECT% shell is ready > C:\\SHELL-DEMO.TXT\nTYPE C:\\SHELL-DEMO.TXT' },
    ] },
    { kind: 'directory', name: 'SYSTEM', children: [
      { kind: 'file', name: 'VERSION.TXT', content: 'RetroDOS Version 0.5.0\n仮想ファイルシステム / 永続ストレージ\nBAT / パイプ / リダイレクト / 環境変数\n6本の内蔵ゲーム / スコア・実績 / JSONゲームプラグイン\n外部DOSゲームとDOSBox連携は将来のバージョンで対応予定です。' },
    ] },
    { kind: 'file', name: 'README.TXT', content: 'Welcome to RetroDOS.\n\nレトロなコマンド操作 × 現代的なデスクトップUI\n\nHELP でコマンド一覧を表示します。\nCALL SCRIPTS\\DEMO.BAT でv0.3のシェル機能を試せます。\nPROGRAMS でプログラム一覧を開きます。\nGAMES でゲームだけを表示します。\nGUESS / SNAKE / MINES / BLOCKS / ADVENTURE / ROGUE を利用できます。\nGAMEIMPORT C:\\GAMES\\EXAMPLE.RGAME.JSON でサンプルゲームを追加できます。\n\nここにあるファイルはすべて仮想ファイルです。\n実際のPCのファイルやOSコマンドは操作しません。' },
  ],
};
