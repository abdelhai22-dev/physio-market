/* PHYSIO MARKET — Market Radar / Phase 1
   Read-only signal engine over existing browser data. No invented records,
   no external crawling, and no mutation of the existing market database. */
(() => {
  "use strict";
  const D = window.PHYSIO_DATA || {};
  const $ = (s, root=document) => root.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const arr = k => Array.isArray(D[k]) ? D[k] : [];
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const money = (v, currency) => Number(v).toLocaleString("en-US",{maximumFractionDigits:2})+" "+(currency||"");
  const dateOnly = v => String(v||"").slice(0,10);
  const dayDiff = v => {
    const d = new Date(dateOnly(v)+"T12:00:00");
    return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now()-d.getTime())/86400000);
  };
  const nameOf = x => x && (x.name || x.productName || x.title || x.code) || "سجل غير مسمى";
  const productMap = new Map([...arr("devices"),...arr("consumables")].map(x=>[x.code,x]));
  const sourceMap = new Map(arr("sources").map(x=>[x.code,x]));
  const signals = [];
  const push = x => signals.push(Object.assign({confidence:"متوسطة",severity:"مراجعة",evidence:[],targetView:"dashboard",targetCode:""},x));
  const productName = code => nameOf(productMap.get(code)) || code || "منتج غير محدد";
  const addProductLink = (p) => {
    const linked = arr("productLinks").some(x=>x.productCode===p.code && (x.authorizationStatus==="authorized" || x.status==="verified" || x.evidenceStatus==="verified"));
    const sourced = arr("sourcing").some(x=>x.productCode===p.code && (x.evidenceStatus==="verified" || x.relationshipStatus==="quoted" || x.relationshipStatus==="contracted"));
    const distributor = arr("distributors").some(x=>x.code===p.distributorCode && x.authorizationStatus==="authorized");
    return linked || sourced || distributor;
  };
  const priceRows = [];
  arr("priceSnapshots").forEach(x=>priceRows.push({
    code:x.code, productCode:x.productCode, amount:n(x.amount), currency:x.currency||"",
    observedAt:dateOnly(x.observedAt), seller:x.seller||x.company||"بائع غير محدد",
    sourceCode:x.sourceCode||"", sourceUrl:x.sourceUrl||(sourceMap.get(x.sourceCode)||{}).url||"",
    status:x.status||"needs_review", priceType:x.priceType||""
  }));
  arr("prices").forEach(x=>{
    const candidate={code:x.code,productCode:x.productCode,amount:n(x.amount),currency:x.currency||"",
      observedAt:dateOnly(x.observedAt),seller:x.company||x.companyName||x.companyCode||"بائع غير محدد",
      sourceCode:x.sourceCode||"",sourceUrl:(sourceMap.get(x.sourceCode)||{}).url||"",
      status:x.status||"needs_review",priceType:x.priceType||""};
    const key=[candidate.productCode,candidate.amount,candidate.currency,candidate.observedAt,candidate.sourceCode].join("|");
    if(!priceRows.some(y=>[y.productCode,y.amount,y.currency,y.observedAt,y.sourceCode].join("|")===key)) priceRows.push(candidate);
  });
  const validPrices = priceRows.filter(x=>x.productCode && x.amount>0 && x.currency);
  const allProducts=[...arr("devices"),...arr("consumables")];

  // 1) Price spread signals: same product, same currency, at least two distinct sellers.
  const byProductCurrency = new Map();
  validPrices.forEach(p=>{
    const k=p.productCode+"|"+p.currency;
    if(!byProductCurrency.has(k)) byProductCurrency.set(k,[]);
    byProductCurrency.get(k).push(p);
  });
  byProductCurrency.forEach((rows,key)=>{
    const sellers=new Set(rows.map(x=>x.seller));
    if(rows.length<2 || sellers.size<2) return;
    const values=rows.map(x=>x.amount), low=Math.min(...values), high=Math.max(...values);
    const spread=low>0?((high-low)/low)*100:0;
    if(spread<25) return;
    const p=productMap.get(rows[0].productCode);
    push({
      id:"price-"+key,kind:"price",label:"إنذار سعري",severity:spread>=50?"مرتفع":"مراجعة",
      confidence:rows.every(x=>x.sourceUrl)?"متوسطة":"منخفضة",
      title:"تفاوت سعري يستحق التحقق — "+productName(rows[0].productCode),
      summary:"تم رصد "+rows.length+" أسعار من "+sellers.size+" جهات بعملة واحدة؛ الفارق بين أقل وأعلى رصد "+spread.toFixed(1)+"%. هذا اختلاف أسعار منشورة وليس هامش ربح مؤكدًا.",
      evidence:rows.map(x=>x.seller+": "+money(x.amount,x.currency)+" · "+(x.observedAt||"تاريخ غير محدد")),
      sources:rows.filter(x=>x.sourceUrl).map(x=>x.sourceUrl), qualityRows:rows, spreadPct:spread,
      action:"راجع تاريخ الرصد والتكوين والضمان والتوفر، ثم اطلب عرضًا موحد المواصفات.",
      targetView:"priceIntelligence",targetCode:rows[0].productCode,sort:1
    });
  });

  // 2) Import economics only when a landed-cost calculation and local EGP price coexist.
  allProducts.forEach(p=>{
    const local=validPrices.filter(x=>x.productCode===p.code && x.currency==="EGP");
    const landed=arr("landedCosts").filter(x=>x.productCode===p.code && n(x.landedUnitEGP)>0);
    if(!local.length || !landed.length) return;
    const bestLocal=Math.max(...local.map(x=>x.amount));
    const lowestLanded=Math.min(...landed.map(x=>n(x.landedUnitEGP)));
    if(lowestLanded<=0 || bestLocal<=lowestLanded) return;
    const gross=(bestLocal-lowestLanded)/bestLocal*100;
    if(gross<12) return;
    push({
      id:"economics-"+p.code,kind:"opportunity",label:"فرصة استثمارية محتملة",severity:gross>=25?"مرتفع":"مراجعة",
      confidence:local.some(x=>x.sourceUrl)?"متوسطة":"منخفضة",
      title:"فارق تكلفة يستحق دراسة — "+productName(p.code),
      summary:"أعلى سعر محلي مرصود "+money(bestLocal,"EGP")+" مقابل أقل تكلفة وحدة واصلة مسجلة "+money(lowestLanded,"EGP")+"؛ الفارق الحسابي "+gross.toFixed(1)+"% قبل المصروفات التجارية والضمان والتشغيل والخصومات.",
      evidence:["عدد الرصود المحلية: "+local.length,"عدد حسابات التكلفة الواصلة: "+landed.length],
      sources:local.filter(x=>x.sourceUrl).map(x=>x.sourceUrl), qualityRows:local, marginGapPct:gross,
      action:"راجع HS Code والرسوم وصلاحية الأسعار، ثم أضف المصروفات التجارية قبل اتخاذ قرار شراء.",
      targetView:"landedCosts",targetCode:p.code,sort:0
    });
  });

  // 3) Model identity and supply-chain evidence gaps; these are database gaps, not proof of market absence.
  const unverifiedModels=arr("devices").filter(p=>!["documented_match","confirmed_by_factory"].includes(p.modelMatchStatus));
  if(unverifiedModels.length) push({
    id:"model-verification",kind:"verification",label:"معلومة ناقصة",severity:"مراجعة",confidence:"منخفضة",
    title:"مطابقة المصنع الأصلي تحتاج استكمالًا",
    summary:unverifiedModels.length+" جهازًا لا يحمل حتى الآن حالة مطابقة موثقة للمصنع الأصلي والموديل. لا يعني ذلك أن المصنع غير معروف في السوق.",
    evidence:unverifiedModels.slice(0,8).map(p=>productName(p.code)+" · "+p.code),
    action:"استكمل الاسم القانوني للمصنع ورقم Part No. ودليل الكتالوج أو تأكيد المصنع.",
    targetView:"devices",targetCode:unverifiedModels[0].code,sort:3
  });

  const noVerifiedSupply=allProducts.filter(p=>!addProductLink(p));
  if(noVerifiedSupply.length) push({
    id:"supply-coverage",kind:"gap",label:"فجوة تغطية البيانات",severity:"مراجعة",confidence:"منخفضة",
    title:"منتجات بلا رابط توريد موثق داخل القاعدة",
    summary:noVerifiedSupply.length+" منتجًا لا يرتبط حاليًا بدليل توريد موثق على مستوى الموديل. هذا نقص في تغطية قاعدة البيانات، وليس إثباتًا لعدم وجود مورد محلي.",
    evidence:noVerifiedSupply.slice(0,8).map(p=>productName(p.code)+" · "+p.code),
    action:"اربط كل منتج بالمصنع الأصلي والمورد المصري المحتمل، ثم وثّق العلاقة بمستند أو مصدر مباشر.",
    targetView:"sourcing",targetCode:noVerifiedSupply[0].code,sort:4
  });

  const noQuote=allProducts.filter(p=>!arr("quotes").some(q=>q.productCode===p.code && (q.exwPrice||q.fobPrice||q.cifPrice||q.price)));
  if(noQuote.length) push({
    id:"quote-coverage",kind:"quote",label:"تحتاج عروض أسعار",severity:"مراجعة",confidence:"منخفضة",
    title:"منتجات تحتاج طلب عروض موردين",
    summary:noQuote.length+" منتجًا لا يوجد له عرض مورد مسجل في قاعدة البيانات حتى الآن.",
    evidence:noQuote.slice(0,8).map(p=>productName(p.code)+" · "+p.code),
    action:"طابق الموديل مع المصنع أولًا، ثم أرسل RFQ واطلب أسعار EXW وFOB وCIF لنفس التكوين والكمية.",
    targetView:"quotes",targetCode:noQuote[0].code,sort:5
  });

  const stale=validPrices.filter(x=>{const d=dayDiff(x.observedAt);return d!==null&&d>45;});
  if(stale.length) push({
    id:"stale-prices",kind:"freshness",label:"إنذار تحديث",severity:"مراجعة",confidence:"متوسطة",
    title:"أرصدة أسعار تحتاج تحديثًا",
    summary:stale.length+" رصد سعر أقدم من 45 يومًا؛ لا ينبغي استخدامه كمرجع حالي دون إعادة التحقق.",
    evidence:stale.slice(0,8).map(x=>productName(x.productCode)+" · "+x.seller+" · "+x.observedAt),
    action:"أعد فتح المصدر أو تواصل مع البائع وسجل رصدًا جديدًا بتاريخ اليوم.",
    targetView:"prices",targetCode:stale[0].productCode,sort:2
  });

  const pendingSourcing=arr("sourcing").filter(x=>x.evidenceStatus!=="verified");
  if(pendingSourcing.length) push({
    id:"sourcing-leads",kind:"supplier",label:"فرصة مورد قيد التحقق",severity:"مراجعة",confidence:"منخفضة",
    title:"روابط استكشافية بين فئات وموردين تحتاج تحققًا",
    summary:pendingSourcing.length+" روابط توريد استكشافية مسجلة، ولم تصل حالة إثباتها إلى verified. لا تعتبر وكالة أو علاقة توريد مؤكدة.",
    evidence:pendingSourcing.slice(0,8).map(x=>x.productCategory+" · "+x.factoryCode+" ↔ "+x.egyptianCompanyCode),
    action:"اطلب تأكيد الموديل والمصنع والمستورد ومستند التفويض أو عرض السعر قبل اعتماد العلاقة.",
    targetView:"sourcing",targetCode:pendingSourcing[0].code,sort:4
  });

  arr("opportunities").filter(x=>!["won","lost"].includes(x.stage)).forEach(x=>push({
    id:"manual-"+x.code,kind:"manual",label:"فرصة مسجلة",severity:x.priority==="high"?"مرتفع":"متابعة",
    confidence:x.confidence==="high"?"مرتفعة":x.confidence==="low"?"منخفضة":"متوسطة",
    title:x.title||"فرصة تجارية "+x.code,
    summary:"فرصة مدخلة يدويًا في سجل الفرص؛ المرحلة الحالية: "+(x.stage||"غير محددة")+". "+(x.notes||""),
    evidence:[x.code,x.productCode||"",x.customerCode||""].filter(Boolean),
    action:x.nextFollowUp?"موعد المتابعة المسجل: "+x.nextFollowUp:"حدد إجراءً وموعد متابعة للفرصة.",
    targetView:"opportunities",targetCode:x.code,sort:0
  }));

  const order={"مرتفع":0,"مراجعة":1,"متابعة":2};
  signals.sort((a,b)=>(order[a.severity]??3)-(order[b.severity]??3)||(a.sort??9)-(b.sort??9));

  // Opportunity heat is a prioritization signal, not a profit or investment guarantee.
  const heatScore = s => {
    let score = s.kind==="opportunity" ? 62 : s.kind==="price" ? 48 : s.kind==="manual" ? 45 : s.kind==="freshness" ? 30 : 18;
    if (s.kind==="opportunity") score += Math.min(22, n(s.marginGapPct)*0.65);
    if (s.kind==="price") score += Math.min(20, n(s.spreadPct)*0.35);
    score += s.severity==="مرتفع" ? 10 : s.severity==="مراجعة" ? 5 : 0;
    score += s.confidence==="مرتفعة" ? 8 : s.confidence==="متوسطة" ? 4 : 0;
    return Math.max(5,Math.min(95,Math.round(score)));
  };
  const qualityOf = s => {
    const rows=Array.isArray(s.qualityRows)?s.qualityRows:[];
    if (!rows.length) {
      const fallback=s.confidence==="مرتفعة"?72:s.confidence==="متوسطة"?54:30;
      return {score:fallback,label:fallback>=70?"جيدة":fallback>=45?"متوسطة":"ضعيفة"};
    }
    const verified=rows.filter(x=>["verified","confirmed","approved"].includes(String(x.status||"").toLowerCase())).length;
    const linked=rows.filter(x=>/^https?:\/\//i.test(String(x.sourceUrl||""))).length;
    const recent=rows.filter(x=>{const d=dayDiff(x.observedAt);return d!==null&&d<=30;}).length;
    const score=Math.round((verified/rows.length)*65+(linked/rows.length)*15+(recent/rows.length)*20);
    return {score,label:score>=70?"جيدة":score>=45?"متوسطة":"ضعيفة"};
  };
  const heatLabel = score => score>=70?"حرارة مرتفعة":score>=40?"حرارة متوسطة":"حرارة منخفضة";

  const counts={
    investment:signals.filter(x=>x.kind==="opportunity").length,
    gaps:signals.filter(x=>x.kind==="gap").length,
    price:signals.filter(x=>x.kind==="price").length,
    verify:signals.filter(x=>["verification","supplier"].includes(x.kind)).length,
    data:signals.filter(x=>["quote","freshness"].includes(x.kind)).length
  };
  function card(s){
    const tone=s.severity==="مرتفع"?"is-high":s.severity==="متابعة"?"is-follow":"";
    const heat=heatScore(s), quality=qualityOf(s);
    const heatTone=heat>=70?"hot":heat>=40?"warm":"cool";
    const qualityTone=quality.score>=70?"good":quality.score>=45?"mid":"weak";
    const src=(s.sources||[]).filter(u=>/^https?:\/\//i.test(String(u))).map((u,i)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener">مصدر '+(i+1)+' ↗</a>').join(" · ");
    return '<article class="mr-signal '+tone+' mr-heat-'+heatTone+'"><div class="mr-signal-top"><span class="mr-tag">'+esc(s.label)+'</span><span class="mr-confidence">قوة الدليل: '+esc(s.confidence)+'</span></div>'+
      '<div class="mr-heat-panel"><div class="mr-heat-head"><span>مؤشر حرارة الفرصة</span><b>'+heat+' / 100 · '+heatLabel(heat)+'</b></div><div class="mr-heat-track" style="--heat:'+heat+'%" role="img" aria-label="حرارة الفرصة '+heat+' من 100"><i></i></div><div class="mr-heat-scale"><span>منخفضة</span><span>متوسطة</span><span>مرتفعة</span></div></div>'+
      '<h3>'+esc(s.title)+'</h3><p>'+esc(s.summary)+'</p>'+
      '<div class="mr-quality"><span class="mr-quality-dot '+qualityTone+'"></span><b>جودة الرصد: '+esc(quality.label)+'</b><strong>'+quality.score+'%</strong><small>تعتمد على حالة التحقق ووجود المصدر وحداثة الرصد</small></div>'+
      (s.evidence&&s.evidence.length?'<ul>'+s.evidence.map(e=>'<li>'+esc(e)+'</li>').join("")+'</ul>':"")+
      '<div class="mr-action"><b>الخطوة التالية:</b> '+esc(s.action)+'</div><div class="mr-card-foot">'+(src?'<span>'+src+'</span>':"<span>لا يوجد رابط مصدر مباشر في الإشارة</span>")+'<div class="mr-case-action">'+(productMap.has(s.targetCode)?'<button class="btn tiny" data-mr-case="'+esc(s.targetCode)+'">'+(arr("marketRadarCases").some(c=>c.productCode===s.targetCode)?"فتح بطاقة المتابعة":"إنشاء بطاقة فرصة")+'</button>':"")+'<button class="btn tiny secondary" data-radar-go="'+esc(s.targetView)+'">فتح القسم المرتبط</button></div></div></article>';
  }

  // Live online discovery — requires the separately deployed Worker endpoint.
  let onlineResults=[];
  let onlineStatus="idle";
  let onlineProgress="";
  let onlineLastScan="";
  const scanConfig=()=>{
    try{return JSON.parse(localStorage.getItem("physio-market-radar-config-v1")||"{}");}
    catch(_){return {};}
  };
  const saveScanConfig=cfg=>{
    try{localStorage.setItem("physio-market-radar-config-v1",JSON.stringify(cfg));return true;}
    catch(_){return false;}
  };
  const onlineSection=()=>{
    const cfg=scanConfig();
    const cards=onlineResults.map(r=>{
      const price=r.priceText?'<div class="mr-online-price"><b>'+esc(r.priceText)+'</b><small>مؤشر سعر من مقتطف البحث — غير مؤكد حتى فتح المصدر</small></div>':'<div class="mr-online-no-price">لم يظهر سعر قابل للاستخراج بوضوح في مقتطف البحث</div>';
      const promo=r.promotionHint?'<span class="mr-online-promo">عبارات ترويجية بالمقتطف · تحتاج تحقق</span>':'';
      return '<article class="mr-online-card"><div class="mr-online-card-top"><span>'+esc(r.marketLabel||"مصدر ويب")+'</span><small>'+esc(r.observedAt||"وقت الرصد غير متاح")+'</small></div><h4>'+esc(r.title||"نتيجة بحث")+'</h4><p>'+esc(r.description||"لا يوجد وصف متاح")+'</p>'+price+promo+'<div class="mr-online-meta"><span>الموديل: '+esc(r.productLabel||"غير محدد")+'</span><span>الانتهاء: '+esc(r.expiryText||"غير معلن في المصدر")+'</span></div><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">فتح المصدر الأصلي ↗</a><small class="mr-online-query">استعلام: '+esc(r.query||"")+'</small></article>';
    }).join("");
    return '<div class="mr-scan-panel" id="mr-online-scan-panel"><div class="mr-scan-panel-head"><div><b>محرك البحث الحيّ</b><p>يرسل موديلات القاعدة إلى خدمة بحث آمنة، ويعيد روابط المصادر ومقتطفاتها داخل الرادار. مفتاح Tavily يبقى على الخادم ولا يوضع في الموقع.</p></div><span class="mr-scan-count">'+allProducts.length+' منتجًا في القاعدة</span></div>'+
      '<div class="mr-online-config"><label><span>رابط محرك الرصد (Worker URL)</span><input id="mr-worker-url" type="url" placeholder="https://physio-market-radar.abdelhai22.workers.dev" value="'+esc(cfg.endpoint||"https://physio-market-radar.abdelhai22.workers.dev")+'"></label><label><span>رمز الوصول الخاص بالمحرك</span><input id="mr-worker-token" type="password" autocomplete="off" placeholder="أدخل رمز الوصول الذي ضبطته على الخادم" value="'+esc(cfg.token||"")+'"></label><button class="btn secondary" id="mr-save-config" type="button">حفظ الإعدادات على هذا الجهاز</button></div>'+
      '<div class="mr-online-controls"><button class="mr-scan-button" id="mr-run-live-scan" type="button" '+(onlineStatus==="running"?"disabled":"")+'><b>'+(onlineStatus==="running"?"المسح جارٍ...":"ابدأ البحث الأونلاين الآن")+'</b></button><span class="mr-online-state">'+esc(onlineStatus==="running"?onlineProgress:onlineStatus==="done"?"اكتمل البحث · "+onlineResults.length+" نتيجة":onlineStatus==="error"?onlineProgress:"جاهز لبدء المسح بعد ضبط الاتصال")+'</span></div>'+
      (onlineLastScan?'<div class="mr-online-last">آخر تشغيل: '+esc(onlineLastScan)+'</div>':"")+
      (cards?'<div class="mr-online-results"><h3>نتائج المصادر المكتشفة</h3><div class="mr-online-grid">'+cards+'</div></div>':"")+
      '<div class="mr-scan-note"><b>حدود الدقة:</b> نتيجة البحث ليست عرض سعر مؤكدًا. السعر السابق والحالي والخصم ومدة العرض لا تظهر إلا إذا قدم المصدر بيانات صريحة قابلة للتحقق؛ لا يخمّن الرادار تاريخ انتهاء أو توافر مخزون. لا توجد مقارنة بين موديلات مختلفة.</div></div>';
  };
  async function runOnlineScan(){
    const cfg=scanConfig();
    if(!cfg.endpoint||!cfg.token){onlineStatus="error";onlineProgress="احفظ رابط Worker ورمز الوصول أولًا.";render();return;}
    onlineStatus="running";onlineResults=[];onlineProgress="جارٍ تجهيز المنتجات...";render();
    const products=allProducts.map(p=>({code:p.code,name:p.name||p.productName||p.title||"",brand:p.brand||"",model:p.model||"",category:p.category||"",type:arr("devices").some(x=>x.code===p.code)?"device":"consumable"}));
    try{
      const batchSize=8;
      for(let i=0;i<products.length;i+=batchSize){
        const batch=products.slice(i,i+batchSize);
        onlineProgress="تم فحص "+Math.min(i,products.length)+" من "+products.length+" منتجًا...";
        const response=await fetch(cfg.endpoint.replace(/\/$/,"")+"/scan",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+cfg.token},body:JSON.stringify({products:batch,markets:["EG","CN"]})});
        if(!response.ok)throw new Error("الخادم أعاد "+response.status+" — راجع إعدادات Worker ورمز الوصول.");
        const payload=await response.json();
        if(!Array.isArray(payload.results))throw new Error("صيغة استجابة محرك الرصد غير صحيحة.");
        onlineResults=onlineResults.concat(payload.results);
        onlineProgress="تم فحص "+Math.min(i+batch.length,products.length)+" من "+products.length+" منتجًا...";
        render();
      }
      onlineStatus="done";onlineProgress="";onlineLastScan=new Date().toLocaleString("ar-EG");render();
    }catch(err){onlineStatus="error";onlineProgress=err&&err.message?err.message:"تعذر الاتصال بمحرك الرصد.";render();}
  }

  function radarPage(){
    const selected=$("#mr-filter")?.value||"all";
    const filtered=selected==="all"?signals:signals.filter(x=>x.kind===selected);
    const last=validPrices.reduce((m,x)=>!m||x.observedAt>m?x.observedAt:m,"");
    const stats=[
      ["فرص استثمارية محتملة",counts.investment,"target"],
      ["فجوات تغطية البيانات",counts.gaps,"database"],
      ["إنذارات سعرية",counts.price,"chart"],
      ["تحققات معلقة",counts.verify,"shield"],
      ["بيانات تحتاج استكمالًا",counts.data,"file"]
    ];
    return '<div class="mr-hero"><div><span class="mr-eyebrow">A&amp;S MEDICAL · MARKET INTELLIGENCE</span><h2>رادار فرص السوق</h2><p>محرك يجمع نتائج بحث ويب مباشرة لكل موديل، ويعرض المصدر ووقت الرصد ومؤشرات السعر مع فصل البيانات المؤكدة عن غير المؤكدة.</p></div><div class="mr-hero-actions"><div class="mr-live"><i></i> بحث ويب عند الطلب</div><button class="mr-scan-button" id="mr-online-scan" type="button"><span>⌕</span><b>ابدأ المسح الذكي للسوق</b><small>LIVE WEB DISCOVERY</small></button></div></div>'+
      onlineSection()+
      '<div class="mr-disclaimer"><b>حدود الرصد:</b> هذه المرحلة تحلل البيانات الموجودة فقط. لا تُعد مقتطفات البحث عروض أسعار مؤكدة. لا تُعد فجوة البيانات دليلًا على غياب المنتج أو المورد من السوق، ولا تُعد فروق الأسعار هامش ربح مؤكدًا.</div>'+
      '<div class="mr-kpis">'+stats.map(x=>'<div class="mr-kpi"><span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>').join("")+'</div>'+
      '<div class="mr-heat-legend"><b>مقياس الحرارة:</b><span class="cool">أخضر · أولوية منخفضة</span><span class="warm">أصفر · تحتاج دراسة</span><span class="hot">أحمر · أولوية مرتفعة</span><small>الحرارة لترتيب المتابعة وليست نسبة ربح أو توصية شراء.</small></div><div class="mr-toolbar"><div><h3>الإشارات المكتشفة</h3><p>آخر تاريخ رصد سعر متاح: '+(last||"لا توجد أرصدة أسعار")+' · '+signals.length+' إشارة إجمالًا</p></div><div class="mr-controls"><select id="mr-filter" aria-label="تصفية الإشارات"><option value="all">كل الإشارات</option><option value="opportunity">فرص استثمارية</option><option value="price">إنذارات سعرية</option><option value="gap">فجوات البيانات</option><option value="verification">مطابقة المصنع</option><option value="supplier">فرص الموردين</option><option value="quote">طلبات عروض الأسعار</option><option value="freshness">تحديث الأسعار</option><option value="manual">الفرص المسجلة</option></select><button class="btn secondary" id="mr-refresh">تحديث التحليل</button><button class="btn secondary" id="mr-export">تصدير الإشارات CSV</button></div></div>'+
      (filtered.length?'<div class="mr-list">'+filtered.map(card).join("")+'</div>':'<div class="panel empty">لا توجد إشارات من هذا النوع حاليًا. أضف بيانات موثقة أو غيّر عامل التصفية.</div>')+
      '<div class="mr-method"><h3>كيف يصدر الرادار الإشارات؟</h3><div class="mr-method-grid"><div><b>1 · الربط</b><span>يربط المنتج بالسعر والمصدر والمصنع والمورد وعروض الأسعار والتكلفة الواصلة.</span></div><div><b>2 · التحقق</b><span>يفصل بين المعلومة المنشورة والعلاقة المؤكدة والبيانات التي تحتاج مراجعة.</span></div><div><b>3 · التقييم</b><span>يحسب الفروق القابلة للمقارنة ويعرض قوة الدليل والخطوة التالية.</span></div></div></div>';
  }

  Object.assign(titles,{marketRadar:"رادار فرص السوق"});
  const nav=$("#main-nav");
  if(nav&&!nav.querySelector('[data-view="marketRadar"]')){
    const b=document.createElement("button");
    b.className="nav-link";b.dataset.view="marketRadar";b.innerHTML="<span>⌖</span> رادار فرص السوق";
    const anchor=nav.querySelector('[data-view="priceIntelligence"]');
    if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(b,anchor);
    else nav.appendChild(b);
  }
  const priorRender=render;
  render=function(){
    if(currentView==="marketRadar"){
      $("#page-title").textContent=titles.marketRadar;
      document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view==="marketRadar"));
      content.innerHTML=radarPage();
      return;
    }
    priorRender();
  };
  content.addEventListener("click",e=>{
    const goButton=e.target.closest("[data-radar-go]");
    if(goButton){go(goButton.dataset.radarGo);return;}
    const scanButton=e.target.closest("#mr-online-scan");
    if(scanButton){const panel=$("#mr-online-scan-panel");if(panel){panel.scrollIntoView({behavior:"smooth",block:"start"});scanButton.classList.add("is-active");}const cfg=scanConfig();if(cfg.endpoint&&cfg.token)runOnlineScan();else{onlineStatus="error";onlineProgress="اضبط رابط محرك الرصد ورمز الوصول مرة واحدة، ثم اضغط الزر الأخضر لبدء المسح مباشرة.";render();}return;}
    if(e.target.closest("#mr-save-config")){
      const endpoint=$("#mr-worker-url")?.value.trim()||"",token=$("#mr-worker-token")?.value.trim()||"";
      if(!/^https:\/\//i.test(endpoint)||!token){alert("أدخل رابط HTTPS ورمز الوصول.");return;}
      saveScanConfig({endpoint,token});alert("تم حفظ إعدادات محرك الرصد على هذا الجهاز.");return;
    }
    if(e.target.closest("#mr-run-live-scan")){runOnlineScan();return;}
    const addPrice=e.target.closest("[data-mr-add-price]");
    if(addPrice){const code=addPrice.dataset.mrAddPrice;go("prices");openForm("prices");const select=$("#record-form [name='productCode']");if(select)select.value=code;return;}
    if(e.target.closest("#mr-refresh")){render();return;}
    if(e.target.closest("#mr-export")){
      const rows=signals;
      const csv=[["نوع الإشارة","العنوان","الملخص","قوة الدليل","الأولوية","الخطوة التالية","الأدلة"].join(","),...rows.map(x=>[x.label,x.title,x.summary,x.confidence,x.severity,x.action,(x.evidence||[]).join(" | ")].map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(","))].join("\r\n");
      const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="physio-market-radar-"+new Date().toISOString().slice(0,10)+".csv";a.click();URL.revokeObjectURL(url);
    }
  });
  content.addEventListener("change",e=>{if(e.target.id==="mr-filter")render();});
})();
