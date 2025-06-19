
BEGIN;

CREATE TABLE kolegij (
    id_kolegij SERIAL PRIMARY KEY,
    naziv VARCHAR(100) NOT NULL,
    ects SMALLINT,
    semestar SMALLINT,
    ak_godina INTEGER -- Dodano za filtriranje po akademskoj godini
);

CREATE TABLE nastavnik (
    id_nastavnik SERIAL PRIMARY KEY,
    ime_prezime VARCHAR(100) NOT NULL,
    titula VARCHAR(50),
    email VARCHAR(100) UNIQUE -- Email bi trebao biti jedinstven
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
    jmbag VARCHAR(10) PRIMARY KEY,
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
    id_kolegij_fk INTEGER REFERENCES kolegij(id_kolegij) ON DELETE CASCADE, -- Veza s kolegijem je ovdje
    semestar VARCHAR(6) CHECK( semestar = 'zimski' OR semestar = 'ljetni' ),
    naziv VARCHAR(50) NOT NULL
);

CREATE TABLE dogadaj (
    id_dogadaj SERIAL PRIMARY KEY,
    id_grupa_fk INTEGER REFERENCES grupa(id_grupa) ON DELETE CASCADE,
    id_nastavnik_fk INTEGER REFERENCES nastavnik(id_nastavnik),
    id_dvorana_fk INTEGER REFERENCES dvorana(id_dvorana),
    dan VARCHAR(10) CHECK (dan IN ('Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja')),
    vrijeme_od TIME,
    vrijeme_do TIME,
    br_tjedna SMALLINT,
    oblik_nastave VARCHAR(50),
    vrijedece_vrijeme TSRANGE DEFAULT tsrange(NOW()::TIMESTAMP, 'infinity'::TIMESTAMP)
);

CREATE TABLE prisustvo (
    id_dogadaj_fk INTEGER REFERENCES dogadaj(id_dogadaj) ON DELETE CASCADE,
    jmbag VARCHAR(10) REFERENCES student(jmbag) ON DELETE CASCADE,
    datum DATE,
    PRIMARY KEY (id_dogadaj_fk, jmbag, datum)
);

CREATE TABLE nastavnik_log (
    stari_email TEXT,
    vrijeme_promjene TIMESTAMP DEFAULT now()
);

COMMIT;

-- FUNKCIJE I OKIDAČI (TRIGGERS)

-- Okidač za temporalnost (praćenje povijesti)
CREATE OR REPLACE FUNCTION promjena_dogadaja_trigger_fcn()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dogadaj
    SET vrijedece_vrijeme = tsrange(LOWER(OLD.vrijedece_vrijeme), NOW())
    WHERE id_dogadaj = OLD.id_dogadaj;
    RETURN OLD; 
END;
$$ LANGUAGE plpgsql;

-- Okidač se aktivira PRIJE brisanja ili ažuriranja
CREATE TRIGGER temp_dogadaj_trigger
BEFORE UPDATE OR DELETE ON dogadaj
FOR EACH ROW
EXECUTE PROCEDURE promjena_dogadaja_trigger_fcn();


-- Okidač za provjeru formata emaila
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

-- Pravilo za logiranje promjene emaila nastavnika
CREATE OR REPLACE RULE nastavnik_log_rule AS
ON UPDATE TO nastavnik
WHERE NEW.email IS DISTINCT FROM OLD.email
DO INSERT INTO nastavnik_log (stari_email) VALUES (OLD.email);


-- POGLEDI (VIEWS)

-- AŽURIRANI POGLED: dohvaća kolegij preko tablice 'grupa'
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
    JOIN grupa g ON dg.id_grupa_fk = g.id_grupa -- Ažurirana veza
    JOIN kolegij k ON g.id_kolegij_fk = k.id_kolegij -- Ažurirana veza
    JOIN dvorana d ON dg.id_dvorana_fk = d.id_dvorana
    JOIN nastavnik n ON dg.id_nastavnik_fk = n.id_nastavnik;

