#!/usr/bin/env python3
"""Local-only netkeiba HTML -> KEIBA LAB JSON converter.

No automated fetching unless the user explicitly supplies --fetch and
--permission-confirmed. robots.txt is checked; no auth, stealth, or retries.
No fetched content is ever committed, uploaded, or redistributed by this code.

Requires: pip install beautifulsoup4 requests
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

BASE = "https://race.netkeiba.com"
VENUES = {"01": "札幌", "02": "函館", "03": "福島", "04": "新潟", "05": "東京",
          "06": "中山", "07": "中京", "08": "京都", "09": "阪神", "10": "小倉"}
COURSE_RE = re.compile(r"(芝|ダ(?:ート)?|障)(\d{3,4})m")
DATE_RE = re.compile(r"(20\d{2})[年/-](\d{1,2})[月/-](\d{1,2})日?")
HORSE_RE = re.compile(r"/horse/(\d{8,12})")
JST = dt.timezone(dt.timedelta(hours=9))
MAX_HTML = 4_000_000
AGENT = "KeibaLabLocalImport/1.1 (individual, non-redistributing; robots-aware)"


class ParseError(ValueError):
    pass


def text(el):
    return el.get_text(" ", strip=True) if el else ""


def num(raw):
    m = re.search(r"\d+(?:\.\d+)?", str(raw or "").replace(",", ""))
    return float(m.group()) if m else None


def integer(raw):
    v = num(raw)
    return int(v) if v is not None else None


def clean_date(year, month, day):
    try:
        return dt.date(int(year), int(month), int(day)).isoformat()
    except ValueError as exc:
        raise ParseError("ページ内に不正な日付があります") from exc


def guess_date(soup, race_id):
    """Only return an explicitly written date. Never infer month/day from race_id."""
    selectors = (
        "div.RaceList_DateList .Active", ".RaceList_DateList .Active",
        ".RaceDate", "li.Active", "meta[property='article:published_time']",
        "meta[property='og:description']", "title"
    )
    for selector in selectors:
        for tag in soup.select(selector):
            value = tag.get("content", "") if tag.name == "meta" else text(tag)
            m = DATE_RE.search(value)
            if m:
                return clean_date(*m.groups())
            m = re.search(r"(\d{1,2})[月/](\d{1,2})日?", value)
            if m and race_id:
                return clean_date(race_id[:4], *m.groups())
    # Avoid searching previous-run cells: these contain OTHER races' dates.
    return None


def race_info(soup, race_id, date_hint=None):
    title = soup.select_one("h1.RaceName") or soup.select_one(".RaceName") or soup.select_one("h1")
    name = text(title)
    if not name:
        raise ParseError("レース名が見つかりません。HTML構造を確認してください。")
    top = text(soup.select_one(".RaceData01")) or text(soup.select_one(".RaceData02"))
    found = COURSE_RE.search(top)
    if not found:
        found = COURSE_RE.search(text(soup.select_one(".RaceList_NameBox"))[:600])
    if not found:
        raise ParseError("芝/ダートと距離が見つかりません。ページを確認してください。")
    raw_surface = found.group(1)
    surface = "ダート" if raw_surface.startswith("ダ") else ("障害" if raw_surface == "障" else "芝")
    got_date = guess_date(soup, race_id)
    if got_date and date_hint and got_date != date_hint:
        raise ParseError("指定日付とページの日付が一致しません: %s / %s" % (date_hint, got_date))
    date = got_date or date_hint
    if not date:
        raise ParseError("開催日を判定できません。--date YYYY-MM-DD を指定してください。")
    if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}", date):
        raise ParseError("--date は YYYY-MM-DD で指定してください")
    going = re.search(r"馬場\s*[:：]\s*(良|稍重|重|不良)", top)
    weather = re.search(r"天候\s*[:：]\s*([^\s/]+)", top)
    return {
        "id": "netkeiba-" + race_id,
        "date": date,
        "name": name,
        "course": VENUES.get(race_id[4:6], "不明"),
        "surface": surface,
        "distance": int(found.group(2)),
        "going": going.group(1) if going else "未確認",
        "weather": weather.group(1) if weather else "",
        "pace": "未設定",
        "asOf": dt.datetime.now(JST).isoformat(timespec="seconds"),
        "source": BASE + "/race/shutuba.html?race_id=" + race_id,
        "sourceType": "netkeiba-private-import",
        "notes": "公開サイトへの再配布は禁止。未収録データや事後オッズは補完しない。",
        "horses": [],
        "result": None,
    }


def sexage(value):
    m = re.search(r"([牡牝セせん騸])\s*(\d+)", value)
    return (m.group(1), int(m.group(2))) if m else ("", 0)


def parse_entry_row(row):
    horse_cell = row.select_one("td.HorseInfo") or row.select_one("td.Horse_Info")
    if not horse_cell:
        return None
    links = horse_cell.select("a[href*='/horse/']")
    if not links:
        return None
    # Standard shutuba: single horse link. Past-style: Horse01=sire,
    # Horse02=current horse, Horse03=dam.
    current = horse_cell.select_one(".Horse02 a[href*='/horse/']")
    if current is None:
        current = horse_cell.select_one(".HorseName a[href*='/horse/']")
    if current is None:
        current = links[0] if len(links) == 1 else links[1]
    m = HORSE_RE.search(current.get("href", ""))
    if not m:
        return None
    horse_name = current.get("title") or text(current)
    tds = row.select("td")
    nums = row.select_one("td[class*='Umaban']") or row.select_one("td.Num.Txt_C")
    number = integer(text(nums)) if nums else None
    if not number and len(tds) > 1:
        number = integer(text(tds[1]))
    frame_td = row.select_one("td[class^='Waku']") or row.select_one("td.Num[class*='Waku']")
    draw = integer(text(frame_td)) if frame_td else None
    if not number or not horse_name:
        return None
    barei = row.select_one("td.Barei") or row.select_one("td.Horse_Info.Txt_C")
    sex, age = sexage(text(barei))
    jockey = text(row.select_one("td.Jockey a"))
    trainer = text(row.select_one("td.Trainer a"))
    wtag = row.select_one(".JockeyWeight")
    if not wtag and len(tds) >= 6:
        # Standard page uses 6th column for handicap weight.
        wtag = tds[5]
    weight = num(text(wtag))
    oddsraw = text(row.select_one("td.Popular:not(.Popular_Ninki)") or row.select_one("td.Odds"))
    odds = num(oddsraw) if re.fullmatch(r"\d+(?:\.\d+)?", oddsraw.strip()) else None
    # Placeholder '---.-' and JS-rendered odds are UNKNOWN, never default to 1.0.
    sire = text(horse_cell.select_one(".Horse01"))
    dam = text(horse_cell.select_one(".Horse03"))
    dam_sire = ""
    if dam:
        dm = re.search(r"\(([^)]+)\)", dam)
        if dm:
            dam_sire = dm.group(1).strip()
    return {
        "id": m.group(1), "number": number, "name": horse_name,
        "age": age, "sex": sex, "draw": draw,
        "weight": weight, "jockey": jockey, "trainer": trainer,
        "sire": sire or "", "dam": dam or "", "damSire": dam_sire,
        "odds": odds, "factors": {}, "pastRuns": [], "style": "",
        "form": "", "lastRunDays": None,
    }


def parse_entries(html, race_id, date_hint=None):
    soup = BeautifulSoup(html, "html.parser")
    race = race_info(soup, race_id, date_hint)
    table = soup.select_one("table.Shutuba_Table") or soup.select_one("table.ShutubaTable")
    if not table:
        raise ParseError("出馬表テーブルが見つかりません。netkeibaのHTMLを保存してください。")
    for row in table.select("tr.HorseList"):
        horse = parse_entry_row(row)
        if horse is not None:
            race["horses"].append(horse)
    ids = [h["id"] for h in race["horses"]]
    numbers = [h["number"] for h in race["horses"]]
    if not 2 <= len(ids) <= 30 or len(set(ids)) != len(ids) or len(set(numbers)) != len(numbers):
        raise ParseError("出走馬の抽出結果が不正です。未対応のHTML形式の可能性があります。")
    return race


def parse_past_runs(td, before):
    """Best effort extraction. Skip any partial run: no invented result/field."""
    past = []
    for block in td.select("td.Past div.Data_Item, .Past div.Data_Item, td.Past, .RaceData"):
        raw = text(block)
        mdate = DATE_RE.search(raw)
        if not mdate:
            ym = re.search(r"(20\d{2})\.(\d{1,2})\.(\d{1,2})", raw)
            mdate = ym
        if not mdate:
            continue
        date = clean_date(*mdate.groups())
        if date >= before:
            continue
        mloc = next((v for v in VENUES.values() if v in raw), None)
        mcourse = COURSE_RE.search(raw.replace(" ", ""))
        mpos = re.search(r"(\d{1,2})\s*着", raw) or re.search(r"(^|\s)(\d{1,2})\s+\d+頭", raw)
        mfield = re.search(r"(\d{1,2})\s*頭", raw)
        position = int(mpos.group(mpos.lastindex)) if mpos else None
        field = int(mfield.group(1)) if mfield else None
        if not position or not field or position > field or field > 30:
            continue
        item = {"date": date, "finish": position, "fieldSize": field}
        if mloc:
            item["course"] = mloc
        if mcourse:
            item["surface"] = "ダート" if mcourse.group(1).startswith("ダ") else ("障害" if mcourse.group(1)=="障" else "芝")
            item["distance"] = int(mcourse.group(2))
        mg = re.search(r"(?<!稍)(良|稍重|不良|重)", raw)
        if mg:
            item["going"] = mg.group(1)
        past.append(item)
    unique = {p["date"]+str(p.get("distance",""))+str(p.get("finish","")):p for p in past}
    return sorted(unique.values(), key=lambda x:x["date"], reverse=True)[:5]


def merge_past(race, html):
    soup = BeautifulSoup(html, "html.parser")
    by_id = {x["id"]:x for x in race["horses"]}
    count = 0
    for row in soup.select("tr.HorseList"):
        parsed = parse_entry_row(row)
        if not parsed or parsed["id"] not in by_id:
            continue
        h = by_id[parsed["id"]]
        for k in ("sire", "dam", "damSire"):
            if parsed[k]:
                h[k] = parsed[k]
        runs = parse_past_runs(row, race["date"])
        if runs:
            h["pastRuns"] = runs
            count += len(runs)
    return count


def parse_results(html, race):
    soup = BeautifulSoup(html, "html.parser")
    table = soup.select_one("table#All_Result_Table") or soup.select_one("table[summary='全着順']")
    if table is None:
        raise ParseError("結果テーブルが見つかりません。公式確定前か、HTML形式変更の可能性があります。")
    horse_by_num = {h["number"]: h["id"] for h in race["horses"]}
    ranks = []
    for tr in table.select("tbody tr"):
        td = tr.select_one("td.Result_Num")
        if td is None:
            continue
        rankstr = text(td)
        if not re.fullmatch(r"\d+", rankstr):
            raise ParseError("除外・中止・失格・同着等を自動順位には変換しません: "+rankstr)
        tds = tr.find_all("td", recursive=False)
        if len(tds) < 4:
            continue
        horse_link = tr.select_one("td.Horse_Info a[href*='/horse/']")
        horse_id_match = HORSE_RE.search(horse_link.get("href", "")) if horse_link else None
        hid = horse_id_match.group(1) if horse_id_match else None
        number = integer(text(tds[2]))
        if not hid:
            hid = horse_by_num.get(number)
        if not hid or hid not in {h["id"] for h in race["horses"]}:
            raise ParseError("結果と出走表の馬IDが一致しません")
        ranks.append((int(rankstr),hid))
    if len(ranks)!=len(race["horses"]):
        raise ParseError("未完走馬・未表示馬があり、結果を全馬照合できません")
    numbers = sorted(n for n,_ in ranks)
    if numbers!=list(range(1,len(numbers)+1)):
        raise ParseError("同着・競走中止・非連続着順は現バージョンでは未対応です")
    ids = [hid for _,hid in sorted(ranks)]
    if len(set(ids)) != len(ids):
        raise ParseError("結果に馬IDの重複があります")
    race["result"] = ids
    return race


def parse_html(rawbytes):
    for encoding in ("utf-8", "euc_jp", "cp932"):
        try:
            decoded = rawbytes.decode(encoding)
            if "\ufffd" not in decoded:
                return decoded
        except UnicodeError:
            pass
    raise ParseError("HTMLの文字コードを判定できません。UTF-8/EUC-JP/Shift-JISをお試しください。")


def local_html(path):
    content = Path(path).read_bytes()
    if not 0<len(content)<=MAX_HTML:
        raise ParseError("HTMLは空でない4MB以下のものを指定してください")
    return parse_html(content)


def check_robots(session, url):
    from urllib.parse import urlsplit
    parsed = urlsplit(url)
    if parsed.scheme!="https" or parsed.netloc!="race.netkeiba.com":
        raise ParseError("許可されていない取得先です")
    robots_url = BASE+"/robots.txt"
    try:
        resp=session.get(robots_url,timeout=12,allow_redirects=False)
        if resp.status_code != 200:
            raise ParseError("robots.txt を確認できないため自動取得を中止しました（HTTP %s）"%resp.status_code)
        robots=RobotFileParser()
        robots.parse(resp.text.splitlines())
        if not robots.can_fetch(AGENT,url) or not robots.can_fetch("*",url):
            raise ParseError("robots.txt により取得が許可されていません")
        return robots
    except OSError as exc:
        raise ParseError("robots.txt の照会に失敗したため自動取得を中止") from exc


def fetch_page(url, session, robots):
    if not robots.can_fetch(AGENT,url) or not robots.can_fetch("*",url):
        raise ParseError("robots.txt でURLへのアクセスが認められていません")
    time.sleep(5)
    response=session.get(url,timeout=20,allow_redirects=False)
    if response.status_code in (401,403,429):
        raise ParseError("アクセス制限が確認されたため取得を終了しました（HTTP %s）"%response.status_code)
    if response.status_code!=200 or len(response.content)>MAX_HTML:
        raise ParseError("HTML取得が失敗しました（HTTP %s / サイズ）"%response.status_code)
    ctype=response.headers.get("Content-Type","").lower()
    if "html" not in ctype:
        raise ParseError("取得結果がHTMLではありません")
    return parse_html(response.content)


def load_existing(path,race_id):
    saved=json.loads(Path(path).read_text(encoding="utf-8"))
    if saved.get("id")!="netkeiba-"+race_id:
        raise ParseError("既存JSONのrace_idが一致しません")
    if len(saved.get("horses",[]))<2:
        raise ParseError("既存JSONに出走馬情報がありません")
    return saved


def run(argv=None):
    ap=argparse.ArgumentParser(description="netkeibaの出馬表HTMLを私的利用のJSONへ変換")
    ap.add_argument("--race-id",required=True,help="12桁の中央競馬レースID")
    ap.add_argument("--date",help="開催日 YYYY-MM-DD。ページから日付を確定できない場合は必須")
    ap.add_argument("--html",help="手元で保存した出馬表HTML")
    ap.add_argument("--past-html",help="手元で保存した血統・馬柱5走ページ")
    ap.add_argument("--result-html",help="手元で保存した結果HTML")
    ap.add_argument("--existing",help="結果追加時に使う事前レースJSON")
    ap.add_argument("--fetch",action="store_true",help="利用が認められた範囲で単一レースのHTMLを取得")
    ap.add_argument("--permission-confirmed",action="store_true",help="取得元規約と許諾・私的利用条件を確認したことを宣言")
    ap.add_argument("--out",default=None,help="作成するJSONのパス")
    args=ap.parse_args(argv)
    if not re.fullmatch(r"20\d{10}",args.race_id) or args.race_id[4:6] not in VENUES:
        raise ParseError("race-idは年と中央競馬場コードを含む12桁で指定してください")
    if args.date:
        try:
            if dt.date.fromisoformat(args.date).isoformat()!=args.date: raise ValueError()
        except ValueError: raise ParseError("--date はYYYY-MM-DDです")
    if args.fetch and not args.permission_confirmed:
        raise ParseError("--fetch には --permission-confirmed が必要です。利用許諾なしには使用しないでください")
    if args.fetch and (args.html or args.past_html or args.result_html):
        raise ParseError("--fetch と保存済みHTML指定は混在できません")
    if args.existing and not args.result_html and not args.fetch:
        raise ParseError("--existing 使用時は --result-html または --fetch を指定してください")
    if not args.fetch and not args.html and not args.existing:
        raise ParseError("--html と --race-id を指定してください。自動取得には明示的許諾確認が必要です")
    session=None;robots=None
    if args.fetch:
        import requests
        session=requests.Session()
        session.headers.update({"User-Agent":AGENT,"Accept":"text/html"})
        url=BASE+"/race/"+("result.html" if args.existing else "shutuba.html")+"?race_id="+args.race_id
        robots=check_robots(session,url)
    if args.existing:
        race=load_existing(args.existing,args.race_id)
        html=fetch_page(BASE+"/race/result.html?race_id="+args.race_id,session,robots) if args.fetch else local_html(args.result_html)
        parse_results(html,race)
        print("着順を照合しました。既存の予想前データは変更しません。")
    else:
        html=fetch_page(BASE+"/race/shutuba.html?race_id="+args.race_id,session,robots) if args.fetch else local_html(args.html)
        race=parse_entries(html,args.race_id,args.date)
        if args.past_html:
            total=merge_past(race,local_html(args.past_html))
            print("過去走レコードを%d件抽出しました。"%total)
        # No additional fetch of horse pages or odds APIs. Missing data stays missing.
        print("出走馬: %d頭。オッズ欠損: %d頭。血統欠損: %d頭。" % (
            len(race["horses"]),sum(h["odds"] is None for h in race["horses"]),sum(not h["sire"] for h in race["horses"])))
    filename=args.out or ("netkeiba-"+args.race_id+("-result" if args.existing else "")+".json")
    dest=Path(filename)
    if dest.suffix.lower()!=".json": raise ParseError("出力先は.jsonにしてください")
    dest.write_text(json.dumps(race,ensure_ascii=False,indent=2),encoding="utf-8")
    print("生成しました: "+str(dest)+" （私的利用向け。GitHubへコミットしないでください）")
    return race


if __name__=="__main__":
    try:
        run()
    except (ParseError,OSError,ValueError) as exc:
        print("エラー:",exc,file=sys.stderr)
        sys.exit(2)
