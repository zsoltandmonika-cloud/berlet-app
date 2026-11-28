// Standalone provider adapter for an isolated Cookbook pilot. No credentials in source.
const TEXT_MODEL="@cf/google/gemma-4-26b-a4b-it";
const IMAGE_MODEL="@cf/black-forest-labs/flux-2-klein-9b";
const IMAGE_MAX=1500000;
function providerError(code,status=0){const e=new Error(code);e.status=status;return e}
function textResult(data){
 const r=data?.result??data;
 let value=r?.choices?.[0]?.message?.content??r?.response;
 if(Array.isArray(value))value=value.map(x=>typeof x==="string"?x:x?.text||"").join("");
 if(typeof value!=="string"||!value.trim())throw providerError("empty_provider_response");
 return value.trim();
}
function imageResult(data){
 const image=data?.result?.image??data?.image;
 if(typeof image!=="string"||!image.length||image.length>8000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(image))throw providerError("invalid_provider_image");
 const mime=image.startsWith("/9j/")?"image/jpeg":image.startsWith("iVBORw0KGgo")?"image/png":image.startsWith("UklGR")?"image/webp":null;
 if(!mime)throw providerError("unknown_provider_image_format");
 return {mime,base64:image};
}
async function cloudflareCookbook({accountId,apiToken,operation,prompt,photo,fetcher=fetch}){
 if(!/^[a-f0-9]{32}$/i.test(accountId||"")||typeof apiToken!=="string"||!apiToken.trim())throw providerError("provider_not_configured");
 if(!["text","vision","image"].includes(operation)||typeof prompt!=="string"||!prompt.trim()||prompt.length>36000)throw providerError("invalid_request");
 const model=operation==="image"?IMAGE_MODEL:TEXT_MODEL;
 const headers={Authorization:"Bearer "+apiToken};let body;
 if(operation==="image"){
  const form=new FormData();form.append("prompt",prompt);form.append("width","1024");form.append("height","768");body=form;
 }else{
  let content=prompt;
  if(operation==="vision"){
   if(!photo||!["image/jpeg","image/png","image/webp"].includes(photo.mime)||typeof photo.base64!=="string"||photo.base64.length>IMAGE_MAX||!photo.base64.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64))throw providerError("invalid_photo");
   content=[{type:"text",text:prompt},{type:"image_url",image_url:{url:"data:"+photo.mime+";base64,"+photo.base64}}];
  }
  headers["Content-Type"]="application/json";
  body=JSON.stringify({messages:[{role:"user",content}],max_completion_tokens:2800,temperature:0.3,stream:false});
 }
 const response=await fetcher("https://api.cloudflare.com/client/v4/accounts/"+accountId+"/ai/run/"+model,{method:"POST",headers,body,signal:AbortSignal.timeout(operation==="image"?55000:35000)});
 if(!response.ok)throw providerError("provider_http_"+response.status,response.status);
 const data=await response.json();
 if(data?.success===false)throw providerError("provider_rejected");
 return operation==="image"?{kind:"image",...imageResult(data),model}:{kind:"text",text:textResult(data),model};
}
export {cloudflareCookbook,textResult,imageResult};
