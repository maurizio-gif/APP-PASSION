// Gli aggiornamenti del CRM, scritti per chi lo usa (non per chi lo sviluppa).
//
// REGOLA: ogni volta che cambia qualcosa di visibile nel CRM (una pagina, una
// scheda, un filtro, un pulsante) o il modo in cui il CRM classifica le cose
// (quando un lead e' vinto, quando una prova e' attiva...), si aggiunge qui una
// voce, nello stesso commit. Vedi CLAUDE.md per come scriverla.
//
// Le voci piu' nuove stanno in cima. Una voce = una cosa sola.

export type Aggiornamento = {
  data: string // AAAA-MM-GG
  titolo: string // breve, dice cosa e' cambiato
  testo: string // 1-3 frasi semplici: cosa vedi adesso, e perche'
  dove: string // dove lo trovi nel CRM
}

export const AGGIORNAMENTI: Aggiornamento[] = [
  {
    data: '2026-10-27',
    titolo: 'Per R2D non c’è più la scheda «Da verificare» nei Ticket',
    testo:
      'R2D vede un ticket solo da quando il supporto glielo invia: finché è «Da verificare» non lo vede. Ora anche la scheda vuota «Da verificare» non compare più a R2D; il supporto la vede come prima.',
    dove: 'Ticket',
  },
  {
    data: '2026-10-27',
    titolo: 'Sul telefono c’è una barra in basso e le schede sono più compatte',
    testo:
      'Dal telefono, in fondo allo schermo, c’è una barra con Home, Lead, Prove, Task e Cerca: la sezione in cui sei è evidenziata. Il pulsante del menu resta in alto, con tutte le sezioni. Anche gli elenchi (Prove, Rinnovi, Disdette, Debitori, Task, Contratti, Ticket e Senza consulente) sono schede più basse, le tendine dei filtri non escono più dal riquadro e i «?» si leggono per intero.',
    dove: 'Tutto il CRM, da telefono',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuova grafica in tutto il CRM',
    testo:
      'Il CRM ha un aspetto nuovo: schede, tabelle e pulsanti rifatti, in nero e rosso, più comodo anche da telefono. È scuro di partenza: con il pulsante col sole, in basso a sinistra, passi al tema chiaro. Funziona tutto come prima. Le novità più grandi sono qui sotto: la Dashboard consulente con i riquadri che portano alle sezioni, la sezione Senza consulente, l’Appello complessivo come calendario e il menu in categorie, con il nuovo gruppo Istruttori.',
    dove: 'Tutto il CRM',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuova sezione «Senza consulente»',
    testo:
      'Nel menu Clienti, tra Prove e Rinnovi, c’è «Senza consulente»: riunisce in tre linguette le opportunità, le prove in corso e i contratti nuovi che nessun consulente ha ancora in carico, ognuna con il suo pulsante «Prendo in carico». Ci arrivi anche dal primo riquadro della Dashboard consulente.',
    dove: 'Senza consulente (menu Clienti)',
  },
  {
    data: '2026-10-27',
    titolo: 'L’Appello complessivo è un calendario del giorno',
    testo:
      'Le lezioni sono divise per orario, con i presenti e una barra, l’istruttore e la sala; premendo «Prenotati» vedi chi ha prenotato. In alto c’è il passaggio tra lezioni future e passate. Il tutorial è il pulsante «Guarda il tutorial» nella barra, e la spiegazione dei segnali (Prova, Nuovo iscritto, First Timer) è nel «?» accanto al titolo.',
    dove: 'Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'Report giornaliero e La mia performance hanno nuovi riquadri e tabelle',
    testo:
      'I numeri stanno in un unico pannello e le tabelle («Per consulente», «Settimana per settimana» e gli elenchi del report) sono più leggibili, con la testata scura. In La mia performance i cinque grafici stanno su una riga e la descrizione di ogni indice è nella «i». Con «Settimana per settimana» vedi tutti gli indici, una colonna per settimana.',
    dove: 'Report giornaliero, Dashboard consulente',
  },
  {
    data: '2026-10-27',
    titolo: 'In Utenti «Nuovo utente» è un pulsante e gli utenti sono in due colonne',
    testo:
      'Accanto alla barra di ricerca c’è il pulsante «Nuovo utente»: lo premi e sotto compare il modulo per aggiungerlo. Gli utenti, e quelli non più attivi, sono ora disposti in due colonne.',
    dove: 'Utenti',
  },
  {
    data: '2026-10-27',
    titolo: 'In Disdette i filtri sono in ordine',
    testo:
      'Ricerca, consulente e ordine stanno su una riga; sotto, i due intervalli di date (scadenza e disdetta) con il pulsante Filtra. Su telefono ogni campo sta su una riga.',
    dove: 'Disdette',
  },
  {
    data: '2026-10-27',
    titolo: 'Nel menu, Report giornaliero sta in Analisi e c’è il gruppo Istruttori',
    testo:
      'Il Report giornaliero (solo admin) è ora dentro il gruppo Analisi. Appello e Appello complessivo stanno nel nuovo gruppo Istruttori, tra Analisi e Team.',
    dove: 'Menu a sinistra',
  },
  {
    data: '2026-10-27',
    titolo: 'La home è la Dashboard consulente: i riquadri portano alle sezioni e sotto c’è La mia performance',
    testo:
      'Prove in scadenza, Rinnovi, Disdette, Task e Senza consulente non aprono più un elenco nella home: premendoli vai alla loro sezione. «Senza consulente» è una sezione nuova, con tre elenchi (opportunità, prove in corso e contratti da prendere in carico). Sotto i riquadri c’è sempre «La mia performance», con il passaggio a «Settimana per settimana».',
    dove: 'Dashboard consulente, Senza consulente (menu Clienti)',
  },
  {
    data: '2026-10-27',
    titolo: 'Appello, Report giornaliero e Contratti senza consulente hanno lo stesso aspetto del resto del CRM',
    testo:
      'Le pagine nuove di questi giorni ora hanno il titolo con il punto «?» per leggere la spiegazione, le schede e le tabelle come le altre sezioni, e i filtri leggibili anche sul telefono. Nei Contratti senza consulente il modulo per prendere in carico si apre con il pulsante, così la tabella non si allarga.',
    dove: 'Appello, Appello complessivo, Report giornaliero, Contratti senza consulente',
  },
  {
    data: '2026-10-27',
    titolo: 'Dall’appello non si apre più l’anagrafica del cliente',
    testo: 'Nell’Appello complessivo il nome di chi ha prenotato non è più un collegamento: si legge soltanto. Nell’Appello istruttore non lo era già.',
    dove: 'Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'Il tutorial dell’appello è più facile da trovare',
    testo:
      'In cima ad Appello istruttore (e ad Appello complessivo) il video-tutorial è ora un riquadro con bordo rosso e il pulsante play, «Guarda il tutorial · 46 secondi»: si apre con un tocco.',
    dove: 'Appello istruttore, Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'Il link per una nuova password si apre da qualsiasi dispositivo',
    testo:
      'Chi chiedeva «Password dimenticata?» da un dispositivo e apriva l’email da un altro (o dall’app della posta) vedeva un errore sul codice. Ora il link funziona ovunque lo apri. Se hai ancora un vecchio link che dà errore, chiedine uno nuovo.',
    dove: 'Accesso → Password dimenticata?',
  },
  {
    data: '2026-10-27',
    titolo: 'In Utenti c’è la ricerca per nome e cognome o email',
    testo:
      'Sopra l’elenco degli utenti c’è un campo di ricerca: scrivi nome e cognome (anche al contrario, anche senza accenti) o un pezzo dell’email e restano solo gli utenti che corrispondono, anche fra quelli non più attivi. «Azzera» toglie la ricerca.',
    dove: 'Utenti',
  },
  {
    data: '2026-10-27',
    titolo: 'Un video-tutorial di 46 secondi spiega l’appello',
    testo:
      'In cima alle pagine Appello istruttore e Appello complessivo c’è «Guarda il tutorial»: un video breve, con le scritte, che mostra come si fa l’appello (quando si segna, il tornello, un tocco per la presenza) e cosa vogliono dire First Timer, Prova e Nuovo iscritto.',
    dove: 'Appello istruttore, Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'La Guida spiega l’appello agli istruttori',
    testo:
      'Nella Guida c’è l’argomento «Appello», scritto per l’istruttore: come si fa l’appello, quando si può segnare (da 59 minuti prima a 59 minuti dopo la lezione), che chi passa dal tornello risulta già presente, e cosa vogliono dire First Timer, Prova e Nuovo iscritto.',
    dove: 'Guida → Appello',
  },
  {
    data: '2026-10-27',
    titolo: 'L’appello ha una nuova impaginazione, con i segnali First Timer, Prova e Nuovo iscritto',
    testo:
      'Appello istruttore e Appello complessivo ora hanno le righe grandi da toccare: un tocco segna la presenza («Segna presente» diventa «✓ Presente»), togliere chiede conferma. Sotto il nome ci sono la data di nascita e l’età, chi ha segnato la presenza e quando (o «tornello/PG»), e tre pastiglie: Prova (ha un Guest Pass da 7 o 10 giorni in corso), Nuovo iscritto (nelle prime due settimane del primo abbonamento) e First Timer (prima volta a quel tipo di lezione). Sopra c’è la legenda; oggi si apre sulla riga «Adesso».',
    dove: 'Appello istruttore, Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'Creati gli utenti degli istruttori, con la sola sezione Appello',
    testo:
      'Sono stati creati gli utenti di 25 istruttori, con nome ed email presi da PerfectGym, e hanno accesso solo a «Appello istruttore». In Utenti, «Istruttori da invitare» manda l’email di registrazione con un clic a chi ha lezioni in calendario su PerfectGym; gli altri si invitano a mano dalla loro scheda. Gli istruttori che su PerfectGym non hanno l’email vanno creati a mano.',
    dove: 'Utenti',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuovo Appello complessivo: tutte le lezioni del giorno, con i filtri',
    testo:
      'Mostra tutte le lezioni di un giorno, di tutti gli istruttori, con chi ha prenotato e chi è presente. Si filtra per istruttore, lezione, categoria e sala; in cima ci sono lezioni, prenotati, presenti e percentuale di presenza. Lo vedono gli admin e i consulenti. Si legge soltanto: la presenza la segna l’istruttore.',
    dove: 'Appello complessivo',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuovo Appello istruttore: ognuno vede solo le sue lezioni e segna le presenze',
    testo:
      'L’istruttore vede chi ha prenotato le sue lezioni di oggi e dei prossimi giorni. Le presenze si segnano da 59 minuti prima dell’inizio fino a 59 minuti dopo la fine della lezione: prima e dopo si legge soltanto. L’istruttore è riconosciuto dall’email, la stessa che ha su PerfectGym. Per ora le presenze restano nel CRM: l’invio a PerfectGym non è ancora acceso.',
    dove: 'Appello istruttore',
  },
  {
    data: '2026-10-27',
    titolo: 'Nei contratti senza consulente c’è il consulente suggerito',
    testo:
      'Se una persona ha già lavorato con un consulente (task fatti, anche un tentativo, o una prova che seguiva), sotto «Da prendere in carico» compare «Suggerito: nome» con il motivo, già scelto nella tendina. È solo un suggerimento: confermi o scegli un altro, e la nota resta obbligatoria.',
    dove: 'Dashboard consulente → Contratti senza consulente',
  },
  {
    data: '2026-10-27',
    titolo: 'Gli abbonamenti in prima battuta contano nella tua performance',
    testo:
      'Nella performance c’è il nuovo indice «Abbonamenti in prima battuta», con il numero e la somma dei canoni: sono gli abbonamenti che hai preso in carico da «Contratti senza consulente». Sono contati anche in «Abbonamenti venduti», e nel Report giornaliero vanno a chi li ha presi in carico.',
    dove: 'Dashboard consulente → La mia performance',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuovi abbonamenti senza consulente: si prendono in carico dalla Dashboard',
    testo:
      'Nella Dashboard consulente c’è il riquadro «Contratti senza consulente»: sono gli abbonamenti nuovi che nessuna opportunità ha portato (la persona si è iscritta senza chiedere informazioni). Chi li ha seguiti li prende in carico con «Prendo in carico» e scrive una nota obbligatoria su come è nato il contratto; la nota compare anche nella scheda della persona. Se la persona si è iscritta da sola online, si segna «Online» e non va a nessuno. Il consulente di PerfectGym non si usa.',
    dove: 'Dashboard consulente → Contratti senza consulente',
  },
  {
    data: '2026-10-27',
    titolo: 'Ogni indice della performance spiega come è calcolato',
    testo:
      'Accanto al nome di ogni indice (nei riquadri, nei grafici e nella tabella) c’è una «i»: passandoci sopra, o toccandola sul telefono, si apre la formula con una spiegazione chiara e, dove serve, un esempio. La «i» accanto a «settimana scorsa» e «media delle 4 prima» spiega come si fanno i confronti.',
    dove: 'Dashboard consulente → La mia performance',
  },
  {
    data: '2026-10-27',
    titolo: 'Fra le disdette restano solo quelle vere: i cambi abbonamento non ci sono più',
    testo:
      'Se la persona ha un altro abbonamento che dà continuità (il vecchio finisce il 26 e il nuovo comincia il 27) non è una disdetta ma un cambio abbonamento, e non compare più. Vale anche per il passato: delle 2.248 disdette, 903 erano cambi e sono state tolte dall’elenco, dalla home, dalla scheda persona, dal Report giornaliero e dalla tua performance. I task «chiamare per capire il motivo» ancora aperti per i cambi sono stati archiviati. Una disdetta resta da gestire solo se la persona non ha dato continuità.',
    dove: 'Disdette (e home, scheda persona, Report giornaliero, performance)',
  },
  {
    data: '2026-10-27',
    titolo: 'Nella tua performance: vinte e perse, e l’importo degli abbonamenti venduti',
    testo:
      'Sotto «Opportunità chiuse» ora vedi quante sono vinte e quante perse (e hanno una riga ciascuna nella tabella settimana per settimana). C’è poi il riquadro «Importo abbonamenti venduti»: la somma dei canoni mensili degli abbonamenti venduti nella settimana, con sotto il valore del vincolo minimo (canone per i mesi minimi del piano), confrontati con le settimane prima.',
    dove: 'Dashboard consulente → La mia performance',
  },
  {
    data: '2026-10-27',
    titolo: 'Nella Dashboard consulente non ci sono più gli elenchi di anteprima',
    testo:
      'Sono spariti gli elenchi delle opportunità da gestire, dei task e delle prove in scadenza: restano i riquadri con i numeri e, cliccandoli, si apre la sezione con l’elenco completo. La pagina è più corta e la tua performance si vede subito.',
    dove: 'Dashboard consulente',
  },
  {
    data: '2026-10-27',
    titolo: 'Nella Dashboard consulente c’è la tua performance, settimana per settimana',
    testo:
      'In fondo alla pagina trovi le tue percentuali: opportunità chiuse, opportunità che diventano Guest Pass, Guest Pass che diventano abbonamento, abbonamenti venduti, tempo di primo ricontatto, disdette recuperate e rinnovi riusciti. Ogni numero è confrontato con la settimana scorsa e con la media delle quattro settimane prima, con i grafici dell’andamento. Un admin può guardare quella di un collega.',
    dove: 'Dashboard consulente → La mia performance',
  },
  {
    data: '2026-10-27',
    titolo: 'Ogni opportunità mostra quanto ci è voluto per il primo ricontatto',
    testo:
      'Nella colonna «Primo ricontatto» vedi in quanto tempo l’opportunità è stata ricontattata (anche con un tentativo o «Non risponde») o da quanto aspetta: verde fino a 30 minuti, giallo fino a 2 ore, rosso oltre. Il tempo conta solo nell’orario di lavoro, 9–21 dal lunedì al venerdì e 10–19:30 sabato e domenica: un’opportunità arrivata a mezzanotte comincia a contare alle 9 (alle 10 nel weekend).',
    dove: 'Opportunità',
  },
  {
    data: '2026-10-27',
    titolo: '«Da gestire» si chiama ora «Dashboard consulente»',
    testo: 'È la prima voce del menu, la pagina che si apre appena entri. Cambia solo il nome: ci trovi gli stessi numeri e gli stessi elenchi di prima.',
    dove: 'Dashboard consulente (la prima voce del menu)',
  },
  {
    data: '2026-10-27',
    titolo: 'Nuovo Report giornaliero, per gli admin',
    testo:
      'Mostra tutto quello che è successo in un giorno: opportunità arrivate e prese in carico, commenti, task fatti e creati, pass attivati, abbonamenti venduti, opportunità chiuse, disdette e rinnovi. In cima i numeri del giorno, poi una tabella con quello che ha fatto ogni consulente e, sotto, l’elenco di ogni cosa con la persona (si apre in un’altra scheda). Si cambia giorno con le frecce e si filtra per consulente e per tipologia.',
    dove: 'Report giornaliero (solo admin)',
  },
  {
    data: '2026-10-27',
    titolo: 'Nelle Disdette si cerca, si ordina e si filtra per data',
    testo:
      'Sopra l’elenco c’è la ricerca per nome e cognome, cellulare o email. Si può ordinare per data di scadenza o di disdetta e scegliere un periodo, di scadenza e/o di disdetta. Nell’elenco ora si legge la data di scadenza del contratto e il nome della persona apre la sua scheda in un’altra scheda del browser, così non si perde l’elenco.',
    dove: 'Disdette',
  },
  {
    data: '2026-10-27',
    titolo: 'Pass di prova: tabella mese per mese con durata, Reformer e Formula 8',
    testo:
      'Sotto i pass di prova c’è una scheda da aprire e chiudere con un mese per riga. Per ogni mese dice quante persone si abbonano in tutto, per Guest Pass da 7 giorni, da 10 giorni, con i soli pass giornalieri, e tra chi ha prenotato una lezione di Reformer o di Formula 8.',
    dove: 'Abbonamenti → Pass di prova mese per mese',
  },
  {
    data: '2026-10-27',
    titolo: 'Pass di prova: si vede la durata del Guest Pass e chi prenota Reformer o Formula 8',
    testo:
      'Sotto i pass di prova ci sono due tabelle, una per Reformer e una per Formula 8. Dividono le persone per durata del Guest Pass (7 giorni, 10 giorni, solo pass giornalieri) e dicono quante hanno prenotato almeno una lezione durante la prova e quante di loro si sono abbonate, a confronto con chi non ha prenotato. Le lezioni Formula 8 esistono da settembre 2026, quindi per ora i numeri sono piccoli.',
    dove: 'Abbonamenti → Pass di prova',
  },
  {
    data: '2026-10-23',
    titolo: 'Nelle Prove c’è la scheda «Perse»',
    testo:
      'Mostra le prove chiuse come «Non iscritto», quelle che non sono diventate un abbonamento. Prima erano mescolate con le altre prove chiuse.',
    dove: 'Prove → Perse',
  },
  {
    data: '2026-10-23',
    titolo: 'Nelle Opportunità con il contratto si vede se è pagato',
    testo:
      'Nelle schede Prove in corso, Prove scadute e Vinte c’è la colonna Pagamento: dice se il Pass o l’abbonamento è pagato (verde) o da pagare (rosso, con l’importo). Prima per saperlo bisognava aprire la scheda della persona.',
    dove: 'Opportunità → Prove in corso, Prove scadute, Vinte',
  },
  {
    data: '2026-10-27',
    titolo: 'La Guida spiega perché le prove in corso sono due numeri',
    testo:
      'Il numero di «In corso» in Prove è più alto di «Prove in corso» in Opportunità: in Prove si contano tutti i pass attivi, in Opportunità solo quelli di chi ha un’opportunità. Ora la Guida lo spiega, e descrive anche le schede «Prove in corso» e «Prove scadute» di Opportunità.',
    dove: 'Guida (Prove e Opportunità)',
  },
  {
    data: '2026-10-27',
    titolo: 'Il numero di righe in cima agli elenchi',
    testo:
      'In Prove, Rinnovi, Disdette e Debitori, sopra la tabella c’è una fascia con quante righe stai guardando, per esempio «8 prove». Prima c’era solo in Opportunità.',
    dove: 'Prove, Rinnovi, Disdette, Debitori',
  },
  {
    data: '2026-10-27',
    titolo: 'Il menu a sinistra è in categorie',
    testo:
      'Le voci sono raggruppate in Clienti, Analisi, Istruttori, Team e Assistenza, e ogni gruppo si apre e si chiude. In alto, sotto il logo, ci sono il tuo nome e la data.',
    dove: 'Menu a sinistra',
  },
  {
    data: '2026-10-27',
    titolo: 'Il pulsante per tornare indietro',
    testo:
      'In alto a sinistra, accanto al titolo, c’è un pulsante tondo per tornare alla pagina di prima.',
    dove: 'Tutte le pagine',
  },
  {
    data: '2026-10-27',
    titolo: 'Le spiegazioni sono nel «?»',
    testo:
      'Le frasi che spiegano una sezione o un riquadro ora si leggono passando sul «?» accanto al titolo. Così le pagine sono più libere.',
    dove: 'Abbonamenti, Marketing, Dashboard consulente e le altre sezioni',
  },
  {
    data: '2026-10-27',
    titolo: 'I ticket non sono più in home',
    testo:
      'I riquadri sui ticket sono spariti dalla home. Li trovi tutti in Ticket, nelle viste «Per R2D» e «Per Passion».',
    dove: 'Dashboard consulente, Ticket',
  },
  {
    data: '2026-10-27',
    titolo: 'Prove: nuova scheda «Perse»',
    testo:
      'Fra le prove chiuse, «Perse» mostra solo quelle finite senza iscrizione.',
    dove: 'Prove',
  },
  {
    data: '2026-10-27',
    titolo: 'Un campo «Cerca» negli elenchi',
    testo:
      'In Prove, Rinnovi, Disdette, Task, Debitori e Ticket puoi scrivere un nome per trovare subito la riga. Cerca solo nella scheda che hai aperto.',
    dove: 'Prove, Rinnovi, Disdette, Task, Debitori, Ticket',
  },
  {
    data: '2026-10-27',
    titolo: 'Ticket: nomi nuovi e thread chiuso',
    testo:
      'Il «filo» ora si chiama «Thread» e si apre solo quando serve. La colonna «Socio» è diventata «Cliente», «Aperto» è diventato «Aperto da».',
    dove: 'Ticket',
  },
  {
    data: '2026-10-27',
    titolo: 'La fonte è un bollino sotto il nome',
    testo:
      'In Opportunità e in Prove, da dove arriva la persona (Meta, Sito, Tour…) si vede con un bollino sotto il nome del cliente. In Opportunità non c’è più la colonna «Tipologia».',
    dove: 'Opportunità, Prove',
  },
  {
    data: '2026-10-27',
    titolo: 'La scheda della persona è rifatta',
    testo:
      'Opportunità, Prova, Abbonamento, Rinnovo e Disdetta sono riquadri a righe, con lo storico in fondo. I task si dividono fra da fare e fatti. Prenotazioni, Accessi e Ticket stanno su una riga e si aprono con un tocco.',
    dove: 'Scheda della persona',
  },
  {
    data: '2026-10-27',
    titolo: 'Abbonamenti ridisegnato',
    testo:
      'I grafici hanno i colori del marchio. «Quanto durano» è in tre schede, una per tipo di abbonamento, con il confronto fra gli ultimi 12 mesi e i 12 prima. La tabella mese per mese ha i nomi delle colonne in alto.',
    dove: 'Abbonamenti',
  },
  {
    data: '2026-10-27',
    titolo: 'Marketing ridisegnato',
    testo:
      'Periodo, date e fonte stanno in un solo pannello. Il percorso delle opportunità è un grafico a barre, con i numeri e le percentuali di ogni passo.',
    dove: 'Marketing',
  },
  {
    data: '2026-10-27',
    titolo: 'Curriculum, Utenti e Guida con la nuova grafica',
    testo:
      'In Curriculum il file è un pulsante con il tipo e il peso. In Utenti ogni persona si apre e si chiude e «Aggiungi nuovo utente» è un pulsante scuro. La Guida ha schede per argomento e un indice numerato, e due argomenti nuovi: «Le parole del CRM» e «Risposte rapide».',
    dove: 'Curriculum, Utenti, Guida',
  },
  {
    data: '2026-10-21',
    titolo: 'Chi deve rinnovare non compare più anche fra le disdette',
    testo:
      'Alcuni Percorsi «I ❤️ My Trainer» e Reformer 12 mesi, arrivati da Airtable, comparivano sia in Disdette sia in Rinnovi. Ora stanno solo in Rinnovi, dove devono stare perché sono abbonamenti a scadenza fissa. Sono spariti anche alcuni doppioni di disdette della stessa persona e la loro telefonata «chiamare per capire il motivo»: per il rinnovo c’è già la sua.',
    dove: 'Disdette, Rinnovi, Task',
  },
  {
    data: '2026-10-21',
    titolo: 'I «Lead» adesso si chiamano «Opportunità»',
    testo:
      'La sezione Lead ora si chiama Opportunità, e così in tutto il CRM: in home («Opportunità da gestire», «Le mie opportunità»), nella scheda della persona, nei task, in Marketing e nella Guida. Il pulsante è «+ Nuova opportunità». Funziona tutto come prima. Su PerfectGym la persona resta un «Lead», come sempre.',
    dove: 'Opportunità, Home, Scheda persona, Marketing, Utenti, Guida',
  },
  {
    data: '2026-10-20',
    titolo: 'La sezione Marketing si dà persona per persona',
    testo:
      'Marketing non la vede più nessuno in automatico, nemmeno gli admin: compare solo a chi la riceve. Si dà o si toglie da Utenti, con la spunta «Marketing» nella scheda di ogni persona, anche per un admin.',
    dove: 'Utenti, Marketing',
  },
  {
    data: '2026-10-20',
    titolo: 'In Marketing si vede anche come vengono lavorati i lead',
    testo:
      'Accanto al percorso (hanno risposto, prova, iscritti) c’è «Come vengono gestiti»: quanti lead nessuno ha lavorato, quante azioni fanno i colleghi per ogni lead, quanto passa prima del primo contatto e quanti non hanno mai risposto. Serve a capire se un risultato basso dipende dalla campagna o da come si lavora il lead. Per i lead di prima di maggio 2026 i «nr» scritti nei commenti contano come tentativi.',
    dove: 'Marketing',
  },
  {
    data: '2026-10-20',
    titolo: 'Nuova sezione Marketing: da dove arrivano i lead e quanti si iscrivono',
    testo:
      'Per ogni fonte, campagna e mese vedi quanti lead sono arrivati, quanti hanno risposto, quanti hanno attivato la prova e quanti si sono iscritti. La prova è un passaggio facoltativo: si vede anche quanti si iscrivono senza passarci. La sezione si dà a una persona alla volta da Utenti.',
    dove: 'Marketing',
  },
  {
    data: '2026-10-19',
    titolo: 'Le schede doppie di PerfectGym non contano più',
    testo:
      'Su PerfectGym alcune persone avevano due o tre schede uguali, create per errore dai moduli del sito. Il CRM ora usa solo la scheda giusta: chi era collegato a una scheda doppia adesso vede quella vera, e se è socio lo vedi come socio.',
    dove: 'Scheda persona, Cerca, Lead',
  },
  {
    data: '2026-10-19',
    titolo: 'Chi è cancellato su PerfectGym non compare più',
    testo:
      'Se una scheda viene cancellata su PerfectGym (per esempio un doppione), la persona sparisce da Cerca, dai Lead, dai Task e dai numeri della home. Se della stessa persona resta un’altra scheda su PerfectGym, il CRM la collega a quella e la persona resta visibile. Se la persona fa una nuova richiesta, torna visibile da sola.',
    dove: 'Cerca, Lead, Task, Home',
  },
  {
    data: '2026-10-17',
    titolo: 'R2D vede un ticket solo quando gli viene inviato',
    testo:
      'Finché un ticket è in gestione al supporto, R2D non lo vede: né nell’elenco, né nei numeri della home. Quando il supporto lo manda a R2D, R2D vede subito tutto lo storico: il filo dei messaggi e gli allegati.',
    dove: 'Ticket',
  },
  {
    data: '2026-10-07',
    titolo: 'Nella sezione Prove ci sono solo le prove vere',
    testo:
      'Prima, chi chiedeva la prova dal sito finiva subito fra le prove in corso, anche se la prova non era ancora partita. Adesso fra le Prove compare solo chi ha davvero il Pass su PerfectGym. Chi ha solo chiesto la prova resta fra i Lead.',
    dove: 'Prove',
  },
  {
    data: '2026-10-07',
    titolo: 'Nei Lead ci sono «Prove in corso» e «Prove scadute»',
    testo:
      'Quando un lead attiva la prova, passa in «Prove in corso». Finita la prova, se non si è abbonato, passa in «Prove scadute». Se invece si abbona, passa da solo in «Vinte».',
    dove: 'Lead',
  },
  {
    data: '2026-10-07',
    titolo: '«Vinte» mostra solo chi ha firmato un abbonamento',
    testo:
      'Prima in «Vinte» finivano anche quelli che avevano solo attivato la prova. Adesso ci sono solo gli abbonamenti, dal più recente, con la data di firma.',
    dove: 'Lead → Vinte',
  },
  {
    data: '2026-10-07',
    titolo: 'Più informazioni nei Lead in prova e nelle Vinte',
    testo:
      'In queste tre schede, al posto di «Attività di interesse» e «Nota task», vedi il nome dell’abbonamento (o del Pass), la data di inizio e il consulente.',
    dove: 'Lead → Prove in corso, Prove scadute, Vinte',
  },
  {
    data: '2026-10-07',
    titolo: 'Nuovo filtro «Nessun consulente»',
    testo: 'Tra i consulenti c’è anche «Nessun consulente»: ti fa vedere i lead che nessuno ha ancora preso in carico.',
    dove: 'Lead',
  },
  {
    data: '2026-10-07',
    titolo: 'Si vede se un abbonamento o una prova è stato pagato',
    testo:
      'Accanto a prove e abbonamenti compare «Pagato» (verde) oppure «Da pagare» con l’importo (rosso). Nella scheda della persona trovi anche quanto ha pagato e il suo saldo.',
    dove: 'Scheda persona, Prove, Nuovi contratti',
  },
  {
    data: '2026-10-07',
    titolo: 'La prova resta allo stesso consulente del lead',
    testo:
      'Se una persona era già stata assegnata a un consulente come lead, quando attiva la prova resta a lui. Non serve assegnarla di nuovo.',
    dove: 'Prove',
  },
  {
    data: '2026-10-07',
    titolo: 'Una persona che ricompila il modulo non crea un lead doppio',
    testo:
      'Se la persona ha già un lead aperto, la nuova richiesta non crea un altro lead: sul lead compare «Richieste: 2 volte» con la data dell’ultima. Se il lead precedente era già chiuso, ne nasce uno nuovo.',
    dove: 'Lead, Scheda persona',
  },
  {
    data: '2026-10-07',
    titolo: 'Scheda persona più ordinata',
    testo:
      'I lead e le prove ancora aperti stanno in evidenza. Quelli vecchi e chiusi sono raccolti in «Storico lead» e «Storico prove», che si aprono con un clic.',
    dove: 'Scheda persona',
  },
  {
    data: '2026-10-07',
    titolo: '«Apri su PerfectGym» c’è anche per i lead',
    testo:
      'Prima il pulsante c’era solo per chi aveva un abbonamento. Adesso c’è anche per i lead che su PerfectGym esistono già: il CRM li collega da solo tramite l’email.',
    dove: 'Scheda persona',
  },
  {
    data: '2026-10-07',
    titolo: 'Il nome del lead si apre in una nuova scheda del browser',
    testo: 'Cliccando sul nome nella lista dei lead, la scheda si apre in una nuova tab, così non perdi il punto della lista. Lo riconosci dalla freccia ↗.',
    dove: 'Lead',
  },
]
