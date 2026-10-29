// Logique du carnet : fiches, filtres, carte, sélection et notes.
D.forEach(d=>{const x=X[d.n];d.run=x[0];d.rt=x[1];d.visa=x[2];d.vz=x[3];if(VD[d.n]){d.vd=VD[d.n][0];d.vz+=" Obtention : "+VD[d.n][1];}});
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const rl=v=>v===1?["Facile","g"]:v===2?["Avec contraintes","w"]:["Compliqué","b"];
const vl=v=>v===0?["Sans visa","g"]:v===1?["Formalité en ligne","w"]:["Visa payant","b"];
const lab=v=>v===2?["Top","g"]:v===1?["Correct","w"]:["Bof","b"];
const sl=v=>v===1?["Facile","g"]:v===2?["Vigilance","w"]:["Exigeant","b"];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=n=>n.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
D.forEach(d=>d.id=slug(d.n));
const BY=Object.fromEntries(D.map(d=>[d.id,d]));
const order=Object.keys(R);

/* ---------- Mes notes : stockage ---------- */
let NOTES={};            // id -> {note, links:[{t,u}], wish}
let db=null, sb=null, uid=null, store="local";
const queue={};
function getN(id){return NOTES[id]||{note:"",links:[],wish:false}}
function persist(id){
  const body={...getN(id),pays:BY[id].n,maj:new Date().toISOString()};
  if(sb&&uid){
    const row={user_id:uid,pays_id:id,note:body.note||"",links:body.links||[],wish:!!body.wish,maj:body.maj};
    queue[id]=(queue[id]||Promise.resolve()).then(()=>sb.from("carnet").upsert(row,{onConflict:"user_id,pays_id"}))
      .then(r=>status(r&&r.error?"err":"ok"),()=>status("err"));
  }else if(db){
    queue[id]=(queue[id]||Promise.resolve()).then(()=>db.collection("carnet").doc(id).set(body)).catch(e=>{
      if(e&&e.code==="unavailable")return new Promise(r=>setTimeout(r,800)).then(()=>db.collection("carnet").doc(id).set(body)).catch(()=>status("err"));
      status("err");
    }).then(()=>status("ok"));
  }else{
    try{localStorage.setItem("carnet-notes",JSON.stringify(NOTES))}catch(e){}
  }
}
function patch(id,p){NOTES[id]={...getN(id),...p};persist(id);refreshMine();updateCount();if(view==="carte")paintMap();}
function status(s){
  const el=$("#store");if(!el)return;
  if(store==="sb")el.textContent=s==="err"?"Échec de l'enregistrement en ligne, réessaie dans un instant.":"Notes, liens et sélection synchronisés en ligne (téléphone et ordinateur).";
  else if(store==="db")el.textContent=s==="err"?"Échec de l'enregistrement, réessaie dans un instant.":"Notes, liens et sélection enregistrés dans ton carnet.";
  else el.textContent="Notes enregistrées dans ce navigateur uniquement (le stockage du carnet n'est pas disponible ici).";
}
try{NOTES=JSON.parse(localStorage.getItem("carnet-notes")||"{}")||{}}catch(e){NOTES={}}

