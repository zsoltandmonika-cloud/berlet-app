package hu.zsoltmonika.healthhubbridge

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant
import java.util.Date

/**
 * An actual Android foreground LOCATION service. Continues collecting and
 * uploading genuine GPS fixes even when the screen locks or the HH One UI hides.
 *
 * Does NOT rely on a web page, WorkManager periodic alarms or synthetic heartbeat.
 * Android can still terminate services; always display last real fix timestamp.
 * START requires user-visible Activity consent + native Supabase auth + device owner.
 * Service STOP explicitly revokes cloud visibility (retries after network loss).
 */
class GuardianLocationService: Service() {
    companion object {
        const val ACTION_START="hu.zsoltmonika.healthhubbridge.GUARDIAN_START"
        const val ACTION_STOP="hu.zsoltmonika.healthhubbridge.GUARDIAN_STOP"
        private const val CHANNEL="hh_guardian_location_v808"
        private const val NOTIFICATION_ID=90808
        private const val TARGET_INTERVAL_MS=12000L
        private const val MIN_INTERVAL_MS=5000L
        private const val MIN_UPLOAD_SPACING_MS=8000L
        private const val MAX_FIX_AGE_MS=12*60*60*1000L
    }
    private val scope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val client by lazy{LocationServices.getFusedLocationProviderClient(this)}
    private var callback:LocationCallback?=null
    private var latest:Location?=null
    private var lastUploadedMeasurement=0L
    private var uploading=false
    private var trackingProfile:String?=null
    private var ownerId:String?=null
    private var retryTask:Job?=null
    private var stopping=false
    private val locPrefs by lazy{getSharedPreferences("guardian_native_v808",MODE_PRIVATE)}

    override fun onBind(intent:Intent?):IBinder?=null

