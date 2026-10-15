import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import './film.css';
import Film from './Film';
import ChatFilm, { chatReady } from './chat/ChatFilm';

// ?film=chat renders the chat film; anything else, the product walkthrough.
const chat = new URLSearchParams(location.search).get('film') === 'chat';
if (chat) window.__ready = chatReady;
createRoot(document.getElementById('root')!).render(chat ? <ChatFilm /> : <Film />);
