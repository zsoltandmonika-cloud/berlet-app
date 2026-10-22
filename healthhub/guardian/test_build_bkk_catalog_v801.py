"""v801 full GTFS catalog QA: modes, dedup, source and no synthetic routes."""
import importlib.util
import io
import zipfile
import csv
import unittest
from pathlib import Path
path=Path(__file__).with_name("build-bkk-catalog-v801.py")
spec=importlib.util.spec_from_file_location("hh_catalog_v801_test",path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def fixture():
    rows={
      "routes.txt":[["route_id","route_short_name","route_long_name","route_type"],
        ["2600","260","Busz 260","3"],["3170","17","Villamos 17","0"],
        ["3190","19","Villamos 19","0"],["H5A","H5","HÉV H5","109"],
        ["M2A","M2","Metró M2","1"],["T70","70","Trolibusz 70","11"],
        ["9A","9","Busz 9","3"],["9B","9","Busz 9","3"]],
      "trips.txt":[["trip_id","route_id","trip_headsign"],["T260","2600","Hegyvidék"],
      ["T9A","9A","Óbuda"],["T9B","9B","Belváros"]]}
    memory=io.BytesIO()
    with zipfile.ZipFile(memory,"w",zipfile.ZIP_DEFLATED) as z:
      for name,data in rows.items():
        buff=io.StringIO()
        csv.writer(buff).writerows(data)
        z.writestr(name,buff.getvalue())
    return memory.getvalue()

class CatalogTests(unittest.TestCase):
    def test_official_catalog_contains_all_modes(self):
        doc=module.make_catalog(fixture())
        self.assertEqual(doc["source"],"BKK Zrt., CC BY 4.0")
        self.assertIn("NOT real-time",doc["feedType"])
        routes={(v["mode"],v["id"]):v for v in doc["routes"]}
        self.assertEqual(routes["hev","H5"]["gtfsRouteIds"],["H5A"])
        self.assertEqual(routes["metro","M2"]["gtfsRouteIds"],["M2A"])
        self.assertEqual(routes["trolley","70"]["gtfsRouteIds"],["T70"])
        self.assertEqual(routes["bus","9"]["gtfsRouteIds"],["9A","9B"])
        self.assertEqual(routes["bus","9"]["directions"],["Belváros","Óbuda"])
        self.assertEqual(len(routes),7)
    def test_missing_baseline_rejected(self):
        with zipfile.ZipFile(io.BytesIO(fixture())) as z:
            docs={name:z.read(name) for name in z.namelist()}
        docs["routes.txt"]=docs["routes.txt"].replace(b"2600,260",b"2600,999")
        out=io.BytesIO()
        with zipfile.ZipFile(out,"w") as z:
            for name,data in docs.items():z.writestr(name,data)
        with self.assertRaises(ValueError):module.make_catalog(out.getvalue())
if __name__=="__main__":unittest.main()
