'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/book-studio/index.html');
const cloud=read('sh9/entertainment/book-studio/book-studio.js');
const drive=read('sh9/entertainment/book-studio/onedrive-books-v2.js');
const entertainment=read('sh9/entertainment/index.html');
test('OneDrive primary shelf and standalone scripts are wired',()=>{
 assert.match(html,/id="onedriveBooks"/);
 assert.match(html,/id="odClientId"/);
 assert.match(html,/id="odAccount"/);
 assert.match(html,/onedrive-books-v2\.js/);
 assert.match(html,/onedrive-books-v2\.css/);
 assert.match(html,/href="#onedriveBooks"/);
 assert.ok(html.indexOf('id="onedriveBooks"')<html.indexOf('id="library"'));
});
test('OneDrive is read-only with least delegated Files.Read scope, PKCE and ephemeral downloads',()=>{
 assert.match(drive,/User\.Read Files\.Read/);
 assert.doesNotMatch(drive,/Files\.ReadWrite|Files\.Read\.All|client_secret/);
 assert.match(drive,/code_challenge_method:'S256'/);
 assert.match(drive,/@microsoft\.graph\.downloadUrl/);
 assert.match(drive,/Graph:|Microsoft Graph:|HTTP /);
 assert.doesNotMatch(drive,/storage\.from\([^)]+\)\.upload|\.delete\(.*drive|createSharingLink/);
 assert.match(drive,/sessionStorage/);
 assert.match(drive,/verifyEmail/);
 assert.match(drive,/folder&&x.name.toLocaleUpperCase/);
});
test('Existing EPUB/PDF renderer can read OneDrive without uploading original file',()=>{
 assert.match(cloud,/SH9_BOOK_STUDIO_DRIVE_V2\.download\(b\)/);
 assert.match(cloud,/SH9_BOOK_STUDIO_DRIVE_V2\?\.getBook\(id\)/);
 assert.match(cloud,/SH9_BOOK_STUDIO_DRIVE_V2\.saveProgress\(snapshot,patch\)/);
 assert.match(cloud,/w\.SH9_BOOK_STUDIO_V1=Object\.freeze/);
 assert.match(drive,/hh_book_studio_drive_progress_v2/);
});
test('Original Entertainment tiles remain and Book Studio is linked',()=>{
 for(const label of ['Mozi','Színház','Koncertek','Home Media'])assert.ok(entertainment.includes('>'+label+'</b>'));
 assert.match(entertainment,/class="books-promo" href="\.\/book-studio\/"/);
});
test('UI and scripts have parser-valid JavaScript',()=>{
 new Function(cloud);new Function(drive);
});
