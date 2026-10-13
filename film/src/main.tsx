import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import './film.css';
import Film from './Film';

createRoot(document.getElementById('root')!).render(<Film />);
