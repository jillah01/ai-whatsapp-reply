const SUPABASE_URL = "https://penntuaofjveawocdvgp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QKbxDKVM1s9X3SQpK4_mlw_gs7gwWCs";
const API_URL = "https://reply-ai-api.xjillah.workers.dev";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let signupMode = false;
let currentUser = null;
let selectedCategory = "General";
let history = [];
let usage = {count:0, limit:20, remaining:20};

const $ = (id) => document.getElementById(id);
function authMessage(t){ $("authMessage").textContent=t; }
function status(t){ $("status").textContent=t; }

function switchMode(signup){
  signupMode=signup;
  $("loginTab").classList.toggle("active",!signup);
  $("signupTab").classList.toggle("active",signup);
  $("authTitle").textContent=signup?"Create your account":"Welcome back";
  $("authSubtitle").textContent=signup?"Create an account with email and password.":"Login with your email and password.";
  $("authBtn").textContent=signup?"Create account":"Login";
  authMessage("");
}

async function auth(){
  const email=$("email").value.trim(), password=$("password").value;
  if(!email||!password) return authMessage("Enter email and password.");
  if(password.length<6) return authMessage("Password must be at least 6 characters.");
  $("authBtn").disabled=true;
  try{
    if(signupMode){
      const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:"https://jillah01.github.io/ai-whatsapp-reply/"}});
      if(error) throw error;
      if(data.session) await showApp(data.user);
      else authMessage("Account created. Check your email to confirm, then log in.");
    }else{
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error) throw error;
      await showApp(data.user);
    }
  }catch(e){authMessage(e.message||"Authentication failed.");}
  finally{$("authBtn").disabled=false;}
}

async function forgot(){
  const email=$("email").value.trim();
  if(!email) return authMessage("Enter your email first.");
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:"https://jillah01.github.io/ai-whatsapp-reply/"});
  authMessage(error?"Error: "+error.message:"Password reset email sent.");
}

async function showApp(user){
  currentUser=user;
  $("authCard").classList.add("hidden");
  $("appSection").classList.remove("hidden");
  $("userEmail").textContent=user.email||"Account";
  await loadData();
  await refreshUsage();
}

function hideApp(){
  currentUser=null;
  $("authCard").classList.remove("hidden");
  $("appSection").classList.add("hidden");
  history=[];
  renderHistory();
}

async function loadData(){
  const {data:profile}=await sb.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
  if(profile){
    $("businessName").value=profile.business_name||"";
    $("businessType").value=profile.business_type||"";
    $("language").value=profile.language||"Hinglish";
    $("tone").value=profile.tone||"Friendly";
    $("style").value=profile.business_style||"";
    $("replyLanguage").value=profile.language||"Hinglish";
    $("replyTone").value=profile.tone||"Friendly";
  }
  const {data:rows}=await sb.from("reply_history").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(10);
  history=rows||[];
  renderHistory();
}

async function refreshUsage(){
  try{
    const session=(await sb.auth.getSession()).data.session;
    if(!session) return;
    const response=await fetch(`${API_URL}/usage`,{headers:{Authorization:`Bearer ${session.access_token}`}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||"Could not load usage.");
    usage={count:Number(data.count||0),limit:Number(data.limit||20),remaining:Number(data.remaining||0)};
    $("usageCount").textContent=`${usage.count}/${usage.limit}`;
  }catch(e){
    console.error(e);
    $("usageCount").textContent="—";
  }
}

async function saveProfile(){
  const payload={id:currentUser.id,business_name:$("businessName").value.trim(),business_type:$("businessType").value.trim(),language:$("language").value,tone:$("tone").value,business_style:$("style").value.trim(),updated_at:new Date().toISOString()};
  const {error}=await sb.from("profiles").upsert(payload);
  $("profileMessage").textContent=error?"Save failed: "+error.message:"Profile saved.";
}

async function callAI(action="generate"){
  const session=(await sb.auth.getSession()).data.session;
  if(!session) throw new Error("Please log in again.");
  const response=await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},
    body:JSON.stringify({
      message:$("message").value.trim(),
      language:$("replyLanguage").value,
      tone:$("replyTone").value,
      category:selectedCategory,
      businessName:$("businessName").value.trim(),
      businessType:$("businessType").value.trim(),
      businessStyle:$("style").value.trim(),
      action,
      existingReply:$("result").value.trim()
    })
  });
  const data=await response.json().catch(()=>({}));
  if(response.status===429){
    if(data.usage){usage=data.usage;$("usageCount").textContent=`${usage.count}/${usage.limit}`;}
    throw new Error(data.message||"Monthly limit reached.");
  }
  if(response.status===401) throw new Error("Please log in again.");
  if(!response.ok) throw new Error(data.error||"Request failed.");
  if(!data.reply) throw new Error("No reply returned.");
  if(data.usage){usage=data.usage;$("usageCount").textContent=`${usage.count}/${usage.limit}`;}
  return data.reply;
}

