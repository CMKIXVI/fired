const DATA_URL = "data/layoffs.json";
const fmt = n => Number(n).toLocaleString("en-US");
const dateFmt = s => s ? new Date(s+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "Date undisclosed";
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let events = [];

function setText(id,value){document.getElementById(id).textContent=value}
function populateFilters(){
  const fill=(id,values,label)=>{const el=document.getElementById(id);el.innerHTML='<option value="">'+label+'</option>'+values.sort().map(v=>'<option>'+safe(v)+'</option>').join("")};
  fill("sector-filter",[...new Set(events.map(e=>e.sector).filter(Boolean))],"All sectors");
  fill("region-filter",[...new Set(events.map(e=>e.country_region).filter(Boolean))],"All regions");
  fill("year-filter",[...new Set(events.map(e=>(e.event_date||"").slice(0,4)).filter(Boolean))],"All years");
}
function renderKPIs(meta={}){
  const known=events.filter(e=>Number.isFinite(e.employees_affected));
  const total=known.reduce((a,e)=>a+e.employees_affected,0);
  setText("total-people",known.length?fmt(total):"—");
  setText("total-events",fmt(events.length));
  setText("total-companies",fmt(new Set(events.map(e=>e.company_id||e.company).filter(Boolean)).size));
  setText("total-regions",fmt(new Set(events.map(e=>e.country_region).filter(Boolean)).size));
  const confirmed=events.filter(e=>e.figure_status==="confirmed"&&Number.isFinite(e.employees_affected)).reduce((a,e)=>a+e.employees_affected,0);
  const reported=events.filter(e=>["reported","estimated"].includes(e.figure_status)&&Number.isFinite(e.employees_affected)).reduce((a,e)=>a+e.employees_affected,0);
  const undisclosed=events.filter(e=>!Number.isFinite(e.employees_affected)).length;
  setText("people-foot",fmt(confirmed)+" confirmed · "+fmt(reported)+" reported / estimated · "+undisclosed+" undisclosed");
  setText("updated-at",meta.updated_at?"UPDATED "+meta.updated_at:"AWAITING FIRST VERIFIED DATA");
}
function renderMonthly(){
  const root=document.getElementById("monthly-chart");
  const known=events.filter(e=>Number.isFinite(e.employees_affected)&&e.event_date);
  if(!known.length){root.innerHTML='<div class="empty-chart">Monthly trend will appear when verified layoff records are added.</div>';return}
  const map={};known.forEach(e=>{const k=e.event_date.slice(0,7);map[k]=(map[k]||0)+e.employees_affected});
  const keys=Object.keys(map).sort().slice(-12),max=Math.max(...keys.map(k=>map[k]),1);
  root.innerHTML=keys.map(k=>'<div class="bar-column"><div class="bar-value">'+fmt(map[k])+'</div><div class="bar" style="height:'+Math.max(3,map[k]/max*145)+'px"></div><div class="bar-label">'+new Date(k+"-01T00:00:00").toLocaleDateString("en-US",{month:"short",year:"2-digit"})+'</div></div>').join("");
}
function renderYears(){
  const root=document.getElementById("year-chart"),map={};
  events.filter(e=>Number.isFinite(e.employees_affected)&&e.event_date).forEach(e=>{const y=e.event_date.slice(0,4);map[y]=(map[y]||0)+e.employees_affected});
  const years=Object.keys(map).sort();
  if(!years.length){root.innerHTML='<div class="empty-chart">Historical comparison will appear as the archive grows.</div>';return}
  const max=Math.max(...years.map(y=>map[y]),1);
  root.innerHTML=years.map(y=>'<div class="year-item '+(y===String(new Date().getFullYear())?'current':'')+'"><div class="year-count">'+fmt(map[y])+'</div><div class="year-bar-wrap"><div class="year-bar" style="height:'+Math.max(3,map[y]/max*85)+'px"></div></div><div class="year-label">'+y+'</div></div>').join("");
}

function renderAI(){
  const rows=events.filter(e=>["reported","confirmed","estimated"].includes(e.ai_attribution_status));
  const total=rows.filter(e=>Number.isFinite(e.employees_affected)).reduce((n,e)=>n+e.employees_affected,0);
  setText("ai-result-count",rows.length+" EVENT"+(rows.length===1?"":"S"));
  setText("ai-events",fmt(rows.length));setText("ai-people",rows.length?fmt(total):"—");
  const body=document.getElementById("ai-events-body");
  body.innerHTML=rows.length?rows.sort((a,b)=>(b.event_date||"").localeCompare(a.event_date||"")).map(e=>{
    const links=(e.ai_attribution_sources||[]).map((u,i)=>'<a class="source-link" href="'+safe(u)+'" target="_blank" rel="noopener noreferrer">'+(i===0?"Coverage":"Corroboration")+' ↗</a>').join(" · ");
    const count=Number.isFinite(e.employees_affected)?(String(e.headcount_qualifier||"").toLowerCase().includes("up to")?"Up to ":"≈ ")+fmt(e.employees_affected):"Undisclosed";
    return '<tr><td><span class="company-name">'+safe(e.company)+'</span><span class="event-title">'+safe(e.ai_attribution_basis||"AI attribution recorded")+'</span></td><td>'+safe(dateFmt(e.event_date))+'</td><td>'+safe(e.country_region||"Undisclosed")+'</td><td class="people-cell">'+count+'</td><td><span class="evidence-badge reported">'+safe(e.ai_attribution_status.toUpperCase())+'</span></td><td>'+links+'</td></tr>';
  }).join(""):'<tr><td colspan="6" class="empty-row">No AI-attributed events have been classified yet.</td></tr>';
}
function renderSectors(){
  const root=document.getElementById("sector-grid"),map={};
  events.forEach(e=>{const k=e.sector||"Unclassified";map[k]=(map[k]||0)+1});
  const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  root.innerHTML=rows.length?rows.map(([k,v])=>'<div class="sector-tile"><strong>'+safe(k)+'</strong><span>'+v+' EVENT'+(v===1?"":"S")+'</span></div>').join(""):'<div class="sector-empty">Sector breakdown will appear as records are added.</div>';
}
function renderTable(){
  const q=document.getElementById("search").value.toLowerCase(),sector=document.getElementById("sector-filter").value,region=document.getElementById("region-filter").value,year=document.getElementById("year-filter").value;
  const rows=events.filter(e=>(!q||[e.company,e.headline,e.country_region,e.sector].join(" ").toLowerCase().includes(q))&&(!sector||e.sector===sector)&&(!region||e.country_region===region)&&(!year||(e.event_date||"").startsWith(year))).sort((a,b)=>(b.event_date||"").localeCompare(a.event_date||""));
  setText("result-count",rows.length+" EVENT"+(rows.length===1?"":"S"));
  const body=document.getElementById("events-body");
  body.innerHTML=rows.length?rows.map(e=>{const links=(Array.isArray(e.sources)?e.sources:[]).filter(s=>typeof s.url==="string"&&s.url.startsWith("https://")).map((s,i)=>'<a class="source-link" href="'+safe(s.url)+'" target="_blank" rel="noopener noreferrer">'+safe(s.publisher||("Source "+(i+1)))+' ↗</a>').join(' <span class="source-sep">·</span> ');return '<tr><td><span class="company-name">'+safe(e.company)+'</span><span class="event-title">'+safe(e.headline||"Layoff event")+'</span><span class="event-state state-'+safe(e.event_status||"unknown")+'">'+safe((e.event_status||"unknown").toUpperCase())+'</span>'+(links?'<span class="event-sources">'+links+'</span>':"")+'</td><td>'+safe(dateFmt(e.event_date))+'</td><td>'+safe(e.country_region||"Undisclosed")+'</td><td>'+safe(e.sector||"Unclassified")+'</td><td class="people-cell">'+(Number.isFinite(e.employees_affected)?((String(e.headcount_qualifier||"").toLowerCase().includes("up to")?"Up to ":String(e.headcount_qualifier||"").toLowerCase().includes("approx")?"≈ ":"")+fmt(e.employees_affected)):"Undisclosed")+(e.percentage_affected!=null?' <small>('+safe(e.percentage_affected)+'%)</small>':"")+'</td><td><span class="evidence-badge '+safe(e.figure_status||"undisclosed")+'">'+safe((e.figure_status||"undisclosed").toUpperCase())+'</span></td></tr>'}).join(""):'<tr><td colspan="6" class="empty-row">No events match these filters.</td></tr>';
}
async function init(){
  ["search","sector-filter","region-filter","year-filter"].forEach(id=>document.getElementById(id).addEventListener(id==="search"?"input":"change",renderTable));
  try{
    const response=await fetch(DATA_URL,{cache:"no-store"});if(!response.ok)throw new Error("HTTP "+response.status);
    const data=await response.json();events=Array.isArray(data.events)?data.events:[];
    populateFilters();renderKPIs(data);renderMonthly();renderYears();renderSectors();renderAI();renderTable();
  }catch(err){setText("updated-at","DATA LOAD ERROR");document.getElementById("events-body").innerHTML='<tr><td colspan="6" class="empty-row">The data archive could not be loaded. Please check back later.</td></tr>';console.error("Fired data load failed:",err)}
}
init();