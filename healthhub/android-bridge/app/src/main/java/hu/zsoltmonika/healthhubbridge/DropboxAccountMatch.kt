package hu.zsoltmonika.healthhubbridge

/**
 * Compare the Dropbox OAuth account ID with an eight-character suffix shown
 * by the existing web HealthHub. No tokens or full account identifiers are
 * exposed to the UI. A mismatch never replaces existing native credentials.
 */
internal object DropboxAccountMatch {
    private val suffixPattern = Regex("[A-Za-z0-9_-]{8}")

    fun validExpected(value: String): Boolean =
        suffixPattern.matches(value.trim())

    fun suffix(accountId: String?): String? {
        val value = accountId?.trim().orEmpty()
        if (!value.startsWith("dbid:") || value.length < 13) return null
        val last = value.takeLast(8)
        return last.takeIf { suffixPattern.matches(it) }
    }

    fun matches(expected: String, accountId: String?): Boolean =
        validExpected(expected) && suffix(accountId) == expected.trim()
}
