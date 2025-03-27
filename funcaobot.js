const axios = require('axios');

// 🔹 Função para buscar o ID do usuário pelo email
async function buscarIdUsuario(email) {
    try {
        const resposta = await axios.get(`http://127.0.0.1:5000/buscar_id_por_email/${email}`);
        if (resposta.status === 200 && resposta.data.id) {
            return resposta.data.id;
        } else {
            console.error("Usuário não encontrado:", resposta.data);
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar ID do usuário:", error.response?.data || error.message);
        return null;
    }
}

// 🔹 Função para buscar configurações do cliente
async function buscarConfiguracoes(clienteId) {
    try {
        const resposta = await axios.get(`http://127.0.0.1:5000/buscar_configuracoes/${clienteId}`);
        return resposta.data;
    } catch (error) {
        console.error(`Erro ao buscar configurações do cliente ${clienteId}:`, error.response?.data || error.message);
        return null;
    }
}

// 🔹 Função para validar fluxos de mensagens
function validarFluxo(fluxo) {
    return fluxo.every(item => {
        return (
            item.tempo >= 1 && item.tempo <= 60 && // Tempo entre 1 e 60 segundos
            ["texto", "imagem", "audio", "video"].includes(item.tipo) && // Tipo válido
            item.conteudo // Conteúdo não vazio
        );
    });
}

// 🔹 Função para executar um fluxo de mensagens (texto, imagem, áudio, vídeo)
async function executarFluxo(client, fluxo, remetente) {
    for (const mensagem of fluxo) {
        setTimeout(async () => {
            try {
                if (mensagem.tipo === "texto") {
                    await client.sendMessage(remetente, mensagem.conteudo);
                } else if (mensagem.tipo === "imagem") {
                    await client.sendMessage(remetente, { media: mensagem.conteudo, caption: mensagem.legenda || "" });
                } else if (mensagem.tipo === "audio") {
                    await client.sendMessage(remetente, { media: mensagem.conteudo, mimetype: 'audio/mp3' });
                } else if (mensagem.tipo === "video") {
                    await client.sendMessage(remetente, { media: mensagem.conteudo, caption: mensagem.legenda || "" });
                }
            } catch (error) {
                console.error(`Erro ao enviar mensagem do fluxo:`, error.message);
            }
        }, mensagem.tempo * 1000); // Tempo em milissegundos
    }
}

// 🔹 Regras de Saudação (integradas com fluxos e acompanhamento)
async function regrasDeSaudacao(config, remetente, client) {
    if (config.regra_saudacao && config.fluxo_saudacao) {
        const regra = config.regra_saudacao;

        if (regra === "*") {
            await executarFluxo(client, config.fluxo_saudacao, remetente);
        }
    }
}

// 🔹 Função para gerenciar mensagens de acompanhamento
async function mensagensAcompanhamento(client, config, remetente, ultimaInteracao) {
    const agora = new Date();
    const diferencaMinutos = (agora - ultimaInteracao) / (1000 * 60); // Converte para minutos

    if (diferencaMinutos >= config.acompanhamento_tempo) {
        console.log(`⏳ Enviando mensagem de acompanhamento para ${remetente}`);
        await executarFluxo(client, config.fluxo_acompanhamento, remetente);
    }
}

module.exports = {
    buscarIdUsuario,
    buscarConfiguracoes,
    validarFluxo,
    executarFluxo,
    regrasDeSaudacao,
    mensagensAcompanhamento
};