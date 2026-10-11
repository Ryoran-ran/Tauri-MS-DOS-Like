# RetroDOS v0.1–v1.0 実装・検証記録

2026年10月9日（JST）。作業フォルダーは空だったため、新規プロジェクトとして実装しました。

## v1.0追記（2026年10月11日）

複数ユーザー・複数仮想ドライブを除き、DOSBox連携、所有するDOSゲームの登録、ゲームごとの起動設定、セーブデータ管理、全画面、起動音を追加しました。既存のCRT表示を維持しています。標準プログラムは16本、内蔵アプリは9本、コマンドは51個です。

`DOSBOX`は標準ツールとして共通マニフェストから登録されます。DOSゲームの専用フォルダーをネイティブ管理領域へコピーし、名前・コード・起動ファイル・引数・CPU速度・メモリー・音声・全画面・起動前バックアップを保存します。登録したゲームは共通一覧とタブ右端の起動メニューにも表示され、`DOSRUN`と`RUN`で起動できます。Windows版のDOSBox本体はユーザーが指定します。

セーブデータはゲームフォルダー全体のスナップショットとして保存します。手動・起動前・復元前のバックアップを区別し、復元は一時コピーとフォルダーの交換で行います。起動中の設定変更・バックアップ・復元・削除を拒否し、元のゲームフォルダーを操作しません。保存先はユーザーに表示します。リンクや管理領域外の操作、起動ファイルの絶対パス・親ディレクトリ、DOS演算子を含む引数を拒否します。

ネイティブAPIはメイン画面の専用コマンドと全画面操作だけを許可します。DOSBoxへ渡すパスはASCIIの相対パスにし、日本語を含むWindowsパスでも起動できる構成です。ゲーム付属の設定が読み込まれないようプロフィールを作業ディレクトリとし、既存autoexecを実行せず、管理領域のコピーをマウントしてからsecure modeに入ります。

全画面はタイトルバー、F11、`FULLSCREEN`（別名`FS`）に対応し、Escで解除します。アプリ・ゲーム・一覧の終了はCtrl+Wに分離し、全画面中にアプリを閉じても全画面状態を維持します。起動音はWeb Audioで生成し、初期状態はOFF、音量は設定画面から変更できます。ONにした次回起動では最初の操作で鳴ります。音声の試聴、設定の復元、旧設定データとの互換性を備えています。

検証結果：Vitest **214件成功**（19ファイル）、Playwright **35件成功**（6ファイル）、Rust **4件成功**、型チェック・本番Webビルド・Windows releaseビルド成功。実際のWebView2でDOS登録・設定保存・バックアップ作成・復元前の保存・キャンセル・再読込・削除・全画面・フォーカス復帰を確認しました。公式DOSBox Staging **0.83.0**（ポータブル版、公式SHA256照合済み）では、自作COMプログラムの実行とSAVE.DAT生成、日本語を含む管理パス、共通ゲーム一覧とタブメニューからの起動、元フォルダーの保護を確認しました。市販ゲーム個別の互換性やDOSBox / DOSBox-Xの実機検証は行っていません。

PRのWindowsビルドジョブにもRustテストを追加しました。ネイティブ検証は専用WebView2プロファイルと`test-results/`内のDOS管理データを使い、既存RetroDOSデータを変更しません。外部Webゲームのフレームから有効なゲーム登録リクエストを送っても登録されず、親DOM・保存領域・外部通信の制限も維持されることを確認しています。WebView2がフレームIPCの応答を返さない場合も、検証が無限待機しないようにしました。

生成先は`src-tauri/target/release/retrodos.exe`です。

## v0.5追記（2026年10月10日）

ゲーム環境を6本へ拡張しました。GUESSに加え、リアルタイム移動のSNAKE、初手安全の9×9 MINES、回転・ハードドロップ・ライン消去を備えるBLOCKS、分岐型テキストアドベンチャーLOST TERMINAL、自動生成迷宮のASCIIローグライクROGUEを追加しています。すべて個別の`program.json`から登録し、直接コマンド、`RUN`、プログラム一覧、タブ右端の起動メニューから開けます。

