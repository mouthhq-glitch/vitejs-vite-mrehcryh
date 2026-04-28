// @ts-nocheck
import { useState, useEffect } from "react";

const SUPABASE_URL = "https://wroquipkxlipwmuuagsi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyb3F1aXBreGxpcHdtdXVhZ3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTYyNTQsImV4cCI6MjA5Mjc5MjI1NH0.W7ZZdjEm1U7tCOARmQmlF_INqz_94CxTJfT1UAHI3Pk";

const isDemo=()=>SUPABASE_URL.includes("xxxxxxxxxxxx");
function dbH(){return{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"};}
const db={
  async get(t,q=""){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}${q}`,{headers:dbH()});if(!r.ok)throw new Error(await r.text());return r.json();},
  async upsert(t,b){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:{...dbH(),"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();},
  async insert(t,b){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:dbH(),body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text());return r.json();},
  async del(t,q){const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}${q}`,{method:"DELETE",headers:dbH()});if(!r.ok)throw new Error(await r.text());},
};

const TW_HOLIDAYS=["2025-01-01","2025-01-27","2025-01-28","2025-01-29","2025-01-30","2025-01-31","2025-02-28","2025-04-03","2025-04-04","2025-04-05","2025-05-01","2025-05-31","2025-06-06","2025-09-28","2025-10-10","2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-02-19","2026-02-20","2026-02-28","2026-04-04","2026-04-05","2026-05-01","2026-06-19","2026-09-28","2026-10-10"];
const ACCOUNTS=[{username:"boss",password:"25721828",role:"owner",label:"👑 老闆"},{username:"mouth",password:"88888888",role:"manager",label:"👔 店長"}];
const DEPARTMENTS=["門市","廚房","外場","行政"];
const POSITIONS=["正職","兼職","工讀"];
const STATIONS=["製作1","製作2","煎台","麵線","烤土司","櫃檯","飲料","包裝","外場","備料","休假"];

const DEMO_EMP=[
  {id:1,name:"王小明",dept:"門市",position:"正職",hourly_rate:185,monthly_rate:28590,salary_type:"monthly"},
  {id:2,name:"李小花",dept:"外場",position:"兼職",hourly_rate:185,monthly_rate:0,salary_type:"hourly"},
  {id:3,name:"陳大偉",dept:"廚房",position:"正職",hourly_rate:200,monthly_rate:32000,salary_type:"monthly"},
  {id:4,name:"林美麗",dept:"行政",position:"工讀",hourly_rate:185,monthly_rate:0,salary_type:"hourly"},
];
const isHol=d=>TW_HOLIDAYS.includes(d);
const isWk=d=>{const w=new Date(d).getDay();return w===0||w===6;};
const fmt=d=>d.toISOString().split("T")[0];
const getDays=(y,m)=>new Date(y,m+1,0).getDate();

const MONTHLY_REST_DAYS = 8; // 月休天數

function calcWage(emp, recs, schedRecs){
  let reg=0,ot1=0,ot2=0;
  let holHours=0; // 國定假日出勤小時
  let wkHours=0;  // 週休出勤小時
  recs.forEach(r=>{
    if(!r.check_in||!r.check_out)return;
    let h=(new Date(`${r.work_date}T${r.check_out}`)-new Date(`${r.work_date}T${r.check_in}`))/3600000;
    if(h<0)h+=24;h=Math.max(0,h-0.5);
    if(isHol(r.work_date)){
      holHours+=h; // 國定假日
    } else {
      if(emp.salary_type==="monthly"){
        // 月薪制正職：有加班費計算
        if(h<=8)reg+=h;
        else if(h<=10){reg+=8;ot1+=h-8;}
        else{reg+=8;ot1+=2;ot2+=h-10;}
      } else {
        // 時薪制（兼職/工讀）：全部算正常工資
        reg+=h;
      }
    }
  });

  const rate=emp.hourly_rate;
  const base=emp.salary_type==="monthly"?emp.monthly_rate:reg*rate;
  const ot=ot1*rate*1.34+ot2*rate*1.67;

  // 國定假日加班費（勞基法）
  // 正職月薪制：原本就有薪，出勤再加1倍
  // 兼職/工讀時薪制：國定假日不加倍，正常計算（已含在reg）
  const holPay = emp.salary_type==="monthly"
    ? holHours*rate*1      // 月薪制正職：加給1倍
    : 0;                   // 時薪制（兼職/工讀）：不加倍

  const wkPay = 0; // 週末正常工資（已含在reg計算）

  // 月休不足加班費（只適用正職月薪制）
  const actualRestDays=schedRecs?schedRecs.filter(s=>s&&s.station==="休假").length:0;
  const missingRestDays=emp.salary_type==="monthly"?Math.max(0,MONTHLY_REST_DAYS-actualRestDays):0;
  const restOTPay=missingRestDays*8*rate*1.34;

  const total=base+ot+holPay+wkPay+restOTPay;
  return{reg,ot1,ot2,holHours,wkHours,base,ot,holPay,wkPay,actualRestDays,missingRestDays,restOTPay,total};
}