-- AŽURIRANI POGLED: koristi novu M:N tablicu 'nastavnik_kolegij'
CREATE OR REPLACE VIEW kolegiji_po_nastavniku AS
SELECT
    n.ime_prezime AS nastavnik,
    k.naziv AS kolegij,
    k.semestar
FROM
    nastavnik n
    JOIN nastavnik_kolegij nk ON n.id_nastavnik = nk.id_nastavnik_fk
    JOIN kolegij k ON nk.id_kolegij_fk = k.id_kolegij;

-- AŽURIRANI POGLED: dohvaća kolegij preko tablice 'grupa'
CREATE OR REPLACE VIEW ukupan_broj_predavanja AS
SELECT 
    g.id_kolegij_fk,
    COUNT(d.id_dogadaj) AS broj_predavanja
FROM 
    dogadaj d
    JOIN grupa g ON d.id_grupa_fk = g.id_grupa
GROUP BY g.id_kolegij_fk;


-- PRIMJERI KORISNIH UPITA (AŽURIRANI)

-- Upit koji vraća nastavnika koji drži najviše kolegija u zimskom semestru
-- Koristi novu tablicu 'nastavnik_kolegij'
SELECT n.ime_prezime, COUNT(k.id_kolegij) AS broj_kolegija
FROM nastavnik n
JOIN nastavnik_kolegij nk ON n.id_nastavnik = nk.id_nastavnik_fk
JOIN kolegij k ON nk.id_kolegij_fk = k.id_kolegij
WHERE k.semestar = 1 -- Pretpostavka da je zimski semestar 1
GROUP BY n.ime_prezime
ORDER BY broj_kolegija DESC
LIMIT 1;

-- Upit koji vraća najmanje korištene dvorane unutar određenog intervala
-- Ovaj upit je bio ispravan
SELECT d.naziv, COUNT(dg.id_dogadaj) AS broj_koristenja
FROM dvorana d
LEFT JOIN dogadaj dg ON d.id_dvorana = dg.id_dvorana_fk
    AND dg.vrijeme_od >= (NOW() - INTERVAL '3 months')
GROUP BY d.naziv
ORDER BY broj_koristenja ASC;

-- AŽURIRAN upit za izostanke po studentu
-- Koristi ažurirane veze i poglede
WITH izostanci_po_studentu AS (
    SELECT 
        s.jmbag, 
        s.ime_prezime, 
        g.id_kolegij_fk,
        -- Brojimo prisustva za svaki kolegij
        COUNT(p.datum) AS broj_prisustva
    FROM 
        student s
        JOIN prisustvo p ON s.jmbag = p.jmbag
        JOIN dogadaj d ON p.id_dogadaj_fk = d.id_dogadaj
        JOIN grupa g ON d.id_grupa_fk = g.id_grupa
    GROUP BY s.jmbag, s.ime_prezime, g.id_kolegij_fk
),
postotak_izostanaka AS (
    SELECT 
        ips.jmbag,
        ips.ime_prezime,
        ips.id_kolegij_fk,
        -- Postotak se računa kao (broj prisustva / ukupan broj predavanja) * 100
        (CAST(ips.broj_prisustva AS NUMERIC) / ubp.broj_predavanja) * 100 AS postotak_prisutnosti
    FROM izostanci_po_studentu ips
    JOIN ukupan_broj_predavanja ubp ON ips.id_kolegij_fk = ubp.id_kolegij_fk
    WHERE ubp.broj_predavanja > 0 -- Izbjegavamo dijeljenje s nulom
)
SELECT 
    jmbag, 
    ime_prezime,
    -- Prosjek postotaka prisutnosti po svim kolegijima za studenta
    AVG(postotak_prisutnosti) AS prosjecni_postotak_prisutnosti
FROM 
    postotak_izostanaka
GROUP BY 
    jmbag, 
    ime_prezime
ORDER BY 
    prosjecni_postotak_prisutnosti ASC;

