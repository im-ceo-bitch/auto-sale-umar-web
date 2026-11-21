import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const id=process.env.ASU_D1_DATABASE_ID;
if(!id||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw Error('Set ASU_D1_DATABASE_ID for autosaleumar-db');
const prod=process.env.ASU_ATTACH_DOMAINS==='true';
const config={name:'autosaleumar-backend',main:'backend/worker.ts',compatibility_date:'2026-11-19',workers_dev:true,assets:{directory:'./out',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'autosaleumar-db',database_id:id,migrations_dir:'migrations'}],r2_buckets:[{binding:'MEDIA',bucket_name:'autosaleumar-media'}]};
if(prod) config.routes=['autosaleumar.com','www.autosaleumar.com','api.autosaleumar.com','display.autosaleumar.com'].map(pattern=>({pattern,custom_domain:true}));
writeFileSync('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');

// The existing Deploy Showroom Backend workflow invokes this script after
// provisioning D1 and R2. Seed the two user-provided films into R2 automatically.
// Deliberately never delete or rewrite database rows/cars here.
// Re-uploading the identical files at the same two reserved keys is safe.
if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
  for (const name of ['porsche', 'rolls-royce']) {
    const filename = resolve(`seed/showroom/${name}.mp4`);
    if (!existsSync(filename)) throw new Error(`Missing showroom video: ${filename}`);
    console.log(`Uploading showroom fallback video: ${name} (R2)`);
    execFileSync('npx', [
      '--yes','wrangler@4','r2','object','put',
      `autosaleumar-media/showroom/idle/${name}.mp4`,
      '--file',filename,'--content-type','video/mp4','--remote','--force'
    ], { stdio:'inherit', env:process.env, timeout:180000 });
  }
}
