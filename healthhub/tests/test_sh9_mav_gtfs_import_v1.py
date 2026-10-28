"""Offline smoke test of the licensed GTFS compiler. All records are synthetic."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'sh9/smart-travel/public-transport/mav/gtfs/build_gtfs_snapshot.py'

FILES = {
    'stops.txt': 'stop_id,stop_name,parent_station\nA,Budapest-Keleti,\nH,Miskolc-Tiszai,\nB,Kazincbarcika,\n',
    'routes.txt': 'route_id,route_short_name,route_long_name,route_type\nR,IC 5506,Sample test route,2\n',
    'trips.txt': 'route_id,service_id,trip_id,trip_headsign\nR,WD,T1,Kazincbarcika\n',
    'stop_times.txt': ('trip_id,arrival_time,departure_time,stop_id,stop_sequence\n'
                       'T1,16:55:00,16:55:00,A,1\n'
                       'T1,18:25:00,18:30:00,H,2\n'
                       'T1,19:25:00,19:25:00,B,3\n'),
    'calendar.txt': ('service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n'
                     'WD,1,1,1,1,1,0,0,20261001,20261130\n'),
    'calendar_dates.txt': 'service_id,date,exception_type\nWD,20261030,2\n'
}


class GTFSBuildTests(unittest.TestCase):
    def make_archive(self, directory, files=FILES):
        name=Path(directory)/'synthetic.zip'
        with zipfile.ZipFile(name,'w',compression=zipfile.ZIP_DEFLATED) as z:
            for item,body in files.items():
                z.writestr(item,body)
        return name

    def run_build(self, z, dest, *flags):
        return subprocess.run([sys.executable,str(SCRIPT),'--zip',str(z),
                               '--focus','Budapest-Keleti','--focus','Kazincbarcika',
                               '--output',str(dest),*flags],capture_output=True,text=True)

    def test_requires_explicit_rights_and_never_creates_output_without_them(self):
        with tempfile.TemporaryDirectory() as td:
            archive=self.make_archive(td)
            dest=Path(td)/'out.json'
            run=self.run_build(archive,dest)
            self.assertNotEqual(run.returncode,0)
            self.assertIn('--rights-confirmed',run.stderr)
            self.assertFalse(dest.exists())

    def test_valid_synthetic_zip_compiles_authorized_stop_times_and_exceptions(self):
        with tempfile.TemporaryDirectory() as td:
            archive=self.make_archive(td)
            dest=Path(td)/'out.json'
            run=self.run_build(archive,dest,'--rights-confirmed')
            self.assertEqual(run.returncode,0,run.stderr)
            data=json.loads(dest.read_text(encoding='utf-8'))
            self.assertEqual(data['schema'],'sh9-mav-gtfs-v1')
            self.assertEqual(data['timezone'],'Europe/Budapest')
            self.assertEqual(len(data['trips']),1)
            self.assertEqual(data['trips'][0]['stops'][0],['A',1015,1015])
            self.assertEqual(data['trips'][0]['stops'][-1],['B',1165,1165])
            self.assertEqual(data['services']['WD']['exceptions']['20261030'],2)
            self.assertTrue(data['rightsConfirmed'])
            second=self.run_build(archive,dest,'--rights-confirmed')
            self.assertNotEqual(second.returncode,0,'overwrite must require explicit --force')

    def test_missing_mandatory_file_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            files={k:v for k,v in FILES.items() if k!='stop_times.txt'}
            archive=self.make_archive(td,files)
            dest=Path(td)/'out.json'
            run=self.run_build(archive,dest,'--rights-confirmed')
            self.assertNotEqual(run.returncode,0)
            self.assertFalse(dest.exists())

if __name__=='__main__':
    unittest.main()
