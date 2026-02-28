import { searchMusicBrainzArtist } from './server/musicbrainz';

async function main() {
  try {
    console.log('Testing MusicBrainz for C.O.F.F.I.N...');
    const result = await searchMusicBrainzArtist('C.O.F.F.I.N');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
