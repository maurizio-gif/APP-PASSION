-- Un contratto tesserato e' un contratto controllato
--
-- Su Airtable il campo CONTROLLATO di NUOVI CONTRATTI non si usava quasi mai
-- (45 «SI» su 2.434): il segno che un contratto era a posto era il
-- tesseramento. E' anche la regola detta in riunione: «una vendita e' chiusa se
-- c'e' il metodo di pagamento e c'e' il tesseramento». Senza questa
-- correzione il contenitore «da controllare» partiva con 1.774 contratti, quasi
-- tutti gia' lavorati.
--
-- Vale solo per lo storico importato da Airtable: i contratti che arrivano dal
-- mirror nascono «da controllare».
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

update public.nuovi_contratti
   set controllo = 'controllato'
 where origine = 'airtable'
   and controllo = 'da_controllare'
   and tesseramento in ('si', 'gia_presente');
