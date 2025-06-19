import os
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv

# Učitavanje varijabli iz .env datoteke (npr. za lozinku baze)
load_dotenv()

app = Flask(__name__)

# --- Pomoćne funkcije ---
def get_db_connection():
    """Stvara i vraća konekciju na PostgreSQL bazu."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="raspored_app",
            user="postgres",
            password=os.getenv("PGPASSWORD")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Greška prilikom spajanja na bazu: {e}")
        return None

def execute_query(query, params=None, fetch=None):
    """
    Pojednostavljuje izvršavanje upita i rukovanje konekcijom.
    Smanjuje ponavljanje koda u API rutama.
    """
    conn = get_db_connection()
    if not conn:
        return None, "Database connection failed"
    try:
        # Korištenje 'with' osigurava da se resursi automatski oslobode
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch == "one":
                result = cur.fetchone()
            elif fetch == "all":
                result = cur.fetchall()
            else:
                result = None # Za INSERT, UPDATE, DELETE
            conn.commit() # Potvrdi transakciju
            return result, None
    except Exception as e:
        conn.rollback() # Poništi transakciju u slučaju greške
        print(f"Greška u upitu: {e}")
        return None, str(e)
    finally:
        if conn:
            conn.close()

# --- Glavna ruta aplikacije ---
@app.route('/')
def index():
    """Prikazuje glavnu stranicu s kalendarom (index.html)."""
    return render_template('index.html')

# --- API Rute ---

# GET rute za dohvaćanje podataka
@app.route('/api/events')
def get_events():
    """Dohvaća sve događaje za određeni tjedan i godinu."""
    try:
        # Dohvati parametre iz URL-a ili koristi trenutni tjedan kao zadani
        year = int(request.args.get('year', datetime.date.today().isocalendar().year))
        week = int(request.args.get('week', datetime.date.today().isocalendar().week))
    except (ValueError, TypeError):
        today_iso = datetime.date.today().isocalendar()
        year, week = today_iso.year, today_iso.week

    query = """
        SELECT 
            d.id_dogadaj, d.dan, d.vrijeme_od, d.vrijeme_do, k.naziv as kolegij_naziv,
            dv.naziv as dvorana_naziv, n.ime_prezime as nastavnik_ime,
            g.naziv as grupa_naziv, d.oblik_nastave, g.id_grupa, k.id_kolegij,
            dv.id_dvorana, n.id_nastavnik
        FROM dogadaj d
        JOIN grupa g ON d.id_grupa_fk = g.id_grupa
        JOIN kolegij k ON g.id_kolegij_fk = k.id_kolegij
        JOIN dvorana dv ON d.id_dvorana_fk = dv.id_dvorana
        JOIN nastavnik n ON d.id_nastavnik_fk = n.id_nastavnik
        WHERE k.ak_godina = %s AND d.br_tjedna = %s
        ORDER BY d.vrijeme_od;
    """
    # Fiksirano na 2024 za testiranje s podacima koje smo unijeli
    academic_year = 2024
    events, error = execute_query(query, (academic_year, week), fetch="all")
    
    if error:
        return jsonify({"error": error}), 500
        
    # Formatiranje vremena u čitljiv string za frontend
    for event in events:
        event['vrijeme_od'] = event['vrijeme_od'].strftime('%H:%M') if event.get('vrijeme_od') else None
        event['vrijeme_do'] = event['vrijeme_do'].strftime('%H:%M') if event.get('vrijeme_do') else None

    return jsonify({"year": year, "week": week, "events": events})

@app.route('/api/form-data')
def get_form_data():
    """Dohvaća sve potrebne podatke za popunjavanje formi (npr. padajući izbornici)."""
    queries = {
        "grupe": "SELECT id_grupa, naziv FROM grupa ORDER BY naziv",
        "nastavnici": "SELECT id_nastavnik, ime_prezime FROM nastavnik ORDER BY ime_prezime",
        "dvorane": "SELECT id_dvorana, naziv FROM dvorana ORDER BY naziv"
    }
    form_data = {}
    for key, query in queries.items():
        data, error = execute_query(query, fetch="all")
        if error:
            return jsonify({"error": f"Greška pri dohvaćanju '{key}': {error}"}), 500
        form_data[key] = data
    return jsonify(form_data)

# POST ruta za dodavanje novog događaja
@app.route('/api/events', methods=['POST'])
def add_event():
    """Dodaje novi događaj u bazu podataka."""
    data = request.get_json()
    # Jednostavna validacija da su sva polja prisutna
    required_fields = ['id_grupa_fk', 'id_nastavnik_fk', 'id_dvorana_fk', 'dan', 'vrijeme_od', 'vrijeme_do', 'br_tjedna', 'oblik_nastave']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": "Sva polja su obavezna."}), 400

    query = """
        INSERT INTO dogadaj (id_grupa_fk, id_nastavnik_fk, id_dvorana_fk, dan, vrijeme_od, vrijeme_do, br_tjedna, oblik_nastave)
        VALUES (%(id_grupa_fk)s, %(id_nastavnik_fk)s, %(id_dvorana_fk)s, %(dan)s, %(vrijeme_od)s, %(vrijeme_do)s, %(br_tjedna)s, %(oblik_nastave)s)
        RETURNING id_dogadaj;
    """
    new_event, error = execute_query(query, data, fetch="one")
    if error:
        return jsonify({"error": error}), 500
    
    return jsonify({"message": "Događaj uspješno dodan!", "new_event": new_event}), 201

# DELETE ruta za brisanje događaja
@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Briše događaj iz baze na temelju njegovog ID-a."""
    query = "DELETE FROM dogadaj WHERE id_dogadaj = %s;"
    _, error = execute_query(query, (event_id,))
    if error:
        return jsonify({"error": error}), 500

    return jsonify({"message": "Događaj uspješno obrisan!"})

# --- Pokretanje aplikacije ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)
