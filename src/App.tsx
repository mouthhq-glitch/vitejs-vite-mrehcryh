// @ts-nocheck
import { useState, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════════
// ★ 填入您的 Supabase 資訊（見員工頁面的設定說明）
// ══════════════════════════════════════════════════════════════════════
const SUPABASE_URL = "https://wroquipkxlipwmuuagsi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb3F1aXBreGxpcHdtdXVhZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTYyNTQsImV4cCI6MjA5Mjc5MjI1NH0.W7ZZdjEm1U7tCOARmQmlF_INqz_94CxTJfT1UAHI3Pk";

// ══════════════════════════════════════════════════════════════════════
// 建表 SQL（在 Supabase > SQL Editor 執行一次）
// ══════════════════════════════════════════════════════════════════════
// create table employees (
//   id bigint primary key generated always as identity,
//   name text not null, dept text, position text,
//   hourly_rate int default 185, monthly_rate int default 28590,
//   salary_type text default 'monthly', created_at timestamptz default now()
// );
// create table clock_records (
//   id bigint primary key generated always as identity,
//   employee_id bigint references employees(id),
//   work_date date not null, check_in time, check_out time,
//   unique(employee_id, work_date)
// );
// create table schedules (
//   id bigint primary key generated always as identity,
//   employee_id bigint references employees(id),
//   work_date date not null, shift_id text,
//   unique(employee_id, work_date)
// );
// alter table employees enable row level security;
// alter table clock_records enable row level security;
// alter table schedules enable row level security;
// create policy "allow all" on employees for all using (true) with check (true);
// create policy "allow all" on clock_records for all using (true) with check (true);
// create policy "allow all" on schedules for all using (true) with check (true);
// insert into employees (name,dept,position,hourly_rate,monthly_rate,salary_type) values
//   ('王小明','門市','正職',185,28590,'monthly'),('李小花','外場','兼職',185,0,'hourly'),
//   ('陳大偉','廚房','正職',200,32000,'monthly'),('林美麗','行政','工讀',185,0,'hourly');

// ── Supabase API ──────────────────────────────────────────────────────
const isDemo = () => SUPABASE_URL.includes("xxxxxxxxxxxx");

function dbHeaders() {
  return {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

const db = {
  async get(table, query="") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: dbHeaders() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async upsert(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:"POST",
      headers:{...dbHeaders(),"Prefer":"resolution=merge-duplicates,return=representation"},
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:"POST", headers: dbHeaders(), body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(table, query) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method:"DELETE", headers: dbHeaders(),
    });
    if (!r.ok) throw new Error(await r.text());
  },
};

// ── 常數 ─────────────────────────────────────────────────────────────
const TW_HOLIDAYS = [
  "2025-01-01","2025-01-27","2025-01-28","2025-01-29","2025-01-30","2025-01-31",
  "2025-02-28","2025-04-03","2025-04-04","2025-04-05","2025-05-01","2025-05-31",
  "2025-06-06","2025-09-28","2025-10-10",
  "2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20",
  "2026-02-28","2026-04-04","2026-04-05","2026-05-01","2026-06-19","2026-09-28","2026-10-10"
];

const ACCOUNTS = [
  { username:"boss",    password:"boss123",    role:"owner",   label:"👑 老闆" },
  { username:"manager", password:"manager123", role:"manager", label:"👔 店長" },
];

const DEPARTMENTS = ["門市","廚房","外場","行政"];
const POSITIONS   = ["正職","兼職","工讀"];
const SHIFTS = [
  { id:"A",   label:"早班", start:"08:00", end:"16:00", color:"#f0a500" },
  { id:"B",   label:"中班", start:"12:00", end:"20:00", color:"#2196f3" },
  { id:"C",   label:"晚班", start:"16:00", end:"00:00", color:"#9c27b0" },
  { id:"D",   label:"全天", start:"08:00", end:"20:00", color:"#4caf50" },
  { id:"OFF", label:"休假", start:"",      end:"",      color:"#666"    },
];

const DEMO_EMPLOYEES = [
  { id:1, name:"王小明", dept:"門市", position:"正職", hourly_rate:185, monthly_rate:28590, salary_type:"monthly" },
  { id:2, name:"李小花", dept:"外場", position:"兼職", hourly_rate:185, monthly_rate:0,     salary_type:"hourly"  },
  { id:3, name:"陳大偉", dept:"廚房", position:"正職", hourly_rate:200, monthly_rate:32000, salary_type:"monthly" },
  { id:4, name:"林美麗", dept:"行政", position:"工讀", hourly_rate:185, monthly_rate:0,     salary_type:"hourly"  },
];

const isHol   = d => TW_HOLIDAYS.includes(d);
const isWkend = d => { const w=new Date(d).getDay(); return w===0||w===6; };
const fmtDate = d => d.toISOString().split("T")[0];
const getDays = (y,m) => new Date(y,m+1,0).getDate();

function calcWage(emp, records) {
  let reg=0,ot1=0,ot2=0,hol=0;
  records.forEach(r=>{
    if (!r.check_in||!r.check_out) return;
    let h=(new Date(`${r.work_date}T${r.check_out}`)-new Date(`${r.work_date}T${r.check_in}`))/3600000;
    if(h<0)h+=24; h=Math.max(0,h-0.5);
    if(isHol(r.work_date)||isWkend(r.work_date)) hol+=h;
    else if(h<=8) reg+=h;
    else if(h<=10){reg+=8;ot1+=h-8;}
    else{reg+=8;ot1+=2;ot2+=h-10;}
  });
  const rate=emp.hourly_rate;
  const base=emp.salary_type==="monthly"?emp.monthly_rate:reg*rate;
  const ot=ot1*rate*1.34+ot2*rate*1.67;
  const hp=hol*rate*2;
  return{reg,ot1,ot2,hol,base,ot,hp,total:base+ot+hp};
}

// ══════════════════════════════════════════════════════════════════════
// 登入畫面
// ══════════════════════════════════════════════════════════════════════
function Login({onLogin}){
  const [u,su]=useState(""); const [p,sp]=useState("");
  const [err,se]=useState(""); const [busy,sb]=useState(false);
  function go(){
    se("");sb(true);
    setTimeout(()=>{
      const a=ACCOUNTS.find(x=>x.username===u&&x.password===p);
      if(a)onLogin(a); else{se("帳號或密碼錯誤");sb(false);}
    },500);
  }
  const inp={width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:10,padding:"10px 14px",color:"#e8e0d0",fontSize:14,boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
  return(
    <div style={{minHeight:"100vh",background:"#0b1520",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet"/>
      <div style={{width:340,background:"#131f2e",borderRadius:20,padding:36,border:"1px solid #2a3a4a",boxShadow:"0 20px 60px #00000066"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#f0a500,#e05b00)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:10}}>🏢</div>
          <div style={{fontWeight:700,fontSize:20,color:"#e8e0d0"}}>台灣勞基法人資系統</div>
          <div style={{fontSize:11,color:"#6a7a8a",marginTop:4,letterSpacing:2}}>TAIWAN HR MANAGEMENT</div>
        </div>
        <div style={{background:"#1a2a3a",borderRadius:10,padding:12,marginBottom:18,fontSize:11,color:"#8a9ab0",lineHeight:2}}>
          <div style={{color:"#f0a500",fontWeight:600,marginBottom:2}}>測試帳號</div>
          <div>👑 老闆：boss / boss123</div>
          <div>👔 店長：manager / manager123</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>帳號</div>
          <input value={u} onChange={e=>su(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>密碼</div>
          <input type="password" value={p} onChange={e=>sp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/>
        </div>
        {err&&<div style={{color:"#e05b00",fontSize:12,marginBottom:12,textAlign:"center"}}>⚠ {err}</div>}
        <button onClick={go} disabled={busy}
          style={{width:"100%",padding:13,background:"linear-gradient(135deg,#f0a500,#e05b00)",border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",opacity:busy?0.7:1}}>
          {busy?"登入中...":"登入"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// 主系統
// ══════════════════════════════════════════════════════════════════════
export default function App(){
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState("clock");
  const [employees,setEmployees]=useState([]);
  const [clockMap,setClockMap]=useState({});
  const [schedMap,setSchedMap]=useState({});
  const [newEmp,setNewEmp]=useState({name:"",dept:"門市",position:"正職",hourly_rate:185,monthly_rate:28590,salary_type:"monthly"});
  const [showAdd,setShowAdd]=useState(false);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(false);
  const now=new Date();
  const [vy,setVy]=useState(now.getFullYear());
  const [vm,setVm]=useState(now.getMonth());

  const isOwner=user?.role==="owner";
  const demo=isDemo();
  const today=fmtDate(new Date());
  const monthDays=Array.from({length:getDays(vy,vm)},(_,i)=>`${vy}-${String(vm+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  const monthPrefix=`${vy}-${String(vm+1).padStart(2,"0")}`;

  function toast_(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3000);}

  async function loadData(){
    if(demo){setEmployees(DEMO_EMPLOYEES);return;}
    setLoading(true);
    try{
      const[emps,clocks,scheds]=await Promise.all([
        db.get("employees","?order=id"),
        db.get("clock_records",`?work_date=gte.${monthPrefix}-01&work_date=lte.${monthPrefix}-${String(getDays(vy,vm)).padStart(2,"0")}`),
        db.get("schedules",`?work_date=gte.${monthPrefix}-01&work_date=lte.${monthPrefix}-${String(getDays(vy,vm)).padStart(2,"0")}`),
      ]);
      setEmployees(emps);
      const cm={};clocks.forEach(r=>cm[`${r.employee_id}_${r.work_date}`]=r);setClockMap(cm);
      const sm={};scheds.forEach(r=>sm[`${r.employee_id}_${r.work_date}`]=r.shift_id);setSchedMap(sm);
    }catch(e){toast_("資料庫連線失敗："+e.message,"error");}
    setLoading(false);
  }

  useEffect(()=>{if(user)loadData();},[user,vy,vm]);

  async function handleClock(empId,action){
    const t=new Date().toTimeString().slice(0,5);
    const key=`${empId}_${today}`;
    if(demo){
      setClockMap(prev=>{
        const r=prev[key]||{employee_id:empId,work_date:today};
        return{...prev,[key]:action==="in"?{...r,check_in:t}:{...r,check_out:t}};
      });
      toast_(action==="in"?"✅ 上班打卡成功":"👋 下班打卡成功");return;
    }
    try{
      const r=clockMap[key]||{};
      await db.upsert("clock_records",{employee_id:empId,work_date:today,
        check_in:action==="in"?t:r.check_in, check_out:action==="out"?t:r.check_out});
      await loadData();
      toast_(action==="in"?"✅ 上班打卡成功":"👋 下班打卡成功");
    }catch(e){toast_("打卡失敗","error");}
  }

  async function handleShift(empId,date,shiftId){
    setSchedMap(prev=>({...prev,[`${empId}_${date}`]:shiftId}));
    if(demo)return;
    try{await db.upsert("schedules",{employee_id:empId,work_date:date,shift_id:shiftId});}
    catch(e){toast_("排班儲存失敗","error");}
  }

  async function addEmp(){
    if(!newEmp.name.trim())return toast_("請輸入員工姓名","error");
    if(demo){
      setEmployees(p=>[...p,{...newEmp,id:Date.now(),hourly_rate:+newEmp.hourly_rate,monthly_rate:+newEmp.monthly_rate}]);
      setShowAdd(false);toast_("✅ 新增成功（Demo）");return;
    }
    try{
      await db.insert("employees",{name:newEmp.name,dept:newEmp.dept,position:newEmp.position,
        hourly_rate:+newEmp.hourly_rate,monthly_rate:+newEmp.monthly_rate,salary_type:newEmp.salary_type});
      await loadData();setShowAdd(false);toast_("✅ 員工新增成功");
    }catch(e){toast_("新增失敗："+e.message,"error");}
  }

  async function delEmp(id){
    if(demo){setEmployees(p=>p.filter(e=>e.id!==id));return;}
    try{await db.del("employees",`?id=eq.${id}`);await loadData();}
    catch(e){toast_("刪除失敗","error");}
  }

  function monthRecs(empId){
    return monthDays.map(d=>clockMap[`${empId}_${d}`]).filter(r=>r&&r.check_in);
  }

  const S={
    card:{background:"#1a2a3a",borderRadius:12,padding:"14px 16px",marginBottom:10,border:"1px solid #2a3a4a"},
    inp:{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:13,boxSizing:"border-box",fontFamily:"inherit"},
    sel:{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:13,fontFamily:"inherit"},
    nav:{background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:16},
  };

  const TABS=[
    {id:"clock",    label:"⏰ 打卡",  ownerOnly:false},
    {id:"schedule", label:"📅 排班",  ownerOnly:false},
    {id:"salary",   label:"💰 薪資",  ownerOnly:true },
    {id:"employees",label:"👥 員工",  ownerOnly:true },
  ].filter(t=>!t.ownerOnly||isOwner);

  if(!user) return <Login onLogin={a=>{setUser(a);setTab("clock");}}/>;

  return(
    <div style={{minHeight:"100vh",background:"#0f1923",color:"#e8e0d0",fontFamily:"'Noto Sans TC',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1a2a3a,#0f1923)",borderBottom:"1px solid #2a3a4a",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#f0a500,#e05b00)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏢</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:16}}>台灣勞基法人資系統</div>
          <div style={{fontSize:11,color:"#8a9ab0"}}>{today} {demo&&"（Demo 模式）"}</div>
        </div>
        <div style={{background:isOwner?"#3a2a0a":"#1a2a3a",border:`1px solid ${isOwner?"#f0a500":"#4a6a8a"}`,
          borderRadius:20,padding:"4px 12px",fontSize:12,color:isOwner?"#f0a500":"#8ab0d0",fontWeight:600}}>
          {user.label}
        </div>
        <button onClick={()=>setUser(null)}
          style={{background:"#2a1a1a",border:"1px solid #4a2a2a",color:"#e05b00",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
          登出
        </button>
      </div>

      {demo&&<div style={{background:"#2a1a0a",borderBottom:"1px solid #5a3a0a",padding:"8px 16px",fontSize:12,color:"#f0a500"}}>
        ⚠ Demo 模式：資料不會儲存。請至「👥 員工」頁面查看 Supabase 設定說明，啟用跨裝置同步。
      </div>}
      {!isOwner&&<div style={{background:"#1a2a0a",borderBottom:"1px solid #3a4a2a",padding:"8px 16px",fontSize:12,color:"#8ab060"}}>
        🔒 店長模式：可操作打卡與排班，薪資資訊僅老闆可查看
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",background:"#151f2b",borderBottom:"1px solid #2a3a4a"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:"12px 4px",border:"none",background:"none",
              color:tab===t.id?"#f0a500":"#8a9ab0",
              borderBottom:tab===t.id?"2px solid #f0a500":"2px solid transparent",
              fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            {t.label}
          </button>
        ))}
      </div>

      {loading&&<div style={{textAlign:"center",padding:16,color:"#8a9ab0",fontSize:13}}>⏳ 載入中...</div>}

      <div style={{padding:16,maxWidth:900,margin:"0 auto"}}>

        {/* ── 打卡 ── */}
        {tab==="clock"&&(
          <div>
            <div style={{fontSize:13,color:"#8a9ab0",marginBottom:14}}>
              今日：{today}　{isHol(today)?"🎌 國定假日":isWkend(today)?"🔵 假日":"⚫ 工作日"}
            </div>
            {employees.map(emp=>{
              const rec=clockMap[`${emp.id}_${today}`]||{};
              return(
                <div key={emp.id} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#2a4a6a,#1a2a3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:15}}>{emp.name}</div>
                    <div style={{fontSize:12,color:"#8a9ab0"}}>{emp.dept}｜{emp.position}</div>
                    <div style={{fontSize:12,marginTop:4,display:"flex",gap:14}}>
                      <span style={{color:rec.check_in?"#4caf50":"#555"}}>上班：{rec.check_in||"--:--"}</span>
                      <span style={{color:rec.check_out?"#f0a500":"#555"}}>下班：{rec.check_out||"--:--"}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <button onClick={()=>handleClock(emp.id,"in")} disabled={!!rec.check_in}
                      style={{padding:"8px 12px",borderRadius:8,border:"none",fontFamily:"inherit",
                        background:rec.check_in?"#2a3a4a":"#4caf50",color:"white",fontSize:12,fontWeight:600,
                        cursor:rec.check_in?"not-allowed":"pointer"}}>上班打卡</button>
                    <button onClick={()=>handleClock(emp.id,"out")} disabled={!rec.check_in||!!rec.check_out}
                      style={{padding:"8px 12px",borderRadius:8,border:"none",fontFamily:"inherit",
                        background:(!rec.check_in||rec.check_out)?"#2a3a4a":"#f0a500",color:"white",fontSize:12,fontWeight:600,
                        cursor:(!rec.check_in||rec.check_out)?"not-allowed":"pointer"}}>下班打卡</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 排班 ── */}
        {tab==="schedule"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <button onClick={()=>{if(vm===0){setVm(11);setVy(y=>y-1)}else setVm(m=>m-1)}} style={S.nav}>‹</button>
              <span style={{fontWeight:700,fontSize:15}}>{vy}年 {vm+1}月</span>
              <button onClick={()=>{if(vm===11){setVm(0);setVy(y=>y+1)}else setVm(m=>m+1)}} style={S.nav}>›</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
              {SHIFTS.map(s=>(
                <span key={s.id} style={{background:s.color+"33",color:s.color,border:`1px solid ${s.color}66`,borderRadius:6,padding:"2px 10px",fontSize:12}}>
                  {s.label}{s.start?` ${s.start}-${s.end}`:""}
                </span>
              ))}
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr>
                  <th style={{padding:"8px 6px",textAlign:"left",color:"#8a9ab0",borderBottom:"1px solid #2a3a4a",minWidth:70}}>員工</th>
                  {monthDays.map(d=>{
                    const day=parseInt(d.split("-")[2]);
                    const iH=isHol(d)||isWkend(d);
                    return <th key={d} style={{padding:"4px 2px",textAlign:"center",color:iH?"#f0a500":"#8a9ab0",borderBottom:"1px solid #2a3a4a",minWidth:34}}>{day}{iH&&<div style={{fontSize:9}}>假</div>}</th>;
                  })}
                </tr></thead>
                <tbody>
                  {employees.map(emp=>(
                    <tr key={emp.id}>
                      <td style={{padding:"6px",color:"#e8e0d0",borderBottom:"1px solid #1a2a3a",fontSize:12,whiteSpace:"nowrap"}}>{emp.name}</td>
                      {monthDays.map(d=>{
                        const key=`${emp.id}_${d}`;
                        const sid=schedMap[key]||"";
                        const sh=SHIFTS.find(s=>s.id===sid);
                        return(
                          <td key={d} style={{padding:"2px",borderBottom:"1px solid #1a2a3a",textAlign:"center"}}>
                            <select value={sid} onChange={e=>handleShift(emp.id,d,e.target.value)}
                              style={{width:36,background:sh?sh.color+"44":"#2a3a4a",color:sh?sh.color:"#666",
                                border:"1px solid #3a4a5a",borderRadius:4,fontSize:10,padding:"1px",fontFamily:"inherit",cursor:"pointer"}}>
                              <option value="">-</option>
                              {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.id}</option>)}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 薪資 ── */}
        {tab==="salary"&&isOwner&&(
          <div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <button onClick={()=>{if(vm===0){setVm(11);setVy(y=>y-1)}else setVm(m=>m-1)}} style={S.nav}>‹</button>
              <span style={{fontWeight:700,fontSize:15}}>{vy}年 {vm+1}月 薪資計算</span>
              <button onClick={()=>{if(vm===11){setVm(0);setVy(y=>y+1)}else setVm(m=>m+1)}} style={S.nav}>›</button>
            </div>
            <div style={{fontSize:11,color:"#8a9ab0",marginBottom:12}}>勞基法：平日加班前2h ×1.34、第3h起 ×1.67；假日 ×2</div>
            {employees.map(emp=>{
              const recs=monthRecs(emp.id);
              const w=calcWage(emp,recs);
              return(
                <div key={emp.id} style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <span style={{fontWeight:700,fontSize:15}}>{emp.name}</span>
                      <span style={{color:"#8a9ab0",fontSize:12,marginLeft:8}}>{emp.dept}｜{emp.position}</span>
                    </div>
                    <div style={{fontSize:20,fontWeight:700,color:"#f0a500"}}>NT$ {Math.round(w.total).toLocaleString()}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:12}}>
                    {[
                      {l:emp.salary_type==="monthly"?"底薪":"正班薪資",v:`NT$ ${Math.round(w.base).toLocaleString()}`},
                      {l:`正班 ${w.reg.toFixed(1)}h`,v:""},
                      {l:`加班 ${(w.ot1+w.ot2).toFixed(1)}h`,v:`NT$ ${Math.round(w.ot).toLocaleString()}`},
                      {l:`假日 ${w.hol.toFixed(1)}h`,v:`NT$ ${Math.round(w.hp).toLocaleString()}`},
                      {l:"出勤天數",v:`${recs.length} 天`},
                      {l:"時薪",v:`NT$ ${emp.hourly_rate}`},
                    ].map((x,i)=>(
                      <div key={i} style={{background:"#0f1923",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{color:"#8a9ab0",fontSize:11}}>{x.l}</div>
                        {x.v&&<div style={{color:"#e8e0d0",fontWeight:600,marginTop:2}}>{x.v}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 員工 ── */}
        {tab==="employees"&&isOwner&&(
          <div>
            <button onClick={()=>setShowAdd(true)}
              style={{background:"linear-gradient(135deg,#f0a500,#e05b00)",border:"none",color:"white",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16,fontFamily:"inherit"}}>
              ＋ 新增員工
            </button>

            {showAdd&&(
              <div style={{...S.card,border:"1px solid #f0a500",marginBottom:16}}>
                <div style={{fontWeight:700,marginBottom:12}}>新增員工</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[{l:"姓名",k:"name",t:"text"},{l:"時薪(元)",k:"hourly_rate",t:"number"},{l:"月薪(元)",k:"monthly_rate",t:"number"}].map(f=>(
                    <div key={f.k}>
                      <div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>{f.l}</div>
                      <input type={f.t} value={newEmp[f.k]} onChange={e=>setNewEmp(p=>({...p,[f.k]:e.target.value}))} style={S.inp}/>
                    </div>
                  ))}
                  {[{l:"部門",k:"dept",o:DEPARTMENTS},{l:"職位",k:"position",o:POSITIONS}].map(f=>(
                    <div key={f.k}>
                      <div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>{f.l}</div>
                      <select value={newEmp[f.k]} onChange={e=>setNewEmp(p=>({...p,[f.k]:e.target.value}))} style={S.sel}>
                        {f.o.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>薪資類型</div>
                    <select value={newEmp.salary_type} onChange={e=>setNewEmp(p=>({...p,salary_type:e.target.value}))} style={S.sel}>
                      <option value="monthly">月薪制</option><option value="hourly">時薪制</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",gap:10,marginTop:12}}>
                  <button onClick={addEmp} style={{flex:1,background:"#f0a500",border:"none",color:"white",borderRadius:8,padding:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>確認新增</button>
                  <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:10,cursor:"pointer",fontFamily:"inherit"}}>取消</button>
                </div>
              </div>
            )}

            {employees.map(emp=>(
              <div key={emp.id} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#2a4a6a,#1a2a3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15}}>{emp.name}</div>
                  <div style={{fontSize:12,color:"#8a9ab0"}}>{emp.dept}｜{emp.position}｜{emp.salary_type==="monthly"?"月薪":"時薪制"}</div>
                  <div style={{fontSize:12,color:"#f0a500",marginTop:2}}>
                    時薪：NT$ {emp.hourly_rate}{emp.salary_type==="monthly"?`　月薪：NT$ ${emp.monthly_rate?.toLocaleString()}`:""}
                  </div>
                </div>
                <button onClick={()=>delEmp(emp.id)}
                  style={{background:"#2a1a1a",border:"1px solid #4a2a2a",color:"#e05b00",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>刪除</button>
              </div>
            ))}

            {/* ☁️ Supabase 設定說明 */}
            <div style={{marginTop:20,...S.card,border:"1px solid #2a4a6a"}}>
              <div style={{fontWeight:700,color:"#e8e0d0",marginBottom:12,fontSize:15}}>☁️ 啟用雲端同步 — 讓手機可以使用</div>
              <div style={{fontSize:12,color:"#8a9ab0",lineHeight:2.2}}>
                {[
                  ["1","前往 supabase.com 免費註冊（不需信用卡）"],
                  ["2","點「New Project」，地區選 Singapore（離台灣最近）"],
                  ["3","進入專案後，點左側 SQL Editor，貼上程式碼頂部的建表 SQL 並執行"],
                  ["4","點左側 Project Settings → API"],
                  ["5","複製 Project URL 和 anon public key"],
                  ["6","將這兩個值填入程式碼頂部 SUPABASE_URL 和 SUPABASE_KEY"],
                  ["7","重新載入此頁面，橘色 Demo 橫幅消失即代表連線成功"],
                ].map(([n,t])=>(
                  <div key={n} style={{display:"flex",gap:10,marginBottom:4}}>
                    <span style={{background:"#f0a500",color:"#000",borderRadius:"50%",width:20,height:20,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700}}>{n}</span>
                    <span style={{color:"#c0d0e0"}}>{t}</span>
                  </div>
                ))}
                <div style={{marginTop:12,background:"#1a3a2a",borderRadius:8,padding:"10px 12px",color:"#4caf50",fontSize:12}}>
                  ✅ 設定完成後，老闆和店長只要開瀏覽器輸入相同網址，打卡和排班資料就會即時同步到所有裝置！
                </div>
                <div style={{marginTop:8,background:"#1a2a3a",borderRadius:8,padding:"10px 12px",color:"#8a9ab0",fontSize:11}}>
                  💡 如需分享連結給店長，可將此頁面部署到 Vercel（免費）：vercel.com → Import Project
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
          background:toast.type==="error"?"#4a1a1a":"#1a3a2a",color:toast.type==="error"?"#e05b00":"#4caf50",
          border:`1px solid ${toast.type==="error"?"#e05b00":"#4caf50"}`,borderRadius:10,
          padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:9999,whiteSpace:"nowrap"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
