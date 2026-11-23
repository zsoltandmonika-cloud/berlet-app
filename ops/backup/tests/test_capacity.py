import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

MODULE = Path(__file__).resolve().parents[1] / "check_capacity.py"
spec = importlib.util.spec_from_file_location("backup_capacity", MODULE)
capacity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capacity)


class BackupCapacityTests(unittest.TestCase):
    def test_actual_small_sources_can_use_standard_runner(self):
        # Two Dropbox vaults + Supabase Storage are currently about 1.44 GB.
        source_bytes = 1_434_000_000
        free, required = capacity.check_capacity(
            "/tmp", source_bytes,
            disk_usage=lambda _: SimpleNamespace(free=14 * capacity.GIB))
        self.assertEqual(free, 14 * capacity.GIB)
        self.assertLess(required, 14 * capacity.GIB)

    def test_large_45_gb_sources_fail_closed(self):
        with self.assertRaisesRegex(RuntimeError, "insufficient"):
            capacity.check_capacity("/tmp", 45 * capacity.GIB,
                                    disk_usage=lambda _: SimpleNamespace(free=14 * capacity.GIB))

    def test_runner_with_insufficient_disk_fails(self):
        with self.assertRaises(RuntimeError):
            capacity.check_capacity("/tmp", 2 * capacity.GIB,
                                    disk_usage=lambda _: SimpleNamespace(free=10 * capacity.GIB))

    def test_reserve_cannot_be_silently_reduced(self):
        with self.assertRaises(ValueError):
            capacity.required_bytes(100, 0)

    def test_missing_negative_source_sizes_are_rejected(self):
        for invalid in (-1, None, 1.2, "10"):
            with self.assertRaises(ValueError):
                capacity.required_bytes(invalid)


if __name__ == "__main__":
    unittest.main()
