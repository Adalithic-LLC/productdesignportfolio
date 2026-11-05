import { createRoot } from 'react-dom/client';
import ArcatextKeyboard from '@/components/ArcatextKeyboard';
import '@/index.css';

/**
 * The hero's toolbar tile, drawn at the size the tile is kept at: the phone's
 * 402 x 874pt screen at 3x. `?scheme=dark` renders the dark twin.
 *
 * Rendered by tools/tile/render.mjs -- see the Arcatext stills section of
 * CLAUDE.md. The still is the one ArcatextCardStack shows beside the deck.
 */
const ES = 'Conocí a tus amigos en el banco la semana pasada.';
const REPLY = '¿Oh, de verdad?';
const KEYBOARD = { sent: [ES], received: REPLY, text: 'I can meet you there.' };

if (new URLSearchParams(location.search).get('scheme') === 'dark') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <div id="shot" style={{ width: 1206, height: 2622, overflow: 'hidden' }}>
    <ArcatextKeyboard bare still={KEYBOARD} scale={3} />
  </div>
);
