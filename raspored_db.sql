BEGIN;

CREATE TABLE kolegij (
    id_kolegij SERIAL PRIMARY KEY,
    naziv VARCHAR(100),
    ects SMALLINT,
    semestar SMALLINT
);

CREATE TABLE nastavnik (
    id_nastavnik SERIAL PRIMARY KEY,
    ime_prezime VARCHAR(100),
    titula VARCHAR(50),
    email VARCHAR(100)
);

CREATE TABLE dvorana (
    id_dvorana SERIAL PRIMARY KEY,
    naziv VARCHAR(100),
    kapacitet INTEGER
);

CREATE TABLE studijskiProgram (
    id_program SERIAL PRIMARY KEY,
    naziv VARCHAR(100)
);

CREATE TABLE student (
    jmbag VARCHAR(10) PRIMARY KEY,
    ime_prezime VARCHAR(100),
    godina SMALLINT,
    id_program_fk INTEGER REFERENCES studijskiProgram(id_program)
);

CREATE TABLE grupa (
    id_grupa SERIAL PRIMARY KEY,
    id_kolegij_fk INTEGER REFERENCES kolegij(id_kolegij),
    semestar VARCHAR(6) CHECK( semestar = 'zimski' 
 OR semestar = 'ljetni' ),
    naziv VARCHAR(50)
);

CREATE TABLE dogadaj (
    id_dogadaj SERIAL PRIMARY KEY,
    ak_godina INTEGER,
    id_kolegij_fk INTEGER REFERENCES kolegij(id_kolegij),
    id_grupa_fk INTEGER REFERENCES grupa(id_grupa),
    tjedni VARCHAR(50),
    dan VARCHAR(10),
    vrijeme_od TIME,
    vrijeme_do TIME,
    semestar VARCHAR(6) CHECK( semestar = 'zimski' 
	OR semestar = 'ljetni' ),
    id_nastavnik_fk INTEGER REFERENCES nastavnik(id_nastavnik),
    br_tjedna SMALLINT,
    id_dvorana_fk INTEGER REFERENCES dvorana(id_dvorana),
    oblik_nastave VARCHAR(50),
    vrijedece_vrijeme TSRANGE DEFAULT tsrange(NOW()::TIMESTAMP, 'infinity'::TIMESTAMP)[^1^][1]
);

CREATE TABLE prisustvo (
    id_dogadaj_fk INTEGER REFERENCES dogadaj(id_dogadaj),
    jmbag VARCHAR(10) REFERENCES student(jmbag),
    datum DATE
);

CREATE TABLE nastavnik_log (
    email TEXT,
    vrijeme TIMESTAMP DEFAULT now()
);

COMMIT;

%funkcija za tavlicu dogadaj%
CREATE OR REPLACE FUNCTION promjena_dogadaja()
RETURNS TRIGGER
AS $$
BEGIN
    UPDATE dogadaj
    SET vrijedece_vrijeme = tsrange(
        LOWER(vrijedece_vrijeme)::TIMESTAMP,
        NOW()::TIMESTAMP
    )
    WHERE OLD.id = id
    AND UPPER(vrijedece_vrijeme) = 'infinity'::TIMESTAMP;
    RETURN NULL;
END;
$$
LANGUAGE plpgsql;

%okidač za funkciju%
CREATE TRIGGER temp_dogadaj
BEFORE DELETE
ON dogadaj
FOR EACH ROW
EXECUTE PROCEDURE promjena_dogadaja();

%funkcija provjere emaila unosa novog nastavnika%
CREATE OR REPLACE FUNCTION provjera_emaila()
RETURNS TRIGGER
AS $$
BEGIN
    IF NEW.email NOT LIKE '%@%' THEN
        RAISE EXCEPTION 'Neispravan email: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;

%okidač za funkciju provjere nastavnika%
CREATE TRIGGER provjera_emaila_nastavnik
BEFORE INSERT OR UPDATE
ON nastavnik
FOR EACH ROW
EXECUTE PROCEDURE provjera_emaila();

%RULE za provjeru ispravnog emaila%

