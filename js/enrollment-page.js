(function(){
const A=window.SchoolStackEnrollmentAudit;
const {STAGES,ITEMS,FORCES,GRADES,MONTHS,MONTHS_LONG,KEY,NUMS,COUNTS,RATES,STATES,EXAMPLE,BLANK,clean,gradeLabel,stageOf}=A;
const SHARE_ENABLED=false;
const FORM_URL="https://airtable.com/appk92KPCWOm8X8B7/pagQxyBNwXId3KkCa/form";
let S;
try{const raw=localStorage.getItem(KEY); S=raw?clean(JSON.parse(raw)):null;}catch(e){S=null}
if(!S) S=clean(EXAMPLE);
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

const $=id=>document.getElementById(id);
const sizeBars=el=>el.querySelectorAll("i[data-w]").forEach(i=>{i.style.width=i.dataset.w+"%"});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const visible=()=>A.visible(S);
const scored=()=>A.scored(S);
const optShown=o=>A.optShown(S,o);
const marked=()=>A.marked(S);

$("schoolState").innerHTML='<option value="">Choose</option>'+STATES.map(s=>`<option value="${s}">${s}</option>`).join("");
const om=$("offerMonth");
om.innerHTML='<option value="rolling">Rolling, all year</option>'+MONTHS_LONG.map((m,i)=>`<option value="${i}">${m}</option>`).join("");
$("grades").innerHTML=GRADES.map(g=>`<label class="chip"><input type="checkbox" id="grade-${g.id}" value="${g.id}"><span>${esc(g.label)}</span></label>`).join("");

function renderAudit(){
  $("audit").innerHTML=STAGES.map(st=>{
    const items=visible().filter(i=>i.st===st.id);
    return `<div class="stage" data-tone="${st.color.slice(2)}"><div class="stage-head"><h3>${st.name}</h3><span class="q">${st.q}</span></div>`+
    items.map(it=>{
      const a=S.ans[it.id];
      const opts=[["yes","Yes","y"],["partly","Partly","p"],["no","Not yet","n"],["na","N/A","x"]];
      return `<div class="item"><div class="txt"><p class="practice" id="pr-${it.id}">${esc(it.p)}</p><p class="why">${esc(it.why)}</p></div>
      <div class="seg" role="radiogroup" aria-labelledby="pr-${it.id}">${opts.map(o=>`<label><input type="radio" name="q-${it.id}" id="q-${it.id}-${o[0]}" value="${o[0]}" ${a===o[0]?"checked":""}><span class="${o[2]}">${o[1]}</span></label>`).join("")}</div></div>`;
    }).join("")+`</div>`;
  }).join("");
}
function renderForces(){
  $("forces").innerHTML=FORCES.map(f=>`<div class="force" data-tone="${f.c.slice(2)}"><div class="force-head"><span class="arrow" aria-hidden="true">${f.sym}</span><div><span class="side">${f.side}</span><h3>${f.name}</h3><p>${f.sub}</p></div></div>
    <div class="opts">${f.opts.filter(optShown).map(o=>{const on=S.forces.includes(o.id);return `<label class="opt ${on?"on":""}" for="fo-${o.id}"><input type="checkbox" id="fo-${o.id}" value="${o.id}" ${on?"checked":""}><span>${esc(o.t)}</span></label>`}).join("")}</div></div>`).join("");
}
function syncProfile(){
  $("schoolName").value=S.name||"";
  $("schoolState").value=S.state||"";
  $("schoolType").value=S.type||"tuition";
  om.value=String(S.offer??"7");
  GRADES.forEach(g=>{$("grade-"+g.id).checked=S.grades.includes(g.id)});
  NUMS.forEach(k=>$(k).value=S[k]??"");
  COUNTS.forEach(k=>$(k).value=S[k]??"");
  $("exampleBanner").hidden=!S.example;
}

const boost=id=>A.boost(S,id);
const ranked=()=>A.ranked(S);
const planned=()=>A.planned(S);
const pct=list=>A.pct(S,list);
const progress=()=>A.progress(S);
function renderScore(){
  const sc=scored(),pr=progress();
  $("overall").textContent=pr.ready?pct(sc):"–";
  $("answered").textContent=`${pr.done} of ${pr.all} answered`+(pr.ready?"":`. Your score shows at ${pr.need}.`);
  $("progCount").textContent=`${pr.done} of ${pr.all} answered`;
  $("progScore").textContent=pr.ready?`Score ${pct(sc)}`:"";
  $("progFill").style.width=(pr.all?pr.done/pr.all*100:0)+"%";
  $("meters").innerHTML=STAGES.map(st=>{const v=pct(sc.filter(i=>i.st===st.id));return pr.ready?`<div class="meter" data-tone="${st.color.slice(2)}"><div class="row"><span>${st.name}</span><span class="num">${v}</span></div><div class="bar" role="img" aria-label="${st.name} ${v} out of 100"><i data-w="${v}"></i></div></div>`:`<div class="meter" data-tone="${st.color.slice(2)}"><div class="row"><span>${st.name}</span><span class="num">–</span></div><div class="bar" role="img" aria-label="${st.name} not scored yet"><i data-w="0"></i></div></div>`}).join("");
  sizeBars($("meters"));
  const top=ranked().slice(0,3);
  $("topgaps").innerHTML=top.length?top.map(i=>`<li data-tone="${stageOf(i.st).color.slice(2)}"><span>${esc(i.s)}</span></li>`).join(""):`<li data-tone="line"><span>No gaps marked yet.</span></li>`;
}

function renderPlan(){
  $("planName").textContent=S.name?S.name+"'s":"Your";
  const {plan:r,rest}=planned();
  const phases=[["Days 1 to 30","Start now"],["Days 31 to 60","Build"],["Days 61 to 90","Lock in"]];
  $("phases").innerHTML=phases.map((ph,k)=>{
    const steps=r.slice(k*3,k*3+3);
    return `<div class="phase"><h3>${ph[0]} <small>${ph[1]}</small></h3>`+(steps.length?steps.map(i=>{
      const st=stageOf(i.st),b=boost(i.id);
      return `<div class="step" data-tone="${st.color.slice(2)}"><span class="s-stage">${st.name} · ${esc(i.s)}</span><p class="s-do">${esc(i.act)}</p><p class="s-why">${esc(i.why)}</p><p class="s-status ${i.gap===2?"no":"part"}">${i.gap===2?"Not yet":"Partly"}${b?` · answers ${b} of the forces you marked`:""}</p></div>`;
    }).join(""):`<p class="empty">${k===0?"Mark practices Partly or Not yet in the audit to build this list.":"Nothing more to add here."}</p>`)+`</div>`;
  }).join("")+(rest.length?`<div class="phase also"><h3>Also open <small>After day 90</small></h3><ul class="rest">${rest.map(i=>`<li>${stageOf(i.st).name}: ${esc(i.s)}</li>`).join("")}</ul></div>`:"");
  renderSeat();renderCal();$("planText").value=planText();
}
const seatMath=()=>A.seatMath(S);
function renderSeat(){
  const m=seatMath();
  if(!m.target){$("result").innerHTML="";$("funnel").innerHTML=`<p class="note">Enter your budget driver or an enrollment goal to see how many families you need.</p>`;$("leverNote").textContent="";return}
  if(m.re===null){$("result").innerHTML="";$("funnel").innerHTML=`<p class="note">Enter your expected re-enrollment rate to see how many students are likely to return and how many new ones you need.</p>`;$("leverNote").textContent="";return}
  const newDrv=m.drv?m.fill(m.drv):null,newGoal=m.goal?m.fill(m.goal):null;
  $("result").innerHTML=`<div><b class="num">${m.back}</b><span>students likely to return</span></div>`+
    (newDrv!==null?`<div><b class="num">${newDrv}</b><span>new students to reach your budget driver (${m.drv})</span></div>`:"")+
    (newGoal!==null?`<div><b class="num">${newGoal}</b><span>new students to reach your goal (${m.goal})</span></div>`:"");
  const seats=m.fill(m.target);
  if(!m.funnelReady){$("funnel").innerHTML=`<p class="note">Enter all three conversion rates to see the inquiries, applications and offers it takes to enroll ${seats} new students.</p>`;$("leverNote").textContent="";return}
  const f=m.funnel(seats);
  const max=Math.max(f.inq,1);
  const row=(lbl,v,c)=>`<div class="frow"><span>${lbl}</span><div class="bar"><i data-tone="${c.slice(2)}" data-w="${v/max*100}"></i></div><b class="num">${v}</b></div>`;
  $("funnel").innerHTML=`<p class="note note-funnel">To enroll ${seats} new students for your ${m.goal?"goal":"budget driver"}, you need about:</p>`+row("Inquiries",f.inq,"--st-aw")+row("Applications",f.apps,"--st-co")+row("Offers",f.offers,"--st-ap")+row("New students",seats,"--st-yi");
  sizeBars($("funnel"));
  const notes=[],lv=A.levers(m);
  if(lv.reenroll!==null)notes.push(`Raise re-enrollment by 5 points and you need ${lv.reenroll} fewer inquiries.`);
  if(lv.yield!==null)notes.push(`Raise yield by 10 points and you need ${lv.yield} fewer.`);
  $("leverNote").textContent=notes.join(" ");
}
const lanes=()=>A.lanes(S);
function renderCal(){
  let h=`<div></div>`+MONTHS.map(m=>`<div class="mh">${m}</div>`).join("");
  lanes().forEach(l=>{
    h+=`<div class="ln">${esc(l.n)}<small>${esc(l.s)}</small></div>`;
    for(let i=0;i<12;i++){
      if(l.m.has(i)){const st=!l.m.has(i-1),en=!l.m.has(i+1);h+=`<div class="seg-b ${st?"start":""} ${en?"end":""} ${l.faint?"faint":""}" data-tone="${l.c.slice(2)}" title="${esc(l.n)}: ${MONTHS_LONG[i]}"></div>`}
      else h+=`<div class="gap"></div>`;
    }
  });
  $("cal").innerHTML=h;
}
const planText=()=>A.planText(S);
function renderShare(){
  $("shareBlock").hidden=!SHARE_ENABLED; if(!SHARE_ENABLED) return;
  const a=$("shareLink"),note=$("shareNote");
  if(S.example){a.setAttribute("aria-disabled","true");a.removeAttribute("href");note.textContent="Start your own audit to share your numbers. Example answers are never sent.";return}
  const sc=scored(),p=[];
  const add=(k,v)=>{if(v!==undefined&&v!==null&&String(v).trim()!=="")p.push("prefill_"+encodeURIComponent(k)+"="+encodeURIComponent(v))};
  add("State",S.state);
  add("How families pay",S.type==="tuition"?"Tuition, ESA or scholarship":"Public charter");
  if(S.grades.length)add("Grades enrolled",S.grades.map(gradeLabel).join(","));
  add("Offers go out",S.offer==="rolling"?"Rolling":MONTHS_LONG[parseInt(S.offer,10)]);
  [["Students enrolled now","current"],["Expected re-enrollment %","reRate"],["Budget driver","driver"],["Enrollment goal","goal"],["Inquiry to application %","rInq"],["Application to offer %","rApp"],["Offer to enrolled %","rYield"]].forEach(([k,f])=>{const v=parseFloat(S[f]);if(isFinite(v))add(k,Math.round(v))});
  if(visible().filter(i=>S.ans[i.id]).length>=visible().length*0.8){
    add("Audit score",pct(sc));
    STAGES.forEach(s=>add(s.name+" score",pct(sc.filter(i=>i.st===s.id))));
    add("Biggest gaps",ranked().slice(0,3).map(i=>i.s).join("; "));
  }
  const fs=[];FORCES.forEach(f=>f.opts.forEach(o=>{if(S.forces.includes(o.id))fs.push(`${f.name}: ${o.t}`)}));
  add("Forces marked",fs.join("; "));
  a.removeAttribute("aria-disabled");
  a.href=FORM_URL+(p.length?"?"+p.join("&"):"");
  note.textContent="Opens a short form with your answers filled in. You review them and add last year's actual numbers before you submit. Your school name is not included.";
}
function renderAll(){renderScore();renderPlan();renderShare()}

document.addEventListener("change",e=>{
  const t=e.target;
  if(t.name&&t.name.startsWith("q-")){S.ans[t.name.slice(2)]=t.value}
  else if(t.id&&t.id.startsWith("fo-")){const id=t.value;S.forces=t.checked?[...new Set([...S.forces,id])]:S.forces.filter(x=>x!==id);t.closest(".opt").classList.toggle("on",t.checked)}
  else if(t.id&&t.id.startsWith("grade-")){S.grades=GRADES.filter(g=>$("grade-"+g.id).checked).map(g=>g.id);renderAudit();renderForces()}
  else if(t.id==="schoolType"){S.type=t.value;renderAudit();renderForces()}
  else if(t.id==="offerMonth"){S.offer=t.value}
  else if(t.id==="schoolState"){S.state=t.value}
  else if(RATES[t.id]!==undefined){const v=A.clampRate(t.id,t.value);if(v===null||v===parseFloat(t.value))return;t.value=v;S[t.id]=String(v)}
  else return;
  claimExample();save();renderAll();
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="schoolName"){S.name=t.value.slice(0,80)}
  else if(NUMS.includes(t.id)){S[t.id]=t.value}
  else if(COUNTS.includes(t.id)){
    S[t.id]=t.value;
    A.ratesFromCount(S,t.id).forEach(([rate,v])=>{S[rate]=String(v);$(rate).value=v});
  }
  else return;
  claimExample();save();renderAll();
});
function claimExample(){
  if(!S.example)return;
  S.example=false;$("exampleBanner").hidden=true;
  toast("This audit is yours now. Change any example answer to make it your own.");
}
function toast(msg){const el=$("toast");el.textContent=msg;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
function resetBlank(){S=BLANK();save();syncProfile();renderAudit();renderForces();renderAll()}
$("startOwn").addEventListener("click",()=>{resetBlank();toast("Example cleared. Your audit starts here.");$("schoolName").focus()});
let disarm=null;
$("resetAll").addEventListener("click",e=>{
  if(!disarm){e.target.textContent="Click again to clear";disarm=setTimeout(()=>{disarm=null;e.target.textContent="Clear all answers"},3000);return}
  clearTimeout(disarm);disarm=null;e.target.textContent="Clear all answers";resetBlank();toast("Answers cleared");
});
$("copyPlan").addEventListener("click",()=>{
  const txt=planText(),box=$("planText");box.value=txt;
  const fallback=()=>{box.focus();box.select();toast("Plan selected. Press Ctrl+C or Cmd+C to copy.")};
  try{navigator.clipboard.writeText(txt).then(()=>toast("Plan copied"),fallback)}catch(err){fallback()}
});

$("saveFile").addEventListener("click",()=>{
  const now=new Date();
  const a=document.createElement("a"),url=URL.createObjectURL(new Blob([A.fileBody(S,now)],{type:"application/json"}));
  a.href=url;a.download=A.fileName(S,now);
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Audit saved to a file");
});
$("openFile").addEventListener("click",()=>$("filePick").click());
$("filePick").addEventListener("change",e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  const bad=()=>toast("That file is not a saved audit. Your answers are unchanged.");
  if(f.size>200000)return bad();
  const r=new FileReader();
  r.onerror=bad;
  r.onload=()=>{
    const next=A.readFile(r.result);
    if(!next)return bad();
    next.example=false;S=next;save();syncProfile();renderAudit();renderForces();renderAll();
    toast("Saved audit opened");
  };
  r.readAsText(f);
});

syncProfile();renderAudit();renderForces();renderAll();
})();
