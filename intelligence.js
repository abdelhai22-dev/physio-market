/* PHYSIO MARKET — Market Intelligence extension
   Additive layer: customers, relationships, opportunities, field intelligence,
   audit trail and safe JSON backup. Existing core data and UI remain intact. */
(() => {
  "use strict";
  const D = window.PHYSIO_DATA;
  const $ = (s, root=document) => root.querySelector(s);
  const escI = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today = () => new Date().toISOString().slice(0,10);
  const actorKey = "physio-market-active-founder";
  const actors = ["غير محدد","أحمد عبد الحي","أحمد صلاح"];
  let activeActor = localStorage.getItem(actorKey) || actors[0];

  ["customers","relationships","opportunities","fieldNotes","auditLog","priceSnapshots"].forEach(k => {
    if (!Array.isArray(D[k])) D[k] = [];
  });

  const addField = (view, field) => {
    if (schemas[view] && !schemas[view].some(x => x[0] === field[0])) schemas[view].push(field);
  };
  // Add provenance fields to legacy forms without replacing existing fields.
  ["devices","consumables","companies","suppliers","brands","distributors","quotes","prices","logistics","regulatory"].forEach(view => {
    addField(view, ["recordOrigin","نوع المعلومة","select:published,field,commercial_sensitive"]);
    addField(view, ["confidence","درجة الثقة","select:high,medium,low"]);
    addField(view, ["observedAt","تاريخ الحصول / الرصد","date"]);
    addField(view, ["sourceCode","مصدر المعلومة","ref:sources"]);
  });

  Object.assign(titles, {
    customers:"العملاء والجهات المستهدفة",
    relationships:"العلاقات التجارية",
    opportunities:"الفرص والصفقات",
    fieldNotes:"المعلومات الميدانية",
    audit:"سجل التعديلات",
    backup:"النسخ الاحتياطي",
    priceIntelligence:"تحليل أسعار السوق"
  });
  Object.assign(config, {
    customers:{key:"customers",label:"عميل / جهة",prefix:"CUS",cols:[["code","الكود"],["name","اسم الجهة"],["type","نوع الجهة"],["city","المدينة"],["phone","الهاتف"],["contactPerson","مسؤول التواصل"],["status","حالة التحقق"],["confidentiality","السرية"]]},
    relationships:{key:"relationships",label:"علاقة تجارية",prefix:"REL",cols:[["code","الكود"],["entityACode","الطرف الأول"],["relationshipType","نوع العلاقة"],["entityBCode","الطرف الثاني"],["authorizationStatus","حالة الاعتماد"],["lastContactAt","آخر تواصل"],["confidence","الثقة"]]},
    opportunities:{key:"opportunities",label:"فرصة تجارية",prefix:"OPP",cols:[["code","الكود"],["title","الفرصة"],["customerCode","العميل"],["productCode","الجهاز / المنتج"],["stage","مرحلة الصفقة"],["priority","الأولوية"],["nextFollowUp","المتابعة القادمة"],["confidentiality","السرية"]]},
    fieldNotes:{key:"fieldNotes",label:"معلومة ميدانية",prefix:"NOTE",cols:[["code","الكود"],["title","عنوان المعلومة"],["noteType","نوع المعلومة"],["relatedEntityCode","الجهة المرتبطة"],["capturedAt","تاريخ التسجيل"],["confidence","الثقة"],["confidentiality","السرية"]]}
  });
  Object.assign(schemas, {
    customers:[
      ["name","اسم العميل / الجهة","text",true],
      ["type","نوع الجهة","select:hospital,clinic,rehab_center,medical_center,tender,retailer,other"],
      ["country","الدولة","text"],["city","المدينة","text"],["governorate","المحافظة","text"],
      ["contactPerson","مسؤول التواصل","text"],["phone","الهاتف","tel"],["email","البريد الإلكتروني","email"],
      ["website","الموقع","url"],["sourceCode","مصدر الوصول","ref:sources"],["relationshipOwner","مسؤول المتابعة","select:أحمد عبد الحي,أحمد صلاح,مشترك"],
      ["status","حالة التحقق","select:needs_review,verified,reference"],
      ["confidentiality","مستوى السرية","select:internal,commercial_sensitive"],
      ["notes","ملاحظات","textarea"]
    ],
    relationships:[
      ["entityACode","الطرف الأول","ref:companies+suppliers+customers",true],
      ["relationshipType","نوع العلاقة","select:customer,supplier,manufacturer,distributor,competitor,service_provider,partner,field_contact",true],
      ["entityBCode","الطرف الثاني","ref:companies+suppliers+customers+brands"],
      ["authorizationStatus","حالة الاعتماد / التفويض","select:not_claimed,unverified,authorized,expired,not_authorized"],
      ["sourceCode","مصدر إثبات العلاقة","ref:sources"],["validFrom","بداية العلاقة / التفويض","date"],
      ["validTo","نهاية العلاقة / التفويض","date"],["lastContactAt","آخر تواصل","date"],
      ["confidence","درجة الثقة","select:high,medium,low"],
      ["confidentiality","مستوى السرية","select:internal,commercial_sensitive"],
      ["notes","تفاصيل ونطاق العلاقة","textarea"]
    ],
    opportunities:[
      ["title","اسم / وصف الفرصة","text",true],
      ["opportunityType","نوع الفرصة","select:large_equipment,rehabilitation_system,small_device,consumables,spare_parts,tender,service,other"],
      ["customerCode","العميل المحتمل","ref:customers+companies"],
      ["productCode","الجهاز / المنتج المطلوب","ref:devices+consumables"],
      ["requirement","الاحتياج والمواصفات","textarea"],
      ["sourceType","مصدر الفرصة","select:referral,field_contact,public_tender,website,existing_relationship,other"],
      ["sourceCode","المصدر / المستند","ref:sources"],
      ["owner","مسؤول المتابعة","select:أحمد عبد الحي,أحمد صلاح,مشترك"],
      ["priority","الأولوية","select:high,medium,low"],
      ["stage","مرحلة الصفقة","select:new,contacted,qualified,supplier_search,quotation,negotiation,won,lost,on_hold"],
      ["estimatedValue","القيمة التقديرية","number"],["currency","العملة","select:EGP,USD,EUR,CNY"],
      ["expectedCloseDate","موعد الإغلاق المتوقع","date"],["nextFollowUp","موعد المتابعة القادمة","date"],
      ["confidence","درجة الثقة","select:high,medium,low"],
      ["confidentiality","مستوى السرية","select:internal,commercial_sensitive"],
      ["competitorNotes","معلومات المنافسة","textarea"],["notes","ملاحظات الصفقة","textarea"]
    ],
    fieldNotes:[
      ["title","عنوان المعلومة","text",true],
      ["noteType","نوع المعلومة","select:market_observation,company_intelligence,pricing_intelligence,competitor_activity,customer_need,deal_tip,other"],
      ["relatedEntityCode","الجهة المرتبطة (كود)","text"],["relatedOpportunityCode","الفرصة المرتبطة (كود)","text"],
      ["capturedAt","تاريخ الحصول على المعلومة","date"],
      ["sourceType","طبيعة المصدر","select:published,field,commercial_sensitive"],
      ["sourceCode","مصدر موثق (إن وجد)","ref:sources"],
      ["confidence","درجة الثقة","select:high,medium,low"],
      ["confidentiality","مستوى السرية","select:internal,commercial_sensitive"],
      ["author","من أدخل المعلومة","select:أحمد عبد الحي,أحمد صلاح,مشترك"],
      ["nextAction","الإجراء المقترح","text"],["notes","تفاصيل المعلومة","textarea"]
    ]
  });

  const originalRefOptions = refOptions;
  refOptions = function(spec) {
    const out = originalRefOptions(spec);
    if (spec.split("+").includes("customers")) out.push(...D.customers);
    return out;
  };
  const originalFindEntity = findEntity;
  findEntity = function(code) {
    return originalFindEntity(code) || D.customers.find(x => x.code === code) || null;
  };

  const actorSelect = document.createElement("label");
  actorSelect.className = "mi-actor";
  actorSelect.innerHTML = '<span>المستخدم</span><select id="mi-active-actor">'+actors.map(x=>'<option>'+escI(x)+'</option>').join("")+'</select>';
  const topActions = $(".top-actions");
  if (topActions) topActions.appendChild(actorSelect);
  const actorInput = $("#mi-active-actor");
  if (actorInput) {
    actorInput.value = activeActor;
    actorInput.addEventListener("change", () => {
      activeActor = actorInput.value;
      localStorage.setItem(actorKey, activeActor);
    });
  }

  const nav = $("#main-nav");
  if (nav && !$("#mi-nav-start")) {
    nav.insertAdjacentHTML("beforeend",
      '<p class="nav-caption" id="mi-nav-start">الذكاء التجاري</p>'+
      '<button class="nav-link" data-view="priceIntelligence"><span>▥</span> تحليل أسعار السوق · 8 أسابيع</button>'+
      '<button class="nav-link" data-view="customers"><span>⌂</span> العملاء والجهات المستهدفة</button>'+
      '<button class="nav-link" data-view="relationships"><span>⇄</span> العلاقات التجارية</button>'+
      '<button class="nav-link" data-view="opportunities"><span>◈</span> الفرص والصفقات</button>'+
      '<button class="nav-link" data-view="fieldNotes"><span>⌕</span> المعلومات الميدانية</button>'+
      '<p class="nav-caption">الحوكمة والحفظ</p>'+
      '<button class="nav-link" data-view="audit"><span>▤</span> سجل التعديلات</button>'+
      '<button class="nav-link" data-view="backup"><span>⇩</span> النسخ الاحتياطي</button>'
    );
  }

  function nextAuditCode(){ return "AUD-"+Date.now()+"-"+Math.random().toString(36).slice(2,6).toUpperCase(); }
  function logAudit(action, view, record, before) {
    D.auditLog.push({
      code:nextAuditCode(), action, entityType:view, entityCode:record?.code||"",
      entityName:record?.name||record?.title||record?.code||"",
      actor:activeActor, at:new Date().toISOString(),
      before:before||null, after:record?JSON.parse(JSON.stringify(record)):null
    });
    if (D.auditLog.length > 3000) D.auditLog.splice(0,D.auditLog.length-3000);
    saveData();
  }

  const originalSaveRecord = saveRecord;
  saveRecord = function(view, form) {
    const beforeCode = editingCode;
    const arrBefore = collection(view);
    const before = beforeCode ? JSON.parse(JSON.stringify(arrBefore.find(x=>x.code===beforeCode)||null)) : null;
    originalSaveRecord(view, form);
    const arrAfter = collection(view);
    if (view === "prices") {
      const priceRecord = beforeCode ? arrAfter.find(x=>x.code===beforeCode) : arrAfter[arrAfter.length-1];
      if (priceRecord) {
        const src = D.sources.find(x=>x.code===priceRecord.sourceCode);
        D.priceSnapshots.push({
          code:"PS-MANUAL-"+Date.now()+"-"+Math.random().toString(36).slice(2,6).toUpperCase(),
          productCode:priceRecord.productCode||"",
          productName:productName(priceRecord.productCode),
          model:(findEntity(priceRecord.productCode)||{}).model||"",
          seller:companyName(priceRecord.companyCode),
          sellerType:"manual_market_observation",
          amount:Number(priceRecord.amount),
          currency:priceRecord.currency||"EGP",
          observedAt:priceRecord.observedAt||today(),
          sourceCode:priceRecord.sourceCode||"",
          sourceUrl:src?.url||"",
          priceType:priceRecord.priceType||"published_retail",
          status:priceRecord.status||"needs_review",
          notes:priceRecord.notes||"رصد سعر أُدخل يدويًا من سجل الأسعار"
        });
      }
    }
    const saved = beforeCode ? arrAfter.find(x=>x.code===beforeCode) : arrAfter[arrAfter.length-1];
    if (saved) {
      const now = new Date().toISOString();
      if (!saved._meta) saved._meta = {createdAt:now,createdBy:activeActor};
      saved._meta.updatedAt = now;
      saved._meta.updatedBy = activeActor;
      saved._meta.recordOrigin = saved.recordOrigin || (before ? "legacy" : "user_entry");
      logAudit(before ? "update" : "create", view, saved, before);
    }
  };
  const originalDeleteRecord = deleteRecord;
  deleteRecord = function(view, code) {
    const referenced =
      D.relationships.some(x=>x.entityACode===code||x.entityBCode===code) ||
      D.opportunities.some(x=>x.customerCode===code||x.productCode===code) ||
      D.fieldNotes.some(x=>x.relatedEntityCode===code||x.relatedOpportunityCode===code||x.sourceCode===code) ||
      D.customers.some(x=>x.sourceCode===code) ||
      D.opportunities.some(x=>x.sourceCode===code);
    if (referenced) {
      alert("لا يمكن حذف هذا السجل لأنه مرتبط بعلاقة أو فرصة أو معلومة ميدانية. حدّث الروابط أولًا للحفاظ على سلامة البيانات.");
      return;
    }
    const before = JSON.parse(JSON.stringify(collection(view).find(x=>x.code===code)||null));
    originalDeleteRecord(view, code);
    const stillThere = collection(view).some(x=>x.code===code);
    if (before && !stillThere) logAudit("delete", view, before, before);
  };

  function stageLabel(v) {
    return ({new:"جديدة",contacted:"تم التواصل",qualified:"مؤهلة",supplier_search:"بحث عن مورد",quotation:"عرض سعر",negotiation:"تفاوض",won:"تمت",lost:"خسرت",on_hold:"معلقة"}[v]||v||"—");
  }
  function backupPage() {
    return '<div class="section-head"><div><h2>النسخ الاحتياطي ونقل البيانات</h2><p>تصدير نسخة كاملة أو استيراد سجلات جديدة دون استبدال بياناتك الحالية.</p></div></div>'+
      '<div class="mi-warning"><b>مهم:</b> النسخ الحالية محلية في المتصفح. الاستيراد يضيف السجلات الجديدة فقط، ويتجاوز الأكواد المتعارضة بدل استبدالها.</div>'+
      '<div class="mi-backup-grid"><section class="panel"><h3>تصدير نسخة كاملة</h3><p class="subtle">تشمل قاعدة البيانات وسجل التعديلات والفرص والعلاقات والمعلومات الميدانية.</p><button class="btn" id="mi-export-json">تنزيل نسخة JSON كاملة</button></section>'+
      '<section class="panel"><h3>استيراد نسخة شريك</h3><p class="subtle">اختر ملف JSON صادرًا من PHYSIO MARKET. ستتم إضافة الأكواد غير الموجودة فقط.</p><input type="file" id="mi-import-file" accept=".json,application/json"><div id="mi-import-result" class="subtle"></div></section></div>'+
      '<div class="panel"><h3>نطاق الحفظ الحالي</h3><div class="mi-facts"><span>المستخدم الحالي<b>'+escI(activeActor)+'</b></span><span>سجلات الفرص<b>'+D.opportunities.length+'</b></span><span>العملاء والجهات<b>'+D.customers.length+'</b></span><span>سجل التعديلات<b>'+D.auditLog.length+'</b></span></div></div>'+
      '<div class="mi-warning"><b>حد أمني:</b> هذه الواجهة لا تحتوي على تسجيل دخول أو تشفير أو صلاحيات خادم. لا تضع بيانات عملاء حساسة أو أسعار تفاوضية حقيقية في نسخة منشورة للعامة. استخدمها محليًا فقط إلى أن ننفذ حماية حقيقية.</div>';
  }
  function auditPage() {
    const rows = [...D.auditLog].reverse().slice(0,250);
    return '<div class="section-head"><div><h2>سجل التعديلات</h2><p>آخر '+rows.length+' عملية محفوظة محليًا · الإجمالي '+D.auditLog.length+'</p></div></div>'+
      '<div class="mi-warning">السجل يوضح المستخدم المختار وقت التعديل. اختيار الاسم يدوي وليس إثبات هوية أو تسجيل دخول.</div>'+
      '<div class="table-wrap"><table><thead><tr><th>التاريخ والوقت</th><th>المستخدم</th><th>العملية</th><th>القسم</th><th>الكود</th><th>السجل</th></tr></thead><tbody>'+
      (rows.map(r=>'<tr><td>'+escI(new Date(r.at).toLocaleString("ar-EG"))+'</td><td>'+escI(r.actor)+'</td><td>'+({create:"إضافة",update:"تعديل",delete:"حذف"}[r.action]||r.action)+'</td><td>'+escI(titles[r.entityType]||r.entityType)+'</td><td><code>'+escI(r.entityCode)+'</code></td><td>'+escI(r.entityName)+'</td></tr>').join("")||'<tr><td colspan="6" class="empty">لا توجد تعديلات مسجلة بعد.</td></tr>')+
      '</tbody></table></div>';
  }


  function priceIntelligencePage() {
    const rows=(D.priceSnapshots||[]).filter(x=>x.currency==="EGP"&&x.observedAt>="2026-09-14"&&x.observedAt<="2026-11-09");
    const products=[...new Map(rows.map(x=>[x.productCode,{code:x.productCode,name:x.productName,model:x.model}])).values()];
    const selected=$("#pi-product-filter")?.value||"ALL";
    const filtered=selected==="ALL"?rows:rows.filter(x=>x.productCode===selected);
    const values=filtered.map(x=>Number(x.amount)).filter(Number.isFinite);
    const sum=values.reduce((a,b)=>a+b,0),avg=values.length?sum/values.length:0;
    const min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):0;
    const spread=min?((max-min)/min)*100:0;
    const sellers=new Set(filtered.map(x=>x.seller)).size;
    const uniqueProducts=new Set(filtered.map(x=>x.productCode)).size;
    const start=new Date("2026-09-14T00:00:00"),end=new Date("2026-11-09T00:00:00");
    const weeks=Array.from({length:8},(_,i)=>{const d=new Date(end);d.setDate(d.getDate()-(7-i)*7);return {date:d.toISOString().slice(0,10),label:d.toLocaleDateString("ar-EG",{day:"2-digit",month:"short"})};});
    const weekly=weeks.map(w=>{const rs=filtered.filter(x=>{const dt=new Date(x.observedAt+"T00:00:00");const hi=new Date(w.date+"T00:00:00");const lo=new Date(hi);lo.setDate(lo.getDate()-7);return dt>lo&&dt<=hi;});return {...w,count:rs.length,avg:rs.length?rs.reduce((a,x)=>a+Number(x.amount),0)/rs.length:null};});
    const chartW=760,chartH=260,left=58,right=20,top=18,bottom=42,plotW=chartW-left-right,plotH=chartH-top-bottom;
    const yMin=values.length?Math.max(0,Math.floor(min/1000)*1000):0,yMax=values.length?Math.ceil(max/1000)*1000:1000;
    const y=v=>top+plotH-(v-yMin)/(Math.max(1,yMax-yMin))*plotH;
    const x=i=>left+i*(plotW/7);
    const points=weekly.map((w,i)=>w.avg===null?null:{x:x(i),y:y(w.avg),label:w.label,value:w.avg}).filter(Boolean);
    const segments=weekly.map((w,i)=>w.avg===null?null:{i,x:x(i),y:y(w.avg)}).filter(Boolean);
    const lines=segments.slice(1).filter(p=>{const prev=segments[segments.indexOf(p)-1];return prev&&p.i-prev.i===1;}).map(p=>{const prev=segments[segments.indexOf(p)-1];return '<line x1="'+prev.x+'" y1="'+prev.y+'" x2="'+p.x+'" y2="'+p.y+'" stroke="#3979a5" stroke-width="3" stroke-linecap="round"/>';}).join("");
    const grid=[0,1,2,3].map(i=>{const val=yMin+(yMax-yMin)*i/3,yy=y(val);return '<line x1="'+left+'" y1="'+yy+'" x2="'+(chartW-right)+'" y2="'+yy+'" stroke="#e7edf2" stroke-dasharray="4 5"/><text x="'+(left-10)+'" y="'+(yy+4)+'" text-anchor="end" fill="#718096" font-size="11">'+Math.round(val).toLocaleString("en-US")+'</text>';}).join("");
    const dots=points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="#3979a5" stroke="#fff" stroke-width="2"><title>'+p.label+': '+Math.round(p.value).toLocaleString("en-US")+' EGP</title></circle>').join("");
    const labels=weeks.map((w,i)=>'<text x="'+x(i)+'" y="'+(chartH-13)+'" text-anchor="middle" fill="#718096" font-size="10">'+w.label+'</text>').join("");
    const chart='<svg viewBox="0 0 '+chartW+' '+chartH+'" role="img" aria-label="متوسط السعر الأسبوعي الفعلي"><text x="'+left+'" y="12" fill="#718096" font-size="10">EGP</text>'+grid+lines+dots+labels+'</svg>';
    const productOptions='<option value="ALL">كل الموديلات</option>'+products.map(p=>'<option value="'+escI(p.code)+'" '+(selected===p.code?'selected':'')+'>'+escI(p.name)+'</option>').join("");
    const byProduct=products.map(p=>{const a=rows.filter(x=>x.productCode===p.code).map(x=>Number(x.amount));return {name:p.name,code:p.code,count:a.length,min:Math.min(...a),max:Math.max(...a),avg:a.reduce((n,v)=>n+v,0)/a.length,sellers:new Set(rows.filter(x=>x.productCode===p.code).map(x=>x.seller)).size};});
    const table=byProduct.map(p=>'<tr><td><b>'+escI(p.name)+'</b><small class="subtle">'+escI(p.code)+'</small></td><td>'+p.count+'</td><td>'+p.sellers+'</td><td>'+Math.round(p.min).toLocaleString("en-US")+' ج.م</td><td>'+Math.round(p.max).toLocaleString("en-US")+' ج.م</td><td>'+Math.round(p.avg).toLocaleString("en-US")+' ج.م</td></tr>').join("");
    const priceRows=[...filtered].sort((a,b)=>a.productName.localeCompare(b.productName)||a.amount-b.amount).map(p=>'<tr><td>'+escI(p.productName)+'<small class="subtle">'+escI(p.model)+'</small></td><td>'+escI(p.seller)+'</td><td><b>'+Number(p.amount).toLocaleString("en-US")+' ج.م</b></td><td>'+escI(p.observedAt)+'</td><td><a href="'+escI(p.sourceUrl)+'" target="_blank" rel="noopener">المصدر ↗</a></td><td>'+escI(p.status==="verified"?"متحقق":"يحتاج مراجعة")+'</td></tr>').join("");
    return '<div class="section-head"><div><h2>تحليل أسعار السوق · آخر 8 أسابيع</h2><p>الفترة: 14 سبتمبر – 9 نوفمبر 2026 · أسعار تجزئة منشورة بالجنيه المصري</p></div><div class="section-actions"><button class="btn secondary" id="pi-add-price">+ إضافة رصد سعر</button><button class="btn secondary" id="pi-export-csv">تصدير بيانات المقارنة CSV</button></div></div>'+
      '<div class="mi-warning"><b>تنبيه تاريخي:</b> قاعدة الأسعار تحتوي حاليًا على رصد منشور في أسبوع واحد فقط. الأسابيع السبعة السابقة بلا سجلات موثقة؛ لذلك لا نحسب تغيرًا زمنيًا ولا نرسم نقاطًا تقديرية أو نعتبر السعر الحالي تاريخيًا.</div>'+
      '<div class="pi-filter panel"><label>الموديل محل التحليل <select id="pi-product-filter">'+productOptions+'</select></label><span class="subtle">التجميع أسبوعي، ولا تظهر نقطة إلا عند وجود رصد فعلي.</span></div>'+
      '<div class="stats-grid pi-kpis">'+[['عدد أرصدة الأسعار',values.length],['موديلات مقارنة',uniqueProducts],['مصادر / بائعون',sellers],['أقل سعر',min?Math.round(min).toLocaleString("en-US")+" ج.م":"—"],['أعلى سعر',max?Math.round(max).toLocaleString("en-US")+" ج.م":"—"],['متوسط السعر',avg?Math.round(avg).toLocaleString("en-US")+" ج.م":"—"],['فارق النطاق',values.length>1?spread.toFixed(1)+"%":"—"],['تغطية الفترة',weekly.filter(w=>w.count).length+"/8 أسابيع"]].map(x=>'<div class="stat-card"><div class="stat-label">'+x[0]+'</div><div class="stat-value">'+x[1]+'</div><div class="stat-foot">حسب السجلات المتاحة</div></div>').join("")+'</div>'+
      '<div class="panel pi-chart"><div class="panel-head"><h3>اتجاه متوسط السعر الأسبوعي</h3><span class="subtle">لا يوجد خط اتجاه قبل توافر رصد في أسبوعين مختلفين على الأقل</span></div>'+chart+'<div class="pi-week-coverage">'+weekly.map(w=>'<span class="'+(w.count?'has-data':'')+'">'+w.label+'<b>'+(w.count? w.count+" رصد":"لا توجد بيانات")+'</b></span>').join("")+'</div></div>'+
      '<div class="panel"><div class="panel-head"><h3>مقارنة الموديلات</h3><span class="subtle">الأسعار المنشورة فقط · EGP</span></div><div class="table-wrap"><table><thead><tr><th>الموديل</th><th>عدد الأسعار</th><th>البائعون</th><th>الأقل</th><th>الأعلى</th><th>المتوسط</th></tr></thead><tbody>'+(table||'<tr><td colspan="6" class="empty">لا توجد بيانات.</td></tr>')+'</tbody></table></div></div>'+
      '<div class="panel"><div class="panel-head"><h3>تفاصيل الرصد ومصادر الأسعار</h3><span class="subtle">'+filtered.length+' سجل</span></div><div class="table-wrap"><table><thead><tr><th>الجهاز</th><th>البائع</th><th>السعر</th><th>تاريخ الرصد</th><th>المصدر</th><th>الحالة</th></tr></thead><tbody>'+(priceRows||'<tr><td colspan="6" class="empty">لا توجد أرصدة.</td></tr>')+'</tbody></table></div></div>';
  }

  const originalRender = render;
  render = function() {
    if (currentView === "backup" || currentView === "audit" || currentView === "priceIntelligence") {
      $("#page-title").textContent = titles[currentView];
      document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
      content.innerHTML = currentView === "backup" ? backupPage() : currentView === "audit" ? auditPage() : priceIntelligencePage();
      return;
    }
    originalRender();
  };

  content.addEventListener("change", e => {
    if (e.target.id === "pi-product-filter") render();
  });
  content.addEventListener("click", e => {
    if (e.target.closest("#pi-add-price")) openForm("prices");
    if (e.target.closest("#pi-export-csv")) {
      const rows=D.priceSnapshots||[];
      const keys=["productName","model","seller","amount","currency","observedAt","sourceUrl","status"];
      const csv=[keys.join(","),...rows.map(r=>keys.map(k=>'"'+String(r[k]??"").replace(/"/g,'""')+'"').join(","))].join("\\r\\n");
      const blob=new Blob(["\\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="physio-market-price-snapshots.csv";a.click();URL.revokeObjectURL(url);
    }
    if (e.target.closest("#mi-export-json")) {
      const payload = {format:"PHYSIO_MARKET_BACKUP",version:1,exportedAt:new Date().toISOString(),data:D};
      const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob); const a=document.createElement("a");
      a.href=url; a.download="physio-market-backup-"+today()+".json"; a.click(); URL.revokeObjectURL(url);
    }
  });
  content.addEventListener("change", e => {
    if (e.target.id !== "mi-import-file" || !e.target.files?.[0]) return;
    const file=e.target.files[0], out=$("#mi-import-result");
    const reader=new FileReader();
    reader.onload=()=>{
      try {
        const parsed=JSON.parse(reader.result);
        const incoming=parsed?.data;
        if (parsed.format!=="PHYSIO_MARKET_BACKUP" || !incoming || typeof incoming!=="object") throw new Error("صيغة الملف غير معتمدة.");
        if (!confirm("سيتم استيراد السجلات الجديدة فقط. لن يتم استبدال أي سجل موجود. هل تريد المتابعة؟")) return;
        let added=0, conflicts=0;
        Object.keys(incoming).forEach(k=>{
          if (!Array.isArray(incoming[k])) return;
          if (!Array.isArray(D[k])) D[k]=[];
          if (k==="retiredCodes") { D[k]=[...new Set([...D[k],...incoming[k]])]; return; }
          incoming[k].forEach(item=>{
            if (item?.code && D[k].some(x=>x.code===item.code)) { conflicts++; return; }
            D[k].push(item); added++;
          });
        });
        saveData();
        logAudit("import", "backup", {code:"IMPORT-"+Date.now(),name:file.name,added,conflicts});
        out.textContent="تمت إضافة "+added+" سجل جديد، وتجاوز "+conflicts+" سجلًا له كود موجود. راجع السجلات المستوردة قبل الاعتماد.";
      } catch(err) { out.textContent="تعذر استيراد الملف: "+err.message; }
    };
    reader.readAsText(file);
  });

  // Refresh navigation and dashboard after the extension is initialized.
  if (currentView === "dashboard") render();
})();