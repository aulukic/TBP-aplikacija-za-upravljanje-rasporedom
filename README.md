Web Aplikacija za Upravljanje Rasporedom

Ovo je web aplikacija za upravljanje rasporedom nastave, razvijena kao projekt za demonstraciju aktivno-temporalnih značajki PostgreSQL baze podataka. Aplikacija omogućuje pregled, dodavanje, uređivanje i brisanje događaja u rasporedu, kao i generiranje specifičnih izvještaja.
Tehnologije

    Backend: Python 3 s Flask web okvirom

    Baza podataka: PostgreSQL (verzija 14+)

    Frontend: HTML5, CSS3, "Vanilla" JavaScript (bez dodatnih okvira)

Upute za Postavljanje i Pokretanje (Linux Mint / Ubuntu)

Ove upute će vas provesti kroz cijeli proces, od instalacije potrebnog softvera do pokretanja aplikacije.
1. Predinstalacije

Prije početka, potrebno je imati instaliran Python i PostgreSQL.

# Ažurirajte listu paketa
sudo apt update

# Instalirajte PostgreSQL (verzija 14 je standardna na Mint 21/Ubuntu 22.04)
sudo apt install postgresql postgresql-contrib

# Instalirajte Python alate (pip i venv)
sudo apt install python3-pip python3-venv

2. Postavljanje Baze Podataka

Ovaj korak je ključan i uključuje rješavanje čestih problema s dozvolama.
a) Kreiranje korisnika i baze

    Prijavite se u psql sučelje kao postgres superuser:

    sudo -u postgres psql

    Unutar psql sučelja, postavite lozinku za postgres korisnika. Ova lozinka će vam trebati kasnije!

    \password postgres

    Unesite i potvrdite novu lozinku.

    Kreirajte bazu podataka za aplikaciju:

    CREATE DATABASE raspored_app;

    Izađite iz psql-a:

    \q

b) Konfiguracija dozvola (Peer Authentication)

Da bi se aplikacija mogla spojiti na bazu s lozinkom, potrebno je promijeniti metodu autentifikacije.

    Otvorite konfiguracijsku datoteku pg_hba.conf:

    sudo nano /etc/postgresql/14/main/pg_hba.conf

    (Ako koristite drugu verziju, zamijenite 14 s odgovarajućim brojem)

    Pronađite redak koji izgleda ovako:
    local   all             postgres                                peer

    Promijenite peer u md5. Redak sada treba izgledati ovako:
    local   all             postgres                                md5

    Spremite datoteku i izađite (Ctrl+X, zatim Y, pa Enter).

    Restartajte PostgreSQL servis kako bi se promjene primijenile:

    sudo systemctl restart postgresql

3. Postavljanje Aplikacije

    Pozicionirajte se u glavni direktorij projekta.

    Kreirajte i aktivirajte virtualno okruženje:

    # Kreiranje
    python3 -m venv .venv

    # Aktivacija
    source .venv/bin/activate

    (Ako koristite conda, aktivirajte vaše postojeće okruženje.)

    Instalirajte potrebne Python biblioteke:

    pip install Flask psycopg2-binary python-dotenv

    Kreirajte .env datoteku za lozinku baze:

    touch .env

    Otvorite novonastalu .env datoteku i u nju upišite samo jedan red, koristeći lozinku koju ste postavili u koraku 2a:

    PGPASSWORD=vasa_postgres_lozinka

4. Inicijalizacija Baze Podataka

Ove naredbe će kreirati strukturu baze i unijeti početne podatke. Koristi se cat | ... metoda kako bi se zaobišli problemi s dozvolama home direktorija.

    Učitajte strukturu baze: (Ova skripta će prvo sama obrisati sve postojeće tablice ako postoje)

    cat raspored_db.sql | sudo -u postgres psql -d raspored_app

    Učitajte početne podatke:

    cat insert.sql | sudo -u postgres psql -d raspored_app

    Sinkronizirajte brojač (sekvencu) ID-jeva (ključan korak!):
    Ovo osigurava da dodavanje novih događaja kroz aplikaciju radi ispravno.

    echo "SELECT setval('dogadaj_id_dogadaj_seq', (SELECT MAX(id_dogadaj) FROM dogadaj));" | sudo -u postgres psql -d raspored_app

5. Pokretanje Aplikacije

Kada ste završili sve prethodne korake, pokrenite aplikaciju:

python app.py

Otvorite web preglednik i navigirajte na adresu: http://127.0.0.1:5001

Aplikacija bi sada trebala biti u potpunosti funkcionalna.