CREATE RULE nastavnik_log AS ON UPDATE TO nastavnik
WHERE NEW.email <> OLD.email
DO INSERT INTO nastavnik_log VALUES (OLD.email);

UPDATE nastavnik SET email = 'novi.email@primjer.hr' WHERE email = 'stari.email@primjer.hr';[^1^][1]

SELECT * FROM nastavnik_log;

%upit koji vraca nastavnika koji drzi najvise kolegija u zimskom semestru u tekućoj ak. g.%
WITH kolegiji_po_nastavniku AS (
    SELECT n.ime_prezime, COUNT(*) AS broj_kolegija
    FROM nastavnik n
    JOIN kolegij k ON n.id_nastavnik = k.id_nastavnik
    WHERE k.semestar = 'zimski' AND EXTRACT(YEAR FROM NOW()) = ak_godina
    GROUP BY n.ime_prezime
)
SELECT * FROM kolegiji_po_nastavniku
ORDER BY broj_kolegija DESC
LIMIT 1;

%upit koji vraća najmanje korištene dvorane unutar intervala od 3 mjeseca%
WITH korištenje_dvorana AS (
    SELECT d.naziv, COUNT(*) AS broj_koristenja
    FROM dvorana d
    JOIN dogadaj dg ON d.id_dvorana = dg.id_dvorana
    WHERE dg.vrijeme_do >= NOW() - INTERVAL '3 months'
    GROUP BY d.naziv
)
SELECT * FROM korištenje_dvorana
ORDER BY broj_koristenja ASC;

%pogled rasporeda pojedinog studenta za tjedan%
CREATE VIEW raspored_studenta AS
SELECT 
    s.ime_prezime,
    dg.dan,
    dg.vrijeme_od,
    dg.vrijeme_do,
    k.naziv AS kolegij,
    d.naziv AS dvorana
FROM 
    student s
    JOIN prisustvo p ON s.jmbag = p.jmbag
    JOIN dogadaj dg ON p.id_dogadaj_fk = dg.id_dogadaj
    JOIN kolegij k ON dg.id_kolegij_fk = k.id_kolegij
    JOIN dvorana d ON dg.id_dvorana_fk = d.id_dvorana;
	
	%pogled koji vraća sve kolegije koje drži neki nastavnik%
	CREATE VIEW kolegiji_po_nastavniku AS
SELECT
    n.ime_prezime,
    k.naziv AS kolegij,
    k.semestar
FROM
    nastavnik n
    JOIN kolegij k ON n.id_nastavnik = k.id_nastavnik;
	
%pogled za ukupan broj predavanja na kolegiju%
CREATE VIEW ukupan_broj_predavanja AS
SELECT 
    id_kolegij_fk,
    COUNT(*) AS broj_predavanja
FROM 
    dogadaj
GROUP BY id_kolegij_fk;

%upit bizostanak po studentu%
WITH izostanci_po_studentu AS (
    SELECT 
        s.jmbag, 
        s.ime_prezime, 
        k.id_kolegij_fk,
        COUNT(*) AS broj_izostanaka,
        ubp.broj_predavanja
    FROM 
        student s
        JOIN prisustvo p ON s.jmbag = p.jmbag
        JOIN dogadaj d ON p.id_dogadaj_fk = d.id_dogadaj
        JOIN kolegij k ON d.id_kolegij_fk = k.id_kolegij
        JOIN ukupan_broj_predavanja ubp ON k.id_kolegij_fk = ubp.id_kolegij_fk
    GROUP BY s.jmbag, s.ime_prezime, k.id_kolegij_fk, ubp.broj_predavanja
),
postotak_izostanaka AS (
    SELECT 
        *,
        (1 - CAST(broj_izostanaka AS NUMERIC) / broj_predavanja) * 100 AS postotak_prisutnosti
    FROM izostanci_po_studentu
)
SELECT 
    jmbag, 
    ime_prezime,
    AVG(postotak_prisutnosti) AS prosjecni_postotak_prisutnosti
FROM 
    postotak_izostanaka
GROUP BY 
    jmbag, 
    ime_prezime
ORDER BY 
    AVG(postotak_prisutnosti) ASC;