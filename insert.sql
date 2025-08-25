
-- Brisanje postojećih podataka kako bi se osigurao čist unos
BEGIN;
DELETE FROM prisustvo;
DELETE FROM dogadaj;
DELETE FROM grupa;
DELETE FROM nastavnik_kolegij;
DELETE FROM student;
DELETE FROM studijskiProgram;
DELETE FROM dvorana;
DELETE FROM kolegij;
DELETE FROM nastavnik;
COMMIT;


BEGIN;

-- 1. UNOS STUDIJSKIH PROGRAMA
INSERT INTO studijskiProgram (id_program, naziv) VALUES
(1, 'Informacijski i poslovni sustavi'),
(2, 'Ekonomika poduzetništva'),
(3, 'Primjena informacijske tehnologije u poslovanju');

-- 2. UNOS DVORANA
INSERT INTO dvorana (id_dvorana, naziv, kapacitet) VALUES
(1, 'Dvorana 1 (D1)', 150),
(2, 'Dvorana 3 (D3)', 100),
(3, 'Dvorana 7 (D7)', 70),
(4, 'Dvorana 9 (D9)', 70),
(5, 'Dvorana 10 (D10)', 200),
(6, 'Informatički laboratorij 1 (PRL1)', 30),
(7, 'Informatički laboratorij 2 (PRL2)', 30),
(8, 'Informatički laboratorij 5 (PRL5)', 25),
(9, 'VŽ1-104', 50),
(10, 'VŽ3-313', 40);

-- 3. UNOS NASTAVNIKA
INSERT INTO nastavnik (id_nastavnik, ime_prezime, titula, email) VALUES
(1, 'Vjeran Strahonja', 'prof. dr. sc.', 'vjeran.strahonja@foi.unizg.hr'),
(2, 'Markus Schatten', 'izv. prof. dr. sc.', 'markus.schatten@foi.unizg.hr'),
(3, 'Katarina Tomičić-Pupek', 'doc. dr. sc.', 'katarina.tomicic-pupek@foi.unizg.hr'),
(4, 'Alen Lovrenčić', 'prof. dr. sc.', 'alen.lovrencic@foi.unizg.hr'),
(5, 'Neven Vrček', 'prof. dr. sc.', 'neven.vrcek@foi.unizg.hr'),
(6, 'Igor Tomičić', 'doc. dr. sc.', 'igor.tomicic@foi.unizg.hr'),
(7, 'Nikola Kadoić', 'doc. dr. sc.', 'nikola.kadoic@foi.unizg.hr'),
(8, 'Bogdan Okreša Đurić', 'dr. sc.', 'bogdan.okresa.djuric@foi.unizg.hr'),
(9, 'Martina Tomčić', 'asistent', 'martina.tomcic@foi.unizg.hr'),
(10, 'Ivana Kancir', 'predavač', 'ivana.kancir@foi.unizg.hr'),
(11, 'Darko Grabar', 'predavač', 'darko.grabar@foi.unizg.hr'),
(12, 'Boris Kliček', 'dr. sc.', 'boris.klicek@foi.unizg.hr');

-- 4. UNOS KOLEGIJA
INSERT INTO kolegij (id_kolegij, naziv, ects, semestar, ak_godina) VALUES
(1, 'Matematika 1', 7, 1, 2024), (2, 'Osnove programiranja', 6, 1, 2024), (3, 'Poslovno komuniciranje', 4, 1, 2024),
(4, 'Uvod u računalnu znanost', 5, 1, 2024), (5, 'Engleski jezik 1', 2, 1, 2024), (6, 'Tjelesna i zdravstvena kultura 1', 1, 1, 2024),
(7, 'Baze podataka', 7, 3, 2024), (8, 'Modeliranje poslovnih procesa', 6, 3, 2024), (9, 'Web dizajn i programiranje', 6, 3, 2024),
(10, 'Statistika', 5, 3, 2024), (11, 'Operacijski sustavi', 6, 3, 2024), (12, 'Umjetna inteligencija', 6, 5, 2024),
(13, 'Sigurnost informacijskih sustava', 6, 5, 2024), (14, 'Upravljanje projektnim rizikom', 5, 5, 2024), (15, 'Digitalni marketing', 5, 5, 2024);

-- 5. VEZNA TABLICA NASTAVNIK-KOLEGIJ
INSERT INTO nastavnik_kolegij (id_nastavnik_fk, id_kolegij_fk) VALUES
(1, 8), (3, 8), (2, 12), (8, 12), (4, 7), (11, 7), (5, 13), (6, 9), (9, 9),
(7, 14), (12, 15), (11, 2), (11, 11), (10, 5), (1, 4);

