from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from datetime import timedelta
import os
import logging

# Configuração de Logs
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Configuração do Flask
from flask import Flask

app = Flask(__name__, template_folder="templates", static_folder="static")

# 🔹 Define cabeçalhos para evitar cache
@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "-1"
    return response
    
app.secret_key = os.getenv('SECRET_KEY', 'ff6f262dbc928a9717a28702ff2b66c2fe5c9e268486fbb1') 

# Configuração do Banco de Dados (SQLite)
(PostgreSQL)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///:memory:')  # Fallback para SQLite em memória
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configuração de Sessão
app.config['SESSION_COOKIE_NAME'] = 'meubot_session'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Defina como True se estiver rodando HTTPS
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# 🔹 Agora importamos o banco e inicializamos corretamente
from models import db
db.init_app(app)  # ✅ Agora o app é registrado corretamente no SQLAlchemy

# Inicializa o Flask-Migrate
migrate = Migrate(app, db)

# 🔹 Importação e Registro das Rotas
from routes.routes import routes  
app.register_blueprint(routes)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
