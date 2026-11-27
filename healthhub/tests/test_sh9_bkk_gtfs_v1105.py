"""SH9 BKK official GTFS ZIP offline converter tests, no external network."""
import importlib.util
import pathlib
import os
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
BUILDER = ROOT / "sh9/smart-travel/lena-native/bkk/build_bkk_snapshot_v1105.py"
spec = importlib.util.spec_from_file_location("bkk_builder_v1105", BUILDER)
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def fixture(path, *, bad_stop=False, missing_calendar=False, bad_time=False, mixed=False):
    docs = {
        "agency.txt": "agency_id,agency_name,agency_url,agency_timezone\nbkk,BKK,https://bkk.hu,Europe/Budapest\n",
        "routes.txt": "route_id,route_short_name,route_type\nr17,17,0\nr260,260,3\n",
        "trips.txt": "route_id,service_id,trip_id,trip_headsign\nr17,weekday,trip17,Vörösvári út\nr260,holiday,trip260,Szentlélek tér\n",
        "stops.txt": "stop_id,stop_name,stop_lat,stop_lon\ns1,Szentlélek tér,47.537,19.046\ns2,Kolosy tér,47.527,19.036\ns3,Bécsi út / Vörösvári út,47.548,19.029\ns4,Deák Ferenc tér,47.497,19.055\n",
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
    if mixed:
        docs["routes.txt"] += "r17bus,17,3\n"
        docs["trips.txt"] += "r17bus,weekday,trip17bus,17 pótlóbusz\n"
        docs["stop_times.txt"] += ("trip17bus,11:00:00,11:00:00,s1,1\n"
                                    "trip17bus,11:20:00,11:20:00,s3,2\n")
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
        self.assertEqual({t[0]: t[4] for t in result["trips"]},
                         {"17": "tram", "260": "bus"})
        self.assertEqual(len(result["trips"]), 2)
        self.assertEqual(len(result["stops"]), 3)
        self.assertIn("Deák Ferenc tér", result["searchStops"])
        self.assertEqual(len(result["searchStops"]), 4)
        self.assertNotIn("s4", result["stops"])  # available in predictions, never routed
        self.assertEqual(result["services"]["weekday"]["exceptions"]["2026-11-02"], False)
        self.assertEqual(result["services"]["holiday"]["exceptions"]["2026-11-01"], True)
        self.assertIn([["s3", 86400, 86400], ["s1", 88200, 88200]],
                      [t[3] for t in result["trips"]])

    def test_shared_short_name_preserves_rail_and_replacement_bus(self):
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file, mixed=True)
            result = builder.build(file, {"17"}, "2026-11-01T12:00:00Z")
        self.assertEqual(result["routes"], ["17"])
        self.assertEqual({t[4] for t in result["trips"]}, {"tram", "bus"})
        self.assertEqual(len(result["trips"]), 2)

    def test_seasonal_capacity_and_hard_stop_time_limit(self):
        self.assertEqual(builder.INITIAL_STOP_TIMES, 400000)
        self.assertEqual(builder.MAX_STOP_TIMES, 2000000)
        self.assertEqual(builder.STOP_TIME_WARNING, 1600000)
        self.assertEqual(builder.MAX_OUTPUT, 9 * 1024 * 1024)
        for count, expected in [(400000, 400000), (400001, 600000),
                                (600001, 900000), (900001, 1350000),
                                (1350001, 2000000), (2000000, 2000000)]:
            self.assertEqual(builder.capacity_for(count), expected)
        with self.assertRaisesRegex(ValueError, "2000001 > 2000000"):
            builder.capacity_for(2000001)
        with tempfile.TemporaryDirectory() as temp:
            file = pathlib.Path(temp) / "gtfs.zip"
            fixture(file)
            with patch.object(builder, "INITIAL_STOP_TIMES", 2), patch.object(builder, "MAX_STOP_TIMES", 5):
                result = builder.build(file, {"17", "260"}, "2026-11-01T12:00:00Z")
                self.assertEqual(sum(len(t[3]) for t in result["trips"]), 5)
                self.assertEqual(result["capacity"], {"selectedStopTimeRows": 5, "allocatedRows": 5, "hardCapRows": 5})
            with patch.object(builder, "INITIAL_STOP_TIMES", 2), patch.object(builder, "MAX_STOP_TIMES", 4):
                with self.assertRaisesRegex(ValueError, "5 > 4"):
                    builder.build(file, {"17", "260"}, "2026-11-01T12:00:00Z")

    @unittest.skipUnless(os.environ.get("SHO_BKK_STRESS_TEST") == "1", "isolated CI stress only")
    def test_two_million_input_rows_respect_independent_mobile_budget(self):
        # Real streaming CSV / ZIP parsing at the approved input ceiling.
        # This deliberately cannot fit the separate 9 MiB mobile JSON gate.
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp) / "stress.zip"
            with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
                z.writestr("agency.txt", "agency_id,agency_name,agency_url,agency_timezone\nbkk,BKK,https://bkk.hu,Europe/Budapest\n")
                z.writestr("routes.txt", "route_id,route_short_name,route_type\nr17,17,0\n")
                z.writestr("trips.txt", "route_id,service_id,trip_id,trip_headsign\n" +
                           "".join(f"r17,daily,t{i},Test\n" for i in range(4000)))
                z.writestr("stops.txt", "stop_id,stop_name,stop_lat,stop_lon\ns1,Test stop,47.5,19.02\n")
                z.writestr("calendar.txt", "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ndaily,1,1,1,1,1,1,1,20261101,20261231\n")
                with z.open("stop_times.txt", "w") as stream:
                    stream.write(b"trip_id,arrival_time,departure_time,stop_id,stop_sequence\n")
                    for i in range(4000):
                        stream.write("".join(f"t{i},00:00:00,00:00:00,s1,{j}\n" for j in range(1,501)).encode())
            with self.assertRaisesRegex(ValueError, "mobile budget retained"):
                builder.build(path, {"17"}, "2026-11-27T12:00:00Z")

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
            with self.assertRaisesRegex(ValueError, "Out-of-range GTFS time"):
                builder.build(file, {"17"}, "2026-11-01T12:00:00Z")


if __name__ == "__main__":
    unittest.main()
