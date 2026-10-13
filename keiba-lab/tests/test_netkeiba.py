"""Offline regression tests. All HTML and names below are invented."""
import importlib.util
import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("netkeiba_import",ROOT/"tools"/"netkeiba_import.py")
nk=importlib.util.module_from_spec(spec);spec.loader.exec_module(nk)
RID="202605010101";DATE="2026-02-01"
ENTRY="""<html><h1 class="RaceName">検証競走（架空）</h1><div class="RaceData01">芝1600m / 天候 : 晴 / 馬場 : 良 / 発走 10:10</div><table class="Shutuba_Table"><tbody>
<tr class="HorseList"><td class="Waku1">1</td><td class="Umaban1">1</td><td>印</td><td class="HorseInfo"><a href="https://db.netkeiba.com/horse/2020123456/" title="架空ホースA">架空ホースA</a></td><td class="Barei">牝4</td><td>55.0</td><td class="Jockey"><a href="/jockey/result/recent/01234/">架空騎手甲</a></td><td class="Trainer"><a href="/trainer/result/recent/01235/">架空厩舎甲</a></td><td class="Weight">462(+4)</td><td class="Popular"><span id="odds-1_01">---.-</span></td></tr>
<tr class="HorseList"><td class="Waku1">1</td><td class="Umaban2">2</td><td>印</td><td class="HorseInfo"><a href="https://db.netkeiba.com/horse/2020123457/" title="架空ホースB">架空ホースB</a></td><td class="Barei">牡5</td><td>57.0</td><td class="Jockey"><a href="/jockey/result/recent/01236/">架空騎手乙</a></td><td class="Trainer"><a href="/trainer/result/recent/01237/">架空厩舎乙</a></td><td class="Weight">486(-4)</td><td class="Popular"><span id="odds-1_02">4.5</span></td></tr></tbody></table></html>"""
RESULT="""<table id="All_Result_Table"><tbody>
<tr class="HorseList"><td class="Result_Num"><div class="Rank">1</div></td><td></td><td class="Num">2</td><td class="Horse_Info"><a href="https://db.netkeiba.com/horse/2020123457/">架空ホースB</a></td></tr>
<tr class="HorseList"><td class="Result_Num"><div class="Rank">2</div></td><td></td><td class="Num">1</td><td class="Horse_Info"><a href="https://db.netkeiba.com/horse/2020123456/">架空ホースA</a></td></tr></tbody></table>"""
HORSE="""<table class="db_h_race_results"><thead><tr><th>日付</th><th>開催</th><th>着順</th><th>頭数</th><th>距離</th><th>馬場</th></tr></thead><tbody>
<tr><td>2025/11/20</td><td>5東京</td><td>2</td><td>12</td><td>芝1600</td><td>良</td></tr>
<tr><td>2026/02/01</td><td>1東京</td><td>1</td><td>16</td><td>芝1600</td><td>良</td></tr>
<tr><td>2026/03/01</td><td>1中山</td><td>1</td><td>16</td><td>芝1200</td><td>良</td></tr></tbody></table>"""
class ScraperTests(unittest.TestCase):
    def test_entries(self):
        r=nk.parse_entries(ENTRY,RID,DATE)
        self.assertEqual(r["course"],"東京");self.assertEqual(r["surface"],"芝");self.assertEqual(r["distance"],1600)
        self.assertEqual(r["going"],"良");self.assertEqual(r["weather"],"晴")
        self.assertEqual(len(r["horses"]),2);self.assertIsNone(r["horses"][0]["odds"])
        self.assertEqual(r["horses"][1]["odds"],4.5)
        self.assertEqual(r["horses"][0]["weight"],55.)
        self.assertEqual(r["horses"][1]["sex"],"牡")
        self.assertEqual(r["horses"][1]["age"],5)
        self.assertEqual(r["horses"][0]["factors"],{})
    def test_result(self):
        self.assertEqual(nk.parse_result(RESULT,{"2020123456","2020123457"}),["2020123457","2020123456"])
    def test_invalid_finish_rejected(self):
        with self.assertRaises(nk.ImportFailure):
            nk.parse_result(RESULT.replace('<div class="Rank">2</div>','<div class="Rank">中止</div>'),{"2020123456","2020123457"})
    def test_history_strict_cutoff(self):
        runs,si,ds=nk.parse_horse_history(HORSE,DATE)
        self.assertEqual(len(runs),1);self.assertEqual(runs[0]["date"],"2025-11-20")
        self.assertIsNone(si);self.assertIsNone(ds)
    def test_missing_track_fails(self):
        with self.assertRaises(nk.ImportFailure):
            nk.parse_entries(ENTRY.replace("芝1600m",""),RID,DATE)
    def test_duplicate_ids_fail(self):
        with self.assertRaises(nk.ImportFailure):
            nk.parse_entries(ENTRY.replace("2020123457","2020123456"),RID,DATE)
if __name__=="__main__":unittest.main()
