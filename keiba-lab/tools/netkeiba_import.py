#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""netkeiba → KEIBA LAB personal/local importer.

One requested JRA race only; no bulk crawling, login, bypass, publication, or
silent retries. Network mode requires explicit opt-in and permission to use data.
Local HTML mode works without requesting netkeiba at all.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone, timedelta
import json
import pathlib
import re
import sys
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

VENUES = {
    "01": "札幌", "02": "函館", "03": "福島", "04": "新潟",
    "05": "東京", "06": "中山", "07": "中京", "08": "京都",
    "09": "阪神", "10": "小倉",
}
ALLOWED = {"race.netkeiba.com", "db.netkeiba.com"}
USER_AGENT = "KeibaLabPersonalImporter/1.0 (manual one-race research)"
JST = timezone(timedelta(hours=9))
ID_RE = re.compile(r"^\d{12}$")


class ImportFailure(Exception):
    pass


def clean(element) -> str:
    return element.get_text(" ", strip=True) if element is not None else ""


def number(text):
    m = re.search(r"-?\d+(?:\.\d+)?", str(text or "").replace(",", ""))
    return float(m.group(0)) if m else None


def integer(text):
    val = number(text)
    return int(val) if val is not None and val.is_integer() else None


def match_id(href, kind="horse"):
    m = re.search(r"/" + re.escape(kind) + r"/(\d{7,11})(?:/|[?#]|$)", href or "")
    return m.group(1) if m else None


def sex_age(raw):
    m = re.search(r"([牡牝セ])\s*(\d{1,2})", raw or "")
    return (m.group(1), int(m.group(2))) if m else (None, None)


def html_soup(content):
    return BeautifulSoup(content, "html.parser")


def parse_entries(content, race_id: str, race_date: str) -> dict:
    if not ID_RE.fullmatch(race_id):
        raise ImportFailure("JRAレースIDは12桁の数字で指定してください")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", race_date):
        raise ImportFailure("開催日はYYYY-MM-DDで入力してください")
    datetime.strptime(race_date, "%Y-%m-%d")
    soup = html_soup(content)
    table = soup.select_one("table.Shutuba_Table")
    if not table:
        raise ImportFailure("出馬表のテーブルが見つかりません。JavaScript描画の未完了ページ、又はHTML仕様変更の可能性があります")
    title = soup.select_one(".RaceName") or soup.select_one("h1")
    name = clean(title) or f"{VENUES.get(race_id[4:6], '競馬場未確認')} {int(race_id[-2:])}R"
    info = clean(soup.select_one(".RaceData01")) + " " + clean(soup.select_one(".RaceData02"))
    # NEVER infer an absent race distance or track condition.
    surface_match = re.search(r"(芝|ダート|ダ|障害)[\s・]*([12]?\d{3,4})\s*[mｍ]", info)
    surface = ("ダート" if surface_match.group(1)=="ダ" else surface_match.group(1)) if surface_match else None
    distance = int(surface_match.group(2)) if surface_match else None
    going_match = re.search(r"(?:馬場(?:状態)?\s*[:：]?\s*)(稍重|不良|重|良)(?!\w)", info)
    weather_match = re.search(r"(?:天候\s*[:：]?\s*)(晴|曇|雨|雪|小雨|小雪)", info)
    time_match = re.search(r"(?:発走(?:予定)?\s*[:：]?\s*)(\d{1,2}:\d{2})", info)
    horses = []
    missing = []
    for row in table.select("tr.HorseList"):
        cell = row.select_one("td.HorseInfo")
        link = cell.select_one('a[href*="/horse/"]') if cell else None
        if link is None:
            continue
        horse_id = match_id(link.get("href", ""))
        horse_name = link.get("title") or clean(link)
        number_cell = row.select_one('td[class*="Umaban"]')
        draw_cell = row.select_one('td[class*="Waku"]')
        horse_number = integer(clean(number_cell))
        draw = integer(clean(draw_cell))
        if horse_id is None or horse_number is None or not horse_name:
            raise ImportFailure(f"馬の識別情報が不足しています: {clean(row)[:120]}")
        barei = row.select_one("td.Barei")
        sex, age = sex_age(clean(barei))
        cells = row.find_all("td", recursive=False)
        # The load field does not have a stable class in shutuba pages.
        load_cell = cells[5] if len(cells) > 5 else None
        jockey = row.select_one("td.Jockey a")
        trainer = row.select_one("td.Trainer a")
        odds_cell = row.select_one("td.Popular:not(.Popular_Ninki) .Odds") or row.select_one('td.Popular:not(.Popular_Ninki) [id^="odds-"]')
        odds = number(clean(odds_cell))
        if odds is not None and odds <= 1:
            odds = None
        weight_cell = row.select_one("td.Weight")
        body_weight = integer(clean(weight_cell).split("(")[0]) if weight_cell else None
        horse = {
            "id": horse_id, "number": horse_number, "name": horse_name,
            "age": age, "sex": sex, "draw": draw,
            "weight": number(clean(load_cell)),
            "jockey": clean(jockey) or None, "trainer": clean(trainer) or None,
            "jockeyId": match_id(jockey.get("href",""), "jockey") if jockey else None,
            "trainerId": match_id(trainer.get("href",""), "trainer") if trainer else None,
            "bodyWeight": body_weight, "odds": odds,
            "sire": None, "damSire": None, "style": None,
            "factors": {},
            "pastRuns": []
        }
        horses.append(horse)
        if not (horse["jockey"] and horse["trainer"]):
            missing.append(f"{horse_name}: 騎手・調教師のいずれか")
    if not 2 <= len(horses) <= 30:
        raise ImportFailure(f"有効な出走馬数が異常です: {len(horses)}頭。取込を中止します")
    if len({h["id"] for h in horses}) != len(horses) or len({h["number"] for h in horses}) != len(horses):
        raise ImportFailure("重複した馬IDまたは馬番が検出されました")
    if not (surface and distance):
        raise ImportFailure("コース種別・距離を確認できません。空欄を推測で埋めずに中止します")
    return {
        "id": race_id, "date": race_date, "name": name,
        "course": VENUES.get(race_id[4:6]), "surface": surface,
        "distance": distance, "going": going_match.group(1) if going_match else None,
        "weather": weather_match.group(1) if weather_match else None,
        "pace": None, "start": time_match.group(1) if time_match else None,
        "type": "imported", "source": "netkeiba (個人利用・手動取得)",
        "sourceUrl": f"https://race.netkeiba.com/race/shutuba.html?race_id={race_id}",
        "asOf": datetime.now(JST).isoformat(timespec="seconds"),
        "result": None, "horses": horses, "importWarnings": missing,
        "dataQuality": "unverified_snapshot"
    }


