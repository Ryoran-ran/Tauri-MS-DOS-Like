# RetroDOS v0.1

MS-DOSのコマンド操作と、現代的なデスクトップUIを組み合わせた仮想ワークスペースです。React + TypeScriptの機能はブラウザーだけでも動作し、Tauri v2がWindowsのデスクトップ実行基盤になります。

![RetroDOSのターミナル](docs/screenshots/terminal.png)

## 起動

Node.js 22.12以降とnpmが必要です。依存関係は`package-lock.json`に固定しています。

```powershell
npm ci
npm run dev
```

ブラウザーで http://127.0.0.1:1420 を開きます。終了は開発サーバーのターミナルでCtrl+Cです。

### Windowsデスクトップ版

RustのMSVCツールチェーン、Microsoft C++ Build Tools、Microsoft Edge WebView2が必要です。[Tauri公式の前提条件](https://v2.tauri.app/start/prerequisites/)を参照してください。

```powershell
npm run desktop:dev
```

Viteとネイティブアプリが同時に起動します。先に`npm run dev`を実行している場合は、その開発サーバーを終了してください。1420番ポートを共有するためです。

```powershell
npm run desktop:build
```

本番フロントエンドとWindows実行ファイルをビルドします。生成先は`src-tauri/target/release/retrodos.exe`です。このexeはWebアセットを内蔵しており、Viteを起動せずに実行できます。WebView2 Runtimeは必要です。OS標準のタイトルバーで移動、最小化、最大化、終了できます。

インストーラーが必要な場合は`npm run tauri -- build`でNSISパッケージを生成できます。v0.1の標準ビルドは単体exeの生成です。

## 操作

| 操作 | キー |
| --- | --- |
| コマンド実行 | Enter |
| 入力履歴の前／次へ | ↑ / ↓ |
| コマンド名・別名の補完 | Tab |
| 複数補完候補の選択 | Tab / Shift+Tab / ↑ / ↓ |
| 補完候補を入力欄へ挿入 | Enter（実行は次のEnter） |
| 補完候補を閉じる | Esc |
| コマンド検索へフォーカス | Ctrl+K |
| サイドバーの開閉 | Ctrl+B |
| ターミナルの表示をクリア | Ctrl+L |
| 現在の画面の入力欄へフォーカス | Space（入力欄・ボタン以外から） |
| ゲームをコード・番号で起動 | `GUESS` / `1` を入力してEnter |
| ゲームライブラリ内の選択 | ↑ / ↓ / ← / → |
| 選択中のゲームを起動 | Enter |
| ゲームライブラリ／ゲームから戻る | Esc |

サイドバーはコマンド名、別名、日本語の表示名・説明で即時検索できます。コマンドを選ぶと使用方法、使用例、引数定義を表示します。「入力欄に挿入」はコマンドを入力欄にセットするだけで、実行にはEnterが必要です。狭い画面ではサイドバーがオーバーレイになり、挿入時に閉じます。

過去ログを読んでいるときは、新しい出力による強制スクロールを行いません。「新しい出力」で最新位置へ戻れます。CLSは表示履歴だけを消し、↑ / ↓の入力履歴は保持します。

## コマンド

| コマンド | 使用方法・例 | 機能 |
| --- | --- | --- |
| HELP | `HELP` / `HELP CD` | コマンド一覧・詳細 |
| CLS | `CLS` | ターミナルの表示をクリア |
| VER | `VER` | バージョン |
| ECHO | `ECHO "こんにちは 世界"` | テキスト表示 |
| DIR | `DIR` / `DIR C:\DOCS` | 仮想ディレクトリの一覧 |
| CD | `CD DOCS` / `CD ..` / `CD C:\` | 仮想ディレクトリ移動 |
| TYPE | `TYPE README.TXT` | 仮想テキストファイルの表示 |
| GAMES | `GAMES` | ゲームライブラリへ |
| RUN | `RUN GUESS` | 内蔵ゲームを起動 |
| DATE | `DATE` | 現在の日付（JST） |
| TIME | `TIME` | 現在の時刻（JST） |

別名は`?`（HELP）、`CLEAR`（CLS）、`VERSION`（VER）、`CHDIR`（CD）です。コマンド名とパスは大文字・小文字を区別しません。引用符内のテキストと空白、DOSパスのバックスラッシュはパーサーで保持します。空白を含むパスは`TYPE "C:\DOCS\WELCOME NOTE.TXT"`のように囲みます。

仮想ドライブはC:のみです。絶対パス`C:\DOCS`、ルート基準の`\DOCS`、相対パス`DOCS`、`.`、`..`を使用できます。`C:DOCS`形式のドライブ相対パスは対応外としてエラーにします。

```text
C:\
├─ GAMES\
│  └─ GUESS.TXT
├─ DOCS\
│  ├─ COMMANDS.TXT
│  └─ WELCOME NOTE.TXT
├─ SYSTEM\
│  └─ VERSION.TXT
└─ README.TXT
```

GUESSは1〜100の数当てゲームです。ヒント、候補範囲、予想履歴、試行回数を表示します。正解後に再プレイでき、終了すると現在のディレクトリとターミナル出力を保持して戻ります。

## 検証

```powershell
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:desktop
```

- Vitest: コマンド解析、パス解決、ストレージ、代表的なコマンド実行、検索・補完、ゲームの判定。
- Playwright: コマンド、検索・詳細・挿入、履歴・補完、GUESSの正解と再プレイ、スクロール、リサイズ。Microsoft Edgeを使用します。
- `test:desktop`: ビルド済みexeを起動し、WebView2内でコマンド・ゲーム・終了後のフォーカスを確認します。検証中だけローカルの一時ポートでWebView2のデバッグ機能を有効化し、終了時にアプリを閉じます。通常起動時には有効にしません。
- `capture:preview`: 開発サーバー起動中に、5画面のスクリーンショットを`docs/screenshots/`へ保存します。

フロントエンドとTauriのビルドはどちらも`dist/`を更新するため、同時に実行せず順番に実行してください。

実施結果と変更ファイルは[実装・検証記録](docs/IMPLEMENTATION.md)に記載しています。

## 構成と拡張

```text
src/
├─ app/                     アプリ構成、バージョン、画面名
├─ components/
│  ├─ layout/               タイトルバー、ワークスペース切り替え
│  ├─ sidebar/              検索、一覧、使い方
│  ├─ terminal/             出力・入力・補完UI
│  └─ statusbar/            パス、実行状態、バージョン
├─ features/
│  ├─ commands/             型定義、登録、パーサー、実行
│  ├─ filesystem/           パス解決、ストレージ抽象、初期データ
│  └─ games/                メタデータ、コンポーネント登録、GUESS
├─ hooks/                   ワークスペース状態、入力、画面幅
├─ services/                実行プラットフォーム判定
├─ types/                   共通UI型
└─ styles/                  ダークテーマとレスポンシブレイアウト
src-tauri/                  Rustエントリ、Tauri設定、アイコン
tests/e2e/                  ブラウザー操作テスト
scripts/                    スクリーンショット・デスクトップ検証
```

コマンド追加は`features/commands/registry.ts`の`CommandDefinition`に登録します。HELP、サイドバー、検索、補完は同じ定義を使用します。executeは引数とコンテキストを受け取り、出力・エラー・状態変更を返します。

ゲーム追加は`features/games/catalog.ts`のメタデータと`registry.ts`のコンポーネントに登録します。ゲームコンポーネントは`onExit`でターミナルへ戻れます。ストレージ変更は`FileSystemStorage`の非同期`getNode`を実装するアダプターを作り、`VirtualFileSystem`へ注入します。

## v0.1の範囲

ファイルはメモリ上の読み取り専用データです。再起動するとディレクトリ、入力履歴、ゲーム状態は初期化されます。実PCのファイルアクセス、ファイル編集・永続化、外部DOSゲーム、DOSBox連携は未実装です。

Tauriにはファイル、シェル、プロセス実行用のプラグインやフロントエンド権限を付与していません。コマンド出力はReactのテキストとして描画し、HTMLを解釈しません。[Tauri公式のVite設定](https://v2.tauri.app/start/frontend/vite/)に合わせ、ブラウザーとデスクトップで同じUIとコマンドエンジンを使用しています。
#   T a u r i - M S - D O S - L i k e  
 