/* ---------- Bloc « Mes notes » d'une fiche ---------- */
function mineHTML(id){
  const n=getN(id);
  return `<div class="mine" data-id="${id}">
    <button type="button" class="wish ${n.wish?"on":""}" data-act="wish" aria-pressed="${n.wish}">${n.wish?"✓ Dans ma liste":"+ Ajouter à ma liste"}</button>
    <label class="mlab" for="note-${id}">Mes notes</label>
    <textarea id="note-${id}" data-act="note" rows="2" placeholder="Idées, envies, contacts, dates…">${esc(n.note)}</textarea>
    <div class="links">${linksHTML(id)}</div>
    <form class="addlink" data-act="addlink">
      <input id="lt-${id}" name="t" type="text" placeholder="Titre (optionnel)" aria-label="Titre du lien">
      <input id="lu-${id}" name="u" type="text" inputmode="url" placeholder="https://…" aria-label="Adresse du lien" required>
      <button type="submit">Ajouter le lien</button>
    </form>
  </div>`;
}
function linksHTML(id){
  const L=getN(id).links||[];
  if(!L.length)return "";
  return "<ul>"+L.map((l,i)=>`<li><a href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t||l.u.replace(/^https?:\/\/(www\.)?/,"").slice(0,48))}</a><button type="button" class="x" data-act="dellink" data-i="${i}" aria-label="Supprimer ce lien">Retirer</button></li>`).join("")+"</ul>";
}
function refreshMine(){
  $$(".mine").forEach(m=>{
    const id=m.dataset.id,n=getN(id),b=m.querySelector(".wish"),ta=m.querySelector("textarea");
    b.classList.toggle("on",!!n.wish);b.setAttribute("aria-pressed",!!n.wish);b.textContent=n.wish?"✓ Dans ma liste":"+ Ajouter à ma liste";
    if(document.activeElement!==ta&&ta.value!==(n.note||""))ta.value=n.note||"";
    const lk=m.querySelector(".links"),h=linksHTML(id);if(lk.innerHTML!==h)lk.innerHTML=h;
    m.closest(".card")?.classList.toggle("picked",!!n.wish);
  });
}
const timers={};
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-act]");if(!t)return;
  const m=t.closest(".mine");if(!m)return;const id=m.dataset.id;
  if(t.dataset.act==="wish")patch(id,{wish:!getN(id).wish});
  if(t.dataset.act==="dellink"){const L=[...(getN(id).links||[])];L.splice(+t.dataset.i,1);patch(id,{links:L});}
});
document.addEventListener("input",e=>{
  if(e.target.dataset.act!=="note")return;
  const id=e.target.closest(".mine").dataset.id,v=e.target.value;
  NOTES[id]={...getN(id),note:v};
  clearTimeout(timers[id]);timers[id]=setTimeout(()=>persist(id),900);
});
document.addEventListener("focusout",e=>{
  if(e.target.dataset?.act!=="note")return;
  const id=e.target.closest(".mine").dataset.id;
  if(timers[id]){clearTimeout(timers[id]);timers[id]=null;persist(id);}
});
document.addEventListener("submit",e=>{
  if(e.target.dataset.act!=="addlink")return;
  e.preventDefault();
  const f=e.target,id=f.closest(".mine").dataset.id;
  let u=f.u.value.trim();if(!u)return;if(!/^https?:\/\//i.test(u))u="https://"+u;
  patch(id,{links:[...(getN(id).links||[]),{t:f.t.value.trim(),u}]});
  f.reset();
});

/* ---------- Fiches ---------- */
function card(d){
  const [a,ac]=lab(d.nd),[b,bc]=lab(d.jm),[s,sc]=sl(d.solo),[ru,rc]=rl(d.run),[vi,vc]=vl(d.visa);
  return `<article class="card${getN(d.id).wish?" picked":""}" id="pays-${d.id}">
  <div class="top"><h3>${esc(d.n)}</h3><span class="region">${R[d.r]}</span></div>
  <div class="chips"><span class="chip ${sc}">Seule : ${s}</span><span class="chip ${ac}">Nov–déc : ${a}</span><span class="chip ${bc}">Janv–mars : ${b}</span><span class="chip ${rc}">Course : ${ru}</span><span class="chip ${vc}">${vi}${d.vd?" · "+d.vd:""}</span><span class="chip n num">${d.c[0]}–${d.c[1]} €/j</span></div>
  <dl class="facts">
    <dt>Seule</dt><dd>${esc(d.st)}</dd>
    <dt>Météo</dt><dd>${esc(d.met)}</dd>
    <dt>Mood</dt><dd>${esc(d.mood)}</dd>
    <dt>Durée</dt><dd>${esc(d.dur)} sur place · vol <span class="num">${esc(d.vt)}</span></dd>
    <dt>Rapide</dt><dd>${esc(d.fast)}</dd>
    <dt>Local</dt><dd>${esc(d.loc)}</dd>
    <dt>Course</dt><dd>${esc(d.rt)}</dd>
    <dt>Visa</dt><dd>${esc(d.vz)}</dd>
  </dl>
  ${d.w?`<div class="watch"><b>À savoir :</b> ${esc(d.w)}</div>`:""}
  ${mineHTML(d.id)}
  </article>`;
}

/* ---------- Filtres ---------- */
function F(){return{r:$("#fr").value,p:$("#fp").value,s:+$("#fs").value,b:+$("#fb").value,o:$("#fo").value,q:$("#fq").value.trim().toLowerCase(),ru:$("#fc").value,vi:$("#fv").value,w:$("#fw").checked}}
function pass(d,f){
  return (!f.r||R[d.r]===f.r)&&d.solo<=f.s&&f.ru.includes(d.run)&&f.vi.includes(d.visa)&&(f.b>=120||d.c[0]<=f.b)
    &&(!f.p||(f.p==="nd"?d.nd>=1:f.p==="jm"?d.jm>=1:f.p==="ndtop"?d.nd===2:f.p==="jmtop"?d.jm===2:d.nd>=1&&d.jm>=1))
    &&(!f.w||getN(d.id).wish)
    &&(!f.q||JSON.stringify(d).toLowerCase().includes(f.q)||(getN(d.id).note||"").toLowerCase().includes(f.q));
}
function filtered(){
  const f=F();
  let L=D.filter(d=>pass(d,f));
  const per=f.p.startsWith("nd")?"nd":f.p.startsWith("jm")?"jm":null;
  const cmp={r:(x,y)=>order.indexOf(x.r)-order.indexOf(y.r),c:(x,y)=>x.c[0]-y.c[0],s:(x,y)=>x.solo-y.solo,v:(x,y)=>x.v-y.v,k:(x,y)=>x.run-y.run}[f.o];
  return L.slice().sort((x,y)=>cmp(x,y)||(per?y[per]-x[per]:0));
}
function render(){
  const f=F();
  $("#fbv").textContent=f.b>=120?"120 €+":f.b+" €";
  const L=filtered();
  $("#grid").innerHTML=L.length?L.map(card).join(""):`<div class="empty">Aucun pays ne correspond. Élargis le budget ou la période.</div>`;
  $("#count").textContent=L.length+" / "+D.length+" pays";
  const nf=[f.r,f.p,f.s<3,f.ru!=="123",f.vi!=="012",f.b<120,f.q,f.w].filter(Boolean).length;
  $("#fnb").textContent=nf;$("#fnb").hidden=!nf;
  if(f.p==="nd"||f.p==="ndtop")$("#lens").value="nd";
  if(f.p==="jm"||f.p==="jmtop")$("#lens").value="jm";
  if(view==="carte")paintMap();
  try{localStorage.setItem("carnet-f3",JSON.stringify({...f,q:""}))}catch(e){}
}
function updateCount(){const n=D.filter(d=>getN(d.id).wish).length;$("#nsel").textContent=n;if(view==="selection")renderSel();}
function renderSel(){
  const L=D.filter(d=>getN(d.id).wish);
  const key=L.map(d=>d.id).join(",");
  if($("#selgrid").dataset.key===key){refreshMine();return}
  $("#selgrid").dataset.key=key;
  $("#selsum").innerHTML=L.length?`<b>${L.length} pays</b> · budget moyen <span class="num">${Math.round(L.reduce((a,d)=>a+d.c[0],0)/L.length)}–${Math.round(L.reduce((a,d)=>a+d.c[1],0)/L.length)} €/jour</span> · ${L.filter(d=>d.visa===2).length} avec visa payant`:"";
  $("#selgrid").innerHTML=L.length?L.map(card).join(""):`<div class="empty">Ta liste est vide. Clique sur « + Ajouter à ma liste » sur une fiche, ou sur un pays de la carte.</div>`;
}

/* ---------- Carte ---------- */
const MAPN={"vietnam":["Vietnam","Viet Nam"],"malaisie":["Malaysia"],"indonesie":["Indonesia"],"singapour":["Singapore"],"sri-lanka":["Sri Lanka"],"nepal":["Nepal"],"maldives":["Maldives"],"australie":["Australia"],"fidji":["Fiji"],"afrique-du-sud":["South Africa"],"namibie":["Namibia"],"tanzanie":["Tanzania","United Republic of Tanzania"],"kenya":["Kenya"],"madagascar":["Madagascar"],"senegal":["Senegal"],"cap-vert":["Cape Verde","Cabo Verde"],"maroc":["Morocco"],"maurice":["Mauritius"],"colombie":["Colombia"],"perou":["Peru"],"bolivie":["Bolivia"],"equateur":["Ecuador"],"chili":["Chile"],"argentine":["Argentina"],"bresil":["Brazil"],"uruguay":["Uruguay"],"costa-rica":["Costa Rica"],"panama":["Panama"],"guatemala":["Guatemala"],"belize":["Belize"],"nicaragua":["Nicaragua"],"el-salvador":["El Salvador"],"rep-dominicaine":["Dominican Rep.","Dominican Republic"]};
const DOTS={"singapour":[103.82,1.35],"maldives":[73.4,3.6],"cap-vert":[-23.8,15.6],"maurice":[57.55,-20.25],"fidji":[178.1,-17.8]};
const VISITED=["Mexico","New Zealand","Taiwan","Philippines","Laos","Lao PDR","Cambodia"];
const AVOID=["Russia","Ukraine","Israel","Palestine","Lebanon","Syria","Iraq","Iran","Yemen","Sudan","S. Sudan","South Sudan","Somalia","Somaliland","Libya","Mali","Burkina Faso","Niger","Dem. Rep. Congo","Democratic Republic of the Congo","Haiti","Myanmar","Afghanistan","Pakistan","Venezuela","United Arab Emirates","Qatar","Oman","Saudi Arabia","Kuwait","Bahrain","Jordan"];
const GREY=["Egypt","Cuba"];
const NAME2ID={};Object.entries(MAPN).forEach(([id,ns])=>ns.forEach(n=>NAME2ID[n.toLowerCase()]=id));
const LENS={
  nd:{t:"Météo nov–déc",f:d=>d.nd===2?"g":d.nd===1?"w":"b",lg:[["g","Top"],["w","Correct"],["b","Bof"]],v:d=>lab(d.nd)[0]},
  jm:{t:"Météo janv–mars",f:d=>d.jm===2?"g":d.jm===1?"w":"b",lg:[["g","Top"],["w","Correct"],["b","Bof"]],v:d=>lab(d.jm)[0]},
  solo:{t:"Voyager seule",f:d=>sl(d.solo)[1],lg:[["g","Facile"],["w","Vigilance"],["b","Exigeant"]],v:d=>sl(d.solo)[0]},
  run:{t:"Course",f:d=>rl(d.run)[1],lg:[["g","Facile"],["w","Avec contraintes"],["b","Compliqué"]],v:d=>rl(d.run)[0]},
  visa:{t:"Visa",f:d=>vl(d.visa)[1],lg:[["g","Sans visa"],["w","Formalité en ligne"],["b","Visa payant"]],v:d=>vl(d.visa)[0]},
  cost:{t:"Budget",f:d=>d.c[0]<=30?"g":d.c[0]<=45?"w":"b",lg:[["g","≤ 30 €/j"],["w","35–45 €/j"],["b","50 €/j et +"]],v:d=>d.c[0]+"–"+d.c[1]+" €/j"}
};
let mapReady=false,mapFail=false,picked=null;
function decodeRing(s,off,scale){const r=[];let px=off[0],py=off[1];for(let i=0;i<s.length;i+=2){let x=s.charCodeAt(i)-64,y=s.charCodeAt(i+1)-64;x=(x>>1)^(-(x&1));y=(y>>1)^(-(y&1));x+=px;y+=py;px=x;py=y;r.push([x/scale,y/scale]);}return r;}
function decodeGeo(g){
  const scale=g.UTF8Scale||1024;
  g.features.forEach(f=>{const G=f.geometry;if(!G)return;const eo=G.encodeOffsets;
    if(G.type==="Polygon")G.coordinates=G.coordinates.map((r,i)=>typeof r==="string"?decodeRing(r,eo[i],scale):r);
    else if(G.type==="MultiPolygon")G.coordinates=G.coordinates.map((p,j)=>p.map((r,i)=>typeof r==="string"?decodeRing(r,eo[j][i],scale):r));
  });
  return g;
}
function buildMap(){
  const g=window.__worldGeo;
  if(!g||!window.d3){mapFail=true;$("#map").innerHTML=`<div class="empty">La carte n'a pas pu se charger (connexion bloquée). La liste et ta sélection restent utilisables.</div>`;return}
  decodeGeo(g);
  const feats=g.features.filter(f=>f.geometry&&!/antarctica/i.test(f.properties.name)).map(f=>{
    const ft={type:"Feature",properties:f.properties,geometry:f.geometry};
    if(d3.geoArea(ft)>2*Math.PI){const G=ft.geometry;if(G.type==="Polygon")G.coordinates.forEach(r=>r.reverse());else G.coordinates.forEach(p=>p.forEach(r=>r.reverse()));}
    return ft;});
  const W=1000,H=520;
  const proj=d3.geoNaturalEarth1().fitExtent([[4,4],[W-4,H-4]],{type:"FeatureCollection",features:feats});
  const path=d3.geoPath(proj);
  const svg=d3.select("#map").html("").append("svg").attr("viewBox",`0 0 ${W} ${H}`).attr("role","img").attr("aria-label","Carte du monde des pays du carnet");
  svg.append("path").attr("class","sphere").attr("d",path({type:"Sphere"}));
  const found=new Set();
  svg.append("g").selectAll("path").data(feats).join("path").attr("d",path)
    .attr("data-name",f=>f.properties.name)
    .attr("data-id",f=>{const id=NAME2ID[(f.properties.name||"").toLowerCase()];if(id)found.add(id);return id||null});
  const dg=svg.append("g");
  Object.entries(DOTS).forEach(([id,ll])=>{const p=proj(ll);if(p)dg.append("circle").attr("cx",p[0]).attr("cy",p[1]).attr("r",6).attr("class","dot").attr("data-id",id)});
  mapReady=true;paintMap();
  const tip=$("#tip"),box=$("#map");
  svg.on("pointermove",e=>{
    const el=e.target.closest("[data-id],[data-name]");if(!el){tip.hidden=true;return}
    const id=el.dataset.id,nm=el.dataset.name;let h;
    if(id){const d=BY[id],L=LENS[$("#lens").value];h=`<b>${esc(d.n)}</b> · ${esc(L.t)} : ${esc(L.v(d))}${getN(id).wish?" · dans ta liste":""}`}
    else if(VISITED.includes(nm))h=`${esc(nm)} · déjà fait`;
    else if(AVOID.includes(nm))h=`${esc(nm)} · exclu (conflit ou risque)`;
    else if(GREY.includes(nm))h=`${esc(nm)} · zone grise`;
    else {tip.hidden=true;return}
    tip.innerHTML=h;tip.hidden=false;
    const r=box.getBoundingClientRect();let x=e.clientX-r.left+12,y=e.clientY-r.top+12;
    if(x>r.width-220)x=e.clientX-r.left-220;tip.style.left=x+"px";tip.style.top=y+"px";
  });
  svg.on("pointerleave",()=>tip.hidden=true);
  svg.on("click",e=>{const el=e.target.closest("[data-id]");if(!el||!el.dataset.id)return;picked=el.dataset.id;showPicked();paintMap();});
}
function paintMap(){
  if(!mapReady)return;
  const f=F(),L=LENS[$("#lens").value],ok=new Set(D.filter(d=>pass(d,f)).map(d=>d.id));
  $$("#map svg [data-name], #map svg .dot").forEach(el=>{
    const id=el.dataset.id,nm=el.dataset.name;let c="land";
    if(id&&BY[id])c=ok.has(id)?"m-"+L.f(BY[id]):"out";
    else if(VISITED.includes(nm))c="visited";
    else if(AVOID.includes(nm))c="avoid";
    else if(GREY.includes(nm))c="greyz";
    el.setAttribute("class",(el.classList.contains("dot")?"dot ":"")+c+(id&&getN(id).wish?" wishm":"")+(id&&id===picked?" sel":""));
  });
  $("#mlegend").innerHTML=L.lg.map(([k,t])=>`<span><i class="sw m-${k}"></i>${esc(t)}</span>`).join("")
    +`<span><i class="sw out"></i>Hors filtres</span><span><i class="sw visited"></i>Déjà fait</span><span><i class="sw avoid"></i>Exclu</span><span><i class="sw wishk"></i>Dans ma liste</span>`;
  $("#mcount").textContent=ok.size+" pays affichés en couleur";
}
function showPicked(){const d=BY[picked];$("#pick").innerHTML=d?card(d):`<p class="empty">Clique sur un pays en couleur pour afficher sa fiche ici.</p>`;}

/* ---------- Vues ---------- */
let view="liste";
function route(){
  const h=location.hash.replace("#","");view=["carte","selection"].includes(h)?h:"liste";
  $("#v-liste").hidden=view!=="liste";$("#v-carte").hidden=view!=="carte";$("#v-selection").hidden=view!=="selection";
  $$(".tabs a").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")==="#"+view?"page":"false"));
  if(view==="carte"){if(!mapReady&&!mapFail)buildMap();else paintMap();showPicked();}
  if(view==="selection"){$("#selgrid").dataset.key="";renderSel();}
}
window.addEventListener("hashchange",route);

try{const f=JSON.parse(localStorage.getItem("carnet-f3")||"null");if(f){$("#fr").value=f.r;$("#fp").value=f.p;$("#fs").value=f.s;$("#fb").value=f.b;$("#fo").value=f.o;$("#fc").value=f.ru;$("#fv").value=f.vi;$("#fw").checked=!!f.w;
  if(!$("#fc").value)$("#fc").value="123";if(!$("#fv").value)$("#fv").value="012";if(!$("#fs").value)$("#fs").value="3";if($("#fp").selectedIndex<0)$("#fp").value="";}}catch(e){}
["#fr","#fp","#fs","#fc","#fv","#fb","#fo","#fq","#fw"].forEach(id=>$(id).addEventListener("input",render));
$("#lens").addEventListener("input",paintMap);
render();status();updateCount();route();

/* ---------- Connexion au stockage du carnet ---------- */
(async()=>{
  try{
    const c=window.claude;if(!c||!c.use)return;
    const d=await c.use("db");if(!d)return;
    db=d;store="db";status("ok");
    let first=true;
    db.collection("carnet").onSnapshot(snap=>{
      const next={};snap.docs.forEach(doc=>{const v=doc.data()||{};next[doc.id]={note:v.note||"",links:Array.isArray(v.links)?v.links:[],wish:!!v.wish}});
      // garde le texte en cours de frappe
      Object.keys(timers).forEach(id=>{if(timers[id]&&NOTES[id])next[id]={...next[id]||{},note:NOTES[id].note,links:(next[id]||NOTES[id]).links||[],wish:(next[id]||NOTES[id]).wish}});
      if(first){first=false;
        // première connexion : reprend les notes locales éventuelles non encore enregistrées
        Object.entries(NOTES).forEach(([id,n])=>{if(!next[id]&&BY[id]&&(n.note||(n.links||[]).length||n.wish)){next[id]=n;NOTES[id]=n;persist(id);}});
      }
      NOTES=next;refreshMine();updateCount();if(view==="carte")paintMap();
    },err=>{store="local";db=null;status();});
  }catch(e){}
})();

/* ---------- Sauvegarde des notes dans un fichier ---------- */
$("#exp").addEventListener("click",()=>{
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(NOTES,null,2)],{type:"application/json"}));
  a.download="carnet-notes-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);
});
$("#imp").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const data=JSON.parse(await f.text());Object.entries(data).forEach(([id,n])=>{if(BY[id])patch(id,{note:n.note||"",links:Array.isArray(n.links)?n.links:[],wish:!!n.wish})});}
  catch(err){alert("Fichier illisible : choisis un export du carnet (.json).")}
  e.target.value="";
});

