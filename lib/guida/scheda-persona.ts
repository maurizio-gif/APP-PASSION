import type { Argomento } from '.'

export const schedaPersona: Argomento = {
  chiave: 'scheda-persona',
  titolo: 'La scheda persona',
  sezione: null,
  inBreve: 'Tutto su una persona in una pagina: i dati di PerfectGym, il certificato, gli accessi, e il lavoro aperto del CRM da gestire sul posto.',
  testo: `
## Come ci si arriva
Dal nome, in qualunque elenco del CRM, o con la **ricerca** in cima al menu: nome, cognome, telefono o email (almeno due lettere; ogni parola deve comparire). Il numero di telefono si trova anche scritto in modo diverso. Il numero di socio di PerfectGym e il codice fiscale non si cercano. Se non trovi la persona ed è nuova, crea un lead da **«+ Nuovo lead»**.

## In cima
Nome, telefono, email, **«Apri su PerfectGym ↗»** e il **certificato medico**:

- **Certificato medico attivo**, con la scadenza;
- **Certificato medico scaduto**, con il giorno;
- **Certificato medico non presente**: su PerfectGym la scadenza non c'è.

Conta solo il certificato definitivo, non il temporaneo.

## I dati di PerfectGym
Si leggono da PerfectGym e **si cambiano su PerfectGym**, non qui:

- **Su PerfectGym**: numero di socio, tipo, codice fiscale, data di nascita, **saldo** (in rosso se negativo);
- **Abbonamenti**: quello in corso (stato, firma, inizio, fine, disdetta, canone, giorno di addebito, rinnovo automatico); gli altri in **«Storico abbonamenti»**;
- **Ultimi accessi**: gli ultimi 10, con entrata e uscita, e quanti negli ultimi 30 giorni;
- **Prenotazioni**: le ultime 10: presente, assente, annullata, prenotata, in lista d'attesa.

Sul telefono questi riquadri stanno in fondo alla pagina.

## Il lavoro del CRM
Ogni cosa aperta sulla persona ha il suo riquadro, e si gestisce sul posto:

- **Lead**: fonte, da quando, chi lo segue, l'invio a PerfectGym; **«Prendo in carico»**, **«Assegna»**, **«Persa»** (vedi [Lead](/dashboard/guida/lead));
- **Prova**: il pass e le date, chi la segue, l'obiezione; **«Salva la prova»** (vedi [Prove](/dashboard/guida/prove));
- **Rinnovo**: **«Prendo in carico»**, **«Assegna»** e **«Rimetti da assegnare»** come per i lead; poi esito e note, **«Salva il rinnovo»** (vedi [Rinnovi](/dashboard/guida/rinnovi));
- **Disdetta**: **«Prendo in carico»**, **«Assegna»** e **«Rimetti da assegnare»** come per i lead; poi contatto, esito, motivo e note, **«Salva la disdetta»** (vedi [Disdette](/dashboard/guida/disdette));
- **Task**: prima la storia, poi il nuovo task, da programmare o già fatto (vedi [Task](/dashboard/guida/task));
- **Ticket**: **«+ Apri un ticket»**, che si porta dietro la situazione del socio (vedi [Ticket](/dashboard/guida/ticket)).

Rinnovo e disdetta si modificano qui solo se hai anche la loro sezione, e se sono tuoi o di nessuno (o sei admin, o hai **«Lead degli altri»**); altrimenti si leggono.

## Riapri
Lead, prova, rinnovo e disdetta chiusi con un esito non si modificano: si leggono. Per cambiarli, **«Riapri»**: prima compare l'avviso (riaprendo si toglie l'esito e la storia cambia), poi **«Sì, riapri»**. Note, motivo e chi lo segue restano com'erano.
`,
}
