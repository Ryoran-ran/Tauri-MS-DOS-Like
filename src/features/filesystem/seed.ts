import type { DirectoryNode } from './types';

export const initialFileSystem: DirectoryNode = {
  kind: 'directory', name: 'C:', children: [
    { kind: 'directory', name: 'GAMES', children: [
      { kind: 'file', name: 'GUESS.TXT', content: 'GUESS — 数当てゲーム\n1〜100の数字を当ててください。\n起動コマンド: RUN GUESS\nゲーム終了時にはターミナルへ戻ります。' },
    ] },
    { kind: 'directory', name: 'DOCS', children: [
      { kind: 'file', name: 'COMMANDS.TXT', content: 'RetroDOS v0.4 コマンドガイド\n\nHELP          コマンド一覧\nHELP CD       コマンドの詳細\nDIR           ファイル一覧\nCD DOCS       ディレクトリ移動\nPWD           現在位置\nTREE          ツリー表示\nFIND RetroDOS ファイル・本文検索\nMORE README.TXT  ページ表示\nSTAT README.TXT  ファイル情報\nMKDIR NOTES   フォルダー作成\nTYPE README.TXT  テキストを表示\nVIM MEMO.TXT  Vim風メモ帳\nCOPY A.TXT B.TXT  コピー\nREN B.TXT C.TXT   名前変更\nMOVE C.TXT DOCS   移動\nDEL *.TXT         ワイルドカード削除\nRMDIR EMPTY       空フォルダー削除\nRMDIR /S OLD      中身ごとフォルダー削除\nUNDO          直前の操作を取り消す\nEXPORT        ドライブ書き出し\nIMPORT        ドライブ取り込み\nSET NAME=RETRODOS 環境変数\nALIAS LL=DIR      エイリアス\nDEF HI=ECHO Hello %1  ユーザー定義コマンド\nCALL SCRIPTS\\DEMO.BAT  BAT実行\nCD DOCS && DIR    複数コマンド\nECHO hello > NOTE.TXT  リダイレクト\nDIR | FIND ".TXT"    パイプ\nPROGRAMS      プログラム一覧\nAPPS          PROGRAMSの別名\nFILES         ファイルマネージャー\nTODO          ToDoリスト\nCALENDAR      カレンダー\nCALC          電卓\nPAINT         ASCIIペイント\nMARKDOWN      Markdownビューア\nSYSINFO       システム情報\nSETTINGS      設定\nGAMES         プログラム一覧（ゲーム）\nRUN CALC      電卓を起動\nRUN GUESS     数当てゲームを起動\n\n↑ / ↓: 履歴   Tab: 補完   Esc: 候補を閉じる\nCtrl+K: コマンド検索   Ctrl+L: ターミナルをクリア' },
      { kind: 'file', name: 'WELCOME NOTE.TXT', content: 'ようこそ、RetroDOSへ。\nスペースを含むパスは引用符で囲んでください。\n例: TYPE "WELCOME NOTE.TXT"' },
    ] },
    { kind: 'directory', name: 'SCRIPTS', children: [
      { kind: 'file', name: 'DEMO.BAT', content: '@ECHO OFF\nREM RetroDOS v0.3 shell demo\nSET PROJECT=RETRODOS\nECHO %PROJECT% shell is ready > C:\\SHELL-DEMO.TXT\nTYPE C:\\SHELL-DEMO.TXT' },
    ] },
    { kind: 'directory', name: 'SYSTEM', children: [
      { kind: 'file', name: 'VERSION.TXT', content: 'RetroDOS Version 0.4.0\n仮想ファイルシステム / 永続ストレージ\nBAT / パイプ / リダイレクト / 環境変数\nエイリアス / ユーザー定義コマンド\n外部DOSゲームとDOSBox連携は将来のバージョンで対応予定です。' },
    ] },
    { kind: 'file', name: 'README.TXT', content: 'Welcome to RetroDOS.\n\nレトロなコマンド操作 × 現代的なデスクトップUI\n\nHELP でコマンド一覧を表示します。\nCALL SCRIPTS\\DEMO.BAT でv0.3のシェル機能を試せます。\nPROGRAMS でプログラム一覧を開きます。\nGAMES でゲームだけを表示します。\nRUN GUESS で数当てゲームを始めましょう。\n\nここにあるファイルはすべて仮想ファイルです。\n実際のPCのファイルやOSコマンドは操作しません。' },
  ],
};
