-- Verzija 1.7 - KONAČNA ISPRAVKA: Trigger je AFTER i ima WHEN uvjet za sprječavanje rekurzije.
-- Ovo rješava "stack depth limit exceeded" i "tuple already modified" greške.

BEGIN;

-- Brisanje starih objekata kako bi se osigurao čist početak
DROP TABLE IF EXISTS prisustvo CASCADE;
DROP TABLE IF EXISTS dogadaj CASCADE;
DROP TABLE IF EXISTS grupa CASCADE;
DROP TABLE IF EXISTS nastavnik_kolegij CASCADE;
DROP TABLE IF EXISTS student CASCADE;
DROP TABLE IF EXISTS studijskiProgram CASCADE;
DROP TABLE IF EXISTS dvorana CASCADE;
DROP TABLE IF EXISTS kolegij CASCADE;
DROP TABLE IF EXISTS nastavnik CASCADE;
DROP TABLE IF EXISTS nastavnik_log CASCADE;
DROP VIEW IF EXISTS raspored_studenta, kolegiji_po_nastavniku, ukupan_broj_predavanja;
DROP FUNCTION IF EXISTS promjena_dogadaja_trigger_fcn(), provjera_emaila_trigger_fcn();

-- Kreiranje tablica
CREATE TABLE kolegij (
    id_kolegij SERIAL PRIMARY KEY,
    naziv VARCHAR(100) NOT NULL,
    ects SMALLINT,
    semestar SMALLINT,
    ak_godina INTEGER
);