function ShiftPopup({emp,date,current,onSave,onClose}){
  const[station,setStation]=useState(current?.station||"");
  const[startTime,setStartTime]=useState(current?.start_time||"08:00");
  const[endTime,setEndTime]=useState(current?.end_time||"16:00");
  const isOff=station==="休假";
  return(
    <div style={{position:"fixed",inset:0,background:"#00000099",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#1a2a3a",borderRadius:16,padding:24,width:320,border:"1px solid #2a3a4a",boxShadow:"0 20px 60px #000"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{emp.name}</div>
        <div style={{fontSize:12,color:"#8a9ab0",marginBottom:16}}>{date}</div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"#8a9ab0",marginBottom:8}}>崗位</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {STATIONS.map(s=>(
              <button key={s} onClick={()=>setStation(s)}
                style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${station===s?(s==="休假"?"#e05b00":"#4caf50"):"#3a4a5a"}`,
                  background:station===s?(s==="休假"?"#e05b0033":"#4caf5033"):"#0f1923",
                  color:station===s?(s==="休假"?"#e05b00":"#4caf50"):"#8a9ab0",
                  fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                {s}
              </button>))}
          </div>
        </div>
        {!isOff&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div>
            <div style={{fontSize:11,color:"#8a9ab0",marginBottom:6}}>上班時間</div>
            <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)}
              style={{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
          <div>
            <div style={{fontSize:11,color:"#8a9ab0",marginBottom:6}}>下班時間</div>
            <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}
              style={{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
          </div>
        </div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onSave(station,isOff?"":startTime,isOff?"":endTime)}
            style={{flex:1,background:"#f0a500",border:"none",color:"white",borderRadius:8,padding:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>確認</button>
          <button onClick={onClose}
            style={{flex:1,background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:11,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>取消</button>
        </div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const[u,su]=useState("");const[p,sp]=useState("");const[err,se]=useState("");const[busy,sb]=useState(false);
  function go(){se("");sb(true);setTimeout(()=>{const a=ACCOUNTS.find(x=>x.username===u&&x.password===p);if(a)onLogin(a);else{se("帳號或密碼錯誤");sb(false);}},500);}
  const inp={width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:10,padding:"10px 14px",color:"#e8e0d0",fontSize:14,boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
  return(
    <div style={{minHeight:"100vh",background:"#0b1520",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{width:340,background:"#131f2e",borderRadius:20,padding:36,border:"1px solid #2a3a4a",boxShadow:"0 20px 60px #00000066"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#f0a500,#e05b00)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:10}}>🏢</div>
          <div style={{fontWeight:700,fontSize:20,color:"#e8e0d0"}}>卯食豐原</div>
        </div>

        <div style={{marginBottom:14}}><div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>帳號</div><input value={u} onChange={e=>su(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/></div>
        <div style={{marginBottom:18}}><div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>密碼</div><input type="password" value={p} onChange={e=>sp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/></div>
        {err&&<div style={{color:"#e05b00",fontSize:12,marginBottom:12,textAlign:"center"}}>⚠ {err}</div>}
        <button onClick={go} disabled={busy} style={{width:"100%",padding:13,background:"linear-gradient(135deg,#f0a500,#e05b00)",border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",opacity:busy?0.7:1}}>{busy?"登入中...":"登入"}</button>
      </div>
    </div>
  );
}

export default function App(){
  const[user,setUser]=useState(null);const[tab,setTab]=useState("clock");
  const[employees,setEmployees]=useState([]);const[clockMap,setClockMap]=useState({});const[schedMap,setSchedMap]=useState({});
  const[newEmp,setNewEmp]=useState({name:"",dept:"門市",position:"正職",phone:"",id_number:"",birthday:"",join_date:"",note:"",hourly_rate:185,monthly_rate:28590,salary_type:"monthly"});
  const[showAdd,setShowAdd]=useState(false);const[editEmp,setEditEmp]=useState(null);const[toast,setToast]=useState(null);const[loading,setLoading]=useState(false);
  const[popup,setPopup]=useState(null);
  const now=new Date();const[vy,setVy]=useState(now.getFullYear());const[vm,setVm]=useState(now.getMonth());
  const isOwner=user?.role==="owner";const demo=isDemo();const today=fmt(new Date());
  const monthDays=Array.from({length:getDays(vy,vm)},(_,i)=>`${vy}-${String(vm+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`);
  const mp=`${vy}-${String(vm+1).padStart(2,"0")}`;
  function toast_(msg,type="success"){setToast({msg,type});setTimeout(()=>setToast(null),3000);}

  async function loadData(){
    if(demo){setEmployees(DEMO_EMP);return;}
    setLoading(true);
    try{
      const lastDay=String(getDays(vy,vm)).padStart(2,"0");
      const[emps,clocks,scheds]=await Promise.all([
        db.get("employees","?order=id"),
        db.get("clock_records",`?work_date=gte.${mp}-01&work_date=lte.${mp}-${lastDay}`),
        db.get("schedules",`?work_date=gte.${mp}-01&work_date=lte.${mp}-${lastDay}`),
      ]);
      setEmployees(emps);
      const cm={};clocks.forEach(r=>cm[`${r.employee_id}_${r.work_date}`]={id:r.id,check_in:r.check_in,check_out:r.check_out,employee_id:r.employee_id,work_date:r.work_date});setClockMap(cm);
      const sm={};scheds.forEach(r=>sm[`${r.employee_id}_${r.work_date}`]={station:r.station||"",start_time:r.start_time||"",end_time:r.end_time||""});setSchedMap(sm);
    }catch(e){toast_("連線失敗："+e.message,"error");}
    setLoading(false);
  }

  useEffect(()=>{if(user)loadData();},[user,vy,vm]);

  async function handleClock(empId,action){
    const t=new Date().toTimeString().slice(0,5);const key=`${empId}_${today}`;
    if(demo){setClockMap(prev=>{const r=prev[key]||{employee_id:empId,work_date:today};return{...prev,[key]:action==="in"?{...r,check_in:t}:{...r,check_out:t}};});toast_(action==="in"?"✅ 上班打卡成功":"👋 下班打卡成功");return;}
    try{
      const r=clockMap[key]||{};
      if(action==="in"){
        await db.insert("clock_records",{employee_id:empId,work_date:today,check_in:t,check_out:null});
      } else {
        if(r.id){
          await fetch(`${SUPABASE_URL}/rest/v1/clock_records?id=eq.${r.id}`,{method:"PATCH",headers:dbH(),body:JSON.stringify({check_out:t})});
        } else {
          await db.upsert("clock_records",{employee_id:empId,work_date:today,check_in:r.check_in||t,check_out:t});
        }
      }
      await loadData();toast_(action==="in"?"✅ 上班打卡成功":"👋 下班打卡成功");
    }
    catch(e){toast_("打卡失敗","error");}
  }

  async function handleShiftSave(emp,date,station,startTime,endTime){
    const key=`${emp.id}_${date}`;
    setSchedMap(prev=>({...prev,[key]:{station,start_time:startTime,end_time:endTime}}));
    setPopup(null);
    if(demo)return;
    try{
      await db.upsert("schedules",{
        employee_id:emp.id,work_date:date,
        shift_id:station==="休假"?"OFF":null,
        station:station||null,
        start_time:startTime||null,
        end_time:endTime||null
      });
    }catch(e){toast_("排班儲存失敗："+e.message,"error");}
  }

  async function addEmp(){
    if(!newEmp.name.trim())return toast_("請輸入員工姓名","error");
    if(demo){setEmployees(p=>[...p,{...newEmp,id:Date.now(),hourly_rate:+newEmp.hourly_rate,monthly_rate:+newEmp.monthly_rate}]);setShowAdd(false);toast_("✅ 新增成功（Demo）");return;}
    try{
      await db.insert("employees",{name:newEmp.name,dept:newEmp.dept,position:newEmp.position,
        hourly_rate:isOwner?+newEmp.hourly_rate:185,monthly_rate:isOwner?+newEmp.monthly_rate:28590,salary_type:isOwner?newEmp.salary_type:"hourly"});
      await loadData();setShowAdd(false);toast_("✅ 員工新增成功");
    }catch(e){toast_("新增失敗："+e.message,"error");}
  }

  function exportCSV(){
    const rows=[["員工",...monthDays]];
    employees.forEach(emp=>{
      const row=[emp.name];
      monthDays.forEach(d=>{
        const s=schedMap[`${emp.id}_${d}`];
        if(!s||!s.station) row.push("");
        else if(s.station==="休假") row.push("休假");
        else row.push(`${s.station} ${s.start_time||""}~${s.end_time||""}`);
      });
      rows.push(row);
    });
    const csv="﻿"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`排班表_${vy}年${vm+1}月.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast_("✅ 排班表已匯出");
  }

  async function updateEmp(){
    if(!editEmp.name.trim())return toast_("請輸入員工姓名","error");
    if(demo){setEmployees(p=>p.map(e=>e.id===editEmp.id?{...editEmp,hourly_rate:+editEmp.hourly_rate,monthly_rate:+editEmp.monthly_rate}:e));setEditEmp(null);toast_("✅ 員工資料已更新");return;}
    try{
      const data={name:editEmp.name,dept:editEmp.dept,position:editEmp.position,phone:editEmp.phone||null,id_number:editEmp.id_number||null,birthday:editEmp.birthday||null,join_date:editEmp.join_date||null,note:editEmp.note||null};
      if(isOwner){data.hourly_rate=+editEmp.hourly_rate;data.monthly_rate=+editEmp.monthly_rate;data.salary_type=editEmp.salary_type;}
      await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${editEmp.id}`,{method:"PATCH",headers:dbH(),body:JSON.stringify(data)});
      await loadData();setEditEmp(null);toast_("✅ 員工資料已更新");
    }catch(e){toast_("更新失敗："+e.message,"error");}
  }

  async function delEmp(id){
    if(demo){setEmployees(p=>p.filter(e=>e.id!==id));return;}
    try{await db.del("employees",`?id=eq.${id}`);await loadData();}catch(e){toast_("刪除失敗","error");}
  }

  function monthRecs(empId){return monthDays.map(d=>clockMap[`${empId}_${d}`]).filter(r=>r&&r.check_in);}
  function monthSchedRecs(empId){return monthDays.map(d=>schedMap[`${empId}_${d}`]);}

  const S={
    card:{background:"#1a2a3a",borderRadius:12,padding:"14px 16px",marginBottom:10,border:"1px solid #2a3a4a"},
    inp:{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:13,boxSizing:"border-box",fontFamily:"inherit"},
    sel:{width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:8,padding:"8px 10px",color:"#e8e0d0",fontSize:13,fontFamily:"inherit"},
    nav:{background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:16},
  };

  const TABS=[
    {id:"clock",label:"⏰ 打卡",ownerOnly:false},
    {id:"schedule",label:"📅 排班",ownerOnly:false},
    {id:"salary",label:"💰 薪資",ownerOnly:true},
    {id:"employees",label:"👥 員工",ownerOnly:false},
  ].filter(t=>!t.ownerOnly||isOwner);

  if(!user)return <Login onLogin={a=>{setUser(a);setTab("clock");}}/>;

  return(
    <div style={{minHeight:"100vh",background:"#0f1923",color:"#e8e0d0",fontFamily:"'Noto Sans TC',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{background:"linear-gradient(135deg,#1a2a3a,#0f1923)",borderBottom:"1px solid #2a3a4a",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#f0a500,#e05b00)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏢</div>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>卯食豐原</div><div style={{fontSize:11,color:"#8a9ab0"}}>{today}</div></div>
        <div style={{background:isOwner?"#3a2a0a":"#1a2a3a",border:`1px solid ${isOwner?"#f0a500":"#4a6a8a"}`,borderRadius:20,padding:"4px 12px",fontSize:12,color:isOwner?"#f0a500":"#8ab0d0",fontWeight:600}}>{user.label}</div>
        <button onClick={()=>setUser(null)} style={{background:"#2a1a1a",border:"1px solid #4a2a2a",color:"#e05b00",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>登出</button>
      </div>
      {!isOwner&&<div style={{background:"#1a2a0a",borderBottom:"1px solid #3a4a2a",padding:"8px 16px",fontSize:12,color:"#8ab060"}}>🔒 店長模式：可操作打卡、排班、新增員工，薪資僅老闆可查看</div>}
      <div style={{display:"flex",background:"#151f2b",borderBottom:"1px solid #2a3a4a"}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 4px",border:"none",background:"none",color:tab===t.id?"#f0a500":"#8a9ab0",borderBottom:tab===t.id?"2px solid #f0a500":"2px solid transparent",fontSize:13,fontWeight:tab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>))}
      </div>
      {loading&&<div style={{textAlign:"center",padding:16,color:"#8a9ab0",fontSize:13}}>⏳ 載入中...</div>}

      <div style={{padding:16,maxWidth:1200,margin:"0 auto"}}>

        {/* 打卡 */}
        {tab==="clock"&&<div>
          <div style={{fontSize:13,color:"#8a9ab0",marginBottom:14}}>今日：{today}　{isHol(today)?"🎌 國定假日":isWk(today)?"🔵 假日":"⚫ 工作日"}</div>
          {employees.map(emp=>{
            const rec=clockMap[`${emp.id}_${today}`]||{};
            const sched=schedMap[`${emp.id}_${today}`];
            return(
              <div key={emp.id} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#2a4a6a,#1a2a3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:15}}>{emp.name}</div>
                  <div style={{fontSize:12,color:"#8a9ab0",display:"flex",gap:8,flexWrap:"wrap"}}>
                    {sched?.station&&sched.station!=="休假"&&<span style={{color:"#4caf50"}}>📍{sched.station}</span>}
                    {sched?.station==="休假"&&<span style={{color:"#e05b00"}}>🏖 休假</span>}
                    {sched?.start_time&&<span>⏰{sched.start_time}～{sched.end_time}</span>}
                  </div>
                  <div style={{fontSize:12,marginTop:4,display:"flex",gap:14}}>
                    <span style={{color:rec.check_in?"#4caf50":"#555"}}>上班：{rec.check_in||"--:--"}</span>
                    <span style={{color:rec.check_out?"#f0a500":"#555"}}>下班：{rec.check_out||"--:--"}</span>
                  </div>
                </div>
                {sched?.station!=="休假"&&<div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <button onClick={()=>handleClock(emp.id,"in")} disabled={!!rec.check_in} style={{padding:"8px 12px",borderRadius:8,border:"none",fontFamily:"inherit",background:rec.check_in?"#2a3a4a":"#4caf50",color:"white",fontSize:12,fontWeight:600,cursor:rec.check_in?"not-allowed":"pointer"}}>上班打卡</button>
                  <button onClick={()=>handleClock(emp.id,"out")} disabled={!rec.check_in||!!rec.check_out} style={{padding:"8px 12px",borderRadius:8,border:"none",fontFamily:"inherit",background:(!rec.check_in||rec.check_out)?"#2a3a4a":"#f0a500",color:"white",fontSize:12,fontWeight:600,cursor:(!rec.check_in||rec.check_out)?"not-allowed":"pointer"}}>下班打卡</button>
                </div>}
              </div>);})}
        </div>}

        {/* 排班 - 格子放大1.5倍 */}
        {tab==="schedule"&&<div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <button onClick={()=>{if(vm===0){setVm(11);setVy(y=>y-1)}else setVm(m=>m-1)}} style={S.nav}>‹</button>
            <span style={{fontWeight:700,fontSize:15}}>{vy}年 {vm+1}月</span>
            <button onClick={()=>{if(vm===11){setVm(0);setVy(y=>y+1)}else setVm(m=>m+1)}} style={S.nav}>›</button>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:12,color:"#8a9ab0"}}>💡 點格子可設定崗位與上下班時間</div>
            <button onClick={exportCSV} style={{background:"#1a3a2a",border:"1px solid #4caf50",color:"#4caf50",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📥 匯出排班表</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>
                <th style={{padding:"8px 10px",textAlign:"left",color:"#8a9ab0",borderBottom:"1px solid #2a3a4a",minWidth:80,position:"sticky",left:0,background:"#0f1923",zIndex:1}}>員工</th>
                {monthDays.map(d=>{
                  const day=parseInt(d.split("-")[2]);
                  const iH=isHol(d)||isWk(d);
                  const isToday=d===today;
                  return<th key={d} style={{padding:"4px 3px",textAlign:"center",color:isToday?"#fff":iH?"#f0a500":"#8a9ab0",borderBottom:"1px solid #2a3a4a",minWidth:54,background:isToday?"#2a3a4a":"transparent",borderRadius:isToday?4:0}}>
                    {day}{iH&&<div style={{fontSize:9}}>假</div>}
                  </th>;})}
              </tr></thead>
              <tbody>{employees.map(emp=>(<tr key={emp.id}>
                <td style={{padding:"6px 10px",color:"#e8e0d0",borderBottom:"1px solid #1a2a3a",fontSize:13,whiteSpace:"nowrap",position:"sticky",left:0,background:"#0f1923",zIndex:1}}>{emp.name}</td>
                {monthDays.map(d=>{
                  const key=`${emp.id}_${d}`;
                  const sched=schedMap[key];
                  const isOff=sched?.station==="休假";
                  return(
                    <td key={d} style={{padding:"3px",borderBottom:"1px solid #1a2a3a",textAlign:"center"}}>
                      <button onClick={()=>setPopup({emp,date:d})}
                        style={{width:54,height:54,borderRadius:8,border:`1px solid ${isOff?"#e05b0066":sched?.station?"#4caf5066":"#3a4a5a"}`,
                          background:isOff?"#e05b0022":sched?.station?"#4caf5022":"#2a3a4a",
                          cursor:"pointer",padding:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                        {isOff
                          ?<span style={{color:"#e05b00",fontSize:12,fontWeight:700}}>休</span>
                          :sched?.station
                            ?<span style={{color:"#4caf50",fontSize:11,fontWeight:700,lineHeight:1.2,textAlign:"center"}}>{sched.station}</span>
                            :<span style={{color:"#555",fontSize:16}}>+</span>}
                        {!isOff&&sched?.start_time&&<span style={{color:"#8a9ab0",fontSize:9,lineHeight:1}}>{sched.start_time}</span>}
                        {!isOff&&sched?.end_time&&<span style={{color:"#8a9ab0",fontSize:9,lineHeight:1}}>{sched.end_time}</span>}
                      </button>
                    </td>);})}
              </tr>))}</tbody>
            </table>
          </div>
        </div>}

        {/* 排班頁面月休統計 */}
        {tab==="schedule"&&employees.length>0&&<div style={{marginTop:16,...S.card}}>
          <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"#e8e0d0"}}>📊 本月休假統計（應休 {MONTHLY_REST_DAYS} 天）</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {employees.filter(emp=>emp.salary_type==="monthly").map(emp=>{
              const schedRecs=monthSchedRecs(emp.id);
              const restDays=schedRecs.filter(s=>s&&s.station==="休假").length;
              const missing=Math.max(0,MONTHLY_REST_DAYS-restDays);
              return(
                <div key={emp.id} style={{background:"#0f1923",borderRadius:8,padding:"8px 12px",minWidth:120,border:`1px solid ${missing>0?"#f0a50066":"#2a3a4a"}`}}>
                  <div style={{fontWeight:600,fontSize:13}}>{emp.name}</div>
                  <div style={{fontSize:12,color:missing>0?"#f0a500":"#4caf50",marginTop:4}}>
                    已休 {restDays} 天 {missing>0?`⚠️ 少休 ${missing} 天`:"✅"}
                  </div>
                </div>);
            })}
            {employees.filter(emp=>emp.salary_type==="monthly").length===0&&
              <div style={{fontSize:12,color:"#8a9ab0"}}>本月無正職員工排班記錄</div>}
          </div>
        </div>}

        {/* 薪資（老闆限定）*/}
        {tab==="salary"&&isOwner&&<div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <button onClick={()=>{if(vm===0){setVm(11);setVy(y=>y-1)}else setVm(m=>m-1)}} style={S.nav}>‹</button>
            <span style={{fontWeight:700,fontSize:15}}>{vy}年 {vm+1}月 薪資計算</span>
            <button onClick={()=>{if(vm===11){setVm(0);setVy(y=>y+1)}else setVm(m=>m+1)}} style={S.nav}>›</button>
          </div>
          <div style={{fontSize:11,color:"#8a9ab0",marginBottom:12}}>勞基法：平日加班前2h ×1.34、第3h起 ×1.67；假日 ×2</div>
          {employees.map(emp=>{
            const recs=monthRecs(emp.id);
            const schedRecs=monthSchedRecs(emp.id);
            const w=calcWage(emp,recs,schedRecs);
            return(
            <div key={emp.id} style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div><span style={{fontWeight:700,fontSize:15}}>{emp.name}</span><span style={{color:"#8a9ab0",fontSize:12,marginLeft:8}}>{emp.dept}｜{emp.position}</span></div>
                <div style={{fontSize:20,fontWeight:700,color:"#f0a500"}}>NT$ {Math.round(w.total).toLocaleString()}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:12}}>
                {[
                  {l:emp.salary_type==="monthly"?"底薪":"正班薪資",v:`NT$ ${Math.round(w.base).toLocaleString()}`,warn:false},
                  {l:`正班 ${w.reg.toFixed(1)}h`,v:"",warn:false},
                  {l:`平日加班 ${(w.ot1+w.ot2).toFixed(1)}h`,v:`NT$ ${Math.round(w.ot).toLocaleString()}`,warn:false},
                  {l:`國定假日 ${w.holHours.toFixed(1)}h`,v:emp.salary_type==="monthly"?`NT$ ${Math.round(w.holPay).toLocaleString()} (加給1倍)`:"正常工資（時薪制）",warn:false},

                  {l:"出勤天數",v:`${recs.length} 天`,warn:false},
                  {l:`實際休假`,v:`${w.actualRestDays} 天（應休 ${MONTHLY_REST_DAYS} 天）`,warn:false},
                  {l:`少休 ${w.missingRestDays} 天加班`,v:`NT$ ${Math.round(w.restOTPay).toLocaleString()}`,warn:w.missingRestDays>0},
                ].map((x,i)=>(
                  <div key={i} style={{background:x.warn?"#2a1a0a":"#0f1923",borderRadius:8,padding:"8px 10px",border:x.warn?"1px solid #f0a50066":"none"}}>
                    <div style={{color:x.warn?"#f0a500":"#8a9ab0",fontSize:11}}>{x.l}</div>
                    {x.v&&<div style={{color:x.warn?"#f0a500":"#e8e0d0",fontWeight:600,marginTop:2}}>{x.v}</div>}
                  </div>))}
              </div>
              {emp.salary_type==="monthly"&&w.missingRestDays>0&&<div style={{marginTop:10,background:"#2a1a0a",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f0a500",border:"1px solid #f0a50044"}}>
                ⚠️ {emp.name} 本月少休 {w.missingRestDays} 天，需補加班費 NT$ {Math.round(w.restOTPay).toLocaleString()}
              </div>}
            </div>);})}
        </div>}

        {/* 員工管理 */}
        {tab==="employees"&&<div>
          <button onClick={()=>setShowAdd(true)} style={{background:"linear-gradient(135deg,#f0a500,#e05b00)",border:"none",color:"white",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16,fontFamily:"inherit"}}>＋ 新增員工</button>
          {showAdd&&<div style={{...S.card,border:"1px solid #f0a500",marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:12}}>新增員工</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>姓名</div><input value={newEmp.name} onChange={e=>setNewEmp(p=>({...p,name:e.target.value}))} style={S.inp}/></div>
              {[{l:"部門",k:"dept",o:DEPARTMENTS},{l:"職位",k:"position",o:POSITIONS}].map(f=>(
                <div key={f.k}><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>{f.l}</div>
                  <select value={newEmp[f.k]||""} onChange={e=>setNewEmp(p=>({...p,[f.k]:e.target.value}))} style={S.sel}>
                    {f.o.map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>))}
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>電話</div><input value={newEmp.phone||""} onChange={e=>setNewEmp(p=>({...p,phone:e.target.value}))} style={S.inp}/></div>
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>身份證號</div><input value={newEmp.id_number||""} onChange={e=>setNewEmp(p=>({...p,id_number:e.target.value}))} style={S.inp}/></div>
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>生日</div><input type="date" value={newEmp.birthday||""} onChange={e=>setNewEmp(p=>({...p,birthday:e.target.value}))} style={S.inp}/></div>
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>入職日期</div><input type="date" value={newEmp.join_date||""} onChange={e=>setNewEmp(p=>({...p,join_date:e.target.value}))} style={S.inp}/></div>
              <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>備註</div><input value={newEmp.note||""} onChange={e=>setNewEmp(p=>({...p,note:e.target.value}))} style={S.inp}/></div>
              {isOwner&&<>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>時薪(元)</div><input type="number" value={newEmp.hourly_rate} onChange={e=>setNewEmp(p=>({...p,hourly_rate:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>月薪(元)</div><input type="number" value={newEmp.monthly_rate} onChange={e=>setNewEmp(p=>({...p,monthly_rate:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>薪資類型</div>
                  <select value={newEmp.salary_type} onChange={e=>setNewEmp(p=>({...p,salary_type:e.target.value}))} style={S.sel}>
                    <option value="monthly">月薪制</option><option value="hourly">時薪制</option>
                  </select>
                </div>
              </>}
            </div>
            <div style={{display:"flex",gap:10,marginTop:12}}>
              <button onClick={addEmp} style={{flex:1,background:"#f0a500",border:"none",color:"white",borderRadius:8,padding:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>確認新增</button>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:10,cursor:"pointer",fontFamily:"inherit"}}>取消</button>
            </div>
          </div>}
          {employees.map(emp=>(
            <div key={emp.id} style={{...S.card}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#2a4a6a,#1a2a3a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>👤</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:15}}>{emp.name}</div>
                  <div style={{fontSize:12,color:"#8a9ab0"}}>{emp.dept}｜{emp.position}</div>
                  {emp.phone&&<div style={{fontSize:12,color:"#8a9ab0"}}>📞 {emp.phone}</div>}
                  {emp.birthday&&<div style={{fontSize:12,color:"#8a9ab0"}}>🎂 生日：{emp.birthday}</div>}
                  {emp.join_date&&<div style={{fontSize:12,color:"#8a9ab0"}}>📅 入職：{emp.join_date}</div>}
                  {isOwner&&<div style={{fontSize:12,color:"#f0a500",marginTop:2}}>時薪：NT$ {emp.hourly_rate}{emp.salary_type==="monthly"?`　月薪：NT$ ${emp.monthly_rate?.toLocaleString()}`:""}</div>}
                  {emp.note&&<div style={{fontSize:11,color:"#666",marginTop:2}}>備註：{emp.note}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <button onClick={()=>setEditEmp({...emp})} style={{background:"#1a3a5a",border:"1px solid #2a5a8a",color:"#4a9af0",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>編輯</button>
                  {isOwner&&<button onClick={()=>delEmp(emp.id)} style={{background:"#2a1a1a",border:"1px solid #4a2a2a",color:"#e05b00",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>刪除</button>}
                </div>
              </div>
            </div>))}

          {/* 編輯員工彈窗 */}
          {editEmp&&<div style={{position:"fixed",inset:0,background:"#00000099",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setEditEmp(null)}>
            <div style={{background:"#1a2a3a",borderRadius:16,padding:24,width:"100%",maxWidth:480,border:"1px solid #f0a500",boxShadow:"0 20px 60px #000",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>✏️ 編輯員工資料</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>姓名</div><input value={editEmp.name||""} onChange={e=>setEditEmp(p=>({...p,name:e.target.value}))} style={S.inp}/></div>
                {[{l:"部門",k:"dept",o:DEPARTMENTS},{l:"職位",k:"position",o:POSITIONS}].map(f=>(
                  <div key={f.k}><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>{f.l}</div>
                    <select value={editEmp[f.k]||""} onChange={e=>setEditEmp(p=>({...p,[f.k]:e.target.value}))} style={S.sel}>
                      {f.o.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>))}
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>電話</div><input value={editEmp.phone||""} onChange={e=>setEditEmp(p=>({...p,phone:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>身份證號</div><input value={editEmp.id_number||""} onChange={e=>setEditEmp(p=>({...p,id_number:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>生日</div><input type="date" value={editEmp.birthday||""} onChange={e=>setEditEmp(p=>({...p,birthday:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>入職日期</div><input type="date" value={editEmp.join_date||""} onChange={e=>setEditEmp(p=>({...p,join_date:e.target.value}))} style={S.inp}/></div>
                <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>備註</div><input value={editEmp.note||""} onChange={e=>setEditEmp(p=>({...p,note:e.target.value}))} style={S.inp}/></div>
                {isOwner&&<>
                  <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>時薪(元)</div><input type="number" value={editEmp.hourly_rate||185} onChange={e=>setEditEmp(p=>({...p,hourly_rate:e.target.value}))} style={S.inp}/></div>
                  <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>月薪(元)</div><input type="number" value={editEmp.monthly_rate||0} onChange={e=>setEditEmp(p=>({...p,monthly_rate:e.target.value}))} style={S.inp}/></div>
                  <div><div style={{fontSize:11,color:"#8a9ab0",marginBottom:4}}>薪資類型</div>
                    <select value={editEmp.salary_type||"hourly"} onChange={e=>setEditEmp(p=>({...p,salary_type:e.target.value}))} style={S.sel}>
                      <option value="monthly">月薪制</option><option value="hourly">時薪制</option>
                    </select>
                  </div>
                </>}
              </div>
              <div style={{display:"flex",gap:10,marginTop:16}}>
                <button onClick={updateEmp} style={{flex:1,background:"#f0a500",border:"none",color:"white",borderRadius:8,padding:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>儲存</button>
                <button onClick={()=>setEditEmp(null)} style={{flex:1,background:"#2a3a4a",border:"none",color:"#e8e0d0",borderRadius:8,padding:11,cursor:"pointer",fontFamily:"inherit",fontSize:14}}>取消</button>
              </div>
            </div>
          </div>}
        </div>}

      </div>

      {popup&&<ShiftPopup
        emp={popup.emp} date={popup.date}
        current={schedMap[`${popup.emp.id}_${popup.date}`]}
        onSave={(station,st,et)=>handleShiftSave(popup.emp,popup.date,station,st,et)}
        onClose={()=>setPopup(null)}
      />}

      {toast&&<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?"#4a1a1a":"#1a3a2a",color:toast.type==="error"?"#e05b00":"#4caf50",border:`1px solid ${toast.type==="error"?"#e05b00":"#4caf50"}`,borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:9999,whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
