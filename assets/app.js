// Portfólio JuanIan7: liga as opções da abertura ao formulário e envia o pedido.
(function () {
  "use strict";
  var cfg = window.PORTFOLIO || {};
  var form = document.getElementById("form-pedido");
  if (!form) return;
  var aviso = document.getElementById("aviso");
  var botao = document.getElementById("enviar");
  var previa = document.getElementById("previa");
  var abertoEm = Date.now();

  if (!cfg.endpoint && previa) previa.classList.add("mostra");

  // Tocar numa opção da abertura já marca a mesma opção no formulário.
  document.querySelectorAll("[data-opcao]").forEach(function (a) {
    a.addEventListener("click", function () {
      var alvo = form.querySelector('input[name="opcao"][value="' + a.getAttribute("data-opcao") + '"]');
      if (alvo) alvo.checked = true;
      setTimeout(function () { document.getElementById("descricao").focus({ preventScroll: true }); }, 500);
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

    var resumo = [
      "Pedido: " + pedido.opcao,
      "Descrição: " + pedido.descricao,
      "Nome: " + pedido.nome,
      "WhatsApp: " + pedido.whatsapp,
      "Cidade: " + (pedido.cidade || "não informada"),
      "Prazo: " + pedido.prazo,
      "Site ou domínio: " + pedido.ja_tem,
      "Investimento: " + pedido.investimento,
      "Responder por: " + pedido.atendimento
    ].join("\n");

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
