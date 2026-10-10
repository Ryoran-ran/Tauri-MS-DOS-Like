# RetroDOS v0.1–v0.3 実装・検証記録

2026年10月9日（JST）。作業フォルダーは空だったため、新規プロジェクトとして実装しました。

## v0.3追記（2026年10月10日）

- バージョンを0.3.0へ更新し、`&&`、`|`、`>`、`>>`を解釈するシェル実行器を追加。
- SET、ALIAS、DEF（COMMAND）、CALLを追加。環境変数、エイリアス、ユーザー定義コマンドを永続化。
- `.BAT`の直接実行とCALLに対応し、引数、コメント、環境変数、シェル演算子を利用可能にした。
- 再帰10階層、BAT 500行、1入力500コマンドの上限を設け、エラー時は後続処理を停止。
- `SCRIPTS\\DEMO.BAT`を初期仮想ドライブへ追加。
- Vitest 96件、Playwright 12件を通過。Windowsデスクトップ版でも連結実行、リダイレクト、パイプ、BAT実行を確認済み。

## v0.2追記（2026年10月10日）

- バージョンを0.2.0へ更新し、仮想ドライブを永続化。
- MKDIR、DEL、RMDIR、COPY、REN、MOVE、PWD、TREE、FIND、MORE、STAT、UNDO、EXPORT、IMPORTを追加。
- DELの`*`・`?`ワイルドカード、一括UNDO、最大20件の永続UNDO履歴を実装。
- 作成日時・更新日時・サイズを仮想ファイルへ追加し、DIRとSTATから確認可能。
- MOREのキーボードページャー、Vim風メモ帳、JSONドライブ取り込み画面を追加。
- Vitest 80件、Playwright 10件を通過。Windowsデスクトップ版もビルド・起動確認済み。

## 実装結果

指示書のv0.1の機能を実装しました。

- タイトルバー、コマンドガイド、ワークスペース、常時表示のステータスバー。
- 日本語対応のダークテーマ、等幅ターミナル、緑のアクセント、狭い画面でのサイドバー表示。
- 11コマンドの共通登録、引用符対応パーサー、UIから独立した非同期コマンド実行。
- C:の仮想ファイルシステム、相対・絶対パス、親ディレクトリ、一覧表示、テキスト表示、パスエラー。
- コマンド名・別名・日本語の説明で検索、詳細・使用例・引数表示、実行しない挿入と入力欄へのフォーカス。
- 入力履歴と編集中テキストの復元、単一・複数候補のTab補完、Esc、IME変換中のEnter対策。
- 時系列の安全なテキスト出力、エラー表示、CLS、過去ログ閲覧中の自動スクロール抑制。
- ゲームライブラリ、登録方式のGUESS、範囲ヒント・予想履歴・試行回数・正解・再プレイ・終了。
- Tauri v2のWindows実行ファイル。OS標準のウィンドウ装飾を使用。

## 起動方法

作業フォルダー`D:\プログラミング\MS-DOS`で実行します。

```powershell
# 初回の依存関係インストール
npm ci

# ブラウザー版
npm run dev

# Tauri開発版（上記の開発サーバーを終了してから）
npm run desktop:dev

# 単体exeを生成
npm run desktop:build
```

ブラウザー版は http://127.0.0.1:1420 です。生成済みexeは`src-tauri/target/release/retrodos.exe`（約8.2 MiB）です。実行にはWebView2 Runtimeが必要です。

詳しい前提条件、キー操作、コマンド例、拡張方法は[README](../README.md)に記載しています。

## v0.1時点のテスト結果

| 確認 | 結果 | 内容 |
| --- | --- | --- |
| `npm test` | 42件成功 / 4ファイル | パーサー、パス、ストレージ、コマンド、検索・補完、ゲーム判定 |
| `npm run typecheck` | 成功 | strict、未使用変数・引数、未検証インデックスアクセスの検査 |
| `npm run build` | 成功 | Vite本番Webアセット生成 |
| `npm run test:e2e` | 6件成功 | Edgeでコマンド、検索・挿入、履歴・補完、ゲーム、スクロール、リサイズ |
| `npm run desktop:build` | 成功 | Rust releaseビルド、Windows exe生成 |
| `npm run test:desktop` | 成功 | 実際のTauri / WebView2でDIR、CD、TYPE、RUN GUESS、終了、フォーカス復帰 |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | 成功 | Rustコードの書式 |
| 画面の目視確認 | 完了 | ターミナル、コマンド詳細、ライブラリ、GUESS、モバイル幅 |

