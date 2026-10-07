# Regole del progetto (CRM Passion Fitness)

## Ogni cambiamento al CRM va scritto negli «Aggiornamenti»

Il CRM ha una sezione **Aggiornamenti** (`/dashboard/aggiornamenti`, voce del
menu per tutti) che dice allo staff cosa e' cambiato. Le voci stanno in
`lib/aggiornamenti.ts`.

**Quando:** ogni volta che si cambia

- quello che si vede (una pagina, una scheda, un filtro, una colonna, un pulsante,
  un testo importante);
- il modo in cui il CRM classifica le cose (quando un lead e' «vinto», quando
  una prova e' «attiva», quale consulente prende una prova, come si contano le
  richieste ripetute...).

**Come:** si aggiunge una voce in cima a `AGGIORNAMENTI`, nello **stesso commit**
della modifica. Una voce = una cosa sola.

**Come si scrive** (il lettore e' un collega che non sa niente di tecnica):

- italiano semplice, frasi corte, niente parole da programmatori (niente
  «database», «mirror», «funzione», «migrazione», «filtro SQL», nomi di tabelle);
- dire cosa **vedi adesso** e, se serve, com'era prima, in 1-3 frasi;
- indicare **dove** si trova nel CRM (il nome della sezione come sta nel menu);
- usare i nomi che vede lo staff («Prove in corso», «Vinte»), non quelli interni;
- niente elenchi di dettagli tecnici: quelli stanno nelle migrazioni e nei commenti.

Se non e' chiaro se un cambiamento va scritto, scrivilo.