async function generate(){
  const message=$("message").value.trim();
  if(!message) return status("Enter the customer's message.");
  if(usage.remaining<=0) return status("You've reached the free monthly limit.");
  $("generateBtn").disabled=true;$("generateBtn").textContent="Generating...";status("");
  try{
    const reply=await callAI();
    $("result").value=reply;$("resultSection").classList.remove("hidden");
    await saveReply(message,reply);updateCounts();
    status(`Reply generated. ${usage.remaining} free repl${usage.remaining===1?"y":"ies"} remaining this month.`);
  }catch(e){status("Error: "+e.message);}
  finally{$("generateBtn").disabled=false;$("generateBtn").textContent="Generate Reply";}
}

async function saveReply(message,reply){
  const {data,error}=await sb.from("reply_history").insert({user_id:currentUser.id,customer_message:message,reply,category:selectedCategory,language:$("replyLanguage").value,tone:$("replyTone").value}).select().single();
  if(!error&&data){history.unshift(data);history=history.slice(0,10);renderHistory();}
}

async function rewrite(action,button){
  if(!$("result").value.trim()||usage.remaining<=0) return;
  const old=button.textContent;button.disabled=true;button.textContent="Working...";
  try{
    const reply=await callAI(action);$("result").value=reply;await saveReply($("message").value.trim(),reply);updateCounts();status("Updated reply saved.");
  }catch(e){status("Error: "+e.message);}
  finally{button.disabled=false;button.textContent=old;}
}

function renderHistory(){
  $("history").innerHTML=history.length?history.map((x,i)=>`
    <article class="history-item">
      <div class="history-top"><span class="tag">${escapeHtml(x.category||"General")}</span><span class="date">${escapeHtml(new Date(x.created_at).toLocaleString())}</span></div>
      <p class="history-msg">${escapeHtml(x.customer_message||"")}</p>
      <p class="history-reply">${escapeHtml(x.reply||"")}</p>
      <div class="history-buttons"><button data-use="${i}">Use reply</button><button data-copy="${i}">Copy</button></div>
    </article>`).join(""):'<div class="history-empty">No replies saved yet.</div>';
}

function escapeHtml(t){return String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function updateCounts(){$("inputCount").textContent=`${$("message").value.length}/1000`;$("charCount").textContent=`${$("result").value.length} characters`;}

document.querySelectorAll(".category").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".category").forEach(x=>x.classList.remove("active"));b.classList.add("active");selectedCategory=b.dataset.category;}));
$("loginTab").onclick=()=>switchMode(false);
$("signupTab").onclick=()=>switchMode(true);
$("authBtn").onclick=auth;
$("forgotBtn").onclick=forgot;
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();hideApp();};
$("saveProfileBtn").onclick=saveProfile;
$("generateBtn").onclick=generate;
$("message").oninput=updateCounts;
$("language").onchange=()=>$("replyLanguage").value=$("language").value;
$("tone").onchange=()=>$("replyTone").value=$("tone").value;
$("copyBtn").onclick=async()=>{await navigator.clipboard.writeText($("result").value);$("copyBtn").textContent="✓ Copied";setTimeout(()=>$("copyBtn").textContent="📋 Copy",1100);};
$("whatsappBtn").onclick=()=>window.open(`https://wa.me/?text=${encodeURIComponent($("result").value)}`,"_blank");
$("shorterBtn").onclick=()=>rewrite("shorter",$("shorterBtn"));
$("politeBtn").onclick=()=>rewrite("politer",$("politeBtn"));
$("professionalBtn").onclick=()=>rewrite("professional",$("professionalBtn"));
$("clearHistoryBtn").onclick=async()=>{const {error}=await sb.from("reply_history").delete().eq("user_id",currentUser.id);if(!error){history=[];renderHistory();status("History cleared.");}};
$("history").addEventListener("click",async e=>{
  const use=e.target.closest("[data-use]"),copy=e.target.closest("[data-copy]");
  if(use){const x=history[+use.dataset.use];$("message").value=x.customer_message;$("result").value=x.reply;selectedCategory=x.category||"General";document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b.dataset.category===selectedCategory));$("resultSection").classList.remove("hidden");updateCounts();}
  if(copy){const x=history[+copy.dataset.copy];await navigator.clipboard.writeText(x.reply);copy.textContent="Copied";}
});

(async()=>{const {data}=await sb.auth.getSession();if(data.session) await showApp(data.session.user);else hideApp();sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT")hideApp();});})();
