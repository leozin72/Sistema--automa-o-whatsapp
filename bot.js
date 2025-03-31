const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Importando funções do funcaobot.js
const {
    buscarIdUsuario,
    buscarConfiguracoes,
    validarFluxo,
    executarFluxo,
    regrasDeSaudacao,
    mensagensAcompanhamento
} = require('./funcaobot'); // Certifique-se de que o arquivo está na mesma pasta

const app = express();
let qrCodeGlobal = null; // QR Code global
let botStatus = "disconnected"; // Status do bot

// Configuração de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Middleware para JSON
app.use(express.json());

// Inicializar o cliente do WhatsApp
const client = new Client();

// Evento: QR Code gerado
client.on('qr', async (qr) => {
    qrCodeGlobal = await qrcode.toDataURL(qr);
    console.log("📸 QR Code global gerado com sucesso!");
    botStatus = "waiting_for_scan"; // Atualiza o status
});

// Evento: Sessão autenticada
client.on('authenticated', (session) => {
    console.log("🔐 Sessão autenticada com sucesso!");
    fs.writeFileSync('./session.json', JSON.stringify(session));
});

// Evento: Bot conectado
client.on('ready', async () => {
    console.log("✅ Bot conectado ao WhatsApp e pronto para uso!");
    botStatus = "connected"; // Atualiza o status

    try {
        const numeroWhatsApp = client.info.wid.user;
        console.log("Número do WhatsApp conectado:", numeroWhatsApp);

        // Buscar configurações do cliente usando as funções do bot
        const clienteId = 'global'; // Atualize isso se for por usuário
        const config = await buscarConfiguracoes(clienteId);

        if (config) {
            console.log("Configurações do cliente carregadas:", config);

            // Regras de saudação
            await regrasDeSaudacao(config, numeroWhatsApp, client);
        } else {
            console.error("⚠️ Configurações do cliente não encontradas.");
        }

        // Enviar dados ao Flask
        await enviarDadosParaFlask(clienteId, numeroWhatsApp);
        console.log("✅ Dados enviados ao Flask com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao capturar número ou enviar dados:", error.message);
    }
});

// Evento: Falha na autenticação
client.on('auth_failure', (message) => {
    console.error(`🚨 Falha na autenticação: ${message}`);
    botStatus = "auth_failure"; // Atualiza o status
});

// Evento: Bot desconectado
client.on('disconnected', (reason) => {
    console.error(`⚠️ Bot desconectado. Motivo: ${reason}`);
    botStatus = "disconnected"; // Atualiza o status
});

// Inicializar o bot
client.initialize();

// Função para enviar dados ao Flask
async function enviarDadosParaFlask(clienteId, numeroWhatsApp) {
    try {
        const response = await axios.post('https://sistema-whatsapp-elite.onrender.com/salvar-numero', {
            cliente_id: clienteId,
            numero_whatsapp: numeroWhatsApp
        });
        console.log("✅ Dados enviados ao Flask:", response.data);
    } catch (error) {
        console.error("❌ Erro ao enviar dados ao Flask:", error.message);
    }
}

// Endpoint: Retornar QR Code global
app.get('/generate-qr', (req, res) => {
    if (qrCodeGlobal) {
        return res.status(200).send({
            message: "QR Code fixo do sistema.",
            qr_code: qrCodeGlobal
        });
    } else {
        return res.status(202).send({ message: "QR Code ainda não gerado. Por favor, aguarde." });
    }
});

// Endpoint: Verificar status do bot
app.get('/bot-status', (req, res) => {
    return res.status(200).send({ status: botStatus });
});

// Configuração do servidor
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}...`);
});
