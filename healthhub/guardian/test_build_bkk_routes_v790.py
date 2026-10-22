"""Synthetic GTFS fixture for BKK static route generator; no user coordinates."""
import csv
import importlib.util
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE=Path(__file__).with_name("build-bkk-routes-v790.py")
spec=importlib.util.spec_from_file_location("bkk_generator", MODULE)
generator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

def fixture():
    datasets={
        "routes.txt":[["route_id","route_short_name","route_long_name","route_type","route_color"],
                      ["R260","260","Synthetic circular 260", "3","2476C5"],
                      ["R17","17","Synthetic tram 17","0","CCA513"],
                      ["R19","19","Synthetic tram 19","0","CCA513"]],
        "trips.txt":[["route_id","service_id","trip_id","trip_headsign","direction_id","shape_id"],
                     ["R260","WK","T260","260 kör","0","S260"],
                     ["R17","WK","T17","17 cél","0","S17"],
                     ["R19","WK","T19","19 cél","0","S19"]],
        "shapes.txt":[["shape_id","shape_pt_lat","shape_pt_lon","shape_pt_sequence"],
                      ["S260","47.51","19.02","1"],["S260","47.52","19.03","2"],
                      ["S17","47.50","19.01","1"],["S17","47.51","19.02","2"],
                      ["S19","47.49","19.01","1"],["S19","47.50","19.02","2"]],
        "stops.txt":[["stop_id","stop_name","stop_lat","stop_lon"],
                     ["P260","260 Megálló","47.51","19.02"],
                     ["P17","17 Megálló","47.50","19.01"],
                     ["P19","19 Megálló","47.49","19.01"]],
        "stop_times.txt":[["trip_id","arrival_time","departure_time","stop_id","stop_sequence"],
                          ["T260","09:00","09:00","P260","1"],
                          ["T17","09:00","09:00","P17","1"],
                          ["T19","09:00","09:00","P19","1"]],
    }
    b=io.BytesIO()
    with zipfile.ZipFile(b,"w",zipfile.ZIP_DEFLATED) as z:
        for filename,rows in datasets.items():
            text=io.StringIO()
            writer=csv.writer(text);writer.writerows(rows)
            z.writestr(filename,text.getvalue())
    return b.getvalue()

class GeneratorTests(unittest.TestCase):
    def test_synthetic_fixture_parses_three_real_gtfs_shapes(self):
        doc=generator.make_document(fixture())
        self.assertEqual(set(doc["routes"]),set(generator.NAMES))
        self.assertEqual(doc["source"],"BKK Zrt., CC BY 4.0")
        self.assertEqual(doc["routes"]["260"]["variants"][0]["shape"],[[19.02,47.51],[19.03,47.52]])
        self.assertEqual(doc["routes"]["17"]["variants"][0]["stops"][0]["name"],"17 Megálló")
        self.assertIn("NOT real-time",doc["feedType"])
    def test_missing_requested_line_fails_closed(self):
        raw=fixture()
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            parts={n:z.read(n) for n in z.namelist()}
        parts["routes.txt"]=parts["routes.txt"].replace(b"R19,19,",b"R19,319,")
        out=io.BytesIO()
        with zipfile.ZipFile(out,"w") as z:
            for k,v in parts.items():z.writestr(k,v)
        with self.assertRaises(RuntimeError):
            generator.make_document(out.getvalue())

if __name__=="__main__":
    unittest.main()
