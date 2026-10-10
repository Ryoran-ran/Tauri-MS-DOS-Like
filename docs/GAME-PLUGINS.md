# RetroDOSゲームプラグイン v1

`retrodos.game`は、場面と選択肢で構成する宣言型テキストアドベンチャー形式です。JavaScript、HTML、外部URLを含めず、取り込んだ文字列はテキストとして表示します。

## 作成と起動

AIにゲームファイルを作ってもらう場合は、[作成プロンプト](GAME-CREATION-PROMPT.md)を利用できます。RetroDOS内では`GAMEPROMPT`、またはゲーム一覧の「作成プロンプトをコピー」でクリップボードにコピーできます。

1. [サンプル](../examples/games/hello-cave/game.json)をコピーして、`id`、`code`、場面を編集します。
2. RetroDOSのVIMで作る場合は、`VIM C:\GAMES\MYGAME.JSON`でJSONを保存します。
3. `GAMEIMPORT C:\GAMES\MYGAME.JSON`を実行します。実PCのJSONはゲーム一覧の「ゲーム追加」から選べます。
4. `RUN <code>`、ゲーム一覧、または「＋ プログラム」から起動します。

仮想ドライブには最初から`C:\GAMES\EXAMPLE.RGAME.JSON`があり、`GAMEIMPORT C:\GAMES\EXAMPLE.RGAME.JSON`ですぐ試せます。取り込んだ定義、ハイスコア、プレイ回数、実績はブラウザーまたはデスクトップアプリの保存領域へ記録します。

## 主なフィールド

| フィールド | 内容 |
| --- | --- |
| `id` | 小文字で始まる一意のID |
| `code` | `RUN`で使う大文字コード |
| `start` | 最初の場面ID |
| `scenes` | 最大100場面。各場面は`id`、`title`、`text`、`choices`を持つ |
| `choices[].to` | 移動先の場面ID |
| `choices[].score` | 選択時の加点または減点 |
| `choices[].give` | アイテムを取得 |
| `choices[].requires` | 指定アイテムがあるときだけ選択可能 |
| `ending` | `win`または`lose`。指定場面でゲームを終了 |
| `achievements` | 指定した`scene`を訪れて終了したとき解除 |

完全な制約は[JSON Schema](game.schema.json)を参照してください。1ファイルは256KB、保存は最大20本・合計1MBです。同じ`id`の取り込みは更新として扱い、標準プログラムと同じ`code`は登録できません。

このv1形式は分岐型ゲーム専用です。任意コードを実行するWebゲームやネイティブゲームは読み込みません。