リサイズの操作テストは1180×780、800×600、520×480、375×667で実施しました。入力欄・ステータスバーの表示と、ページ全体に横スクロールが生じないことを確認しました。挿入ボタンは詳細のスクロール領域から分離し、常時表示します。

E2Eでは、未定義コマンドのHELP案内、失敗したCDでパスが変わらないこと、HTMLの文字列がHTML要素にならないこと、挿入や補完で勝手に実行しないことも検証しています。GUESSは候補範囲から数字を選んで正解まで進み、再プレイと終了を確認しました。

デスクトップ検証は本番exeを起動して行い、テスト終了時にアプリと検証接続を閉じます。ビルド時にMSVCがライブラリ生成の情報をlinker warningとして1件表示しますが、ビルドと実起動検証は成功しています。

## 変更ファイル

すべて新規作成です。生成済みの`node_modules/`、`dist/`、`src-tauri/target/`、テストの一時出力は`.gitignore`の対象です。

| 領域 | ファイル |
| --- | --- |
| 基本設定 | `.gitignore`, `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts` |
| エントリ・アプリ | `src/main.tsx`, `src/app/App.tsx`, `src/app/constants.ts` |
| レイアウト | `src/components/layout/TitleBar.tsx`, `WorkspaceTabs.tsx` |
| サイドバー | `src/components/sidebar/Sidebar.tsx`, `CommandDetails.tsx` |
| ターミナル・ステータス | `src/components/terminal/Terminal.tsx`, `src/components/statusbar/StatusBar.tsx` |
| コマンド | `src/features/commands/types.ts`, `parser.ts`, `registry.ts`, `runner.ts`, `parser.test.ts`, `runner.test.ts` |
| 仮想ファイルシステム | `src/features/filesystem/types.ts`, `path.ts`, `seed.ts`, `storage.ts`, `filesystem.ts`, `filesystem.test.ts` |
| ゲーム | `src/features/games/catalog.ts`, `registry.ts`, `GameLibrary.tsx`, `GameHost.tsx`, `GuessGame.tsx`, `guessLogic.ts`, `guessLogic.test.ts` |
| 状態・入力 | `src/hooks/useWorkspace.ts`, `useCommandInput.ts`, `useMediaQuery.ts` |
| 共通型・プラットフォーム | `src/types/workspace.ts`, `src/services/platform.ts` |
| スタイル | `src/styles/global.css`, `workspace.css` |
| Tauri | `src-tauri/Cargo.toml`, `Cargo.lock`, `build.rs`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs` |
| アイコン | `public/retrodos.svg`, `src-tauri/icons/32x32.png`, `128x128.png`, `icon.png`, `icon.ico`, `icon.icns` |
| 操作テスト | `tests/e2e/workspace.spec.ts` |
| 検証スクリプト | `scripts/verify-desktop.mjs`, `scripts/capture-preview.mjs` |
| ドキュメント | `README.md`, `docs/IMPLEMENTATION.md` |
| スクリーンショット | `docs/screenshots/terminal.png`, `command-guide.png`, `game-library.png`, `guess.png`, `mobile.png`, `desktop.png` |

## 未実装事項と範囲

- 外部DOSゲームの起動、DOSBox連携。
- 現在位置、入力履歴、ゲーム状態の再起動後の保存。
- 実PCのファイルアクセス。
- 配布用インストーラーの生成・署名・配布検証。NSIS設定はありますが、今回の成果物は単体exeです。
- macOS / Linux版の実機ビルド・起動検証。

これらはv0.1の動作として提供していません。コマンド登録、ストレージインターフェース、ゲーム登録、プラットフォームサービスを分離し、今後の追加に備えています。フロントエンドへシェル・プロセス・ファイル実行権限を付与せず、ネイティブコマンドや外部ゲームを実行する機構はありません。
