import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import './film.css';
import Film from './Film';
import ChatFilm, { chatReady } from './chat/ChatFilm';
import LearnFilm, { learnReady } from './learn/LearnFilm';

// ?film=chat renders the chat film, ?film=learn the self-guided learning ad
// (portrait only); anything else, the product walkthrough.
const film = new URLSearchParams(location.search).get('film');
if (film === 'chat') window.__ready = chatReady;
if (film === 'learn') window.__ready = learnReady;
createRoot(document.getElementById('root')!).render(film === 'chat' ? <ChatFilm /> : film === 'learn' ? <LearnFilm /> : <Film />);