    override fun onCreate() {
        super.onCreate()
        val manager=getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL,"HH One · Családi élő helymegosztás",
            NotificationManager.IMPORTANCE_LOW).apply{
            description="Folyamatos, önkéntesen bekapcsolt háttérbeli GPS- és családi helymegosztás"
            setShowBadge(false)
        })
    }
    override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
        if(intent?.action==ACTION_STOP){stopByOwner();return START_NOT_STICKY}
        if(stopping||!GuardianNativeAuth.isEnabled(this)||GuardianNativeAuth.revocationPending(this)){
            stopSelf();return START_NOT_STICKY
        }
        if(!hasLocationPermission()||!locationIsEnabled()){
            locPrefs.edit().putString("native_state","Nincs engedélyezett helyszolgáltatás").apply()
            stopSelf();return START_NOT_STICKY
        }
        try{
            ServiceCompat.startForeground(this,NOTIFICATION_ID,notification("Kapcsolódás a családi helymegosztáshoz…"),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        }catch(_:Exception){stopSelf();return START_NOT_STICKY}
        if(callback!=null)return START_STICKY
        scope.launch{
            val identity=try{GuardianNativeAuth.identity(this@GuardianLocationService)}catch(_:Exception){null}
            if(identity==null||!GuardianNativeAuth.isEnabled(this@GuardianLocationService)){
                updateStatus("Hitelesítés szükséges · GPS nem továbbítható")
                stopSelf();return@launch
            }
            trackingProfile=identity.first;ownerId=identity.second
            startRealGps()
        }
        return START_STICKY
    }
    private fun hasLocationPermission():Boolean{
        return ContextCompat.checkSelfPermission(this,Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||
            ContextCompat.checkSelfPermission(this,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED
    }
    private fun locationIsEnabled():Boolean=
        (getSystemService(LOCATION_SERVICE) as LocationManager).isProviderEnabled(LocationManager.GPS_PROVIDER)||
        (getSystemService(LOCATION_SERVICE) as LocationManager).isProviderEnabled(LocationManager.NETWORK_PROVIDER)

    @Suppress("MissingPermission")
    private fun startRealGps(){
        if(callback!=null||stopping||!hasLocationPermission())return
        val cb=object:LocationCallback(){
            override fun onLocationResult(result:LocationResult){
                for(location in result.locations)onRealLocation(location)
            }
        }
        callback=cb
        val request=LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY,TARGET_INTERVAL_MS)
            .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
            .setMinUpdateDistanceMeters(0f)
            .setMaxUpdateDelayMillis(0)
            .setWaitForAccurateLocation(false)
            .build()
        client.requestLocationUpdates(request,cb,Looper.getMainLooper())
            .addOnFailureListener{
                updateStatus("GPS-hiba · nincs élő helymegosztás")
                callback=null;stopSelf()
            }
        updateStatus("GPS elindítva · új pozícióra várunk…")
        retryTask=scope.launch{
            while(!stopping){
                delay(15000)
                if(!GuardianNativeAuth.isEnabled(this@GuardianLocationService)){stopByOwner();break}
                attemptUpload()
            }
        }
    }
    private fun onRealLocation(point:Location){
        if(stopping||!GuardianNativeAuth.isEnabled(this))return
        val now=System.currentTimeMillis()
        val age=now-point.time
        if(point.time<=0||age< -5000||age>MAX_FIX_AGE_MS||
            !point.hasAccuracy()||point.accuracy<0f||point.accuracy>100f||
            !point.latitude.isFinite()||!point.longitude.isFinite()||
            kotlin.math.abs(point.latitude)>90||kotlin.math.abs(point.longitude)>180)return
        if(point.time<(latest?.time?:0L))return
        latest=point
        if(point.time>lastUploadedMeasurement&&
           (now-locPrefs.getLong("last_attempt_ms",0)>=MIN_UPLOAD_SPACING_MS)){
            scope.launch{attemptUpload()}
        }
    }
    private suspend fun attemptUpload(){
        if(uploading||stopping)return
        val fix=latest?:return
        val profile=trackingProfile?:return
        val uid=ownerId?:return
        val age=System.currentTimeMillis()-fix.time
        if(age< -5000||age>MAX_FIX_AGE_MS||fix.time<=lastUploadedMeasurement)return
        if(!GuardianNativeAuth.isEnabled(this))return
        uploading=true
        locPrefs.edit().putLong("last_attempt_ms",System.currentTimeMillis()).apply()
        try{
            val speed=if(fix.hasSpeed()&&fix.speed.isFinite()&&fix.speed>=0)
                kotlin.math.min(300.0,fix.speed.toDouble()*3.6) else null
            val body=JSONObject().put("latitude",fix.latitude)
                .put("longitude",fix.longitude)
                .put("accuracy_m",fix.accuracy.toDouble())
                .put("speed_kmh",speed?:JSONObject.NULL)
                // Crucial: true GPS measurement time, never HTTP-send or retry time.
                .put("updated_at",Instant.ofEpochMilli(fix.time).toString())
            val uploaded=GuardianNativeAuth.publish(this,profile,uid,body)
            if(uploaded){
                lastUploadedMeasurement=fix.time
                locPrefs.edit().putLong("last_cloud_confirmed_fix_ms",fix.time)
                    .putString("native_state","Élő pozíció továbbítva").apply()
                updateNotification("🟢 Megosztás aktív · valódi GPS frissítve")
            }else{
                updateStatus("⚠️ GPS elérhető, de a felhőfeltöltés sikertelen")
            }
        }catch(_:Exception){updateStatus("⚠️ Kapcsolati hiba · ismételt továbbítás szükséges")}
        finally{uploading=false}
    }
    private fun stopByOwner(){
        if(stopping)return
        stopping=true
        GuardianNativeAuth.stop(this)
        callback?.let{client.removeLocationUpdates(it)};callback=null
        retryTask?.cancel()
        GuardianNativeAuth.markRevocationPending(this)
        updateStatus("Megosztás leállítása és szerveroldali visszavonás…")
        scope.launch{
            val revoked=GuardianNativeAuth.retryRevocation(this@GuardianLocationService)
            if(!revoked)updateStatus("⚠️ A távoli törlés sikertelen, újraellenőrzés szükséges")
            stopForeground(STOP_FOREGROUND_REMOVE);stopSelf()
        }
    }
    private fun updateStatus(message:String){
        locPrefs.edit().putString("native_state",message).apply()
        updateNotification(message)
    }
    private fun updateNotification(message:String){
        try{getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID,notification(message))}catch(_:Exception){}
    }
    private fun notification(message:String):Notification{
        val open=Intent(this,GuardianNativeTrackingActivity::class.java)
        val launch=PendingIntent.getActivity(this,101,open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val stop=Intent(this,GuardianLocationService::class.java).setAction(ACTION_STOP)
        val stopPending=PendingIntent.getService(this,102,stop,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this,CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("HH One · Family Guard élő GPS")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(
                "$message. Helyzetmegosztás a telefon lezárása mellett is. A leállításhoz érintsd a Leállítás gombot."))
            .setContentIntent(launch)
            .setOngoing(true).setOnlyAlertOnce(true)
            .addAction(android.R.drawable.ic_media_pause,"Megosztás leállítása",stopPending)
            .setCategory(NotificationCompat.CATEGORY_SERVICE).build()
    }
    override fun onDestroy(){
        callback?.let{client.removeLocationUpdates(it)};callback=null
        retryTask?.cancel();scope.cancel()
        super.onDestroy()
    }
}
