# Video tutorial dell'appello

Il video «Appello istruttore» che si vede in cima alle pagine **Appello istruttore** e
**Appello complessivo** (46 secondi, 1920×1080, senza audio: le scritte sono nel video).
Il file pubblicato sta in `public/video/appello-tutorial.mp4`, la copertina in
`public/video/appello-tutorial.jpg`.

È una composizione [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP): `index.html`
monta una scena per file in `compositions/` (`s0` gancio, `s1` le tue lezioni, `s2` la finestra
di 59 minuti, `s3` il tornello, `s4` un tocco, `s5` i segnali, `s6` chiusura, `overlay` marchio e barra).
Il testo e i tempi sono dentro ogni scena. Quando l'appello cambia (orari, segnali, parole), si corregge
la scena e si rifà il video.

Per rifarlo (serve ffmpeg):

```bash
cd video/appello-tutorial
npx hyperframes check
npx hyperframes render --fps 30 --crf 24 -o /tmp/appello.mp4
ffmpeg -i /tmp/appello.mp4 -c copy -movflags +faststart ../../public/video/appello-tutorial.mp4
ffmpeg -ss 25 -i ../../public/video/appello-tutorial.mp4 -frames:v 1 -q:v 3 ../../public/video/appello-tutorial.jpg
```
