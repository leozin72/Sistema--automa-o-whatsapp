const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const {
    buscarIdUsuario,
    buscarConfiguracoes,
    validarFluxo,
    executarFluxo,
    regrasDeSaudacao,
    mensagensAcompanhamento
} = require('./funcaobot');

const app = express();
const sessions = {};

// Configuração de CORS
app.use(cors({
    origin: 'https://sistema-whatsapp-elite.onrender.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Gerar QR Code fixo para o bot
let qrCodeGlobal = null; // QR Code único do sistema
async function gerarQRCodeGlobal() {
    const client = new Client();

    client.on('qr', async (qr) => {
        if (!qrCodeGlobal) {
            qrCodeGlobal = await qrcode.toDataURL(qr); // Armazena QR Code global
            console.log("QR Code global gerado com sucesso!");
        }
    });

    client.on('ready', () => {
        console.log("✅ Bot central conectado com sucesso!");
    });

    client.initialize();
}
gerarQRCodeGlobal();

// Função para iniciar conexão de um cliente
async function iniciarConexaoCliente(clienteId) {
    const sessionFile = `./sessions/${clienteId}.json`;
    let sessionData;

    if (fs.existsSync(sessionFile)) {
        sessionData = require(sessionFile);
    }

    const client = new Client({ session: sessionData });
    sessions[clienteId] = client;

    client.on('ready', () => {
        console.log(`✅ Cliente ${clienteId} conectado com sucesso!`);
        sessions[clienteId].status = "connected";
    });

    client.on('authenticated', (session) => {
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log(`🔐 Sessão salva para cliente ${clienteId}`);
        sessions[clienteId].status = "authenticated";
    });

    client.on('auth_failure', () => {
        console.error(`🚫 Falha na autenticação para cliente ${clienteId}`);
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
        }
        delete sessions[clienteId];
    });

    client.initialize();
}

// Endpoint para retornar QR Code fixo
app.get('/generate-qr', async (req, res) => {
    try {
        if (qrCodeGlobal) {
            return res.status(200).send({
                message: "QR Code fixo do sistema.",
                qr_code: qrCodeGlobal
            });
        } else {
            return res.status(500).send({ error: "QR Code ainda não gerado. Por favor, tente novamente." });
        }
    } catch (error) {
        console.error("Erro ao retornar QR Code fixo:", error.message);
        res.status(500).send({ error: "Erro interno do servidor." });
    }
});

// Endpoint para conectar cliente via QR Code fixo
app.post('/connect-client/:email', async (req, res) => {
    const email = req.params.email;

    try {
        const userId = await buscarIdUsuario(email);
        if (!userId) {
            return res.status(404).send({ error: "Usuário não encontrado." });
        }

        if (!sessions[userId]) {
            console.log(`Conectando cliente ${email}`);
            await iniciarConexaoCliente(userId);
        }

        res.status(200).send({ message: "Cliente conectado com sucesso!" });
    } catch (error) {
        console.error("Erro ao conectar cliente:", error.message);
        res.status(500).send({ error: "Erro ao conectar cliente." });
    }
});

// Endpoint para desativar conexão de um cliente
app.post('/disconnect-client/:email', async (req, res) => {
    const email = req.params.email;

    try {
        const userId = Object.keys(sessions).find(id => sessions[id]?.email === email);
        if (!userId || !sessions[userId]) {
            return res.status(404).send({ error: "Cliente não está conectado." });
        }

        console.log(`Desconectando cliente ${email}`);
        delete sessions[userId];
        res.status(200).send({ message: "Cliente desconectado com sucesso!" });
    } catch (error) {
        console.error("Erro ao desconectar cliente:", error.message);
        res.status(500).send({ error: "Erro ao desconectar cliente." });
    }
});

// Configuração para o Render: Porta dinâmica
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}...`);
});
