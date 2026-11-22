'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../../..');
const read = filename => fs.readFileSync(path.join(base, filename), 'utf8');
const kotlin = 'healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/';
const dropbox = read(kotlin + 'DropboxVaultClient.kt');
const gps = read(kotlin + 'FamilyGuardNativeRelay.kt');
const worker = read(kotlin + 'OrchestratorWorker.kt');
const main = read(kotlin + 'MainActivity.kt');

test('GPS and orchestrator upload existing Dropbox files before touching folders', () => {
  assert.match(dropbox, /suspend fun uploadTextWithFolderRecovery\(/);
  assert.match(dropbox, /try\s*\{\s*uploadText\(prefs, path, text\)/);
  assert.match(gps, /DropboxVaultClient\.uploadTextWithFolderRecovery\(/);
  assert.match(worker, /DropboxVaultClient\.uploadTextWithFolderRecovery\(/);
  assert.doesNotMatch(worker, /ensureFolders\(prefs\)/);
  assert.doesNotMatch(gps, /ensureFolder\(app\)|ensureFolder\(context\)/);
});

test('folder recovery is restricted to Dropbox 409 missing parent, never permissions or rate limits', () => {
  assert.match(dropbox, /message\.startsWith\(prefix\)/);
  assert.match(dropbox, /e !is IllegalStateException/);
  assert.match(dropbox, /summary == "path\/not_found" \|\| summary\.startsWith\("path\/not_found\/"\)/);
  assert.match(dropbox, /if \(!missingParentForUpload\(e\)\) throw e/);
  assert.match(dropbox, /for \(parent in parents\) ensureFolder\(prefs, parent\)/);
  assert.match(dropbox, /uploadText\(prefs, path, text\)\s*\n\s*\}/);
  assert.doesNotMatch(dropbox, /files\/get_metadata/);
});

test('existing folder conflict requires a folder, never a generic 409', () => {
  assert.match(dropbox, /explicitFolderSummary/);
  assert.match(dropbox, /summary\.startsWith\("path\/conflict\/folder\/"\)/);
  assert.match(dropbox, /root\?\.optString\("\.tag"\) == "path"/);
  assert.match(dropbox, /structured \|\| \(root\?\.optString/);
});

test('Dropbox failures expose a safe stage and HTTP code without GPS or OAuth secrets', () => {
  assert.match(dropbox, /fun safeDiagnosticCode\(e: Exception\)/);
  assert.match(dropbox, /Regex\("""HTTP \(\[1-5\]\[0-9\]\{2\}\)"""\)/);
  assert.match(worker, /putString\("last_orchestrator_error", diagnostic\)/);
  assert.match(gps, /"network-error:" \+ DropboxVaultClient\.safeDiagnosticCode\(e\)/);
  assert.match(main, /"⚠ Dropbox feltöltési hiba · "/);
  assert.match(dropbox, /val stage = when/);
});

test('existing owner consent and STOP privacy contract remains intact', () => {
  assert.match(gps, /getBoolean\(KEY_SHARE, false\)/);
  assert.match(gps, /FamilyGuardContinuity\.enabled\(context\)/);
  assert.match(gps, /if \(!enabled\(app\) \|\| owner\(app\) != profile/);
  assert.match(gps, /isSelectedPhysicalPhone\(app, profile\)/);
  assert.match(gps, /put\("active", false\)/);
  assert.doesNotMatch(worker, /FamilyGuardNativeRelay\.enable\(applicationContext\)/);
});

test('upload 409 exposes only known Dropbox structural tags, never full error body or secrets', () => {
  assert.match(dropbox, /internal fun safeUpload409Reason\(message: String\): String\?/);
  assert.match(dropbox, /JSONObject\(message\.removePrefix\(prefix\)\)\.optString\("error_summary"\)/);
  for (const tag of ['path/no_write_permission', 'path/conflict/file', 'path/conflict/folder',
    'path/not_found', 'path/insufficient_space', 'path/too_many_write_operations']) {
    assert.ok(dropbox.includes('"' + tag + '"'), 'reason allowlist missing: ' + tag);
  }
  assert.match(dropbox, /summary == it \|\| summary\.startsWith\("\$it\/"\) \|\| summary\.startsWith\("\$it\."\)/);
  assert.match(dropbox, /val detail = if \(stage == "upload" && http == "409"\) safeUpload409Reason\(message\)/);
  assert.match(dropbox, /detail\?\.let \{ "-\$it" \}/);
  assert.doesNotMatch(dropbox, /putString\(KEY_RESULT,\s*e\.message/);
  assert.match(gps, /DropboxVaultClient\.safeDiagnosticCode\(e\)/);
});
