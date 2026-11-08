const DATA = window.PHYSIO_DATA;
const titles = {search:"نتائج البحث",dashboard:"لوحة المؤشرات",devices:"الأجهزة والمعدات",consumables:"المستهلكات والملحقات",companies:"الشركات المصرية",suppliers:"الموردون والمصانع الصينية",brands:"العلامات التجارية",distributors:"الوكلاء والموزعون",quotes:"عروض الأسعار",logistics:"الشحن والاستيراد",regulatory:"التسجيل والامتثال",sources:"المصادر والتحقق",codes:"دليل الأكواد"};
const config = {
 devices:{key:"devices",label:"الجهاز",cols:[["code","الكود"],["name","اسم الجهاز"],["brand","العلامة"],["model","الموديل"],["price","السعر"],["currency","العملة"],["status","حالة البيانات"]]},
 consumables:{key:"consumables",label:"المستهلك",cols:[["code","الكود"],["name","الصنف"],["price","السعر"],["priceRange","نطاق السعر"],["currency","العملة"],["moq","MOQ"],["status","حالة البيانات"]]},
 companies:{key:"companies",label:"الشركة",cols:[["code","الكود"],["name","الشركة"],["phone","الهاتف"],["email","البريد"],["location","العنوان"],["website","الموقع الإلكتروني"],["status","حالة التحقق"]]},
 suppliers:{key:"suppliers",label:"المورد",cols:[["code","الكود"],["name","المصنع / المورد"],["country","الدولة"],["product","المنتج"],["priceRange","السعر الإرشادي"],["moq","MOQ"],["status","حالة التحقق"]]},
 brands:{key:"brands",label:"العلامة",cols:[["code","الكود"],["name","العلامة التجارية"],["category","التخصص"]]},
 distributors:{key:"distributors",label:"الموزع",cols:[["code","الكود"],["name","الموزع"],["brand","العلامة"],["territory","النطاق"],["status","الحالة"]]},
 quotes:{key:"quotes",label:"عرض السعر",cols:[["code","الكود"],["supplier","المورد"],["product","المنتج"],["price","السعر"],["date","التاريخ"],["status","الحالة"]]},
 logistics:{key:"logistics",label:"عملية الشحن",cols:[["code","الكود"],["route","خط الشحن"],["method","الوسيلة"],["cost","التكلفة"],["status","الحالة"]]},
 regulatory:{key:"regulatory",label:"مرجع",cols:[["code","الكود"],["name","المستند / المرجع"],["type","النوع"],["status","التصنيف"]]},
 sources:{key:"sources",label:"مصدر",cols:[["code","الكود"],["name","المصدر"],["type","النوع"],["url","الرابط"],["status","حالة التحقق"]]}
};
const content = document.getElementById("app-content");
let currentView="dashboard", query="";
const fmt = v => v===undefined||v===null||v===""?"—":String(v);
const statusTag = s => {const map={needs_review:["يحتاج تحقق","review"],platform_reference:["سعر منصة استرشادي","reference"],reference:["مرجع","reference"],verified:["تم التحقق","verified"]};const x=map[s]||[fmt(s),"review"];return '<span class="status '+x[1]+'">'+x[0]+'</span>';};
function dashboard(){
 const count=k=>DATA[k].length;
 return `<div class="welcome"><div><h2>مرحبًا بك في PHYSIO MARKET</h2><p>قاعدة موحدة لاستكشاف سوق أجهزة العلاج الطبيعي والموردين والتسعير والاستيراد.</p></div><span class="welcome-tag">INTERNAL MARKET INTELLIGENCE</span></div>
 <div class="stats-grid">
  <div class="stat-card"><span class="stat-icon">▣</span><div class="stat-label">الأجهزة والمعدات</div><div class="stat-value">${count("devices")}</div><div class="stat-foot">سجلات أولية في الكتالوج</div></div>
  <div class="stat-card"><span class="stat-icon">◈</span><div class="stat-label">المستهلكات</div><div class="stat-value">${count("consumables")}</div><div class="stat-foot">أصناف وملحقات</div></div>
  <div class="stat-card"><span class="stat-icon">▤</span><div class="stat-label">الشركات المصرية</div><div class="stat-value">${count("companies")}</div><div class="stat-foot">جهات تحتاج مراجعة مباشرة</div></div>
  <div class="stat-card"><span class="stat-icon">⌂</span><div class="stat-label">مصانع وموردون بالصين</div><div class="stat-value">${count("suppliers")}</div><div class="stat-foot">قائمة استكشافية أولية</div></div>
 </div>
 <div class="dashboard-grid">
  <div class="panel"><div class="panel-head"><h3>الوصول السريع إلى قاعدة البيانات</h3><span class="subtle">اختر القسم</span></div><div class="quick-grid">
   <button class="quick-link" data-go="devices"><span>▣</span>الأجهزة والمعدات</button><button class="quick-link" data-go="companies"><span>▤</span>الشركات المصرية</button><button class="quick-link" data-go="suppliers"><span>⌂</span>الموردون الصينيون</button><button class="quick-link" data-go="quotes"><span>＄</span>عروض الأسعار</button><button class="quick-link" data-go="regulatory"><span>▧</span>التسجيل والاستيراد</button><button class="quick-link" data-go="sources"><span>⌕</span>المصادر والتحقق</button>
  </div></div>
  <div class="panel"><div class="panel-head"><h3>مؤشر جودة البيانات</h3><span class="subtle">الحالة الحالية</span></div>
   <div class="activity-row"><span>بيانات تحتاج تحققًا مباشرًا</span><b>${count("companies")+count("devices")+count("consumables")}</b></div>
   <div class="activity-row"><span>مراجع تنظيمية مسجلة</span><b>${count("regulatory")}</b></div>
   <div class="activity-row"><span>مصادر مسجلة</span><b>${count("sources")}</b></div>
   <div class="note" style="margin-top:14px;margin-bottom:0">تنبيه: الأسعار والأسماء وبيانات الاتصال المدخلة هنا نقاط بداية للبحث وليست عروض أسعار مؤكدة أو إثباتًا لاعتماد الوكالة.</div>
  </div>
 </div>
 <div class="panel"><div class="panel-head"><h3>أحدث السجلات الأولية</h3><span class="subtle">عينة من قاعدة البيانات</span></div>
  <div class="activity-row"><span><b>Beurer EM49</b> — جهاز تحفيز كهربائي</span>${statusTag("needs_review")}</div>
  <div class="activity-row"><span><b>Smart Medical Solutions</b> — شركة مصرية</span>${statusTag("needs_review")}</div>
  <div class="activity-row"><span><b>Shenzhen Kentro</b> — مورد صيني محتمل</span>${statusTag("platform_reference")}</div>
 </div>`;
}
function renderTable(view){
 const c=config[view], rows=DATA[c.key]||[];
 const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query.toLowerCase()));
 const head=c.cols.map(x=>'<th>'+x[1]+'</th>').join("");
 const body=filtered.map(r=>'<tr>'+c.cols.map(([k])=>'<td>'+ (k==="code"?'<span class="code">'+fmt(r[k])+'</span>':k==="status"?statusTag(r[k]):k==="website"||k==="url"? (r[k]?'<a href="'+r[k]+'" target="_blank" rel="noopener">فتح الرابط ↗</a>':"—"):k==="price"&&r[k]!==undefined?fmt(r[k])+" "+fmt(r.currency):fmt(r[k]))+'</td>').join("")+'</tr>').join("");
 return `<div class="section-head"><div><h2>${titles[view]}</h2><p>إجمالي السجلات: ${rows.length} · نتائج البحث: ${filtered.length}</p></div><button class="btn secondary" id="export-csv">تصدير CSV</button></div>
 ${view==="suppliers"||view==="companies"?'<div class="note">بيانات استكشافية أولية. يجب التواصل والتحقق من النشاط الفعلي، بيانات الاتصال، التفويض، شهادات الجودة، ومطابقة المنتج قبل أي تعامل.</div>':""}
 <div class="search-meta">يمكنك استخدام البحث العام أعلى الصفحة لتصفية هذا القسم بالاسم أو الكود أو الهاتف أو الموديل.</div>
 <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body||'<tr><td colspan="'+c.cols.length+'" class="empty">لا توجد سجلات مطابقة حاليًا.</td></tr>'}</tbody></table></div>`;
}
function globalSearch(){
 const sections=Object.keys(config);let total=0;
 const blocks=sections.map(view=>{
  const c=config[view],rows=DATA[c.key]||[];
  const matches=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(query));
  if(!matches.length)return "";
  total+=matches.length;
  return '<div class="panel"><div class="panel-head"><h3>'+titles[view]+'</h3><button class="btn secondary" data-go="'+view+'">فتح القسم</button></div>'+
   matches.map(r=>'<div class="activity-row"><span><b>'+fmt(r.name||r.product||r.route||r.code)+'</b> <small class="code">'+fmt(r.code)+'</small><br><small class="subtle">'+fmt(r.phone||r.model||r.brand||r.type||r.country||"")+'</small></span>'+(r.status?statusTag(r.status):"")+'</div>').join("")+'</div>';
 }).join("");
 return '<div class="section-head"><div><h2>نتائج البحث الشامل</h2><p>عدد النتائج المطابقة: '+total+'</p></div></div>'+
 (blocks||'<div class="panel empty">لا توجد نتائج مطابقة. جرّب اسمًا أو كودًا أو رقم هاتف مختلفًا.</div>');
}
function codes(){
 const items=[["الأجهزة","DEV-CATEGORY-00001"],["المستهلكات","CON-CATEGORY-00001"],["قطع الغيار","SPR-CATEGORY-00001"],["الشركات المصرية","EGC-00001"],["المصانع الصينية","CNF-00001"],["العلامات التجارية","BRD-00001"],["الوكلاء والموزعون","DST-00001"],["عروض الأسعار","QTN-00001"],["الشحن واللوجستيات","SHP-00001"],["المستندات التنظيمية","REG-00001"],["المستندات والملفات","DOC-00001"],["العملاء","CUS-00001"],["المصادر","SRC-00001"]];
 return `<div class="section-head"><div><h2>دليل الأكواد الموحد</h2><p>معرّف فريد وثابت لكل سجل داخل المنصة</p></div></div><div class="note">قاعدة التسمية: بادئة ثابتة من 3 أحرف + تصنيف اختياري + رقم تسلسلي من 5 خانات. لا يُعاد استخدام الكود بعد حذف السجل.</div><div class="code-grid">${items.map(([n,c])=>'<div class="code-item"><b>'+n+'</b><code>'+c+'</code></div>').join("")}</div>`;
}
function render(){
 document.getElementById("page-title").textContent=titles[currentView];
 document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
 content.innerHTML=currentView==="search"?globalSearch():currentView==="dashboard"?dashboard():currentView==="codes"?codes():renderTable(currentView);
 const exportBtn=document.getElementById("export-csv");if(exportBtn)exportBtn.addEventListener("click",exportCSV);
}
function go(view){currentView=view;query="";document.getElementById("global-search").value="";render();}
function exportCSV(){
 const c=config[currentView];if(!c)return;const rows=DATA[c.key]||[];
 const csv=[c.cols.map(x=>x[1]).join(","),...rows.map(r=>c.cols.map(([k])=>'"'+String(r[k]??"").replace(/"/g,'""')+'"').join(","))].join("\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="physio-market-"+currentView+".csv";a.click();URL.revokeObjectURL(a.href);
}
document.getElementById("main-nav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)go(b.dataset.view);});
content.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go);});
document.getElementById("global-search").addEventListener("input",e=>{query=e.target.value.trim().toLowerCase();currentView=query?"search":"dashboard";render();});
render();