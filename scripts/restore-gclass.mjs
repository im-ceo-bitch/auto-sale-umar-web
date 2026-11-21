import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Idempotent restoration of Mercedes-Benz G-Class showroom film.
// Never delete cars, accounts or R2 objects. Never create a second D1 row
// when the same film is already registered under a different identifier.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const databaseId = process.env.ASU_D1_DATABASE_ID;
if (!account || !token || !databaseId) throw Error('Cloudflare secrets/ASU_D1_DATABASE_ID missing');
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;

async function cf(path, method = 'GET', body = null) {
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? {'Content-Type':'application/json'} : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(45000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    const safe = (payload?.errors || []).map(x => ({ code:x.code, message:x.message }));
    throw new Error(`Cloudflare API error ${response.status} ${method} ${path}: ${JSON.stringify(safe)}`);
  }
  return payload;
}
async function d1(sql, params = []) {
  const obj = await cf(`/d1/database/${databaseId}/query`, 'POST', {sql, params});
  const record = Array.isArray(obj.result) ? obj.result[0] : obj.result;
  if (record?.success === false) throw Error('D1 query failed: '+sql.slice(0,40));
  return record?.results || [];
}
async function listR2(prefix) {
  const output = [];
  let cursor;
  for (let page=0;page<100;page++) {
    const query = new URLSearchParams({ prefix, per_page:'1000' });
    if (cursor) query.set('cursor',cursor);
    const resp = await cf(`/r2/buckets/autosaleumar-media/objects?${query}`);
    output.push(...(resp.result || []));
    const info = resp.result_info || {};
    if (!info.is_truncated) return output;
    if (!info.cursor || info.cursor === cursor) throw Error('Invalid R2 pagination cursor');
    cursor = info.cursor;
  }
  throw Error('Too many R2 listing pages; refusing ambiguous restore');
}
const rows = await d1('SELECT id,title,object_key,sort_order,enabled FROM showroom_idle_videos');
const candidates = await listR2('showroom/idle/');
const objects = new Map(candidates.filter(x => /^showroom\/idle\/[a-z0-9-]+\.mp4$/.test(x.key)).map(x => [x.key,x]));
const indicator = /(?:^|[^a-z0-9а-яё])(?:g[-_ ]?class|g[-_ ]?wagen|g[-_ ]?63|gelik|гелик|гелендваген)(?=$|[^a-z0-9а-яё])/i;
const isG = (s) => indicator.test(String(s || ''));
const matchingRows = rows.filter(r => isG(r.id) || isG(r.title) || isG(r.object_key));

// Prefer an actual existing R2 object referenced by an existing D1 row.
let chosen = matchingRows.find(r => objects.has(r.object_key));
let key = chosen?.object_key;
if (!key) {
  // Reuse obvious G-Class object names, even if an older migration removed its D1 row.
  const named = [...objects.keys()].filter(k => isG(k));
  if (named.length === 1) key = named[0];
  else if (named.length > 1) {
    // Take an object already referenced in the database; otherwise fail rather than guess.
    const linked = named.find(k => rows.some(r => r.object_key === k));
    if (!linked) throw Error('Multiple G-Class R2 objects found. Refusing to add a duplicate: '+named.join(', '));
    key = linked;
  }
}
if (!key) {
  // Detect byte-identical old upload even if it had a generic filename.
  // Original supplied MP4: 68,323,156 bytes. Optimized fallback: see size below.
  const sameSize = [...objects.values()].filter(o => [68323156, 21456394].includes(Number(o.size)));
  for (const item of sameSize) {
    const url = `${base}/r2/buckets/autosaleumar-media/objects/${item.key}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok || !response.body) throw Error(`Cannot verify existing R2 object ${item.key}: ${response.status}`);
    const digest = createHash('sha256');
    for await (const chunk of response.body) digest.update(chunk);
    const checksum = digest.digest('hex');
    if (checksum === 'a448ab87defb6d4ecb1f12b19ea56c703b94aae04631143d514aef8f077075cc' ||
        checksum === 'a5578f736ef9f018483ed05415155d6f65c1a718cafeabd17a416378012d9412') {
      key = item.key;
      break;
    }
  }
}
if (!key) {
  // Only now do we put the fallback in R2. Never overwrite an existing key.
  key = 'showroom/idle/g-class.mp4';
  if (!objects.has(key)) {
    const file = resolve('seed/showroom/g-class.mp4');
    if (!existsSync(file)) throw Error('G-Class fallback video is missing');
    console.log('G-Class not present in R2; uploading one canonical video object');
    execFileSync('npx', [ '--yes','wrangler@4','r2','object','put',
      `autosaleumar-media/${key}`, '--file',file,
      '--content-type','video/mp4','--remote','--force'
    ], { stdio:'inherit', env:process.env, timeout:600000 });
  }
} else {
  console.log('Reusing G-Class video already stored in R2: '+key);
}

// Other active videos keep their current order. Re-enable old G-Class row
// if found; otherwise attach the existing object under a single stable ID.
const linked = rows.find(r => r.object_key === key);
chosen = linked || matchingRows.find(r => r.object_key === key) || null;
const nextOrder = Math.max(30, ...rows.filter(r => r.id !== chosen?.id && r.enabled).map(r => Number(r.sort_order)||0)) + 10;
let selectedId;
if (chosen) {
  selectedId = chosen.id;
  await d1('UPDATE showroom_idle_videos SET title=?1,enabled=1,sort_order=?2 WHERE id=?3', ['Mercedes-Benz G-Class',nextOrder,chosen.id]);
} else {
  // If a detached G-Class row exists, use it only if its old key is not used elsewhere.
  // New ID is intentionally stable, so rerunning this script does not add duplicates.
  const free = matchingRows.find(r => !objects.has(r.object_key) && !rows.some(o => o.id!==r.id && o.object_key===key));
  if (free) {
    selectedId = free.id;
    await d1('UPDATE showroom_idle_videos SET title=?1,object_key=?2,enabled=1,sort_order=?3 WHERE id=?4', ['Mercedes-Benz G-Class',key,nextOrder,free.id]);
  } else {
    selectedId = 'g-class';
    await d1(`INSERT INTO showroom_idle_videos (id,title,object_key,sort_order,enabled)
      VALUES (?1,?2,?3,?4,1)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,object_key=excluded.object_key,sort_order=excluded.sort_order,enabled=1`,
      ['g-class','Mercedes-Benz G-Class',key,nextOrder]);
  }
}
// Keep previous records for audit/rollback, but ensure only one G-Class is active.
for (const old of matchingRows) {
  if (old.id !== selectedId && old.enabled) {
    await d1('UPDATE showroom_idle_videos SET enabled=0 WHERE id=?1', [old.id]);
  }
}
const finalRows = await d1('SELECT id, title, object_key, enabled FROM showroom_idle_videos WHERE enabled=1 ORDER BY sort_order,id');
console.log('ACTIVE SHOWROOM FILMS:', JSON.stringify(finalRows.map(r=>({id:r.id,title:r.title,key:r.object_key}))));
console.log('G-Class restored without creating a duplicate media object.');
