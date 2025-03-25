from flask import Blueprint, request, jsonify, render_template, redirect, url_for, session
from models import db, Usuario, Saudacoes, MensagensSalvas, ConfigAutomacao
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

# Rotas principais
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

@routes.route('/whatsapp', methods=['GET'])
@login_required
def whatsapp():
    try:
        cliente_id = session.get('usuario')
        if not cliente_id:
            return jsonify({
                "error": "Usuário não autenticado"
            }), 401

        mensagens = MensagensSalvas.query.filter_by(cliente_id=cliente_id).all()
        lista_mensagens = [{
            "chave": msg.chave, "resposta": msg.resposta
        } for msg in mensagens]

        return render_template('whatsapp.html', mensagens=lista_mensagens, time=int(time.time()))
    except Exception as e:
        print(f"Erro ao carregar WhatsApp: {e}")
        return render_template('whatsapp.html', mensagens=[])

@routes.route('/gerar_qr', methods=['GET'])
@login_required
def gerar_qr():
    try:
        usuario = Usuario.query.filter_by(id=session.get('usuario')).first()
        if not usuario:
            return jsonify({
                "error": "Usuário não encontrado"
            }), 400

        resposta = requests.get(f"http://localhost:3000/generate-qr/{usuario.email}")
        dados = resposta.json()

        if resposta.status_code == 200:
            return jsonify({
                "qr_code": dados['qr_code']
            })
        return jsonify({
            "error": dados.get("error", "Erro desconhecido")
        }), resposta.status_code
    except Exception as e:
        return jsonify({
            "error": f"Erro ao obter QR Code: {str(e)}"
        }), 500

@routes.route('/buscar_id/<int:id_usuario>', methods=['GET'])
@login_required
def buscar_id(id_usuario):
    usuario = Usuario.query.filter_by(id=id_usuario).first()
    if usuario:
        return jsonify({
            "message": "Usuário encontrado",
            "id": usuario.id,
            "email": usuario.email
        })
    return jsonify({
        "error": "Usuário não encontrado"
    }), 404

@routes.route('/buscar_id_por_email/<string:email>', methods=['GET'])
def buscar_id_por_email(email):
    usuario = Usuario.query.filter_by(email=email).first()
    if usuario:
        return jsonify({"id": usuario.id})
    return jsonify({"error": "Usuário não encontrado"}), 404

@routes.route('/salvar_config', methods=['POST'])
@login_required
def salvar_config():
    try:
        cliente_id = session.get('usuario')
        print("Cliente ID da sessão:", cliente_id)

        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        data = request.get_json()
        print("Dados recebidos:", data)

        config = ConfigAutomacao.query.filter_by(cliente_id=cliente_id).first()
        print("Configuração existente:", config)

        if config:
            print("Atualizando configuração existente...")
            config.saudacoes = json.dumps([data.get('saudacao')])
            config.regra_saudacao = data.get('regra_saudacao', '*')
            config.palavras_exatas = json.dumps(data.get('palavras_exatas', {}))
            config.palavras_contem = json.dumps(data.get('palavras_contem', {}))

            # Corrigido: Atribuições de `tempo_resposta` e `mensagem_acompanhamento`
            config.tempo_resposta = data.get('acompanhamento', {}).get('tempo', 3)
            config.mensagem_acompanhamento = json.dumps(data.get('acompanhamento', {}).get('mensagem', []))
            
            # Marca os campos como modificados
            flag_modified(config, "saudacoes")
            flag_modified(config, "palavras_exatas")
            flag_modified(config, "palavras_contem")
            flag_modified(config, "mensagem_acompanhamento")
        else:
            print("Criando nova configuração...")
            nova_config = ConfigAutomacao(
                cliente_id=cliente_id,
                saudacoes=json.dumps([data.get('saudacao')]),
                regra_saudacao=data.get('regra_saudacao', '*'),
                palavras_exatas=json.dumps(data.get('palavras_exatas', {})),
                palavras_contem=json.dumps(data.get('palavras_contem', {})),
                tempo_resposta=data.get('acompanhamento', {}).get('tempo', 3),
                mensagem_acompanhamento=json.dumps(data.get('acompanhamento', {}).get('mensagem', []))
            )
            db.session.add(nova_config)

        db.session.commit()
        return jsonify({"message": "Configurações salvas com sucesso!"})
    except Exception as e:
        db.session.rollback()
        print("Erro ao salvar configurações:", str(e))
        return jsonify({"error": f"Erro ao salvar configurações: {str(e)}"}), 500