ゲーム別にハイスコア、直近スコア、プレイ回数、勝利数、実績を`retrodos.games.v1`へ保存します。各ゲーム画面に現在値とハイスコアを表示し、ゲーム一覧の「スコア・実績」で全記録を確認できます。保存値は読込時に型・件数・数値範囲を検証します。

外部ゲーム用の`retrodos.game`は2形式に対応しました。v1は最大100場面の文章と選択肢、アイテム、得点、実績を宣言型JSONで定義します。v2はHTML・CSS・JavaScriptを単一JSONへ格納し、ネットワーク・親DOM・保存領域へアクセスできないsandbox iframeで実行するため、アクションやパズルなども追加できます。専用APIで現在得点、終了結果、実績、終了要求だけをホストへ通知します。仮想ファイルは`GAMEIMPORT`、実PCのファイルはゲーム一覧の「ゲーム追加」から取り込みます。`GAMEPROMPT`はジャンル、操作、UI、形式を順番に相談するプロンプトへ変更しました。JSON Schema、作成ガイド、v1/v2サンプルを用意しています。

検証結果：最終版でVitest **210件成功**（18ファイル）、Playwright **32件成功**（5ファイル）、TypeScript型チェック、本番Webビルド、Tauri releaseビルドに成功しました。Windowsの通常版exeでも、相談プロンプトのクリップボードコピー、v1/v2ゲームの取込・起動、実際の矢印キー入力、スコア・実績保存、再プレイ、Ctrl+W終了、再読込後の復元を確認済みです。隔離フレームから親DOM・localStorage・外部通信へのアクセスが遮断され、Tauriの権限を付与していないコマンドも拒否されることを確認しました。6本の内蔵ゲーム、Vim、8アプリ、シェル、BAT、共通一覧の操作テストも成功しています。検証は一時WebView2プロファイルを使用し、通常の保存データを変更しません。生成先は`src-tauri/target/release/retrodos.exe`です。

全体検証で見つかったVimのRedo後のカーソルずれを修正しました。移動は即時に反映し、編集による選択位置の復元は編集内容がDOMへ反映された直後に行います。Undo・Redoの履歴には実際のカーソル位置を記録し、EdgeとWindows WebView2の両方で復元位置を確認しています。

## v0.4追記（2026年10月10日）

Vim風エディタへ行単位の`yy` / `p`、`u` / `Ctrl+R`のUndo・Redo、`/`検索と`n` / `N`、`:set number` / `:set nonumber`、`:e` / `:e!`によるファイル切替を追加しました。`dd`で削除した行も行レジスターへ入り、貼り付けできます。未保存状態の`:e`は切替を止め、`:e!`で明示的に破棄します。

アプリとゲームの起動を「プログラム」へ統合しました。＋プログラムにはVIM・GUESSを含む標準10本をツール・ゲーム・システムで分類して表示します。PROGRAMS（別名APPS）は全件、GAMESはゲームで絞った同じ一覧を開き、コード・番号・矢印で選択できます。RUNはツール・ゲーム・システム共通となり、式・パス引数も直接起動と同じ検証・起動処理を使用します。従来の直接コマンドとMDの別名は維持しています。

標準プログラムも個別のprogram.jsonから登録します。ID、コード、別名、分類、版、アイコン、引数、本体の入口を共通形式へ移し、JSONの検証と重複検査を追加しました。外部Webパッケージ用のJSON Schema、単独で動くHTMLの雛形、設計書[PROGRAMS.md](PROGRAMS.md)を追加しています。外部パッケージの取り込み・実行は今後の段階で、現在の標準UI本体はbuiltinアダプターで動かします。

