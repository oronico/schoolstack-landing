(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SchoolStackEnrollmentAudit = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const STAGES=[
   {id:"aw",name:"Awareness",q:"Do the right families know you exist?",color:"--st-aw"},
   {id:"co",name:"Consideration",q:"Do they see why your school, and see their child here?",color:"--st-co"},
   {id:"ap",name:"Application",q:"Do they finish applying?",color:"--st-ap"},
   {id:"yi",name:"Yield",q:"Do accepted families show up on day one?",color:"--st-yi"},
   {id:"re",name:"Retention",q:"Do your families come back next year?",color:"--st-re"}
  ];
  const ITEMS=[
   {id:"a1",st:"aw",w:3,s:"Referral tools for current families",p:"Current families have an easy way to refer others: a link to share, a person to call and a few facts to pass on.",why:"Families trust another parent more than any ad. A happy family will send others if you make it easy and tell them what to say.",act:"Give every current family a referral card: a short link, the name of the person to call and three facts about the school. Ask for referrals at pickup and in your next newsletter."},
   {id:"a2",st:"aw",w:2,s:"Track referrals on the inquiry form",p:"Our inquiry form asks how the family heard about us, and we count referrals as their own line.",why:"If you don't count referrals, you can't tell whether your parent ambassadors are working.",act:"Add two questions to your inquiry form: “How did you hear about us?” and “Do you know a family enrolled here?” Report referral inquiries each month."},
   {id:"a3",st:"aw",w:2,s:"Partners outside your circle",p:"At least two community partners outside our current families send families our way: pastors, youth leagues, counselors, tutors, therapists or pediatricians.",why:"Word of mouth stops at the edge of your current families. Trusted local voices reach the families your parents don't know.",act:"List five trusted people in your area who see families outside your circle. Meet two of them this month and leave them something to hand out."},
   {id:"a4",st:"aw",w:2,s:"Own your online listings",p:"A named person keeps our Google, review site and local parent group listings current.",why:"Families form a first view online before they ever call. A wrong address or an unanswered review costs you calls you never see.",act:"Name one owner for online listings. Claim each one, fix wrong facts, answer reviews and set a monthly reminder to check them."},
   {id:"a5",st:"aw",w:1,s:"Run a secret shopper test",p:"In the last six months, someone searched for our school as a new family would and fixed what they found.",why:"You can't see your school the way a stranger does unless you look on purpose.",act:"Search for your school, call the main line and fill out the inquiry form as a parent would. Write down every snag and fix the top three."},
   {id:"a6",st:"aw",w:2,s:"Reach families at moments of change",p:"We reach out when families face a change: a move, a school closing, new housing nearby or a hard year.",why:"Families who are content rarely look. Families facing a change are ready to hear about a new option.",act:"Pick one change to target this season (a closing school, new housing, a nearby employer hiring) and plan one outreach touch for those families."},
   {id:"a7",st:"aw",w:1,s:"Use your host site and faith partners",p:"Our host church or partner congregation helps spread the word: bulletin notes, announcements, a table after services.",why:"Many small schools meet in churches. The congregation already knows the building and trusts the people in it.",act:"Ask your host or partner congregation for one announcement and one bulletin note this month, and staff a table after a service."},
   {id:"c1",st:"co",w:3,s:"Name your academic specifics",p:"Our website and materials name our model, show how we measure progress, describe support for different learners and list what students do beyond the core.",why:"Every school says it has strong academics. Families act on what they can check.",act:"Rewrite your academics page around four specifics: your model by name, how you track progress, support for students who need more, and enrichment."},
   {id:"c2",st:"co",w:3,s:"Show safety and belonging",p:"Our materials show what it is like to be a student here: safety, how we handle conflict and bullying, and how each child is known.",why:"Parents want to know their child will be safe and known, not only taught. For many families this decides it.",act:"Write a short, plain statement on school climate (safety, conflict, how each child is known) and use it on your home page and at every tour."},
   {id:"c3",st:"co",w:3,s:"Show you are a real school",p:"A visitor can tell right away this is a serious school: an experienced educator leading it, a safe building that meets code, written policies and proof students are learning.",why:"Schools in churches, storefronts and homes get asked if they are a real school. Answer before a family has to ask.",act:"Build a one-page “Who we are” sheet: the leader's education background, your building's safety status, key policies and how you show learning. Hand it out at every tour."},
   {id:"c4",st:"co",w:3,s:"Stay open to families all year",p:"Any month of the year, a family can reach a person, find current facts and start an application.",why:"Many families decide in weeks after a move or a hard year. The school they can reach first makes their short list.",act:"Keep the application open year-round, put a phone number that gets answered on every page and check that dates, costs and open grades on your site are current."},
   {id:"c5",st:"co",w:2,s:"Reply to inquiries within a day",p:"We answer new inquiries within one business day, including in summer.",why:"A slow reply reads as a school too busy for my child. Families who decide fast go with whoever answers.",act:"Set a one-business-day reply rule. Assign summer coverage by name and test it with a form submission in June."},
   {id:"c6",st:"co",w:2,s:"Ask what started the search",p:"We ask what started each family's search and fit our message to it.",why:"A family leaving a bad situation needs to hear why it will be different here. A family comparing options needs to hear why you.",act:"Add “What started your search?” to the inquiry form (unhappy at current school, looking for a better fit, change in family life) and write a reply for each."},
   {id:"c7",st:"co",w:3,only:"tuition",s:"Make cost and aid plain",p:"Families can see full cost, what ESA, voucher, tax credit scholarship or school aid covers, and the steps and deadlines, before they apply.",why:"Cost and paperwork worry families new to private school most. A family that can't see the math stops at the inquiry.",act:"Publish a one-page cost sheet: tuition, fees, the aid you accept, what a typical family pays after aid and the steps and deadlines to use it."},
   {id:"p1",st:"ap",w:2,grades:["prek","k-2"],s:"A path for PreK and K families",p:"Families new to school (PreK and K) have their own info session, plain language and a current parent of a young child to talk to.",why:"First-time school families visit more schools, know less about the process and worry more about choosing wrong.",act:"Hold one info session only for PreK and K families and match each interested family with a current parent of a young child within a week."},
   {id:"p2",st:"ap",w:2,grades:["6-8","9-12"],s:"Reach families before a transition",p:"Our calendar reaches families a year before a natural move, such as 5th to 6th or 8th to 9th grade.",why:"Families start rethinking school the year before a transition. Reach them before they decide, not after.",act:"Add families of 4th and 7th graders to this year's calendar with light touches: a community event, a postcard or a short ad. Ask for nothing yet."},
   {id:"p3",st:"ap",w:3,s:"Pre-enrollment visits",p:"Applicants can sit in a class, shadow for a day or meet students and teachers before they enroll.",why:"A child who has met a teacher can picture going there. So can the parent.",act:"Offer a set visit: one class to sit in, one teacher to meet and one student to talk to. Put the sign-up link in your application confirmation."},
   {id:"p4",st:"ap",w:3,s:"A commute and care sheet",p:"Families get a commute and care sheet at inquiry and again at acceptance: routes, carpools, drive times and before and after care.",why:"Families say yes to a school, then can't make the daily drive or schedule work. Often the problem is picturing it, not distance.",act:"Make a one-page commute and care sheet: transit or bus options, a carpool sign-up, drive times from three nearby neighborhoods and care hours. Send it with every offer."},
   {id:"p5",st:"ap",w:2,grades:["6-8","9-12"],s:"Talk to students, not only parents",p:"For middle and high school applicants, we speak to the student directly, not only the parent.",why:"By middle school the student often has the final say. A message aimed only at parents misses the person deciding.",act:"Write one message from 7th grade up that speaks to the student, and invite each student applicant to talk with a current student."},
   {id:"p6",st:"ap",w:2,s:"A short application",p:"Our application takes under 20 minutes on a phone and asks only what we need to decide.",why:"Every extra page is a place to stall. Families apply in spare minutes, often on a phone.",act:"Fill out your own application on a phone and time it. Cut every question you don't need until after enrollment."},
   {id:"y1",st:"yi",w:3,s:"Next-day welcome call",p:"Every accepted family hears from a named staff member by the next school day.",why:"The weeks between offer and first day are when families back out. Silence reads as “they don't need us.”",act:"Start a welcome call for every offer. Use a short script: congratulations, what happens next, the commute sheet, and when they can visit."},
   {id:"y2",st:"yi",w:2,s:"One owner for accepted families",p:"One person owns each accepted family until the first day of school, and it is part of their job.",why:"When everyone owns follow-up, no one does. Families need one name to call.",act:"Name one owner for accepted families and write it into their role. They track each family from offer to first day."},
   {id:"y3",st:"yi",w:2,s:"Track yield and reasons for no",p:"We track how many offers turn into enrolled students and record why each family said no.",why:"You can't fix what you don't count. Reasons for no show which losses were in your control.",act:"Add a yield column to your tracker and ask every family that declines one question: “What made you choose another option?”"},
   {id:"y4",st:"yi",w:2,s:"One story across every touch",p:"A family hears the same story from our website, inquiry email, tour and acceptance letter.",why:"Mixed messages raise stress, and stressed families default to what they know.",act:"Lay your website, inquiry email, tour talking points and acceptance letter side by side. Fix every place where facts, dates or tone don't match."},
   {id:"y5",st:"yi",w:2,s:"Student ambassadors",p:"Current students reach out to accepted students before the enrollment deadline.",why:"A child who is excited to come is the strongest yield tool you have, and a reluctant one can undo a parent's yes.",act:"Start a student ambassador group. Each accepted student hears from a current student before the deadline."},
   {id:"y6",st:"yi",w:1,s:"Personal follow-up after acceptance",p:"Our messages after acceptance refer to what this family cared about, not a form letter.",why:"A note that remembers their question tells a family they were heard.",act:"Keep notes on what each family asked at tours and inquiry. Use them in one personal follow-up, and connect them with a current parent."},
   {id:"y7",st:"yi",w:2,only:"tuition",s:"Walk families through contract and aid",p:"We explain the enrollment contract, deposit and aid award steps in a conversation, not only by email.",why:"Contracts and aid forms are where accepted families stall, and they rarely call to say so.",act:"Book a 15-minute call with each accepted family to walk through the contract, deposit and aid steps. Track who has finished each one."},
   {id:"r1",st:"re",w:3,s:"Re-enroll early",p:"We ask current families to re-enroll by a set date each winter, before other schools make offers.",why:"A returning student is the cheapest seat you will fill. Every family that leaves has to be replaced by new recruiting.",act:"Set a re-enrollment date in January or February, before other schools' offers. Send the form with a personal note from the leader."},
   {id:"r2",st:"re",w:3,s:"Talk with families who might leave",p:"We know which families are unsure about next year and talk with each of them before re-enrollment opens.",why:"Families rarely leave without signs: missed payments, a struggling child, fewer pickups. An early talk can fix what a form can't.",act:"Go through your roster with teachers and mark any family that might not return. The leader calls each one before re-enrollment opens."},
   {id:"r3",st:"re",w:2,s:"Survey families and close the loop",p:"We survey families once a year and tell them what we changed because of it.",why:"Families stay where they feel heard. Showing what changed matters more than asking.",act:"Send a five-question family survey this term, then share three things you will change because of it."},
   {id:"r4",st:"re",w:2,s:"Re-engage last cycle's families",p:"We keep a list of every family that applied, was accepted or left, and contact them at the start of each cycle.",why:"These families already know you. Many chose something else over timing or logistics, not over your school.",act:"Pull every family that applied, was accepted or left in the last two years. Send each a personal note at the start of the cycle with what is new."},
   {id:"r5",st:"re",w:1,s:"Ask why families leave",p:"When a family leaves, we ask why and write it down.",why:"Exit reasons show patterns you can fix before they cost you more families.",act:"Make a short exit conversation standard for every departing family and review the reasons each spring."}
  ];
  const FORCES=[
   {id:"push",name:"Push",side:"Toward a change",sub:"What drives families away from their current school",c:"--st-aw",sym:"→",opts:[
     {id:"pu1",t:"Unhappy with their current school",items:["c6","p2"]},
     {id:"pu2",t:"Child struggling or needing more support",items:["c1","a3"]},
     {id:"pu3",t:"Safety or bullying concerns",items:["c2"]},
     {id:"pu4",t:"A move, a new job or a family change",items:["a6","c4","c5"]},
     {id:"pu5",t:"Their school is closing or changing",items:["a6","c4"]}]},
   {id:"pull",name:"Pull",side:"Toward a change",sub:"What draws families to your school",c:"--st-co",sym:"→",opts:[
     {id:"pl1",t:"Small classes and a child known by name",items:["c2","p3"]},
     {id:"pl2",t:"Faith and shared values",items:["a7","c2"]},
     {id:"pl3",t:"Your model or approach",items:["c1"]},
     {id:"pl4",t:"Schedule or flexibility",items:["p4"]},
     {id:"pl5",t:"ESA or scholarship makes it affordable",items:["c7","y7"]}]},
   {id:"anx",name:"Anxiety",side:"Against a change",sub:"What worries families about switching",c:"--no",sym:"←",opts:[
     {id:"an1",t:"Cost and paperwork",items:["c7","y7","y1"]},
     {id:"an2",t:"Will my child fit in",items:["c2","p3","y5"]},
     {id:"an3",t:"Is this a real school",items:["c3","c1"]},
     {id:"an4",t:"Getting there every day",items:["p4"]},
     {id:"an5",t:"The process is confusing",items:["y2","y4","p6"]}]},
   {id:"hab",name:"Habit",side:"Against a change",sub:"What keeps families where they are",c:"--st-ap",sym:"←",opts:[
     {id:"hb1",t:"Siblings or friends at their current school",items:["a1","y6"]},
     {id:"hb2",t:"Their current school costs nothing and is close",items:["p4","c7"]},
     {id:"hb3",t:"They know the routine",items:["y1","p3"]},
     {id:"hb4",t:"They don't know what else is out there",items:["a3","a4"]}]}
  ];
  const GRADES=[{id:"prek",label:"PreK"},{id:"k-2",label:"K to 2"},{id:"3-5",label:"3 to 5"},{id:"6-8",label:"6 to 8"},{id:"9-12",label:"9 to 12"}];
  const gradeLabel=id=>(GRADES.find(g=>g.id===id)||{label:id}).label;
  const MONTHS=["Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul"];
  const MONTHS_LONG=["August","September","October","November","December","January","February","March","April","May","June","July"];
  const VAL={yes:2,partly:1,no:0};
  const KEY="ss-enrollment-path-v2";
  const NUMS=["current","reRate","driver","goal","rInq","rApp","rYield"];
  const COUNTS=["lInq","lApp","lOff","lEnr"];
  const FROM_COUNTS=[["rInq","lApp","lInq"],["rApp","lOff","lApp"],["rYield","lEnr","lOff"]];
  const RATES={reRate:0,rInq:1,rApp:1,rYield:1};
  
  const STATES=["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
  const EXAMPLE={example:true,name:"Example school",state:"",type:"tuition",offer:"7",grades:["k-2","3-5","6-8"],
   ans:{a1:"partly",a2:"no",a3:"no",a4:"partly",a5:"no",a6:"no",a7:"yes",c1:"yes",c2:"partly",c3:"partly",c4:"no",c5:"partly",c6:"no",c7:"no",p1:"partly",p2:"no",p3:"yes",p4:"no",p5:"no",p6:"partly",y1:"no",y2:"partly",y3:"no",y4:"partly",y5:"no",y6:"partly",y7:"no",r1:"partly",r2:"no",r3:"no",r4:"no",r5:"no"},
   forces:["pu2","pl1","pl5","an1","an3","hb2"],current:72,reRate:85,driver:80,goal:96,rInq:50,rApp:80,rYield:65};
  const BLANK=()=>({example:false,name:"",state:"",type:"tuition",offer:"7",grades:[],ans:{},forces:[],current:"",reRate:"",driver:"",goal:"",rInq:"",rApp:"",rYield:""});
  
  const OLD_GRADE_LABELS={"PreK":"prek","K to 2":"k-2","3 to 5":"3-5","6 to 8":"6-8","9 to 12":"9-12"};
  const ANSWERS=["yes","partly","no","na"];
  function clean(o){
    if(!o||typeof o!=="object"||!o.ans||typeof o.ans!=="object")return null;
    const c=BLANK(),str=(v,max)=>typeof v==="string"||typeof v==="number"?String(v).slice(0,max):"";
    c.example=o.example===true;
    c.name=str(o.name,80);
    c.state=STATES.includes(o.state)?o.state:"";
    c.type=o.type==="charter"?"charter":"tuition";
    c.offer=o.offer==="rolling"||(/^\d+$/.test(String(o.offer))&&+o.offer<12)?String(o.offer):"7";
    c.grades=(Array.isArray(o.grades)?o.grades:[]).map(g=>OLD_GRADE_LABELS[g]||g).filter(id=>GRADES.some(x=>x.id===id));
    ITEMS.forEach(i=>{if(ANSWERS.includes(o.ans[i.id]))c.ans[i.id]=o.ans[i.id]});
    const fo=[];FORCES.forEach(f=>f.opts.forEach(x=>fo.push(x.id)));
    c.forces=(Array.isArray(o.forces)?o.forces:[]).filter(id=>fo.includes(id));
    NUMS.concat(COUNTS).forEach(k=>{const x=parseFloat(o[k]);c[k]=isFinite(x)&&x>=0?String(x):""});
    Object.keys(RATES).forEach(k=>{const x=parseFloat(c[k]);if(isFinite(x))c[k]=String(Math.min(Math.max(x,RATES[k]),100))});
    return c;
  }

  const FILE_TOOL="schoolstack-enrollment-path";

  const stageOf=id=>STAGES.find(st=>st.id===id);
  const shown=(s,i)=>(!i.only||s.type===i.only)&&(!i.grades||!(s.grades||[]).length||i.grades.some(g=>s.grades.includes(g)));
  const visible=s=>ITEMS.filter(i=>shown(s,i));
  const scored=s=>visible(s).filter(i=>s.ans[i.id]!=="na");
  const optShown=(s,o)=>o.items.some(id=>{const it=ITEMS.find(i=>i.id===id);return it&&shown(s,it)});
  const marked=s=>{const m=[];FORCES.forEach(f=>f.opts.forEach(o=>{if(s.forces.includes(o.id)&&optShown(s,o))m.push({f,o})}));return m};

  function boost(s,id){return marked(s).filter(x=>x.o.items.includes(id)).length}
  function ranked(s){
    return scored(s).filter(i=>s.ans[i.id]==="no"||s.ans[i.id]==="partly").map(i=>{
      const gap=s.ans[i.id]==="no"?2:1;
      return {...i,gap,score:gap*(i.w+boost(s,i.id))+(gap===2?0.5:0)};
    }).sort((a,b)=>b.score-a.score||b.w-a.w);
  }
  const PLAN_SIZE=9;
  function planned(s){
    const r=ranked(s),pick=new Set();
    marked(s).forEach(x=>{const id=x.o.items.find(id=>r.some(i=>i.id===id));if(id&&pick.size<PLAN_SIZE)pick.add(id)});
    r.forEach(i=>{if(pick.size<PLAN_SIZE)pick.add(i.id)});
    return {plan:r.filter(i=>pick.has(i.id)),rest:r.filter(i=>!pick.has(i.id))};
  }
  function pct(s,list){if(!list.length)return 0;return Math.round(list.reduce((t,i)=>t+(VAL[s.ans[i.id]]||0),0)/(list.length*2)*100)}
  function progress(s){const all=visible(s).length,done=visible(s).filter(i=>s.ans[i.id]).length,need=Math.ceil(all*0.8);return {all,done,need,ready:all>0&&done>=need}}

  function n(v,d){const x=parseFloat(v);return isFinite(x)&&x>=0?x:d}
  const snap=x=>+x.toFixed(9);
  function rateOf(v,lo){const x=parseFloat(v);return isFinite(x)&&x>=0?Math.min(Math.max(x,lo),100)/100:null}
  function seatMath(s){
    const cur=n(s.current,0),re=rateOf(s.reRate,0),drv=n(s.driver,0),goal=n(s.goal,0);
    const ri=rateOf(s.rInq,1),ra=rateOf(s.rApp,1),ry=rateOf(s.rYield,1);
    const back=re===null?null:Math.round(snap(cur*re));
    const funnelReady=ri!==null&&ra!==null&&ry!==null;
    const target=goal||drv;
    const fill=t=>Math.max(0,Math.ceil(t-back));
    const funnel=(seats,yy,rr)=>{const offers=Math.ceil(snap(seats/(yy??ry))),apps=Math.ceil(snap(offers/ra)),inq=Math.ceil(snap(apps/ri));return {seats,offers,apps,inq}};
    return {cur,re,drv,goal,back,target,fill,funnel,ri,ra,ry,funnelReady};
  }
  function levers(m){
    if(!m.funnelReady||m.re===null)return {reenroll:null,yield:null};
    const seats=m.fill(m.target),f=m.funnel(seats),out={reenroll:null,yield:null};
    if(m.cur&&m.re<0.96){const back2=Math.round(snap(m.cur*Math.min(snap(m.re+0.05),1))),seats2=Math.max(0,Math.ceil(m.target-back2)),f2=m.funnel(seats2);out.reenroll=f.inq-f2.inq}
    if(m.ry<0.9){const f3=m.funnel(seats,Math.min(snap(m.ry+0.1),0.99));out.yield=f.inq-f3.inq}
    return out;
  }
  function numberText(v){const [whole,...frac]=String(v).replace(/[^0-9.]/g,"").split(".");return frac.length?whole+"."+frac.join(""):whole}
  function clampRate(id,v){const x=parseFloat(v);if(!isFinite(x))return null;return Math.min(Math.max(x,RATES[id]),100)}
  function ratesFromCount(s,changed){
    const out=[];
    FROM_COUNTS.filter(([,top,bottom])=>top===changed||bottom===changed).forEach(([rate,top,bottom])=>{
      const a=parseFloat(s[top]),b=parseFloat(s[bottom]);
      if(!isFinite(a)||!isFinite(b)||a<0||b<=0)return;
      out.push([rate,Math.min(Math.max(Math.round(snap(a/b*100)),RATES[rate]),100)]);
    });
    return out;
  }

  function span(a,b){const set=new Set();for(let i=a;i<=b;i++)set.add(i);return set}
  function lanes(s){
    const roll=s.offer==="rolling",o=roll?null:parseInt(s.offer,10),g=s.grades||[];
    const L=[];
    L.push({n:"Always open",s:"A phone that gets answered, live application, current site",c:"--muted",m:span(0,11),faint:true});
    L.push({n:"Re-engage past families",s:"Applied, accepted or left",c:"--st-re",m:span(0,1)});
    L.push({n:"Fall campaign",s:"Tours, open houses, referrals",c:"--st-aw",m:roll?span(1,6):span(1,Math.max(1,o-1))});
    L.push({n:"Re-enrollment",s:"At-risk talks, then forms by a set date",c:"--st-re",m:span(3,6)});
    if(s.type==="tuition") L.push({n:"Cost and aid help",s:s.state?`Check ${s.state}'s ESA and scholarship dates`:"Check your state's ESA and scholarship dates",c:"--st-co",m:roll?span(2,10):span(2,Math.min(11,Math.max(2,o+1)))});
    if(!g.length||g.includes("6-8")||g.includes("9-12")) L.push({n:"Families before a transition",s:"Light touches a year early",c:"--st-co",m:span(2,6)});
    if(!g.length||g.includes("prek")||g.includes("k-2")) L.push({n:"PreK and K families",s:"Their own session and parent match",c:"--st-co",m:span(3,7)});
    L.push({n:"Offers and yield",s:"Welcome call, visits, commute sheet",c:"--st-yi",m:roll?span(0,11):span(o,11)});
    L.push({n:"Summer: fast replies",s:"Families who decide in weeks",c:"--st-ap",m:span(9,11).add(0)});
    return L;
  }

  function planText(s){
    const {plan:r,rest}=planned(s),sc=scored(s),L=[];
    L.push(`${s.name||"Our school"}${s.state?" ("+s.state+")":""}: 90-day enrollment plan`);
    const pr=progress(s);
    L.push(pr.ready?`Audit score: ${pct(s,sc)} out of 100 (`+STAGES.map(st=>`${st.name} ${pct(s,sc.filter(i=>i.st===st.id))}`).join(", ")+")":`Audit in progress: ${pr.done} of ${pr.all} practices answered`);
    const fs=marked(s).map(x=>`${x.f.name}: ${x.o.t}`);
    if(fs.length)L.push("What moves our families: "+fs.join("; "));
    L.push("");
    ["Days 1 to 30","Days 31 to 60","Days 61 to 90"].forEach((ph,k)=>{
      const steps=r.slice(k*3,k*3+3);if(!steps.length)return;
      L.push(ph.toUpperCase());
      steps.forEach(i=>{L.push(`- [${stageOf(i.st).name}] ${i.act}`);L.push(`  Why: ${i.why}`)});
      L.push("");
    });
    if(rest.length){L.push("ALSO OPEN");rest.forEach(i=>L.push(`- [${stageOf(i.st).name}] ${i.s}`));L.push("")}
    const m=seatMath(s);
    if(m.target&&m.re!==null){const seats=m.fill(m.target),to=m.goal?"our goal of "+m.goal:"our budget driver of "+m.drv;
      if(m.funnelReady){const f=m.funnel(seats);L.push(`SEAT MATH: about ${m.back} students return. To reach ${to}, we need ${seats} new students: about ${f.offers} offers, ${f.apps} applications and ${f.inq} inquiries.`)}
      else L.push(`SEAT MATH: about ${m.back} students return. To reach ${to}, we need ${seats} new students.`);
      if(m.goal&&m.drv)L.push(`Budget driver: ${m.drv} students (${m.fill(m.drv)} new).`);}
    L.push("");L.push("Built with SchoolStack Enrollment Audit.");
    return L.join("\n");
  }

  function fileBody(s,now){return JSON.stringify({tool:FILE_TOOL,version:2,saved:now.toISOString(),audit:s},null,2)}
  function fileName(s,now){
    const slug=(s.name||"audit").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"audit";
    return `enrollment-audit-${slug}-${now.toISOString().slice(0,10)}.json`;
  }
  function readFile(text){
    try{const o=JSON.parse(text);return o&&o.tool===FILE_TOOL?clean(o.audit):null}catch(err){return null}
  }

  return {STAGES,ITEMS,FORCES,GRADES,MONTHS,MONTHS_LONG,VAL,KEY,NUMS,COUNTS,FROM_COUNTS,RATES,STATES,EXAMPLE,BLANK,
    OLD_GRADE_LABELS,ANSWERS,FILE_TOOL,PLAN_SIZE,clean,gradeLabel,stageOf,shown,visible,scored,optShown,marked,
    boost,ranked,planned,pct,progress,rateOf,seatMath,levers,clampRate,numberText,ratesFromCount,lanes,planText,
    fileBody,fileName,readFile};
});
