// Il video-tutorial dell'appello (46 secondi, con le scritte, senza audio): in cima alle due pagine,
// chiuso, cosi' non allunga la pagina e non scarica niente finche' non si preme il play.
// Il sorgente del video sta in video/appello-tutorial (vedi il README).
export function VideoTutorial() {
  return (
    <details className="scheda video-tutorial">
      <summary>
        <strong>Guarda il tutorial</strong> <span className="piccolo attenuato">46 secondi · come funziona l’appello</span>
      </summary>
      <video controls playsInline preload="none" poster="/video/appello-tutorial.jpg" aria-label="Tutorial: come funziona l’appello">
        <source src="/video/appello-tutorial.mp4" type="video/mp4" />
        Il tuo browser non riproduce il video: i passaggi sono spiegati nella Guida, argomento Appello.
      </video>
    </details>
  )
}
