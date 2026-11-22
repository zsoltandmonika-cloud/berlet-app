import importlib.util
import unittest
from pathlib import Path

P = Path(__file__).resolve().parents[1] / 'retention_plan.py'
spec = importlib.util.spec_from_file_location('retention_plan', P)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class RetentionTests(unittest.TestCase):
    def test_daily_and_monthly_recovery_points_survive(self):
        from datetime import date, timedelta
        start = date(2026, 1, 1)
        ids = []
        for n in range(400):
            d = start + timedelta(days=n)
            ids.append(d.strftime('%Y%m%d') + 'T001500Z-100')
        selected = mod.keep_sets(ids)
        self.assertEqual(30, len(selected['daily_keep']))
        self.assertEqual(12, len(selected['monthly_keep']))
        self.assertIn(ids[-1], selected['keep'])
        self.assertIn(ids[0], selected['eligible_after_manual_restore_approval'])
        self.assertEqual(len(ids), len(selected['keep'])+len(selected['eligible_after_manual_restore_approval']))

    def test_ignore_non_verified_and_nonstandard_paths(self):
        v = mod.keep_sets(['_setup-check','20261122T001500Z-17','malformed'])
        self.assertEqual(['20261122T001500Z-17'], v['keep'])

    def test_monthly_keeps_latest_verified_entry_not_first(self):
        a=mod.keep_sets(['20260901T001500Z-3','20260920T001500Z-4','20261001T001500Z-5'])
        self.assertEqual(['20261001T001500Z-5','20260920T001500Z-4'],a['monthly_keep'])


if __name__ == '__main__':
    unittest.main()
