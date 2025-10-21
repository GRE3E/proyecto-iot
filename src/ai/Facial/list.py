from db.database import engine

with engine.connect() as conn:
    result = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tablas en la base de datos:")
    for row in result:
        print(row[0])