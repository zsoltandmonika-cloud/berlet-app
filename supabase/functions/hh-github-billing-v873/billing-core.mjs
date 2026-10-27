// Pure, dependency-free GitHub Billing normalizer. Never handles credentials.
// One report covers one GitHub account and one calendar month in USD.
const isNum=x=>typeof x==="number"&&Number.isFinite(x);
const money=x=>Math.round(x*10000)/10000;
export function monthQuery(s){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s))throw Error("invalid_month");
 const year=Number(s.slice(0,4)),month=Number(s.slice(5));
 if(year<2024||year>2100)throw Error("invalid_month");
 return {year,month};
}
export function aggregateBilling(raw,month,measuredAt){
 const {year}=monthQuery(month);
 if(!raw||!Array.isArray(raw.usageItems)||raw.usageItems.length>5000)
  throw Error("invalid_or_oversize_usage");
 const rows=raw.usageItems;
 let grossAmount=0,discountAmount=0,netAmount=0,actionsLinuxMinutes=0,actionsStorageGBHours=0;
 const grouped=new Map();
 for(const r of rows){
  if(!r||typeof r!=="object")throw Error("invalid_row");
  const product=String(r.product||"").slice(0,65),sku=String(r.sku||"").slice(0,100);
  const unitType=String(r.unitType||"").slice(0,50);
  if(!product||!sku||!unitType)throw Error("invalid_label");
  const vals=[r.grossAmount,r.discountAmount,r.netAmount].map(Number);
  if(vals.some((v,i)=>!isNum(v)||r[["grossAmount","discountAmount","netAmount"][i]]==null))
   throw Error("invalid_amount");
  const quantity=r.quantity==null?null:Number(r.quantity);
  if(quantity!==null&&(!isNum(quantity)||Math.abs(quantity)>1e12))
   throw Error("invalid_quantity");
  const [g,d,n]=vals;
  grossAmount+=g;discountAmount+=d;netAmount+=n;
  const normalized=(sku+" "+unitType).toLowerCase();
  if(product.toLowerCase()==="actions"&&quantity!==null){
   if(/linux/.test(normalized)&&/(minute|minut)/.test(unitType.toLowerCase()))
    actionsLinuxMinutes+=quantity;
   if(/storage/.test(normalized)&&/(gb.?hour|gib.?hour)/i.test(unitType))
    actionsStorageGBHours+=quantity;
  }
  const key=[product,sku,unitType].join("\u001f");
  const prev=grouped.get(key)||{product,sku,unitType,quantity:0,grossAmount:0,discountAmount:0,netAmount:0};
  if(quantity!==null)prev.quantity+=quantity;
  prev.grossAmount+=g;prev.discountAmount+=d;prev.netAmount+=n;grouped.set(key,prev);
 }
 if(![grossAmount,discountAmount,netAmount,actionsLinuxMinutes,actionsStorageGBHours].every(isNum))
  throw Error("totals_out_of_range");
 const products=[...grouped.values()].sort((a,b)=>b.grossAmount-a.grossAmount).slice(0,18).map(x=>({
  product:x.product,sku:x.sku,unitType:x.unitType,quantity:money(x.quantity),
  grossAmount:money(x.grossAmount),discountAmount:money(x.discountAmount),netAmount:money(x.netAmount)
 }));
 const iso=new Date(measuredAt||Date.now()).toISOString();
 return {schema:"sh9.github.billing/1",period:month,currency:"USD",
  year,measuredAt:iso,account:"zsoltandmonika-cloud",lineItemCount:rows.length,
  grossAmount:money(grossAmount),discountAmount:money(discountAmount),
  netAmount:money(netAmount),actionsLinuxMinutes:money(actionsLinuxMinutes),
  actionsStorageGBHours:money(actionsStorageGBHours),topSkus:products,
  source:"GitHub Billing REST /users/{username}/settings/billing/usage",verified:true};
}
