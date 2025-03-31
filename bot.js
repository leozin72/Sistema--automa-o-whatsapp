const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const sessions = {};

// Configuração de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Middleware para JSON
app.use(express.json());

// Gerar QR Code global
let qrCodeGlobal = null;
async function gerarQRCodeGlobal() {
    const client = new Client();

    client.on('qr', async (qr) => {
        qrCodeGlobal = await qrcode.toDataURL(qr);
        console.log("QR Code global gerado com sucesso!");
    });

    client.on('ready', async () => {
        console.log("✅ Bot conectado e pronto para uso!");

        const info = client.info;
        const numeroWhatsApp = info.wid.user;
        console.log("Número do WhatsApp conectado:", numeroWhatsApp);

        // Enviar dados ao Flask
        const clienteId = 'global';
        await enviarDadosParaFlask(clienteId, numeroWhatsApp);
    });

    client.on('authenticated', (session) => {
        console.log("🔐 Sessão autenticada com sucesso!");
        fs.writeFileSync('./session.json', JSON.stringify(session));
    });

    client.on('auth_failure', (message) => {
        console.error(`🚫 Falha na autenticação: ${message}`);
    });

    client.initialize();
}
gerarQRCodeGlobal();

// Função para enviar dados ao Flask
async function enviarDadosParaFlask(clienteId, numeroWhatsApp) {
    try {
        const response = await axios.post('http://127.0.0.1:5000/salvar-numero', {
            cliente_id: clienteId,
            numero_whatsapp: numeroWhatsApp
        });
        console.log("Dados enviados ao Flask com sucesso:", response.data);
    } catch (error) {
        console.error("Erro ao enviar dados para o Flask:", error.message);
    }
}

// Endpoint para retornar QR Code global
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

// Configuração para o Render: Porta dinâmica
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${port}...`);
});
