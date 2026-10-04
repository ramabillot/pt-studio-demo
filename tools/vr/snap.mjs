// Visual regression: cattura le schermate principali con dati finti e data fissa.
import { chromium } from 'playwright';
const OUT = process.argv[2] || 'base';
// Lingua del browser simulato (LANG=it|es|en, default it): l'app la prende da lì
const LANG = process.env.LANG_APP || 'it';
const LOCALE = {it:'it-IT', es:'es-AR', en:'en-US'}[LANG];
const L = {
  it:{progressi:'📈 Progressi', nav:[['Libreria','libreria'],['Builder','builder'],['Atleti','atleti'],['Calendario','calendario'],['Account','account']], atleti:'Atleti', admin:[['Statistiche','stats'],['I miei PT','pt']]},
  es:{progressi:'📈 Progreso', nav:[['Biblioteca','libreria'],['Builder','builder'],['Atletas','atleti'],['Calendario','calendario'],['Cuenta','account']], atleti:'Atletas', admin:[['Estadísticas','stats'],['Mis PT','pt']]},
  en:{progressi:'📈 Progress', nav:[['Library','libreria'],['Builder','builder'],['Athletes','atleti'],['Calendar','calendario'],['Account','account']], atleti:'Athletes', admin:[['Statistics','stats'],['My PTs','pt']]},
}[LANG];
const b = await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const FIXED = new Date('2026-10-02T12:00:00');
const scheda={id:'s1',nome:'Full Body 2x',obiettivo:'Ipertrofia',livello:'Intermedio',assegnata_il:'2026-10-01',scheda_giorni:[
 {id:'gA',nome:'Full Body A',giorno_key:'A',ordine:0,scheda_esercizi:[
   {id:'e1',nome:'Squat con bilanciere',esercizio_id_int:16,serie:3,reps:'6-8',rest_sec:150,ordine:0},
   {id:'e2',nome:'Plank',esercizio_id_int:69,serie:3,reps:'30s',rest_sec:60,ordine:1}]},
 {id:'gB',nome:'Full Body B',giorno_key:'B',ordine:1,scheda_esercizi:[
   {id:'e3',nome:'Leg press 45°',esercizio_id_int:17,serie:3,reps:'10-12',rest_sec:120,ordine:0}]}]};
const sess=[
 {id:'x1',data:'2026-09-28',giorno_id:'gA',scheda_giorni:{nome:'Full Body A',giorno_key:'A'},sessione_serie:[{esercizio_id:'e1',nome_esercizio:'Squat con bilanciere',serie_numero:1,reps:8,peso:60,nota:'facile'},{esercizio_id:'e1',nome_esercizio:'Squat con bilanciere',serie_numero:2,reps:8,peso:60}]},
 {id:'x2',data:'2026-10-01',giorno_id:'gA',scheda_giorni:{nome:'Full Body A',giorno_key:'A'},sessione_serie:[{esercizio_id:'e1',nome_esercizio:'Squat con bilanciere',serie_numero:1,reps:6,peso:62.5,nota:'ultima dura'},{esercizio_id:'e1',nome_esercizio:'Squat con bilanciere',serie_numero:2,reps:6,peso:62.5}]}];
