const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { buscarIdUsuario, buscarConfiguracoes, regrasDeSaudacao } = require('./funcaobot');

const app = express();
const sessions = {};
const activeQrCodes = {};

app.use(cors({
    origin: 'http://127.0.0.1:5000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

async function iniciarBot(clientId) {
    const authPath = `./sessions/${clientId}`;

    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
    }

    if (sessions[clientId]) {
        console.log(`⚠️ O bot para ${clientId} já está em execução.`);
        return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
        auth: state,
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
        printQRInTerminal: false
    });

    sessions[clientId] = { sock, saveCreds };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', update => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`📌 QR Code gerado para ${clientId}:`);
            if (activeQrCodes[clientId]) {
                delete activeQrCodes[clientId];
            }
            qrcode.toString(qr, { type: 'terminal' }, (err, qrCodeTerminal) => {
                if (!err) console.log(qrCodeTerminal);
            });

            activeQrCodes[clientId] = qr;
        }

        if (connection === 'open') {
            console.clear();
            console.log(`✅ Cliente ${clientId} conectado com sucesso!`);
            if (activeQrCodes[clientId]) {
                delete activeQrCodes[clientId];
            }
        }

        if (connection === 'close') {
            const motivo = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Conexão fechada para ${clientId}. Motivo: ${motivo || 'desconhecido'}`);
            delete sessions[clientId];
            if (motivo !== 401) {
                console.log(`🔄 Tentando reconectar ${clientId}...`);
                setTimeout(() => iniciarBot(clientId), 5000);
            } else {
                console.log(`🚫 Autenticação inválida para ${clientId}. QR Code necessário.`);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg || !msg.message || !msg.key.remoteJid) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const remetente = msg.key.remoteJid;

        console.log(`📩 Mensagem recebida de ${remetente}: ${texto}`);

        const config = await buscarConfiguracoes(clientId);
        if (!config) return;

        await regrasDeSaudacao(config, texto, remetente, sock, msg);
    });
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

        if (activeQrCodes[userId]) {
            const qrCodeBase64 = await qrcode.toDataURL(activeQrCodes[userId]);
            res.send({ qr_code: qrCodeBase64 });
        } else {
            res.status(404).send({ error: "QR Code não disponível. Tente novamente em instantes." });
        }
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        res.status(500).send({ error: "Erro interno do servidor." });
    }
});

app.listen(3000, () => {
    console.log('🚀 Servidor rodando na porta 3000...');
});