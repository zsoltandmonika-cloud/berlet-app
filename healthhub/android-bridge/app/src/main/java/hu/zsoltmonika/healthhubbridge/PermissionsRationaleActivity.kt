package hu.zsoltmonika.healthhubbridge

import android.app.Activity
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val p = 28
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(p, p, p, p)
            setBackgroundColor(0xFFEEF7FB.toInt())
        }
        box.addView(TextView(this).apply {
            text = "HealthHub Connect – adatkezelés"
            textSize = 24f
            setTextColor(0xFF0B2D50.toInt())
        })
        box.addView(TextView(this).apply {
            text = "\nAz alkalmazás kizárólag az általad engedélyezett Health Connect-adatokat olvassa ki, és helyben HealthHub-importfájlt készít. Az MVP nem tölt fel egészségügyi adatot külső szerverre. Az exportfájl mentési helyét te választod ki."
            textSize = 17f
            setTextColor(0xFF173F62.toInt())
        })
        setContentView(box)
    }
}
