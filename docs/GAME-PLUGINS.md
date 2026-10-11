# RetroDOSゲームプラグイン

`retrodos.game`は、ゲームを1つの`.RGAME.JSON`ファイルとして追加する形式です。用途に合わせて2種類の実行形式を選べます。

| 形式 | 用途 | 内容 |
| --- | --- | --- |
| v1 分岐型 | テキストアドベンチャー、ノベル、クイズ | 場面と選択肢を宣言型JSONで定義。スクリプトを実行しない |
| v2 Webゲーム | アクション、パズル、カード、シューティングなど | HTML・CSS・JavaScriptをJSONへ格納し、隔離フレームで実行 |

## 作成と起動

AIと相談して作る場合は[ゲーム作成相談プロンプト](GAME-CREATION-PROMPT.md)を利用できます。RetroDOS内では`GAMEPROMPT`、またはゲーム一覧の「ゲーム作成を相談」でクリップボードへコピーできます。プロンプトはジャンル、操作、UIデザイン、出力形式を決めてからファイルを生成します。

1. 生成されたJSONを`MYGAME.RGAME.JSON`として保存します。
2. RetroDOSのVIMで作る場合は、`VIM C:\GAMES\MYGAME.RGAME.JSON`で保存します。
3. 仮想ドライブのファイルは`GAMEIMPORT C:\GAMES\MYGAME.RGAME.JSON`で追加します。実PCのファイルはゲーム一覧の「ゲーム追加」から選べます。
4. `RUN <code>`、ゲーム一覧、または「＋ プログラム」から起動します。

仮想ドライブには次のサンプルがあります。

- `C:\GAMES\EXAMPLE.RGAME.JSON`：v1の分岐型ゲーム。`RUN CAVE`で起動
- `C:\GAMES\PIXEL.RGAME.JSON`：v2のキーボードゲーム。`RUN PIXEL`で起動

## 共通フィールド

| フィールド | 内容 |
| --- | --- |
| `format` | `retrodos.game`固定 |
| `manifestVersion` | 分岐型は`1`、Webゲームは`2` |
| `id` | 小文字で始まる一意のID |
| `code` | `RUN`で使う大文字コード |
| `name` / `description` | 一覧とゲーム画面に表示する名前・説明 |
| `version` / `author` | ゲームの版と作者 |
| `achievements` | 最大50件の実績。不要なら空配列 |

1ファイルは256KB、保存は最大20本・合計1MBです。同じ`id`の取り込みは更新として扱い、標準プログラムと同じ`code`は登録できません。

## v1 分岐型

v1は`start`と`scenes`を持ちます。各場面には文章と最大9個の選択肢を置けます。選択肢では移動先、得点、アイテム取得、必要アイテムを定義できます。終了場面には`ending: "win"`または`ending: "lose"`を指定します。

既存の形式と完全な互換性があります。[HELLO CAVEの例](../examples/games/hello-cave/game.json)を参照してください。

## v2 Webゲーム

v2は`runtime: "web"`、表示領域を決める`display`、ゲーム本体の`source`を持ちます。

```json
{
  "format": "retrodos.game",
  "manifestVersion": 2,
  "runtime": "web",
  "id": "my-game",
  "code": "MYGAME",
  "name": "MY GAME",
  "description": "短い説明",
  "version": "1.0.0",
  "author": "Your Name",
  "display": {
    "width": 640,
    "height": 400,
    "scale": "pixel",
    "background": "#000000"
  },
  "source": {
    "html": "<main>...</main>",
    "css": "body{...}",
    "javascript": "RetroDOSGame.ready(); ..."
  },
  "achievements": []
}
```

`display.scale`は、通常のレスポンシブ表示なら`fit`、ドット絵なら`pixel`を選びます。HTMLはbody内の要素だけ、CSSとJavaScriptはそれぞれの文字列へ入れます。すべてJSON文字列として改行や引用符をエスケープしてください。[PIXEL CATCHの例](../examples/games/pixel-catch/game.json)はキーボード操作、得点、終了、実績を含みます。

### ホストAPI

v2のゲームは、次のAPIでRetroDOSへ状態を伝えます。

| API | 用途 |
| --- | --- |
| `RetroDOSGame.ready()` | 初期化完了を通知 |
| `RetroDOSGame.setScore(number)` | 画面上部の現在得点を更新 |
| `RetroDOSGame.finish({ score, won, achievements })` | 1プレイの終了、スコア・勝敗・実績を保存 |
| `RetroDOSGame.exit()` | ゲームを閉じてターミナルへ戻る |

`achievements`にはマニフェストで定義した実績IDを配列で渡します。未知のIDは保存されません。`finish`は1プレイにつき最初の1回だけ記録されます。

### 実行領域

Webゲームは`iframe sandbox="allow-scripts"`の隔離領域で動きます。RetroDOS本体のDOM、Cookie、localStorage、仮想ドライブには直接アクセスできません。ゲーム側のContent Security Policyは外部通信、外部フレーム、外部画像・音声、外部ライブラリを拒否します。必要な画像や音声は容量上限の範囲でdata URLにできます。

ゲームのスクリプトは実行されるため、内容を確認できない配布元のファイルは取り込まないでください。隔離領域でも、無限ループのような処理はゲーム画面の応答を止める可能性があります。

完全なフィールド制約は[JSON Schema](game.schema.json)を参照してください。
