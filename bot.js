const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { buscarIdUsuario, buscarConfiguracoes, regrasDeSaudacao } = require('./funcaobot');

const app = express();
const sessions = {};

app.use(cors({
    origin: 'https://sistema-whatsapp-elite.onrender.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

async function iniciarBot(clientId) {
    const sessionFile = `./sessions/${clientId}.json`;
    let sessionData;

    if (fs.existsSync(sessionFile)) {
        sessionData = require(sessionFile);
    }

    const client = new Client({
        session: sessionData
    });

    sessions[clientId] = client;

    client.on('qr', (qr) => {
        console.log(`📌 QR Code gerado para ${clientId}:`);
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log(`✅ Cliente ${clientId} conectado com sucesso!`);
    });

    client.on('authenticated', (session) => {
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log(`🔐 Sessão salva para ${clientId}`);
    });

    client.on('auth_failure', () => {
        console.error(`🚫 Falha na autenticação para ${clientId}. Excluindo sessão...`);
        fs.unlinkSync(sessionFile);
    });

    client.on('message', async (message) => {
        const texto = message.body;
        const remetente = message.from;

        console.log(`📩 Mensagem recebida de ${remetente}: ${texto}`);

        const config = await buscarConfiguracoes(clientId);
        if (!config) return;

        await regrasDeSaudacao(config, remetente, client);
    });

    client.initialize();
}

app.get('/generate-qr/:email', async (req, res) => {
    const email = req.params.email;

    try {
        const userId = await buscarIdUsuario(email);

        if (!userId) {
            return res.status(404).send({ error: "Usuário não encontrado no banco de dados." });
        }

        if (!sessions[userId]) {
            console.log(`Iniciando bot para o usuário ${email} (ID: ${userId})`);
            await iniciarBot(userId);
        }

        res.send({ message: "QR Code gerado e cliente iniciado!" });
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        res.status(500).send({ error: "Erro interno do servidor." });
    }
});

app.listen(3000, () => {
    console.log('🚀 Servidor rodando na porta 3000...');
});
