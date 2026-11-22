import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'verify.py'
spec = importlib.util.spec_from_file_location('backup_verify', SCRIPT)
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)

class RecoveryManifestTests(unittest.TestCase):
    def make_fixture(self, root):
        for req in verify.REQUIRED:
            p=root/req
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(b'safe-fixture\n')
        p=root/'supabase/storage/health-files/file.pdf'
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(b'%PDF-demo')

    def test_complete_bundle_manifest(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            self.make_fixture(root)
            m=verify.manifest(root, 'test-00001')
            self.assertEqual('CONTENT_CAPTURED_NOT_YET_REMOTE_VERIFIED',m['classification'])
            self.assertGreaterEqual(m['file_count'],len(verify.REQUIRED)+1)
            self.assertTrue(all(len(x['sha256'])==64 for x in m['files']))

    def test_missing_database_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            self.make_fixture(root)
            (root/'supabase/database.dump').unlink()
            with self.assertRaisesRegex(ValueError,'database.dump'):
                verify.manifest(root,'test')

    def test_missing_recovery_escrow_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            self.make_fixture(root)
            (root/'recovery/escrow.age').unlink()
            with self.assertRaisesRegex(ValueError,'escrow.age'):
                verify.manifest(root,'test')

    def test_empty_storage_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            self.make_fixture(root)
            (root/'supabase/storage/health-files/file.pdf').unlink()
            with self.assertRaisesRegex(ValueError,'Storage is empty'):
                verify.manifest(root,'test')

    def test_read_only_sources_and_no_unapproved_deletion(self):
        code=(SCRIPT.parent/'nightly-full-backup.sh').read_text()
        for dangerous in ['rclone sync','rclone delete','rclone purge','git push','DROP TABLE','DELETE FROM']:
            self.assertNotIn(dangerous,code)
        self.assertIn('rclone copyto',code)
        self.assertIn('cmp --silent',code)
        self.assertIn('--immutable',code)

if __name__=='__main__':
    unittest.main()
