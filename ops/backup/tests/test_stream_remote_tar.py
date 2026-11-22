"""Mock-only tests. Never uses real rclone or external credentials."""
import importlib.util
import io
import json
import os
import stat
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SOURCE = Path(__file__).resolve().parents[1] / "stream_remote_tar.py"
spec = importlib.util.spec_from_file_location("stream_remote_tar", SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class RemoteStreamTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        p = Path(self.tmp.name) / "rclone"
        p.write_text("""#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
if args[0]=='lsjson':
  if os.getenv('EMPTY')=='1': print('[]'); sys.exit(0)
  entries=[{'Path':'one.txt','Size':3,'ModTime':'2026-11-22T00:00:00Z'},
           {'Path':'nested/two.txt','Size':8 if os.getenv('BAD')=='1' else (2 if os.getenv('BAD')=='2' else 4),'ModTime':'2026-11-22T00:00:00Z'}]
  if os.getenv('EVOLVING')=='1':
    stamp=os.getenv('CALL_FILE')
    count=int(open(stamp).read()) if os.path.exists(stamp) else 0
    open(stamp,'w').write(str(count+1))
    if count>=1: entries[0]['ModTime']='2026-11-23T00:00:00Z'
  print(json.dumps(entries))
elif args[0]=='cat':
  if args[1].endswith('/one.txt'): sys.stdout.write('ONE')
  elif args[1].endswith('/nested/two.txt'): sys.stdout.write('TWO!')
  else: sys.exit(1)
else: sys.exit(2)
""")
        p.chmod(p.stat().st_mode | stat.S_IXUSR)
        self.env = mock.patch.dict(os.environ, {"PATH": self.tmp.name + os.pathsep + os.environ["PATH"]})
        self.env.start()

    def tearDown(self):
        self.env.stop()
        self.tmp.cleanup()

    def test_tar_contains_exact_contents_and_audit_inventory(self):
        sink = io.BytesIO()
        e = mod.stream("dropbox:Apps/test", sink)
        self.assertEqual(e["file_count"], 2)
        self.assertEqual(e["total_bytes"], 7)
        with tarfile.open(fileobj=io.BytesIO(sink.getvalue())) as archive:
            self.assertEqual(archive.extractfile("payload/one.txt").read(), b"ONE")
            self.assertEqual(archive.extractfile("payload/nested/two.txt").read(), b"TWO!")
            inventory = json.loads(archive.extractfile("_sho_inventory.json").read())
            self.assertEqual(inventory["file_count"], 2)

    def test_missing_and_truncated_sources_fail_closed(self):
        with mock.patch.dict(os.environ, {"EMPTY": "1"}):
            with self.assertRaisesRegex(ValueError, "no files"):
                mod.stream("dropbox:Apps/test", io.BytesIO())
        with mock.patch.dict(os.environ, {"BAD": "1"}):
            with self.assertRaises((OSError, tarfile.TarError, RuntimeError)):
                mod.stream("dropbox:Apps/test", io.BytesIO())

    def test_excess_bytes_rejected(self):
        with mock.patch.dict(os.environ, {"BAD": "2"}):
            with self.assertRaisesRegex(RuntimeError, "exceeded its declared size"):
                mod.stream("dropbox:Apps/test", io.BytesIO())

    def test_manual_script_never_schedules_or_mutates_source(self):
        script = (SOURCE.parent / "incremental-staging.sh").read_text()
        workflow = (SOURCE.parents[2] / ".github/workflows/sho-restic-incremental-staging.yml").read_text()
        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("schedule:", workflow)
        self.assertIn("authorize_read_only_capture", workflow)
        self.assertIn("github.event.repository.private == true", workflow)
        self.assertIn("RESTIC_PASSWORD", workflow)
        full_workflow = (SOURCE.parents[2] / ".github/workflows/sho-onedrive-full-backup-nightly.yml").read_text()
        self.assertIn("github.event.repository.private == true", full_workflow)
        self.assertIn("SHO_BACKUP_CAPTURE_AUTHORIZED", script)
        self.assertIn("--stdin --stdin-filename", script)
        self.assertIn("set -Eeuo pipefail", script)
        self.assertIn("restic check --read-data", script)
        self.assertIn("metadata_restore_smoke_tested", script)
        self.assertIn("full_system': False", script)
        self.assertNotIn("rclone sync", script)
        self.assertNotIn("rclone delete", script)
        self.assertNotIn("restic forget", script)
        self.assertNotIn("restic prune", script)

    def test_private_runner_template_is_pinned_secret_scoped_and_manual_only(self):
        private = (SOURCE.parent / "private-runner/backup-staging.template.yml").read_text()
        self.assertIn("workflow_dispatch:", private)
        self.assertNotIn("schedule:", private)
        self.assertNotIn("pull_request:", private)
        self.assertIn("github.event.repository.private == true", private)
        self.assertIn("authorize_read_only_capture", private)
        self.assertIn("environment: sho-backup-staging", private)
        self.assertIn("persist-credentials: false", private)
        self.assertIn("ref: 32839d2ddccb99641e003196c5775e4efa754529", private)
        self.assertIn("RESTIC_PASSWORD: ${{ secrets.SHO_RESTIC_PASSWORD }}", private)
        self.assertNotIn("sudo gh secret", private)

    def test_source_changed_between_listing_passes_is_rejected(self):
        with mock.patch.dict(os.environ, {"EVOLVING": "1", "CALL_FILE": str(Path(self.tmp.name)/"count")}):
            with self.assertRaisesRegex(RuntimeError, "changed during capture"):
                mod.stream("dropbox:Apps/test", io.BytesIO())

    def test_disallow_traversal_duplicate_and_windows_paths(self):
        for value in ("../bad", "/abs", "dir/../../bad", "x\\y", "x//y", "x/./y", ""):
            with self.assertRaises(ValueError):
                mod.safe_path(value)


if __name__ == "__main__":
    unittest.main()