-- 6. UNOS STUDENATA
INSERT INTO student (jmbag, ime_prezime, godina, id_program_fk) VALUES
('0246012345', 'Ivan Ivić', 1, 1), ('0246023456', 'Ana Anić', 1, 1), ('0246034567', 'Petar Perić', 2, 1),
('0246045678', 'Maja Majić', 2, 2), ('0246056789', 'Luka Lukić', 3, 1), ('0246067890', 'Tea Tepić', 3, 1),
('0246078901', 'Marko Marić', 1, 2), ('0246089012', 'Petra Pavlić', 2, 3), ('0246090123', 'Filip Filipović', 3, 3),
('0246011223', 'Jana Janić', 1, 1);

-- 7. UNOS GRUPA
INSERT INTO grupa (id_grupa, id_kolegij_fk, semestar, naziv) VALUES
(1, 7, 'zimski', 'BP - Predavanja (Svi)'), (2, 7, 'zimski', 'BP - Vježbe Grupa A'), (3, 7, 'zimski', 'BP - Vježbe Grupa B'),
(4, 9, 'zimski', 'WDP - Predavanja (Svi)'), (5, 9, 'zimski', 'WDP - Vježbe Grupa A'), (6, 9, 'zimski', 'WDP - Vježbe Grupa B'),
(7, 12, 'zimski', 'UI - Predavanja (Svi)'), (8, 12, 'zimski', 'UI - Vježbe (Svi)'), (9, 2, 'zimski', 'OP - Predavanja (Svi)'),
(10, 2, 'zimski', 'OP - Vježbe Grupa 1'), (11, 2, 'zimski', 'OP - Vježbe Grupa 2'), (12, 2, 'zimski', 'OP - Vježbe Grupa 3');


-- 8. UNOS DOGAĐAJA U RASPOREDU (BEZ RUČNOG ID-a)
INSERT INTO dogadaj (id_grupa_fk, id_nastavnik_fk, id_dvorana_fk, dan, vrijeme_od, vrijeme_do, br_tjedna, oblik_nastave) VALUES
-- Tjedan 42
(1, 4, 1, 'Ponedjeljak', '08:15', '10:00', 42, 'Predavanje'),
(5, 9, 6, 'Ponedjeljak', '10:15', '12:00', 42, 'Laboratorijske vježbe'),
(7, 2, 5, 'Ponedjeljak', '14:15', '16:00', 42, 'Predavanje'),
(2, 11, 7, 'Utorak', '10:15', '12:00', 42, 'Laboratorijske vježbe'),
(6, 9, 6, 'Utorak', '12:15', '14:00', 42, 'Laboratorijske vježbe'),
(9, 11, 2, 'Utorak', '16:15', '18:00', 42, 'Predavanje'),
(3, 11, 8, 'Srijeda', '08:15', '10:00', 42, 'Laboratorijske vježbe'),
(8, 8, 5, 'Srijeda', '12:15', '14:00', 42, 'Auditorne vježbe'),
(10, 9, 6, 'Srijeda', '14:15', '16:00', 42, 'Laboratorijske vježbe'),
(4, 6, 3, 'Četvrtak', '10:15', '12:00', 42, 'Predavanje'),
(11, 9, 7, 'Četvrtak', '14:15', '16:00', 42, 'Laboratorijske vježbe'),
(12, 9, 8, 'Petak', '10:15', '12:00', 42, 'Laboratorijske vježbe'),
-- Tjedan 43
(1, 4, 1, 'Ponedjeljak', '08:15', '10:00', 43, 'Predavanje'),
(5, 9, 6, 'Ponedjeljak', '10:15', '12:00', 43, 'Laboratorijske vježbe'),
(7, 2, 5, 'Ponedjeljak', '14:15', '16:00', 43, 'Predavanje'),
(2, 11, 7, 'Utorak', '10:15', '12:00', 43, 'Laboratorijske vježbe'),
(6, 9, 6, 'Utorak', '12:15', '14:00', 43, 'Laboratorijske vježbe'),
(9, 11, 2, 'Utorak', '16:15', '18:00', 43, 'Predavanje'),
(3, 11, 8, 'Srijeda', '08:15', '10:00', 43, 'Laboratorijske vježbe'),
(8, 8, 5, 'Srijeda', '12:15', '14:00', 43, 'Auditorne vježbe'),
(10, 9, 6, 'Srijeda', '14:15', '16:00', 43, 'Laboratorijske vježbe'),
(4, 6, 3, 'Četvrtak', '10:15', '12:00', 43, 'Predavanje'),
(11, 9, 7, 'Četvrtak', '14:15', '16:00', 43, 'Laboratorijske vježbe'),
(12, 9, 8, 'Petak', '10:15', '12:00', 43, 'Laboratorijske vježbe');

-- 9. UNOS PRISUSTVA
INSERT INTO prisustvo (id_dogadaj_fk, jmbag, datum) VALUES
(6, '0246012345', '2024-10-15'), (18, '0246012345', '2024-10-22'),
(1, '0246034567', '2024-10-14'), (13, '0246034567', '2024-10-21'),
(3, '0246056789', '2024-10-14'), (15, '0246056789', '2024-10-21'),
(8, '0246056789', '2024-10-16'), (20, '0246056789', '2024-10-23');

COMMIT;
