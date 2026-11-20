// Portfólio JuanIan7: liga as opções da abertura ao formulário, transforma fala em texto,
// mostra perguntas rápidas conforme o pedido e envia tudo.
(function () {
  "use strict";
  var cfg = window.PORTFOLIO || {};
  var form = document.getElementById("form-pedido");
  if (!form) return;
  var aviso = document.getElementById("aviso");
  var botao = document.getElementById("enviar");
  var previa = document.getElementById("previa");
  var descricao = document.getElementById("descricao");
  var abertoEm = Date.now();

  if (!cfg.endpoint && previa) previa.classList.add("mostra");

  // Tocar numa opção da abertura já marca a mesma opção no formulário.
  document.querySelectorAll("[data-opcao]").forEach(function (a) {
    a.addEventListener("click", function () {
      var alvo = form.querySelector('input[name="opcao"][value="' + a.getAttribute("data-opcao") + '"]');
      if (alvo) { alvo.checked = true; montarGuia(); }
      setTimeout(function () { descricao.focus({ preventScroll: true }); }, 500);
    });
  });

  function limpar(texto, max) {
    // Tira caracteres de controle e corta no tamanho máximo. O servidor valida de novo.
    return String(texto || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
  }

  function mostrar(tipo, html) {
    aviso.className = "aviso-form " + tipo;
    aviso.innerHTML = html;
    aviso.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function escapar(s) {
    return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  // ---------------------------------------------------------------------------
  // Falar em vez de digitar. Quem transforma a fala em texto é o próprio navegador;
  // o áudio não é gravado nem enviado por este site.
  // ---------------------------------------------------------------------------
  var caixaFalar = document.getElementById("falar");
  var microfone = document.getElementById("microfone");
  var rotMicrofone = document.getElementById("microfone-rot");
  var ouvindo = document.getElementById("ouvindo");
  var dicaFalar = document.getElementById("falar-dica");
  var semFalar = document.getElementById("falar-sem");
  var DICA = "Segure o botão e fale. Ao soltar, a fala vira texto para você conferir e mudar.";
  var fala = { ativo: false, rec: null, acumulado: "", sessao: "", parcial: "", erro: "", apertouEm: 0, travado: false };

  function Reconhecedor() { return window.SpeechRecognition || window.webkitSpeechRecognition; }

  function juntar(a, b) {
    a = (a || "").trim(); b = (b || "").trim();
    return a && b ? a + " " + b : a || b;
  }

  function pintarFala() {
    if (!ouvindo) return;
    var certo = juntar(fala.acumulado, fala.sessao);
    ouvindo.textContent = "";
    if (!certo && !fala.parcial) { ouvindo.textContent = "Ouvindo..."; return; }
    ouvindo.appendChild(document.createTextNode(certo + (certo && fala.parcial ? " " : "")));
    if (fala.parcial) {
      var s = document.createElement("span");
      s.className = "parcial";
      s.textContent = fala.parcial.trim();
      ouvindo.appendChild(s);
    }
  }

  function novaSessao() {
    var R = Reconhecedor();
    var rec = new R();
    fala.rec = rec;
    fala.sessao = ""; fala.parcial = "";
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;   // uma frase por vez, religando enquanto o botão está apertado (evita texto repetido no Android)
    rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var certo = "", parcial = "";
      for (var i = 0; i < ev.results.length; i++) {
        var r = ev.results[i];
        if (r.isFinal) certo += r[0].transcript + " "; else parcial += r[0].transcript;
      }
      fala.sessao = certo; fala.parcial = parcial;
      pintarFala();
    };
    rec.onerror = function (ev) { if (ev.error !== "no-speech" && ev.error !== "aborted") fala.erro = ev.error; };
    rec.onend = function () {
      fala.acumulado = juntar(fala.acumulado, fala.sessao || fala.parcial);
      fala.sessao = ""; fala.parcial = "";
      if (fala.ativo && !fala.erro) {
        try { novaSessao(); return; } catch (e) { fala.erro = "falha"; }
      }
      concluirFala();
    };
    rec.start();
  }

  function comecarFala() {
    if (fala.ativo) return;
    fala.ativo = true; fala.acumulado = ""; fala.erro = "";
    microfone.setAttribute("aria-pressed", "true");
    rotMicrofone.textContent = fala.travado ? "Toque para terminar" : "Solte para terminar";
    ouvindo.hidden = false;
    dicaFalar.textContent = DICA;
    pintarFala();
    try { novaSessao(); } catch (e) { fala.erro = "falha"; fala.ativo = false; concluirFala(); }
  }

  function pararFala() {
    if (!fala.ativo) return;
    fala.ativo = false;
    rotMicrofone.textContent = "Passando para texto...";
    try { fala.rec.stop(); } catch (e) { concluirFala(); }
  }

  function concluirFala() {
    fala.ativo = false; fala.travado = false;
    microfone.setAttribute("aria-pressed", "false");
    rotMicrofone.textContent = "Segure para falar";
    ouvindo.hidden = true;
    var texto = limpar(fala.acumulado, 2000);
    fala.acumulado = "";
    var erros = {
      "not-allowed": "O navegador bloqueou o microfone. Libere o microfone para este site e tente de novo.",
      "service-not-allowed": "O navegador bloqueou o microfone. Libere o microfone para este site e tente de novo.",
      "audio-capture": "Não achei um microfone neste aparelho.",
      "network": "Sem internet para passar a fala para texto. O que você já escreveu continua na caixa."
    };
    if (fala.erro) dicaFalar.textContent = erros[fala.erro] || "Não consegui passar a fala para texto. Tente de novo ou escreva na caixa.";
    else if (!texto) dicaFalar.textContent = "Não ouvi nada. Chegue mais perto do microfone e tente de novo.";
    else dicaFalar.textContent = "Pronto, virou texto. Confira na caixa e mude o que quiser antes de enviar.";
    if (texto) {
      var antes = descricao.value.replace(/\s+$/, "");
      descricao.value = (antes ? antes + " " : "") + texto.charAt(0).toUpperCase() + texto.slice(1);
      if (descricao.value.length > 2000) descricao.value = descricao.value.slice(0, 2000);
      descricao.focus({ preventScroll: true });
      descricao.setSelectionRange(descricao.value.length, descricao.value.length);
      montarGuia();
    }
  }

  if (microfone && caixaFalar) {
    if (Reconhecedor()) {
      caixaFalar.hidden = false;
      dicaFalar.textContent = DICA;
      microfone.addEventListener("pointerdown", function (ev) {
        if (ev.button) return;
        ev.preventDefault();
        if (fala.travado) return;            // toque rápido deixou ligado: o próximo toque desliga (no pointerup)
        fala.apertouEm = Date.now();
        try { microfone.setPointerCapture(ev.pointerId); } catch (e) {}
        comecarFala();
      });
      var soltar = function () {
        if (!fala.ativo) return;
        if (fala.travado) { pararFala(); return; }
        // Toque rápido (não segurou): fica ouvindo até tocar de novo.
        if (Date.now() - fala.apertouEm < 350) { fala.travado = true; rotMicrofone.textContent = "Toque para terminar"; return; }
        pararFala();
      };
      microfone.addEventListener("pointerup", soltar);
      microfone.addEventListener("pointercancel", function () { if (fala.ativo && !fala.travado) pararFala(); });
      microfone.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });
      // Teclado (Enter ou espaço): liga e desliga.
      microfone.addEventListener("click", function (ev) {
        if (ev.detail !== 0) return;
        if (fala.ativo) pararFala(); else { fala.travado = true; comecarFala(); }
      });
    } else if (semFalar) {
      semFalar.hidden = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Perguntas rápidas: mudam conforme a opção marcada e as palavras da descrição.
  // Tudo acontece no aparelho de quem preenche; nada sai antes do "Enviar pedido".
  // ---------------------------------------------------------------------------
  var guia = document.getElementById("guia");
  var guiaLista = document.getElementById("guia-lista");
  var respostas = {};      // id da pergunta -> resposta (fica guardada se a pergunta sumir e voltar)
  var guiaAtual = "";
  var MAX_PERGUNTAS = 6;
  var perguntasIA = [];    // perguntas sugeridas pela IA para este pedido (entram depois das fixas)

  var BANCO = {
    "Um site": [
      { id: "site_para", p: "O site é para quê?", tipo: "varias", ops: ["Apresentar o negócio", "Vender produtos", "Marcar horários", "Receber contatos"] },
      { id: "site_material", p: "Já tem logo, fotos e textos?", tipo: "uma", ops: ["Tenho tudo", "Tenho uma parte", "Ainda não tenho"] },
      { id: "site_paginas", p: "Quantas páginas você imagina?", tipo: "uma", ops: ["Uma só", "Até 5", "Até 8", "Mais de 8", "Não sei"] },
      { id: "site_referencia", p: "Tem algum site que você acha bonito?", tipo: "texto", dica: "Pode ser o nome ou o endereço" }
    ],
    "Um aplicativo ou sistema": [
      { id: "app_quem", p: "Quem vai usar?", tipo: "uma", ops: ["Só eu", "Minha equipe", "Meus clientes", "Equipe e clientes"] },
      { id: "app_quantos", p: "Quantas pessoas, mais ou menos?", tipo: "uma", ops: ["Até 5", "6 a 20", "21 a 100", "Mais de 100"] },
      { id: "app_onde", p: "Onde vai ser mais usado?", tipo: "uma", ops: ["No celular", "No computador", "Nos dois"] },
      { id: "app_hoje", p: "Como isso é feito hoje?", tipo: "uma", ops: ["No papel", "Em planilha", "Em outro sistema", "Não é feito"] }
    ],
    "Uma planilha inteligente": [
      { id: "plan_ja", p: "Você já usa uma planilha para isso?", tipo: "uma", ops: ["Sim, quero melhorar a minha", "Não, começar do zero"] },
      { id: "plan_calc", p: "O que ela precisa calcular ou avisar?", tipo: "texto", dica: "Ex.: somar as vendas do mês e avisar conta vencendo" },
      { id: "plan_quantos", p: "Quantas pessoas vão preencher?", tipo: "uma", ops: ["Só eu", "2 a 5", "Mais de 5"] },
      { id: "plan_onde", p: "Onde prefere usar?", tipo: "uma", ops: ["Google Planilhas", "Excel", "Tanto faz"] }
    ],
    "Controle mensal do meu negócio": [
      { id: "ctrl_oque", p: "O que você quer acompanhar?", tipo: "varias", ops: ["Caixa", "Estoque", "Agenda", "Clientes", "Lucro"] },
      { id: "ctrl_hoje", p: "Como você controla hoje?", tipo: "uma", ops: ["No caderno", "Em planilha", "Em um aplicativo", "Não controlo"] },
      { id: "ctrl_equipe", p: "Quantas pessoas trabalham com você?", tipo: "uma", ops: ["Só eu", "2 a 5", "Mais de 5"] },
      { id: "ctrl_ramo", p: "Qual é o ramo do negócio?", tipo: "texto", dica: "Ex.: salão, clínica, loja de roupas" }
    ],
    "Acompanhar boletins ou publicações com o meu nome": [
      { id: "bol_onde", p: "Onde quer procurar?", tipo: "varias", ops: ["Diário Oficial do Estado", "Diário Oficial da União", "Boletim interno do meu órgão", "Outro lugar"] },
      { id: "bol_quem", p: "É para você ou para mais gente?", tipo: "uma", ops: ["Só para mim", "Para uma equipe"] },
      { id: "bol_freq", p: "De quanto em quanto tempo quer conferir?", tipo: "uma", ops: ["Todo dia", "Toda semana", "De vez em quando"] }
    ],
    "Mudar algo em um projeto que já tenho com você": [
      { id: "mud_qual", p: "Qual é o projeto?", tipo: "texto", dica: "Ex.: o site do consultório" },
      { id: "mud_oque", p: "O que você quer mudar?", tipo: "varias", ops: ["Texto", "Fotos", "Cores ou visual", "Uma página nova", "Uma função nova", "Corrigir um erro"] },
      { id: "mud_onde", p: "Em qual página ou parte?", tipo: "texto", dica: "Ex.: a parte de preços, na página inicial" },
      { id: "mud_material", p: "Já tem o material novo (textos, fotos)?", tipo: "uma", ops: ["Tenho", "Tenho uma parte", "Ainda não", "Não precisa de material"] },
      { id: "mud_pressa", p: "É urgente?", tipo: "uma", ops: ["Sim, está atrapalhando", "Pode ser nos próximos dias", "Sem pressa"] }
    ],
    "Outra coisa": [
      { id: "out_quem", p: "Para quem é?", tipo: "uma", ops: ["Para mim", "Para o meu negócio", "Para uma equipe"] },
      { id: "out_hoje", p: "Como isso é feito hoje?", tipo: "texto", dica: "Conte em uma frase" },
      { id: "out_bom", p: "O que seria um bom resultado para você?", tipo: "texto", dica: "Ex.: parar de anotar tudo no caderno" }
    ]
  };

  // Perguntas que só aparecem quando a descrição toca no assunto.
  var EXTRAS = [
    { re: /agend|marca[rç]|hor[aá]rio|reserva/i, q: { id: "x_agenda", p: "Hoje os clientes marcam horário como?", tipo: "uma", ops: ["Pelo WhatsApp", "Por telefone", "Por um aplicativo", "Pessoalmente"] } },
    { re: /vend|loja|produto|pagamento|pix|cart[aã]o|carrinho/i, q: { id: "x_pagar", p: "Quer receber pagamento por ali?", tipo: "uma", ops: ["Sim, com Pix ou cartão", "Não, só mostrar os produtos", "Ainda não sei"] } },
    { re: /estoque|mercadoria|insumo/i, q: { id: "x_estoque", p: "Quantos itens diferentes tem no estoque?", tipo: "uma", ops: ["Até 50", "51 a 300", "Mais de 300"] } },
    { re: /funcion[aá]ri|equipe|colaborador|escala|plant[aã]o/i, q: { id: "x_login", p: "Cada pessoa precisa entrar com o próprio login?", tipo: "uma", ops: ["Sim", "Não", "Não sei"] } },
    { re: /relat[oó]rio|gr[aá]fico|indicador|pdf/i, q: { id: "x_relatorio", p: "Precisa gerar relatório ou PDF?", tipo: "uma", ops: ["Sim, em PDF", "Sim, só na tela", "Não precisa"] } },
    { re: /inaugura|evento|data marcada|at[eé] o dia|urgente|urg[eê]ncia/i, q: { id: "x_data", p: "Qual é a data que não pode passar?", tipo: "texto", dica: "Ex.: 15 de dezembro" } },
    { re: /instagram|facebook|rede social|redes sociais|tiktok/i, q: { id: "x_redes", p: "Quer ligar isso às suas redes sociais?", tipo: "uma", ops: ["Sim", "Não", "Não sei"] } }
  ];

  function opcaoMarcada() {
    var m = form.querySelector('input[name="opcao"]:checked');
    return m ? m.value : "";
  }

  function perguntasDaVez() {
    var base = BANCO[opcaoMarcada()];
    if (!base) return [];
    var lista = base.slice();
    if (perguntasIA.length) return lista.concat(perguntasIA);   // a IA já olhou a descrição: dispensa as extras por palavra
    var texto = descricao.value;
    for (var i = 0; i < EXTRAS.length && lista.length < MAX_PERGUNTAS; i++) {
      if (EXTRAS[i].re.test(texto)) lista.push(EXTRAS[i].q);
    }
    return lista.slice(0, MAX_PERGUNTAS);
  }

  function desenharPergunta(q) {
    var bloco;
    if (q.tipo === "texto") {
      bloco = document.createElement("div");
      bloco.className = "campo";
      var rot = document.createElement("label");
      rot.className = "rot"; rot.htmlFor = "g_" + q.id; rot.textContent = q.p;
      var campo = document.createElement("input");
      campo.type = "text"; campo.id = "g_" + q.id; campo.maxLength = 200; campo.autocomplete = "off";
      if (q.dica) campo.placeholder = q.dica;
      campo.value = respostas[q.id] || "";
      campo.addEventListener("input", function () { respostas[q.id] = campo.value; });
      bloco.appendChild(rot); bloco.appendChild(campo);
      return bloco;
    }
    bloco = document.createElement("fieldset");
    var leg = document.createElement("legend");
    leg.textContent = q.p;
    if (q.tipo === "varias") {
      var peq = document.createElement("small");
      peq.textContent = " (pode marcar mais de uma)";
      leg.appendChild(peq);
    }
    var ops = document.createElement("div");
    ops.className = "opcoes";
    var marcadas = String(respostas[q.id] || "").split(", ");
    q.ops.forEach(function (texto) {
      var lab = document.createElement("label");
      lab.className = "escolha";
      var inp = document.createElement("input");
      inp.type = q.tipo === "varias" ? "checkbox" : "radio";
      inp.name = "g_" + q.id; inp.value = texto;
      inp.checked = marcadas.indexOf(texto) !== -1;
      inp.addEventListener("change", function () {
        var sel = [];
        ops.querySelectorAll("input:checked").forEach(function (c) { sel.push(c.value); });
        respostas[q.id] = sel.join(", ");
      });
      lab.appendChild(inp); lab.appendChild(document.createTextNode(texto));
      ops.appendChild(lab);
    });
    bloco.appendChild(leg); bloco.appendChild(ops);
    return bloco;
  }

  function montarGuia() {
    if (!guia || !guiaLista) return;
    var lista = perguntasDaVez();
    var chave = lista.map(function (q) { return q.id; }).join("|");
    if (chave === guiaAtual) return;       // nada mudou: não redesenha, para não tirar o foco de quem está digitando
    guiaAtual = chave;
    guiaLista.textContent = "";
    guia.hidden = lista.length === 0;
    var marcouIA = false;
    lista.forEach(function (q) {
      if (q.ia && !marcouIA) {
        marcouIA = true;
        var div = document.createElement("p");
        div.className = "guia-ia-rot"; div.id = "guia-ia-rot";
        div.textContent = "Perguntas para o seu caso ";
        var selo = document.createElement("span");
        selo.textContent = cfg.endpoint ? "sugeridas por IA" : "exemplo: a IA ainda não está ligada";
        div.appendChild(selo);
        guiaLista.appendChild(div);
      }
      guiaLista.appendChild(desenharPergunta(q));
    });
    if (caixaIA) caixaIA.hidden = !cfg.ia || lista.length === 0;
  }

  // --- IA: lê o tipo de pedido e a descrição e sugere as perguntas que faltam --------------
  var caixaIA = document.getElementById("guia-ia");
  var botaoIA = document.getElementById("pedir-ia");
  var notaIA = document.getElementById("guia-ia-nota");
  var NOTA_IA = notaIA ? notaIA.textContent : "";
  var usosIA = 0, MAX_USOS_IA = 3;

  function validarPerguntasIA(lista) {
    if (!Array.isArray(lista)) return [];
    var boas = [];
    lista.slice(0, 4).forEach(function (q, i) {
      if (!q || typeof q.p !== "string") return;
      var p = limpar(q.p, 160);
      if (p.length < 8) return;
      var ops = Array.isArray(q.ops) ? q.ops.map(function (o) { return limpar(o, 48); }).filter(Boolean).slice(0, 5) : [];
      boas.push({ id: "ia_" + usosIA + "_" + i, p: p, tipo: q.tipo === "uma" && ops.length >= 2 ? "uma" : "texto", ops: ops, ia: true });
    });
    return boas;
  }

  function exemploIA() {
    // Só na prévia local (sem endereço de envio): mostra como a tela fica, com perguntas de exemplo.
    return new Promise(function (ok) {
      setTimeout(function () {
        ok({ ok: true, perguntas: [
          { p: "Quantos clientes você atende por dia, mais ou menos?", tipo: "uma", ops: ["Até 10", "11 a 30", "Mais de 30"] },
          { p: "O cliente precisa receber um lembrete antes do horário?", tipo: "uma", ops: ["Sim, pelo WhatsApp", "Não precisa", "Não sei"] },
          { p: "Tem algo que hoje dá mais dor de cabeça nesse processo?", tipo: "texto", ops: [] }
        ] });
      }, 900);
    });
  }

  function pedirIA() {
    var opcao = opcaoMarcada();
    var texto = limpar(descricao.value, 1200);
    if (!opcao || texto.length < 20) {
      notaIA.textContent = "Antes, conte um pouco mais na caixa \"Conte com as suas palavras\" (escrevendo ou falando).";
      descricao.focus();
      return;
    }
    if (usosIA >= MAX_USOS_IA) { notaIA.textContent = "As perguntas já foram atualizadas algumas vezes. Pode enviar o pedido assim."; return; }
    usosIA++;
    botaoIA.disabled = true;
    botaoIA.textContent = "Pensando nas perguntas...";
    var corpo = {
      acao: "perguntas", opcao: opcao, descricao: texto,
      ja: (BANCO[opcao] || []).map(function (q) { return q.p; }),
      site_da_empresa: limpar(new FormData(form).get("site_da_empresa"), 100),
      segundos: Math.round((Date.now() - abertoEm) / 1000)
    };
    var chamada = cfg.endpoint
      ? fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(corpo) }).then(function (r) { return r.json(); })
      : exemploIA();
    chamada.then(function (r) {
      var novas = r && r.ok ? validarPerguntasIA(r.perguntas) : [];
      if (!novas.length) throw new Error("sem perguntas");
      perguntasIA = novas;
      montarGuia();
      notaIA.textContent = NOTA_IA;
      var rot = document.getElementById("guia-ia-rot");
      if (rot) rot.scrollIntoView({ block: "center", behavior: "smooth" });
    }).catch(function () {
      notaIA.textContent = "Não consegui pensar em perguntas agora. Pode enviar o pedido assim mesmo; eu pergunto o resto depois.";
    }).then(function () {
      botaoIA.disabled = false;
      botaoIA.textContent = perguntasIA.length ? "Atualizar as perguntas" : "Ver perguntas para o meu caso";
    });
  }
  if (botaoIA) botaoIA.addEventListener("click", pedirIA);

  function respostasDadas() {
    var saida = [];
    perguntasDaVez().forEach(function (q) {
      var r = limpar(respostas[q.id], 300);
      if (r) saida.push({ p: limpar(q.p, 160), r: r });
    });
    return saida.slice(0, 10);
  }

  form.querySelectorAll('input[name="opcao"]').forEach(function (r) {
    r.addEventListener("change", function () {
      perguntasIA = [];      // as perguntas da IA eram para o outro tipo de pedido
      if (botaoIA) botaoIA.textContent = "Ver perguntas para o meu caso";
      montarGuia();
    });
  });
  if (descricao) {
    descricao.addEventListener("blur", montarGuia);
    var espera;
    descricao.addEventListener("input", function () { clearTimeout(espera); espera = setTimeout(montarGuia, 900); });
  }
  form.addEventListener("reset", function () { respostas = {}; perguntasIA = []; guiaAtual = ""; setTimeout(montarGuia, 0); });
  montarGuia();

  // ---------------------------------------------------------------------------
  // Envio
  // ---------------------------------------------------------------------------
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var d = new FormData(form);
    var pedido = {
      opcao: limpar(d.get("opcao"), 80),
      descricao: limpar(d.get("descricao"), 2000),
      nome: limpar(d.get("nome"), 120),
      whatsapp: limpar(d.get("whatsapp"), 20),
      cidade: limpar(d.get("cidade"), 80),
      prazo: limpar(d.get("prazo"), 40),
      ja_tem: limpar(d.get("ja_tem"), 40),
      investimento: limpar(d.get("investimento"), 40),
      atendimento: limpar(d.get("atendimento"), 40),
      respostas: respostasDadas(),
      site_da_empresa: limpar(d.get("site_da_empresa"), 100),   // campo-isca: gente não vê, robô preenche
      segundos: Math.round((Date.now() - abertoEm) / 1000)
    };

    var faltas = [];
    if (!pedido.opcao) faltas.push("escolha o que você precisa");
    if (pedido.descricao.length < 10) faltas.push("conte um pouco mais na descrição");
    if (pedido.nome.length < 2) faltas.push("informe o seu nome");
    if (pedido.whatsapp.replace(/\D/g, "").length < 10) faltas.push("informe o WhatsApp com DDD");
    if (!d.get("aceite")) faltas.push("marque a autorização de uso dos dados");
    if (faltas.length) {
      mostrar("erro", "Falta pouco: " + escapar(faltas.join("; ")) + ".");
      return;
    }

    var linhas = [
      "Pedido: " + pedido.opcao,
      "Descrição: " + pedido.descricao
    ];
    pedido.respostas.forEach(function (x) { linhas.push("  " + x.p + " " + x.r); });
    linhas.push(
      "Nome: " + pedido.nome,
      "WhatsApp: " + pedido.whatsapp,
      "Cidade: " + (pedido.cidade || "não informada"),
      "Prazo: " + pedido.prazo,
      "Site ou domínio: " + pedido.ja_tem,
      "Investimento: " + pedido.investimento,
      "Responder por: " + pedido.atendimento
    );
    var resumo = linhas.join("\n");

    if (!cfg.endpoint) {
      mostrar("ok", "<h3>Prévia: nada foi enviado</h3>É assim que o pedido vai chegar ao Juan quando o envio for ligado.<pre>" + escapar(resumo) + "</pre>");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando pedido...";
    // text/plain evita a consulta prévia (preflight) que o Apps Script não responde.
    fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(pedido) })
      .then(function (r) { return r.json(); })
      .then(function (r) {
        if (!r || !r.ok) throw new Error((r && r.erro) || "resposta inesperada");
        form.reset();
        mostrar("ok", "<h3>Pedido enviado</h3>Recebi o seu pedido, " + escapar(pedido.nome.split(" ")[0]) + ". Respondo pelo contato que você escolheu.");
      })
      .catch(function () {
        mostrar("erro", "O pedido não foi enviado. Confira a internet e toque em \"Enviar pedido\" de novo. O que você escreveu continua na tela.");
      })
      .then(function () {
        botao.disabled = false;
        botao.textContent = "Enviar pedido";
      });
  });
})();
