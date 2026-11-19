import { writeFileSync } from 'node:fs';
const id=process.env.ASU_D1_DATABASE_ID;
if(!id||!(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw Error('Set ASU_D1_DATABASE_ID for the new empty autosaleumar-db');
const prod=process.env.ASU_ATTACH_DOMAINS==='true';
const config={name:'autosaleumar-backend',main:'backend/worker.ts',compatibility_date:'2026-11-19',workers_dev:true,assets:{directory:'./out',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'autosaleumar-db',database_id:id,migrations_dir:'migrations'}],r2_buckets:[{binding:'MEDIA',bucket_name:'autosaleumar-media'}]};
if(prod) config.routes=['autosaleumar.com','www.autosaleumar.com','api.autosaleumar.com','display.autosaleumar.com'].map(pattern=>({pattern,custom_domain:true}));
writeFileSync('wrangler.generated.json',JSON.stringify(config,null,2)+'\n');