@routes.route('/buscar_configuracoes/<int:cliente_id>', methods=['GET'])
@login_required
def buscar_configuracoes(cliente_id):
    try:
        config = ConfigAutomacao.query.filter_by(cliente_id=cliente_id).first()

        if not config:
            return jsonify({
                "saudacoes": [],
                "regra_saudacao": "",
                "palavras_exatas": {},
                "palavras_contem": {},
                "tempo_acompanhamento": 3,
                "mensagem_acompanhamento": []
            }), 200

        tempo_resposta = config.tempo_resposta or 3
        mensagens_acompanhamento = json.loads(config.mensagem_acompanhamento) if config.mensagem_acompanhamento else []
        saudacoes = json.loads(config.saudacoes) if config.saudacoes else []
        
        print("Mensagens de acompanhamento salvas no banco:", config.mensagem_acompanhamento)

        print("Saudacoes decodificadas do banco de dados:", saudacoes)
        
        return jsonify({
            "saudacoes": saudacoes,
            "regra_saudacao": config.regra_saudacao or "*",
            "palavras_exatas": json.loads(config.palavras_exatas) if config.palavras_exatas else {},
            "palavras_contem": json.loads(config.palavras_contem) if config.palavras_contem else {},
            "tempo_acompanhamento": tempo_resposta,
            "mensagem_acompanhamento": mensagens_acompanhamento
        })
    except Exception as e:
        print("Erro ao buscar configurações:", str(e))
        return jsonify({"error": f"Erro ao buscar configurações: {str(e)}"}), 500

@routes.route('/remover_regra/<tipo>/<chave>', methods=['DELETE'])
@login_required
def remover_regra(tipo, chave):
    try:
        if not chave or chave.lower() == "undefined":
            return jsonify({"error": "Chave inválida"}), 400

        cliente_id = session.get("usuario")
        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        config = ConfigAutomacao.query.filter_by(cliente_id=cliente_id).first()
        if not config:
            return jsonify({"error": "Configuração não encontrada"}), 404

        if tipo == "palavras-exatas":
            palavras = json.loads(config.palavras_exatas or "{}")
        elif tipo == "palavras-contem":
            palavras = json.loads(config.palavras_contem or "{}")
        else:
            return jsonify({"error": "Tipo de regra inválido"}), 400

        if chave in palavras:
            del palavras[chave]
            if tipo == "palavras-exatas":
                config.palavras_exatas = json.dumps(palavras)
            else:
                config.palavras_contem = json.dumps(palavras)

            db.session.commit()
            return jsonify({"message": "Regra removida com sucesso!"}), 200

        return jsonify({"error": "Palavra não encontrada"}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Erro ao remover regra: {str(e)}"}), 500

@routes.route('/listar_mensagens', methods=['GET'])
@login_required
def listar_mensagens():
    try:
        cliente_id = session.get('usuario')
        if not cliente_id:
            return jsonify({"error": "Usuário não autenticado"}), 401

        mensagens = MensagensSalvas.query.filter_by(cliente_id=cliente_id).all()
        lista_mensagens = [{"chave": msg.chave, "resposta": msg.resposta} for msg in mensagens]

        return jsonify({"mensagens": lista_mensagens})
    except Exception as e:
        return jsonify({"error": f"Erro ao listar mensagens: {str(e)}"}), 500

@routes.route('/buscar_email_usuario', methods=['GET'])
@login_required
def buscar_email_usuario():
    try:
        usuario = Usuario.query.filter_by(id=session.get('usuario')).first()
        if usuario:
            return jsonify({"email": usuario.email})
        return jsonify({"error": "Usuário não encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar email: {str(e)}"}), 500