package hu.zsoltmonika.healthhubbridge

import android.content.Context
import android.net.Uri
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Native HH One Family Guard authorization, separate from the browser session.
 * Uses official Supabase OAuth PKCE -> Google with Android deep-link callback.
 * Only PUBLIC Supabase project credentials are compiled into the APK.
 * The user's short-lived JWT and refresh credential are Android Keystore encrypted.
 * No GPS is sent before own phone profile, signed-in user and RLS authorization.
 */
internal object GuardianNativeAuth {
    private const val PREF = "guardian_native_v808"
    private const val ALIAS = "hh_one_guardian_session_aes_v808"
    private const val REDIRECT = "healthhubconnect://guardian-auth"
    private const val PROFILE_PREF = "healthhub_connect"
    private val mutex = Mutex()
    private fun prefs(c: Context) = c.getSharedPreferences(PREF, Context.MODE_PRIVATE)
    private fun project() = BuildConfig.GUARDIAN_SUPABASE_URL.trimEnd('/')
    private fun publicKey() = BuildConfig.GUARDIAN_SUPABASE_PUBLISHABLE_KEY

    private fun aes(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(KeyGenParameterSpec.Builder(ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256).build())
        return generator.generateKey()
    }
    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, aes())
        return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
    }
    private fun decrypt(value: String?): String? = try {
        if(value.isNullOrEmpty()) null else {
            val raw=Base64.decode(value,Base64.NO_WRAP)
            if(raw.size<29) null else {
                val cipher=Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE,aes(),GCMParameterSpec(128,raw.copyOfRange(0,12)))
                String(cipher.doFinal(raw.copyOfRange(12,raw.size)),Charsets.UTF_8)
            }
        }
    }catch(_:Exception){null}
    private fun secureSave(c: Context, key:String, value:String) {
        prefs(c).edit().putString(key,encrypt(value)).apply()
    }
    fun ownProfile(c: Context): String? {
        val p=c.getSharedPreferences(PROFILE_PREF,Context.MODE_PRIVATE).getString("device_owner_profile",null)
        return if(p=="zsolt"||p=="monika")p else null
    }
    fun isEnabled(c: Context): Boolean {
        val p=ownProfile(c)
        return p!=null&&prefs(c).getBoolean("enabled",false)&&prefs(c).getString("profile",null)==p
    }
    fun setEnabled(c:Context,yes:Boolean){
        prefs(c).edit().putBoolean("enabled",yes).apply()
    }
    fun hasSession(c:Context):Boolean=decrypt(prefs(c).getString("refresh",null))!=null
    fun signedInProfile(c:Context):String?=prefs(c).getString("profile",null)
    fun stop(c:Context) { setEnabled(c,false) }

    private fun base64Url(raw:ByteArray):String=Base64.encodeToString(raw,
        Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
    private fun random(n:Int):String=ByteArray(n).also { SecureRandom().nextBytes(it) }.let(::base64Url)
    private fun encode(s:String):String=URLEncoder.encode(s,"UTF-8")

    fun loginUrl(c:Context): String {
        require(publicKey().isNotBlank()&&project().startsWith("https://")){"Hiányzó publikus Supabase-beállítás"}
        val owner=ownProfile(c) ?: error("Előbb rendeld hozzá a telefont a saját profilodhoz")
        val verifier=random(48)
        val challenge=base64Url(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII)))
        // The authorization-code verifier is short lived and never leaves this phone.
        prefs(c).edit().putString("pkce_verifier",encrypt(verifier))
            .putLong("pkce_started_at",System.currentTimeMillis())
            .putString("pkce_profile",owner).apply()
        return project()+"/auth/v1/authorize?provider=google"+
            "&redirect_to="+encode(REDIRECT)+"&code_challenge="+encode(challenge)+
            "&code_challenge_method=s256"
    }

    suspend fun acceptCallback(c:Context,uri:Uri):String {
        require(uri.scheme=="healthhubconnect"&&uri.host=="guardian-auth"){"Hibás hitelesítési visszatérés"}
        val owner=ownProfile(c) ?: error("Nincs rögzített telefontulajdonos")
        val ps=prefs(c)
        val verifier=decrypt(ps.getString("pkce_verifier",null))
        val fresh=System.currentTimeMillis()-ps.getLong("pkce_started_at",0) in 0..600_000
        val code=uri.getQueryParameter("code")
        require(verifier!=null&&fresh&&ps.getString("pkce_profile",null)==owner&&!code.isNullOrBlank()){
            "Hiányzó vagy lejárt PKCE bejelentkezés. Indíts új belépést az alkalmazásból."
        }
        ps.edit().remove("pkce_verifier").remove("pkce_started_at").remove("pkce_profile").apply()
        val response=request("POST","/auth/v1/token?grant_type=pkce",null,
            JSONObject().put("auth_code",code).put("code_verifier",verifier).toString())
        val jwt=response.getString("access_token")
        val refresh=response.getString("refresh_token")
        val id=authenticatedUser(jwt)
        require(hasProfileAccess(jwt,owner)){"A hitelesített fiók nem jogosult erre a családi profilra"}
        // The service cannot upload with a mismatched device owner or arbitrary profile.
        secureSave(c,"access",jwt);secureSave(c,"refresh",refresh)
        ps.edit().putString("owner_id",id).putString("profile",owner)
            .putLong("expires_at",System.currentTimeMillis()+response.optLong("expires_in",3600)*1000L)
            .putBoolean("enabled",false).apply()
        return owner
    }
    private suspend fun authenticatedUser(jwt:String):String{
        val result=request("GET","/auth/v1/user",jwt,null)
        return result.getString("id").also { require(it.isNotBlank()) }
    }
    private suspend fun hasProfileAccess(jwt:String,profile:String):Boolean{
        val body=requestRaw("GET","/rest/v1/hh_profile_access?select=profile_key&profile_key=eq.${encode(profile)}",jwt,null)
        val rows=JSONArray(body)
        return (0 until rows.length()).any { rows.optJSONObject(it)?.optString("profile_key")==profile }
    }
    suspend fun identity(c:Context):Pair<String,String>? {
        val profile=ownProfile(c)?:return null
        val jwt=accessToken(c)?:return null
        val id=authenticatedUser(jwt)
        if(!hasProfileAccess(jwt,profile))return null
        val ps=prefs(c)
        if(ps.getString("profile",null)!=profile||ps.getString("owner_id",null)!=id)return null
        return profile to id
    }
    suspend fun accessToken(c:Context):String?=mutex.withLock {
        val ps=prefs(c)
        val token=decrypt(ps.getString("access",null))
        if(token!=null&&ps.getLong("expires_at",0)>System.currentTimeMillis()+75_000)return@withLock token
        val refresh=decrypt(ps.getString("refresh",null))?:return@withLock null
        return@withLock try{
            val data=request("POST","/auth/v1/token?grant_type=refresh_token",null,
                JSONObject().put("refresh_token",refresh).toString())
            val newAccess=data.getString("access_token")
            secureSave(c,"access",newAccess)
            if(data.has("refresh_token"))secureSave(c,"refresh",data.getString("refresh_token"))
            ps.edit().putLong("expires_at",System.currentTimeMillis()+data.optLong("expires_in",3600)*1000).apply()
            newAccess
        }catch(_:Exception){null}
    }

    suspend fun publish(c:Context,profile:String,id:String,fix:JSONObject):Boolean {
        if(!isEnabled(c)||ownProfile(c)!=profile||signedInProfile(c)!=profile)return false
        if(prefs(c).getString("owner_id",null)!=id)return false
        val jwt=accessToken(c)?:return false
        return try {
            val request=fix.put("profile_key",profile).put("owner_id",id)
            requestRaw("POST","/rest/v1/hh_guardian_live_locations?on_conflict=profile_key",jwt,
                request.toString(),mapOf("Prefer" to "resolution=merge-duplicates,return=minimal"))
            true
        }catch(_:Exception){false}
    }
    suspend fun revoke(c:Context):Boolean {
        val profile=signedInProfile(c)?:return true
        val id=prefs(c).getString("owner_id",null)?:return false
        val jwt=accessToken(c)?:return false
        return try {
            requestRaw("DELETE","/rest/v1/hh_guardian_live_locations?profile_key=eq.${encode(profile)}&owner_id=eq.${encode(id)}",
                jwt,null)
            true
        }catch(_:Exception){false}
    }
    suspend fun retryRevocation(c:Context):Boolean {
        if(!prefs(c).getBoolean("revoke_pending",false))return true
        val ok=revoke(c)
        if(ok)prefs(c).edit().putBoolean("revoke_pending",false).apply()
        return ok
    }
    fun revocationPending(c:Context):Boolean=prefs(c).getBoolean("revoke_pending",false)
    fun markRevocationPending(c:Context){prefs(c).edit().putBoolean("revoke_pending",true).apply()}
    fun clearCredentials(c:Context) {
        stop(c)
        prefs(c).edit().remove("access").remove("refresh").remove("owner_id")
            .remove("profile").remove("expires_at").apply()
    }

    private suspend fun request(method:String,path:String,jwt:String?,body:String?):JSONObject=
        JSONObject(requestRaw(method,path,jwt,body))
    private suspend fun requestRaw(
        method:String,path:String,jwt:String?,body:String?,
        extras:Map<String,String> = emptyMap()
    ):String=withContext(Dispatchers.IO){
        val endpoint=project()
        require(endpoint.startsWith("https://")&&publicKey().isNotBlank()){"Invalid cloud settings"}
        val conn=(URL(endpoint+path).openConnection() as HttpURLConnection).apply{
            requestMethod=method;connectTimeout=12000;readTimeout=12000
            setRequestProperty("apikey",publicKey())
            if(jwt!=null)setRequestProperty("Authorization","Bearer $jwt")
            setRequestProperty("Accept","application/json")
            for((key,value) in extras)setRequestProperty(key,value)
            if(body!=null){
                doOutput=true;setRequestProperty("Content-Type","application/json")
                outputStream.use{it.write(body.toByteArray(Charsets.UTF_8))}
            }
        }
        try{
            val status=conn.responseCode
            val message=(if(status in 200..299)conn.inputStream else conn.errorStream)
                ?.bufferedReader()?.use{it.readText()} ?: ""
            if(status !in 200..299)error("Guardian API HTTP $status")
            message
        }finally{conn.disconnect()}
    }
}
