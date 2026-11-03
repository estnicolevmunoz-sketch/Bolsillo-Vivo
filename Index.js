// Bolsillo Vivo - Backend WhatsApp 100% funcional
// Para Render.com - Gratis
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "bolsillo_vivo_token_123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PASAJE = 3200;

const users = new Map();
function fm(n){ return "$" + Math.round(n).toLocaleString('es-CO'); }
function amount(t){
  if(!t) return 0;
  const m = t.toLowerCase().replace(/\$/g,'').match(/(\d+(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(mil|k)?/);
  if(!m) return 0;
  let val = m[1].replace(/\./g,'').replace(/,/g,'');
  let num = parseInt(val,10);
  if(m[2]) num = num*1000;
  return num;
}
async function sendWAText(to, text){
  if(!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) { console.log("Falta TOKEN", to, text); return; }
  try{
    await axios.post(`https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp", to, type: "text", text: { body: text }
    }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
  } catch(e){ console.error(e.response?.data || e.message); }
}

app.get("/", (req,res)=> res.send("Bolsillo Vivo Bot activo 💚 - Usa /webhook"));
app.get("/webhook", (req,res)=>{
  if(req.query["hub.verify_token"]===VERIFY_TOKEN) res.send(req.query["hub.challenge"]);
  else res.sendStatus(403);
});

app.post("/webhook", async (req,res)=>{
  try{
    const value = req.body.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if(!msg) return res.sendStatus(200);
    const from = msg.from;
    const text = msg.text?.body || "";
    const l = text.toLowerCase();
    let S = users.get(from);
    if(!S) S = { step:0, spent:0, ant:0, budget:0, allow:0, goal:0, goalName:"mi meta", name:"" };
    
    if(S.step < 10 && !S.budget){
      if(S.step===0){ S.name=text.slice(0,25); S.step=1; users.set(from,S); await sendWAText(from, `¡Hola ${S.name}! 💚 Soy Bolsillo Vivo, tu asistente financiero.\n\n¿En qué universidad estudias?`); return res.sendStatus(200); }
      if(S.step===1){ S.uni=text.slice(0,30); S.step=2; users.set(from,S); await sendWAText(from, `¡Genial! 🎓 ${S.uni}\n\n¿Cuánto te dan de mesada al mes? Escribe solo el número. Ej: 400000\n(Pon 0 si no tienes)`); return res.sendStatus(200); }
      if(S.step===2){ S.allow=amount(text); S.step=3; users.set(from,S); await sendWAText(from, `Anotado: ${fm(S.allow)} al mes.\n\n¿Cuál es tu meta de ahorro? Ej: Viaje a Santa Marta, iPhone, Curso`); return res.sendStatus(200); }
      if(S.step===3){ S.goalName=text.slice(0,30); S.step=4; users.set(from,S); await sendWAText(from, `¡Meta "${S.goalName}"! 💪\n\n¿Cuánto cuesta? Ej: 1500000`); return res.sendStatus(200); }
      if(S.step===4){ S.goal=amount(text); const income=S.allow||400000; S.budget=income/30; S.step=10; users.set(from,S); await sendWAText(from, `¡Listo, ${S.name}! 🎉\n\n💰 Ingreso mensual: ${fm(income)}\n☀️ HOY puedes gastar: ${fm(S.budget)}\n🎯 Meta "${S.goalName}": ${fm(S.goal)}\n\nAhora cuéntame tus gastos como hablas:\n• "gasté 5 mil en café"\n• "dos empanadas a 3500"\n• "uber 12000"\n\nComandos: *saldo*, *meta*, *consejo*, *reto*, *ayuda*`); return res.sendStatus(200); }
    }
