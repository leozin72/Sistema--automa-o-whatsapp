from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3

app = Flask(__name__)
app.secret_key = "a3c521b856e172e93363acecdaabb2f0"  # Protege a sessão do usuário
app.config['SESSION_TYPE'] = 'filesystem'

# Criar banco de dados e tabela se não existirem
def criar_tabela():
    conn = sqlite3.connect('usuarios.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS usuarios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        email TEXT UNIQUE NOT NULL,
                        senha TEXT NOT NULL)''')
    conn.commit()
    conn.close()

criar_tabela()

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['password']

        try:
            conn = sqlite3.connect('usuarios.db')
            cursor = conn.cursor()
            cursor.execute("INSERT INTO usuarios (email, senha) VALUES (?, ?)", (email, senha))
            conn.commit()
            conn.close()
            return redirect(url_for('login'))
        except:
            return "Erro ao cadastrar. Tente novamente."

    return render_template('cadastro.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        senha = request.form['password']

        conn = sqlite3.connect('usuarios.db')
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE email = ? AND senha = ?", (email, senha))
        usuario = cursor.fetchone()
        conn.close()

        if usuario:
            session['usuario'] = email
            return redirect("http://127.0.0.1:5000/dashboard")  # Redireciona para o app.py
        else:
            return "Login falhou. Verifique suas credenciais."

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, port=5001)
