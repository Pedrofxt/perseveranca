/* CEI Perseverança — utilidades, sons, camada de dados (Supabase ou demonstração) e menu da conta */
(function () {
  const C = window.PV_CONFIG;
  const root = document.documentElement;

  /* ================= tema ================= */
  function lerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  const PREF = ["pv-tema", "pv-som"];
  function consentimento() { return lerLS("pv-cookies"); }
  function gravarLS(k, v) { if (PREF.includes(k) && consentimento() !== "todos") return; try { localStorage.setItem(k, v); } catch (e) {} }
  let tema = lerLS("pv-tema");
  if (tema !== "light" && tema !== "dark") tema = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.setAttribute("data-theme", tema);
  const ICON_TEMA = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg><svg class="moon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const ICON_SOM = '<svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg><svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6"/></svg>';
  function alternarTema() {
    tema = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", tema); gravarLS("pv-tema", tema); som.whoosh();
    document.querySelectorAll(".theme-toggle").forEach(b => b.setAttribute("aria-label", tema === "dark" ? "Mudar para o modo claro" : "Mudar para o modo escuro"));
  }

  /* ================= efeitos sonoros (sintetizados, sem arquivos) ================= */
  const som = (function () {
    let ctx = null, ligado = lerLS("pv-som") !== "0";
    const AC = window.AudioContext || window.webkitAudioContext;
    function pronto() {
      if (!ligado || !AC) return null;
      if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    }
    function tom(f, dur, o) {
      o = o || {}; const c = pronto(); if (!c) return;
      const t0 = c.currentTime + (o.atraso || 0);
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = o.tipo || "sine"; osc.frequency.setValueAtTime(f, t0);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
      const v = (o.vol || .12);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + .012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(c.destination); osc.start(t0); osc.stop(t0 + dur + .02);
    }
    function ruido(dur, de, ate, vol) {
      const c = pronto(); if (!c) return;
      const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime;
      src.buffer = buf; f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(de, t0); f.frequency.exponentialRampToValueAtTime(ate, t0 + dur);
      g.gain.setValueAtTime(vol || .08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(c.destination); src.start(t0);
    }
    return {
      get ligado() { return ligado; },
      alternar() { ligado = !ligado; gravarLS("pv-som", ligado ? "1" : "0"); if (ligado) { pronto(); this.chime(); } document.querySelectorAll(".sound-toggle").forEach(b => { b.setAttribute("aria-pressed", String(ligado)); b.setAttribute("aria-label", ligado ? "Desligar efeitos sonoros" : "Ligar efeitos sonoros"); }); },
      click() { tom(880, .05, { tipo: "triangle", vol: .05 }); },
      hover() { tom(1500, .035, { vol: .018 }); },
      pop() { tom(420, .09, { f2: 1100, vol: .13 }); },
      boing() { tom(260, .22, { f2: 620, tipo: "sine", vol: .1 }); tom(620, .18, { f2: 300, atraso: .12, vol: .07 }); },
      chime() { tom(1046.5, .35, { vol: .08 }); tom(1568, .45, { vol: .06, atraso: .08 }); },
      sucesso() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tom(f, .22, { vol: .08, atraso: i * .07, tipo: "triangle" })); },
      erro() { tom(240, .16, { f2: 170, tipo: "square", vol: .035 }); tom(180, .2, { f2: 130, tipo: "square", vol: .03, atraso: .12 }); },
      whoosh() { ruido(.35, 300, 3200, .06); },
      ponto() { tom(1318.5, .6, { vol: .09 }); tom(1975.5, .8, { vol: .05, atraso: .02 }); tom(659.25, .5, { vol: .05, tipo: "triangle" }); },
      onda() { ruido(1.1, 500, 160, .05); }
    };
  })();

  /* bolinhas coloridas no clique dos botões */
  function explosao(x, y) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const b = document.createElement("span"); b.className = "burst"; b.style.left = x + "px"; b.style.top = y + "px";
    const cores = ["#CC3366", "#F16C6C", "#6C63A8", "#3F3A64", "#CC3366"];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = 26 + Math.random() * 22, s = document.createElement("i"); s.style.background = cores[i % cores.length]; s.style.setProperty("--x", Math.cos(a) * d + "px"); s.style.setProperty("--y", Math.sin(a) * d + "px"); b.appendChild(s); }
    document.body.appendChild(b); setTimeout(() => b.remove(), 650);
  }
  document.addEventListener("click", e => {
    const alvo = e.target.closest("button, a.btn, [role=tab], .iconbtn");
    if (!alvo || alvo.closest(".sound-toggle,.theme-toggle")) return;
    if (alvo.matches(".btn-leaf,.btn-sun,.btn-coral") && e.clientX) { explosao(e.clientX, e.clientY); som.pop(); } else som.click();
  }, true);
  let ultimoHover = null;
  document.addEventListener("pointerover", e => { if (e.pointerType !== "mouse") return; const el = e.target.closest("[data-sfx-hover]"); if (el && el !== ultimoHover) { ultimoHover = el; som.hover(); } if (!el) ultimoHover = null; });

  function montarControles() {
    document.querySelectorAll(".theme-toggle").forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = ICON_TEMA; b.setAttribute("aria-label", tema === "dark" ? "Mudar para o modo claro" : "Mudar para o modo escuro"); b.onclick = alternarTema; });
    document.querySelectorAll(".sound-toggle").forEach(b => { if (!b.innerHTML.trim()) b.innerHTML = ICON_SOM; b.setAttribute("aria-pressed", String(som.ligado)); b.setAttribute("aria-label", som.ligado ? "Desligar efeitos sonoros" : "Ligar efeitos sonoros"); b.onclick = () => som.alternar(); });
  }

  /* ================= utilidades ================= */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function toast(texto, tipo) {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("role", "status"); document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "toast" + (tipo === "bad" ? " bad" : ""); t.textContent = texto; box.appendChild(t);
    if (tipo === "bad") som.erro(); else som.chime();
    setTimeout(() => t.remove(), 4000);
  }
  const fmtData = d => d ? new Date(String(d).length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDia = d => { const t = new Date(String(d).length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const fmtHora = d => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const isoLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hojeISO = () => isoLocal(new Date());
  const diaLocal = iso => isoLocal(new Date(iso));
  function idade(nasc) {
    if (!nasc) return ""; const n = new Date(nasc + "T12:00:00"), h = new Date();
    let m = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth(); if (h.getDate() < n.getDate()) m--;
    if (m < 0) return ""; if (m < 24) return m + (m === 1 ? " mês" : " meses"); const a = Math.floor(m / 12); return a + " anos" + (m % 12 ? " e " + (m % 12) + (m % 12 === 1 ? " mês" : " meses") : "");
  }
  const PAPEIS = { pendente: "Aguardando liberação", responsavel: "Responsável", funcionario: "Funcionário(a)", professor: "Professor(a)", secretario: "Secretaria", diretor: "Direção" };
  const PONTO = { entrada: "Entrada", saida_intervalo: "Saída para intervalo", retorno_intervalo: "Volta do intervalo", saida: "Saída" };
  const STATUS = ["enviada", "em análise", "lista de espera", "aprovada", "recusada", "cancelada"];
  const stClasse = s => "status st-" + String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
  function horasDoDia(b) {
    let total = 0, aberto = null;
    b.slice().sort((x, y) => x.registrado_em.localeCompare(y.registrado_em)).forEach(p => {
      if (p.tipo === "entrada" || p.tipo === "retorno_intervalo") aberto = new Date(p.registrado_em);
      else if (aberto) { total += new Date(p.registrado_em) - aberto; aberto = null; }
    });
    return total / 36e5;
  }
  const fmtHoras = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0"); };
  function traduzErro(e) {
    const m = (e && (e.message || e.error_description)) || String(e);
    if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if (/not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    if (/already registered|already been registered/i.test(m)) return "Já existe uma conta com este e-mail. Use “Entrar”.";
    if (/Password should be/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
    if (/LOCAL_OBRIGATORIO/.test(m)) return "A Direção exige a localização para bater o ponto. Permita o acesso à localização e tente de novo.";
    if (/conta de responsável não pode virar/.test(m)) return m.replace(/^.*?Uma conta/,"Uma conta");
    if (/CADASTRO_NAO_AUTORIZADO|Database error saving new user/i.test(m)) return "Este e-mail não foi liberado pela Direção para a Área da Equipe. Peça à Direção para cadastrar seu e-mail.";
    if (/row-level security|permission denied/i.test(m)) return "Seu perfil não tem permissão para esta ação.";
    if (/duplicate key/i.test(m)) return "Já existe um registro igual a este.";
    if (/rate limit/i.test(m)) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "Sem conexão com o servidor. Verifique sua internet.";
    return m;
  }
  const chk = r => { if (r.error) throw new Error(traduzErro(r.error)); return r.data; };

  /* ================= Supabase ================= */
  function criarReal(sb) {
    const uid = async () => (await sb.auth.getSession()).data.session?.user?.id;
    const volta = () => location.href.split("#")[0].split("?")[0];
    return {
      demo: false,
      async sessao() { return (await sb.auth.getSession()).data.session; },
      onAuth(cb) { sb.auth.onAuthStateChange((ev, s) => { setTimeout(() => cb(ev, s), 0); }); },
      async entrar(email, senha) { chk(await sb.auth.signInWithPassword({ email, password: senha })); },
      async cadastrar(d) {
        const r = chk(await sb.auth.signUp({ email: d.email, password: d.senha, options: { data: { nome: d.nome, telefone: d.telefone || "", origem: d.origem || "", aceite: d.aceite ? "sim" : "" }, emailRedirectTo: volta() } }));
        if (r.session) return { precisaConfirmar: false };
        const e = await sb.auth.signInWithPassword({ email: d.email, password: d.senha }); // conta já confirmada automaticamente pelo banco
        return { precisaConfirmar: !!e.error };
      },
      async podeCadastrarEquipe(email) { try { return chk(await sb.rpc("pode_cadastrar_equipe", { p_email: email })); } catch (e) { return "desconhecido"; } },
      async recuperar(email) { chk(await sb.auth.resetPasswordForEmail(email, { redirectTo: volta() })); },
      async novaSenha(s) { chk(await sb.auth.updateUser({ password: s })); },
      async sair() { await sb.auth.signOut(); },
      async perfil() { const id = await uid(); return id ? chk(await sb.from("profiles").select("*").eq("id", id).maybeSingle()) : null; },
      async email() { return (await sb.auth.getSession()).data.session?.user?.email || ""; },

      async avisos(publico) { return chk(await sb.from("avisos").select("*, turmas(nome)").eq("publico", publico).order("fixado", { ascending: false }).order("created_at", { ascending: false }).limit(40)); },
      async todosAvisos() { return chk(await sb.from("avisos").select("*, turmas(nome)").order("created_at", { ascending: false })); },
      async salvarAviso(a) { const d = { titulo: a.titulo, corpo: a.corpo, publico: a.publico, fixado: a.fixado, turma_id: a.publico === "responsaveis" ? (a.turma_id || null) : null }; chk(a.id ? await sb.from("avisos").update(d).eq("id", a.id) : await sb.from("avisos").insert(d)); },
      async removerAviso(id) { chk(await sb.from("avisos").delete().eq("id", id)); },
      async eventos(todos) { let q = sb.from("eventos").select("*").order("data"); if (!todos) q = q.gte("data", hojeISO()).limit(12); return chk(await q); },
      async salvarEvento(e) { const d = { titulo: e.titulo, data: e.data, descricao: e.descricao || null }; chk(e.id ? await sb.from("eventos").update(d).eq("id", e.id) : await sb.from("eventos").insert(d)); },
      async removerEvento(id) { chk(await sb.from("eventos").delete().eq("id", id)); },
      async enviarContato(c) { chk(await sb.from("contatos").insert(c)); },
      async contatos() { return chk(await sb.from("contatos").select("*").order("created_at", { ascending: false })); },
      async statusContato(id, status) { chk(await sb.from("contatos").update({ status }).eq("id", id)); },
      async vagasTurmas() { return chk(await sb.rpc("vagas_turmas")); },

      async siteImagens() { try { return chk(await sb.from("site_imagens").select("*").order("local").order("ordem").order("created_at")); } catch (e) { return []; } },
      async enviarImagemSite(blob, d) {
        const caminho = d.local + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ".jpg";
        chk(await sb.storage.from("site").upload(caminho, blob, { contentType: "image/jpeg" }));
        const url = sb.storage.from("site").getPublicUrl(caminho).data.publicUrl;
        if (d.local !== "galeria") { const velhas = chk(await sb.from("site_imagens").select("id,caminho").eq("local", d.local)); for (const v of velhas) await this.removerImagemSite(v.id, v.caminho); }
        chk(await sb.from("site_imagens").insert({ local: d.local, titulo: d.titulo || null, legenda: d.legenda || null, url, caminho, ordem: d.ordem || 0 }));
      },
      async atualizarImagemSite(id, patch) { chk(await sb.from("site_imagens").update(patch).eq("id", id)); },
      async removerImagemSite(id, caminho) { chk(await sb.from("site_imagens").delete().eq("id", id)); await sb.storage.from("site").remove([caminho]).catch(() => {}); },

      async fotos(filtro) {
        let q = sb.from("fotos").select("*, turmas(nome), criancas(nome)").order("data", { ascending: false }).order("created_at", { ascending: false }).limit(filtro && filtro.limite || 120);
        if (filtro && filtro.turma_id) q = q.eq("turma_id", filtro.turma_id);
        const l = chk(await q); if (!l.length) return l;
        const ass = await sb.storage.from("fotos-criancas").createSignedUrls(l.map(f => f.caminho), 3600);
        const m = {}; (ass.data || []).forEach(x => { if (x.signedUrl) m[x.path] = x.signedUrl; });
        return l.map(f => ({ ...f, url: m[f.caminho] || null }));
      },
      async enviarFoto(blob, d) {
        const caminho = d.turma_id + "/" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + ".jpg";
        chk(await sb.storage.from("fotos-criancas").upload(caminho, blob, { contentType: "image/jpeg" }));
        const r = await sb.from("fotos").insert({ turma_id: d.turma_id, crianca_id: d.crianca_id || null, legenda: d.legenda || null, data: d.data, caminho });
        if (r.error) { await sb.storage.from("fotos-criancas").remove([caminho]).catch(() => {}); throw new Error(traduzErro(r.error)); }
      },
      async removerFoto(id, caminho) { chk(await sb.from("fotos").delete().eq("id", id)); await sb.storage.from("fotos-criancas").remove([caminho]).catch(() => {}); },

      async minhasCriancas() { const id = await uid(); return chk(await sb.from("criancas").select("*, turmas(nome,faixa)").or(`responsavel_id.eq.${id},responsavel2_id.eq.${id}`).eq("ativo", true).order("nome")); },
      async meusPedidos() { const id = await uid(); return chk(await sb.from("matriculas").select("*, turmas(nome)").eq("responsavel_id", id).order("created_at", { ascending: false })); },
      async pedirMatricula(d) { chk(await sb.from("matriculas").insert(d)); },
      async cancelarPedido(id) { chk(await sb.from("matriculas").update({ status: "cancelada" }).eq("id", id)); },
      async diarios(criancaId, limite) { return chk(await sb.from("diarios").select("*").eq("crianca_id", criancaId).order("data", { ascending: false }).limit(limite || 30)); },
      async marcarLido(id) { await sb.rpc("marcar_diario_lido", { p_id: id }); },
      async freqCrianca(cid) { return chk(await sb.from("frequencias").select("data,presente").eq("crianca_id", cid).order("data", { ascending: false }).limit(120)); },

      async turmas() { return chk(await sb.from("turmas").select("*").order("ordem")); },
      async salvarTurma(t) { chk(await sb.from("turmas").update({ vagas: t.vagas, faixa: t.faixa }).eq("id", t.id)); },
      async criancas(turmaId) { let q = sb.from("criancas").select("*, turmas(nome), resp:profiles!criancas_responsavel_id_fkey(nome,email), resp2:profiles!criancas_responsavel2_id_fkey(nome,email)").eq("ativo", true).order("nome"); if (turmaId) q = q.eq("turma_id", turmaId); return chk(await q); },
      async salvarCrianca(c) { const d = { nome: c.nome, data_nascimento: c.data_nascimento || null, turma_id: c.turma_id || null, turno: c.turno, responsavel_nome: c.responsavel_nome || null, responsavel_telefone: c.responsavel_telefone || null, responsavel_email: (c.responsavel_email || "").toLowerCase().trim() || null, responsavel2_nome: c.responsavel2_nome || null, responsavel2_email: (c.responsavel2_email || "").toLowerCase().trim() || null, observacoes: c.observacoes || null }; chk(c.id ? await sb.from("criancas").update(d).eq("id", c.id) : await sb.from("criancas").insert(d)); },
      async desligarCrianca(id) { chk(await sb.from("criancas").update({ ativo: false }).eq("id", id)); },
      async vincularResponsavel(cid, email, slot) { return chk(await sb.rpc("vincular_responsavel", { p_crianca: cid, p_email: email, p_slot: slot || 1 })); },
      async cardapio(desde, ate) { return chk(await sb.from("cardapio").select("*").gte("data", desde).lte("data", ate).order("data")); },
      async salvarCardapio(linhas, apagar) {
        if (linhas.length) chk(await sb.from("cardapio").upsert(linhas.map(l => ({ ...l, atualizado_em: new Date().toISOString() })), { onConflict: "data,refeicao" }));
        for (const a of apagar || []) chk(await sb.from("cardapio").delete().eq("data", a.data).eq("refeicao", a.refeicao));
      },
      async minhasSolicitacoes() { const id = await uid(); return chk(await sb.from("solicitacoes").select("*, criancas(nome)").eq("responsavel_id", id).order("created_at", { ascending: false })); },
      async pedirAlteracao(d) { chk(await sb.from("solicitacoes").insert({ crianca_id: d.crianca_id || null, tipo: d.tipo, detalhes: d.detalhes })); },
      async solicitacoes() { return chk(await sb.from("solicitacoes").select("*, criancas(nome)").order("created_at", { ascending: false })); },
      async responderSolicitacao(id, patch) { chk(await sb.from("solicitacoes").update(patch).eq("id", id)); },
      async matriculas() { return chk(await sb.from("matriculas").select("*, turmas(nome)").order("created_at", { ascending: false })); },
      async atualizarMatricula(id, patch) { chk(await sb.from("matriculas").update(patch).eq("id", id)); },
      async aprovarMatricula(id, turma, resposta) { return chk(await sb.rpc("aprovar_matricula", { p_id: id, p_turma: turma || null, p_resposta: resposta || "" })); },
      async freqTurma(ids, data) { if (!ids.length) return []; return chk(await sb.from("frequencias").select("*").in("crianca_id", ids).eq("data", data)); },
      async salvarFreq(rows) { chk(await sb.from("frequencias").upsert(rows, { onConflict: "crianca_id,data" })); },
      async diariosTurma(ids, data) { if (!ids.length) return []; return chk(await sb.from("diarios").select("*").in("crianca_id", ids).eq("data", data)); },
      async salvarDiario(d) { chk(await sb.from("diarios").upsert(d, { onConflict: "crianca_id,data" })); },

      async baterPonto(tipo, observacao, geo) { const r = chk(await sb.from("pontos").insert({ tipo, observacao: observacao || null, latitude: geo ? geo.lat : null, longitude: geo ? geo.lng : null, precisao_m: geo ? Math.round(geo.acc) : null }).select("distancia_m").single()); return r; },
      async configPonto() { try { const r = chk(await sb.from("configuracoes").select("valor").eq("chave", "ponto").maybeSingle()); return Object.assign({ usar: true, exigir: false, raio: 150, lat: null, lng: null }, r ? r.valor : {}); } catch (e) { return { usar: true, exigir: false, raio: 150, lat: null, lng: null }; } },
      async salvarConfigPonto(v) { chk(await sb.from("configuracoes").upsert({ chave: "ponto", valor: v, atualizado_em: new Date().toISOString() })); },
      async pontos(desde, ate, todos) { let q = sb.from("pontos").select("*").gte("registrado_em", desde).lt("registrado_em", ate).order("registrado_em"); if (!todos) q = q.eq("user_id", await uid()); return chk(await q); },
      async ajustarPonto(id, iso, obs) { chk(await sb.from("pontos").update({ registrado_em: iso, observacao: obs }).eq("id", id)); },
      async removerPonto(id) { chk(await sb.from("pontos").delete().eq("id", id)); },

      async perfis() { return chk(await sb.from("profiles").select("*").order("nome")); },
      async atualizarPerfil(id, patch) { chk(await sb.from("profiles").update(patch).eq("id", id)); },
      async convites() { return chk(await sb.from("convites").select("*").order("created_at", { ascending: false })); },
      async criarConvite(email, papel) { chk(await sb.from("convites").insert({ email: email.toLowerCase().trim(), papel })); },
      async removerConvite(email) { chk(await sb.from("convites").delete().eq("email", email)); },
      async excluirUsuario(id) { chk(await sb.rpc("excluir_usuario", { alvo: id })); },

      async salvarPerfil(patch) { const id = await uid(); chk(await sb.from("profiles").update(patch).eq("id", id)); },
      async limparAvatares() { const id = await uid(); const r = await sb.storage.from("avatares").list(id); if (r.data && r.data.length) await sb.storage.from("avatares").remove(r.data.map(f => id + "/" + f.name)); },
      async enviarAvatar(blob) { const id = await uid(); await this.limparAvatares().catch(() => {}); const p = id + "/foto-" + Date.now() + ".jpg"; chk(await sb.storage.from("avatares").upload(p, blob, { contentType: "image/jpeg", upsert: true })); const url = sb.storage.from("avatares").getPublicUrl(p).data.publicUrl; await this.salvarPerfil({ avatar_url: url }); return url; },
      async trocarEmail(email) { chk(await sb.auth.updateUser({ email }, { emailRedirectTo: volta() })); },
      async confirmarSenha(senha) { const r = await sb.auth.signInWithPassword({ email: await this.email(), password: senha }); if (r.error) throw new Error(/Invalid login/i.test(r.error.message) ? "A senha atual está incorreta." : traduzErro(r.error)); },
      async trocarSenha(a, n) { await this.confirmarSenha(a); chk(await sb.auth.updateUser({ password: n })); },
      async excluirConta(senha) { await this.confirmarSenha(senha); await this.limparAvatares().catch(() => {}); chk(await sb.rpc("excluir_minha_conta")); await sb.auth.signOut().catch(() => {}); }
    };
  }

  /* ================= Demonstração (sem servidor) ================= */
  function criarDemo() {
    const nid = () => Math.random().toString(36).slice(2, 10);
    const dias = n => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };
    const agora = () => new Date().toISOString();
    const clone = o => JSON.parse(JSON.stringify(o));
    const espera = v => new Promise(r => setTimeout(() => r(v), 140));
    const turmas = [["Infantil 1 · Berçário", "Bebês", 12], ["Infantil 2", "Primeiros passos", 15], ["Infantil 3", "Descobertas", 18], ["Infantil 4", "Pré-escola", 20], ["Infantil 5", "Pré-escola", 20]].map((t, i) => ({ id: nid(), nome: t[0], faixa: t[1], ordem: i + 1, vagas: t[2] }));
    const perfis = [
      { id: "u-diretor", nome: "Direção (exemplo)", email: "direcao@exemplo.com", papel: "diretor", ativo: true, created_at: agora() },
      { id: "u-secretario", nome: "Secretaria (exemplo)", email: "secretaria@exemplo.com", papel: "secretario", ativo: true, created_at: agora() },
      { id: "u-professor", nome: "Professora (exemplo)", email: "professora@exemplo.com", papel: "professor", ativo: true, created_at: agora() },
      { id: "u-funcionario", nome: "Funcionário (exemplo)", email: "funcionario@exemplo.com", papel: "funcionario", ativo: true, created_at: agora() },
      { id: "u-resp", nome: "Responsável (exemplo)", email: "familia@exemplo.com", telefone: "(41) 9 0000-0000", papel: "responsavel", ativo: true, created_at: agora() },
      { id: "u-pendente", nome: "Nova conta (exemplo)", email: "nova@exemplo.com", papel: "pendente", ativo: true, created_at: agora() }
    ];
    const nomes = ["Alice Exemplo", "Bento Exemplo", "Cecília Exemplo", "Davi Exemplo", "Elisa Exemplo", "Gael Exemplo", "Helena Exemplo"];
    const criancas = nomes.map((n, i) => ({ id: nid(), nome: n, data_nascimento: dias(-365 * 3 - i * 40), turma_id: turmas[2].id, turno: "Integral", responsavel_id: i === 0 ? "u-resp" : null, responsavel_nome: i === 0 ? "Responsável (exemplo)" : "Família de " + n.split(" ")[0], responsavel_telefone: "(41) 9 0000-000" + i, observacoes: "", ativo: true }));
    const matriculas = [
      { id: nid(), responsavel_id: "u-resp", crianca_nome: "Theo Exemplo", crianca_nascimento: dias(-420), turma_id: turmas[0].id, turno: "Integral", responsavel_nome: "Responsável (exemplo)", parentesco: "Mãe", telefone: "(41) 9 0000-0000", endereco: "Rua de exemplo, 100", observacoes: "", status: "em análise", resposta: "Recebemos seu pedido e estamos verificando as vagas do Berçário.", created_at: new Date(Date.now() - 864e5 * 4).toISOString(), updated_at: new Date(Date.now() - 864e5).toISOString() },
      { id: nid(), responsavel_id: "u-resp", crianca_nome: "Alice Exemplo", crianca_nascimento: criancas[0].data_nascimento, turma_id: turmas[2].id, turno: "Integral", responsavel_nome: "Responsável (exemplo)", parentesco: "Mãe", telefone: "(41) 9 0000-0000", status: "aprovada", resposta: "Matrícula aprovada! Bem-vindos ao CEI Perseverança.", crianca_id: criancas[0].id, created_at: new Date(Date.now() - 864e5 * 90).toISOString(), updated_at: new Date(Date.now() - 864e5 * 80).toISOString() },
      { id: nid(), responsavel_id: "u-outro", crianca_nome: "Lara Exemplo", crianca_nascimento: dias(-1500), turma_id: turmas[3].id, turno: "Manhã", responsavel_nome: "Família de Lara (exemplo)", parentesco: "Pai", telefone: "(41) 9 0000-1111", endereco: "Rua de exemplo, 200", observacoes: "Irmão já estuda no CEI.", status: "enviada", created_at: new Date(Date.now() - 864e5).toISOString(), updated_at: new Date(Date.now() - 864e5).toISOString() }
    ];
    const OP = { alimentacao: ["Comeu tudo", "Comeu bem", "Comeu pouco"], sono: ["Dormiu bem", "Dormiu pouco"], humor: ["Muito feliz", "Tranquilo(a)", "Sonolento(a)"] };
    const ATIV = ["Pintura com as mãos e roda de música.", "Brincadeira no parque e contação de história.", "Massinha de modelar e circuito motor.", "Plantamos feijão no algodão!", "Dia do brinquedo e roda de conversa."];
    const diarios = [], frequencias = [];
    for (let k = 0; k <= 20; k++) {
      const d = new Date(); d.setDate(d.getDate() - k); if (d.getDay() === 0 || d.getDay() === 6) continue;
      criancas.forEach((c, ci) => {
        const pres = (k + ci) % 8 !== 3; frequencias.push({ id: nid(), crianca_id: c.id, data: isoLocal(d), presente: pres });
        if (pres && k > 0) diarios.push({ id: nid(), crianca_id: c.id, data: isoLocal(d), alimentacao: OP.alimentacao[(k + ci) % 3], sono: OP.sono[(k + ci) % 2], humor: OP.humor[(k + ci) % 3], atividades: ATIV[(k + ci) % ATIV.length], recado: k === 1 && ci === 0 ? "Amanhã é dia do brinquedo: pode trazer um de casa! (exemplo)" : "", autor_nome: "Professora (exemplo)", lido_em: k > 2 ? agora() : null, updated_at: d.toISOString() });
      });
    }
    const avisos = [
      { id: nid(), titulo: "Novo site do CEI Perseverança", corpo: "Famílias agora têm a Área do Responsável: pedidos de matrícula, diário da criança, avisos e frequência num só lugar.", publico: "publico", fixado: true, created_at: agora() },
      { id: nid(), titulo: "Exemplo: reunião de pais", corpo: "Aviso de exemplo para mostrar como os comunicados aparecem no site.", publico: "publico", fixado: false, created_at: new Date(Date.now() - 864e5 * 3).toISOString() },
      { id: nid(), titulo: "Exemplo: festa da primavera", corpo: "Aviso de exemplo para todas as famílias.", publico: "responsaveis", turma_id: null, fixado: true, created_at: new Date(Date.now() - 864e5).toISOString() },
      { id: nid(), titulo: "Exemplo: passeio do Infantil 3", corpo: "Aviso de exemplo só para as famílias do Infantil 3.", publico: "responsaveis", turma_id: turmas[2].id, fixado: false, created_at: new Date(Date.now() - 864e5 * 2).toISOString() },
      { id: nid(), titulo: "Exemplo: reunião pedagógica", corpo: "Aviso de exemplo visível só para a equipe.", publico: "equipe", fixado: true, created_at: agora() }
    ];
    const eventos = [{ id: nid(), titulo: "Exemplo: reunião de pais", data: dias(5), descricao: "Evento de exemplo da agenda." }, { id: nid(), titulo: "Exemplo: festa da família", data: dias(16), descricao: "" }, { id: nid(), titulo: "Exemplo: fim do semestre", data: dias(34), descricao: "" }];
    const contatos = [{ id: nid(), nome: "Contato de exemplo", email: "familia@exemplo.com", telefone: "(41) 9 0000-0000", assunto: "Vagas", mensagem: "Mensagem de exemplo enviada pelo formulário do site.", status: "novo", created_at: agora() }];
    const pontos = [];
    ["u-professor", "u-funcionario", "u-secretario"].forEach((u, ui) => { for (let k = 1; k <= 8; k++) { const d = new Date(); d.setDate(d.getDate() - k); if (d.getDay() === 0 || d.getDay() === 6) continue; const at = (h, m) => { const x = new Date(d); x.setHours(h, m + ui * 4, 0, 0); return x.toISOString(); }; const nome = perfis.find(p => p.id === u).nome; [["entrada", 7, 1], ["saida_intervalo", 11, 30], ["retorno_intervalo", 12, 30], ["saida", 16, 4 + k]].forEach(([t, h, m]) => pontos.push({ id: nid(), user_id: u, nome_registro: nome, tipo: t, registrado_em: at(h, m) })); } });
    const convites = [];
    const paraURL = blob => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const ilustra = (cor, txt) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${cor}"/><circle cx="320" cy="70" r="36" fill="#FFC233"/><path d="M0 230 Q 100 190 200 230 T 400 225 V300 H0Z" fill="#fff" opacity=".35"/><circle cx="150" cy="170" r="30" fill="#fff" opacity=".9"/><circle cx="230" cy="180" r="24" fill="#fff" opacity=".8"/><text x="200" y="285" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#fff">${txt}</text></svg>`);
    const fotos = [["Pintura com tinta guache", 1, true], ["Roda de música", 2, false], ["Brincadeira no pátio", 3, true], ["Hora do lanche", 6, false], ["Plantio do feijão", 8, false]].map(([l, d, kid], i) => ({ id: nid(), turma_id: turmas[2].id, crianca_id: kid ? criancas[0].id : null, legenda: l + " (exemplo)", data: dias(-d), caminho: nid(), url: ilustra(["#F16C6C", "#3F3A64", "#CC3366", "#6C63A8", "#F05C5C"][i], "Foto de exemplo"), autor_nome: "Professora (exemplo)", created_at: agora() }));
    const siteImgs = [];
    const cfgPonto = { usar: true, exigir: false, raio: 150, lat: -25.5163, lng: -48.5228 };
    criancas[0].responsavel_email = "familia@exemplo.com"; criancas[0].responsavel2_email = "segundo@exemplo.com"; criancas[0].responsavel2_nome = "Segundo responsável (exemplo)";
    const REF = ["Café da manhã", "Almoço", "Lanche da tarde"], PRATOS = [["Leite com achocolatado e pão integral", "Arroz, feijão, frango ensopado e salada de cenoura", "Banana com aveia"], ["Iogurte natural e frutas picadas", "Arroz, lentilha, carne moída com legumes e beterraba", "Bolo de laranja e suco natural"], ["Mingau de aveia", "Macarrão com molho de tomate, peixe assado e brócolis", "Maçã e biscoito de polvilho"], ["Vitamina de mamão e pão com queijo", "Arroz, feijão, omelete e abobrinha refogada", "Pipoca caseira e suco de uva"], ["Leite e cuscuz com ovo", "Arroz, feijão, frango assado e purê de batata", "Melancia e torrada"]];
    const cardapioL = []; (() => { const d = new Date(); const seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7)); for (let i = 0; i < 5; i++) { const x = new Date(seg); x.setDate(seg.getDate() + i); REF.forEach((r, k) => cardapioL.push({ id: nid(), data: isoLocal(x), refeicao: r, descricao: PRATOS[i][k] + " (exemplo)" })); } })();
    const solic = [{ id: nid(), responsavel_id: "u-resp", responsavel_nome: "Responsável (exemplo)", crianca_id: criancas[0].id, tipo: "Telefone", detalhes: "Novo telefone: (41) 9 0000-1234 (exemplo)", status: "em andamento", resposta: "Recebemos, vamos atualizar até amanhã.", created_at: new Date(Date.now() - 864e5 * 2).toISOString(), updated_at: agora() }];
    let atual = null; const ouvintes = [];
    const avisa = ev => ouvintes.forEach(f => setTimeout(() => f(ev), 0));
    const precisa = (...p) => { if (!atual || !p.includes(atual.papel)) throw new Error("Seu perfil não tem permissão para esta ação."); };
    const turmaNome = id => (turmas.find(t => t.id === id) || {}).nome;
    const comTurma = o => ({ ...o, turmas: o.turma_id ? { nome: turmaNome(o.turma_id), faixa: (turmas.find(t => t.id === o.turma_id) || {}).faixa } : null });
    return {
      demo: true,
      async sessao() { return atual ? { user: { id: atual.id, email: atual.email } } : null; },
      onAuth(cb) { ouvintes.push(cb); },
      async entrarComo(papel) { atual = perfis.find(p => p.papel === papel); avisa("SIGNED_IN"); },
      async entrar() { throw new Error("Na demonstração, use os botões “Entrar como…”."); },
      async cadastrar() { throw new Error("O cadastro funciona no site publicado com o Supabase. Na demonstração, use “Entrar como…”."); },
      async podeCadastrarEquipe() { return "nao"; },
      async recuperar() { throw new Error("Disponível no site publicado com o Supabase."); },
      async novaSenha() {},
      async sair() { atual = null; avisa("SIGNED_OUT"); },
      async perfil() { return espera(atual && clone(atual)); },
      async email() { return atual ? atual.email : ""; },

      async avisos(publico) {
        let l = avisos.filter(a => a.publico === publico);
        if (publico === "responsaveis" && atual && atual.papel === "responsavel") { const ts = criancas.filter(c => c.responsavel_id === atual.id).map(c => c.turma_id); l = l.filter(a => !a.turma_id || ts.includes(a.turma_id)); }
        return espera(clone(l.sort((a, b) => (b.fixado - a.fixado) || b.created_at.localeCompare(a.created_at)).map(comTurma)));
      },
      async todosAvisos() { return espera(clone(avisos.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(comTurma))); },
      async salvarAviso(a) { precisa("secretario", "diretor"); const d = { ...a, turma_id: a.publico === "responsaveis" ? (a.turma_id || null) : null }; if (a.id) Object.assign(avisos.find(x => x.id === a.id), d); else avisos.unshift({ ...d, id: nid(), created_at: agora() }); },
      async removerAviso(i) { precisa("secretario", "diretor"); avisos.splice(avisos.findIndex(x => x.id === i), 1); },
      async eventos(todos) { return espera(clone(eventos.filter(e => todos || e.data >= hojeISO()).sort((a, b) => a.data.localeCompare(b.data)))); },
      async salvarEvento(e) { precisa("secretario", "diretor"); if (e.id) Object.assign(eventos.find(x => x.id === e.id), e); else eventos.push({ ...e, id: nid() }); },
      async removerEvento(i) { precisa("secretario", "diretor"); eventos.splice(eventos.findIndex(x => x.id === i), 1); },
      async enviarContato(c) { contatos.unshift({ ...c, id: nid(), status: "novo", created_at: agora() }); return espera(); },
      async contatos() { precisa("secretario", "diretor"); return espera(clone(contatos)); },
      async statusContato(i, s) { precisa("secretario", "diretor"); contatos.find(c => c.id === i).status = s; },
      async vagasTurmas() { return espera(turmas.map(t => ({ ...t, ocupadas: criancas.filter(c => c.turma_id === t.id && c.ativo).length }))); },

      async siteImagens() { return espera(clone(siteImgs)); },
      async enviarImagemSite(blob, d) { precisa("diretor"); const url = await paraURL(blob); if (d.local !== "galeria") for (let i = siteImgs.length - 1; i >= 0; i--) if (siteImgs[i].local === d.local) siteImgs.splice(i, 1); siteImgs.push({ id: nid(), local: d.local, titulo: d.titulo || null, legenda: d.legenda || null, url, caminho: nid(), ordem: d.ordem || 0, created_at: agora() }); },
      async atualizarImagemSite(i, patch) { precisa("diretor"); Object.assign(siteImgs.find(x => x.id === i), patch); },
      async removerImagemSite(i) { precisa("diretor"); siteImgs.splice(siteImgs.findIndex(x => x.id === i), 1); },
      async fotos(f) {
        let l = fotos.slice();
        if (atual && atual.papel === "responsavel") { const minhas = criancas.filter(c => c.responsavel_id === atual.id && c.ativo); l = l.filter(x => x.crianca_id ? minhas.some(c => c.id === x.crianca_id) : minhas.some(c => c.turma_id === x.turma_id)); }
        if (f && f.turma_id) l = l.filter(x => x.turma_id === f.turma_id);
        return espera(clone(l.sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at)).map(x => ({ ...x, turmas: { nome: turmaNome(x.turma_id) }, criancas: x.crianca_id ? { nome: (criancas.find(c => c.id === x.crianca_id) || {}).nome } : null }))));
      },
      async enviarFoto(blob, d) { precisa("professor", "secretario", "diretor"); fotos.push({ id: nid(), turma_id: d.turma_id, crianca_id: d.crianca_id || null, legenda: d.legenda || null, data: d.data, caminho: nid(), url: await paraURL(blob), autor_nome: atual.nome, created_at: agora() }); },
      async removerFoto(i) { precisa("professor", "secretario", "diretor"); fotos.splice(fotos.findIndex(x => x.id === i), 1); },

      async minhasCriancas() { return espera(clone(criancas.filter(c => (c.responsavel_id === atual?.id || c.responsavel2_id === atual?.id) && c.ativo).map(comTurma))); },
      async meusPedidos() { return espera(clone(matriculas.filter(m => m.responsavel_id === atual?.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(comTurma))); },
      async pedirMatricula(d) { if (!atual) throw new Error("Entre novamente."); matriculas.unshift({ ...d, id: nid(), responsavel_id: atual.id, status: "enviada", resposta: null, created_at: agora(), updated_at: agora() }); return espera(); },
      async cancelarPedido(i) { const m = matriculas.find(x => x.id === i); if (!["enviada", "em análise", "lista de espera"].includes(m.status)) throw new Error("Este pedido não pode mais ser alterado. Fale com a secretaria."); m.status = "cancelada"; m.updated_at = agora(); },
      async diarios(cid, lim) { return espera(clone(diarios.filter(d => d.crianca_id === cid).sort((a, b) => b.data.localeCompare(a.data)).slice(0, lim || 30))); },
      async marcarLido(i) { const d = diarios.find(x => x.id === i); if (d && !d.lido_em) d.lido_em = agora(); },
      async freqCrianca(cid) { return espera(clone(frequencias.filter(f => f.crianca_id === cid).sort((a, b) => b.data.localeCompare(a.data)))); },

      async turmas() { return clone(turmas); },
      async salvarTurma(t) { precisa("secretario", "diretor"); Object.assign(turmas.find(x => x.id === t.id), { vagas: t.vagas, faixa: t.faixa }); },
      async criancas(tid) { return espera(clone(criancas.filter(c => c.ativo && (!tid || c.turma_id === tid)).sort((a, b) => a.nome.localeCompare(b.nome)).map(c => ({ ...comTurma(c), resp: c.responsavel_id ? (p => p && { nome: p.nome, email: p.email })(perfis.find(p => p.id === c.responsavel_id)) : null, resp2: c.responsavel2_id ? (p => p && { nome: p.nome, email: p.email })(perfis.find(p => p.id === c.responsavel2_id)) : null })))); },
      async salvarCrianca(c) { precisa("secretario", "diretor"); const liga = e => (perfis.find(p => p.email === (e || "").toLowerCase().trim()) || {}).id || null; const d = { ...c, responsavel_id: liga(c.responsavel_email), responsavel2_id: liga(c.responsavel2_email) }; if (c.id) Object.assign(criancas.find(x => x.id === c.id), d); else criancas.push({ ...d, id: nid(), ativo: true }); },
      async desligarCrianca(i) { precisa("secretario", "diretor"); criancas.find(c => c.id === i).ativo = false; },
      async vincularResponsavel(cid, email, slot) { precisa("secretario", "diretor"); const e = (email || "").toLowerCase().trim() || null, c = criancas.find(x => x.id === cid), p = e && perfis.find(x => x.email === e); if (slot === 2) { c.responsavel2_email = e; c.responsavel2_id = p ? p.id : null; } else { c.responsavel_email = e; c.responsavel_id = p ? p.id : null; } return p ? "vinculado" : e ? "aguardando" : "removido"; },
      async cardapio(desde, ate) { return espera(clone(cardapioL.filter(x => x.data >= desde && x.data <= ate))); },
      async salvarCardapio(linhas, apagar) { precisa("funcionario", "secretario", "diretor"); linhas.forEach(l => { const x = cardapioL.find(y => y.data === l.data && y.refeicao === l.refeicao); x ? (x.descricao = l.descricao) : cardapioL.push({ ...l, id: nid() }); }); (apagar || []).forEach(a => { const i = cardapioL.findIndex(y => y.data === a.data && y.refeicao === a.refeicao); if (i >= 0) cardapioL.splice(i, 1); }); return espera(); },
      async minhasSolicitacoes() { return espera(clone(solic.filter(x => x.responsavel_id === atual?.id).map(x => ({ ...x, criancas: x.crianca_id ? { nome: (criancas.find(c => c.id === x.crianca_id) || {}).nome } : null })))); },
      async pedirAlteracao(d) { if (!atual) throw new Error("Entre novamente."); solic.unshift({ id: nid(), responsavel_id: atual.id, responsavel_nome: atual.nome, crianca_id: d.crianca_id || null, tipo: d.tipo, detalhes: d.detalhes, status: "aberta", created_at: agora(), updated_at: agora() }); return espera(); },
      async solicitacoes() { precisa("secretario", "diretor"); return espera(clone(solic.map(x => ({ ...x, criancas: x.crianca_id ? { nome: (criancas.find(c => c.id === x.crianca_id) || {}).nome } : null })))); },
      async responderSolicitacao(i, patch) { precisa("secretario", "diretor"); Object.assign(solic.find(x => x.id === i), patch, { updated_at: agora() }); },
      async matriculas() { precisa("secretario", "diretor"); return espera(clone(matriculas.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).map(comTurma))); },
      async atualizarMatricula(i, patch) { precisa("secretario", "diretor"); Object.assign(matriculas.find(m => m.id === i), patch, { updated_at: agora() }); },
      async aprovarMatricula(i, turma, resp) { precisa("secretario", "diretor"); const m = matriculas.find(x => x.id === i); if (m.status === "aprovada") throw new Error("Este pedido já foi aprovado."); if (m.status === "cancelada") throw new Error("Este pedido foi cancelado pelo responsável."); const e2 = (m.responsavel2_email || "").toLowerCase().trim() || null, p2 = e2 && perfis.find(p => p.email === e2); const c = { id: nid(), nome: m.crianca_nome, data_nascimento: m.crianca_nascimento, turma_id: turma || m.turma_id, turno: m.turno, responsavel_id: m.responsavel_id, responsavel_email: (perfis.find(p => p.id === m.responsavel_id) || {}).email || null, responsavel_nome: m.responsavel_nome, responsavel_telefone: m.telefone, responsavel2_email: e2, responsavel2_nome: m.responsavel2_nome || null, responsavel2_id: p2 ? p2.id : null, observacoes: m.observacoes, ativo: true }; criancas.push(c); Object.assign(m, { status: "aprovada", crianca_id: c.id, turma_id: c.turma_id, resposta: resp || "Matrícula aprovada! Bem-vindos ao CEI Perseverança.", updated_at: agora() }); return c.id; },
      async freqTurma(ids, data) { return espera(clone(frequencias.filter(f => ids.includes(f.crianca_id) && f.data === data))); },
      async salvarFreq(rows) { precisa("professor", "secretario", "diretor"); rows.forEach(r => { const f = frequencias.find(x => x.crianca_id === r.crianca_id && x.data === r.data); f ? (f.presente = r.presente) : frequencias.push({ ...r, id: nid() }); }); return espera(); },
      async diariosTurma(ids, data) { return espera(clone(diarios.filter(d => ids.includes(d.crianca_id) && d.data === data))); },
      async salvarDiario(d) { precisa("professor", "secretario", "diretor"); const x = diarios.find(y => y.crianca_id === d.crianca_id && y.data === d.data); const v = { ...d, autor_nome: atual.nome, lido_em: null, updated_at: agora() }; x ? Object.assign(x, v) : diarios.push({ ...v, id: nid() }); return espera(); },

      async baterPonto(tipo, obs, geo) { precisa("funcionario", "professor", "secretario", "diretor"); if (cfgPonto.exigir && !geo) throw new Error("A Direção exige a localização para bater o ponto. Permita o acesso à localização e tente de novo."); const dist = geo && cfgPonto.lat != null ? Math.round(distanciaM(geo.lat, geo.lng, cfgPonto.lat, cfgPonto.lng)) : null; pontos.push({ id: nid(), user_id: atual.id, nome_registro: atual.nome, tipo, observacao: obs || null, registrado_em: agora(), latitude: geo ? geo.lat : null, longitude: geo ? geo.lng : null, precisao_m: geo ? Math.round(geo.acc) : null, distancia_m: dist }); return espera({ distancia_m: dist }); },
      async configPonto() { return clone(cfgPonto); },
      async salvarConfigPonto(v) { precisa("diretor"); Object.assign(cfgPonto, v); },
      async pontos(desde, ate, todos) { if (todos) precisa("diretor"); return espera(clone(pontos.filter(p => (todos || p.user_id === atual.id) && p.registrado_em >= desde && p.registrado_em < ate).sort((a, b) => a.registrado_em.localeCompare(b.registrado_em)))); },
      async ajustarPonto(i, iso, obs) { precisa("diretor"); Object.assign(pontos.find(x => x.id === i), { registrado_em: iso, observacao: obs, ajustado_por: atual.id }); },
      async removerPonto(i) { precisa("diretor"); pontos.splice(pontos.findIndex(x => x.id === i), 1); },

      async perfis() { return espera(clone(perfis)); },
      async atualizarPerfil(i, patch) { precisa("secretario", "diretor"); const alvo = perfis.find(p => p.id === i); if (alvo && alvo.papel === "responsavel" && EQUIPE.includes(patch.papel)) throw new Error("Uma conta de responsável não pode virar conta da equipe. A pessoa deve criar outra conta, com um e-mail liberado pela Direção."); if (atual.papel !== "diretor" && ("ativo" in patch || (patch.papel && !["pendente", "responsavel"].includes(patch.papel)))) throw new Error("Seu perfil não tem permissão para esta ação."); Object.assign(perfis.find(p => p.id === i), patch); },
      async convites() { precisa("secretario", "diretor"); return espera(clone(convites)); },
      async criarConvite(email, papel) { precisa("diretor"); if (perfis.some(p => p.email === email.toLowerCase().trim())) throw new Error(perfis.find(p => p.email === email.toLowerCase().trim()).papel === "responsavel" ? "Este e-mail já é uma conta de responsável e não pode virar conta da equipe. Use outro e-mail para a equipe." : "Já existe uma conta com este e-mail. Ajuste o perfil dela em Equipe e permissões."); if (atual.papel === "secretario" && !["responsavel", "professor", "funcionario"].includes(papel)) throw new Error("Seu perfil não tem permissão para esta ação."); if (convites.some(c => c.email === email)) throw new Error("Já existe um registro igual a este."); convites.unshift({ email: email.toLowerCase().trim(), papel, created_at: agora() }); },
      async removerConvite(email) { precisa("secretario", "diretor"); convites.splice(convites.findIndex(c => c.email === email), 1); },
      async excluirUsuario(i) { precisa("diretor"); if (i === atual.id) throw new Error("Para excluir a sua própria conta, use Configurações da conta."); perfis.splice(perfis.findIndex(p => p.id === i), 1); criancas.forEach(c => { if (c.responsavel_id === i) c.responsavel_id = null; }); },

      async salvarPerfil(patch) { if (!atual) throw new Error("Entre novamente."); Object.assign(atual, patch); return espera(); },
      async limparAvatares() {},
      async enviarAvatar(blob) { const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); atual.avatar_url = url; return url; },
      async trocarEmail(email) { if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido."); return espera(); },
      async confirmarSenha(s) { if (!s || s.length < 6) throw new Error("A senha atual está incorreta."); },
      async trocarSenha(a) { await this.confirmarSenha(a); return espera(); },
      async excluirConta(s) { await this.confirmarSenha(s); if (atual.papel === "diretor" && !perfis.some(p => p.papel === "diretor" && p.ativo && p.id !== atual.id)) throw new Error("Você é a única conta da direção. Passe o perfil de Direção para outra pessoa antes de excluir sua conta."); perfis.splice(perfis.indexOf(atual), 1); atual = null; avisa("SIGNED_OUT"); }
    };
  }

  async function conectar() {
    if (window.supabase && C.supabaseUrl && C.supabaseKey) {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(C.supabaseUrl + "/auth/v1/health", { headers: { apikey: C.supabaseKey }, signal: ctl.signal });
        clearTimeout(t);
        if (r.ok || r.status === 401) return criarReal(window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, storageKey: "pv-auth" } }));
      } catch (e) {}
    }
    return criarDemo();
  }

  /* ================= avatares ================= */
  const AVATARES = {
    sol: ["#CC3366", '<circle cx="12" cy="12" r="4.5" fill="#fff" stroke="none"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'],
    folha: ["#3F3A64", '<path fill="#fff" stroke="none" d="M5 19C4 10 10 4 20 4c0 10-6 16-15 15z"/><path stroke="#3F3A64" d="M6 18c4-5 8-8 11-10"/>'],
    peixe: ["#6C63A8", '<path fill="#fff" stroke="none" d="M3 12c3-4 8-6 12-4l5-3v14l-5-3c-4 2-9 0-12-4z"/><circle cx="8" cy="11" r="1.1" fill="#6C63A8" stroke="none"/>'],
    estrela: ["#F16C6C", '<path fill="#fff" stroke="none" d="M12 2.5l2.8 6.2 6.7.6-5.1 4.5 1.5 6.6L12 17l-5.9 3.4 1.5-6.6L2.5 9.3l6.7-.6z"/>'],
    coracao: ["#CC3366", '<path fill="#fff" stroke="none" d="M12 20.5s-8-4.7-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.9-8 10.6-8 10.6z"/>'],
    barco: ["#2B2748", '<path fill="#fff" stroke="none" d="M11 3v11H4z M13 6l6 8h-6z"/><path d="M3 17h18l-2 3H5z" fill="#fff"/>'],
    flor: ["#F16C6C", '<g fill="#fff" stroke="none"><circle cx="12" cy="6.5" r="3.2"/><circle cx="17.2" cy="10.3" r="3.2"/><circle cx="15.2" cy="16.5" r="3.2"/><circle cx="8.8" cy="16.5" r="3.2"/><circle cx="6.8" cy="10.3" r="3.2"/></g><circle cx="12" cy="11.8" r="2.6" fill="#CC3366" stroke="none"/>'],
    lapis: ["#6C63A8", '<path d="M4 20l1.2-4.8L15.5 4.9a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/><path d="M13.5 7l3.5 3.5"/>']
  };
  const CORES = ["#3F3A64", "#6C63A8", "#F16C6C", "#CC3366", "#A82B55"];
  function iniciais(n) { const p = String(n || "?").replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(w => !/^(exemplo|de|da|do|dos|das|e)$/i.test(w)); if (!p.length) p.push("?"); return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); }
  function avatar(perfil, tam) {
    tam = tam || 40; const u = perfil && perfil.avatar_url;
    const base = x => `class="av" style="width:${tam}px;height:${tam}px;${x || ""}"`;
    if (u && u.startsWith("preset:") && AVATARES[u.slice(7)]) { const [cor, ic] = AVATARES[u.slice(7)]; return `<span ${base()}><svg viewBox="0 0 24 24" width="100%" height="100%"><rect width="24" height="24" fill="${cor}"/><g transform="translate(4.2 4.2) scale(.65)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</g></svg></span>`; }
    if (u && /^(https:|data:image\/)/.test(u)) return `<span ${base()}><img src="${esc(u)}" alt="" style="width:100%;height:100%;object-fit:cover"></span>`;
    if (!perfil) return `<span ${base("background:var(--surface-2);color:var(--muted)")}><svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>`;
    const h = [...String(perfil.nome || "")].reduce((a, c) => a + c.charCodeAt(0), 0);
    return `<span ${base(`background:${CORES[h % CORES.length]};color:#fff;font-size:${Math.round(tam * .4)}px`)}>${esc(iniciais(perfil.nome))}</span>`;
  }

  /* ================= menu da conta ================= */
  const EQUIPE = ["funcionario", "professor", "secretario", "diretor"];
  const areaDe = p => !p ? null : EQUIPE.includes(p.papel) ? ["equipe.html", "Área da Equipe"] : ["responsavel.html", "Área do Responsável"];
  async function montarMenuConta(slot, api, perfil, op) {
    op = op || {};
    if (perfil === undefined) { try { perfil = (await api.sessao()) ? await api.perfil() : null; } catch (e) { perfil = null; } }
    const email = perfil ? await api.email().catch(() => "") : "", area = areaDe(perfil);
    slot.innerHTML = `<button class="acct-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="${perfil ? "Conta de " + esc(perfil.nome) : "Entrar"}">${avatar(perfil, 40)}${perfil ? '<span class="acct-dot" aria-hidden="true"></span>' : ""}</button>
      <div class="acct-menu" role="menu" hidden>
      ${perfil ? `<div class="acct-head">${avatar(perfil, 52)}<div style="min-width:0"><b>${esc(perfil.nome)}</b><small>${esc(email)}</small><span class="pill sun" style="margin-top:6px">${PAPEIS[perfil.papel] || ""}</span></div></div>
        ${op.semArea ? "" : `<a role="menuitem" href="${area[0]}">${area[1]}</a>`}${EQUIPE.includes(perfil.papel) ? (location.pathname.endsWith("responsavel.html") ? `<a role="menuitem" href="equipe.html">Área da Equipe</a>` : `<a role="menuitem" href="responsavel.html">Área do Responsável (família)</a>`) : ""}<a role="menuitem" href="conta.html">Configurações da conta</a><button role="menuitem" type="button" data-sair>Sair</button>`
      : `<div class="acct-head"><div><b>Você não está conectado</b><small>Escolha onde entrar</small></div></div><a role="menuitem" href="responsavel.html">Área do Responsável</a><a role="menuitem" href="equipe.html">Área da Equipe</a>`}
      </div>`;
    const btn = slot.querySelector(".acct-btn"), menu = slot.querySelector(".acct-menu");
    const fechar = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute("aria-expanded", String(!menu.hidden)); if (!menu.hidden) som.boing(); };
    document.addEventListener("click", e => { if (!slot.contains(e.target)) fechar(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") fechar(); });
    const s = slot.querySelector("[data-sair]"); if (s) s.onclick = async () => { await api.sair(); if (op.aoSair) op.aoSair(); };
    return perfil;
  }

  /* ================= localização (ponto) ================= */
  function distanciaM(a, b, c, d) { const R = 6371000, r = x => x * Math.PI / 180, dl = r(c - a), dn = r(d - b); return 2 * R * Math.asin(Math.sqrt(Math.sin(dl / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(dn / 2) ** 2)); }
  function obterLocal() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("Este aparelho não informa a localização."));
      navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy || 0 }),
        e => rej(new Error(e.code === 1 ? "A permissão de localização foi negada. Libere a localização para este site nas configurações do navegador." : e.code === 3 ? "A localização demorou demais para responder. Tente de novo em um lugar aberto." : "Não foi possível obter a localização agora.")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
    });
  }
  const fmtDist = m => m == null ? "" : m < 1000 ? m + " m" : (m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";

  /* ================= imagens: reduz antes de enviar ================= */
  function reduzirImagem(arq, maxLado, qualidade) {
    return new Promise((res, rej) => {
      if (!/^image\/(jpeg|png|webp)$/.test(arq.type)) return rej(new Error("Use imagens JPG, PNG ou WebP."));
      if (arq.size > 25 * 1024 * 1024) return rej(new Error("Imagem muito grande. Escolha uma com menos de 25 MB."));
      const img = new Image();
      img.onload = () => { const k = Math.min(1, maxLado / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src); c.toBlob(b => b ? res(b) : rej(new Error("Não foi possível processar a imagem.")), "image/jpeg", qualidade || .85); };
      img.onerror = () => rej(new Error("Arquivo de imagem inválido."));
      img.src = URL.createObjectURL(arq);
    });
  }

  /* ================= aviso de cookies ================= */
  function avisoCookies(forcar) {
    if (!forcar && consentimento()) return;
    let el = document.getElementById("pv-cookies"); if (el) el.remove();
    el = document.createElement("div"); el.id = "pv-cookies"; el.className = "cookies"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Aviso de cookies");
    el.innerHTML = `<div><b>Cookies e armazenamento no seu navegador</b><p>Usamos só o essencial para o login funcionar. Com a sua permissão, também lembramos suas preferências (modo claro/escuro e sons). Não usamos cookies de propaganda nem de rastreamento. <a href="privacidade.html#cookies">Saiba mais</a></p></div>
      <div class="cookies-acoes"><button type="button" class="btn btn-soft btn-sm" data-c="essenciais">Só os essenciais</button><button type="button" class="btn btn-leaf btn-sm" data-c="todos">Aceitar todos</button></div>`;
    document.body.appendChild(el);
    el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
      try { localStorage.setItem("pv-cookies", b.dataset.c); } catch (e) {}
      if (b.dataset.c === "essenciais") PREF.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      else { gravarLS("pv-tema", root.getAttribute("data-theme")); gravarLS("pv-som", som.ligado ? "1" : "0"); }
      el.classList.add("sai"); setTimeout(() => el.remove(), 300);
    });
  }
  document.addEventListener("click", e => { const a = e.target.closest("[data-cookies]"); if (a) { e.preventDefault(); avisoCookies(true); } });

  window.PV = { config: C, conectar, som, esc, toast, fmtData, fmtDia, fmtHora, hojeISO, isoLocal, diaLocal, idade, PAPEIS, PONTO, STATUS, stClasse, horasDoDia, fmtHoras, traduzErro, avatar, AVATARES, montarMenuConta, areaDe, EQUIPE, montarControles, explosao, reduzirImagem, avisoCookies, obterLocal, distanciaM, fmtDist };
  document.addEventListener("DOMContentLoaded", () => { montarControles(); avisoCookies(false); });
})();
