/**
 * PHYSIO MARKET — live market discovery Worker
 * Provider: Tavily Search API (basic depth; normally one credit per query).
 * Required Cloudflare secrets: TAVILY_API_KEY, RADAR_ACCESS_TOKEN.
 * Never put either secret in browser code or GitHub.
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
const safeHttpUrl = value => {
  try { const u=new URL(value); return ["http:","https:"].includes(u.protocol)?u.toString():""; }
  catch (_) { return ""; }
};
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
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.TAVILY_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      query: query.slice(0,380),
      search_depth: "basic",
      topic: "general",
      max_results: 5,
      chunks_per_source: 2,
      include_answer: false,
      include_raw_content: false,
      include_published_date: true,
      country: market === "EG" ? "egypt" : "china",
      language: market === "EG" ? "ar" : "en",
      include_usage: true
    })
  });
  if (!response.ok) throw new Error("Tavily API returned HTTP " + response.status);
  const data = await response.json();
  const results = (data.results || []).map(item => {
    const text = [item.title,item.content].filter(Boolean).join(" ");
    return {
      productCode:product.code,
      productLabel:[product.brand,product.name,product.model].filter(Boolean).join(" · ") || product.code,
      market,
      marketLabel:market === "EG" ? "بحث السوق المصري" : "بحث الموردين العالميين / الصين",
      title:clean(item.title),
      description:clean(item.content),
      url:safeHttpUrl(item.url),
      age:item.published_date || null,
      observedAt:new Date().toISOString(),
      query,
      priceText:priceFromText(text),
      promotionHint:hasPromo(text),
      expiryText:expiryFromText(text) || "غير معلن في المقتطف",
      previousPrice:null,
      currentPrice:null,
      discountPercent:null,
      availability:"غير محدد — يحتاج تحققًا من المصدر",
      evidenceLevel:"search_snippet_unverified",
      relevanceScore:Number.isFinite(Number(item.score))?Number(item.score):null
    };
  }).filter(item=>item.url);
  return {results, credits:Number(data.usage?.credits)||1};
}
export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    const responseOrigin = allowedOrigin === "*" ? (requestOrigin || "*") : allowedOrigin;
    if (request.method === "OPTIONS") {
      if (allowedOrigin !== "*" && requestOrigin && requestOrigin !== allowedOrigin) {
        return new Response(null,{status:403,headers:corsHeaders(allowedOrigin)});
      }
      return new Response(null,{status:204,headers:corsHeaders(responseOrigin)});
    }
    const url = new URL(request.url);
    if (allowedOrigin !== "*" && requestOrigin && requestOrigin !== allowedOrigin) {
      return json({error:"Origin not allowed"},403,allowedOrigin);
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok:true,
        service:"physio-market-radar",
        provider:env.TAVILY_API_KEY?"configured":"missing_api_key",
        accessToken:env.RADAR_ACCESS_TOKEN?"configured":"missing_access_token"
      },200,responseOrigin);
    }
    if (url.pathname !== "/scan" || request.method !== "POST") {
      return json({error:"Not found"},404,responseOrigin);
    }
    if (!env.TAVILY_API_KEY || !env.RADAR_ACCESS_TOKEN) {
      return json({error:"Worker secrets are not configured."},503,responseOrigin);
    }
    if (request.headers.get("Authorization") !== "Bearer " + env.RADAR_ACCESS_TOKEN) {
      return json({error:"Unauthorized"},401,responseOrigin);
    }
    let body;
    try { body=await request.json(); }
    catch (_) { return json({error:"Invalid JSON"},400,responseOrigin); }
    const products=Array.isArray(body.products)?body.products.slice(0,8):[];
    if (!products.length) return json({ok:true,results:[],creditsUsed:0,message:"No products in request"},200,responseOrigin);
    const tasks=[];
    for (const raw of products) {
      const product={code:clean(raw.code),name:clean(raw.name),brand:clean(raw.brand),model:clean(raw.model)};
      if (!product.code || !(product.name || product.model)) continue;
      tasks.push({product,market:"EG"},{product,market:"CN"});
    }
    const results=[];
    const errors=[];
    let creditsUsed=0;
    for (let i=0;i<tasks.length;i+=2) {
      const settled=await Promise.allSettled(tasks.slice(i,i+2).map(t=>searchOne(t.product,t.market,env)));
      for (const item of settled) {
        if(item.status==="fulfilled") {
          results.push(...item.value.results);
          creditsUsed+=item.value.credits;
        } else errors.push(String(item.reason?.message || "Search request failed"));
      }
    }
    if(!results.length && errors.length) {
      const statusMatch=errors[0].match(/HTTP (\d{3})/);
      const status=statusMatch?Number(statusMatch[1]):502;
      return json({error:"Tavily search failed. Check the API key, usage balance, and rate limits.",providerStatus:status},502,responseOrigin);
    }
    return json({
      ok:true,provider:"Tavily",scannedProducts:products.length,results,creditsUsed,
      partialErrors:errors.length,scannedAt:new Date().toISOString()
    },200,responseOrigin);
  }
};