def parse_result(content: str, horse_ids: set[str]):
    soup = html_soup(content)
    table = soup.select_one("table#All_Result_Table") or soup.select_one('table[summary="全着順"]')
    if table is None:
        raise ImportFailure("結果ページに全着順テーブルが見つかりません")
    finishers = []
    excluded = []
    for row in table.select("tr.HorseList"):
        anchor = row.select_one('td.Horse_Info a[href*="/horse/"]')
        if not anchor:
            continue
        horse_id = match_id(anchor.get("href",""))
        cell = row.select_one("td.Result_Num")
        pos_raw = clean(cell)
        pos = integer(pos_raw) if pos_raw.isdigit() else None
        if not horse_id or horse_id not in horse_ids:
            raise ImportFailure("結果ページの出走馬IDと出馬表が一致しません（別レースの可能性）")
        if pos is None:
            excluded.append(horse_id)
        else:
            finishers.append((pos, horse_id))
    if excluded or len(finishers)!=len(horse_ids):
        raise ImportFailure(f"全馬の着順を一意に確定できません（取消・中止・失格・同着等）: 未確定{len(horse_ids)-len(finishers)}頭。安全のため結果は保存しません")
    positions=[p for p,hid in finishers]
    if sorted(positions)!=list(range(1,len(horse_ids)+1)):
        raise ImportFailure("同着または着順の重複・欠落があるため、結果を取り込めません")
    return [hid for _,hid in sorted(finishers)]


