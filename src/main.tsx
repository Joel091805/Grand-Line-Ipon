import { render } from 'preact';
import { App } from './app';
import { getSyncService } from './store/syncService';
import './styles/index.css';

getSyncService().start();

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
