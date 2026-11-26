// GitHub Pages serves 404.html for paths it doesn't know. Making it a copy of
// index.html lets links straight into the app (e.g. /worthy-words/lesson/3) work.
import { copyFileSync } from 'node:fs';

const dir = new URL('../dist/worthy-words/browser/', import.meta.url).pathname;
copyFileSync(`${dir}index.html`, `${dir}404.html`);
console.log('Copied index.html to 404.html');