/* ---------- Synchronisation Supabase (voir js/config.js) ---------- */
(()=>{
  const cfg=window.CARNET_SUPABASE||{};
  if(!cfg.url||!cfg.key||!window.supabase||(window.claude&&window.claude.use))return;
  const client=window.supabase.createClient(cfg.url,cfg.key);
  const box=$("#auth");box.hidden=false;
  let first=true;
  async function load(){
    const {data,error}=await client.from("carnet").select("pays_id,note,links,wish");
    if(error){status("err");return}
    const next={};
    data.forEach(r=>{if(BY[r.pays_id])next[r.pays_id]={note:r.note||"",links:Array.isArray(r.links)?r.links:[],wish:!!r.wish}});
    // garde le texte en cours de frappe
    Object.keys(timers).forEach(id=>{if(timers[id]&&NOTES[id])next[id]={...(next[id]||{links:[],wish:false}),note:NOTES[id].note}});
    if(first){first=false;
      // première connexion : envoie les notes de ce navigateur qui ne sont pas encore en ligne
      Object.entries(NOTES).forEach(([id,n])=>{if(!next[id]&&BY[id]&&(n.note||(n.links||[]).length||n.wish)){next[id]=n;NOTES[id]=n;persist(id);}});
    }
    NOTES=next;refreshMine();updateCount();if(view==="carte")paintMap();
  }
  function show(session){
    if(session){
      sb=client;uid=session.user.id;store="sb";status("ok");
      box.innerHTML=`Connectée : ${esc(session.user.email)} <button type="button" id="logout">Se déconnecter</button>`;
      $("#logout").onclick=()=>client.auth.signOut();
      load();
    }else{
      sb=null;uid=null;store="local";first=true;status();
      try{NOTES=JSON.parse(localStorage.getItem("carnet-notes")||"{}")||{}}catch(e){NOTES={}}
      refreshMine();updateCount();
      let mail="";try{mail=localStorage.getItem("carnet-email")||""}catch(e){}
      box.innerHTML=`<form id="login" style="display:contents"><span>Synchroniser mes notes :</span><input type="email" name="email" value="${esc(mail)}" placeholder="ton e-mail" required aria-label="E-mail" autocomplete="email"><button type="submit">Recevoir un code</button><button type="button" class="x" id="hascode">J'ai déjà un code</button></form>`;
      // le code se tape sur cette page : marche aussi depuis l'icône de l'écran d'accueil (le lien de l'e-mail, lui, s'ouvre dans Safari)
      const askCode=(email,msg)=>{
        box.innerHTML=`<form id="otp" style="display:contents"><span>${esc(msg)}</span><input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" placeholder="code reçu" required aria-label="Code reçu par e-mail"><button type="submit">Valider</button><button type="button" class="x" id="back">Changer d'e-mail</button></form>`;
        $("#back").onclick=()=>show(null);
        $("#otp").onsubmit=async e=>{
          e.preventDefault();
          const {error}=await client.auth.verifyOtp({email,token:e.target.code.value.trim(),type:"email"});
          if(error)askCode(email,"Code refusé ("+error.message+"). Réessaie :");
        };
        $("#otp").code.focus();
      };
      const emailOf=()=>{const v=$("#login").email.value.trim();try{localStorage.setItem("carnet-email",v)}catch(e){}return v};
      $("#hascode").onclick=()=>{if($("#login").reportValidity())askCode(emailOf(),"Code reçu par e-mail :")};
      $("#login").onsubmit=async e=>{
        e.preventDefault();
        const email=emailOf();
        const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:location.origin+location.pathname}});
        if(error){box.innerHTML=`<span>Envoi impossible : ${esc(error.message)}</span><button type="button" class="x" id="back">Réessayer</button>`;$("#back").onclick=()=>show(null);}
        else askCode(email,"Code envoyé à "+email+" :");
      };
    }
  }
  // setTimeout : ne pas appeler Supabase depuis le callback lui-même (blocage connu de supabase-js)
  client.auth.onAuthStateChange((ev,session)=>{if(ev==="INITIAL_SESSION"||ev==="SIGNED_IN"||ev==="SIGNED_OUT")setTimeout(()=>show(session),0)});
  // recharge les notes prises sur un autre appareil quand on revient sur la page
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&sb)load()});
})();

/* ---------- Filtres repliables sur mobile ---------- */
$("#ftog").addEventListener("click",()=>{
  const open=$("#filters").classList.toggle("open");
  $("#ftog").setAttribute("aria-expanded",open);
});
