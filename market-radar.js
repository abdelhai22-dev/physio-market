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
      sources:rows.filter(x=>x.sourceUrl).map(x=>x.sourceUrl),
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
      sources:local.filter(x=>x.sourceUrl).map(x=>x.sourceUrl),
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
  const counts={
    investment:signals.filter(x=>x.kind==="opportunity").length,
    gaps:signals.filter(x=>x.kind==="gap").length,
    price:signals.filter(x=>x.kind==="price").length,
    verify:signals.filter(x=>["verification","supplier"].includes(x.kind)).length,
    data:signals.filter(x=>["quote","freshness"].includes(x.kind)).length
  };
  function card(s){
    const tone=s.severity==="مرتفع"?"is-high":s.severity==="متابعة"?"is-follow":"";
    const src=(s.sources||[]).filter(u=>/^https?:\/\//i.test(String(u))).map((u,i)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener">مصدر '+(i+1)+' ↗</a>').join(" · ");
    return '<article class="mr-signal '+tone+'"><div class="mr-signal-top"><span class="mr-tag">'+esc(s.label)+'</span><span class="mr-confidence">قوة الدليل: '+esc(s.confidence)+'</span></div><h3>'+esc(s.title)+'</h3><p>'+esc(s.summary)+'</p>'+
      (s.evidence&&s.evidence.length?'<ul>'+s.evidence.map(e=>'<li>'+esc(e)+'</li>').join("")+'</ul>':"")+
      '<div class="mr-action"><b>الخطوة التالية:</b> '+esc(s.action)+'</div><div class="mr-card-foot">'+(src?'<span>'+src+'</span>':"<span>لا يوجد رابط مصدر مباشر في الإشارة</span>")+'<button class="btn tiny secondary" data-radar-go="'+esc(s.targetView)+'">فتح القسم المرتبط</button></div></article>';
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
    return '<div class="mr-hero"><div><span class="mr-eyebrow">A&amp;S MEDICAL · MARKET INTELLIGENCE</span><h2>رادار فرص السوق</h2><p>تحليل آلي للبيانات المسجلة داخل المنصة لاكتشاف إشارات تجارية ونواقص تستحق المتابعة.</p></div><div class="mr-live"><i></i> تحليل محلي عند فتح القسم</div></div>'+
      '<div class="mr-disclaimer"><b>حدود الرصد:</b> هذه المرحلة تحلل البيانات الموجودة فقط. لا يوجد زحف إنترنت أو تحديث خلفي تلقائي. لا تُعد فجوة البيانات دليلًا على غياب المنتج أو المورد من السوق، ولا تُعد فروق الأسعار هامش ربح مؤكدًا.</div>'+
      '<div class="mr-kpis">'+stats.map(x=>'<div class="mr-kpi"><span>'+esc(x[0])+'</span><b>'+x[1]+'</b></div>').join("")+'</div>'+
      '<div class="mr-toolbar"><div><h3>الإشارات المكتشفة</h3><p>آخر تاريخ رصد سعر متاح: '+(last||"لا توجد أرصدة أسعار")+' · '+signals.length+' إشارة إجمالًا</p></div><div class="mr-controls"><select id="mr-filter" aria-label="تصفية الإشارات"><option value="all">كل الإشارات</option><option value="opportunity">فرص استثمارية</option><option value="price">إنذارات سعرية</option><option value="gap">فجوات البيانات</option><option value="verification">مطابقة المصنع</option><option value="supplier">فرص الموردين</option><option value="quote">طلبات عروض الأسعار</option><option value="freshness">تحديث الأسعار</option><option value="manual">الفرص المسجلة</option></select><button class="btn secondary" id="mr-refresh">تحديث التحليل</button><button class="btn secondary" id="mr-export">تصدير الإشارات CSV</button></div></div>'+
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
