// 🔹 Elementos do DOM
const saudacaoForm = document.getElementById("saudacao-form");
const fluxoForm = document.getElementById("fluxo-form");
const acompanhamentoForm = document.getElementById("acompanhamento-form");

const listaFluxo = document.getElementById("lista-fluxo");
const listaAcompanhamento = document.getElementById("lista-acompanhamento");

// 🔹 Variáveis para armazenar fluxos e mensagens de acompanhamento
let fluxoMensagens = [];
let acompanhamentoMensagens = [];

// 🔹 Função para adicionar uma mensagem ao fluxo
function adicionarAoFluxo() {
    const conteudo = document.getElementById("conteudo").value.trim();
    const intervalo = parseInt(document.getElementById("intervalo").value, 10);
    const arquivo = document.getElementById("arquivo-upload").files[0];

    if (!conteudo && !arquivo) {
        alert("Por favor, insira um conteúdo ou carregue um arquivo.");
        return;
    }

    if (isNaN(intervalo) || intervalo < 1 || intervalo > 60) {
        alert("O intervalo deve ser entre 1 e 60 segundos.");
        return;
    }

    const leitor = new FileReader();
    leitor.onload = function (e) {
        fluxoMensagens.push({
            conteudo: conteudo || null,
            tipo: arquivo ? arquivo.type.split("/")[0] : "texto",
            arquivo: arquivo ? e.target.result : null,
            intervalo
        });

        atualizarListaFluxo();
        limparCamposFluxo();
    };

    if (arquivo) {
        leitor.readAsDataURL(arquivo);
    } else {
        leitor.onload();
    }
}

// 🔹 Função para atualizar a lista de fluxos no DOM
function atualizarListaFluxo() {
    listaFluxo.innerHTML = "";
    fluxoMensagens.forEach((msg, index) => {
        const item = document.createElement("li");
        item.innerHTML = `
            <span>${msg.tipo.toUpperCase()}: ${msg.conteudo || "Arquivo carregado"} - ${msg.intervalo}s</span>
            <button onclick="removerFluxo(${index})">Remover</button>
        `;
        listaFluxo.appendChild(item);
    });
}

// 🔹 Função para remover um item do fluxo
function removerFluxo(index) {
    fluxoMensagens.splice(index, 1);
    atualizarListaFluxo();
}

// 🔹 Função para limpar campos do fluxo
function limparCamposFluxo() {
    document.getElementById("conteudo").value = "";
    document.getElementById("intervalo").value = "";
    document.getElementById("arquivo-upload").value = "";
}

// 🔹 Função para salvar o fluxo
fluxoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const chave = document.getElementById("chave").value.trim();
    const tipoChave = document.getElementById("tipo-chave").value;

    if (!chave) {
        alert("Por favor, insira a palavra-chave.");
        return;
    }

    if (fluxoMensagens.length === 0) {
        alert("Por favor, adicione mensagens ao fluxo.");
        return;
    }

    try {
        const resposta = await fetch("/salvar_config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chave,
                tipo: tipoChave,
                fluxo: fluxoMensagens
            })
        });

        if (!resposta.ok) throw new Error("Erro ao salvar fluxo.");

        alert("Fluxo salvo com sucesso!");
        fluxoMensagens = [];
        atualizarListaFluxo();
        fluxoForm.reset();
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar o fluxo.");
    }
});

// 🔹 Função para adicionar uma mensagem de acompanhamento
function adicionarAcompanhamento() {
    const tempo = parseInt(document.getElementById("tempo-acompanhamento").value, 10);
    const conteudo = document.getElementById("conteudo-acompanhamento").value.trim();
    const arquivo = document.getElementById("arquivo-acompanhamento").files[0];

    if (!conteudo && !arquivo) {
        alert("Por favor, insira uma mensagem ou carregue um arquivo.");
        return;
    }

    if (isNaN(tempo) || tempo < 1) {
        alert("O tempo de acompanhamento deve ser de no mínimo 1 minuto.");
        return;
    }

    const leitor = new FileReader();
    leitor.onload = function (e) {
        acompanhamentoMensagens.push({
            conteudo: conteudo || null,
            tipo: arquivo ? arquivo.type.split("/")[0] : "texto",
            arquivo: arquivo ? e.target.result : null,
            tempo
        });

        atualizarListaAcompanhamento();
        limparCamposAcompanhamento();
    };

    if (arquivo) {
        leitor.readAsDataURL(arquivo);
    } else {
        leitor.onload();
    }
}

// 🔹 Função para atualizar a lista de acompanhamento no DOM
function atualizarListaAcompanhamento() {
    listaAcompanhamento.innerHTML = "";
    acompanhamentoMensagens.forEach((msg, index) => {
        const item = document.createElement("li");
        item.innerHTML = `
            <span>${msg.tipo.toUpperCase()}: ${msg.conteudo || "Arquivo carregado"} - ${msg.tempo} min</span>
            <button onclick="removerAcompanhamento(${index})">Remover</button>
        `;
        listaAcompanhamento.appendChild(item);
    });
}

// 🔹 Função para remover uma mensagem de acompanhamento
function removerAcompanhamento(index) {
    acompanhamentoMensagens.splice(index, 1);
    atualizarListaAcompanhamento();
}

// 🔹 Função para limpar campos de acompanhamento
function limparCamposAcompanhamento() {
    document.getElementById("conteudo-acompanhamento").value = "";
    document.getElementById("tempo-acompanhamento").value = "";
    document.getElementById("arquivo-acompanhamento").value = "";
}

// 🔹 Função para salvar mensagens de acompanhamento
acompanhamentoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (acompanhamentoMensagens.length === 0) {
        alert("Por favor, adicione mensagens de acompanhamento.");
        return;
    }

    try {
        const resposta = await fetch("/salvar_config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                acompanhamento: acompanhamentoMensagens
            })
        });

        if (!resposta.ok) throw new Error("Erro ao salvar acompanhamento.");

        alert("Acompanhamento salvo com sucesso!");
        acompanhamentoMensagens = [];
        atualizarListaAcompanhamento();
        acompanhamentoForm.reset();
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar o acompanhamento.");
    }
});

// 🔹 Função para salvar a saudação
saudacaoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const saudacao = document.getElementById("saudacao").value.trim();
    const regraSaudacao = document.getElementById("regra-saudacao").value;

    if (!saudacao) {
        alert("Por favor, insira uma saudação.");
        return;
    }

    try {
        const resposta = await fetch("/salvar_config", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                saudacao,
                regra_saudacao: regraSaudacao
            })
        });

        if (!resposta.ok) throw new Error("Erro ao salvar saudação.");

        alert("Saudação salva com sucesso!");
        saudacaoForm.reset();
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar a saudação.");
    }
});