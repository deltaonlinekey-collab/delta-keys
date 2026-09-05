let STORE = null;

async function api(url, options={}) {
  const r = await fetch(url, {headers: {"Content-Type":"application/json", ...(options.headers||{})}, ...options});
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
function money(n, currency) {
  try { return new Intl.NumberFormat("en-IN",{style:"currency",currency:currency||"INR",maximumFractionDigits:0}).format(n); }
  catch { return `${currency||"INR"} ${n}`; }
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
async function loadStore(){
  STORE = await api("/api/store");
  const grid = document.querySelector("#productsGrid");
  document.querySelector("#storeStatus").textContent = `${STORE.products.length} products`;
  grid.innerHTML = STORE.products.map(p => `
    <article class="product-card">
      <div class="eyebrow">PRODUCT</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description || "Digital access key with instant delivery.")}</p>
      ${p.plans.map(x => `
        <div class="plan">
          <div><div class="plan-name">${esc(x.name)}</div><div class="stock">${x.stock > 0 ? `${x.stock} available` : "Out of stock"}</div></div>
          <div class="price">${money(x.price, STORE.settings.currency)}</div>
          <button class="buy" ${x.stock<1?"disabled":""} onclick="openCheckout('${x.id}')">${x.stock<1?"Out of stock":"Buy now"}</button>
        </div>`).join("")}
    </article>`).join("");
}
function openCheckout(planId){
  const plan = STORE.products.flatMap(p=>p.plans.map(x=>({...x,product:p}))).find(x=>x.id===planId);
  if(!plan) return;
  document.querySelector("#modal").classList.remove("hidden");
  document.querySelector("#modalBody").innerHTML = `
    <div class="eyebrow">CHECKOUT</div><h2>${esc(plan.product.name)}</h2>
    <p class="muted">${esc(plan.name)} · ${money(plan.price,STORE.settings.currency)} each</p>
    <div class="field"><label>EMAIL (OPTIONAL)</label><input id="email" type="email" placeholder="you@example.com"></div>
    <div class="field"><label>QUANTITY</label><input id="qty" type="number" min="1" max="10" value="1"></div>
    <div class="summary"><strong>Total</strong><span style="float:right" id="total">${money(plan.price,STORE.settings.currency)}</span></div>
    <div class="notice">Demo checkout is enabled in this starter. Connect your payment provider before accepting real payments.</div>
    <button class="buy full" onclick="createOrder('${plan.id}')">Continue to payment</button>`;
  document.querySelector("#qty").addEventListener("input",()=> {
    let q=Math.max(1,Math.min(10,Number(document.querySelector("#qty").value)||1));
    document.querySelector("#qty").value=q;
    document.querySelector("#total").textContent=money(plan.price*q,STORE.settings.currency);
  });
}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}
async function createOrder(planId){
  try{
    const qty=Math.max(1,Math.min(10,Number(document.querySelector("#qty").value)||1));
    const email=document.querySelector("#email").value;
    const data=await api("/api/orders",{method:"POST",body:JSON.stringify({planId,quantity:qty,email})});
    showPayment(data.order);
  }catch(e){alert(e.message)}
}
function showPayment(order){
  document.querySelector("#modalBody").innerHTML=`
    <div class="eyebrow">ORDER ${esc(order.id)}</div><h2>Confirm payment</h2>
    <p class="muted">${esc(order.productName)} · ${esc(order.planName)} · ${money(order.amount,order.currency)}</p>
    <div class="notice">This is a demo payment screen. A production version should redirect to your payment provider and verify its webhook on the server.</div>
    <button class="buy full" onclick="demoPay('${order.id}')">Simulate successful payment</button>`;
}
async function demoPay(orderId){
  try{
    const data=await api(`/api/orders/${orderId}/demo-pay`,{method:"POST"});
    const o=data.order;
    document.querySelector("#modalBody").innerHTML=`
      <div class="eyebrow">PAYMENT SUCCESSFUL</div><h2>Your key is ready</h2>
      <p class="muted">Order ${esc(o.id)}</p>
      ${o.keys.map(k=>`<div class="order-key">${esc(k)}</div>`).join("")}
      <div class="notice">Keep this key private. Your order ID is <strong>${esc(o.id)}</strong>.</div>
      <button class="btn full" onclick="closeModal();loadStore()">Done</button>`;
  }catch(e){alert(e.message)}
}
loadStore().catch(e=>document.querySelector("#storeStatus").textContent=e.message);
