"""Synthetic BKK GTFS archive tests for official-only v806 route graph."""
import csv,importlib.util,io,json,unittest,zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("bkk_v806_net",HERE/"build-bkk-network-v806.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def build():
    route_names=["260","17","19","960"]+[str(1000+i) for i in range(105)]
    def table(header,body):
        out=io.StringIO();writer=csv.writer(out);writer.writerow(header);writer.writerows(body)
        return out.getvalue()
    stops=[["A","Próba tér",47.510,19.041],["B","Megálló utca",47.520,19.046],["C","Végállomás",47.530,19.052]]
    sources={
      "routes.txt":table(["route_id","route_short_name","route_type"],
        [[str(i),name,"0" if name=="17" else "3"] for i,name in enumerate(route_names)]),
      "trips.txt":table(["route_id","trip_id","direction_id","shape_id","trip_headsign"],
        [[str(i),"trip"+str(i),"0","shape"+str(i),"Végállomás"] for i in range(len(route_names))]),
      "stops.txt":table(["stop_id","stop_name","stop_lat","stop_lon"],stops),
      "stop_times.txt":table(["trip_id","stop_id","stop_sequence"],
        [["trip"+str(i),str(stop),str(j+1)] for i in range(len(route_names))
         for j,stop in enumerate(["A","B","C"])]),
    }
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w") as z:
        for name,data in sources.items():z.writestr(name,data)
    return out.getvalue()

class NetworkTests(unittest.TestCase):
    def test_all_lines_from_one_official_archive(self):
        network=module.make_network(build())
        self.assertEqual(network["schemaVersion"],1)
        self.assertEqual(network["source"],"BKK Zrt., CC BY 4.0")
        self.assertEqual(len(network["routes"]),108)
        self.assertIn("260",{x["id"] for x in network["routes"]})
        self.assertIn("17",{x["id"] for x in network["routes"]})
        self.assertNotIn("960",{x["id"] for x in network["routes"]})
        bus=next(x for x in network["routes"] if x["id"]=="260")
        self.assertEqual([st[0] for st in bus["stops"]],["A","B","C"])
        self.assertEqual(bus["stops"][0][2:],[47.51,19.041])
        self.assertEqual(bus["headsign"],"Végállomás")
        self.assertEqual(len(json.dumps(network,ensure_ascii=False))>0,True)
    def test_missing_stops_fails_closed(self):
        with zipfile.ZipFile(io.BytesIO(build())) as z:
            wrong=io.BytesIO()
            with zipfile.ZipFile(wrong,"w") as target:
                for name in z.namelist():
                    if name!="stops.txt":target.writestr(name,z.read(name))
        with self.assertRaises(ValueError):
            module.make_network(wrong.getvalue())

if __name__=="__main__":unittest.main()