const atleta={id:'a1',pt_id:'p1',nome:'Ramiro',cognome:'B',username:'rbillot',pin:'1234',color:'#e8ff47',obiettivo:'Ipertrofia',livello:'Intermedio',schede:[{count:1}]};
const schedaPT={...scheda,attiva:true,atleta_id:'a1'};
async function mock(p, admin=false){
  await p.clock.setFixedTime(FIXED);
  await p.route('**/example.supabase.co/**', async route=>{
    const r=route.request(); const u=new URL(r.url()); const m=r.method(); const path=u.pathname.replace('/rest/v1/','');
    const obj=(r.headers()['accept']||'').includes('object');
    const j=(o,st=200,h={})=>route.fulfill({status:st,contentType:'application/json',headers:h,body:JSON.stringify(o)});
    if(path.startsWith('rpc/')){
      const fn=path.slice(4);
      if(fn==='atleta_me') return j({id:'a1',pt_id:'p1',nome:'Ramiro',cognome:'',username:'rbillot',pt_nome:'Ramiro Billot'});
      if(fn==='atleta_get_scheda') return j(scheda);
      if(fn==='atleta_get_sessioni') return j(sess);
      if(fn==='atleta_get_misurazioni') return j([{data:'2026-09-20',peso_kg:78},{data:'2026-10-01',peso_kg:77.5}]);
      if(fn==='atleta_get_appuntamenti') return j([{id:'ap1',data:'2026-10-05',ora_inizio:'18:00:00'}]);
      return j(null);
    }
    if(u.pathname.startsWith('/auth/v1/token')) return j({access_token:'x',token_type:'bearer',expires_in:3600,expires_at:Math.floor(FIXED/1000)+3600,refresh_token:'r',user:{id:'p1',email:'pt@x.it',aud:'authenticated',role:'authenticated'}});
    if(u.pathname.startsWith('/auth/')) return j({});
    const pr={id:'p1',nome:'Ramiro',cognome:'Billot',is_approved:true,is_admin:admin,max_atleti:5,created_at:'2026-05-30T10:00:00Z'};
    if(path==='profiles') return j(obj?pr:(admin&&!u.search.includes('id=eq')?[pr,{...pr,id:'p2',nome:'Lionel',cognome:'Messi',is_admin:false,email:'l@x.it'}]:[pr]));
    if(path==='atleti') return j([atleta]);
    if(path==='sessioni') return j(sess);
    if(path==='misurazioni') return j([{id:'m1',data:'2026-09-20',peso_kg:78},{id:'m2',data:'2026-10-01',peso_kg:77.5}]);
    if(path==='appuntamenti') return j([{id:'ap1',data:'2026-10-05',ora_inizio:'18:00:00',atleta_id:'a1',titolo:'Ramiro B',atleti:{nome:'Ramiro',cognome:'B'}}]);
    if(path==='schede'&&m==='GET'){ if(u.search.includes('scheda_giorni')) return j(obj?schedaPT:[schedaPT]); return j(obj?{id:'s1'}:[{id:'s1'}],200,{'content-range':'0-0/1'}); }
    if(m==='HEAD') return route.fulfill({status:200,headers:{'content-range':'0-0/1'},body:''});
    return j(obj?null:[]);
  });
}
async function shot(p,name){ await p.waitForTimeout(700); await p.screenshot({path:`${OUT}/${name}.png`,fullPage:true,mask:[p.locator('canvas')]}); }
import fs from 'fs'; fs.mkdirSync(OUT,{recursive:true});

for (const [vp,tag] of [[{width:390,height:844},'m'],[{width:1300,height:900},'d']]) {
  // login
  let ctx=await b.newContext({viewport:vp,locale:LOCALE}); let p=await ctx.newPage(); await mock(p);
  await p.goto('http://localhost:4173/'); await shot(p,`${tag}-home`);
  await p.goto('http://localhost:4173/atleta/?u=rbillot'); await shot(p,`${tag}-login-atleta`);
  await p.goto('http://localhost:4173/pt/'); await shot(p,`${tag}-login-pt`);
  await ctx.close();
  // atleta
  ctx=await b.newContext({viewport:vp,locale:LOCALE}); p=await ctx.newPage(); await mock(p);
  await p.addInitScript(()=>localStorage.setItem('ptstudio_atleta_token','t'.repeat(64)));
  await p.goto('http://localhost:4173/atleta/'); await p.waitForTimeout(1200); await shot(p,`${tag}-atleta-scheda`);
  await p.getByText(L.progressi).click(); await shot(p,`${tag}-atleta-progressi`);
  await ctx.close();
  // PT
  for (const admin of [false,true]) {
    ctx=await b.newContext({viewport:vp,locale:LOCALE}); p=await ctx.newPage(); await mock(p,admin);
    await p.goto('http://localhost:4173/pt/'); await p.waitForTimeout(500);
    await p.fill('input[type=email]','pt@x.it'); await p.fill('input[type=password]','secret'); await p.click('.login-btn');
    await p.waitForTimeout(3800);
    const pre=admin?`${tag}-admin`:`${tag}-pt`;
    await shot(p,`${pre}-dashboard`);
    const nav = async label => { const loc=p.locator(`.sidebar-item:has-text("${label}"), .mobile-nav-item:has-text("${label}")`).locator('visible=true').first(); await loc.click(); };
    if(!admin){
      for (const [label,name] of L.nav) { await nav(label); await shot(p,`${pre}-${name}`); }
      await nav(L.atleti); await p.waitForTimeout(500); await p.locator('.client-item').first().click(); await p.waitForTimeout(900);
      await p.locator('.client-modal').screenshot({path:`${OUT}/${pre}-atleta-modal.png`});
    } else {
      for (const [label,name] of L.admin) { await nav(label); await shot(p,`${pre}-${name}`); }
    }
    await ctx.close();
  }
}
await b.close();
console.log('ok', OUT);
