from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 🔹 Modelo de Usuários
class Usuario(db.Model):
    __tablename__ = 'usuario'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(100), nullable=False)

# 🔹 Modelo para Saudações Personalizadas
class Saudacoes(db.Model):
    __tablename__ = 'saudacoes'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('usuario.id', name='fk_saudacoes_cliente_id'), nullable=False)
    saudacao = db.Column(db.Text, nullable=False)  # Saudação inicial
    regra = db.Column(db.String(20), nullable=False, default="*")  # Regra de envio

    cliente = db.relationship('Usuario', backref=db.backref('saudacoes', lazy=True))

# 🔹 Modelo para Fluxo de Mensagens
class FluxoMensagens(db.Model):
    __tablename__ = 'fluxo_mensagens'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('usuario.id', name='fk_fluxo_cliente_id'), nullable=False)
    chave = db.Column(db.String(100), nullable=False)  # Palavra-chave para o fluxo
    tipo = db.Column(db.String(20), nullable=False)  # exata ou contem
    mensagens = db.Column(db.JSON, nullable=False)  # Lista de mensagens no fluxo (JSON)

    cliente = db.relationship('Usuario', backref=db.backref('fluxos', lazy=True))

# 🔹 Modelo para Mensagens de Acompanhamento
class MensagensAcompanhamento(db.Model):
    __tablename__ = 'mensagens_acompanhamento'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('usuario.id', name='fk_acompanhamento_cliente_id'), nullable=False)
    tempo = db.Column(db.Integer, nullable=False)  # Tempo em minutos
    mensagens = db.Column(db.JSON, nullable=False)  # Mensagens de acompanhamento (JSON)

    cliente = db.relationship('Usuario', backref=db.backref('acompanhamentos', lazy=True))