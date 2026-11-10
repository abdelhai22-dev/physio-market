/**
 * PHYSIO MARKET — live market discovery Worker
 * Deploy as a Cloudflare Worker. Set BRAVE_API_KEY and RADAR_ACCESS_TOKEN
 * with `wrangler secret put`; never commit secrets.
 */
const corsHeaders = origin => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Vary": "Origin"
});
const json = (data, status=200, origin="*") => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type":"application/json; charset=utf-8", ...corsHeaders(origin) }
});
const clean = value => String(value || "").replace(/[<>]/g,"").trim().slice(0,180);
const hasPromo = text => /sale|discount|offer|special price|clearance|خصم|عرض خاص|تخفيض|وفر|بدلًا من|بدلا من/i.test(text);
const priceFromText = text => {
  const patterns = [
    /(?:EGP|جنيه(?:\s*مصري)?|LE)\s?([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s?(?:EGP|جنيه(?:\s*مصري)?|LE)\b/i,
    /(?:USD|US\$|\$)\s?([\d,]+(?:\.\d{1,2})?)/i,
    /(?:CNY|RMB|¥)\s?([\d,]+(?:\.\d{1,2})?)/i
  ];
  for (const pattern of patterns) {
    const match = String(text || "").match(pattern);
    if (match) return match[0].trim().slice(0,50);
  }
  return null;
};
const expiryFromText = text => {
  const match = String(text || "").match(/(?:ends?\s*(?:on|at)?|valid\s*(?:until|through)|expires?\s*(?:on)?|ينتهي\s*(?:في|يوم)?|ساري\s*حتى)\s*([\w\u0600-\u06FF,./ -]{3,24})/i);
  return match ? match[0].trim().slice(0,70) : null;
};
async function searchOne(product, market, env) {
  const identity = [product.brand, product.name, product.model].filter(Boolean).join(" ");
  const exact = product.model ? '"' + product.model + '"' : '"' + product.name + '"';
  const query = market === "EG"
    ? (exact + " " + identity + " سعر مصر OR price EGP")
    : (exact + " " + identity + " manufacturer supplier price China");
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query.slice(0,580));
  url.searchParams.set("country", market);
  url.searchParams.set("search_lang", market === "EG" ? "ar" : "en");
  url.searchParams.set("count", "6");
  const response = await fetch(url, { headers: {
    "Accept":"application/json",
    "X-Subscription-Token":env.BRAVE_API_KEY
  }});
  if (!response.ok) throw new Error("Search provider returned " + response.status);
  const data = await response.json();
  return (data.web?.results || []).map(item => {
    const text = [item.title,item.description,...(item.extra_snippets||[])].filter(Boolean).join(" ");
    return {
      productCode:product.code,
      productLabel:[product.brand,product.name,product.model].filter(Boolean).join(" · ") || product.code,
      market:market,
      marketLabel:market === "EG" ? "بحث السوق المصري" : "بحث الموردين العالميين / الصين",
      title:clean(item.title),
      description:clean(item.description),
      url:item.url,
      age:item.age || null,
      observedAt:new Date().toISOString(),
      query:query,
      priceText:priceFromText(text),
      promotionHint:hasPromo(text),
      expiryText:expiryFromText(text) || "غير معلن في المقتطف",
      previousPrice:null,
      currentPrice:null,
      discountPercent:null,
      availability:"غير محدد — يحتاج تحققًا من المصدر",
      evidenceLevel:"search_snippet_unverified"
    };
  });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders(env.ALLOWED_ORIGIN || origin)});
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ok:true,service:"physio-market-radar",provider:env.BRAVE_API_KEY?"configured":"missing_api_key"},200,env.ALLOWED_ORIGIN||origin);
    if (url.pathname !== "/scan" || request.method !== "POST") return json({error:"Not found"},404,env.ALLOWED_ORIGIN||origin);
    if (!env.BRAVE_API_KEY || !env.RADAR_ACCESS_TOKEN) return json({error:"Worker secrets are not configured."},503,env.ALLOWED_ORIGIN||origin);
    if (request.headers.get("Authorization") !== "Bearer " + env.RADAR_ACCESS_TOKEN) return json({error:"Unauthorized"},401,env.ALLOWED_ORIGIN||origin);
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) return json({error:"Origin not allowed"},403,env.ALLOWED_ORIGIN);
    let body;
    try { body=await request.json(); } catch (_) { return json({error:"Invalid JSON"},400,env.ALLOWED_ORIGIN||origin); }
    const products=Array.isArray(body.products)?body.products.slice(0,8):[];
    if (!products.length) return json({results:[],message:"No products in request"},200,env.ALLOWED_ORIGIN||origin);
    const markets=["EG","CN"];
    const tasks=[];
    for (const raw of products) {
      const product={code:clean(raw.code),name:clean(raw.name),brand:clean(raw.brand),model:clean(raw.model)};
      if (!product.code || !(product.name || product.model)) continue;
      for (const market of markets) tasks.push({product,market});
    }
    const results=[];
    for (let i=0;i<tasks.length;i+=3) {
      const chunk=tasks.slice(i,i+3);
      const settled=await Promise.allSettled(chunk.map(t=>searchOne(t.product,t.market,env)));
      for (const item of settled) if(item.status==="fulfilled") results.push(...item.value);
    }
    return json({ok:true,scannedProducts:products.length,results,scannedAt:new Date().toISOString()},200,env.ALLOWED_ORIGIN||origin);
  }
};
