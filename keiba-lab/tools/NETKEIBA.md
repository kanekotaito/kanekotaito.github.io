# netkeibaの実データを取り込む（個人研究用）

netkeibaのデータを公開リポジトリへ再配布することはしません。規約・権利を確認した利用者が、Windows等の手元のパソコンで1レースずつ取り込む方式です。サーバー側での自動巡回・自動公開は実装していません。

参照:
- 利用規約 https://rsp.netkeiba.com/info/kiyaku.html?rf=footer
- スクレイピングに関する公式FAQ https://support.keiba.netkeiba.com/hc/ja/articles/39720493823129

利用規約第14条には、取得した情報を不特定多数が知ることのできる状態に置くことについて制限があります。大量アクセスで通信制限される場合もあります。利用許諾が不明な場合は運営に確認してください。

## Windowsセットアップ

GitHubリポジトリをZIPで取得して展開するか、GitHub Desktopからcloneします。Python 3.11以上をインストールします。PowerShellでリポジトリのフォルダに移動し、次のコマンドで依存関係を追加します。

    python -m pip install -r keiba-lab/tools/requirements.txt

## 方法A：保存済みHTMLから変換（ネットアクセスなし）

netkeibaの出馬表ページを保存でき、規約に沿って手元で使用できる場合に使います。race-idとrace-dateは、実際のURLと開催日から確認して正しく入力します。

    python keiba-lab/tools/netkeiba_import.py --race-id 202505010701 --race-date 2025-02-22 --entry-html shutuba.html --out my-race.json

結果HTMLもあるときは --result-html result.html を追加します。馬の個別戦績HTMLをフォルダーに馬ID.htmlという名前で保存した場合は --horse-html-dir horse_pages を追加します。

## 方法B：単一レースを明示的に取得

規約や許諾条件に照らして、取得が認められることを確認済みの場合のみ実行します。

    python keiba-lab/tools/netkeiba_import.py --race-id 202505010701 --race-date 2025-02-22 --allow-network --horse-count 2 --out my-race.json

--allow-network の明示的な指定が必須です。自動巡回なし。robots.txt確認。アクセス間隔は7秒以上、リダイレクト禁止、通信失敗や403/429等で即停止、再試行なし。馬の個別戦績ページを何頭分取得するかは --horse-count 0〜18 で指定します（初期値0）。結果を別に取得する場合は --with-results を付けます。ログイン、有料記事、映像、調教映像、コメント、アクセス制限の回避は実装しません。

## インポート

ローカルで生成した my-race.json を KEIBA LAB https://kanekotaito.github.io/keiba-lab/ の「データ管理」→「JSON/CSVを読み込む」で選択します。アプリのブラウザー内にのみ保存します。

実際の馬名、性齢、枠・馬番、斤量、騎手、厩舎、HTMLに存在する場合のオッズ、芝ダート、距離、馬場、結果、個別馬の過去走を変換します。血統、調教、脚質、市場オッズなどが取得できない場合はnull、または欠損として残します。誤って架空データを紛れ込ませません。

HTML上のオッズはJavaScript更新の場合、データが空のことがあります。過去の開催レースについて現在取得するデータは発走前のスナップショットではありません。

アプリ側は実データで出走全馬の予測に必要な特徴量が不足した場合、予想を保留します。予測エンジンの確率校正、血統・調教の許諾データ連携は今後の課題です。実データを取り込んだだけで予想が正しくなるわけではありません。

## テスト

    python -m unittest discover -s keiba-lab/tests -p test_netkeiba.py

テストのHTMLは人工的に作成したもので、実際のnetkeibaサイトでパーサーが動いたことは証明しません。
