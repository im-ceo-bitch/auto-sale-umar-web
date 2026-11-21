import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const id=process.env.ASU_D1_DATABASE_ID;
if(!id||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw Error('Set ASU_D1_DATABASE_ID for autosaleumar-db');
const prod=process.env.ASU_ATTACH_DOMAINS==='true';
const config={name:'autosaleumar-backend',main:'backend/worker.ts',compatibility_date:'2026-11-19',workers_dev:true,assets:{directory:'./out',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'autosaleumar-db',database_id:id,migrations_dir:'migrations'}],r2_buckets:[{binding:'MEDIA',bucket_name:'autosaleumar-media'}]};
if(prod) config.routes=['autosaleumar.com','www.autosaleumar.com','api.autosaleumar.com','display.autosaleumar.com'].map(pattern=>({pattern,custom_domain:true}));
writeFileSync('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');

// Preserve the established single-Worker workflow and seed only active videos.
// Film 05 is split into four binary chunks in GitHub to fit the web uploader;
// all chunks are reassembled into a byte-identical MP4 before uploading to R2.
// No transcoding or image-quality degradation occurs here.
if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
  const { createHash } = await import('node:crypto');
  const { openSync, readSync, writeSync, closeSync, mkdtempSync, rmSync, statSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const films = ['film-03','film-04'];
  const chunkDir = resolve('seed/showroom/film-05.parts');
  const chunks = [1,2,3,4].map(i => resolve(chunkDir, `part-${String(i).padStart(2,'0')}.bin`));
  if (chunks.some(p => !existsSync(p))) {
    throw new Error('Missing film-05 chunks. Install patches 01, 02, 03, 04 in order before deploying.');
  }
  const workDir = mkdtempSync(join(tmpdir(), 'asu-film-05-'));
  try {
    const destination = join(workDir,'film-05.mp4');
    const out = openSync(destination,'w');
    const digest = createHash('sha256');
    const buffer = Buffer.allocUnsafe(1024 * 1024);
    let bytes = 0;
    try {
      for (const part of chunks) {
        const input = openSync(part,'r');
        try {
          let n;
          while ((n = readSync(input,buffer,0,buffer.length,null)) > 0) {
            digest.update(buffer.subarray(0,n));
            let pos = 0;
            while (pos < n) pos += writeSync(out,buffer,pos,n-pos);
            bytes += n;
          }
        } finally { closeSync(input); }
      }
    } finally { closeSync(out); }
    const expectedHash = '28434693ab7fa18fce0b6b76174ebad172fc1d7ece2cc536185ff43739c67e6c';
    if (bytes !== 82152830 || digest.digest('hex') !== expectedHash || statSync(destination).size !== bytes) {
      throw new Error('Film 05 checksum mismatch. Rejecting incomplete or altered movie.');
    }
    films.push('film-05');
    for (const name of films) {
      const filename = name === 'film-05' ? destination : resolve(`seed/showroom/${name}.mp4`);
      if (!existsSync(filename)) throw new Error(`Missing showroom video: ${filename}`);
      console.log(`Uploading showroom video ${name} to R2`);
      execFileSync('npx', [
        '--yes','wrangler@4','r2','object','put',
        `autosaleumar-media/showroom/idle/${name}.mp4`,
        '--file',filename,'--content-type','video/mp4','--remote','--force'
      ], { stdio:'inherit', env:process.env, timeout:600000 });
    }
    console.log('Showroom playlist assets uploaded: 03, 04, 05');
  } finally { rmSync(workDir,{recursive:true,force:true}); }
}
