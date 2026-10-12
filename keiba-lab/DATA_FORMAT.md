# KEIBA LAB データ形式と検証上の注意

> このアプリはブラウザー内で動作する競馬予想の**研究環境**です。標準の12レースは、馬も指数も結果も全て合成の**架空データ**です。実際の競走馬情報、公式結果、当日オッズを自動取得する機能はありません。

## 1. JSON形式（推奨）

JSONはレース1件、複数レースの配列、または `{"races":[...]}` を取り込みます。レースには次の項目が使えます。

| キー | 例 | 説明 |
|---|---|---|
| `id` | `"20261018-TOKYO-11"` | レースごとの固有ID。結果を後で取り込むときも変えない |
| `date` | `"2026-10-18"` | 開催日。ISO日付 |
| `name` | `"架空の秋特別"` | レース名 |
| `course` | `"東京"` | 競馬場 |
| `surface` | `"芝"` | 芝・ダートなど |
| `distance` | `1600` | 距離（m） |
| `going` | `"良"` | 馬場 |
| `weather` | `"晴"` | 天候（任意） |
| `pace` | `"ハイ"` | 予想ペース: ハイ・ミドル・スロー |
| `asOf` | `"2026-10-18T10:00:00+09:00"` | 特徴量・オッズ取得時点。必ず発走前に固定する |
| `classGrade` | `3` | 任意: 過去走と同じ尺度で定義したクラス水準 |
| `trackBias` | `{"inside":5,"outside":-5}` | 任意: 内外の観測バイアス -30〜30 |
| `source` | `"自身で管理する資料"` | 出典やライセンス情報（任意） |
| `horses` | 配列 | 2〜30頭。最低2頭必要 |
| `result` | `null` または馬IDの配列 | 未確定は `null`。確定後は**全馬の着順**を1着から並べたID配列 |

馬の必須フィールドは `id`, `number`, `name`, `factors` です。その他に `age`, `sex`, `draw`, `weight`, `jockey`, `trainer`, `sire`, `damSire`, `style` (逃げ/先行/差し/追込), `form`, `lastRunDays`, `odds` が利用できます。オッズは発走前のスナップショットであることが重要です。

### JSONの最小例

```json
{
  "id":"test-20261018-11",
  "date":"2026-10-18",
  "name":"練習レース（架空）",
  "course":"東京",
  "surface":"芝",
  "distance":1600,
  "going":"良",
  "pace":"ハイ",
  "asOf":"2026-10-18T12:00:00+09:00",
  "source":"架空の練習データ",
  "horses":[
    {"id":"a","number":1,"name":"架空馬A","draw":1,"odds":2.8,"style":"逃げ","factors":{"form":78,"distance":72,"bloodline":66}},
    {"id":"b","number":2,"name":"架空馬B","draw":1,"odds":4.5,"style":"差し","factors":{"form":72,"distance":75,"bloodline":58}},
    {"id":"c","number":3,"name":"架空馬C","draw":2,"odds":5.8,"style":"追込","factors":{"form":65,"distance":68,"bloodline":76}}
  ],
  "result":null
}
```

結果が確定したら、同じ `id` と同じ馬IDで `"result":["b","c","a"]` を指定して再度インポートします。事前に保存した予想の勝率・重み・オッズは更新されず、後で追加された結果に照らして採点されます。

## 2. 0〜100の評価値

`factors` に指定できるキー:

- `form` 近走・能力
- `pace` 想定ペースと脚質
- `course` 競馬場・コース適性
- `distance` 距離
- `going` 馬場
- `bloodline` 血統
- `jockey` 騎手
- `trainer` 厩舎
- `training` 調教
- `gate` 枠・馬番
- `weight` 斤量
- `class` クラス・相手関係
- `layoff` レース間隔
- `market` オッズ市場評価（**自動計算**、入力不要）

50が中立値で、高いほど好条件という仮説です。スコアは**実際の公式能力指数ではなく、アプリが学習で推定した保証付きの値でもありません**。データが欠けた場合は中立値50を使い、画面に欠損数を表示します。

## 3. 生の過去走データを使う

JSONで各馬に `pastRuns` を渡すと、**レース開催より前**の過去走（最大20走）から、近走・コース・距離・馬場・クラス・レース間隔の一部を自動計算します。入力した `factors` がある場合は、その値が優先されます。

```json
"pastRuns": [
  {
    "date":"2026-09-20",
    "course":"中山",
    "surface":"芝",
    "distance":1600,
    "going":"良",
    "finish":2,
    "fieldSize":14,
    "classGrade":3,
    "speedIndex":73
  },
  {
    "date":"2026-08-15",
    "course":"東京",
    "surface":"芝",
    "distance":1600,
    "going":"稍重",
    "finish":1,
    "fieldSize":12,
    "classGrade":4
  }
]
```

