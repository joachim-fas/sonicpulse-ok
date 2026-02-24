/**
 * AudioPlayer – nicht mehr in Verwendung.
 * Die Pre-Listening-Funktion wird durch SpotifyEmbed (iframe) abgedeckt.
 * Komponente bleibt als leerer Stub erhalten um Import-Fehler zu vermeiden.
 */

interface AudioPlayerProps {
  artistId: string;
  artistName: string;
}

export default function AudioPlayer(_props: AudioPlayerProps) {
  return null;
}
