const OPENAI_BASE = "https://api.openai.com/v1";

function json(data, status=200, origin="*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "POST, OPTIONS",
      "cache-control": "no-store"
    }
  });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  const configured = (env.ALLOWED_ORIGINS || "").split(",").map(x=>x.trim()).filter(Boolean);
  if (!configured.length) return "*";
  return configured.includes(origin) ? origin : "";
}

function authorized(request, env) {
  if (!env.APP_TOKEN) return true;
  return request.headers.get("authorization") === "Bearer " + env.APP_TOKEN;
}

function cleanRecipe(x) {
  if (!x || typeof x !== "object") throw new Error("Invalid recipe payload");
  const out = {
    title: String(x.title || "").trim(),
    category: String(x.category || "Egyébb").trim(),
    servings: String(x.servings || "4 fő").trim(),
    time: String(x.time || "30–40 perc").trim(),
    difficulty: String(x.difficulty || "Könnyű").trim(),
    ingredients: Array.isArray(x.ingredients) ? x.ingredients.map(String).map(s=>s.trim()).filter(Boolean) : [],
    steps: Array.isArray(x.steps) ? x.steps.map(String).map(s=>s.trim()).filter(Boolean) : [],
    notes: Array.isArray(x.notes) ? x.notes.map(String).map(s=>s.trim()).filter(Boolean) : []
  };
  if (!out.title || !out.ingredients.length || !out.steps.length) throw new Error("Incomplete recipe payload");
  return out;
}

async function openAI(env, path, body) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const r = await fetch(OPENAI_BASE + path, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + env.OPENAI_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data?.error?.message || ("OpenAI HTTP " + r.status));
  return data;
}

function recipeInstructions(categories=[]) {
  return [
    "Te Léna vagy, a Léna Recepttár magyar receptasszisztense.",
    "Készíts pontos, otthon jól megfőzhető receptet. Ne találj ki értelmetlen mennyiségeket.",
    "A felhasználó által megadott mennyiségeket és korlátozásokat tartsd meg.",
    "A hozzávalók minden sora tartalmazzon használható mennyiséget, ahol ennek van értelme.",
    "Az elkészítés legyen sorrendhelyes, világos, 4–9 lépés.",
    "A válasz kizárólag JSON objektum legyen, magyarázó szöveg és markdown nélkül.",
    "Séma: {title,category,servings,time,difficulty,ingredients:string[],steps:string[],notes:string[]}.",
    categories.length ? "A kategóriát lehetőleg ezek közül válaszd: " + categories.join(", ") : ""
  ].filter(Boolean).join("\n");
}

async function generateRecipe(env, prompt, categories) {
  const data = await openAI(env, "/responses", {
    model: env.OPENAI_TEXT_MODEL || "gpt-5.6-terra",
    instructions: recipeInstructions(categories),
    input: prompt,
    text: { format: { type: "json_object" }, verbosity: "low" },
    reasoning: { effort: "low" },
    store: false
  });
  const text = data.output_text || "";
  if (!text) throw new Error("Empty model response");
  return cleanRecipe(JSON.parse(text));
}

async function refineRecipe(env, recipe, instruction, categories) {
  const input = "Jelenlegi recept JSON:\n" + JSON.stringify(cleanRecipe(recipe)) +
    "\n\nMódosítási kérés:\n" + instruction +
    "\n\nA teljes frissített receptet add vissza.";
  return generateRecipe(env, input, categories);
}

async function generateImage(env, recipe) {
  const r = cleanRecipe(recipe);
  const prompt = [
    "Photorealistic editorial food photography for a premium Hungarian recipe card.",
    "Dish: " + r.title + ".",
    "Key ingredients: " + r.ingredients.slice(0,8).join(", ") + ".",
    "Show the finished dish only, appetizing and realistic, natural proportions, warm natural side light, elegant home dining setting, shallow depth of field.",
    "Portrait composition with useful negative space for recipe-card typography.",
    "No text, no lettering, no labels, no watermark, no hands, no people."
  ].join(" ");
  const data = await openAI(env, "/images/generations", {
    model: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "jpeg",
    background: "opaque"
  });
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image API returned no image data");
  return { b64, mime: "image/jpeg" };
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, {status:403});
      return new Response(null, {status:204, headers:{
        "access-control-allow-origin": origin,
        "access-control-allow-headers": "content-type, authorization",
        "access-control-allow-methods": "POST, OPTIONS"
      }});
    }
    if (!origin) return json({error:"Origin not allowed"}, 403, "*");
    if (!authorized(request, env)) return json({error:"Unauthorized"}, 401, origin);
    if (request.method !== "POST") return json({error:"POST required"}, 405, origin);

    try {
      const url = new URL(request.url);
      const body = await request.json();
      if (url.pathname.endsWith("/recipe")) {
        const prompt = String(body.prompt || "").trim();
        if (!prompt) return json({error:"Missing prompt"}, 400, origin);
        return json({recipe: await generateRecipe(env, prompt, body.categories || [])}, 200, origin);
      }
      if (url.pathname.endsWith("/refine")) {
        const instruction = String(body.instruction || "").trim();
        if (!instruction) return json({error:"Missing refinement instruction"}, 400, origin);
        return json({recipe: await refineRecipe(env, body.recipe, instruction, body.categories || [])}, 200, origin);
      }
      if (url.pathname.endsWith("/image")) {
        return json(await generateImage(env, body.recipe), 200, origin);
      }
      return json({error:"Unknown endpoint"}, 404, origin);
    } catch (e) {
      return json({error:e?.message || "Studio API error"}, 500, origin || "*");
    }
  }
};
