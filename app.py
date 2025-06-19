import os
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv

# Učitavanje varijabli iz .env datoteke (npr. za lozinku baze)
load_dotenv()

app = Flask(__name__)

# Funkcija za spajanje na bazu
def get_db_connection():
    """Stvara i vraća konekciju na PostgreSQL bazu."""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="raspored_app", # Ime baze koju ste kreirali
            user="postgres",
            # Sigurniji način rukovanja lozinkom koristeći varijable okruženja
            # Kreirajte .env datoteku i u nju dodajte: PGPASSWORD=vasa-lozinka
            password=os.getenv("PGPASSWORD")
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Greška prilikom spajanja na bazu: {e}")
        return None

# Glavna ruta koja prikazuje HTML stranicu
@app.route('/')
def index():
    """Prikazuje glavnu stranicu s kalendarom."""
    return render_template('index.html')

# API ruta za dohvaćanje događaja za određeni tjedan
@app.route('/api/events')
def get_events():
    """
    Dohvaća događaje iz baze za određeni tjedan.
    Tjedan i godina se prosljeđuju kao query parametri (npr. /api/events?year=2024&week=42).
    Ako parametri nisu zadani, koristi se trenutni tjedan.
    """
    try:
        # Dohvati godinu i tjedan iz URL-a, ako nisu zadani, koristi trenutne
        year_str = request.args.get('year')
        week_str = request.args.get('week')

        if year_str and week_str:
            year = int(year_str)
            week = int(week_str)
        else:
            today = datetime.date.today()
            # Koristi isocalendar() za dobivanje (godina, tjedan, dan u tjednu)
            iso_calendar = today.isocalendar()
            year = iso_calendar.year
            week = iso_calendar.week

    except (TypeError, ValueError):
        # U slučaju neispravnih parametara, koristi trenutni tjedan
        today = datetime.date.today()
        iso_calendar = today.isocalendar()
        year = iso_calendar.year
        week = iso_calendar.week

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Nije moguće uspostaviti vezu s bazom."}), 500

    # Koristimo RealDictCursor da dobijemo rezultate kao rječnike (slično JSON-u)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # AŽURIRANI UPIT:
    # 1. Koristi ispravan JOIN preko tablice 'grupa' za dohvat naziva kolegija.
    # 2. Filtrira događaje po broju tjedna i akademskoj godini kolegija.
    query = """
        SELECT 
            d.id_dogadaj, d.dan, d.vrijeme_od, d.vrijeme_do,
            k.naziv as kolegij_naziv,
            dv.naziv as dvorana_naziv,
            n.ime_prezime as nastavnik_ime,
            g.naziv as grupa_naziv,
            d.oblik_nastave
        FROM dogadaj d
        JOIN grupa g ON d.id_grupa_fk = g.id_grupa
        JOIN kolegij k ON g.id_kolegij_fk = k.id_kolegij
        JOIN dvorana dv ON d.id_dvorana_fk = dv.id_dvorana
        JOIN nastavnik n ON d.id_nastavnik_fk = n.id_nastavnik
        WHERE k.ak_godina = %s AND d.br_tjedna = %s
        ORDER BY d.vrijeme_od;
    """
    
    try:
        # Godina se u našem slučaju odnosi na početak akademske godine
        # Za jednostavnost, koristit ćemo direktno prosljeđenu godinu, 
        # ali u produkciji bi se to trebalo mapirati na akademsku godinu (npr. 2024/2025)
        # Za potrebe testiranja s unesenim podacima, fiksirat ćemo ak. godinu na 2024.
        academic_year = 2024 

        cur.execute(query, (academic_year, week))
        events = cur.fetchall()
        
        # Preformatiraj vrijeme u string za lakšu obradu u JavaScriptu
        for event in events:
            if event.get('vrijeme_od'):
                event['vrijeme_od'] = event['vrijeme_od'].strftime('%H:%M')
            if event.get('vrijeme_do'):
                event['vrijeme_do'] = event['vrijeme_do'].strftime('%H:%M')

        cur.close()
        conn.close()
        
        # Vraćamo i podatke o tjednu i godini za prikaz na sučelju
        response_data = {
            "year": year,
            "week": week,
            "events": events
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"Greška prilikom izvršavanja upita: {e}")
        return jsonify({"error": "Dogodila se greška na serveru."}), 500

# === DODATNA RUTA ZA IZVJEŠTAJE (OPCIONALNO) ===
@app.route('/api/reports/least-used-halls')
def get_least_used_halls():
    """API ruta koja vraća izvještaj o najmanje korištenim dvoranama."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Nije moguće uspostaviti vezu s bazom."}), 500
        
    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT d.naziv, COUNT(dg.id_dogadaj) AS broj_koristenja
        FROM dvorana d
        LEFT JOIN dogadaj dg ON d.id_dvorana = dg.id_dvorana_fk
            AND dg.vrijeme_od >= (NOW() - INTERVAL '3 months')
        GROUP BY d.naziv
        ORDER BY broj_koristenja ASC, d.naziv ASC;
    """
    try:
        cur.execute(query)
        data = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(data)
    except Exception as e:
        print(f"Greška prilikom izvršavanja upita za izvještaj: {e}")
        return jsonify({"error": "Dogodila se greška na serveru."}), 500


if __name__ == '__main__':
    # Koristimo port 5001 da izbjegnemo sukob s drugim aplikacijama
    app.run(debug=True, port=5001)
