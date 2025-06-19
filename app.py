from flask import Flask, render_template, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime

app = Flask(__name__)

# Funkcija za spajanje na bazu
def get_db_connection():
    # Prilagodite podatke ako je potrebno
    conn = psycopg2.connect(
        host="localhost",
        database="raspored_app", # Ime baze koju ste kreirali
        user="postgres",
        password="vasa-lozinka" # Vaša lozinka za postgres korisnika
    )
    return conn

# Glavna ruta koja prikazuje HTML stranicu
@app.route('/')
def index():
    return render_template('index.html')

# API ruta za dohvaćanje događaja za određeni tjedan
@app.route('/api/events')
def get_events():
    conn = get_db_connection()
    # Koristimo RealDictCursor da dobijemo rezultate kao rječnike (slično JSON-u)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Jednostavan upit koji dohvaća sve događaje.
    # U pravoj aplikaciji, ovdje biste dodali WHERE klauzulu za određeni tjedan/datum.
    query = """
        SELECT 
            d.id_dogadaj, d.dan, d.vrijeme_od, d.vrijeme_do,
            k.naziv as kolegij_naziv,
            dv.naziv as dvorana_naziv,
            n.ime_prezime as nastavnik_ime
        FROM dogadaj d
        JOIN kolegij k ON d.id_kolegij_fk = k.id_kolegij
        JOIN dvorana dv ON d.id_dvorana_fk = dv.id_dvorana
        JOIN nastavnik n ON d.id_nastavnik_fk = n.id_nastavnik;
    """
    cur.execute(query)
    events = cur.fetchall()
    
    # Preformatiraj vrijeme u string
    for event in events:
        event['vrijeme_od'] = event['vrijeme_od'].strftime('%H:%M')
        event['vrijeme_do'] = event['vrijeme_do'].strftime('%H:%M')

    cur.close()
    conn.close()
    
    return jsonify(events)

if __name__ == '__main__':
    app.run(debug=True, port=5001) # Koristimo port 5001 da izbjegnemo sukob