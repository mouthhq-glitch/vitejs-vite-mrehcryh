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
const ACCOUNTS=[{username:"boss",password:"boss123",role:"owner",label:"👑 老闆"},{username:"manager",password:"manager123",role:"manager",label:"👔 店長"}];
const DEPARTMENTS=["門市","廚房","外場","行政"];
const POSITIONS=["正職","兼職","工讀"];
const STATIONS=["製作1","製作2","煎台","麵線","烤土司","櫃檯","飲料","包裝","外場","備料"];
const SHIFTS=[{id:"A",label:"早班",start:"08:00",end:"16:00",color:"#f0a500"},{id:"B",label:"中班",start:"12:00",end:"20:00",color:"#2196f3"},{id:"C",label:"晚班",start:"16:00",end:"00:00",color:"#9c27b0"},{id:"D",label:"全天",start:"08:00",end:"20:00",color:"#4caf50"},{id:"OFF",label:"休假",start:"",end:"",color:"#666"}];
const DEMO_EMP=[{id:1,name:"王小明",dept:"門市",position:"正職",station:"櫃檯",hourly_rate:185,monthly_rate:28590,salary_type:"monthly"},{id:2,name:"李小花",dept:"外場",position:"兼職",station:"外場",hourly_rate:185,monthly_rate:0,salary_type:"hourly"},{id:3,name:"陳大偉",dept:"廚房",position:"正職",station:"煎台",hourly_rate:200,monthly_rate:32000,salary_type:"monthly"},{id:4,name:"林美麗",dept:"行政",position:"工讀",station:"櫃檯",hourly_rate:185,monthly_rate:0,salary_type:"hourly"}];
const isHol=d=>TW_HOLIDAYS.includes(d);
const isWk=d=>{const w=new Date(d).getDay();return w===0||w===6;};
const fmt=d=>d.toISOString().split("T")[0];
const getDays=(y,m)=>new Date(y,m+1,0).getDate();
function calcWage(emp,recs){let reg=0,ot1=0,ot2=0,hol=0;recs.forEach(r=>{if(!r.check_in||!r.check_out)return;let h=(new Date(`${r.work_date}T${r.check_out}`)-new Date(`${r.work_date}T${r.check_in}`))/3600000;if(h<0)h+=24;h=Math.max(0,h-0.5);if(isHol(r.work_date)||isWk(r.work_date))hol+=h;else if(h<=8)reg+=h;else if(h<=10){reg+=8;ot1+=h-8;}else{reg+=8;ot1+=2;ot2+=h-10;}});const rate=emp.hourly_rate,base=emp.salary_type==="monthly"?emp.monthly_rate:reg*rate,ot=ot1*rate*1.34+ot2*rate*1.67,hp=hol*rate*2;return{reg,ot1,ot2,hol,base,ot,hp,total:base+ot+hp};}

function Login({onLogin}){
  const[u,su]=useState("");const[p,sp]=useState("");const[err,se]=useState("");const[busy,sb]=useState(false);
  function go(){se("");sb(true);setTimeout(()=>{const a=ACCOUNTS.find(x=>x.username===u&&x.password===p);if(a)onLogin(a);else{se("帳號或密碼錯誤");sb(false);}},500);}
  const inp={width:"100%",background:"#0f1923",border:"1px solid #2a3a4a",borderRadius:10,padding:"10px 14px",color:"#e8e0d0",fontSize:14,boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
  return(<div style={{minHeight:"100vh",background:"#0b1520",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif"}}>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet"/>
    <div style={{width:340,background:"#131f2e",borderRadius:20,padding:36,border:"1px solid #2a3a4a",boxShadow:"0 20px 60px #00000066"}}>
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{width:60,height:60,borderRadius:16,background:"linear-gradient(135deg,#f0a500,#e05b00)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:10}}>🏢</div>
        <div style={{fontWeight:700,fontSize:20,color:"#e8e0d0"}}>台灣勞基法人資系統</div>
      </div>
      <div style={{background:"#1a2a3a",borderRadius:10,padding:12,marginBottom:18,fontSize:11,color:"#8a9ab0",lineHeight:2}}>
        <div style={{color:"#f0a500",fontWeight:600,marginBottom:2}}>測試帳號</div>
        <div>👑 老闆：boss / boss123</div><div>👔 店長：manager / manager123</div>
      </div>
      <div style={{marginBottom:14}}><div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>帳號</div><input value={u} onChange={e=>su(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/></div>
      <div style={{marginBottom:18}}><div style={{fontSize:12,color:"#8a9ab0",marginBottom:6}}>密碼</div><input type="password" value={p} onChange={e=>sp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp}/></div>
      {err&&<div style={{color:"#e05b00",fontSize:12,marginBottom:12,textAlign:"center"}}>⚠ {err}</div>}
      <button onClick={go} disabled={busy} style={{width:"100%",padding:13,background:"linear-gradient(135deg,#f0a500,#e05b00)",border:"none",borderRadius:10,color:"white",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit",opacity:busy?0.7:1}}>{busy?"登入中...":"登入"}</button>
    </div></div>);
}

export default function App(){
  const[user,setUser]=useState(null);const[tab,setTab]=useState("clock");
  const[employees,setEmployees]=useState([]);const[clockMap,setClockMap]=useState({});const[schedMap,setSchedMap]=useState({});
  const[newEmp,setNewEmp]=useState({name:"",dept:"門市",position:"正職",station:"櫃檯",defShift:"A",hourly_rate:185,monthly_rate:28590,salary_type:"monthly"});
  const[showAdd,setShowAdd]=useState(false);const[toast,setToast]=useState(null);const[loading,setLoading]=useState(false);
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