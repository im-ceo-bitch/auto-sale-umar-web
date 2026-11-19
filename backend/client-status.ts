import { json, type Env } from "../functions/_lib/auth";
export async function onRequestPost({request,env}:{request:Request;env:Env}):Promise<Response>{
  let body:any; try {body=await request.json();} catch {return json({success:false,error:"Invalid JSON"},400);}
  const phone=typeof body?.phone==="string"?body.phone.replace(/\D/g,""):"";
  if(phone.length<9||phone.length>15||!Array.isArray(body?.items)||body.items.length>30) return json({success:false,error:"Invalid request"},400);
  const statuses=[];
  for(const item of body.items){
    const kind=item?.kind, code=typeof item?.code==="string"?item.code.trim().toUpperCase():"";
    const table=kind==="vehicleRequest"?"vehicle_requests":kind==="showroomVisit"?"showroom_visits":null;
    if(!table||!(/^(ASU|FIND)-[A-Z0-9]{6,32}$/.test(code))) continue;
    const row=await env.DB.prepare(`SELECT phone,status,updated_at FROM ${table} WHERE public_code=?1 LIMIT 1`).bind(code).first<{phone:string;status:string;updated_at:string}>();
    if(row&&row.phone.replace(/\D/g,"")===phone) statuses.push({kind,code,status:row.status,updatedAt:row.updated_at});
  }
  return json({success:true,statuses});
}
