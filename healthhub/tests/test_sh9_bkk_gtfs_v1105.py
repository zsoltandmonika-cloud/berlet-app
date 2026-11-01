"""SH9 BKK official GTFS ZIP offline converter tests, no external network."""
import importlib.util
import pathlib
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
BUILDER = ROOT / "sh9/smart-travel/lena-native/bkk/build_bkk_snapshot_v1105.py"
spec = importlib.util.spec_from_file_location("bkk_builder_v1105", BUILDER)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def fixture(path, *, bad_stop=False, missing_calendar=False, bad_time=False):
    docs = {
        "agency.txt": "agency_id,agency_name,agency_url,agency_timezone\nbkk,BKK,https://bkk.hu,Europe/Budapest\n",
        "routes.txt": "route_id,route_short_name,route_type\nr17,17,0\nr260,260,3\n",
        "trips.txt": "route_id,service_id,trip_id,trip_headsign\nr17,weekday,trip17,Vörösvári út\nr260,holiday,trip260,Szentlélek tér\n",
        "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\ns1,Szentlélek tér,47.537,19.046\ns2,Kolosy tér,47.527,19.036\ns3,Bécsi út / Vörösvári út,47.548,19.029\n",
        "stop_times.txt": (
            "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
            f"trip17,{'48:99:00' if bad_time else '10:00:00'},10:00:00,s1,1\n"
            "trip17,10:10:00,10:11:00,s2,2\n"
            f"trip17,10:20:00,10:20:00,{'missing' if bad_stop else 's3'},3\n"
            "trip260,24:00:00,24:00:00,s3,1\n"
            "trip260,24:30:00,24:30:00,s1,2\n"
        ),
        "calendar.txt": "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nweekday,1,1,1,1,1,0,0,20261101,20261130\n",
        "calendar_dates.txt": "service_id,date,exception_type\nholiday,20261101,1\nweekday,20261102,2\n",
    }
    if missing_calendar:
        docs.pop("calendar_dates.txt")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, text in docs.items():
            zf.writestr(name, text)


class BkkSnapshotTests(unittest.TestCase):
    def test_official_routes_only_with_exception_calendar(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file)
            result = builder.build(file, {"17", "260"}, "2026-11-01T12:00:00Z")
        self.assertEqual(result["schema"], "sh9.bkk.gtfs/1")
        self.assertEqual(result["source"], "BKK Zrt., CC BY 4.0")
        self.assertEqual(result["license"], "CC-BY-4.0")
        self.assertEqual(result["coverage"], "stop-to-stop")
        self.assertEqual(result["live"], False)
        self.assertEqual(result["routes"], ["17", "260"])
        self.assertEqual(result["routeModes"], {"17": "tram", "260": "bus"})
        self.assertEqual(len(result["trips"]), 2)
        self.assertEqual(len(result["stops"]), 3)
        self.assertEqual(result["services"]["weekday"]["exceptions"]["2026-11-02"], False)
        self.assertEqual(result["services"]["holiday"]["exceptions"]["2026-11-01"], True)
        self.assertIn([["s3", 86400, 86400], ["s1", 88200, 88200]],
                      [t[3] for t in result["trips"]])

    def test_missing_selected_line_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file)
            with self.assertRaisesRegex(ValueError, "No selected BKK route"):
                builder.build(file, {"999"}, "2026-11-01T12:00:00Z")

    def test_missing_referenced_stop_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file, bad_stop=True)
            with self.assertRaisesRegex(ValueError, "Missing referenced stops"):
                builder.build(file, {"17"}, "2026-11-01T12:00:00Z")

    def test_corrupt_service_calendar_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file, missing_calendar=True)
            with self.assertRaisesRegex(ValueError, "Missing calendar data"):
                builder.build(file, {"17", "260"}, "2026-11-01T12:00:00Z")

    def test_invalid_48_hour_time_fails_closed(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file, bad_time=True)
            with self.assertRaisesRegex(ValueError, "Invalid GTFS time"):
                builder.build(file, {"17"}, "2026-11-01T12:00:00Z")


if __name__ == "__main__":
    unittest.main()
