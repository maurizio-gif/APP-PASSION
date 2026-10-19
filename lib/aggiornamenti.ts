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
