"""SH9 v1106 release gate tests, entirely synthetic GTFS snapshots."""
import importlib.util
import datetime as dt
import hashlib
import json
import pathlib
import tempfile
import unittest

HERE=pathlib.Path(__file__).resolve().parents[2]
MODULE=HERE/"sh9/smart-travel/lena-native/bkk/validate_bkk_snapshot_v1106.py"
spec=importlib.util.spec_from_file_location("sh9_bkk_publish_v1106", MODULE)
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
UTC=dt.timezone.utc
NOW=dt.datetime(2026,11,1,12,0,tzinfo=UTC)


def fixture(now=NOW):
    generated=(now-dt.timedelta(minutes=3)).isoformat().replace("+00:00","Z")
    stops={f"s{i}":[f"Fiktív {i} megálló",47.5+i/10000,19.02] for i in range(51)}
    trips=[]
    for i in range(1200):
        line=("17","19","41","260")[i%4]
        mode="bus" if line=="260" else "tram"
        trips.append([line,"daily",f"Teszt {i}",[
            ["s1",36000,36000],["s2",36600,36600]
        ],mode])
    return {"schema":"sh9.bkk.gtfs/1","source":gate.SOURCE,
        "sourceUrl":gate.URL,"license":gate.LICENSE,
        "coverage":"stop-to-stop","live":False,
        "generatedAt":generated,
        "feedStart":"2026-10-30","feedEnd":"2026-12-01",
        "routes":list(gate.LINES),
        "stops":stops,"trips":trips,
        "services":{"daily":{"start":"2026-10-30","end":"2026-12-01",
          "days":[1,1,1,1,1,1,1],"exceptions":{}}}}


class PublishGateTests(unittest.TestCase):
    def test_valid_pilot_snapshot(self):
        result=gate.check_data(fixture(), NOW)
        self.assertEqual(result["tripCount"],1200)
        self.assertEqual(result["stopCount"],51)
        self.assertEqual(result["routes"],list(gate.LINES))

    def test_expired_data_fails_even_if_recently_generated(self):
        data=fixture()
        data["feedEnd"]="2026-11-01"
        with self.assertRaisesRegex(ValueError,"cover"):
            gate.check_data(data,NOW)

    def test_missing_family_route_fails(self):
        data=fixture()
        data["routes"].remove("260")
        with self.assertRaisesRegex(ValueError,"route set"):
            gate.check_data(data,NOW)

    def test_missing_live_service_fails(self):
        data=fixture()
        data["services"]["daily"]["end"]="2026-10-31"
        with self.assertRaisesRegex(ValueError,"scheduled service"):
            gate.check_data(data,NOW)

    def test_tampered_license_or_coverage_fails(self):
        for key,value in [("license","CC0"),("live",True),("coverage","door-to-door")]:
            data=fixture();data[key]=value
            with self.assertRaisesRegex(ValueError,"license"):
                gate.check_data(data,NOW)

    def test_corrupt_trip_and_missing_stop_fail(self):
        for invalid in ("bad_mode","bad_stop","bad_order"):
            data=fixture()
            if invalid=="bad_mode":data["trips"][0][4]="airplane"
            if invalid=="bad_stop":data["trips"][0][3][0][0]="missing"
            if invalid=="bad_order":data["trips"][0][3][1][1]=300
            with self.assertRaisesRegex(ValueError,"Invalid|Corrupt"):
                gate.check_data(data,NOW)

    def test_backward_coverage_drop_refused(self):
        old=fixture()
        new=fixture()
        new["trips"]=new["trips"][:200]
        with self.assertRaisesRegex(ValueError,"size|45%"):
            gate.check_data(new,NOW,old)

    def test_manifest_hash_matches_exact_bytes(self):
        with tempfile.TemporaryDirectory() as dir:
            path=pathlib.Path(dir)/"data.json"
            encoded=json.dumps(fixture(),ensure_ascii=False).encode("utf-8")
            path.write_bytes(encoded)
            result=gate.validate_file(path,NOW,source_sha256='a'*64)
            self.assertEqual(result["sha256"],hashlib.sha256(encoded).hexdigest())
            self.assertEqual(result["bytes"],len(encoded))
            self.assertEqual(result["sourceSha256"],"a"*64)
            self.assertEqual(result["schema"],"sh9.bkk.feed-manifest/1")
            self.assertEqual(result["license"],"CC-BY-4.0")

    def test_reuse_validated_unchanged_official_feed_without_rebuild(self):
        data=fixture()
        data["generatedAt"]=(NOW-dt.timedelta(days=5)).isoformat().replace("+00:00","Z")
        result=gate.check_data(data,NOW)
        self.assertEqual(result["tripCount"],1200)

    def test_reject_snapshot_older_than_fourteen_days(self):
        data=fixture()
        data["generatedAt"]=(NOW-dt.timedelta(days=15)).isoformat().replace("+00:00","Z")
        with self.assertRaisesRegex(ValueError,"stale"):
            gate.check_data(data,NOW)

    def test_provenance_digest_required(self):
        with tempfile.TemporaryDirectory() as dir:
            path=pathlib.Path(dir)/"feed.json"
            path.write_text(json.dumps(fixture()),encoding="utf-8")
            with self.assertRaisesRegex(ValueError,"provenance"):
                gate.validate_file(path,NOW)

    def test_stale_processing_timestamp_refused(self):
        data=fixture()
        data["generatedAt"]="2026-10-30T01:00:00Z"
        with self.assertRaisesRegex(ValueError,"stale"):
            gate.check_data(data,NOW)

if __name__=="__main__":
    unittest.main()
