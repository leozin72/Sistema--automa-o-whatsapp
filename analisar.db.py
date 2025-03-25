import sqlite3

# Conectar ao banco de dados
conn = sqlite3.connect("database.db")
cursor = conn.cursor()

# Buscar todas as tabelas no banco de dados
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tabelas = cursor.fetchall()

print("Tabelas encontradas no banco de dados:")
for tabela in tabelas:
    tabela_nome = tabela[0]
    print(f"\n📂 {tabela_nome}:")

    # Buscar colunas da tabela
    cursor.execute(f"PRAGMA table_info({tabela_nome});")
    colunas = cursor.fetchall()

    for coluna in colunas:
        print(f"   - {coluna[1]} ({coluna[2]})")

conn.close()