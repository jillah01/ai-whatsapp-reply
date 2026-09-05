const URL="https://penntuaofjveawocdvgp.supabase.co";
const KEY="PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";
const sb=window.supabase.createClient(URL,KEY);
const $=id=>document.getElementById(id);

async function load(){
  const {data,error}=await sb.rpc("admin_list_users");
  if(error){$("msg").textContent=error.message;return;}
  $("users").innerHTML=(data||[]).map(u=>`
    <tr>
      <td>${String(u.email||"").replaceAll("<","&lt;")}</td>
      <td><select data-plan="${u.user_id}">
        <option value="free" ${u.plan==="free"?"selected":""}>Free</option>
        <option value="pro" ${u.plan==="pro"?"selected":""}>Pro</option>
      </select></td>
      <td>${u.reply_count}</td>
      <td><button data-save="${u.user_id}">Save</button></td>
    </tr>`).join("");
}

$("loginBtn").onclick=async()=>{
  const {data,error}=await sb.auth.signInWithPassword({
    email:$("email").value.trim(),password:$("password").value
  });
  if(error){$("msg").textContent=error.message;return;}
  $("login").classList.add("hidden");$("dash").classList.remove("hidden");
  $("me").textContent=data.user.email||"Admin";await load();
};

$("logout").onclick=async()=>{await sb.auth.signOut();location.reload()};

$("users").onclick=async e=>{
  const b=e.target.closest("[data-save]");if(!b)return;
  const select=document.querySelector(`[data-plan="${b.dataset.save}"]`);
  const {error}=await sb.rpc("admin_set_plan",{
    p_user_id:b.dataset.save,p_plan:select.value
  });
  if(error) alert(error.message); else load();
};
