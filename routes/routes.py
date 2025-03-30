from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from models import db, Usuario, Saudacoes, FluxoMensagens, MensagensAcompanhamento
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from sqlalchemy.orm.attributes import flag_modified
import json
import requests
import time

# Criando um Blueprint para as rotas
routes = Blueprint('routes', __name__)

# Função decoradora para rotas protegidas
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            return redirect(url_for('routes.index'))
        return f(*args, **kwargs)
    return decorated_function

# 🔹 Rotas principais
@routes.route('/')
def index():
    return render_template('login.html')

@routes.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('password')

        if not email or not senha:
            return "E-mail e senha são obrigatórios."

        usuario = Usuario.query.filter_by(email=email).first()
        if usuario:
            return "Usuário já cadastrado."

        senha_hash = generate_password_hash(senha)
        novo_usuario = Usuario(email=email, senha=senha_hash)
        db.session.add(novo_usuario)
        db.session.commit()
        return "Usuário cadastrado com sucesso!"
    return render_template('cadastro.html')

@routes.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        senha = request.form.get('password')

        usuario = Usuario.query.filter_by(email=email).first()
        if usuario and check_password_hash(usuario.senha, senha):
            session['usuario'] = usuario.id
            return redirect(url_for('routes.dashboard'))
        return "Credenciais incorretas."
    return render_template('login.html')

@routes.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('routes.index'))

@routes.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@routes.route('/pedidos')
@login_required
def pedidos():
    return render_template('pedidos.html')

@routes.route('/configuracoes')
@login_required
def configuracoes():
    return render_template('configuracoes.html')

@routes.route('/afiliados')
@login_required
def afiliados():
    return render_template('afiliados.html')

@routes.route('/relatorios')
@login_required
def relatorios():
    return render_template('relatorios.html')

@routes.route('/base')
@login_required
def base():
    return render_template('base.html')
    
@routes.route('/qrcode')
@login_required
def qrcode():
    return render_template('qrcode.html')

@routes.route('/whatsapp', methods=['GET'])
@login_required
def whatsapp():
    try:
        cliente_id = session.get('usuario')
        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        # Buscar fluxos de mensagens do cliente
        mensagens = FluxoMensagens.query.filter_by(cliente_id=cliente_id).all()
        lista_mensagens = []

        for fluxo in mensagens:
            # Verificar o tipo do campo 'mensagens'
            if isinstance(fluxo.mensagens, str):
                mensagens_decodificadas = json.loads(fluxo.mensagens)  # Processa como string JSON
            elif isinstance(fluxo.mensagens, list):
                mensagens_decodificadas = fluxo.mensagens  # Já é uma lista Python
            else:
                mensagens_decodificadas = []  # Valor inesperado

            lista_mensagens.append({
                "chave": fluxo.chave,
                "tipo": fluxo.tipo,
                "mensagens": mensagens_decodificadas
            })

        return render_template('whatsapp.html', mensagens=lista_mensagens, time=int(time.time()))
    except Exception as e:
        print(f"Erro ao carregar WhatsApp: {e}")
        return render_template('whatsapp.html', mensagens=[], time=int(time.time()))

