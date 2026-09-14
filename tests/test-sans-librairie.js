/*
  Parcours du débutant : la page est ouverte SANS xlsx.full.min.js à côté.
  Il désigne le fichier depuis le bandeau rouge, puis enregistre la page
  tout-en-un — et celle-ci doit fonctionner seule, sans fichier voisin.

    npm install playwright xlsx
    node tests/test-sans-librairie.js
*/
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');

const dir = path.join(__dirname, '.tmp', 'sans-lib');
const DEBUT = '<!-- DEBUT chargement de la librairie -->';
const FIN = '<!-- FIN chargement de la librairie -->';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.csv': 'text/csv', '.xlsx': 'application/octet-stream' };
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

function serve(root) {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(root, path.basename(name));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('absent'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'tableur.html'), path.join(dir, 'index.html'));
  execFileSync(process.execPath, [path.join(__dirname, 'mkdata.js'), dir], { stdio: 'inherit' });
  const lib = process.env.XLSX_LIB || path.join(path.dirname(require.resolve('xlsx')), 'dist', 'xlsx.full.min.js');
  // volontairement : la librairie n'est PAS copiée à côté de la page

  const server = await serve(dir);
  const SITE = 'http://127.0.0.1:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGE ERROR: ' + e.message); });
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.message().slice(0, 60)); await d.accept(); });

  console.log('\n== 1. page ouverte sans la librairie ==');
  await page.goto(SITE);
  check('bandeau rouge affiche', await page.isVisible('#libBanner'));
  const texte = await page.textContent('#libText');
  check('le bandeau nomme la page ouverte', /tableur\.html/.test(texte), texte);
  check('le bandeau cite la voie la plus simple', /tableur-autonome\.html/.test(texte), texte);
  check('le bandeau dit quoi faire', /indiquez le fichier/.test(texte), texte);
  check('bouton de selection propose', await page.isVisible('#pickLibBtn'));
  check('la librairie est bien absente', await page.evaluate(() => typeof XLSX === 'undefined'));

  console.log('\n== 2. l utilisateur designe le fichier ==');
  await page.setInputFiles('#libUpload', lib);
  await page.waitForFunction(() => typeof XLSX !== 'undefined' && !!XLSX.utils, null, { timeout: 15000 });
  check('librairie chargee sans rien installer', await page.evaluate(() => xlsxReady()));
  check('bandeau rouge referme', !(await page.isVisible('#libBanner')));
  check('proposition d enregistrer la page tout-en-un', await page.isVisible('#libOkBanner'));

  console.log('\n== 3. import Excel dans la foulee ==');
  await page.setInputFiles('#fileUpload', path.join(dir, 'clients.xlsx'));
  await page.waitForFunction(() => typeof sheets === 'object' && Object.keys(sheets).length > 0, null, { timeout: 15000 });
  const etat = await page.evaluate(() => ({
    feuilles: Object.keys(sheets),
    cp: sheets['Clients'].rows[0]['Code postal']
  }));
  check('classeur importe', etat.feuilles.join(',') === 'Clients,Produits', etat.feuilles);
  check('zero initial conserve', etat.cp === '01234', etat.cp);

  console.log('\n== 4. enregistrement de la page tout-en-un ==');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#saveStandaloneBtn')
  ]);
  check('nom du fichier propose', download.suggestedFilename() === 'tableur-autonome.html', download.suggestedFilename());
  const autonome = path.join(dir, 'autonome.html');
  await download.saveAs(autonome);
  const contenu = fs.readFileSync(autonome, 'utf8');
  const taille = fs.statSync(autonome).size;
  console.log('  taille : ' + Math.round(taille / 1024) + ' Ko');
  check('la librairie est dedans', /window\.__xlsxInline = true/.test(contenu) && taille > 700 * 1024, taille);
  check('plus aucune balise src=xlsx', !/src="xlsx\.full\.min\.js"/.test(contenu));
  // seule compte l'absence de chargement exterieur : l'adresse de telechargement
  // reste citee dans un message d'aide, ce qui n'a rien d'une requete
  const sansCommentaires = contenu.replace(/<!--[\s\S]*?-->/g, '');
  check('aucun script charge de l exterieur', !/<script[^>]+src\s*=\s*["']?(https?:)?\/\//i.test(sansCommentaires),
    (sansCommentaires.match(/<script[^>]+src[^>]*>/gi) || []).slice(0, 3));

  console.log('\n== 5. la page enregistree fonctionne seule ==');
  const seul = path.join(dir, 'seul');
  fs.mkdirSync(seul, { recursive: true });
  fs.copyFileSync(autonome, path.join(seul, 'index.html'));
  fs.copyFileSync(path.join(dir, 'clients.xlsx'), path.join(seul, 'clients.xlsx'));
  const server2 = await serve(seul);
  const SITE2 = 'http://127.0.0.1:' + server2.address().port + '/index.html';
  const page2 = await ctx.newPage();
  const requetes = [];
  page2.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:' + server2.address().port)) requetes.push(r.url()); });
  page2.on('pageerror', e => { fail++; console.log('  PAGE ERROR (autonome): ' + e.message); });
  page2.on('dialog', async d => { await d.accept(); });
  await page2.goto(SITE2);
  check('aucun bandeau de librairie manquante', !(await page2.isVisible('#libBanner')));
  await page2.setInputFiles('#fileUpload', path.join(seul, 'clients.xlsx'));
  await page2.waitForFunction(() => typeof sheets === 'object' && Object.keys(sheets).length > 0, null, { timeout: 15000 });
  const etat2 = await page2.evaluate(() => ({
    feuilles: Object.keys(sheets),
    cp: sheets['Clients'].rows[0]['Code postal'],
    version: XLSX.version,
    inline: window.__xlsxInline
  }));
  check('import Excel sans fichier voisin', etat2.feuilles.join(',') === 'Clients,Produits', etat2.feuilles);
  check('valeurs intactes', etat2.cp === '01234', etat2.cp);
  check('page reconnue comme tout-en-un', etat2.inline === true, etat2.inline);
  console.log('  SheetJS ' + etat2.version);
  check('aucune requete exterieure', requetes.length === 0, requetes);

  console.log('\n== 6. la page tout-en-un livree est a jour ==');
  const hors = t => {
    const a = t.indexOf(DEBUT), b = t.indexOf(FIN);
    return (a < 0 || b < 0) ? null : t.slice(0, a) + t.slice(b + FIN.length);
  };
  const livree = path.join(__dirname, '..', 'tableur-autonome.html');
  if (!fs.existsSync(livree)) {
    check('tableur-autonome.html present dans le depot', false, 'absent');
  } else {
    const a = hors(fs.readFileSync(path.join(__dirname, '..', 'tableur.html'), 'utf8'));
    const b = hors(fs.readFileSync(livree, 'utf8'));
    check('tableur-autonome.html suit tableur.html (sinon : node outils/integrer-xlsx.js)', a !== null && a === b,
      a === b ? 'identique' : 'la page livree est en retard sur la source');
  }

  console.log('\n== 7. la fabrication du navigateur et celle de l outil coincident ==');
  // Ce qui doit coincider, c'est le bloc injecte entre les deux reperes : c'est
  // lui que les trois implementations (page, .js, .ps1) produisent. Le reste du
  // fichier vient de la meme source, mais le navigateur reserialise le document
  // (attributs booleens, entites, sauts de ligne), donc l'octet a octet n'y a
  // pas de sens.
  const bloc = t => {
    const a = t.indexOf(DEBUT), b = t.indexOf(FIN);
    return (a < 0 || b < 0) ? null : t.slice(a, b + FIN.length).replace(/\/\* Librairie SheetJS[\s\S]*?\*\//, '');
  };
  if (fs.existsSync(livree)) {
    const parNavigateur = bloc(contenu);
    const parOutil = bloc(fs.readFileSync(livree, 'utf8'));
    check('le bouton de la page injecte exactement ce qu injecte outils/integrer-xlsx.js',
      parNavigateur !== null && parNavigateur === parOutil,
      parNavigateur === parOutil ? 'identique' : 'ecart de ' +
        Math.abs((parNavigateur || '').length - (parOutil || '').length) + ' caracteres');
  }

  console.log('\n' + pass + ' verifications ok, ' + fail + ' echecs');
  await browser.close();
  server.close(); server2.close();
  process.exit(fail ? 1 : 0);
})();
