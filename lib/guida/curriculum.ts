import type { Argomento } from '.'

export const curriculum: Argomento = {
  chiave: 'curriculum',
  titolo: 'Curriculum',
  sezione: 'curriculum',
  inBreve: 'Le candidature del modulo «Inviaci il tuo CV» del sito: le risposte e il curriculum allegato, per posizione.',
  testo: `
## Da dove arrivano
Dal modulo **«Lavora con noi»** del sito (il pulsante «Inviaci il tuo CV» in fondo a ogni pagina). Chi si candida risponde a sei domande, **tutte obbligatorie**, e allega il curriculum:

- nome e cognome, email, cellulare;
- data di nascita;
- la posizione per cui si candida: **istruttore fitness**, **istruttore sala pesi** o **receptionist**;
- il curriculum, in **JPEG, DNG, PDF o Word**, fino a 10 MB.

Arrivano da sole, non si inserisce niente a mano.

## Leggerle
In [Curriculum](/dashboard/curriculum) trovi una riga per candidatura, dalla più recente: chi è, come contattarlo (telefono e email si toccano per chiamare o scrivere), la posizione, la data di nascita con gli anni, e il curriculum. Le schede in alto filtrano per posizione.

Il **nome del file** apre il curriculum in una scheda nuova (i Word e i DNG si scaricano). Il link dura un'ora: se non funziona più, ricarica la pagina.

## Chi le vede
Sono dati personali, quindi la sezione **non è attiva per tutti**: la vedono gli admin, e i consulenti a cui la si spunta da [Utenti](/dashboard/utenti). Chi non ha la sezione non può aprire i curriculum nemmeno con un link.
`,
}
