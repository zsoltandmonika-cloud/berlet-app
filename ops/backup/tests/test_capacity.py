import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace

MODULE = Path(__file__).resolve().parents[1] / "check_capacity.py"
spec = importlib.util.spec_from_file_location("backup_capacity", MODULE)
capacity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capacity)


class BackupCapacityTests(unittest.TestCase):
    def test_standard_14_gib_runner_is_blocked(self):
        with self.assertRaisesRegex(RuntimeError, "too small"):
            capacity.check_capacity("/tmp", disk_usage=lambda _: SimpleNamespace(free=14 * capacity.GIB))

    def test_approved_250_gib_runner_passes(self):
        free = capacity.check_capacity("/tmp", disk_usage=lambda _: SimpleNamespace(free=250 * capacity.GIB))
        self.assertEqual(250 * capacity.GIB, free)

    def test_minimum_cannot_be_silently_reduced(self):
        with self.assertRaises(ValueError):
            capacity.check_capacity("/tmp", 14, disk_usage=lambda _: SimpleNamespace(free=300 * capacity.GIB))


if __name__ == "__main__":
    unittest.main()
