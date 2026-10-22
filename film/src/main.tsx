import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import './film.css';
import Film from './Film';
import ChatFilm, { chatReady } from './chat/ChatFilm';
import LearnFilm, { learnReady } from './learn/LearnFilm';
import A03Film, { a03Ready } from './learn/a03/A03Film';

// ?film=chat renders the chat film, ?film=learn the self-guided learning ad
// (portrait only); anything else, the product walkthrough.
// ?film=learn&cut=a03 is Arcatext 03, its own film after the same opener.
const q = new URLSearchParams(location.search);
const film = q.get('film');
const a03 = film === 'learn' && q.get('cut') === 'a03';
if (film === 'chat') window.__ready = chatReady;
if (film === 'learn') window.__ready = a03 ? a03Ready : learnReady;
createRoot(document.getElementById('root')!).render(film === 'chat' ? <ChatFilm /> : a03 ? <A03Film /> : film === 'learn' ? <LearnFilm /> : <Film />);
