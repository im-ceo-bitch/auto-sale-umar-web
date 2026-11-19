// Single Worker for static website, legacy APIs and native iOS catalog.
// @ts-ignore Existing JavaScript catalog adapter is bundled by Wrangler.
import mobile from "./mobile-catalog.js";
import * as clientStatus from "./client-status";
import * as staffId from "./staff-id";
import { onRequest as protectAdmin } from "../functions/admin/_middleware";
import { json } from "../functions/_lib/auth";
import * as route0 from "../functions/api/brand-media";
import * as route1 from "../functions/api/car-ai";
import * as route2 from "../functions/api/car-detail";
import * as route3 from "../functions/api/car-media";
import * as route4 from "../functions/api/car-views";
import * as route5 from "../functions/api/cars";
import * as route6 from "../functions/api/catalog";
import * as route7 from "../functions/api/compare-ai";
import * as route8 from "../functions/api/home-media";
import * as route9 from "../functions/api/login";
import * as route10 from "../functions/api/logout";
import * as route11 from "../functions/api/me";
import * as route12 from "../functions/api/ramadan-gift-media";
import * as route13 from "../functions/api/ramadan-gift";
import * as route14 from "../functions/api/setup";
import * as route15 from "../functions/api/staff";
import * as route16 from "../functions/api/vehicle-requests";
import * as route17 from "../functions/api/visits";
// @ts-ignore Existing JavaScript health endpoint.
import * as health from "../functions/api/system-check.js";
import * as showroom from "../functions/api/showroom";
const routes = new Map<string, any>([
  ["showroom", showroom],
  ["brand-media", route0],
  ["car-ai", route1],
  ["car-detail", route2],
  ["car-media", route3],
  ["car-views", route4],
  ["cars", route5],
  ["catalog", route6],
  ["compare-ai", route7],
  ["home-media", route8],
  ["login", route9],
  ["logout", route10],
  ["me", route11],
  ["ramadan-gift-media", route12],
  ["ramadan-gift", route13],
  ["setup", route14],
  ["staff", route15],
  ["vehicle-requests", route16],
  ["visits", route17],
  ["system-check", health],
  ["client-status", clientStatus],
]);
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    try {
      if (!env.DB || !env.MEDIA || !env.AUTH_PEPPER) return json({success:false,error:"Server configuration incomplete"},503);
      if (path === "/health" || path === "/v1/health") {
        await env.DB.prepare("SELECT id FROM users LIMIT 1").first();
        await env.MEDIA.list({limit:1});
        return json({success:true,service:"autosaleumar-backend"});
      }
      if (path.startsWith("/v1/")) return mobile.fetch(request,env);
      if (path.startsWith("/api/")) {
        const name = path.slice(5).replace(/^v1\//, "");
        const staffMatch = name.match(/^staff\/(\d+)$/);
        const route = staffMatch ? staffId : routes.get(name);
        if (!route) return json({success:false,error:"Not found"},404);
        // Cookie-authenticated writes must originate from the same host. Native Bearer clients are unaffected.
        if (!["GET","HEAD","OPTIONS"].includes(request.method) && request.headers.get("cookie")?.includes("asu_session=") && !request.headers.get("authorization")) {
          const origin = request.headers.get("origin");
          if (!origin || origin !== url.origin) return json({success:false,error:"Invalid origin"},403);
        }
        const method = request.method[0]+request.method.slice(1).toLowerCase();
        const handler = route["onRequest"+method] ?? route.onRequest;
        if (!handler) return json({success:false,error:"Method not allowed"},405);
        return await handler({request,env,params:staffMatch?{id:staffMatch[1]}:{}});
      }
      if (url.hostname === "api.autosaleumar.com" || url.hostname === "app-api.autosaleumar.com") return json({success:false,error:"Not found"},404);
      if (path === "/admin" || path.startsWith("/admin/")) return await protectAdmin({request,env,next:()=>env.ASSETS.fetch(request)});
      if (url.hostname === "display.autosaleumar.com" && path === "/") {
        url.pathname="/display/";
        return env.ASSETS.fetch(new Request(url,request));
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("ASU worker error",error);
      return json({success:false,error:"Service temporarily unavailable"},500);
    }
  },
};
