package hu.zsoltmonika.healthhubbridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DropboxAccountMatchTest {
    private val id = "dbid:ExampleDropboxLoginQbVL0JOo"

    @Test fun suffixMatchesWebHealthHubExactly() {
        assertEquals("QbVL0JOo", DropboxAccountMatch.suffix(id))
        assertTrue(DropboxAccountMatch.matches("QbVL0JOo", id))
        assertTrue(DropboxAccountMatch.matches(" QbVL0JOo ", id))
    }

    @Test fun mismatchingOrMissingAccountIdNeverAuthorizesReplacement() {
        assertFalse(DropboxAccountMatch.matches("WRONG123", id))
        assertFalse(DropboxAccountMatch.matches("QbVL0JOo", ""))
        assertFalse(DropboxAccountMatch.matches("QbVL0JOo", null))
        assertFalse(DropboxAccountMatch.matches("QbVL0JOo", "other:ExampleDropboxLoginQbVL0JOo"))
    }

    @Test fun malformedExpectedAccountSuffixIsRejected() {
        assertFalse(DropboxAccountMatch.validExpected(""))
        assertFalse(DropboxAccountMatch.validExpected("short"))
        assertFalse(DropboxAccountMatch.validExpected("not an ID"))
        assertTrue(DropboxAccountMatch.validExpected("QbVL0JOo"))
        assertNull(DropboxAccountMatch.suffix(null))
        assertNull(DropboxAccountMatch.suffix("dbid:short"))
    }
}
