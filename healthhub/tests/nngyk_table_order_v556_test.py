"""NNGYK PDF table-order regression tests using validated representative table rows."""
from __future__ import annotations
import importlib.util
import pathlib
import unittest
from unittest.mock import patch

SCRIPT=pathlib.Path(__file__).resolve().parents[1]/"scripts"/"update_infection_watch.py"
spec=importlib.util.spec_from_file_location("hh_nngyk_updater",SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class Page:
    def __init__(self,text="",rows=None):
        self.text=text
        self.rows=rows or []
    def extract_text(self):
        return self.text
    def extract_tables(self,**kwargs):
        return [self.rows]

class Pdf:
    def __init__(self,pages):
        self.pages=pages
    def __enter__(self):
        return self
    def __exit__(self,*args):
        return False

national=Page(rows=[
    ["Betegség","40. hét 2026","40. hét 2025","Medián 2020-2024"],
    ["Hepatitis A","28","49","3"],
])
territorial=Page(rows=[
    ["Terület","Campylobacteriosis","Salmonellosis","Rotavírus","Hepatitis infectiosa","Hepatitis A"],
    ["Budapest","22","8","8","3","-"],
    ["Összesen (Total)","107","100","27","38","28"],
])
header=Page(text="Heti tájékoztató a hazai járványügyi helyzetről 2026. 40. hét")

class NNGYKTableOrderTests(unittest.TestCase):
    def check_order(self,second,third):
        with patch.object(mod.pdfplumber,"open",return_value=Pdf([header,second,third])):
            out=mod.extract_pdf(b"%PDF representative table source",(2026,40))
        self.assertEqual(out["week"],[2026,40])
        self.assertEqual(out["budapest"],{
            "campylobacteriosis":22,"salmonellosis":8,"rotavirus":8,"hepatitisA":0,
        })
        self.assertEqual(out["national"],{"hepatitisA":28,"hepatitisMedian":3})
    def test_nngyk_week_40_new_order(self):
        self.check_order(national,territorial)
    def test_prior_week_old_order(self):
        self.check_order(territorial,national)
    def test_missing_national_row_fails_closed(self):
        missing=Page(rows=[["Betegség","2026"],["Morbilli","1"]])
        with patch.object(mod.pdfplumber,"open",return_value=Pdf([header,territorial,missing])):
            with self.assertRaisesRegex(ValueError,"national"):
                mod.extract_pdf(b"%PDF representative table source",(2026,40))
    def test_mismatching_total_fails_closed(self):
        corrupt=Page(rows=[
            ["Terület","Campy","Salmonella","Rotavirus","Hepatitis infectiosa","Hepatitis A"],
            ["Budapest","22","8","8","3","-"],
            ["Összesen (Total)","107","100","27","38","99"],
        ])
        with patch.object(mod.pdfplumber,"open",return_value=Pdf([header,national,corrupt])):
            with self.assertRaisesRegex(ValueError,"cross-check failed"):
                mod.extract_pdf(b"%PDF representative table source",(2026,40))

if __name__=="__main__":
    unittest.main()
