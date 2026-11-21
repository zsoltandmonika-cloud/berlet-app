# HealthHub · Léna Personal Insight Journal
## Tervezett funkció · 2026-10-18

A HealthHub három pillérének (Gondoskodás + Adatismeret + Intelligencia) kiterjesztése: beszélgetésalapú, diszkrét, ellenőrizhető, személyre szabott megfigyelési lábjegyzetek készítése a hosszú távú **Grand Analysis** támogatására.

### Cél és határok
- A HealthHub **Ask Léna** beszélgetéseinek lezárása után *külön engedélyezett* privát összefoglalók készülhetnek.
- A teljes ChatGPT-beszélgetésfolyamhoz a HealthHub nem kap automatikus hozzáférést. A jelen chatben megadott beleegyezés **nem** hoz létre háttérnaplózást, és nem jogosít másik profil nevében.
- Beszélgetésenként legyen elkülönítve: **közölt tény**, **megfigyelt tendencia**, **AI-hipotézis/értelmezés**, **felülvizsgálandó kérdés**.
- Mentális és fizikai egészséggel kapcsolatos megjegyzések csak a ténylegesen közölt tényekből; a kommunikációs stílus, humor vagy elgépelés **nem** elegendő mentális diagnózishoz.
- Eseti, explicit kérésre készült privát napló lehet „nem tolakodó”; **titkos**, megtekinthetetlen véleményprofil nem készülhet.

### Adatminimalizált bejegyzés
- profile_key, owner_authorization_id, session_ref, created_at, source_timestamp, source_turn_ref (ha rendelkezésre áll)
- note_category: reported_fact | trend_candidate | ai_hypothesis | follow_up
- domain: physical | mental_wellbeing | sleep | lifestyle | medication | other
- summary_hu, supporting_quote_or_ref, confidence_level, review_status, last_reviewed_at
- source_class: self_report | verified_document | measurement | ai_inference
- health-risk escalation only when safety threshold is met; never auto-change diagnoses or treatments
- informed_consent_at, retention_policy, access_audit_ref, provenance, model_revision

### Működés
1. **Külön per-profile opt-in**. Zsolt és Mónika eltérően engedélyezheti a funkciót.
2. Ha engedélyezett, beszélgetés végén rövid, forráshivatkozott kivonatot készít; nem a teljes chatet másolja korlát nélkül. Az eseti képek felhasználása és tartós archiválása külön jóváhagyást igényel.
3. **Grand Analysis:** csak ellenőrizhető, megfelelően kategorizált állításokat és trendsignálokat hasonlíthat össze; eltérő minőségű információkat nem egyesíthet bizonyított egészségügyi tényként.
4. **Proaktív elemzés:** először adatfrissüléskor és napi költségkorlátos ütemezéssel; a veszélyes eltérések jelezhetők, de a vizsgálat vagy kezelés módosítása szakember feladata.
5. **Átláthatóság:** a privát jegyzeteket tulajdonosuk megtekintheti, javíthatja, exportálhatja és töröltetheti. Nem kerülnek nyilvános repóba, analitikába vagy más profilba.
6. **Biztonság:** Supabase RLS, consent/version audit, profilok közötti tiltás, különleges személyes adatok védelme, adatmegőrzési korlát, sikeres hozzáférési tesztek.

### Nem kész funkció
Ez egy jóváhagyható implementációs követelmény, **nem aktív automatikus chatnapló**. A mostani projektből nem következik, hogy bármelyik chat automatikusan bekerül a Supabase-be, vagy hogy az alkalmazás hozzáfér a teljes ChatGPT-előzményhez.

### Kapcsolat az alapelvekkel
**Gondoskodás:** nem veszünk el releváns, általad kifejezetten megosztott összefüggést.
**Adatismeret:** minden megjegyzés bizonyítékszintje és eredete látszik.
**Intelligencia:** a következő elemzés jobb kérdéseket tesz fel, de nem téveszti össze a gyanút a ténnyel.
