#!/usr/bin/env python3
"""Offline fixture tests for public Interfood parser; no internet needed."""
import sys
import unittest
import datetime
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import interfood_live_sync_v1176 as parser

def item(n,cal=True):
    nutrition=(f"<p>{400+n} kcal, 30g szénh., 32g fehérje, 17g zsír</p>" if cal else "")
    return (f'<article><p>SP{n} - Sport és egészség</p>'
            f'<h3>Citrusos ebéd {n}</h3>{nutrition}'
            f'<p>{1900+n} Ft</p>'
            f'<img src="/food/{n}.jpg" alt="ételfotó"></article>')

class TestInterfoodPublicParser(unittest.TestCase):
    def test_complete_public_meals_and_images(self):
        html='<html><body><h1>46. hét</h1><h2>Sport és egészség</h2>' + \
            ''.join(item(i) for i in range(1,12)) + '</body></html>'
        result=parser.parse(html,datetime.datetime(2026,11,11,tzinfo=datetime.timezone.utc))
        self.assertEqual(len(result['items']),11)
        self.assertEqual(result['week'],46)
        self.assertIsNone(result['selectedDate'])
        first=next(x for x in result['items'] if x['code']=='SP1')
        self.assertEqual(first['name'],'Citrusos ebéd 1')
        self.assertEqual(first['nutrients']['kcal'],401)
        self.assertEqual(first['nutrients']['protein'],32)
        self.assertEqual(first['imageUrl'],'https://rendel.interfood.hu/food/1.jpg')
        self.assertEqual(first['nutritionBasis'],'published-per-serving')

    def test_missing_nutrition_is_unknown(self):
        html='<html><body><h2>Főétel</h2>'+item(1,False)+'</body></html>'
        result=parser.parse(html,datetime.datetime.now(datetime.timezone.utc))
        self.assertEqual(result['items'][0]['nutrients'],
            {'kcal':None,'protein':None,'carbs':None,'fat':None})

    def test_direct_api_uses_real_serving_grams_and_published_macros(self):
        data={"error":False,"data":{"25":{
         "name":"Sport és egészség","categories":[{
            "code":"SP1","name":"Sport és egészség",
            "items":[{"id":39937,"date":"2026-11-09","price":1995,
                      "food":{"name":"Jércesteak joghurtos almás kukoricasalátával","image_id":10356},
                      "food_name_one":"Jércesteak joghurtos almás kukoricasalátával",
                      "weight_food_one":420,"energy_portion_food_one":527,
                      "fat_portion_food_one":19.3,"carb_portion_food_one":42.7,
                      "protein_portion_food_one":49.8,
                      "weight_food_two":0,"energy_portion_food_two":0,
                      "food_name_two":"","weight_food_three":0,"food_name_three":""}]
         }]}}}
        now=datetime.datetime(2026,11,11,tzinfo=datetime.timezone.utc)
        result=parser.parse_public_api(data,2026,46,now)
        self.assertEqual(len(result["items"]),1)
        card=result["items"][0]
        self.assertEqual(card["nutrients"],{"kcal":527,"protein":49.8,"carbs":42.7,"fat":19.3})
        self.assertEqual(card["weightGrams"],420)
        self.assertEqual(card["menuDate"],"2026-11-09")
        self.assertEqual(card["code"],"SP1")
        self.assertEqual(card["imageUrl"],"https://ia.interfood.hu/api/v1/i?menu_item_id=39937&width=425&height=425") # Official site image endpoint, not food.image_id
        self.assertEqual(card["imageId"],"10356")
        self.assertEqual(card["nutritionBasis"],"published-per-serving")

    def test_multi_component_food_sums_real_labels(self):
        row={"food_name_one":"Főétel","weight_food_one":240,
             "energy_portion_food_one":300,"protein_portion_food_one":25,
             "carb_portion_food_one":20,"fat_portion_food_one":14,
             "food_name_two":"Köret","weight_food_two":160,
             "energy_portion_food_two":180,"protein_portion_food_two":3,
             "carb_portion_food_two":30,"fat_portion_food_two":5,
             "food_name_three":"","weight_food_three":0}
        n,weight=parser.nutrition_and_weight(row)
        self.assertEqual(weight,400)
        self.assertEqual(n,{"kcal":480,"protein":28,"carbs":50,"fat":19})
        del row["protein_portion_food_two"]
        n,_=parser.nutrition_and_weight(row)
        self.assertIsNone(n["protein"]) # missing is unknown, never 0

    def test_untrusted_images_are_rejected(self):
        self.assertIsNone(parser.trusted_image('https://evil.example/menu.jpg'))
        self.assertIsNone(parser.trusted_image('javascript:alert(1)'))
        self.assertIsNone(parser.trusted_image('/images/placeholder.png'))
        self.assertEqual(parser.trusted_image('https://cdn.interfood.hu/foods/a.webp'),
                         'https://cdn.interfood.hu/foods/a.webp')

    def test_duplicate_labels_do_not_make_duplicate_cards(self):
        s=item(1)+item(1)
        result=parser.parse('<body>'+s+'</body>',
                datetime.datetime.now(datetime.timezone.utc))
        self.assertEqual(len(result['items']),1)

if __name__=='__main__':unittest.main()
