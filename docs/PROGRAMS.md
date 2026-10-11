# RetroDOS プログラム定義と外部パッケージ

ツール・ゲーム・システムをすべて「プログラム」として登録し、共通の一覧、起動メニュー、RUNコマンド、タブから利用します。分類は用途を表し、登録形式や起動経路を分けません。

## 現在実装している範囲

- 標準15プログラムを`src/features/programs/builtin/<module>/program.json`から登録。
- 起動メニュー、分類、番号選択、コード選択、RUN、別名、ウィンドウ名は共通カタログを使用。
- `PROGRAMS`（別名`APPS`）は全件、`GAMES`はゲームに絞った同じ一覧を開く。
- `RUN CALC "(12 + 8) * 3"`、`RUN VIM NOTE.TXT`、`RUN GUESS`など、共通の起動処理から実行。
- JSON定義の形式・必須項目・実行方式・IDとコードの重複を検証。

**外部パッケージの取り込み・インストール・実行は、まだ実装していません。** `web`定義は今後のための形式と雛形です。JSON検証が通ることと、実行できることは別です。

## 共通のprogram.json

標準と外部で同じマニフェスト形式を使います。JSON Schemaは[program.schema.json](program.schema.json)、実装側の検証は`src/features/programs/manifest.ts`です。

```json
{
  "format": "retrodos.program",
  "manifestVersion": 1,
  "id": "example.hello",
  "code": "HELLO",
  "name": "Hello RetroDOS",
  "description": "外部で作成するWebプログラム",
  "version": "1.0.0",
  "category": "tools",
  "icon": "editor",
  "order": 100,
  "aliases": [],
  "argument": { "kind": "none" },
  "entry": { "runtime": "web", "path": "index.html" }
}
```

| 項目 | 意味 |
| --- | --- |
| `format` / `manifestVersion` | 定義形式の識別子とバージョン。現在は上記の固定値 |
| `id` | 作者名などを含む一意のID。小文字英字から始め、英小文字・数字・`.`・`-`、最大80文字 |
| `code` | RUNや一覧で入力するコード。大文字英字から始め、英大文字・数字・`_`、最大32文字 |
| `name` / `description` | 表示名と説明。各1〜500文字 |
| `version` | プログラム本体のバージョン。`1.0.0`など。形式バージョンとは独立 |
| `category` | `tools` / `games` / `system` |
| `icon` | `folder`、`todo`、`calendar`、`calculator`、`paint`、`markdown`、`editor`、`target`、`snake`、`bomb`、`blocks`、`adventure`、`rogue`、`monitor`、`settings`。未知の名前は汎用アイコン |
| `order` | 分類内での表示順。小さい整数が先。同値はコード順 |
| `aliases` | 追加の入力コード。主コードと同じ文字規則。重複禁止、最大20個 |
| `argument.kind` | `none` / `directory` / `document` / `drawing` / `markdown` / `expression` |
| `argument.default` | 省略時の引数。ファイルパスなど。任意 |
| `entry` | ホストが読み込む本体の指定 |

同じカタログ内でID、主コード、別名が他のプログラムと重複する定義は拒否します。外部取り込み時にはシェルの既存コマンド名とも衝突しないように検証する予定です。OSの実行ファイルパスや任意のシェルコマンドを`entry`に指定する形式は設けません。

## 標準プログラムの本体

標準のUI本体は現在のReact実装を使用しています。例えば電卓の定義は次の入口を持ちます。

```json
"entry": { "runtime": "builtin", "module": "calculator" }
```

`builtin`は既存UIを動かすためのアダプターです。JSON内に関数やReactコンポーネントを埋め込みません。アプリ／ゲーム別のカタログには独立した定義を持たせず、共通マニフェストから表示用のデータを生成します。

## 外部プログラムの雛形

外部プログラムはHTML・CSS・JavaScriptのファイルを含むパッケージとして作る方針です。[動作する雛形](../examples/programs/hello/index.html)と[その定義](../examples/programs/hello/program.json)を用意しています。HTMLをブラウザーで開けば単独で確認できます。

```text
hello/
├── program.json
├── index.html
├── style.css       必要な場合
├── main.js         必要な場合
└── assets/         必要な場合
```

`entry.path`はパッケージ内の相対HTMLパスです。`../`、絶対パス、URL、空のパス要素は許可しません。標準プログラムも将来はこの`web`形式で梱包し、外部プログラムと同じホストで実行できる形を目指します。現在の`builtin`形式から移行しても、ID・コード・分類などの登録情報を引き継げます。

## 次の実装段階

1. パッケージの取込、容量上限、ID・コード衝突チェック、インストール一覧、更新・削除。
2. 外部HTMLを独立した実行領域で開くWebプログラムホスト。タブ、終了、キーボード操作の共通化。
3. 仮想ファイルの読み書き、プログラムごとの保存、配色、起動引数を渡すバージョン付きAPI。
4. 標準プログラムを同じAPIとWebパッケージ形式へ順次移行。

外部コードにRetroDOS本体のDOMや保存領域への直接アクセスを与えず、必要な操作はホストAPIを通す設計とします。パッケージ形式、実行ホスト、APIを一緒に確定してから取り込み機能を公開します。

ゲームは、単一ファイルの`retrodos.game`形式で先行して取り込み・実行できます。v1は任意コードを含まない分岐型、v2はHTML・CSS・JavaScriptを隔離フレームで動かすWebゲームです。汎用プログラムの複数ファイルパッケージとは保存形式とホストAPIが異なります。仕様は[ゲームプラグインガイド](GAME-PLUGINS.md)を参照してください。