def parse_horse_history(content: str, cutoff_date: str) -> tuple[list[dict], str | None, str | None]:
    """Only extract verifiable historical rows. Bloodline unset if ambiguous."""
    soup=html_soup(content)
    table=soup.select_one("table.db_h_race_results") or soup.select_one("#horse_result table") or soup.select_one('table[summary*="戦績"]')
    if table is None:
        raise ImportFailure("馬ページに戦績テーブルがありません（仕様変更・会員限定など）")
    headings=table.select("thead th")
    headers=[clean(h).replace(" ","").replace("\u3000","") for h in headings]
    if not headers:
        headers=[clean(t).replace(" ","") for t in table.select("tr th")]
    def idx(*choices):
        for word in choices:
            for i,h in enumerate(headers):
                if h==word: return i
        return None
    i_date=idx("日付");i_finish=idx("着順");i_head=idx("頭数");i_place=idx("開催");i_dist=idx("距離");i_going=idx("馬場");i_index=idx("タイム指数")
    if None in (i_date,i_finish,i_head,i_place,i_dist):
        raise ImportFailure(f"戦績の必須カラムを識別できません: {headers[:32]}")
    rows=[]
    for row in table.select("tbody tr"):
        td=row.select("td")
        if len(td)<=max(i_date,i_finish,i_head,i_place,i_dist):
            continue
        val=lambda i:clean(td[i]) if i is not None and i<len(td) else ""
        when=val(i_date)
        if not re.fullmatch(r"\d{4}/\d{1,2}/\d{1,2}",when):
            continue
        dt=datetime.strptime(when,"%Y/%m/%d").date().isoformat()
        if dt>=cutoff_date: continue
        finish=integer(val(i_finish))
        field=integer(val(i_head))
        if not(finish is not None and field and 1<=finish<=field):continue
        course=re.search(r"(東京|中山|京都|阪神|中京|新潟|福島|小倉|札幌|函館)",val(i_place))
        distance=re.search(r"(芝|ダ|障)\s*(\d{3,4})",val(i_dist))
        if not(distance and course):continue
        g=val(i_going)
        going=next((v for v in ("稍重","不良","重","良") if v in g),None)
        rows.append({
            "date":dt,"course":course.group(1),
            "surface":{"芝":"芝","ダ":"ダート","障":"障害"}[distance.group(1)],
            "distance":int(distance.group(2)),
            "going":going,
            "finish":finish,"fieldSize":field,
            "speedIndex":number(val(i_index))
        })
    rows.sort(key=lambda x:x["date"],reverse=True)
    # netkeiba pedigree table: 1st ancestor cell = sire, 5th = dam's sire.
    # Do not infer relatives from plain page text if the structure differs.
    sire=None
    damsire=None
    blood=soup.select_one("table.blood_table")
    if blood:
        cells=blood.select("td")
        if len(cells)>=5:
            first=cells[0].select_one('a[href*="/horse/"]')
            maternal=cells[4].select_one('a[href*="/horse/"]')
            if first and maternal:
                sire=clean(first) or None
                damsire=clean(maternal) or None
    return rows[:20],sire,damsire


class PoliteClient:
    def __init__(self, acknowledged: bool, min_interval: float=7.0):
        if not acknowledged:
            raise ImportFailure("ネットワーク取得には --allow-network が必要です。利用許諾・規約をご確認ください")
        if min_interval<5:
            raise ImportFailure("最小アクセス間隔は5秒です")
        import requests
        self.session=requests.Session()
        self.session.headers.update({"User-Agent":USER_AGENT,"Accept-Language":"ja,en;q=.5"})
        self.allowed={}
        self.last_request=0.0
        self.interval=min_interval
    def get(self,url):
        parsed=urlparse(url)
        if parsed.scheme!="https" or parsed.hostname not in ALLOWED:
            raise ImportFailure("想定外のホストへのアクセスは禁止しています")
        if parsed.hostname not in self.allowed:
            robots=f"https://{parsed.hostname}/robots.txt"
            rp=RobotFileParser()
            rp.set_url(robots)
            try:rp.read()
            except Exception as exc:raise ImportFailure(f"robots.txtを確認できません: {exc}") from exc
            self.allowed[parsed.hostname]=rp
        if not self.allowed[parsed.hostname].can_fetch(USER_AGENT,url):
            raise ImportFailure(f"robots.txt がアクセスを認めていません: {url}")
        elapsed=time.monotonic()-self.last_request
        if self.last_request and elapsed<self.interval:time.sleep(self.interval-elapsed)
        self.last_request=time.monotonic()
        try:
            res=self.session.get(url,timeout=(7,15),allow_redirects=False)
        except Exception as exc:
            raise ImportFailure(f"通信失敗: {exc}") from exc
        if res.status_code in (301,302,303,307,308):
            raise ImportFailure("リダイレクトが発生しました。ログイン・アクセス制限の可能性があるため終了します")
        if res.status_code in (401,403,429,503):
            raise ImportFailure(f"HTTP {res.status_code}。アクセス制限の可能性があるため再試行せず終了します")
        if res.status_code!=200:
            raise ImportFailure(f"HTTP {res.status_code}。再試行しません")
        if len(res.content)>3_000_000:raise ImportFailure("HTMLが3MBを超えています")
        if "text/html" not in res.headers.get("Content-Type","text/html"):
            raise ImportFailure("HTML以外の応答を受信しました")
        guess=(res.apparent_encoding or "").lower().replace("_","-")
        res.encoding = guess if guess in ("euc-jp","shift-jis","utf-8","cp932") else "EUC-JP"
        return res.text


