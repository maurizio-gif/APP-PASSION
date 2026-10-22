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
    data: '2026-10-22',
    titolo: 'La Guida spiega perché le prove in corso sono due numeri',
    testo:
      'Il numero di «In corso» in Prove è più alto di «Prove in corso» in Opportunità: in Prove si contano tutti i pass attivi, in Opportunità solo quelli di chi ha un’opportunità. Ora la Guida lo spiega, e descrive anche le schede «Prove in corso» e «Prove scadute» di Opportunità.',
    dove: 'Guida (Prove e Opportunità)',
  },
  {
    data: '2026-10-22',
    titolo: 'Il numero di righe in cima agli elenchi',
    testo:
      'In Prove, Rinnovi, Disdette e Debitori, sopra la tabella c’è una fascia con quante righe stai guardando, per esempio «8 prove». Prima c’era solo in Opportunità.',
    dove: 'Prove, Rinnovi, Disdette, Debitori',
  },
  {
    data: '2026-10-22',
    titolo: 'Nuova grafica in tutto il CRM',
    testo:
      'Il CRM ha un aspetto nuovo: schede, tabelle e pulsanti rifatti, in nero e rosso. È scuro di partenza. Con il pulsante col sole, in basso a sinistra, passi al tema chiaro. Funziona tutto come prima.',
    dove: 'Tutto il CRM',
  },
  {
    data: '2026-10-22',
    titolo: 'Il menu a sinistra è in categorie',
    testo:
      'Le voci sono raggruppate in Clienti, Analisi, Team e Assistenza, e ogni gruppo si apre e si chiude. In alto, sotto il logo, ci sono il tuo nome e la data.',
    dove: 'Menu a sinistra',
  },
  {
    data: '2026-10-22',
    titolo: 'Il pulsante per tornare indietro',
    testo:
      'In alto a sinistra, accanto al titolo, c’è un pulsante tondo per tornare alla pagina di prima.',
    dove: 'Tutte le pagine',
  },
  {
    data: '2026-10-22',
    titolo: 'Le spiegazioni sono nel «?»',
    testo:
      'Le frasi che spiegano una sezione o un riquadro ora si leggono passando sul «?» accanto al titolo. Così le pagine sono più libere.',
    dove: 'Abbonamenti, Marketing, Da gestire e le altre sezioni',
  },
  {
    data: '2026-10-22',
    titolo: 'La home è a schede',
    testo:
      'In «Da gestire» i numeri sono schede in alto: Non assegnati, Prove in scadenza, Rinnovi, Disdette, I miei task. Ne apri una alla volta e sotto compare il suo elenco.',
    dove: 'Da gestire',
  },
  {
    data: '2026-10-22',
    titolo: 'Nuova scheda «Non assegnati»',
    testo:
      'Mostra le opportunità e le prove che nessun consulente segue, in due elenchi. È la prima scheda e si apre da sola. Le opportunità da prendere in carico stanno qui: la scheda «Opportunità da gestire» non c’è più, perché erano le stesse. Se è aperta un’altra scheda, il numero non c’è subito: premi «Calcola».',
    dove: 'Da gestire',
  },
  {
    data: '2026-10-22',
    titolo: 'I ticket non sono più in home',
    testo:
      'I riquadri sui ticket sono spariti dalla home. Li trovi tutti in Ticket, nelle viste «Per R2D» e «Per Passion».',
    dove: 'Da gestire, Ticket',
  },
  {
    data: '2026-10-22',
    titolo: 'Prove: nuova scheda «Perse»',
    testo:
      'Fra le prove chiuse, «Perse» mostra solo quelle finite senza iscrizione.',
    dove: 'Prove',
  },
  {
    data: '2026-10-22',
    titolo: 'Un campo «Cerca» negli elenchi',
    testo:
      'In Prove, Rinnovi, Disdette, Task, Debitori e Ticket puoi scrivere un nome per trovare subito la riga. Cerca solo nella scheda che hai aperto.',
    dove: 'Prove, Rinnovi, Disdette, Task, Debitori, Ticket',
  },
  {
    data: '2026-10-22',
    titolo: 'Ticket: nomi nuovi e thread chiuso',
    testo:
      'Il «filo» ora si chiama «Thread» e si apre solo quando serve. La colonna «Socio» è diventata «Cliente», «Aperto» è diventato «Aperto da».',
    dove: 'Ticket',
  },
  {
    data: '2026-10-22',
    titolo: 'La fonte è un bollino sotto il nome',
    testo:
      'In Opportunità e in Prove, da dove arriva la persona (Meta, Sito, Tour…) si vede con un bollino sotto il nome del cliente. In Opportunità non c’è più la colonna «Tipologia».',
    dove: 'Opportunità, Prove',
  },
  {
    data: '2026-10-22',
    titolo: 'La scheda della persona è rifatta',
    testo:
      'Opportunità, Prova, Abbonamento, Rinnovo e Disdetta sono riquadri a righe, con lo storico in fondo. I task si dividono fra da fare e fatti. Prenotazioni, Accessi e Ticket stanno su una riga e si aprono con un tocco.',
    dove: 'Scheda della persona',
  },
  {
    data: '2026-10-22',
    titolo: 'Abbonamenti ridisegnato',
    testo:
      'I grafici hanno i colori del marchio. «Quanto durano» è in tre schede, una per tipo di abbonamento, con il confronto fra gli ultimi 12 mesi e i 12 prima. La tabella mese per mese ha i nomi delle colonne in alto.',
    dove: 'Abbonamenti',
  },
  {
    data: '2026-10-22',
    titolo: 'Marketing ridisegnato',
    testo:
      'Periodo, date e fonte stanno in un solo pannello. Il percorso delle opportunità è un grafico a barre, con i numeri e le percentuali di ogni passo.',
    dove: 'Marketing',
  },
  {
    data: '2026-10-22',
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
