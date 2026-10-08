(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HHBridgeControl = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const ROOT = '/HealthHub/orchestrator';
  const terminal = new Set(['done', 'failed', 'expired', 'rejected']);
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,90}$/.test(id);
  function request(device, profile, days, action = 'sync', now = Date.now(), uuid = () => crypto.randomUUID()) {
    if (!device || !validId(device.deviceId) || device.protocolVersion !== 2 || device.deviceType !== 'android') throw Error('A telefon bridge-frissítést igényel.');
    if (!['zsolt', 'monika'].includes(profile) || device.activeProfile !== profile) throw Error('A kiválasztott profil nem a telefon tulajdonosa.');
    if (![1, 7, 30].includes(days) || !['sync', 'diagnostics'].includes(action)) throw Error('Érvénytelen kérés.');
    return {schema: 'healthhub.bridge.request/2', requestId: 'req-' + now + '-' + uuid(), targetDeviceId: device.deviceId,
      profile, days, action, issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + 86400000).toISOString()};
  }
  function state(command, result, now = Date.now()) {
    if (result && result.requestId === command.requestId && result.deviceId === command.targetDeviceId && result.profile === command.profile) return result.state;
    return Date.parse(command.expiresAt) <= now ? 'expired' : 'pending';
  }
  function createClient(vault, fetcher = fetch) {
    async function rpc(name, body) {
      const token = await vault.accessToken();
      const response = await fetcher('https://api.dropboxapi.com/2/files/' + name, {method: 'POST', headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
      const data = await response.json();
      if (!response.ok) { const e = Error(data.error_summary || 'Cloud kapcsolat hiba'); e.status = response.status; throw e; }
      return data;
    }
    async function read(path) {
      try { return await vault.downloadJson(path); }
      catch (e) { if (e.status === 409 && /not_found/.test(e.message)) return null; throw e; }
    }
    async function folder(path) {
      try { await rpc('create_folder_v2', {path, autorename: false}); }
      catch (e) { if (e.status !== 409) throw e; const info = await rpc('get_metadata', {path}); if (info['.tag'] !== 'folder') throw e; }
    }
    async function list(path) {
      let data;
      try { data = await rpc('list_folder', {path}); }
      catch (e) { if (e.status === 409 && /not_found/.test(e.message)) return []; throw e; }
      let entries = data.entries;
      while (data.has_more) { data = await rpc('list_folder/continue', {cursor: data.cursor}); entries = entries.concat(data.entries); }
      return entries.filter(e => e['.tag'] === 'file' && e.name.endsWith('.json'));
    }
    async function devices() {
      const entries = await list(ROOT + '/devices');
      const rows = await Promise.all(entries.map(e => read(e.path_lower || e.path_display)));
      return rows.filter(d => d && d.deviceType === 'android' && validId(d.deviceId));
    }
    async function send(device, profile, days, action) {
      const cmd = request(device, profile, days, action);
      for (const path of ['/HealthHub', ROOT, ROOT + '/requests', ROOT + '/requests/' + device.deviceId]) await folder(path);
      // Each request has its own immutable filename; only the bridge writes results.
      await vault.uploadJson(ROOT + '/requests/' + device.deviceId + '/' + cmd.requestId + '.json', cmd);
      return cmd;
    }
    async function history(device) {
      if (!validId(device.deviceId)) throw Error('Érvénytelen eszközazonosító.');
      const base = ROOT + '/requests/' + device.deviceId;
      const entries = (await list(base)).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 12);
      return Promise.all(entries.map(async e => {
        const cmd = await read(e.path_lower || e.path_display);
        if (!cmd || !validId(cmd.requestId) || cmd.targetDeviceId !== device.deviceId) return null;
        const result = await read(ROOT + '/results/' + device.deviceId + '/' + cmd.requestId + '.json');
        return {command: cmd, result, state: state(cmd, result)};
      })).then(rows => rows.filter(Boolean));
    }
    return {devices, send, history};
  }
  return {request, state, createClient, terminal, validId};
});