def read_html(path):
    raw=pathlib.Path(path).read_bytes()
    for encoding in ("utf-8-sig","euc-jp","cp932"):
        try:return raw.decode(encoding)
        except UnicodeDecodeError:pass
    raise ImportFailure("HTMLの文字コードを特定できません")


def write_json(race,output):
    target=pathlib.Path(output).expanduser().resolve()
    if target.suffix.lower()!=".json":raise ImportFailure("出力ファイル名は.jsonにしてください")
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(race,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"取込用JSON: {target}")
    print(f"レース: {race['name']} / {race['date']} / {len(race['horses'])}頭")
    print(f"戦績を取得できた馬: {sum(bool(h['pastRuns']) for h in race['horses'])}/{len(race['horses'])}")
    print(f"結果: {'取得済' if race['result'] else '未取得'}")
    print("注: 取得値は未検証のスナップショットです。発走前オッズや血統・調教は未取得の可能性があります。")


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--race-id",required=True,help="JRA race_id 12桁")
    p.add_argument("--race-date",required=True,help="正確な開催日 YYYY-MM-DD。推測しない")
    p.add_argument("--entry-html",type=pathlib.Path,help="保存した出馬表HTML (ネット接続しない)")
    p.add_argument("--result-html",type=pathlib.Path,help="任意: 保存した結果HTML (ネット接続しない)")
    p.add_argument("--horse-html-dir",type=pathlib.Path,help="任意: <馬ID>.html の保存フォルダ")
    p.add_argument("--with-results",action="store_true",help="ネットワークモードで結果も照会 (事後検証用)")
    p.add_argument("--horse-count",type=int,default=0,help="ネットワークモードで個別馬の過去走を取得。0〜18")
    p.add_argument("--allow-network",action="store_true",help="規約と許諾を確認した場合のみネットワーク取得を明示実行")
    p.add_argument("--out",default="keiba-lab-local-race.json")
    args=p.parse_args(argv)
    if bool(args.entry_html)==bool(args.allow_network):
        p.error("--entry-html（オフライン）または --allow-network（ネット接続）のどちらか一方を指定")
    if args.horse_count<0 or args.horse_count>18:p.error("--horse-count は0〜18です")
    if args.entry_html and (args.horse_count or args.with_results):
        p.error("保存HTMLモードでは --horse-html-dir / --result-html を使用してください")
    if not ID_RE.fullmatch(args.race_id):p.error("race-idは12桁です")
    if args.allow_network:
        client=PoliteClient(acknowledged=True)
        entry=client.get(f"https://race.netkeiba.com/race/shutuba.html?race_id={args.race_id}")
    else:
        entry=read_html(args.entry_html)
    race=parse_entries(entry,args.race_id,args.race_date)
    if args.entry_html and args.horse_html_dir:
        for horse in race["horses"]:
            path=args.horse_html_dir / f"{horse['id']}.html"
            if path.is_file():
                try:
                    horse["pastRuns"],horse["sire"],horse["damSire"]=parse_horse_history(read_html(path),args.race_date)
                except ImportFailure as exc:race["importWarnings"].append(f"{horse['name']}: {exc}")
    if args.allow_network:
        for horse in race["horses"][:args.horse_count]:
            try:
                html=client.get(f"https://db.netkeiba.com/horse/{horse['id']}/")
                horse["pastRuns"],horse["sire"],horse["damSire"]=parse_horse_history(html,args.race_date)
            except ImportFailure as exc:
                # A blocked network fetch must never trigger repeated probes.
                if "HTTP " in str(exc) or "robots" in str(exc) or "通信失敗" in str(exc):raise
                race["importWarnings"].append(f"{horse['name']}: {exc}")
    if args.result_html or args.with_results:
        raw=read_html(args.result_html) if args.result_html else client.get(
            f"https://race.netkeiba.com/race/result.html?race_id={args.race_id}")
        race["result"]=parse_result(raw,{x["id"] for x in race["horses"]})
    write_json(race,args.out)
    return 0


if __name__=="__main__":
    try:sys.exit(main())
    except (ImportFailure,ValueError,OSError) as exc:
        print(f"取得中止: {exc}",file=sys.stderr)
        sys.exit(2)
