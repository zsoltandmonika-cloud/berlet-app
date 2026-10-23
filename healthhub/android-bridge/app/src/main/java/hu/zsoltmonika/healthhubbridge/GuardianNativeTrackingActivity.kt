package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Consent/control surface: native Google authorization, owner-bound continuous
 * GPS, permanent notification and explicit STOP. There is no silent auto-start
 * on installation or on another family member's device.
 */
class GuardianNativeTrackingActivity:ComponentActivity(){
    private val work=CoroutineScope(SupervisorJob()+Dispatchers.Main)
    private lateinit var status:TextView
    private lateinit var startButton:Button
    private lateinit var stopButton:Button

    private val locationPermission=registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ){p->
        val granted=p[Manifest.permission.ACCESS_FINE_LOCATION]==true||
            p[Manifest.permission.ACCESS_COARSE_LOCATION]==true
        if(granted)attemptStart()else show("A GPS-hozzáférés nélkül nincs helymegosztás.")
    }
    private val notificationPermission=registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ){attemptStart()}

    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        setContentView(buildUi())
        receiveCallback(intent)
        refreshUi()
    }
    override fun onNewIntent(intent:Intent){
        super.onNewIntent(intent)
        setIntent(intent);receiveCallback(intent)
    }
    private fun show(message:String){status.text=message}
    private fun buildUi():View{
        val wrap=ScrollView(this).apply{setBackgroundColor(0xFFEDF6FD.toInt())}
        val root=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            setPadding(28,28,28,28)
        }
        wrap.addView(root)
        fun label(value:String,size:Float=15f):TextView=
            TextView(this).apply{
                text=value;textSize=size;setTextColor(0xFF113457.toInt())
                setPadding(0,12,0,12)
            }
        root.addView(label("🛡️ HH One · Native Family Guard",23f))
        root.addView(label(
            "Folyamatos, önkéntesen engedélyezett GPS-megosztás lezárt képernyővel is. "+
            "A rendszer állandó Android-értesítést mutat, innen bármikor leállítható. "+
            "Más profilját és telefonját nem követi. A pozíciók csak a hitelesített "+
            "családi Supabase-hozzáféréssel kerülnek a Family Guardba.",14f))
        status=label("Állapot ellenőrzése…",15f);root.addView(status)
        root.addView(Button(this).apply{
            text="🔐 Google-bejelentkezés a natív követéshez"
            setOnClickListener{
                try{
                    val url=GuardianNativeAuth.loginUrl(this@GuardianNativeTrackingActivity)
                    startActivity(Intent(Intent.ACTION_VIEW,Uri.parse(url)))
                    show("Google-azonosítás megnyitva. Visszatérés után engedélyezheted a GPS-t.")
                }catch(e:Exception){show("Bejelentkezés nem indítható: ${e.message}")}
            }
        })
        startButton=Button(this).apply{
            text="📍 FOLYAMATOS HÁTTÉR GPS · INDÍTÁS"
            setOnClickListener{requestAndStart()}
        };root.addView(startButton)
        stopButton=Button(this).apply{
            text="■ HELYMEGOSZTÁS LEÁLLÍTÁSA"
            setOnClickListener{
                GuardianNativeAuth.stop(this@GuardianNativeTrackingActivity)
                GuardianNativeAuth.markRevocationPending(this@GuardianNativeTrackingActivity)
                val service=Intent(this@GuardianNativeTrackingActivity,GuardianLocationService::class.java)
                    .setAction(GuardianLocationService.ACTION_STOP)
                // This is an explicit user tap while the Activity is visible.
                startService(service)
                work.launch{
                    GuardianNativeAuth.retryRevocation(this@GuardianNativeTrackingActivity)
                    refreshUi()
                }
            }
        };root.addView(stopButton)
        root.addView(Button(this).apply{
            text="🔄 Állapot frissítése"
            setOnClickListener{refreshUi()}
        })
        root.addView(label(
            "Fontos: a képernyő lezárása NEM állítja le a natív szolgáltatást. "+
            "A telefon kikapcsolása, kényszerített leállítása, GPS/Internet hiánya "+
            "vagy Android-energiagazdálkodása továbbra is megszakíthatja az adatfolyamot. "+
            "Csak friss, tényleges GPS-mérés kerül élőként a felhőbe.",12f))
        return wrap
    }
    private fun receiveCallback(intent:Intent?){
        val uri=intent?.data?:return
        if(uri.scheme!="healthhubconnect"||uri.host!="guardian-auth")return
        if(uri.getQueryParameter("error")!=null){
            show("Google-belépés megszakadt: ${uri.getQueryParameter("error_description")?:"hitelesítési hiba"}")
            return
        }
        work.launch{
            show("Google-hitelesítés és családi jogosultság ellenőrzése…")
            try{
                val profile=GuardianNativeAuth.acceptCallback(this@GuardianNativeTrackingActivity,uri)
                show("✓ Hitelesített, ${if(profile=="monika")"Mónika" else "Zsolt"} profilhoz kötött telefon. GPS külön engedélyezhető.")
            }catch(e:Exception){show("Hitelesítési hiba: ${e.message}")}
        }
    }
    private fun requestAndStart(){
        if(GuardianNativeAuth.ownProfile(this)==null){
            show("Előbb nyisd meg a HH One főképernyőjét, és rendeld a telefont a tulajdonos profiljához.")
            return
        }
        if(!GuardianNativeAuth.hasSession(this)){
            show("Előbb jelentkezz be Google-fiókkal a natív követéshez.")
            return
        }
        val fine=ContextCompat.checkSelfPermission(this,Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED
        val coarse=ContextCompat.checkSelfPermission(this,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
        if(!fine&&!coarse){
            locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION))
            return
        }
        if(Build.VERSION.SDK_INT>=33&&
            ContextCompat.checkSelfPermission(this,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            return
        }
        attemptStart()
    }
    private fun attemptStart(){
        work.launch{
            show("Fiók, profiltulajdonos és felhőjogosultság ellenőrzése…")
            try{
                // First finish a pending previous STOP before permitting a new sharing session.
                if(!GuardianNativeAuth.retryRevocation(this@GuardianNativeTrackingActivity)){
                    show("A korábbi helymegosztás távoli visszavonása még nem sikerült.")
                    return@launch
                }
                val who=GuardianNativeAuth.identity(this@GuardianNativeTrackingActivity)
                    ?:run{show("Hibás vagy lejárt családi Google-jogosultság. Jelentkezz be újra.");return@launch}
                if(who.first!=GuardianNativeAuth.ownProfile(this@GuardianNativeTrackingActivity))return@launch
                GuardianNativeAuth.setEnabled(this@GuardianNativeTrackingActivity,true)
                val service=Intent(this@GuardianNativeTrackingActivity,GuardianLocationService::class.java)
                    .setAction(GuardianLocationService.ACTION_START)
                ContextCompat.startForegroundService(this@GuardianNativeTrackingActivity,service)
                show("Natív GPS-szolgáltatás indítva. Kövesd a tartós értesítés állapotát.")
                refreshUi()
            }catch(e:Exception){
                GuardianNativeAuth.stop(this@GuardianNativeTrackingActivity)
                show("Nem indult a követés: ${e.message}")
            }
        }
    }
    private fun refreshUi(){
        val p=GuardianNativeAuth.ownProfile(this)
        val active=GuardianNativeAuth.isEnabled(this)
        val pref=getSharedPreferences("guardian_native_v808",MODE_PRIVATE)
        val last=pref.getLong("last_cloud_confirmed_fix_ms",0)
        val whenLast=if(last>0)SimpleDateFormat("yyyy.MM.dd. HH:mm:ss",Locale("hu","HU")).format(Date(last))
            else "még nincs igazolt feltöltés"
        val statusText=pref.getString("native_state",null)?:"Nincs még natív GPS-eredmény"
        show("Telefon tulajdonosa: ${p?:"nincs rögzítve"}\n"+
            "Google natív hozzáférés: ${if(GuardianNativeAuth.hasSession(this))"bejelentkezve" else "nem hitelesített"}\n"+
            "Helymegosztás: ${if(active)"BE" else "KI"}\n"+
            "Utolsó igazolt GPS-feltöltés: $whenLast\n"+
            "Szolgáltatás: $statusText"+
            if(GuardianNativeAuth.revocationPending(this))"\n⚠️ Távoli visszavonás még nem ellenőrzött" else "")
        startButton.isEnabled=p!=null
        stopButton.isEnabled=active||GuardianNativeAuth.revocationPending(this)
    }
    override fun onResume(){super.onResume();if(::status.isInitialized)refreshUi()}
    override fun onDestroy(){work.cancel();super.onDestroy()}
}
