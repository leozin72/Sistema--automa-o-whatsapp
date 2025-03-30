const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode'); // Biblioteca para converter QR Code em base64
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const sessions = {};

// Configuração de CORS
app.use(cors({
    origin: 'https://sistema-whatsapp-elite.onrender.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Função para iniciar o bot do cliente
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

    client.on('qr', async (qr) => {
        console.log(`📌 QR Code gerado para ${clientId}: ${qr}`);
        const qrCodeImage = await qrcode.toDataURL(qr); // Gera QR Code como imagem base64
        sessions[clientId].qrCodeImage = qrCodeImage; // Atualiza a sessão com o QR Code base64
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
        delete sessions[clientId];
    });

    client.on('message', async (message) => {
        const texto = message.body;
        const remetente = message.from;

        console.log(`📩 Mensagem recebida de ${remetente}: ${texto}`);
        // Adicione aqui qualquer lógica específica para mensagens
    });

    client.initialize();
}

// Endpoint para gerar QR Code
app.get('/generate-qr/:email', async (req, res) => {
    const email = req.params.email;

    try {
        console.log(`Recebido pedido de QR Code para o email: ${email}`);

        // Faz uma requisição à rota do Flask para buscar o ID do usuário pelo e-mail
        const response = await axios.get(`https://sistema-whatsapp-elite.onrender.com/buscar_id_por_email/${email}`);
        const userId = response.data.id;

        console.log(`ID retornado pelo Flask para o email ${email}: ${userId}`);

        if (!userId) {
            console.error("Usuário não encontrado pelo Flask.");
            return res.status(404).send({ error: "Usuário não encontrado no banco de dados." });
        }

        // Inicia o bot se não estiver na sessão
        if (!sessions[userId]) {
            console.log(`Iniciando bot para o usuário ${email} (ID: ${userId})`);
            await iniciarBot(userId);
        }

        // Recupera o QR Code gerado na sessão
        const qrCodeImage = sessions[userId]?.qrCodeImage;
        if (qrCodeImage) {
            console.log("QR Code gerado e retornado com sucesso!");
            res.status(200).send({
                message: "QR Code gerado e cliente iniciado!",
                qr_code: qrCodeImage
            });
        } else {
            console.error("QR Code ainda não gerado.");
            res.status(500).send({ error: "QR Code ainda não gerado. Tente novamente." });
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error("Usuário não encontrado na API Flask.");
            return res.status(404).send({ error: "Usuário não encontrado no banco de dados." });
        }

        console.error("Erro ao buscar ID do usuário ou iniciar o bot:", error.message || error);
        res.status(500).send({ error: "Erro interno do servidor." });
    }
});

// Configuração para o Render: Porta dinâmica
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}...`);
});
