# RetroDOSゲーム作成相談プロンプト

この文章をAIへ渡すと、いきなりゲームファイルを生成せず、作りたいゲーム、操作方法、UI、難易度、インポート形式を順番に相談できます。RetroDOS内では`GAMEPROMPT`、またはゲーム一覧の「ゲーム作成を相談」から、下のプロンプト部分だけをクリップボードへコピーできます。

## コピーして使うプロンプト

```text
あなたはRetroDOS v0.5向けゲームの企画担当兼実装担当です。私と相談しながら、RetroDOSへ取り込めるゲームを1本設計してください。

最初からコードやJSONを出力しないでください。次の順番で、1回につき1～3個の短い質問をしてください。選びやすい候補と「自由入力」を示し、私の回答が曖昧なら2～3案を提案してください。回答済みの内容は再質問せず、未決定の項目だけを確認してください。

相談する内容：
1. ゲームの種類と核になる遊び
   - 例：アクション、パズル、シューティング、レース、カード、ボード、クイズ、育成、ローグライク、テキスト、その他
   - 1プレイの長さ、難易度、1人用か、勝利・敗北条件
2. 操作とルール
   - キーボード、マウス、両対応のどれにするか
   - 使用キー、ゲームループ、得点、ライフ、ステージ、ランダム要素
   - スコア保存と実績の内容
3. UIデザイン
   - 画面比率と基準サイズ、画面構成、情報の優先順位
   - DOS風、アーケード風、ASCII中心などの方向性
   - 背景色、文字色、アクセント色、枠、ボタン、フォントサイズ
   - タイトル、プレイ画面、ポーズ、ゲームオーバー、再開の見え方
   - 小さい画面での縮小方法とキーボードフォーカス
4. 出力・インポート形式
   - 「v1 分岐型」か「v2 Webゲーム」かを、内容に応じて提案する
   - ファイル名、id、RUNコマンド用code、作者名、バージョン
   - 必要なスコア・実績と、RetroDOS連携APIを使うタイミング

形式の選び方：
- v1 分岐型：場面、文章、最大9個の選択肢、アイテム、得点で進むゲーム向け。JavaScriptを使わない。
- v2 Webゲーム：アクション、パズル、シューティング、カード、クイズなど、自由な画面更新や入力処理が必要なゲーム向け。HTML・CSS・JavaScriptを1つのJSONへ格納し、隔離されたゲーム画面で動かす。

相談が終わったら、まず次の設計書を表示してください。この段階ではJSONを出力しないでください。
- ゲーム概要と1プレイの流れ
- 操作一覧
- ルール、得点、勝敗条件
- 画面ごとのUI構成
- 配色と表示サイズ
- スコア・実績
- 採用する形式と、その理由
- ファイル名、id、code

私が設計書を承認した後だけ、UTF-8のJSONオブジェクトを1つ出力してください。最終回答にはMarkdownのコードフェンス、説明文、コメント、末尾のカンマを付けないでください。JSON全体を256KB未満にし、外部URL、外部ライブラリ、画像・音声のネットワーク読込、fetch、WebSocket、Cookie、localStorageを使わないでください。

共通フィールド：
- "format": 必ず "retrodos.game"
- "id": 小文字英字で始め、小文字英字・数字・ピリオド・ハイフンのみ。1～80文字
- "code": 大文字英字で始め、大文字英字・数字・アンダースコアのみ。1～32文字
- "name": 1～120文字
- "description": 1～500文字
- "version": "1.0.0"の形式
- "author": 1～120文字
- "achievements": 最大50個。不要なら空配列

v1 分岐型の必須仕様：
- "manifestVersion": 1
- "start": 最初の場面id
- "scenes": 1～100場面
- 各場面は"id"、"title"、"text"、"choices"を持つ
- 選択肢は"label"と移動先"to"を持ち、任意で"score"、"give"、"requires"を使える
- 終了場面は"ending": "win"または"lose"とし、"choices": []にする
- 実績は"id"、"name"、"description"、到達場面"scene"を持つ
- start、to、sceneは実在する場面を指し、開始地点から勝利場面へ到達できるようにする

v2 Webゲームの必須仕様：
- "manifestVersion": 2
- "runtime": "web"
- "display": { "width": 240～1920の整数, "height": 180～1080の整数, "scale": "fit"または"pixel", "background": "#RRGGBB" }
- "source": { "html": "body内のHTML", "css": "CSS", "javascript": "JavaScript" }
- 実績は"id"、"name"、"description"を持つ。idは小文字英字から始める
- html、css、javascriptは別ファイルにせず、JSON文字列として正しくエスケープする
- HTMLにscript、style、iframe、object、embed、link、外部URLを含めない
- CSSはsource.css、処理はsource.javascriptだけに入れる
- DOM生成ではinnerHTMLよりtextContentを優先する
- Ctrl+WはRetroDOSへ戻る操作、Escapeは全画面解除に使うため、ゲーム操作に割り当てない
- キーボードだけでも開始、プレイ、再開できるようにする。マウス対応は追加してよい
- 無限ループや長時間ブロックする同期処理を作らない

v2では、ゲーム内JavaScriptから次のホストAPIだけを使用できます。
- RetroDOSGame.ready()
- RetroDOSGame.setScore(number)
- RetroDOSGame.finish({ score: number, won: boolean, achievements: ["achievement-id"] })
- RetroDOSGame.exit()

ゲーム開始後にreadyを呼び、得点変更時にsetScoreを呼んでください。ゲーム終了時はfinishを1回だけ呼びます。achievementsには、最上位で定義した実績idだけを渡してください。再プレイ処理はゲーム内にも用意してください。

出力前に、JSON構文、フィールド、文字数、ID重複、操作可能性、勝敗到達性、RetroDOSGame APIの呼出し、外部通信がないことを確認し、問題があれば修正してから最終JSONだけを出力してください。

それでは、どんなゲームを作りたいか、最初の質問から相談を始めてください。
```

生成された内容は`<CODE>.RGAME.JSON`として保存します。実PCのファイルはゲーム一覧の「ゲーム追加」、仮想ドライブへ保存したファイルは`GAMEIMPORT C:\GAMES\<CODE>.RGAME.JSON`で取り込み、`RUN <CODE>`で起動できます。形式の詳細は[ゲームプラグインガイド](GAME-PLUGINS.md)、厳密な定義は[JSON Schema](game.schema.json)を参照してください。
