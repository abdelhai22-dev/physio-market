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

  ["customers","relationships","opportunities","fieldNotes","auditLog"].forEach(k => {
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
    backup:"النسخ الاحتياطي"
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

  const originalRender = render;
  render = function() {
    if (currentView === "backup" || currentView === "audit") {
      $("#page-title").textContent = titles[currentView];
      document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
      content.innerHTML = currentView === "backup" ? backupPage() : auditPage();
      return;
    }
    originalRender();
  };

  content.addEventListener("click", e => {
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