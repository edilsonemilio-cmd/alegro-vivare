(function () {
  const KEY = "alegro-vivare-v14";
  const DEV_SEM_LOGIN = false;
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const SEMANA = ["DOMINGO","SEGUNDA","TERÇA","QUARTA","QUINTA","SEXTA","SÁBADO"];

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const fmt = (d) => {
    const x = new Date(d); x.setHours(0,0,0,0);
    const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,"0"), dd = String(x.getDate()).padStart(2,"0");
    return `${y}-${m}-${dd}`;
  };
  const parse = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const today = () => { const x = new Date(); x.setHours(0,0,0,0); return x; };
  const firstName = (n) => (n || "").split(" ")[0];
  const initials = (n) => (n || "?").split(" ").filter(Boolean).slice(0,2).map(p => p[0]).join("").toUpperCase();
  function ico(nome) {
    const d = {
      home: '<path d="M4 12 12 4l8 8v8H14v-5H10v5H4z"/>',
      cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      gift: '<path d="M12 8v13M4 12h16v9H4zM3 8h18v4H3zM12 8s-2-4-5-4-3 2-3 2 4 2 8 2 8-2 8-2-0-2-3-2-5 4-5 4z"/>',
      chat: '<path d="M5 6h14v10H8l-3 3z"/>',
      more: '<path d="M5 7h14M5 12h14M5 17h14"/>',
      bell: '<path d="M6 16h12l-1-6a5 5 0 0 0-10 0zM10 19h4"/>'
    };
    return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${d[nome] || ""}</svg>`;
  }

  function slotsPorTurno(unidade, turno) {
    if (turno === "noite" && unidade === "iretama") return AV_SEED.vagasNoiteIretama;
    return turno === "noite" ? AV_SEED.vagasNoite : AV_SEED.vagasDia;
  }

  function bancoOn() {
    const b = window.AV_BANCO || {};
    return !!(b.url && b.key);
  }
  function bancoHeaders() {
    const b = window.AV_BANCO;
    return {
      apikey: b.key,
      Authorization: "Bearer " + b.key,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    };
  }
  async function puxarNuvem() {
    const b = window.AV_BANCO;
    const r = await fetch(b.url.replace(/\/$/, "") + "/rest/v1/estado?id=eq.1&select=payload", { headers: bancoHeaders() });
    if (!r.ok) throw new Error("banco " + r.status);
    const rows = await r.json();
    return rows[0] && rows[0].payload;
  }
  async function mandarNuvem(obj) {
    const b = window.AV_BANCO;
    const r = await fetch(b.url.replace(/\/$/, "") + "/rest/v1/estado?id=eq.1", {
      method: "PATCH",
      headers: bancoHeaders(),
      body: JSON.stringify({ payload: obj, atualizado: new Date().toISOString() })
    });
    if (!r.ok) throw new Error("salvar " + r.status);
  }
  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    return bootstrap();
  }
  function setSessao(id) {
    state.session = id || null;
    try {
      if (id) sessionStorage.setItem("alegro-sessao", id);
      else sessionStorage.removeItem("alegro-sessao");
    } catch (e) {}
  }
  function sessaoDesteAparelho() {
    try { return sessionStorage.getItem("alegro-sessao"); } catch (e) { return null; }
  }
  function estadoParaNuvem() {
    const copia = JSON.parse(JSON.stringify(state));
    copia.session = null;
    return copia;
  }
  let saveTimer = null;
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (!bancoOn()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      mandarNuvem(estadoParaNuvem()).catch(() => {});
    }, 400);
  }

  function bootstrap() {
    const users = AV_SEED.usuarios.map(u => ({
      ...u,
      senha: AV_SEED.senhaPadrao,
      pontos: 0,
      alegretes: 0,
      ganhos: 0,
      plantoes: 0,
      selo: "Confiável",
      status: "ativo",
      frase: "",
      emergenciasMes: 0,
      manchas: [],
      bonusMes: [],
      extrato: [],
      avisosLidos: []
    }));
    const state = {
      users,
      slots: [],
      pedidos: [],
      resgates: [],
      extras: [],
      trocas: [],
      avisos: [],
      falas: [],
      insta: [],
      notifs: [],
      session: null
    };
    gerarGrade(state, today(), 3);
    const fixosTurno = users.filter(u => u.vinculo === "fixo" && u.turno);
    const grupos = {};
    fixosTurno.forEach(u => {
      const k = u.unidade + "|" + u.turno;
      grupos[k] = grupos[k] || [];
      grupos[k].push(u);
    });
    Object.values(grupos).forEach(lista => {
      lista.forEach((u, i) => {
        const faseA = i % 2 === 0;
        aplicar12x36(state, u, today(), u.turno, faseA);
      });
    });
    return state;
  }

  function gerarGrade(state, inicio, meses) {
    const start = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const end = new Date(inicio.getFullYear(), inicio.getMonth() + meses, 0);
    AV_SEED.unidades.forEach(un => {
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        ["dia","noite"].forEach(turno => {
          const n = slotsPorTurno(un.id, turno);
          for (let i = 0; i < n; i++) {
            const id = `${fmt(d)}|${un.id}|${turno}|${i}`;
            if (!state.slots.find(s => s.id === id)) {
              state.slots.push({
                id, data: fmt(d), unidade: un.id, turno, idx: i,
                userId: null, titularId: null, status: "livre",
                chegada: false, saida: false, recompensado: false,
                transferencias: 0, origem: "vaga"
              });
            }
          }
        });
      }
    });
  }

  function aplicar12x36(state, user, ancoraDate, ancoraTurno, trabalhouAncora) {
    if (!user.unidade || !user.turno) return;
    const start = new Date(today().getFullYear(), today().getMonth(), 1);
    const end = new Date(today().getFullYear(), today().getMonth() + 3, 0);
    const base = new Date(ancoraDate); base.setHours(0,0,0,0);
    const fase = trabalhouAncora ? 0 : 1;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const diff = Math.round((d - base) / 86400000);
      const trabalha = Math.abs(diff) % 2 === fase;
      if (!trabalha) continue;
      if (user.turno !== ancoraTurno && ancoraTurno) {
        /* turno fixo da pessoa prevalece */
      }
      encaixar(state, fmt(d), user.unidade, user.turno, user.id, "confirmado", "fixo12x36");
    }
  }

  function encaixar(state, data, unidade, turno, userId, status, origem) {
    const livre = state.slots.find(s => s.data === data && s.unidade === unidade && s.turno === turno && !s.userId);
    if (!livre) return null;
    livre.userId = userId;
    livre.titularId = livre.titularId || userId;
    livre.status = status || "confirmado";
    livre.origem = origem || "manual";
    return livre;
  }

  function userById(id) { return state.users.find(u => u.id === id); }
  function me() { return state.users.find(u => u.id === state.session); }
  function isCoord(u) { return u && (u.papel === "admin" || u.papel === "coord" || u.coordena); }
  function isAdmin(u) { return u && (u.papel === "admin" || u.loja); }

  function conflitos(user, data, unidade, turno) {
    const motivos = [];
    const sameTime = state.slots.find(s => s.userId === user.id && s.data === data && s.turno === turno && s.unidade !== unidade);
    if (sameTime) motivos.push("⚠️ Você já está nesse mesmo horário em outra casa. Não dá para estar em dois lugares.");
    const sameSlot = state.slots.find(s => s.userId === user.id && s.data === data && s.unidade === unidade && s.turno === turno);
    if (sameSlot) motivos.push("Você já está neste plantão.");
    const prev = fmt(addDays(parse(data), -1));
    const next = fmt(addDays(parse(data), 1));
    const temOntem = state.slots.some(s => s.userId === user.id && s.data === prev);
    const temAmanha = state.slots.some(s => s.userId === user.id && s.data === next);
    if (temOntem && temAmanha) motivos.push("⚠️ Cuidado: isso seria o 3º plantão seguido. Para a sua saúde e a segurança dos idosos, a casa pede descanso.");
    const ontemNoite = state.slots.some(s => s.userId === user.id && s.data === prev && s.turno === "noite");
    if (ontemNoite && turno === "dia") motivos.push("⚠️ Você trabalhou ontem à noite. A regra 12x36 pede descanso agora.");
    if (user.status !== "ativo") motivos.push("Seu cadastro ainda não foi liberado pela coordenação.");
    if (user.selo === "Em observação") motivos.push("Seu perfil está em observação. A coordenação precisa liberar este plantão extra.");
    return motivos;
  }

  function valorPlantao(u) {
    if (u.vinculo === "fixo") return 180;
    if (u.selo === "Reserva de Ouro") return 180;
    if (u.selo === "Confiável") return 165;
    return 150;
  }

  function atualizarSelo(u) {
    const manchaAtual = (u.manchas || []).includes(mesDe(fmt(today())));
    const ganhos = u.ganhos || 0;
    if (manchaAtual || (u.alegretes || 0) < 0) u.selo = "Em observação";
    else if (ganhos >= 30000) u.selo = "Reserva de Ouro";
    else u.selo = "Confiável";
  }
  function barraSelo(u) {
    const saldo = u.alegretes || 0;
    const ganhos = u.ganhos || 0;
    const alvo = 30000;
    const pct = Math.min(100, Math.round(ganhos / alvo * 100));
    return `<div class="card saldo-box">
      <p class="muted" style="margin:0">Sua pontuação. Com ela se compra na loja. Sem ela, não troca por nada.</p>
      <b class="saldo-num">${saldo.toLocaleString("pt-BR")}</b>
      <span>Alegretes agora</span>
      <div class="faixa-mini" style="height:12px;margin:10px 0 8px"><b style="width:${pct}%"></b></div>
      <p class="muted">${ganhos >= 30000 ? "Reserva de Ouro · " + ganhos.toLocaleString("pt-BR") + " ganhos na casa" : `Já ganhou ${ganhos.toLocaleString("pt-BR")} · faltam ${Math.max(0,alvo-ganhos).toLocaleString("pt-BR")} para Reserva de Ouro`}</p>
      <ul class="regras-pts">
        <li>Plantão cumprido: <b>+${A$(valorPlantao(u)*10)}</b></li>
        <li>Noite: <b>+200</b> · emergência da casa: <b>+400</b></li>
        <li>Mês limpo: <b>+800</b></li>
        <li>Soltou com menos de 48h: <b>−${(valorPlantao(u)*10).toLocaleString("pt-BR")}</b></li>
        <li>Guarda-chuva custa 50.000 · cerca de 33 plantões sem furo</li>
      </ul>
    </div>`;
  }
  function mesDe(data) { return (data || "").slice(0, 7); }
  function manchar(u, mes) {
    if (!u || !mes) return;
    u.manchas = u.manchas || [];
    if (!u.manchas.includes(mes)) u.manchas.push(mes);
  }
  function contarDupla(de, para, mes) {
    return (state.trocas || []).filter(t => t.mes === mes && t.de === de && t.para === para).length;
  }
  function pagarMesLimpo() {
    const t = today();
    const ant = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const m = `${ant.getFullYear()}-${String(ant.getMonth()+1).padStart(2,"0")}`;
    (state.users || []).forEach(u => {
      u.manchas = u.manchas || [];
      u.bonusMes = u.bonusMes || [];
      if (u.bonusMes.includes(m)) return;
      const fez = (state.slots || []).some(s => s.userId === u.id && s.saida && mesDe(s.data) === m);
      if (!fez) return;
      u.bonusMes.push(m);
      if (u.manchas.includes(m)) return;
      lancarAlegretes(u, 800, "Mês limpo");
    });
  }

  let state = load();
  function ajeitar(s) {
    s.trocas = s.trocas || [];
    s.avisos = s.avisos || [];
    s.falas = s.falas || [];
    s.insta = s.insta || [];
    s.notifs = s.notifs || [];
    (s.users || []).forEach(u => {
      if ((u.email || "").toLowerCase() === "alegrovivare@gmail.com") {
        u.id = "u-alegro";
        u.nome = "Alegro Vivare";
        u.cargo = "Casa";
        u.papel = "admin";
        u.loja = true;
        u.coordena = true;
      }
    });
    if (s.session === "u-edilson") s.session = "u-alegro";
    gerarGrade(s, today(), 3);
    return s;
  }
  state = ajeitar(state);
  pagarMesLimpo();
  save();

  let view = {
    page: "login", unidade: "courupita", mesOffset: 0, weekOffset: 0, modo: "semana", modal: null, sheet: null,
    fonteGrande: localStorage.getItem("alegro-fonte") === "1",
    confirm: null
  };
  function falar(texto) {
    try {
      const u = window.speechSynthesis;
      if (!u) return;
      u.cancel();
      const f = new SpeechSynthesisUtterance(texto);
      f.lang = "pt-BR"; f.rate = 0.95;
      u.speak(f);
    } catch (e) {}
  }
  function A$(n) { return "A$ " + Number(n || 0).toLocaleString("pt-BR"); }
  function notificar(userId, texto) {
    if (!userId) return;
    state.notifs = state.notifs || [];
    state.notifs.push({ id: "n-"+Date.now()+"-"+Math.random(), userId, texto, lido: false, quando: Date.now() });
  }
  function lancarAlegretes(u, qtd, texto) {
    if (!u) return;
    u.alegretes = Math.max(0, (u.alegretes || 0) + qtd);
    if (qtd > 0) u.ganhos = (u.ganhos || 0) + qtd;
    u.extrato = u.extrato || [];
    u.extrato.push({ qtd, texto, quando: Date.now() });
    atualizarSelo(u);
  }
  function extratoHTML(u) {
    const lista = (u.extrato || []).slice().reverse().slice(0, 12);
    if (!lista.length) return `<p class="muted">Ainda sem movimentos.</p>`;
    return `<div class="extrato">${lista.map(e => `<div class="ex-linha ${e.qtd>=0?"up":"down"}"><b>${e.qtd>=0?"+":""}${e.qtd}</b><span>${e.texto}</span></div>`).join("")}</div>`;
  }
  function avisoPendente(u) {
    const lidos = u.avisosLidos || [];
    return (state.avisos || []).slice().reverse().find(a => !lidos.includes(a.id));
  }
  function fotoUn(id) {
    const un = AV_SEED.unidades.find(x => x.id === id);
    return (un && un.foto) || "img/logo.png";
  }
  let audioCtx = null;
  function beep(kind) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      const map = { click: [420, 0.05], ok: [523, 0.09], coin: [784, 0.12], warn: [220, 0.16], in: [392, 0.08] };
      const [freq, dur] = map[kind] || map.click;
      o.frequency.value = freq;
      o.type = kind === "warn" ? "square" : "sine";
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now); o.stop(now + dur + 0.02);
    } catch (e) {}
  }

  function routeFromHash() {
    const h = (location.hash || "#/").replace("#/", "") || (state.session ? "home" : "login");
    view.page = h.split("?")[0] || "login";
    render();
  }

  window.addEventListener("hashchange", routeFromHash);

  function go(p) { view.verPerfil = null; location.hash = "#/" + p; }

  function render() {
    const root = document.getElementById("app");
    if (DEV_SEM_LOGIN) {
      state.session = state.session || "u-alegro";
      if (["login","cadastro","recuperar"].includes(view.page)) view.page = "perfil";
    }
    if (!state.session && !["login","cadastro","recuperar"].includes(view.page)) view.page = "login";
    if (state.session && ["login","cadastro","recuperar"].includes(view.page)) view.page = "home";
    document.documentElement.classList.toggle("fonte-grande", !!view.fonteGrande);
    if (!state.session && !DEV_SEM_LOGIN) root.innerHTML = renderAuth();
    else root.innerHTML = renderShell();
    bind();
    if (window.innerWidth < 800 && view.page === "calendario" && !view.modoTocado) view.modo = "semana";
    if (view.flash && !view.flashTimer) {
      view.flashTimer = setTimeout(() => { view.flash = ""; view.flashTimer = null; const el = document.querySelector(".flash"); if (el) el.remove(); }, 2800);
    }
  }

  function rodape() {
    return `<footer class="rodape">
      <img src="img/logo.png" alt="Alegro Vivare">
      <div>
        <strong>Alegro Vivare</strong> — Envelhecer com Alegria<br>
        Alegro Vivare · escala das três casas
      </div>
    </footer>`;
  }

  function renderAuth() {
    const form = view.page === "cadastro" ? cadastroHTML() : view.page === "recuperar" ? recuperarHTML() : loginHTML();
    return `<div class="auth-wrap">
      <div class="auth-art">
        <div>
          <img class="logo-hero" src="img/logo.png" alt="Alegro Vivare">
          <p>Escala das três casas, troca de plantão, presença e Alegretes — Courupita, Iretama e Tinguassu.</p>
          <div class="badge-row">
            <span class="pill">12×36 automático</span>
            <span class="pill">Semana e mês</span>
            <span class="pill">Benefícios</span>
          </div>
        </div>
        <div class="muted" style="color:#fff;opacity:.85">Envelhecer com Alegria</div>
      </div>
      <div class="auth-panel">${form}${rodape()}</div>
    </div>`;
  }

  function loginHTML() {
    return `<div class="auth-card">
      <div class="brand-mini"><img src="img/logo.png" alt="Alegro" class="logo-sm"><div><strong>Alegro Vivare</strong><div class="muted">Envelhecer com Alegria</div></div></div>
      <h2>Entrar</h2>
      <p class="muted">Entre com o e-mail e a senha cadastrados.</p>
      <div id="msg"></div>
      <label>E-mail</label><input id="email" type="email" placeholder="seu e-mail">
      <label>Senha</label><input id="senha" type="password" placeholder="senha">
      <button class="btn btn-green" id="btn-login">Entrar</button>
      <div class="links">
        <a href="#/cadastro">Criar cadastro</a>
        <a href="#/recuperar">Recuperar senha</a>
      </div>
    </div>`;
  }

  function cadastroHTML() {
    return `<div class="auth-card">
      <div class="brand-mini"><img src="img/logo.png" alt="Alegro" class="logo-sm"><strong>Cadastro</strong></div>
      <h2>Criar conta</h2>
      <p class="muted">Se você já é da Alegro Vivare, o 12×36 dos próximos 3 meses é preenchido sozinho.</p>
      <div id="msg"></div>
      <label>Nome completo</label><input id="nome">
      <label>E-mail</label><input id="email" type="email">
      <label>Senha</label><input id="senha" type="password">
      <label>Você é funcionária(o) da Alegro Vivare?</label>
      <select id="fixo">
        <option value="sim">Sim, sou da casa (fixo)</option>
        <option value="nao">Não, sou externo(a)</option>
      </select>
      <div id="bloco-fixo">
        <div class="row2">
          <div><label>Unidade</label>
            <select id="unidade">${AV_SEED.unidades.map(u=>`<option value="${u.id}">${u.nome}</option>`).join("")}</select>
          </div>
          <div><label>Horário fixo</label>
            <select id="turno">
              <option value="dia">07h às 19h (dia)</option>
              <option value="noite">19h às 07h (noite)</option>
            </select>
          </div>
        </div>
        <label>Você trabalhou hoje?</label>
        <select id="hoje">
          <option value="sim-mesmo">Sim, no meu horário</option>
          <option value="nao">Não. Meu próximo é amanhã</option>
        </select>
      </div>
      <button class="btn btn-green" id="btn-cadastro">Cadastrar</button>
      <div class="links"><a href="#/login">Já tenho conta</a></div>
    </div>`;
  }

  function recuperarHTML() {
    return `<div class="auth-card">
      <h2>Recuperar senha</h2>
      <p class="muted">Informe o e-mail da conta. A coordenação confirma a redefinição.</p>
      <div id="msg"></div>
      <label>E-mail</label><input id="email" type="email">
      <button class="btn btn-green" id="btn-recuperar">Redefinir</button>
      <div class="links"><a href="#/login">Voltar</a></div>
    </div>`;
  }

  function renderShell() {
    const u = me();
    const nNao = (state.notifs || []).filter(n => n.userId === u.id && !n.lido).length;
    const av = avisoPendente(u);
    const tab = (p) => (p === "home" && view.page === "home") || (p === "calendario" && view.page === "calendario") || (p === "loja" && view.page === "loja") || (p === "fala" && view.page === "fala") || (p === "mais" && ["mais","beneficios","painel","admin","avisos","perfil"].includes(view.page));
    const foto = u.foto ? `<img src="${u.foto}" alt="">` : `<span>${initials(u.nome)}</span>`;
    const desk = [
      ["home","Início"],
      ["calendario","Escala"],
      ["loja","Loja"],
      ["fala","Mensagens"],
      ["perfil","Perfil"],
      ["beneficios","Benefícios"],
    ];
    if (isCoord(u)) desk.push(["painel","Painel"]);
    if (isAdmin(u)) desk.push(["admin","Bônus"]);
    desk.push(["avisos", nNao ? "Avisos "+nNao : "Avisos"]);
    return `<div class="app-shell">
      <aside class="side">
        <img src="img/logo.png" alt="Alegro Vivare" class="logo-side">
        <div class="who"><strong>${u.nome}</strong><span>${u.cargo || ""}</span></div>
        ${desk.map(n => `<button class="nav ${view.page===n[0]?"on":""}" data-go="${n[0]}">${n[1]}</button>`).join("")}
        <div style="flex:1"></div>
        <button class="nav" type="button" id="btn-fonte-side">${view.fonteGrande ? "A− Letra normal" : "A+ Letra grande"}</button>
        <button class="nav" data-go="sair">Sair</button>
      </aside>
      <div>
        <header class="top-app">
          <img src="img/logo.png" alt="">
          <strong>Alegro Vivare</strong>
          <button class="icon-btn" data-go="avisos" aria-label="Avisos">${ico("bell")}${nNao?`<span class="badge">${nNao>99?"99+":nNao}</span>`:""}</button>
          <button class="icon-btn avatar-btn" data-go="perfil" aria-label="Perfil">${foto}</button>
        </header>
        <main class="main-app">${faixaAmanha(u)}${view.flash ? `<div class="flash">${view.flash}</div>` : ""}${pageHTML(u)}</main>
      </div>
    </div>
    <nav class="bottom-nav" aria-label="Principal">
      <button class="${view.page==="home"?"on":""}" data-go="home">${ico("home")}Início</button>
      <button class="${view.page==="calendario"?"on":""}" data-go="calendario">${ico("cal")}Escala</button>
      <button class="${view.page==="loja"?"on":""}" data-go="loja">${ico("gift")}Loja</button>
      <button class="${view.page==="fala"?"on":""}" data-go="fala">${ico("chat")}Mensagens</button>
      <button class="${tab("mais")?"on":""}" data-go="mais">${ico("more")}Mais</button>
    </nav>
    ${view.sheet ? sheetDiaHTML() : ""}${view.modal ? modalHTML() : ""}${view.confirm ? confirmarHTML() : ""}${av && !view.confirm ? avisoHTML(av) : ""}${view.premio ? premioHTML() : ""}`;
  }

  function pageHTML(u) {
    if (view.page === "calendario") return calendarioHTML(u);
    if (view.page === "perfil") return perfilHTML(u);
    if (view.page === "loja") return lojaHTML(u);
    if (view.page === "beneficios") return beneficiosHTML(u);
    if (view.page === "fala") return falaHTML(u);
    if (view.page === "avisos") return avisosHTML(u);
    if (view.page === "mais") return maisHTML(u);
    if (view.verPerfil) return vitrineHTML(userById(view.verPerfil) || u);
    if (view.page === "painel") return painelHTML(u);
    if (view.page === "admin") return adminHTML(u);
    if (view.page === "home") return homeHTML(u);
    return homeHTML(u);
  }

  function homeHTML(u) {
    const meus = state.slots.filter(s => s.userId === u.id && s.data >= fmt(today()) && s.status === "confirmado").sort((a,b)=>a.data.localeCompare(b.data)).slice(0, 5);
    const prox = meus[0];
    const hojeTxt = today().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    const avisos = (state.notifs || []).filter(n => n.userId === u.id && !n.lido).slice(0, 3);
    const pend = state.pedidos.filter(p => p.status === "pendente").length;
    return `<p class="page-kicker">${hojeTxt}</p>
    <h1 class="page-title">Olá, ${firstName(u.nome)}</h1>
    <article class="aero-card shift-card">
      <p class="muted">Próximo plantão</p>
      ${prox ? `<h3>${prox.data === fmt(today()) ? "Hoje" : rotuloQuando(prox)} · ${rotuloTurno(prox)}</h3>
        <p>${nomeUn(prox.unidade)}</p>
        <button class="btn btn-green" data-go="calendario" style="margin-top:8px">Ver na escala</button>` : `<p>Nenhum plantão confirmado à frente.</p>
        <button class="btn btn-green" data-go="calendario">Ver vagas</button>`}
    </article>
    <div class="atalhos">
      <button class="atalho" data-go="calendario">Minha escala</button>
      <button class="atalho" data-go="calendario">Vagas</button>
      <button class="atalho" data-go="loja">Loja</button>
      <button class="atalho" data-go="fala">Mensagens</button>
    </div>
    <article class="aero-card">
      <div class="cofre" style="margin:0;width:100%;border:0;background:transparent;padding:0">
        <span class="moeda-grande">A$</span>
        <div><b>${A$(u.alegretes)}</b><span>no cofre</span></div>
      </div>
    </article>
    ${avisos.length ? `<article class="aero-card" style="margin-top:12px"><h3>Avisos</h3>${avisos.map(a=>`<p>${a.texto}</p>`).join("")}<button class="btn btn-ghost btn-small" data-go="avisos">Ver todos</button></article>` : ""}
    <article class="aero-card" style="margin-top:12px">
      <h3>Próximos plantões</h3>
      ${meus.length ? `<div class="lista-pl">${meus.map(s => `<button data-go="calendario"><b>${rotuloQuando(s)}</b> · ${nomeUn(s.unidade)} · ${s.turno==="dia"?"Dia":"Noite"}</button>`).join("")}</div>` : `<p class="muted">Nada marcado. Abra a Escala.</p>`}
      ${isCoord(u) && pend ? `<p class="chip-warn">${pend} pedido(s) no painel</p>` : ""}
    </article>`;
  }

  function maisHTML(u) {
    return `<h1 class="page-title">Mais</h1>
      <div class="mais-list">
        <button data-go="perfil">Meu perfil</button>
        <button data-go="beneficios">Benefícios</button>
        <button data-go="avisos">Avisos</button>
        ${isCoord(u) ? `<button data-go="painel">Painel da coordenação</button>` : ""}
        ${isAdmin(u) ? `<button data-go="admin">Loja e bônus</button>` : ""}
        <button type="button" id="btn-fonte">${view.fonteGrande ? "Letra normal" : "Letra grande"}</button>
        <button data-go="sair">Sair</button>
      </div>`;
  }

  function nomeUn(id) { return (AV_SEED.unidades.find(u => u.id === id) || {}).nome || id; }
  function rotuloTurno(s) {
    if (s.turno === "dia") return "07:00–19:00";
    const fim = fmt(addDays(parse(s.data), 1));
    return `19:00 → ${fim.slice(8,10)}/${fim.slice(5,7)} 07:00`;
  }
  function rotuloQuando(s) {
    const [y,m,d] = s.data.split("-");
    return `${d}/${m}`;
  }
  function resumoTurno(arr) {
    const fill = arr.filter(s => s.userId && s.status !== "mural").length;
    const mural = arr.filter(s => s.status === "mural").length;
    const extra = mural ? ` · ${mural} no mural` : "";
    return `${fill}/${arr.length}${extra}`;
  }

  function inicioSemana() {
    const t = today();
    const start = addDays(t, -t.getDay() + view.weekOffset * 7);
    start.setHours(0,0,0,0);
    return start;
  }
  function classePv(s) {
    if (s.status === "emergencia") return "emergencia";
    if (s.status === "mural" || s.status === "pendente") return "pendente";
    if (!s.userId) return "livre";
    const u = userById(s.userId);
    if (u && u.vinculo === "externo") return "externo";
    return "confirmado";
  }
  function semanaHTML(unidade) {
    const start = inicioSemana();
    const dias = [];
    for (let i=0;i<7;i++) dias.push(addDays(start, i));
    const titulo = `${dias[0].getDate()} a ${dias[6].getDate()} de ${MESES[dias[0].getMonth()]}`;
    const casa = AV_SEED.unidades.find(x => x.id === unidade);
    return `<div class="agenda-nav">
        <button class="btn btn-small btn-ghost" id="week-prev" aria-label="Semana anterior">◀</button>
        <div style="text-align:center"><b>${casa ? casa.nome : ""}</b><div class="muted">${titulo}</div></div>
        <button class="btn btn-small btn-ghost" id="week-next" aria-label="Próxima semana">▶</button>
      </div>
      <div class="agenda-grid">${dias.map(d => {
        const key = fmt(d);
        const hoje = key === fmt(today());
        const diaSlots = state.slots.filter(s => s.data===key && s.unidade===unidade && s.turno==="dia");
        const noiteSlots = state.slots.filter(s => s.data===key && s.unidade===unidade && s.turno==="noite");
        const bloco = (arr, tituloT) => {
          const fill = arr.filter(s => s.userId && s.status !== "mural").length;
          const falta = arr.length - fill;
          const nomes = arr.filter(s => s.userId).map(s => firstName((userById(s.userId)||{}).nome||"")).join(", ");
          const livre = arr.find(s => !s.userId);
          return `<article class="aero-card turno-card">
            <header><b>${tituloT}</b><span class="${falta?"chip-warn":"chip-ok"}">${falta ? "Falta "+falta : "Completo"} · ${fill}/${arr.length}</span></header>
            <div class="nomes-turno">${nomes || "Ninguém ainda"}</div>
            ${livre ? `<button class="btn btn-green btn-small" data-vaga="${livre.id}" style="margin-top:8px">Assumir vaga</button>` : `<button class="btn btn-ghost btn-small" data-dia="${key}" style="margin-top:8px">Ver equipe</button>`}
          </article>`;
        };
        const nomeDia = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][d.getDay()];
        return `<section class="agenda-dia">
          <div class="when">${hoje?"HOJE · ":""}${nomeDia} ${d.getDate()}</div>
          ${bloco(diaSlots, "Turno dia 07–19")}
          ${bloco(noiteSlots, "Turno noite 19–07")}
        </section>`;
      }).join("")}</div>`;
  }
  function faixaAmanha(u) {
    const amanha = fmt(addDays(today(), 1));
    const s = state.slots.find(x => x.userId === u.id && x.data === amanha && x.status === "confirmado");
    if (!s) return "";
    return `<button class="faixa-amanha" data-go="calendario">Amanhã você está na ${nomeUn(s.unidade)} · ${rotuloTurno(s)}</button>`;
  }
  function avisosHTML(u) {
    const lista = (state.notifs || []).filter(n => n.userId === u.id).slice().reverse();
    lista.filter(n => !n.lido).forEach(n => n.lido = true);
    save();
    return `<div class="topbar"><h1>Sino</h1><p class="muted">Só o que muda a sua escala.</p></div>
      <div class="card">${lista.length ? lista.map(n => `<div class="recado"><b>${new Date(n.quando).toLocaleString("pt-BR")}</b><span>${n.texto}</span></div>`).join("") : `<p class="muted">Nada novo.</p>`}</div>`;
  }
  function premioHTML() {
    const p = view.premio;
    const cls = p.tipo === "perda" ? "perda" : "";
    return `<div class="premio-bg"><div class="premio ${cls}">
      <b>${p.tipo === "perda" ? "− " : "+ "}${A$(p.qtd)}</b>
      <span>${p.texto || ""}</span>
    </div></div>`;
  }

  function mesVisivel() {
    const t = today();
    return new Date(t.getFullYear(), t.getMonth() + view.mesOffset, 1);
  }

  function calendarioHTML(u) {
    const mes = mesVisivel();
    const y = mes.getFullYear(), m = mes.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m+1, 0);
    const startPad = first.getDay();
    const cells = [];
    for (let i=0;i<startPad;i++) cells.push(null);
    for (let d=1; d<=last.getDate(); d++) cells.push(new Date(y,m,d));
    while (cells.length % 7) cells.push(null);

    return `<h1 class="page-title">Escala</h1>
    <div class="unit-seg" role="tablist">
      ${AV_SEED.unidades.map(un => `<button class="${view.unidade===un.id?"on":""}" data-un="${un.id}">${un.nome}</button>`).join("")}
    </div>
    <div class="seg" style="margin:10px 0">
      <button class="${view.modo==="semana"?"on":""}" data-modo="semana">Semana</button>
      <button class="${view.modo==="mes"?"on":""}" data-modo="mes">Mês</button>
    </div>
    ${view.modo === "semana" ? semanaHTML(view.unidade) : mesMiniHTML(cells, y, m)}
    <div class="legend">
      <span><i class="dot confirmado"></i>Completo</span>
      <span><i class="dot pendente"></i>Falta gente</span>
      <span><i class="dot livre"></i>Aberto</span>
      <span><i class="dot emergencia"></i>Urgente</span>
    </div>`;
  }

  function mesMiniHTML(cells, y, m) {
    const wds = ["D","S","T","Q","Q","S","S"];
    return `<div class="agenda-nav">
      <button class="btn btn-small" id="mes-prev" ${view.mesOffset<=0?"disabled":""}>◀</button>
      <b>${MESES[m]} ${y}</b>
      <button class="btn btn-small" id="mes-next" ${view.mesOffset>=2?"disabled":""}>▶</button>
    </div>
    <div class="mes-mini">${wds.map(w=>`<div class="mes-wd">${w}</div>`).join("")}${cells.map(d => {
      if (!d) return `<div class="day-mini empty"></div>`;
      const key = fmt(d);
      const slots = state.slots.filter(s => s.data===key && s.unidade===view.unidade);
      const dia = slots.filter(s => s.turno==="dia");
      const noite = slots.filter(s => s.turno==="noite");
      const mark = (arr) => {
        const fill = arr.filter(s => s.userId && s.status!=="mural").length;
        if (arr.some(s => s.status==="emergencia")) return "bad";
        if (!arr.length) return "off";
        if (fill === arr.length) return "ok";
        if (fill === 0) return "off";
        return "mid";
      };
      return `<button class="day-mini ${key===fmt(today())?"hoje":""}" data-dia="${key}">${d.getDate()}<span class="dots"><i class="${mark(dia)}"></i><i class="${mark(noite)}"></i></span></button>`;
    }).join("")}</div>`;
  }

  function sheetDiaHTML() {
    const key = view.sheet;
    const [yy,mm,dd] = key.split("-");
    const unidade = view.unidade;
    const bloco = (turno, titulo) => {
      const arr = state.slots.filter(s => s.data===key && s.unidade===unidade && s.turno===turno);
      const fill = arr.filter(s => s.userId && s.status!=="mural").length;
      const livre = arr.find(s => !s.userId);
      const nomes = arr.map(s => {
        const u = s.userId ? userById(s.userId) : null;
        return `<div class="vaga-line"><span>${u ? u.nome : "Vaga livre"}</span>${!s.userId?`<button class="btn btn-small btn-green" data-vaga="${s.id}">Assumir</button>`:""}</div>`;
      }).join("");
      return `<h3>${titulo} · ${fill}/${arr.length}</h3>${nomes || "<p class='muted'>Sem vaga</p>"}${livre?"":""}`;
    };
    return `<div class="sheet-bg" id="fecha-sheet"><div class="sheet" onclick="event.stopPropagation()">
      <b>${dd}/${mm}</b> · ${nomeUn(unidade)}
      ${bloco("dia","Dia 07–19")}
      ${bloco("noite","Noite 19–07")}
      <button class="btn btn-ghost" id="fecha-sheet-btn" style="margin-top:12px">Fechar</button>
    </div></div>`;
  }

  function corDot(slot) {
    if (slot.status === "emergencia" || slot.status === "furo") return "emergencia";
    if (slot.status === "mural") return "pendente";
    if (!slot.userId) return "livre";
    if (slot.status === "pendente") return "pendente";
    if (slot.saida) return "confirmado";
    if (slot.chegada) return "presenca confirmado";
    const u = userById(slot.userId);
    if (u && u.vinculo === "externo") return "externo";
    return "confirmado";
  }

  function ocupacao(arr) {
    const fill = arr.filter(s => s.userId && s.status !== "mural" && s.status !== "emergencia").length;
    const total = arr.length || 1;
    const emer = arr.some(s => s.status === "emergencia");
    return { fill, total, pct: Math.round(fill / total * 100), emer };
  }
  function chipsNomes(arr) {
    return arr.filter(s => s.userId).map(s => {
      const u = userById(s.userId);
      const cls = s.status === "mural" || s.status === "pendente" ? "nm wait" : "nm";
      return `<span class="${cls}">${u ? firstName(u.nome) : "?"}</span>`;
    }).join("");
  }
  function diaHTML(d, unidade) {
    if (!d) return `<div class="day empty"></div>`;
    const key = fmt(d);
    const diaSlots = state.slots.filter(s => s.data===key && s.unidade===unidade && s.turno==="dia");
    const noiteSlots = state.slots.filter(s => s.data===key && s.unidade===unidade && s.turno==="noite");
    const od = ocupacao(diaSlots), on = ocupacao(noiteSlots);
    const allFill = od.fill + on.fill, allTot = od.total + on.total;
    let tone = "void";
    if (od.emer || on.emer) tone = "alert";
    else if (allFill === allTot) tone = "ok";
    else if (allFill > 0) tone = "mid";
    const isToday = key === fmt(today());
    return `<div class="day ${tone} ${isToday?"today":""}" data-dia="${key}">
      <div class="n">${d.getDate()}</div>
      <div class="faixa-mini">
        <span>Dia ${od.fill}/${od.total}</span>
        <b style="width:${od.pct}%"></b>
      </div>
      <div class="chips-nm">${chipsNomes(diaSlots)}</div>
      <div class="faixa-mini noite">
        <span>Noite ${on.fill}/${on.total}</span>
        <b style="width:${on.pct}%"></b>
      </div>
      <div class="chips-nm">${chipsNomes(noiteSlots)}</div>
    </div>`;
  }

  function resumoUnidade(unidade, y, m) {
    const prefix = `${y}-${String(m+1).padStart(2,"0")}`;
    const slots = state.slots.filter(s => s.unidade===unidade && s.data.startsWith(prefix));
    const byDayTurno = {};
    slots.forEach(s => {
      const k = s.data+"|"+s.turno;
      byDayTurno[k] = byDayTurno[k] || {total:0, fill:0};
      byDayTurno[k].total++;
      if (s.userId && s.status !== "mural" && s.status !== "emergencia") byDayTurno[k].fill++;
    });
    const incompletos = Object.values(byDayTurno).filter(x => x.fill > 0 && x.fill < x.total).length;
    const vazios = Object.values(byDayTurno).filter(x => x.fill === 0).length;
    return `Célula verde = turno cheio · amarela = faltando gente · clara = ainda sem escala. ${incompletos} incompletos neste mês.`;
  }

  function modalHTML() {
    const m = view.modal;
    if (!m || m.tipo !== "dia") return "";
    const u = me();
    const diaSlots = state.slots.filter(s => s.data===m.data && s.unidade===m.unidade);
    const grupos = { dia: diaSlots.filter(s=>s.turno==="dia"), noite: diaSlots.filter(s=>s.turno==="noite") };
    const bloco = (turno, titulo) => `<h3>${titulo}</h3>${grupos[turno].map(s => {
      const p = s.userId ? userById(s.userId) : null;
      const meu = p && p.id === u.id;
      let acoes = "";
      if (!p || s.status === "mural" || s.status === "emergencia") {
        acoes = `<button class="btn btn-small btn-green" data-assinar="${s.id}">Quero este plantão</button>`;
      } else if (meu && s.status === "confirmado" && !s.chegada) {
        acoes = `<button class="btn btn-small btn-gold" data-chegada="${s.id}">Registrar chegada</button>`;
      } else if (meu && s.chegada && !s.saida) {
        acoes = `<button class="btn btn-small btn-gold" data-saida="${s.id}">Registrar saída</button>`;
      } else if (meu && s.data >= fmt(today()) && s.status === "confirmado") {
        acoes = `<button class="btn btn-small btn-ghost" data-liberar="${s.id}">Oferecer no mural</button>`;
      }
      if (isCoord(u) && p && s.status !== "mural") acoes += ` <button class="btn btn-small btn-ghost" data-tirar="${s.id}">Tirar</button>`;
      if (isCoord(u) && (!p || s.status === "mural")) acoes += ` <button class="btn btn-small btn-ghost" data-emerg="${s.id}">Marcar emergência</button>`;
      const st = s.status === "mural" ? "no mural (titular ainda responsável)" : s.status;
      const chk = s.saida ? " · saída ok" : s.chegada ? " · chegou" : "";
      const hist = (s.historico || []).map(h => `${firstName((userById(h.de)||{}).nome||"?")} → ${firstName((userById(h.para)||{}).nome||"?")}`).join(" · ");
      return `<div class="vaga-line"><div><b>Vaga ${s.idx+1}</b><div class="muted">${p ? p.nome + (p.vinculo==="externo"?" · externo":"") : "Livre"} · ${st}${chk}${hist ? "<br>Trocas: "+hist : ""}${s.bonusEmergencia?" · emergência da casa":""}</div></div><div>${acoes}</div></div>`;
    }).join("")}`;
    return `<div class="modal-bg" id="fechar-modal"><div class="modal" id="modal-box">
      <h2>${m.data} · ${nomeUn(m.unidade)}</h2>
      <p class="muted">Titular só sai quando outra pessoa assume. Chegada não paga ponto; saída encerra o plantão.</p>
      ${bloco("dia","Dia 07:00–19:00")}
      ${bloco("noite","Noite 19:00 → manhã 07:00")}
      <button class="btn btn-ghost" style="margin-top:12px" id="xmodal">Fechar</button>
    </div></div>`;
  }

  function blocoAcao(u) {
    const hoje = fmt(today());
    const meuHoje = state.slots.filter(s => s.userId === u.id && s.data === hoje && s.status === "confirmado");
    const ponto = meuHoje.map(s => {
      if (!s.chegada) return `<button class="btn btn-ponto" data-chegada="${s.id}">REGISTRAR CHEGADA · ${nomeUn(s.unidade)} ${rotuloTurno(s)}</button>`;
      if (!s.saida) return `<button class="btn btn-ponto saida" data-saida="${s.id}">REGISTRAR SAÍDA · ${nomeUn(s.unidade)} ${rotuloTurno(s)}</button>`;
      return `<p class="muted">Ponto de hoje já fechado · ${nomeUn(s.unidade)}</p>`;
    }).join("");
    const urg = state.slots.filter(s => s.data >= hoje && s.data <= fmt(addDays(today(), 2)) && (!s.userId || s.status === "emergencia" || s.status === "mural"));
    const casas = [...new Set(urg.map(s => s.unidade))];
    return `${ponto ? `<div class="card ponto-hoje">${ponto}</div>` : ""}
      ${urg.length ? `<button class="alerta-urgente" data-go="calendario">⚠️ ${urg.length} vaga(s) sem gente nas próximas 48h${casas.length? " · "+casas.map(nomeUn).join(", "):""}<br><b>Ver vagas livres para cobrir</b></button>` : `<button class="btn btn-green" data-go="calendario">Ver vagas livres para cobrir hoje</button>`}`;
  }
  function confirmarHTML() {
    const c = view.confirm;
    return `<div class="modal-bg"><div class="modal confirm-box">
      <h2>${c.texto}</h2>
      <button class="btn btn-green btn-gigante" id="confirm-sim">SIM, EU VOU</button>
      <button class="btn btn-ghost btn-gigante" id="confirm-nao">CANCELAR</button>
    </div></div>`;
  }
  function avisoHTML(av) {
    return `<div class="modal-bg"><div class="modal confirm-box">
      <p class="muted">Aviso da direção</p>
      <h2>${av.texto}</h2>
      <button class="btn btn-green btn-gigante" id="btn-li">LI E ENTENDI</button>
    </div></div>`;
  }
  function perfilHTML(u) {
    const hoje = fmt(today());
    const capa = u.capa || "img/capa-jardim.jpg";
    /* perfil compacto mobile */
    const foto = u.foto || "";
    const recados = u.recados || [];
    const album = u.album || [];
    const amigos = state.users.filter(x => x.id !== u.id && x.status === "ativo");
    const topIds = u.top8 || [];
    const top = topIds.map(id => userById(id)).filter(Boolean);
    const resto = amigos.filter(a => !topIds.includes(a.id));
    while (top.length < 8 && resto.length) top.push(resto.shift());
    const seloCls = u.selo==="Reserva de Ouro"?"selo-ouro":u.selo==="Em observação"?"selo-obs":"selo-ok";
    const meuHoje = state.slots.filter(s => s.userId === u.id && s.data === hoje && s.status === "confirmado");
    const ponto = meuHoje.map(s => {
      if (!s.chegada) return `<button class="btn btn-ponto" data-chegada="${s.id}">Cheguei · ${nomeUn(s.unidade)}</button>`;
      if (!s.saida) return `<button class="btn btn-ponto saida" data-saida="${s.id}">Estou saindo · ${nomeUn(s.unidade)}</button>`;
      return "";
    }).join("");
    return `<div class="bebo perfil-app">
      <label class="bebo-capa" style="background-image:url('${capa}')">
        <span>Trocar capa</span>
        <input type="file" accept="image/*" id="up-capa" hidden>
      </label>
      ${u.capa ? `<button type="button" class="btn btn-small btn-ghost" id="tira-capa" style="margin:8px 0">Tirar capa</button>` : ""}
      <div class="bebo-body">
        <aside class="bebo-left">
          <div class="bebo-foto">
            ${foto ? `<img src="${foto}" alt="">` : `<img src="img/logo.png" alt="">`}
            <label class="btn-foto">Trocar foto<input type="file" accept="image/*" id="up-foto" hidden></label>
            ${foto ? `<button type="button" class="btn-foto" id="tira-foto">Tirar foto</button>` : ""}
          </div>
          <div class="card bebo-about">
            <h3>Sobre mim</h3>
            <textarea id="frase" rows="3" placeholder="Uma frase…">${u.frase || ""}</textarea>
            <button class="btn btn-green" id="salvar-frase">Salvar</button>
            <p class="muted" style="margin:10px 0 0">${u.cargo || "Cuidador(a)"} · ${u.unidade ? nomeUn(u.unidade) : "as 3 casas"}</p>
            <span class="selo ${seloCls}">${u.selo}</span>
          </div>
          <div class="card">
            <h3>Álbum</h3>
            <div class="album">${album.map(f=>`<img src="${f}" alt="">`).join("")}${album.length<8?`<label class="album-add">+<input type="file" accept="image/*" id="up-album" hidden></label>`:""}</div>
          </div>
        </aside>
        <section class="bebo-main">
          <div class="bebo-hello">
            <h1>${u.nome}</h1>
            <p class="orkut-frase">${u.frase || "Escreve uma frase no Sobre mim…"}</p>
            <div class="cofre">
              <span class="moeda-grande">A$</span>
              <div>
                <b>${A$(u.alegretes)}</b>
                <span>no cofre</span>
              </div>
            </div>
          </div>
          ${ponto ? `<div class="orkut-ponto">${ponto}</div>` : ""}
          <div class="card recados-card">
            <h3>Recados</h3>
            <div class="recados">${recados.length ? recados.slice().reverse().map(r => `<div class="recado"><b>${r.de}</b><span>${r.texto}</span></div>`).join("") : `<p class="muted">Ninguém escreveu ainda. Manda o primeiro recado.</p>`}</div>
            <select id="recado-para">
              <option value="${u.id}">No meu mural</option>
              ${amigos.slice(0,20).map(a=>`<option value="${a.id}">Para ${firstName(a.nome)}</option>`).join("")}
            </select>
            <input id="recado-txt" placeholder="Escreve um recado…">
            <button class="btn btn-gold" id="btn-recado" style="width:auto;margin-top:8px">Publicar</button>
          </div>
          <div class="card" style="margin-top:12px">
            <h3>Destaques</h3>
            <p class="muted">Até 6 fotos grandes, no jeito do Insta.</p>
            <div class="destaques">${(album.slice(0,6).length?album.slice(0,6):["img/capa-jardim.jpg","img/capa-sala.jpg","img/casa-courupita.jpg","img/casa-iretama.jpg","img/casa-tinguassu.jpg","img/logo.png"]).map((f,i)=>`<img src="${f}" alt="destaque ${i+1}">`).join("")}</div>
          </div>
          <div class="card" style="margin-top:12px">
            <h3>No Insta da Alegro</h3>
            <p class="muted">Manda a foto. O Edilson escolhe a legenda e posta. Se for no ar, você ganha 2.000 Alegretes.</p>
            <label class="insta-up">Anexar foto
              <input type="file" accept="image/*" id="up-insta" hidden>
            </label>
            <div id="insta-prev" class="insta-prev"></div>
            <input id="insta-txt" placeholder="Sugestão de legenda (opcional)">
            <button class="btn btn-green" id="btn-insta" style="width:auto;margin-top:8px">Enviar para avaliação</button>
            ${((state.insta||[]).filter(p=>p.userId===u.id).slice().reverse().map(p=>`
              <div class="insta-item">
                <img src="${p.foto}" alt="">
                <div>
                  <b>${p.status==="aprovado"?"No ar":p.status==="negado"?"Não vai":"Aguardando"}</b>
                  <div class="muted">${p.caption || p.sugestao || ""}</div>
                </div>
              </div>`).join(""))}
          </div>
        </section>
        <aside class="bebo-right">
          <div class="card">
            <h3>Meus 8</h3>
            <p class="muted">Toca numa foto para entrar ou sair.</p>
            <div class="top8">${top.map((a,i)=>`
              <button type="button" class="top8-item ${(u.top8||[]).includes(a.id)?"on":""}" data-top="${a.id}">
                ${a.foto?`<img src="${a.foto}" alt="">`:`<i>${initials(a.nome)}</i>`}
                <em>${i+1}</em>
                <span>${firstName(a.nome)}</span>
              </button>`).join("")}</div>
          </div>
          <div class="card" style="margin-top:12px">
            <h3>Gente da Alegro</h3>
            <div class="amigos">${amigos.slice(0,12).map(a => `
              <button type="button" class="amigo" data-ver="${a.id}">
                ${a.foto?`<img src="${a.foto}">`:`<i>${initials(a.nome)}</i>`}
                <span>${firstName(a.nome)}</span>
              </button>`).join("")}</div>
          </div>
        </aside>
      </div>
      <div class="bebo-foot">
        <img src="img/casa-courupita.jpg" alt="Courupita">
        <img src="img/casa-iretama.jpg" alt="Iretama">
        <img src="img/casa-tinguassu.jpg" alt="Tinguassu">
      </div>
    </div>`;
  }

  function vitrineHTML(p) {
    if (!p) return `<p>Pessoa não encontrada.</p>`;
    const capa = p.capa || "img/capa-jardim.jpg";
    const recados = p.recados || [];
    const album = p.album || [];
    return `<div class="bebo">
      <div class="bebo-capa" style="background-image:url('${capa}')"></div>
      <div class="bebo-body">
        <aside class="bebo-left">
          <div class="bebo-foto">${p.foto ? `<img src="${p.foto}" alt="">` : `<img src="img/logo.png" alt="">`}</div>
          <div class="card"><p class="muted">${p.cargo || "Cuidador(a)"} · ${p.unidade ? nomeUn(p.unidade) : ""}</p>
            <span class="selo selo-ok">${p.selo || "Confiável"}</span></div>
        </aside>
        <section class="bebo-main">
          <div class="bebo-hello">
            <h1>${p.nome}</h1>
            <p class="orkut-frase">${p.frase || ""}</p>
            <button class="btn btn-ghost" data-go="perfil">Voltar ao meu Início</button>
          </div>
          <div class="card recados-card">
            <h3>Recados</h3>
            <div class="recados">${recados.length ? recados.slice().reverse().map(r => `<div class="recado"><b>${r.de}</b><span>${r.texto}</span></div>`).join("") : `<p class="muted">Mural quieto.</p>`}</div>
            <input id="recado-txt" placeholder="Escreve um recado para ${firstName(p.nome)}…">
            <select id="recado-para" hidden><option value="${p.id}" selected></option></select>
            <button class="btn btn-gold" id="btn-recado" style="width:auto;margin-top:8px">Publicar</button>
          </div>
          ${album.length ? `<div class="card" style="margin-top:12px"><h3>Álbum</h3><div class="destaques">${album.slice(0,6).map(f=>`<img src="${f}" alt="">`).join("")}</div></div>` : ""}
        </section>
      </div>
    </div>`;
  }
  function lojaHTML(u) {
    const meus = state.resgates.filter(r => r.userId === u.id);
    const saldo = u.alegretes || 0;
    const ganho = valorPlantao(u) * 10;
    return `<div class="loja-hero">
      <div>
        <p class="muted" style="margin:0">Seu cofre</p>
        <b class="saldo-num">${A$(saldo)}</b>
        <span>A$ compra na loja</span>
      </div>
      <div class="loja-hero-meta">
        <div><b>+ ${A$(ganho)}</b><span>cada plantão cumprido</span></div>
        <div><b>${A$(50000)}</b><span>item mais barato</span></div>
      </div>
    </div>
    <div class="loja-grid">${AV_SEED.loja.map(item => {
      const falta = Math.max(0, item.custo - saldo);
      const pct = Math.min(100, Math.round(saldo / item.custo * 100));
      const ok = saldo >= item.custo;
      return `<div class="item loja-item">
        <div class="loja-foto-wrap"><img src="${item.foto || "img/logo.png"}" alt="${item.nome}"></div>
        <h3>${item.nome}</h3>
        <p class="preco-loja">${A$(item.custo)}</p>
        <div class="faixa-mini"><b style="width:${pct}%"></b></div>
        <p class="muted">${ok ? "Pode pedir agora" : "Faltam " + falta.toLocaleString("pt-BR")}</p>
        <button class="btn ${ok?"btn-green":"btn-ghost"}" data-resgatar="${item.id}" ${ok?"":"disabled"}>${ok?"Pedir resgate":"Ainda não"}</button>
      </div>`;
    }).join("")}</div>
    <div class="card" style="margin-top:16px">
      <h3>Meus pedidos</h3>
      ${meus.length ? `<table><tr><th>Item</th><th>Status</th></tr>${meus.map(r=>`<tr><td>${r.nome}</td><td>${r.status}</td></tr>`).join("")}</table>` : `<p class="muted">Nenhum pedido ainda.</p>`}
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Extrato de Alegretes</h3>
      ${extratoHTML(u)}
    </div>`;
  }

  function beneficiosHTML() {
    const s = AV_SEED.sindicato;
    return `<div class="topbar"><div><h1>Benefícios</h1><p class="muted">O que a equipe pode usar no dia a dia.</p></div></div>
    <div class="card" style="margin-bottom:14px">
      <p>Convênios e descontos para quem trabalha nas casas. O pedido é no link de cada item.</p>
    </div>
    <div class="loja-grid">${AV_SEED.beneficios.map(b => `
      <div class="item bene">
        <div class="bene-foto" style="background-image:url('${b.foto}')"></div>
        <span class="selo selo-ok">${b.cat}</span>
        <h3>${b.nome}</h3>
        <p class="muted">${b.desc}</p>
        <a class="btn btn-green" href="${b.url}" target="_blank" rel="noopener" data-bene="${b.id}">${b.cta}</a>
      </div>`).join("")}</div>
    <p class="muted" style="margin-top:12px"><a href="${s.site}" target="_blank" rel="noopener">Ver todos os benefícios</a></p>`;
  }

  function falaHTML(u) {
    const minhas = (state.falas || []).filter(f => f.userId === u.id).slice().reverse();
    return `<div class="topbar">
      <div><h1>Mensagens</h1><p class="muted">Um recado para a casa. Resposta única. Não é chat.</p></div>
    </div>
    <div class="card">
      <label>O que é</label>
      <select id="fala-tipo">
        <option value="ideia">Sugestão ou ideia</option>
        <option value="problema">Problema da casa</option>
      </select>
      <label>De qual casa</label>
      <select id="fala-casa">
        ${AV_SEED.unidades.map(un => `<option value="${un.id}" ${u.unidade===un.id?"selected":""}>${un.nome}</option>`).join("")}
      </select>
      <label>Urgente?</label>
      <select id="fala-urgente">
        <option value="nao">Não</option>
        <option value="sim">Sim, precisa olhar hoje</option>
      </select>
      <label>Seu recado</label>
      <textarea id="fala-txt" rows="4" placeholder="Escreva curto e direto."></textarea>
      <button class="btn btn-green" id="btn-fala" style="width:auto;margin-top:10px">Enviar para o Edilson</button>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Seus recados</h3>
      ${minhas.length ? minhas.map(f => cardFala(f, false)).join("") : `<p class="muted">Nada enviado ainda.</p>`}
    </div>`;
  }
  function cardFala(f, gestor) {
    const autor = userById(f.userId);
    const tipo = f.tipo === "problema" ? "Problema" : "Ideia";
    return `<div class="vaga-line ${f.urgente?"urgente-fala":""}" style="align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1">
        <b>${tipo}${f.urgente?" · urgente":""}</b> · ${nomeUn(f.unidade)}
        <div class="muted">${autor?autor.nome:""} · ${f.status==="respondido"?"respondido":"aberto"}</div>
        <p style="margin:8px 0 0">${f.texto}</p>
        ${f.resposta ? `<p class="ok" style="margin:8px 0 0"><b>Edilson:</b> ${f.resposta}</p>` : ""}
        ${gestor && f.status!=="respondido" ? `<div style="margin-top:8px"><input id="resp-${f.id}" placeholder="Resposta curta"><button class="btn btn-small btn-green" data-resp="${f.id}" style="width:auto;margin-top:6px">Responder</button></div>` : ""}
      </div>
    </div>`;
  }
  function caixaFalasHTML() {
    const u = me();
    let lista = (state.falas || []).slice().reverse();
    if (!isAdmin(u)) lista = lista.filter(f => f.tipo === "problema");
    const abertas = lista.filter(f => f.status !== "respondido");
    return `<div class="card" style="margin-top:12px">
      <h3>Fala com a casa</h3>
      <p class="muted">${abertas.length} aberto(s) · ideia só o Edilson responde · problema a coordenação também vê</p>
      ${lista.length ? lista.map(f => cardFala(f, true)).join("") : `<p class="muted">Nenhum recado.</p>`}
    </div>`;
  }
  function painelHTML(u) {
    if (!isCoord(u)) return `<p>Sem acesso.</p>`;
    const pendCad = state.users.filter(x => x.status === "pendente");
    const pendPed = state.pedidos.filter(p => p.status === "pendente");
    const limite = fmt(addDays(today(), 3));
    const risco = state.slots.filter(s => s.data >= fmt(today()) && s.data <= limite && (
      !s.userId || s.status === "mural" || s.status === "emergencia" || s.status === "pendente" || (s.chegada && !s.saida && s.data < fmt(today()))
    )).slice(0, 20);
    return `<div class="topbar"><h1>Painel da coordenação</h1><p class="muted">Cadastro, escala e troca. Loja e bônus só o Edilson.</p></div>
    <div class="card">
      <h3>Risco nas próximas 72h</h3>
      ${risco.length ? `<table><tr><th>Quando</th><th>Casa</th><th>Turno</th><th>Situação</th></tr>
        ${risco.map(s => `<tr><td>${s.data}</td><td>${nomeUn(s.unidade)}</td><td>${s.turno}</td><td>${s.status}${s.userId? " · "+firstName((userById(s.userId)||{}).nome||""):""}</td></tr>`).join("")}
      </table>` : `<p class="muted">Nada crítico nas próximas 72h.</p>`}
    </div>
    <div class="card">
      <h3>Cadastros aguardando</h3>
      ${pendCad.length ? pendCad.map(x => `<div class="vaga-line"><div><b>${x.nome}</b><div class="muted">${x.email} · ${x.vinculo}</div></div>
        <div><button class="btn btn-small btn-green" data-aprovar="${x.id}">Aprovar</button>
        <button class="btn btn-small btn-red" data-recusar="${x.id}">Recusar</button></div></div>`).join("") : `<p class="muted">Nenhum cadastro pendente.</p>`}
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Pedidos de troca / cobertura</h3>
      ${pendPed.length ? pendPed.map(p => `<div class="vaga-line"><div>${p.texto}</div>
        <button class="btn btn-small btn-green" data-okpedido="${p.id}">Ok</button></div>`).join("") : `<p class="muted">Nada pendente.</p>`}
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Equipe</h3>
      <table><tr><th>Nome</th><th>Vínculo</th><th>Unidade</th><th>Selo</th><th>Alegretes</th></tr>
      ${state.users.map(x=>`<tr><td>${x.nome}</td><td>${x.vinculo}</td><td>${x.unidade?nomeUn(x.unidade):"—"}</td><td>${x.selo}</td><td>${x.alegretes||0}</td></tr>`).join("")}
      </table>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Aviso da direção</h3>
      <p class="muted">Abre na tela de todo mundo até clicar Li e entendi.</p>
      <textarea id="aviso-txt" rows="3" placeholder="Escreva o recado..."></textarea>
      <button class="btn btn-gold" id="btn-aviso" style="width:auto;margin-top:8px">Publicar aviso</button>
    </div>
    ${caixaFalasHTML()}`;
  }

  function adminHTML(u) {
    if (!isAdmin(u)) return `<p>Só o Edilson acessa loja e bônus.</p>`;
    const pend = state.resgates.filter(r => r.status === "pendente");
    return `<div class="topbar"><h1>Loja e Alegretes</h1><p class="muted">Controle exclusivo do Edilson</p></div>
    <div class="card">
      <h3>Resgates pendentes</h3>
      ${pend.length ? pend.map(r => {
        const p = userById(r.userId);
        return `<div class="vaga-line"><div><b>${p?p.nome:""}</b> · ${r.nome} (${r.custo})</div>
          <div><button class="btn btn-small btn-green" data-okloja="${r.id}">Aprovar</button>
          <button class="btn btn-small btn-red" data-naoloja="${r.id}">Negar</button></div></div>`;
      }).join("") : `<p class="muted">Nenhum resgate pendente.</p>`}
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Lançar Alegretes bônus</h3>
      <label>Pessoa</label>
      <select id="bonus-user">${state.users.map(x=>`<option value="${x.id}">${x.nome}</option>`).join("")}</select>
      <label>Quantidade</label>
      <input id="bonus-qtd" type="number" value="25">
      <label>Motivo</label>
      <input id="bonus-motivo" value="Cobertura / reconhecimento">
      <button class="btn btn-green" id="btn-bonus" style="width:auto">Lançar bônus</button>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Fotos para o Insta da Alegro</h3>
      <p class="muted">Aprovada ganha 2.000 Alegretes. A legenda é a que você escreve.</p>
      ${(state.insta||[]).slice().reverse().map(p => {
        const autor = userById(p.userId);
        return `<div class="insta-item">
          <img src="${p.foto}" alt="">
          <div style="flex:1">
            <b>${autor?autor.nome:""}</b> · ${p.status}
            <div class="muted">${p.sugestao || ""}</div>
            ${p.status==="pendente"?`
              <input id="cap-${p.id}" placeholder="Legenda bonita para o Insta" value="${(p.sugestao||"").replace(/"/g,"")}">
              <button class="btn btn-small btn-green" data-okinsta="${p.id}">Aprovar e pontuar</button>
              <button class="btn btn-small btn-red" data-naoinsta="${p.id}">Negar</button>`:`<p>${p.caption||""}</p>`}
          </div>
        </div>`;
      }).join("") || `<p class="muted">Nenhuma foto na fila.</p>`}
    </div>`;
  }

  function toast(el, tipo, text) {
    if (!el) return;
    el.innerHTML = `<div class="${tipo==="err"?"err":"ok"}">${text}</div>`;
  }

  function bind() {
    const btnLogin = $("#btn-login");
    if (btnLogin) btnLogin.onclick = () => {
      const email = $("#email").value.trim().toLowerCase();
      const senha = $("#senha").value;
      const u = state.users.find(x => x.email.toLowerCase() === email && x.senha === senha);
      if (!u) return toast($("#msg"), "err", "E-mail ou senha inválidos.");
      if (u.status === "pendente") return toast($("#msg"), "err", "Cadastro aguardando coordenação.");
      if (u.status === "recusado") return toast($("#msg"), "err", "Cadastro recusado.");
      setSessao(u.id); save(); go("perfil");
    };
    $$("[data-entrar]").forEach(b => { b.remove(); });
    $$("[data-ver]").forEach(b => b.onclick = () => {
      view.verPerfil = b.getAttribute("data-ver");
      view.page = "perfil";
      render();
    });
    const tf = $("#tira-foto");
    if (tf) tf.onclick = () => { me().foto = ""; save(); render(); };
    const tc = $("#tira-capa");
    if (tc) tc.onclick = () => { me().capa = ""; save(); render(); };
    const btnCad = $("#btn-cadastro");
    if (btnCad) btnCad.onclick = () => {
      const nome = $("#nome").value.trim();
      const email = $("#email").value.trim().toLowerCase();
      const senha = $("#senha").value;
      const fixo = $("#fixo").value === "sim";
      if (!nome || !email || !senha) return toast($("#msg"), "err", "Preencha nome, e-mail e senha.");
      if (state.users.find(x => x.email.toLowerCase() === email)) return toast($("#msg"), "err", "Este e-mail já existe. Entre com a senha.");
      const existente = state.users.find(x => x.nome.toLowerCase() === nome.toLowerCase());
      const id = "u-" + Date.now();
      const u = {
        id, nome, email, senha, papel: "cuidador",
        vinculo: fixo ? "fixo" : "externo",
        unidade: fixo ? $("#unidade").value : null,
        turno: fixo ? $("#turno").value : null,
        cargo: "Cuidador(a)", coordena: false, loja: false,
        pontos: 0, alegretes: 0, ganhos: 0, plantoes: 0,
        selo: "Em observação", status: "pendente",
        frase: "", emergenciasMes: 0
      };
      if (existente && existente.status === "ativo") {
        return toast($("#msg"), "err", "Já existe " + existente.nome + " na equipe. Entre com o e-mail cadastrado.");
      }
      const naLista = (AV_SEED.equipeEssenior || []).some(x => x.toLowerCase() === nome.toLowerCase());
      if (nome.toLowerCase() === "edilson emilio alves") {
        u.status = "ativo";
        u.selo = "Confiável";
        u.papel = "admin";
        u.loja = true;
        u.coordena = true;
        u.cargo = "Gerontólogo";
      } else if (fixo && naLista) {
        u.status = "ativo";
        u.selo = "Confiável";
        u.pontos = 0;
        u.ganhos = 0;
      }
      state.users.push(u);
      if (fixo && u.status === "ativo" && u.turno && u.unidade) {
        const trabalhou = $("#hoje").value === "sim-mesmo";
        aplicar12x36(state, u, today(), u.turno, trabalhou);
      }
      save();
      if (u.status !== "ativo") return toast($("#msg"), "ok", "Cadastro enviado. A coordenação confirma o vínculo antes da escala.");
      setSessao(u.id); save(); go("perfil");
    };
    const btnRec = $("#btn-recuperar");
    if (btnRec) btnRec.onclick = () => {
      const email = $("#email").value.trim().toLowerCase();
      const u = state.users.find(x => x.email.toLowerCase() === email);
      if (!u) return toast($("#msg"), "err", "E-mail não encontrado.");
      u.senha = AV_SEED.senhaPadrao; save();
      toast($("#msg"), "ok", "Senha redefinida para Alegro123. Volte e entre.");
    };
    const fixoSel = $("#fixo");
    if (fixoSel) {
      const bloco = $("#bloco-fixo");
      const sync = () => { if (bloco) bloco.style.display = fixoSel.value === "sim" ? "block" : "none"; };
      fixoSel.onchange = sync; sync();
    }

    function lerImg(file, cb) {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => cb(r.result);
      r.readAsDataURL(file);
    }
    const upFoto = $("#up-foto");
    if (upFoto) upFoto.onchange = () => lerImg(upFoto.files[0], url => { me().foto = url; save(); beep("ok"); render(); });
    const upCapa = $("#up-capa");
    if (upCapa) upCapa.onchange = () => lerImg(upCapa.files[0], url => { me().capa = url; save(); beep("ok"); render(); });
    const upAlb = $("#up-album");
    if (upAlb) upAlb.onchange = () => lerImg(upAlb.files[0], url => {
      const u = me(); u.album = u.album || []; if (u.album.length < 8) u.album.push(url); save(); beep("ok"); render();
    });
    const upIn = $("#up-insta");
    if (upIn) upIn.onchange = () => lerImg(upIn.files[0], url => {
      view.instaFoto = url;
      const box = $("#insta-prev");
      if (box) box.innerHTML = `<img src="${url}" alt="prévia">`;
    });
    const bi = $("#btn-insta");
    if (bi) bi.onclick = () => {
      if (!view.instaFoto) { alert("Anexe a foto primeiro."); return; }
      state.insta = state.insta || [];
      state.insta.push({
        id: "i-"+Date.now(), userId: me().id, foto: view.instaFoto,
        sugestao: (($("#insta-txt")||{}).value || "").trim(),
        caption: "", status: "pendente", quando: Date.now()
      });
      view.instaFoto = null;
      save(); beep("ok"); render();
    };
    $$("[data-okinsta]").forEach(b => b.onclick = () => {
      const p = (state.insta||[]).find(x => x.id === b.getAttribute("data-okinsta"));
      if (!p || p.status !== "pendente") return;
      p.status = "aprovado";
      p.caption = (($("#cap-"+p.id)||{}).value || p.sugestao || "").trim();
      const autor = userById(p.userId);
      if (autor) lancarAlegretes(autor, 2000, "Foto no Insta da Alegro");
      save(); render();
    });
    $$("[data-naoinsta]").forEach(b => b.onclick = () => {
      const p = (state.insta||[]).find(x => x.id === b.getAttribute("data-naoinsta"));
      if (p) { p.status = "negado"; save(); render(); }
    });
    const sf = $("#salvar-frase");
    if (sf) sf.onclick = () => { me().frase = ($("#frase")||{}).value || ""; save(); beep("ok"); };
    $$("[data-top]").forEach(b => b.onclick = () => {
      const u = me();
      const id = b.getAttribute("data-top");
      u.top8 = u.top8 || [];
      if (u.top8.includes(id)) u.top8 = u.top8.filter(x => x !== id);
      else if (u.top8.length < 8) u.top8.push(id);
      save(); beep("ok"); render();
    });
    const br = $("#btn-recado");
    if (br) br.onclick = () => {
      const t = (($("#recado-txt")||{}).value || "").trim();
      if (!t) return;
      const u = me();
      const dest = userById(($("#recado-para")||{}).value) || u;
      dest.recados = dest.recados || [];
      dest.recados.push({ de: firstName(u.nome), texto: t, quando: Date.now() });
      save(); beep("ok"); render();
    };
    $$("[data-go]").forEach(b => b.onclick = () => {
      const p = b.getAttribute("data-go");
      if (p === "sair") { setSessao(null); save(); go("login"); return; }
      go(p);
    });
    $$("[data-un]").forEach(b => b.onclick = () => { beep("click"); view.unidade = b.getAttribute("data-un"); render(); });
    $$("[data-modo]").forEach(b => b.onclick = () => { beep("click"); view.modo = b.getAttribute("data-modo"); view.modoTocado = true; render(); });
    $$("[data-casa]").forEach(b => b.onclick = () => { beep("click"); view.unidade = b.getAttribute("data-casa"); go("calendario"); });
    $$("[data-vaga]").forEach(b => b.onclick = (e) => {
      e.stopPropagation();
      const s = state.slots.find(x => x.id === b.getAttribute("data-vaga"));
      if (!s) return;
      view.unidade = s.unidade;
      view.modal = { tipo: "dia", data: s.data, unidade: s.unidade };
      beep("click"); render();
    });
    const prev = $("#mes-prev"); if (prev) prev.onclick = () => { view.mesOffset = Math.max(0, view.mesOffset-1); render(); };
    const next = $("#mes-next"); if (next) next.onclick = () => { view.mesOffset = Math.min(2, view.mesOffset+1); render(); };
    const wp = $("#week-prev"); if (wp) wp.onclick = () => { view.weekOffset -= 1; render(); };
    const wn = $("#week-next"); if (wn) wn.onclick = () => { view.weekOffset += 1; render(); };
    $$(".day[data-dia]").forEach(el => el.onclick = () => {
      view.sheet = el.getAttribute("data-dia");
      render();
    });
    $$("[data-dia]").forEach(el => el.onclick = () => {
      view.sheet = el.getAttribute("data-dia");
      render();
    });
    const fs = $("#fecha-sheet");
    if (fs) fs.onclick = () => { view.sheet = null; render(); };
    const fsb = $("#fecha-sheet-btn");
    if (fsb) fsb.onclick = () => { view.sheet = null; render(); };
    const x = $("#xmodal"); if (x) x.onclick = () => { view.modal = null; render(); };
    const bg = $("#fechar-modal");
    if (bg) bg.onclick = (e) => { if (e.target.id === "fechar-modal") { view.modal = null; render(); } };

    $$("[data-assinar]").forEach(b => b.onclick = () => assinar(b.getAttribute("data-assinar")));
    $$("[data-chegada]").forEach(b => b.onclick = () => chegada(b.getAttribute("data-chegada")));
    $$("[data-saida]").forEach(b => b.onclick = () => saida(b.getAttribute("data-saida")));
    $$("[data-liberar]").forEach(b => b.onclick = () => liberar(b.getAttribute("data-liberar")));
    $$("[data-tirar]").forEach(b => b.onclick = () => tirar(b.getAttribute("data-tirar")));
    $$("[data-emerg]").forEach(b => b.onclick = () => emerg(b.getAttribute("data-emerg")));
    $$("[data-resgatar]").forEach(b => b.onclick = () => resgatar(b.getAttribute("data-resgatar")));
    $$("[data-bene]").forEach(b => b.addEventListener("click", () => beep("ok")));
    $$("[data-aprovar]").forEach(b => b.onclick = () => { const x = userById(b.getAttribute("data-aprovar")); if (x) { x.status = "ativo"; save(); render(); } });
    $$("[data-recusar]").forEach(b => b.onclick = () => { const x = userById(b.getAttribute("data-recusar")); if (x) { x.status = "recusado"; save(); render(); } });
    $$("[data-okpedido]").forEach(b => b.onclick = () => efetivarPedido(b.getAttribute("data-okpedido")));
    $$("[data-okloja]").forEach(b => b.onclick = () => {
      const r = state.resgates.find(z => z.id === b.getAttribute("data-okloja"));
      if (r) { r.status = "aprovado"; save(); render(); }
    });
    $$("[data-naoloja]").forEach(b => b.onclick = () => {
      const r = state.resgates.find(z => z.id === b.getAttribute("data-naoloja"));
      if (r) {
        const p = userById(r.userId);
        if (p) lancarAlegretes(p, r.custo, "Resgate negado · devolveu " + r.nome);
        r.status = "negado"; save(); render();
      }
    });
    const bb = $("#btn-bonus");
    if (bb) bb.onclick = () => {
      const p = userById($("#bonus-user").value);
      const q = Number($("#bonus-qtd").value || 0);
      if (p && q) {
        lancarAlegretes(p, q, "Bônus · " + (($("#bonus-motivo")||{}).value || "reconhecimento"));
        state.extras.push({ id: "e-"+Date.now(), userId: p.id, qtd: q, motivo: ($("#bonus-motivo")||{}).value || "", quando: Date.now() });
        save(); render();
      }
    };
    const ligaFonte = () => {
      view.fonteGrande = !view.fonteGrande;
      localStorage.setItem("alegro-fonte", view.fonteGrande ? "1" : "0");
      render();
    };
    const bf = $("#btn-fonte");
    if (bf) bf.onclick = ligaFonte;
    const bfs = $("#btn-fonte-side");
    if (bfs) bfs.onclick = ligaFonte;
    const od = $("#ok-dica");
    if (od) od.onclick = () => { localStorage.setItem("alegro-dica", "1"); render(); };
    const cs = $("#confirm-sim");
    if (cs) cs.onclick = () => {
      const id = view.confirm && view.confirm.slotId;
      view.confirmAck = id;
      view.confirm = null;
      if (id) assinar(id);
    };
    const cn = $("#confirm-nao");
    if (cn) cn.onclick = () => { view.confirm = null; render(); };
    const li = $("#btn-li");
    if (li) li.onclick = () => {
      const u = me();
      const av = avisoPendente(u);
      if (av) {
        u.avisosLidos = u.avisosLidos || [];
        u.avisosLidos.push(av.id);
        save();
      }
      render();
    };
    const ba = $("#btn-aviso");
    if (ba) ba.onclick = () => {
      const t = (($("#aviso-txt")||{}).value || "").trim();
      if (!t) return;
      state.avisos = state.avisos || [];
      state.avisos.push({ id: "a-"+Date.now(), texto: t, de: me().nome, quando: Date.now() });
      save(); render();
    };
    const bfala = $("#btn-fala");
    if (bfala) bfala.onclick = () => {
      const texto = (($("#fala-txt")||{}).value || "").trim();
      if (!texto) return;
      state.falas = state.falas || [];
      state.falas.push({
        id: "f-"+Date.now(),
        userId: me().id,
        tipo: ($("#fala-tipo")||{}).value || "ideia",
        unidade: ($("#fala-casa")||{}).value || me().unidade,
        urgente: ($("#fala-urgente")||{}).value === "sim",
        texto,
        status: "aberto",
        resposta: "",
        quando: Date.now()
      });
      save(); beep("ok"); render();
    };
    $$("[data-resp]").forEach(b => b.onclick = () => {
      const id = b.getAttribute("data-resp");
      const f = (state.falas || []).find(x => x.id === id);
      const t = (($("#resp-"+id)||{}).value || "").trim();
      if (!f || !t) return;
      f.resposta = t;
      f.status = "respondido";
      save(); render();
    });
  }

  function horasAte(s) {
    const ini = parse(s.data);
    if (s.turno === "noite") ini.setHours(19,0,0,0);
    else ini.setHours(7,0,0,0);
    return (ini - new Date()) / 36e5;
  }

  function assinar(slotId) {
    const u = me();
    const s = state.slots.find(x => x.id === slotId);
    if (!s) return;
    if (s.userId && s.status !== "mural" && s.status !== "emergencia") return;
    if (s.userId === u.id) return;
    const mot = conflitos(u, s.data, s.unidade, s.turno);
    if (mot.length) { beep("warn"); falar(mot[0]); alert(mot.join("\n")); return; }
    if (view.confirmAck !== slotId) {
      const txt = `CONFIRMA QUE VAI TRABALHAR ${rotuloQuando(s).toUpperCase()} NA CASA ${nomeUn(s.unidade).toUpperCase()}?`;
      view.confirm = { texto: txt, slotId };
      falar(txt);
      render();
      return;
    }
    view.confirmAck = null;
    view.confirm = null;
    if ((s.transferencias || 0) >= 2 && !isCoord(u)) {
      alert("Este plantão já mudou de dono 2 vezes. Coordenação precisa confirmar.");
    }
    const antigo = s.userId;
    const coberto = !!(s.userId && (s.status === "mural" || s.status === "emergencia"));
    const terceiraDupla = coberto && contarDupla(s.userId, u.id, mesDe(s.data)) >= 2;
    const precisaOk = (!u.turno || u.turno !== "noite") && s.turno === "noite" && !isCoord(u)
      || horasAte(s) < 48 && !isCoord(u)
      || terceiraDupla && !isCoord(u);
    if (terceiraDupla && !isCoord(u)) {
      alert("Vocês já trocaram 2 vezes neste mês. A 3ª precisa da coordenação.");
    }
    if (coberto) {
      state.pedidos.push({
        id: "p-"+Date.now(), status: precisaOk ? "pendente" : "ok",
        tipo: "cobertura", slotId: s.id, de: s.userId, para: u.id,
        texto: `${u.nome} assume ${rotuloTurno(s)} ${s.data} ${nomeUn(s.unidade)} no lugar de ${(userById(s.userId)||{}).nome || ""}`
      });
      if (!precisaOk) aplicarCobertura(s, u.id);
    } else {
      s.userId = u.id;
      s.titularId = s.titularId || u.id;
      s.status = precisaOk ? "pendente" : "confirmado";
      if (precisaOk) {
        state.pedidos.push({ id: "p-"+Date.now(), status: "pendente", tipo: "vaga", slotId: s.id, para: u.id,
          texto: `${u.nome} quer ${rotuloTurno(s)} ${s.data} na ${nomeUn(s.unidade)}` });
      }
    }
    if (coberto && antigo) notificar(antigo, u.nome + " assumiu seu plantão de " + rotuloTurno(s) + " " + s.data + " na " + nomeUn(s.unidade));
    beep("ok"); save(); render();
  }

  function aplicarCobertura(s, novoId) {
    const de = s.userId;
    s.historico = s.historico || [];
    s.historico.push({ de, para: novoId, quando: Date.now() });
    state.trocas = state.trocas || [];
    if (de) state.trocas.push({ mes: mesDe(s.data), de, para: novoId, slotId: s.id });
    s.userId = novoId;
    s.status = "confirmado";
    s.transferencias = (s.transferencias || 0) + 1;
    s.chegada = false; s.saida = false; s.recompensado = false;
  }

  function efetivarPedido(id) {
    const p = state.pedidos.find(z => z.id === id);
    if (!p) return;
    const s = state.slots.find(x => x.id === p.slotId);
    if (s && p.para) {
      if (p.tipo === "cobertura") aplicarCobertura(s, p.para);
      else { s.userId = p.para; s.status = "confirmado"; s.titularId = s.titularId || p.para; }
    }
    p.status = "ok";
    save(); render();
  }

  function chegada(slotId) {
    const u = me();
    const s = state.slots.find(x => x.id === slotId);
    if (!s || s.userId !== u.id || s.status !== "confirmado") return;
    s.chegada = true;
    beep("in"); save(); render();
  }

  function saida(slotId) {
    const u = me();
    const s = state.slots.find(x => x.id === slotId);
    if (!s || s.userId !== u.id || !s.chegada) return;
    s.saida = true;
    if (!s.recompensado) {
      s.recompensado = true;
      u.plantoes += 1;
      const base = valorPlantao(u) * 10;
      lancarAlegretes(u, base, "Plantão cumprido · " + nomeUn(s.unidade));
      if (s.turno === "noite") lancarAlegretes(u, 200, "Adicional noturno");
      if (s.bonusEmergencia) lancarAlegretes(u, 400, "Cobriu emergência da casa");
      const total = base + (s.turno==="noite"?200:0) + (s.bonusEmergencia?400:0);
      view.premio = { qtd: total, texto: nomeUn(s.unidade), tipo: "ganho" };
      beep("coin");
    }
    save(); render();
    if (view.premio) setTimeout(() => { view.premio = null; render(); }, 2200);
  }

  function liberar(slotId) {
    const u = me();
    const s = state.slots.find(x => x.id === slotId);
    if (!s || s.userId !== u.id) return;
    s.status = "mural";
    manchar(u, mesDe(s.data));
    let aviso = `${u.nome} ofereceu ${rotuloTurno(s)} ${s.data} na ${nomeUn(s.unidade)} — continua responsável até alguém assumir. Mês limpo deste mês perdido.`;
    if (horasAte(s) < 48) {
      lancarAlegretes(u, -valorPlantao(u)*10, "Soltou plantão com menos de 48h");
      aviso += " Soltou com menos de 48h: −" + (valorPlantao(u)*10).toLocaleString("pt-BR") + " Alegretes.";
    }
    state.pedidos.push({ id: "p-"+Date.now(), status: "pendente", tipo: "mural", slotId: s.id, de: u.id, texto: aviso });
    alert(aviso);
    save(); render();
  }

  function tirar(slotId) {
    const s = state.slots.find(x => x.id === slotId);
    if (!s) return;
    s.userId = null; s.status = "livre"; s.presenca = false;
    save(); render();
  }

  function emerg(slotId) {
    const s = state.slots.find(x => x.id === slotId);
    if (!s) return;
    s.status = "emergencia";
    s.bonusEmergencia = true;
    const titular = userById(s.userId);
    if (titular) {
      titular.emergenciasMes = (titular.emergenciasMes || 0) + 1;
      manchar(titular, mesDe(s.data));
    }
    state.pedidos.push({ id: "p-"+Date.now(), status: "pendente", tipo: "emergencia", slotId: s.id,
      texto: `EMERGÊNCIA ${rotuloTurno(s)} ${s.data} ${nomeUn(s.unidade)}${titular ? " · " + titular.nome + " ainda no nome até cobertura" : ""}` });
    save(); render();
  }

  function resgatar(itemId) {
    const u = me();
    const item = AV_SEED.loja.find(i => i.id === itemId);
    if (!item) return;
    if (u.alegretes < item.custo) { alert("Alegretes insuficientes."); return; }
    lancarAlegretes(u, -item.custo, "Pedido de resgate · " + item.nome);
    state.resgates.push({ id: "r-"+Date.now(), userId: u.id, itemId, nome: item.nome, custo: item.custo, status: "pendente" });
    save(); render();
  }

  async function iniciar() {
    if (bancoOn()) {
      try {
        const remoto = await puxarNuvem();
        if (remoto && remoto.users) {
          state = ajeitar(remoto);
        } else {
          await fetch((window.AV_BANCO.url || "").replace(/\/$/, "") + "/rest/v1/estado?id=eq.1", {
            method: "PATCH",
            headers: bancoHeaders(),
            body: JSON.stringify({ payload: estadoParaNuvem() })
          });
        }
        state.session = sessaoDesteAparelho();
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
      } catch (e) {
        alert("Não conectou o banco. A escala não vai ficar igual em todos os celulares até o Supabase estar ligado.");
      }
    }
    pagarMesLimpo();
    routeFromHash();
  }
  iniciar();
})();
