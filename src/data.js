// ── Static constants and data (no runtime computation) ────────────────────────

export const ACCOUNTS = {
  "pt":       { password:"pt",       name:"Personal Trainer Demo",         role:"trainer",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
  "pt_pro":   { password:"pt_pro",   name:"FitExpress — Personal Trainer", role:"trainer",
                 theme:{
                   accent:"#FFD600", accentFg:"#0a0a00", logo:["FitExpress","Pro"],
                   bg:"#080800", surface:"#0f0f00", card:"#141400", card2:"#1a1a00",
                   border:"#2a2a00", accent2:"#ff9900", accent3:"#ff4400",
                 } },
  "admin":    { password:"admin",    name:"Admin",                         role:"admin",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
  "atleta":   { password:"atleta",   name:"Atleta Demo",                   role:"atleta",
                 theme:{ accent:"#e8ff47", accentFg:"#07070d", logo:["PT","Studio"] } },
};

export const THEME_DEFAULTS = {
  "--accent":   "#e8ff47",
  "--accent-fg":"#07070d",
  "--bg":       "#07070d",
  "--surface":  "#0f0f18",
  "--card":     "#13131e",
  "--card2":    "#1a1a28",
  "--border":   "#22223a",
  "--accent2":  "#47ffe8",
  "--accent3":  "#ff47a3",
};

export const THEME_MAP = {
  accent:"--accent", accentFg:"--accent-fg",
  bg:"--bg", surface:"--surface", card:"--card", card2:"--card2",
  border:"--border", accent2:"--accent2", accent3:"--accent3",
};

export const CAT_COLORS     = { Braccia:"#e8ff47", Spalle:"#47ffe8", Schiena:"#ff9f47", Gambe:"#ff47a3" };
export const LINE_COLORS    = ["#e8ff47","#47ffe8","#ff47a3","#ff9f47","#a47ffe","#47a3ff","#ff4757","#2ecc71"];
export const CAT_COLORS_PDF = { Braccia:[130,160,0], Spalle:[0,140,120], Schiena:[170,95,0], Gambe:[170,0,95] };
export const CATEGORIES     = ["Tutte","Braccia","Spalle","Schiena","Gambe"];
export const DAYS           = ["A","B","C"];
export const OBIETTIVI      = ["Ipertrofia","Dimagrimento","Forza","Resistenza","Tonificazione"];
export const LIVELLI        = ["Principiante","Intermedio","Avanzato"];
export const SESSION_TYPES  = ["Allenamento","Valutazione","Recupero"];
export const ALL_DAYS       = ["A","B","C","D","E","F","G"];

export const EXERCISES = [
  { id:1,  cat:"Braccia", name:"Curl con bilanciere",        muscles:"Bicipite brachiale, brachiale",               yt:"kwG2ipFRgfo" },
  { id:2,  cat:"Braccia", name:"Curl con manubri alternati", muscles:"Bicipite brachiale, brachioradiale",           yt:"ykJmrZ5v0Oo" },
  { id:3,  cat:"Braccia", name:"Tricep pushdown al cavo",    muscles:"Capo lungo e laterale del tricipite",          yt:"2-LAMcpzODU"  },
  { id:4,  cat:"Braccia", name:"Skull crushers",             muscles:"Tricipite brachiale (capo lungo)",             yt:"d_KZxkY_0cM"  },
  { id:5,  cat:"Braccia", name:"Hammer curl",                muscles:"Brachioradiale, bicipite brachiale",           yt:"zC3nLlEvin4"  },
  { id:6,  cat:"Spalle",  name:"Lento avanti con bilanciere",muscles:"Deltoide anteriore, tricipite",                yt:"2yjwXTZQDDI"  },
  { id:7,  cat:"Spalle",  name:"Alzate laterali",            muscles:"Deltoide mediale",                             yt:"3VcKaXpzqRo"  },
  { id:8,  cat:"Spalle",  name:"Facepull al cavo",           muscles:"Deltoide posteriore, romboidi, trapezio",      yt:"rep-qVOkqgk"  },
  { id:9,  cat:"Spalle",  name:"Arnold press",               muscles:"Deltoide anteriore, mediale, tricipite",       yt:"3ml7BH7mNwQ"  },
  { id:10, cat:"Spalle",  name:"Alzate frontali",            muscles:"Deltoide anteriore, pettorale clavicolare",    yt:"gkiTb0RKMCg"  },
  { id:11, cat:"Schiena", name:"Stacco da terra",            muscles:"Erettori spinali, glutei, femorali, trapezio", yt:"op9kVnSso6Q"  },
  { id:12, cat:"Schiena", name:"Trazioni alla sbarra",       muscles:"Gran dorsale, bicipite, romboidi",             yt:"eGo4IYlbE5g"  },
  { id:13, cat:"Schiena", name:"Rematore con bilanciere",    muscles:"Gran dorsale, romboidi, bicipite",             yt:"9efgcAjQe7E"  },
  { id:14, cat:"Schiena", name:"Lat machine presa larga",    muscles:"Gran dorsale, bicipite brachiale",             yt:"CAwf7n6Tuuc"  },
  { id:15, cat:"Schiena", name:"Seated cable row",           muscles:"Romboidi, trapezio medio, gran dorsale",       yt:"GZbfZ033f74"  },
  { id:16, cat:"Gambe",   name:"Squat con bilanciere",       muscles:"Quadricipiti, glutei, femorali",               yt:"ultWZbUMPL8"  },
  { id:17, cat:"Gambe",   name:"Leg press 45°",              muscles:"Quadricipiti, glutei, bicipiti femorali",      yt:"IZxyjW7MPJQ"  },
  { id:18, cat:"Gambe",   name:"Romanian deadlift",          muscles:"Bicipiti femorali, gluteo grande, erettori",   yt:"JCXUYuzwNrM"  },
  { id:19, cat:"Gambe",   name:"Leg curl sdraiato",          muscles:"Bicipiti femorali, gastrocnemio",              yt:"1Tq3QdYUuHs"  },
  { id:20, cat:"Gambe",   name:"Calf raises in piedi",       muscles:"Gastrocnemio, soleo",                          yt:"gwLzBJYoWlQ"  },
];

export const DEMO_ATLETI = [
  { id:0, nome:"Atleta", cognome:"Demo",    obiettivo:"Ipertrofia",   livello:"Intermedio",   lastSeen:"oggi",        schede:1, color:"#47ffe8", isDemoAtleta:true, hasAccount:true },
  { id:1, nome:"Luca",   cognome:"Ferrari",  obiettivo:"Ipertrofia",   livello:"Intermedio",   lastSeen:"3 giorni fa", schede:2, color:"#e8ff47" },
  { id:2, nome:"Sofia",  cognome:"Martini",  obiettivo:"Dimagrimento", livello:"Principiante", lastSeen:"ieri",        schede:1, color:"#47ffe8" },
  { id:3, nome:"Marco",  cognome:"Bianchi",  obiettivo:"Forza",        livello:"Avanzato",     lastSeen:"oggi",        schede:3, color:"#ff9f47" },
  { id:4, nome:"Chiara", cognome:"Esposito", obiettivo:"Tonificazione",livello:"Intermedio",   lastSeen:"5 giorni fa", schede:1, color:"#ff47a3" },
];

export const FAKE_EX_IDS = {
  1: [1, 3, 7, 16, 12],
  3: [11, 16, 13, 6],
  2: [20, 7, 17],
  4: [19, 7, 2],
};

export const ADMIN_PT = [
  { name:"Andrea Rossi",    lastLogin:"Oggi, 09:14",     clients:4, schede:7  },
  { name:"Giulia Moretti",  lastLogin:"Ieri, 18:30",     clients:6, schede:12 },
  { name:"Paolo Crespi",    lastLogin:"3 giorni fa",     clients:2, schede:3  },
  { name:"Marta Savi",      lastLogin:"Oggi, 11:02",     clients:8, schede:15 },
  { name:"Lorenzo De Luca", lastLogin:"Una settimana fa",clients:1, schede:2  },
];

export const ADMIN_SESSION_TYPES = ["Riunione","Call","Visita","Onboarding"];

export const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
export const DAYS_IT   = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

export const EX_IMAGES = {
  1:"curl-con-bilanciere", 2:"curl-con-manubri-alternati", 3:"tricep-pushdown-al-cavo",
  4:"skull-crushers", 5:"hammer-curl", 6:"lento-avanti-con-bilanciere",
  7:"alzate-laterali", 8:"facepull-al-cavo", 9:"arnold-press", 10:"alzate-frontali",
  11:"stacco-da-terra", 12:"trazioni-alla-sbarra", 13:"rematore-con-bilanciere",
  14:"lat-machine-presa-larga", 15:"seated-cable-row", 16:"squat-con-bilanciere",
  17:"leg-press-45", 18:"romanian-deadlift", 19:"leg-curl-sdraiato", 20:"calf-raises-in-piedi",
};

export const MISURE_FIELDS = [
  { key:"peso",      label:"Peso",      emoji:"⚖️", unit:"kg"  },
  { key:"vita",      label:"Vita",      emoji:"📏", unit:"cm"  },
  { key:"fianchi",   label:"Fianchi",   emoji:"🍑", unit:"cm"  },
  { key:"petto",     label:"Petto",     emoji:"💪", unit:"cm"  },
  { key:"braccio",   label:"Braccio",   emoji:"💪", unit:"cm"  },
  { key:"grassoPerc",label:"Grasso",    emoji:"🔬", unit:"%"   },
  { key:"fcRiposo",  label:"FC Riposo", emoji:"❤️", unit:"bpm" },
];

export const LS_ATLETI     = "pt_atleti_demo";
export const LS_CAL_SHARED = "pt_calendar_shared";
export const LS_KEY        = "pt_sessions_demo_atleta";
