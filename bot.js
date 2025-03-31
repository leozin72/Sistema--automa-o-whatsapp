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
} = require('./funcaobot');

const app = express();
let clients = {}; // Armazena clientes por usuário
let qrCodes = {}; // Armazena QR Codes por usuário

// Configuração de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Middleware para JSON
app.use(express.json());

// Inicializar um cliente do WhatsApp por usuário
function criarCliente(email) {
    if (!clients[email]) {
        const client = new Client();
        clients[email] = client;

        client.on('qr', async (qr) => {
            qrCodes[email] = await qrcode.toDataURL(qr);
            console.log(`📸 QR Code gerado para o usuário: ${email}`);
        });

        client.on('authenticated', (session) => {
            console.log(`🔐 Sessão autenticada para o usuário: ${email}`);
            fs.writeFileSync(`./sessions/${email}.json`, JSON.stringify(session));
        });

        client.on('ready', async () => {
            console.log(`✅ Bot conectado para o usuário: ${email}`);

            try {
                const numeroWhatsApp = client.info.wid.user;
                console.log(`Número do WhatsApp conectado: ${numeroWhatsApp}`);

                // Buscar configurações do cliente
                const clienteId = await buscarIdUsuario(email);
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

        client.on('auth_failure', (message) => {
            console.error(`🚨 Falha na autenticação para o usuário ${email}: ${message}`);
        });

        client.on('disconnected', (reason) => {
            console.error(`⚠️ Bot desconectado para o usuário ${email}. Motivo: ${reason}`);
            delete clients[email];
            delete qrCodes[email];
        });

        client.initialize();
    }
}

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

// Endpoint: Gerar QR Code para cada usuário
app.get('/generate-qr/:email', (req, res) => {
    const email = req.params.email;

    // Criar cliente se não existir
    criarCliente(email);

    if (qrCodes[email]) {
        return res.status(200).send({
            message: `QR Code gerado para o usuário ${email}`,
            qr_code: qrCodes[email]
        });
    } else {
        return res.status(202).send({ message: "QR Code ainda não gerado. Por favor, aguarde." });
    }
});

// Configuração do servidor
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}...`);
});