@routes.route('/gerar_qr', methods=['GET'])
@login_required
def gerar_qr():
    try:
        # Obtenha o usuário da sessão
        user_id = session.get('usuario')
        if not user_id:
            print("Erro: Nenhum ID de usuário encontrado na sessão.")
            return render_template('qrcode.html', qr_code=None, error_message="Usuário não autenticado.")

        print("ID do usuário na sessão:", user_id)

        # Busca o usuário no banco de dados
        usuario = Usuario.query.filter_by(id=user_id).first()
        if not usuario:
            print("Erro: Usuário não encontrado no banco de dados.")
            return render_template('qrcode.html', qr_code=None, error_message="Usuário não encontrado.")

        print(f"Usuário encontrado: {usuario.email}")

        # Faz a requisição ao serviço de geração de QR Code
        print(f"Fazendo requisição para o serviço de QR Code com email: {usuario.email}")
        resposta = requests.get(
            f"https://sistema-automa-o-whatsapp.onrender.com/generate-qr/{usuario.email}",
            timeout=10
        )

        # Valida a resposta da API de geração de QR Code
        print(f"Resposta do serviço de QR Code: {resposta.status_code}")
        if resposta.status_code == 200:
            dados = resposta.json()
            qr_code = dados.get('qr_code')
            if qr_code:
                print("QR Code retornado com sucesso!")
                return render_template('qrcode.html', qr_code=qr_code)
            else:
                print("Erro: QR Code não encontrado na resposta da API.")
                return render_template(
                    'qrcode.html', 
                    qr_code=None, 
                    error_message="QR Code não retornado pelo servidor."

@routes.route('/buscar_id/<int:id_usuario>', methods=['GET'])
@login_required
def buscar_id(id_usuario):
    print("Buscando usuário com ID:", id_usuario)

    usuario = Usuario.query.filter_by(id=id_usuario).first()
    if usuario:
        print("Usuário encontrado:", usuario.email)
        return jsonify({
            "message": "Usuário encontrado",
            "id": usuario.id,
            "email": usuario.email
        })

    print("Erro: Usuário não encontrado.")
    return jsonify({"error": "Usuário não encontrado"}), 404

@routes.route('/buscar_id_por_email/<string:email>', methods=['GET'])
def buscar_id_por_email(email):
    print("Buscando ID para o email:", email)

    usuario = Usuario.query.filter_by(email=email).first()
    if usuario:
        print("Usuário encontrado:", usuario.id)
        return jsonify({"id": usuario.id})

    print("Erro: Usuário não encontrado para o email:", email)
    return jsonify({"error": "Usuário não encontrado"}), 404

@routes.route('/salvar_config', methods=['POST'])
@login_required
def salvar_config():
    try:
        cliente_id = session.get('usuario')
        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        data = request.get_json()

        # Salvar saudação
        if 'saudacao' in data and 'regra_saudacao' in data:
            saudacao = Saudacoes.query.filter_by(cliente_id=cliente_id).first()
            if saudacao:
                saudacao.saudacao = data['saudacao']
                saudacao.regra = data['regra_saudacao']
            else:
                nova_saudacao = Saudacoes(
                    cliente_id=cliente_id,
                    saudacao=data['saudacao'],
                    regra=data['regra_saudacao']
                )
                db.session.add(nova_saudacao)

        # Salvar fluxo de mensagens
        if 'chave' in data and 'fluxo' in data and 'tipo' in data:
            novo_fluxo = FluxoMensagens(
                cliente_id=cliente_id,
                chave=data['chave'],
                tipo=data['tipo'],
                mensagens=json.dumps(data['fluxo'])  # Armazenar como string JSON
            )
            db.session.add(novo_fluxo)

        # Salvar mensagens de acompanhamento
        if 'acompanhamento' in data:
            novo_acompanhamento = MensagensAcompanhamento(
                cliente_id=cliente_id,
                mensagens=json.dumps(data['acompanhamento'])  # Armazenar como string JSON
            )
            db.session.add(novo_acompanhamento)

        db.session.commit()
        return jsonify({"message": "Configurações salvas com sucesso!"})
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao salvar configurações: {e}")  # Log para debug
        return jsonify({"error": f"Erro ao salvar configurações: {str(e)}"}), 500

@routes.route('/buscar_configuracoes/<int:cliente_id>', methods=['GET'])
@login_required
def buscar_configuracoes(cliente_id):
    try:
        # Obter saudações personalizadas do cliente
        saudacoes = Saudacoes.query.filter_by(cliente_id=cliente_id).all()
        saudacoes_lista = [{"saudacao": saudacao.saudacao, "regra": saudacao.regra} for saudacao in saudacoes]

        # Obter fluxos de mensagens configurados
        fluxos = FluxoMensagens.query.filter_by(cliente_id=cliente_id).all()
        fluxos_lista = [{
            "chave": fluxo.chave,
            "tipo": fluxo.tipo,
            "mensagens": fluxo.mensagens
        } for fluxo in fluxos]

        # Obter mensagens de acompanhamento
        acompanhamentos = MensagensAcompanhamento.query.filter_by(cliente_id=cliente_id).all()
        acompanhamentos_lista = [{
            "tempo": acompanhamento.tempo,
            "mensagens": acompanhamento.mensagens
        } for acompanhamento in acompanhamentos]

        # Retornar os dados para o frontend
        return jsonify({
            "saudacoes": saudacoes_lista,
            "fluxos": fluxos_lista,
            "acompanhamentos": acompanhamentos_lista
        }), 200
    except Exception as e:
        # Captura e retorna o erro caso algo dê errado
        return jsonify({"error": f"Erro ao buscar configurações: {str(e)}"}), 500

@routes.route('/remover_regra/<tipo>/<chave>', methods=['DELETE'])
@login_required
def remover_regra(tipo, chave):
    try:
        # Verificar se a chave é válida
        if not chave or chave.lower() == "undefined":
            return jsonify({"error": "Chave inválida"}), 400

        # Obter cliente autenticado
        cliente_id = session.get("usuario")
        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        # Buscar configuração do cliente no banco de dados
        config = ConfigAutomacao.query.filter_by(cliente_id=cliente_id).first()
        if not config:
            return jsonify({"error": "Configuração não encontrada"}), 404

        # Identificar o tipo de regra e remover a chave correspondente
        if tipo == "palavras-exatas":
            palavras = json.loads(config.palavras_exatas or "{}")
            if chave in palavras:
                del palavras[chave]
                config.palavras_exatas = json.dumps(palavras)
            else:
                return jsonify({"error": "Chave não encontrada nas palavras exatas."}), 404
        elif tipo == "palavras-contem":
            palavras = json.loads(config.palavras_contem or "{}")
            if chave in palavras:
                del palavras[chave]
                config.palavras_contem = json.dumps(palavras)
            else:
                return jsonify({"error": "Chave não encontrada nas palavras contém."}), 404
        else:
            return jsonify({"error": "Tipo de regra inválido. Use 'palavras-exatas' ou 'palavras-contem'."}), 400

        # Salvar alterações no banco de dados
        db.session.commit()
        return jsonify({"message": "Regra removida com sucesso!"}), 200

    except Exception as e:
        # Reverter alterações em caso de erro
        db.session.rollback()
        return jsonify({"error": f"Erro ao remover regra: {str(e)}"}), 500
