import os
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv

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
    """Pojednostavljuje izvršavanje upita i rukovanje konekcijom."""
    conn = get_db_connection()
    if not conn:
        return None, "Database connection failed"
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch == "one":
                result = cur.fetchone()
            elif fetch == "all":
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result, None
    except Exception as e:
        conn.rollback()
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

# GET rute
@app.route('/api/events')
def get_events():
    """Dohvaća sve događaje za određeni tjedan i godinu."""
    try:
        year = int(request.args.get('year', datetime.date.today().isocalendar().year))
        week = int(request.args.get('week', datetime.date.today().isocalendar().week))
    except (ValueError, TypeError):
        today_iso = datetime.date.today().isocalendar()
        year, week = today_iso.year, today_iso.week

    query = """
        SELECT 
            d.id_dogadaj, d.dan, d.vrijeme_od, d.vrijeme_do, k.naziv as kolegij_naziv,
            dv.naziv as dvorana_naziv, n.ime_prezime as nastavnik_ime,
            g.naziv as grupa_naziv, d.oblik_nastave, g.id_grupa as id_grupa_fk,
            k.id_kolegij, dv.id_dvorana as id_dvorana_fk, n.id_nastavnik as id_nastavnik_fk,
            d.br_tjedna
        FROM dogadaj d
        JOIN grupa g ON d.id_grupa_fk = g.id_grupa
        JOIN kolegij k ON g.id_kolegij_fk = k.id_kolegij
        JOIN dvorana dv ON d.id_dvorana_fk = dv.id_dvorana
        JOIN nastavnik n ON d.id_nastavnik_fk = n.id_nastavnik
        WHERE k.ak_godina = %s AND d.br_tjedna = %s
        ORDER BY d.vrijeme_od;
    """
    academic_year = 2024
    events, error = execute_query(query, (academic_year, week), fetch="all")
    
    if error:
        return jsonify({"error": error}), 500
        
    for event in events:
        event['vrijeme_od'] = event['vrijeme_od'].strftime('%H:%M') if event.get('vrijeme_od') else None
        event['vrijeme_do'] = event['vrijeme_do'].strftime('%H:%M') if event.get('vrijeme_do') else None

    return jsonify({"year": year, "week": week, "events": events})

@app.route('/api/form-data')
def get_form_data():
    """Dohvaća sve potrebne podatke za popunjavanje formi."""
    # Ostatak funkcije ostaje isti...
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


# POST ruta za dodavanje
@app.route('/api/events', methods=['POST'])
def add_event():
    """Dodaje novi događaj u bazu podataka."""
    # Ostatak funkcije ostaje isti...
    data = request.get_json()
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


# ======================================================
# NOVO: PUT ruta za ažuriranje postojećeg događaja
# ======================================================
@app.route('/api/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    """Ažurira postojeći događaj u bazi."""
    data = request.get_json()
    required_fields = ['id_grupa_fk', 'id_nastavnik_fk', 'id_dvorana_fk', 'dan', 'vrijeme_od', 'vrijeme_do', 'br_tjedna', 'oblik_nastave']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"error": "Sva polja su obavezna."}), 400
    
    # Dodaj ID događaja u rječnik s parametrima za upit
    data['id_dogadaj'] = event_id
    
    query = """
        UPDATE dogadaj
        SET id_grupa_fk = %(id_grupa_fk)s,
            id_nastavnik_fk = %(id_nastavnik_fk)s,
            id_dvorana_fk = %(id_dvorana_fk)s,
            dan = %(dan)s,
            vrijeme_od = %(vrijeme_od)s,
            vrijeme_do = %(vrijeme_do)s,
            br_tjedna = %(br_tjedna)s,
            oblik_nastave = %(oblik_nastave)s
        WHERE id_dogadaj = %(id_dogadaj)s;
    """
    _, error = execute_query(query, data)
    
    if error:
        return jsonify({"error": error}), 500
        
    return jsonify({"message": "Događaj uspješno ažuriran!"})


# DELETE ruta za brisanje
@app.route('/api/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Briše događaj iz baze na temelju njegovog ID-a."""
    # Funkcija ostaje ista
    query = "DELETE FROM dogadaj WHERE id_dogadaj = %s;"
    _, error = execute_query(query, (event_id,))
    if error:
        return jsonify({"error": error}), 500
    return jsonify({"message": "Događaj uspješno obrisan!"})

# --- Pokretanje aplikacije ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)