ASCIIペイントの全消去・サイズ変更・ファイル再読込の確認を、ブラウザーのconfirmからDOS風のアプリ内ダイアログへ変更しました。選択中の配色に従い、初期フォーカスはキャンセル、Esc・×で取消、確認後は元の操作へフォーカスを戻します。確認中のCtrl+Tabはタブを変更しません。ペイント関連の操作テスト2件で、取消時の描画保持、消去とUndo、サイズ変更、再読込、キーボード操作、375px幅とグリーン配色を確認済みです。

バージョンを0.4.0へ更新し、8つの内蔵アプリと共通のDOS風ウィンドウを追加しました。すべて起動コマンドとタブ右端の「＋ プログラム」から起動でき、既存のタブ切替・閉じる操作へ統合しています。コマンド数は39です。

| アプリ | コマンド | 実装範囲 |
| --- | --- | --- |
| ファイルマネージャー | FILES | パス移動、絞り込み、作成、コピー、名前変更、移動、削除確認、UNDO、Vim・Markdown・ペイント・BAT連携 |
| ToDo | TODO | 期限・優先度、編集、完了、フィルター、削除、自動保存 |
| カレンダー | CALENDAR | 月表示、矢印で日付移動、予定の追加・編集・削除、ToDo期限の表示、自動保存 |
| 電卓 | CALC | 安全な式解析、演算優先順位、累乗、余り、メモリー、履歴 |
| ASCIIペイント | PAINT | クリック・ドラッグ・キーボード描画、テキスト編集、消しゴム、Undo、サイズ変更、保存・下書き復元 |
| Markdownビューア | MARKDOWN | 見出し、強調、コード、リスト、引用、表、安全なリンク、ソース表示、Vim連携 |
| システム情報 | SYSINFO | 実行環境、仮想ファイル数・本文サイズ、タブ数、個人データ件数 |
| 設定 | SETTINGS | 3配色、文字サイズ、週始まり、自動スクロール、即時反映と自動保存 |

`PROGRAMS`（別名`APPS`）でプログラム一覧を開きます。共通カタログを起動・タブラベル・メニューで共有し、HELP・サイドバー・補完は既存のコマンド定義を使用します。CALCの式にJavaScriptを実行する機構はなく、MarkdownのHTML・危険なURLも実行しません。既存のMD（MKDIRの別名）は維持しています。

ToDo・予定・設定・ペイント下書きはローカルストレージに保存します。ペイントは編集直後に閉じる場合にも最新の有効な下書きを書き出します。これらは仮想ドライブのEXPORT / IMPORTには含めません。アプリの詳しい上限・保存範囲はREADMEを参照してください。

検証結果：Vitest **169件成功**（11ファイル）、Playwright **23件成功**（3ファイル）、TypeScript型チェックと本番Webビルド成功。共通マニフェストの検証・重複拒否、全プログラムのRUN起動、引数とBATの保持、分類・番号・矢印選択、VIM・GUESSを含む共通メニューを確認しました。Edgeで8アプリのコマンド・メニュー起動、Ctrl+Tab・矢印・Esc、ファイル操作とVim連携、Vimの行操作・Undo/Redo・検索・行番号切替・ファイル切替、ToDoと予定の復元、式計算、ペイント保存と下書き復元、Markdownの安全な表示と文書保持、設定の永続化を確認しました。375px幅でも各アプリの閉じるボタンと起動メニューを確認し、DOS・モノクロ配色の画面を目視確認しています。

Windows release exeをビルドし、実際のTauri / WebView2で8アプリ、共通プログラム一覧・分類・RUN、タブ起動メニュー、Ctrl+W終了、VER/CLSのIMEキー入力、シェル・BAT・ゲームの起動を確認済みです。新しい独立プロファイルでも成功しています。確認スクリプトはWebView2の初回表示と起動後の入力フォーカスを待ってからキー操作を送ります。生成先は`src-tauri/target/release/retrodos.exe`です。Rustのlinker warningはライブラリ生成の通知で、ビルド・実起動は成功しています。

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