CREATE TABLE nastavnik (
    id_nastavnik SERIAL PRIMARY KEY,
    ime_prezime VARCHAR(100) NOT NULL,
    titula VARCHAR(50),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE dvorana (
    id_dvorana SERIAL PRIMARY KEY,
    naziv VARCHAR(100) NOT NULL,
    kapacitet INTEGER
);

CREATE TABLE studijskiProgram (
    id_program SERIAL PRIMARY KEY,
    naziv VARCHAR(100) NOT NULL
);

CREATE TABLE student (
    jmbag VARCHAR(15) PRIMARY KEY,
    ime_prezime VARCHAR(100) NOT NULL,
    godina SMALLINT,
    id_program_fk INTEGER REFERENCES studijskiProgram(id_program)
);

CREATE TABLE nastavnik_kolegij (
    id_nastavnik_fk INTEGER REFERENCES nastavnik(id_nastavnik) ON DELETE CASCADE,
    id_kolegij_fk INTEGER REFERENCES kolegij(id_kolegij) ON DELETE CASCADE,
    PRIMARY KEY (id_nastavnik_fk, id_kolegij_fk)
);


CREATE TABLE grupa (
    id_grupa SERIAL PRIMARY KEY,
    id_kolegij_fk INTEGER REFERENCES kolegij(id_kolegij) ON DELETE CASCADE,
    semestar VARCHAR(6) CHECK( semestar = 'zimski' OR semestar = 'ljetni' ),
    naziv VARCHAR(50) NOT NULL
);

CREATE TABLE dogadaj (
    id_dogadaj SERIAL PRIMARY KEY,
    id_grupa_fk INTEGER REFERENCES grupa(id_grupa) ON DELETE CASCADE,
    id_nastavnik_fk INTEGER REFERENCES nastavnik(id_nastavnik),
    id_dvorana_fk INTEGER REFERENCES dvorana(id_dvorana),
    dan VARCHAR(15) CHECK (dan IN ('Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja')),
    vrijeme_od TIME,
    vrijeme_do TIME,
    br_tjedna SMALLINT,
    oblik_nastave VARCHAR(50),
    vrijedece_vrijeme TSRANGE DEFAULT tsrange(NOW()::TIMESTAMP, 'infinity'::TIMESTAMP)
);

CREATE TABLE prisustvo (
    id_dogadaj_fk INTEGER REFERENCES dogadaj(id_dogadaj) ON DELETE CASCADE,
    jmbag VARCHAR(15) REFERENCES student(jmbag) ON DELETE CASCADE,
    datum DATE,
    PRIMARY KEY (id_dogadaj_fk, jmbag, datum)
);

CREATE TABLE nastavnik_log (
    stari_email TEXT,
    vrijeme_promjene TIMESTAMP DEFAULT now()
);

COMMIT;

-- FUNKCIJE I OKIDAČI (TRIGGERS)

CREATE OR REPLACE FUNCTION promjena_dogadaja_trigger_fcn()
RETURNS TRIGGER AS $$
BEGIN
    -- Arhiviraj stari redak tako da mu zatvoriš vremenski raspon valjanosti
    UPDATE dogadaj
    SET vrijedece_vrijeme = tsrange(LOWER(OLD.vrijedece_vrijeme), NOW()::timestamp)
    WHERE id_dogadaj = OLD.id_dogadaj;

    -- Vrati NULL jer AFTER trigger ignorira povratnu vrijednost
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- --- KONAČNI ISPRAVAK JE OVDJE ---
-- Trigger je AFTER i ima WHEN uvjet koji provjerava dubinu rekurzije.
-- Trigger će se pokrenuti samo ako je pg_trigger_depth() < 1 (tj. ako nije rekurzivni poziv).
CREATE TRIGGER temp_dogadaj_trigger
AFTER UPDATE OR DELETE ON dogadaj
FOR EACH ROW
WHEN (pg_trigger_depth() < 1)
EXECUTE PROCEDURE promjena_dogadaja_trigger_fcn();
-- --- KRAJ ISPRAVKA ---


CREATE OR REPLACE FUNCTION provjera_emaila_trigger_fcn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email IS NOT NULL AND NEW.email NOT LIKE '%_@__%.__%' THEN
        RAISE EXCEPTION 'Neispravan format emaila: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provjera_emaila_nastavnik_trigger
BEFORE INSERT OR UPDATE ON nastavnik
FOR EACH ROW
EXECUTE PROCEDURE provjera_emaila_trigger_fcn();


-- PRAVILA (RULES)

CREATE OR REPLACE RULE nastavnik_log_rule AS
ON UPDATE TO nastavnik
WHERE NEW.email IS DISTINCT FROM OLD.email
DO INSERT INTO nastavnik_log (stari_email) VALUES (OLD.email);


-- POGLEDI (VIEWS)

CREATE OR REPLACE VIEW raspored_studenta AS
SELECT 
    s.jmbag,
    s.ime_prezime,
    dg.dan,
    dg.vrijeme_od,
    dg.vrijeme_do,
    k.naziv AS kolegij,
    d.naziv AS dvorana,
    n.ime_prezime AS nastavnik
FROM 
    student s
    JOIN prisustvo p ON s.jmbag = p.jmbag
    JOIN dogadaj dg ON p.id_dogadaj_fk = dg.id_dogadaj
    JOIN grupa g ON dg.id_grupa_fk = g.id_grupa
    JOIN kolegij k ON g.id_kolegij_fk = k.id_kolegij
    JOIN dvorana d ON dg.id_dvorana_fk = d.id_dvorana
    JOIN nastavnik n ON dg.id_nastavnik_fk = n.id_nastavnik;

CREATE OR REPLACE VIEW kolegiji_po_nastavniku AS
SELECT
    n.ime_prezime AS nastavnik,
    k.naziv AS kolegij,
    k.semestar
FROM
    nastavnik n
    JOIN nastavnik_kolegij nk ON n.id_nastavnik = nk.id_nastavnik_fk
    JOIN kolegij k ON nk.id_kolegij_fk = k.id_kolegij;

CREATE OR REPLACE VIEW ukupan_broj_predavanja AS
SELECT 
    g.id_kolegij_fk,
    COUNT(d.id_dogadaj) AS broj_predavanja
FROM 
    dogadaj d
    JOIN grupa g ON d.id_grupa_fk = g.id_grupa
GROUP BY g.id_kolegij_fk;