他に、馬の `jockeyStats`、`trainerStats`、`pedigreeStats` に `{"starts":50,"wins":8}` の形式で**事前時点の**勝率集計を追加できます。`trainingScore` に0〜100を入れると調教スコアに使います。`trackBias` はレース側の `inside` と `outside` を使います。

**計算の限界:** 着順を出走頭数で正規化し、標本が少ない場合は50に近づける簡易ルールです。クラスや相手関係の完全な補正、ラップ・不利・展開の因果分析、血統の遺伝的予測を実装したわけではありません。すでに発表された未来の結果は過去走に混ぜません。実戦には品質の確認と学習・検証が必要です。

## 4. CSV形式

アプリの「CSVテンプレート」をダウンロードできます。UTF-8（BOM可）、1行=馬1頭、同じ `race_id` に属する馬を複数行で記載します。必須列は `race_id,date,horse_id,horse_name,number` です。

代表的な列: `race_id,date,race_name,course,surface,distance,going,weather,pace,as_of,class_grade,track_bias_inside,track_bias_outside,horse_id,number,horse_name,age,sex,draw,weight,jockey,trainer,sire,dam_sire,style,form_text,last_run_days,odds,result_position`。

評価点は衝突を避けるため **`score_form`, `score_pace`, `score_course`, `score_distance`, `score_going`, `score_bloodline`, `score_jockey`, `score_trainer`, `score_training`, `score_gate`, `score_weight`, `score_class`, `score_layoff`** の独立列を使用します。どの評価点も0〜100です。CSVテンプレートには競馬場等と同名の列はありません。

任意列: `past_runs_json`, `jockey_stats_json`, `trainer_stats_json`, `pedigree_stats_json`, `training_score`。JSONを入れる場合はCSVセルとして適切に二重引用符エスケープしてください。

結果確定前は `result_position` を空欄、確定後は全馬に1,2,3...と一意な着順を指定します（同着・競走中止等の扱いは現バージョンでは未対応）。

## 5. 予測と検証の計算方法

1. 有効な指標を選び、重みを合計で正規化します。
2. 各馬の中心化スコアを `sum((score-50)*weight)/sum(weight)` で計算します。
3. スコアを温度8で割ってsoftmaxを適用し、全馬で合計100%の「モデル内勝率」を得ます。
4. ガンベル乱数を使ったPlackett–Luce相当の順位サンプリングで、3着以内の割合と期待着順を近似します。
5. 過去レースの検証では、1着的中率、勝った馬に対する負の対数尤度（Log Loss）、全頭についてのBrier、各レースの予測1位馬へ仮に100円購入したとした場合の回収率を計算します。

数式や温度8、各重みは**研究用のヒューリスティック**です。実際のレースでの予測精度、勝率校正、統計的な有意性は確認していません。仮想オッズは本番の最終オッズや実購入で確約された価格ではありません。単純な馬券回収試算は、賭式・控除・オッズ変動・購入時刻・購入上限・税務を再現しません。

## 6. データリークを防ぐ

- レースAの出走時点より後に得た成績・騎手集計・産駒成績・当日結果を特徴量に使わない
- 予想を保存してから結果を確認する
- 評価期間に合わせて重みを最適化し、同じ期間を成績評価に使う「二重使用」をしない
- 実際の馬券購入履歴と、架空レースや結果判明後の練習を混ぜない
- デモ12レースは人工的に作られており、実際の競馬でのモデル適用性は測定できない

## 7. データの入手とライセンス

JRA-VAN Data Lab.は公式レース情報・調教・競走馬情報などのデータを提供しています。ただし通常契約のデータを公開アプリから第三者に再配布することは許されない場合があります。このGitHub Pagesアプリは**公式データを埋め込まず、ブラウザー内に本人が持ち込むデータをローカル保存**する設計です。元データの出典・権利・利用可能な範囲を必ず確認してください。

参照:
- https://jra-van.jp/info/rule.html
- https://developer.jra-van.jp/t/topic/899
- https://jra-van.jp/dlb/sdv/sdk.html

## 8. 保存と保護

すべての取込ファイルはブラウザー内で処理し、レースと予想記録は`localStorage`に保存します。ブラウザーのデータ削除・端末変更で失われるため「データを保存」からJSONバックアップを取ってください。GitHub上にはユーザーが取り込んだ実データを保存しません。