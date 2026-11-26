package hu.zsoltmonika.healthhubbridge

import android.app.AlertDialog
import android.content.Context
import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.ContactsContract.Contacts
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.text.Editable
import android.text.TextWatcher
import android.util.Base64
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ListView
import android.widget.TextView
import androidx.activity.ComponentActivity
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

/** User-initiated local search; returns only a single explicitly selected number. */
internal class ScNativeContacts(private val activity: ComponentActivity) {
    data class Selection(val name: String, val tel: String, val photo: String)
    private data class Row(val id: Long, val name: String, val tel: String)
    private val worker = Executors.newSingleThreadExecutor()
    private var dialog: AlertDialog? = null
    private var generation = 0
    private var closed = false

    fun show(result: (String, Selection?) -> Unit) {
        if (closed || dialog != null || activity.isFinishing || activity.isDestroyed) {
            result("busy", null)
            return
        }
        val ctx = android.view.ContextThemeWrapper(activity, android.R.style.Theme_Material_Dialog_Alert)
        val pad = (16 * activity.resources.displayMetrics.density).toInt()
        val root = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, 0)
        }
        val search = EditText(ctx).apply {
            hint = "Név vagy telefonszám"
            isSingleLine = true
            inputType = android.text.InputType.TYPE_CLASS_TEXT
        }
        val status = TextView(ctx).apply { text = "Írj be legalább 2 karaktert." }
        val list = ListView(ctx)
        root.addView(search)
        root.addView(status)
        root.addView(list, LinearLayout.LayoutParams(-1, (300 * activity.resources.displayMetrics.density).toInt()))
        val adapter = ArrayAdapter<String>(ctx, android.R.layout.simple_list_item_1)
        list.adapter = adapter
        var rows = emptyList<Row>()
        var chosen = false
        val d = AlertDialog.Builder(ctx).setTitle("Smart Connect · Névjegyzék")
            .setView(root).setNegativeButton("Mégse", null).create()
        dialog = d
        d.setOnDismissListener {
            generation++
            dialog = null
            if (!chosen && !closed) result("cancelled", null)
        }
        fun refresh(value: String) {
            val ticket = ++generation
            rows = emptyList()
            adapter.clear()
            val query = value.trim().take(100)
            if (query.length < 2) {
                status.text = "Írj be legalább 2 karaktert."
                return
            }
            status.text = "Keresés…"
            worker.execute {
                val found = runCatching { find(query) }
                activity.runOnUiThread {
                    if (!closed && dialog === d && generation == ticket) {
                        rows = found.getOrDefault(emptyList())
                        adapter.clear()
                        adapter.addAll(rows.map { it.name + "\n" + it.tel })
                        status.text = if (found.isFailure) "A névjegyek nem olvashatók."
                            else if (rows.isEmpty()) "Nincs találat." else "Válaszd ki a telefonszámot."
                    }
                }
            }
        }
        search.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                refresh(s?.toString().orEmpty())
            }
            override fun afterTextChanged(s: Editable?) {}
        })
        list.setOnItemClickListener { _, _, pos, _ ->
            val row = rows.getOrNull(pos) ?: return@setOnItemClickListener
            if (chosen) return@setOnItemClickListener
            chosen = true
            d.dismiss()
            worker.execute {
                val photo = runCatching { thumbnail(row.id) }.getOrDefault("")
                activity.runOnUiThread {
                    if (!closed) result("selected", Selection(row.name, row.tel, photo))
                }
            }
        }
        d.show()
    }

    private fun find(query: String): List<Row> {
        val uri = Uri.withAppendedPath(Phone.CONTENT_FILTER_URI, Uri.encode(query))
        val columns = arrayOf(Phone.CONTACT_ID, Phone.DISPLAY_NAME, Phone.NUMBER, Phone.NORMALIZED_NUMBER)
        val result = ArrayList<Row>()
        val seen = HashSet<String>()
        activity.contentResolver.query(uri, columns, null, null, Phone.DISPLAY_NAME + " COLLATE LOCALIZED ASC")?.use { c ->
            while (c.moveToNext() && result.size < 50) {
                val id = c.getLong(0)
                val name = c.getString(1).orEmpty().trim().take(120)
                val number = c.getString(3)?.takeIf { it.isNotBlank() } ?: c.getString(2).orEmpty()
                if (name.isNotBlank() && number.isNotBlank() && seen.add("$id:$number")) {
                    result.add(Row(id, name, number.take(80)))
                }
            }
        }
        return result
    }

    private fun thumbnail(id: Long): String {
        val uri = ContentUris.withAppendedId(Contacts.CONTENT_URI, id)
        val bytes = Contacts.openContactPhotoInputStream(activity.contentResolver, uri, false)?.use { input ->
            val out = ByteArrayOutputStream()
            val buffer = ByteArray(4096)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                if (out.size() + count > 512 * 1024) return ""
                out.write(buffer, 0, count)
            }
            out.toByteArray()
        } ?: return ""
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        if (options.outWidth <= 0 || options.outHeight <= 0) return ""
        var sample = 1
        while (maxOf(options.outWidth, options.outHeight) / sample > 256) sample *= 2
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }) ?: return ""
        val scaled = Bitmap.createScaledBitmap(bitmap, 96, 96, true)
        val out = ByteArrayOutputStream()
        try {
            if (!scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)) return ""
            return "data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } finally {
            if (scaled !== bitmap) scaled.recycle()
            bitmap.recycle()
        }
    }

    fun close() {
        closed = true
        generation++
        dialog?.dismiss()
        worker.shutdownNow()
    }
}
