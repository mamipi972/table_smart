const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFileSync } = require('child_process');

const dir = path.join(__dirname, '.tmp', 'site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.csv': 'text/csv', '.xlsx': 'application/octet-stream' };

// La page est servie en http : Chromium refuse localStorage sur file://
function serve() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(dir, path.basename(name));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('absent'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// TABLEUR=chemin/page.html permet d'essayer une autre page, par exemple celle
// fabriquee par outils/integrer-xlsx.js, qui embarque deja la librairie.
function prepare() {
  const page = path.resolve(process.env.TABLEUR || path.join(__dirname, '..', 'tableur.html'));
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(page, path.join(dir, 'index.html'));
  const libVoisine = path.join(dir, 'xlsx.full.min.js');
  // la page source charge la librairie par une balise src ; la page fabriquee non
  const integree = !/src="xlsx\.full\.min\.js"/.test(fs.readFileSync(page, 'utf8'));
  if (integree) { if (fs.existsSync(libVoisine)) fs.unlinkSync(libVoisine); }
  // XLSX_LIB=chemin/xlsx.full.min.js essaie la page avec une autre version de SheetJS
  else fs.copyFileSync(process.env.XLSX_LIB || path.join(path.dirname(require.resolve('xlsx')), 'dist', 'xlsx.full.min.js'), libVoisine);
  execFileSync(process.execPath, [path.join(__dirname, 'mkdata.js'), dir], { stdio: 'inherit' });
  console.log('page essayee : ' + page + (integree ? ' (librairie integree)' : ' (librairie voisine)'));
}
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

(async () => {
  prepare();
  const server = await serve();
  const SITE = 'http://127.0.0.1:' + server.address().port + '/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => { fail++; console.log('  PAGE ERROR: ' + e.message); });
  page.on('console', m => { if (m.type() === 'error') console.log('  console.error: ' + m.text()); });
  // les confirm()/alert() sont acceptes par defaut
  const dialogs = [];
  page.on('dialog', async d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 80)); await d.accept(); });

  await page.goto(SITE);

  console.log('\n== A. import xlsx, typage et valeurs ==');
  await page.setInputFiles('#fileUpload', path.join(dir, 'clients.xlsx'));
  await page.waitForFunction(() => typeof sheets === 'object' && Object.keys(sheets).length > 0);
  const a = await page.evaluate(() => ({
    sheetNames: Object.keys(sheets),
    cols: sheets['Clients'].columns.map(c => c.key + ':' + c.type + (c.guard ? '(' + c.guard + ')' : '')),
    row0: sheets['Clients'].rows[0],
    note: document.getElementById('noteBanner').style.display,
    noteText: document.getElementById('noteText').textContent,
    lsKeys: Object.keys(localStorage),
    label: document.getElementById('fileName').textContent,
    title: document.getElementById('fileName').title
  }));
  console.log('  colonnes:', a.cols.join(' | '));
  check('deux feuilles importees', a.sheetNames.join(',') === 'Clients,Produits', a.sheetNames);
  check('code postal garde en texte', a.cols.includes('Code postal:text(zéro initial)'), a.cols);
  check('code postal conserve 01234', a.row0['Code postal'] === '01234', a.row0['Code postal']);
  check('telephone conserve 0612345678', a.row0['Telephone'] === '0612345678', a.row0['Telephone']);
  check('identifiant long garde en texte', a.cols.some(c => c.startsWith('Identifiant:text')), a.cols);
  check('CP sans zero initial garde en texte grace a son intitule',
    a.cols.includes('CP livraison:text(intitulé de code)'), a.cols);
  check('dates typees date', a.cols.includes('Date de debut:date') && a.cols.includes('Date de fin:date'), a.cols);
  check('date convertie en ISO', a.row0['Date de debut'] === '2025-01-10', a.row0['Date de debut']);
  check('montant numerique', a.cols.includes('Montant:number'), a.cols);
  check('colonne __proto__ renommee et conservee', a.row0['proto_'] === 'x1', Object.keys(a.row0));
  check('bandeau de compte rendu affiche', a.note === 'flex', a.note);
  check('compte rendu mentionne la protection', /texte/.test(a.noteText), a.noteText);
  check('identite du document affichee', /clients\.xlsx/.test(a.title) && /modifié/.test(a.title), a.title);

  await page.waitForTimeout(700);
  const keys = await page.evaluate(() => Object.keys(localStorage));
  check('sauvegarde indexee sur le fichier', keys.some(k => k.startsWith('tableur.session.v4::') && k.includes('clients.xlsx')), keys);

  console.log('\n== B. import suivant : confirmation, puis annulation ==');
  await page.setInputFiles('#fileUpload', path.join(dir, 'autre.xlsx'));
  await page.waitForSelector('#importDialog[open]');
  check('la modale de confirmation s ouvre', await page.isVisible('#importDialog'));
  const summary = await page.textContent('#importSummary');
  check('le resume cite les deux cotes', /autre\.xlsx/.test(summary) && /Session en cours/.test(summary), summary);
  await page.click('#impReplace');
  await page.waitForTimeout(800);   // laisse la sauvegarde du nouveau document se faire
  let st = await page.evaluate(() => ({ names: Object.keys(sheets), undo: document.getElementById('undoBtn').disabled }));
  check('remplacement effectif', st.names.join(',') === 'Stock', st.names);
  check('annulation disponible apres import', st.undo === false, st.undo);
  await page.click('#undoBtn');
  await page.waitForTimeout(200);
  st = await page.evaluate(() => ({ names: Object.keys(sheets), label: document.getElementById('fileName').textContent, keys: Object.keys(localStorage) }));
  check('Ctrl+Z restaure la session precedente', st.names.join(',') === 'Clients,Produits', st.names);
  check('le libelle du document revient', /clients\.xlsx/.test(st.label), st.label);
  check('la sauvegarde de autre.xlsx est distincte', st.keys.filter(k => k.startsWith('tableur.session.v4::')).length === 2, st.keys);

  console.log('\n== C. popin + Colonne : calculs proposes ==');
  await page.selectOption('#sheetSelect', 'Clients');
  await page.click('#addColumn');
  await page.waitForSelector('#columnDialog[open]');
  const suggestions = await page.$$eval('#colSuggestions .sugg-main h4', ns => ns.map(n => n.textContent));
  console.log('  ' + suggestions.join(' / '));
  check('duree entre deux dates proposee', suggestions.some(t => /Jours entre Date de debut et Date de fin/.test(t)), suggestions);
  check('duree en annees proposee (ecart > 1 an)', suggestions.some(t => /^Années entre/.test(t)), suggestions);
  check('extraction de l annee proposee', suggestions.some(t => /^Année de/.test(t)), suggestions);
  check('domaine e-mail propose', suggestions.some(t => /Domaine de Email/.test(t)), suggestions);
  const previews = await page.$$eval('#colSuggestions .preview', ns => ns.map(n => n.textContent));
  check('les apercus sont calcules', previews[0].includes('ligne 1'), previews[0]);
  const formulesVues = await page.$$eval('#colSuggestions .formule', ns => ns.map(n => n.textContent));
  check('la formule est rappelee dans le descriptif',
    formulesVues.length > 0 && /Formule, pour la ligne 2 : =/.test(formulesVues[0]), formulesVues[0]);
  const idx = suggestions.findIndex(t => /Jours entre Date de debut et Date de fin/.test(t));
  if (idx < 0) { check('suggestion de duree cliquable', false, suggestions); }
  else { await page.$$eval('#colSuggestions .sugg-actions button', (bs, i) => bs[i].click(), idx); }
  await page.waitForTimeout(200);
  const calc = await page.evaluate(() => {
    const sh = sheets['Clients'];
    const col = sh.columns.find(c => c.formula);
    return { key: col && col.key, type: col && col.type, values: sh.rows.map(r => r[col.key]) };
  });
  check('colonne calculee ajoutee', !!calc.key, calc);
  check('jours entre 10/01/2025 et 15/03/2025 = 64', calc.values[0] === 64, calc.values);
  // la colonne se recalcule quand une source change
  await page.evaluate(() => {
    const sh = sheets['Clients'];
    mutate('edit', 'test', () => { sh.rows[0]['Date de fin'] = '2025-01-20'; });
  });
  const recalc = await page.evaluate(() => {
    const sh = sheets['Clients'];
    const col = sh.columns.find(c => c.formula);
    return sh.rows[0][col.key];
  });
  check('recalcul automatique apres modification', recalc === 10, recalc);

  console.log('\n== D. popin + Feuille : regroupements proposes ==');
  await page.click('#addSheet');
  await page.waitForSelector('#sheetDialog[open]');
  const sugg2 = await page.$$eval('#sheetSuggestions .sugg-main h4', ns => ns.map(n => n.textContent));
  console.log('  ' + sugg2.join(' / '));
  check('separation par Ville proposee', sugg2.some(t => /Une feuille par valeur de « Ville »/.test(t)), sugg2);
  check('synthese par Ville proposee', sugg2.some(t => /Synthèse par « Ville »/.test(t)), sugg2);
  const iVille = sugg2.findIndex(t => /Une feuille par valeur de « Ville »/.test(t));
  if (iVille < 0) { check('separation par Ville cliquable', false, sugg2); }
  else { await page.$$eval('#sheetSuggestions .sugg-actions button', (bs, i) => bs[i].click(), iVille); }
  await page.waitForTimeout(200);
  const split = await page.evaluate(() => {
    const out = {};
    Object.keys(sheets).forEach(n => { out[n] = sheets[n].rows.length; });
    return out;
  });
  console.log('  ' + JSON.stringify(split));
  check('une feuille par ville', split['Clients — Paris'] === 2 && split['Clients — Lyon'] === 2 && split['Clients — Nantes'] === 1, split);
  check('la feuille source est conservee', split['Clients'] === 5, split);

  console.log('\n== E. synthese ==');
  await page.selectOption('#sheetSelect', 'Clients');
  await page.click('#addSheet');
  await page.waitForSelector('#sheetDialog[open]');
  const sugg3 = await page.$$eval('#sheetSuggestions .sugg-main h4', ns => ns.map(n => n.textContent));
  const iSynth = sugg3.findIndex(t => /Synthèse par « Ville »/.test(t));
  if (iSynth >= 0) {
    await page.$$eval('#sheetSuggestions .sugg-actions button', (bs, i) => bs[i].click(), iSynth);
    await page.waitForTimeout(200);
    const synth = await page.evaluate(() => {
      const name = Object.keys(sheets).find(n => n.startsWith('Synthèse'));
      return { name: name, cols: sheets[name].columns.map(c => c.key), rows: sheets[name].rows };
    });
    console.log('  ' + JSON.stringify(synth.cols));
    check('synthese avec comptage et sommes', synth.cols.includes('Nombre de lignes') && synth.cols.some(c => /^Somme de /.test(c)), synth.cols);
    check('comptage correct', synth.rows[0]['Nombre de lignes'] === 2, synth.rows[0]);
  } else { check('synthese par Ville proposee (2e passage)', false, sugg3); await page.click('#closeSheetBtn'); }

  console.log('\n== F. CSV : injection de formule, latin-1, noms de fichier ==');
  await page.setInputFiles('#fileUpload', path.join(dir, 'latin1.csv'));
  await page.waitForSelector('#importDialog[open]');
  await page.click('#impMerge');
  await page.waitForTimeout(200);
  const csvState = await page.evaluate(() => {
    const name = Object.keys(sheets).find(n => n === 'latin1');
    return {
      name: name,
      row0: sheets[name].rows[0],
      cols: sheets[name].columns.map(c => c.key + ':' + c.type),
      note: document.getElementById('noteText').textContent,
      csv: sheetToCsv(name)
    };
  });
  console.log('  ' + JSON.stringify(csvState.row0) + '\n  csv: ' + JSON.stringify(csvState.csv));
  check('accents latin-1 restitues', csvState.row0['Nom'] === 'Crème brûlée', csvState.row0['Nom']);
  check('encodage signale', /Windows-1252/.test(csvState.note), csvState.note);
  check('zero initial conserve en CSV', csvState.row0['CP'] === '01234', csvState.row0['CP']);
  check('formule neutralisee a l export', csvState.csv.includes("'=SUM(A1:A9)"), csvState.csv);
  check('BOM UTF-8 present', csvState.csv.charCodeAt(0) === 0xFEFF, csvState.csv.charCodeAt(0));

  console.log('\n== G. noms de feuille a l export ==');
  const names = await page.evaluate(() => {
    sheets['A'.repeat(29) + ' version 1'] = { columns: [{ key: 'x', type: 'text' }], rows: [{ x: 1 }] };
    sheets['A'.repeat(29) + ' version 2'] = { columns: [{ key: 'x', type: 'text' }], rows: [{ x: 2 }] };
    sheets['Ventes/2025'] = { columns: [{ key: 'x', type: 'text' }], rows: [{ x: 3 }] };
    sheets['Ventes_2025'] = { columns: [{ key: 'x', type: 'text' }], rows: [{ x: 4 }] };
    const wb = buildWorkbook();
    return wb.SheetNames;
  });
  console.log('  ' + JSON.stringify(names.slice(-4)));
  check('noms tronques rendus uniques', new Set(names.map(n => n.toLowerCase())).size === names.length, names);
  check('tous les noms font 31 caracteres au plus', names.every(n => n.length <= 31), names);

  console.log('\n== H. colonnes hors schema recuperees a l export ==');
  const extra = await page.evaluate(() => {
    sheets['Clients'].rows[0]['ColonneOrpheline'] = 'valeur perdue';
    reconcileAll();
    return sheets['Clients'].columns.map(c => c.key).includes('ColonneOrpheline');
  });
  check('colonne orpheline reintegree au schema', extra === true, extra);

  console.log('\n== I. quota localStorage ==');
  const quota = await page.evaluate(() => {
    const real = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
    try { saveLocal(); } finally { localStorage.setItem = real; }
    return {
      banner: document.getElementById('storageBanner').style.display,
      text: document.getElementById('storageText').textContent,
      dot: document.getElementById('lsDot').className,
      status: document.getElementById('lsText').textContent
    };
  });
  check('bandeau rouge affiche au quota', quota.banner === 'flex', quota);
  check('statut explicite', /NON ENREGISTRÉ/.test(quota.status), quota.status);
  check('pastille rouge', /fail/.test(quota.dot), quota.dot);

  console.log('\n== J. second onglet sur le meme document ==');
  const page2 = await ctx.newPage();
  page2.on('dialog', async d => { await d.accept(); });
  await page2.goto(SITE);
  await page2.setInputFiles('#fileUpload', path.join(dir, 'clients.xlsx'));
  await page2.waitForTimeout(400);
  const tab = await page2.evaluate(() => ({
    banner: document.getElementById('tabBanner').style.display,
    text: document.getElementById('tabText').textContent,
    off: typeof autosaveOff !== 'undefined' ? autosaveOff : null
  }));
  check('onglet concurrent detecte', tab.banner === 'flex', tab);
  check('sauvegarde auto suspendue dans le second onglet', tab.off === true, tab.off);
  check('message explicite', /autre onglet/.test(tab.text), tab.text);

  console.log('\n== K. garde-fou de fermeture ==');
  const guard = await page.evaluate(() => {
    scheduleSave();
    const before = { dirtyLocal: dirtyLocal, dirtyFile: dirtyFile };
    let prevented = false;
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    prevented = ev.defaultPrevented;
    return { before: before, prevented: prevented };
  });
  check('fermeture avec ecriture en attente : avertissement', guard.prevented === true, guard);

  console.log('\n== L. sessions enregistrees ==');
  await page.click('#openSessions');
  await page.waitForSelector('#sessionsDialog[open]');
  const rows = await page.$$eval('#sessionsBody tr td:first-child', ns => ns.map(n => n.textContent));
  console.log('  ' + JSON.stringify(rows));
  check('les deux documents sont listes separement', rows.length >= 2, rows);
  check('la taille distingue deux fichiers homonymes', rows.every(r => /Ko|o$|o /.test(r)), rows);
  await page.click('#closeSessionsBtn');

  console.log('\n== N. fichier reduit a sa ligne d en-tetes ==');
  await page.setInputFiles('#fileUpload', path.join(dir, 'entetes-seules.csv'));
  await page.waitForSelector('#importDialog[open]');
  await page.click('#impMerge');
  await page.waitForTimeout(200);
  const entetes = await page.evaluate(() => {
    const sh = sheets['entetes-seules'];
    return sh ? { cols: sh.columns.map(c => c.key), lignes: sh.rows.length } : null;
  });
  console.log('  ' + JSON.stringify(entetes));
  check('les en-tetes deviennent des colonnes meme sans donnees',
    !!entetes && entetes.cols.join(',') === 'Nom,Ville,Montant' && entetes.lignes === 0, entetes);

  console.log('\n== O. mois en lettres, rangs, repartition ==');
  await page.selectOption('#sheetSelect', 'Clients');
  await page.click('#addColumn');
  await page.waitForSelector('#columnDialog[open]');
  const sugg4 = await page.$$eval('#colSuggestions .sugg-main h4', ns => ns.map(n => n.textContent));
  console.log('  ' + sugg4.join(' / '));
  check('mois en lettres propose', sugg4.some(t => /Mois de Date de debut en lettres/.test(t)), sugg4);
  check('mois et annee en lettres proposes', sugg4.some(t => /Mois et année de Date de debut en lettres/.test(t)), sugg4);
  check('rang propose', sugg4.some(t => /^Rang selon Montant$/.test(t)), sugg4);
  check('rang par groupe propose', sugg4.some(t => /Rang selon Montant par Ville/.test(t)), sugg4);
  check('repartition en % proposee', sugg4.some(t => /Répartition en % de Montant/.test(t)), sugg4);

  const iMois = sugg4.findIndex(t => /Mois de Date de debut en lettres/.test(t));
  if (iMois < 0) { check('mois en lettres cliquable', false, sugg4); }
  else { await page.$$eval('#colSuggestions .sugg-actions button', (bs, i) => bs[i].click(), iMois); }
  await page.waitForTimeout(200);
  const mois = await page.evaluate(() => {
    const sh = sheets['Clients'];
    const col = sh.columns.find(c => c.formula && c.formula.op === 'moisLettres');
    return col ? sh.rows.map(r => r[col.key]) : null;
  });
  console.log('  ' + JSON.stringify(mois));
  check('mois ecrits en toutes lettres', !!mois && mois[0] === 'janvier' && mois[2] === 'mai', mois);

  const rangs = await page.evaluate(() => {
    const sh = sheets['Clients'];
    const cle = addColumn('Rang', 'number', sh.columns.length - 1, { op: 'rang', args: { a: 'Montant' } });
    const cle2 = addColumn('Rang ville', 'number', sh.columns.length - 1, { op: 'rangParGroupe', args: { a: 'Montant', b: 'Ville' } });
    const part = addColumn('Part', 'number', sh.columns.length - 1, { op: 'partDuTotal', args: { a: 'Montant' } });
    return {
      montants: sh.rows.map(r => r['Montant']),
      rang: sh.rows.map(r => r[cle]),
      rangVille: sh.rows.map(r => r[cle2]),
      part: sh.rows.map(r => r[part])
    };
  });
  console.log('  ' + JSON.stringify(rangs));
  // montants : 120.5, 80, 240, 15.75, 999.99
  check('rang decroissant sur toute la feuille', rangs.rang.join(',') === '3,4,2,5,1', rangs.rang);
  // Paris : 240 puis 120.5 ; Lyon : 80 puis 15.75 ; Nantes : 999.99 seul
  check('rang reparti par ville', rangs.rangVille.join(',') === '2,1,1,2,1', rangs.rangVille);
  check('repartition en % qui totalise 100', Math.abs(rangs.part.reduce((t, n) => t + n, 0) - 100) < 0.2, rangs.part);

  console.log('\n== P. nettoyage des espaces ==');
  const avant = await page.evaluate(() => ({
    banniere: document.getElementById('cleanBanner').style.display,
    texte: document.getElementById('cleanText').textContent,
    villes: sheets['Clients'].rows.map(r => r['Ville brute'])
  }));
  console.log('  ' + JSON.stringify(avant.villes));
  check('les espaces superflus sont reperes tout seuls', avant.banniere === 'flex', avant.banniere);
  check('le bandeau dit combien de cellules', /cellule\(s\) portent des espaces superflus/.test(avant.texte), avant.texte);
  await page.click('#cleanBtn');
  await page.click('#cleanRunBtn');
  await page.waitForTimeout(200);
  const apres = await page.evaluate(() => ({
    villes: sheets['Clients'].rows.map(r => r['Ville brute']),
    banniere: document.getElementById('cleanBanner').style.display
  }));
  console.log('  ' + JSON.stringify(apres.villes));
  check('espaces de bord supprimes', apres.villes[0] === 'Paris' && apres.villes[3] === 'Lyon' && apres.villes[4] === 'Nantes', apres.villes);
  check('espaces doubles ramenes a un seul', apres.villes[1] === 'Lyon Centre', apres.villes[1]);
  check('bandeau referme apres nettoyage', apres.banniere === 'none', apres.banniere);
  await page.click('#undoBtn');
  await page.waitForTimeout(200);
  const annule = await page.evaluate(() => sheets['Clients'].rows.map(r => r['Ville brute']));
  check('nettoyage annulable par Ctrl+Z', annule[0] === '  Paris ' && annule[1] === 'Lyon  Centre', annule);

  console.log('\n== Q. formules conservees a l export ==');
  const formules = await page.evaluate(() => {
    const sh = sheets['Clients'];
    // trois calculs aux formes differentes : soustraction, fonction, plage figee
    addColumn('Duree', 'number', sh.columns.length - 1, { op: 'joursEntre', args: { a: 'Date de debut', b: 'Date de fin' } });
    addColumn('Annee fin', 'number', sh.columns.length - 1, { op: 'anneeDe', args: { a: 'Date de fin' } });
    addColumn('Poids', 'number', sh.columns.length - 1, { op: 'partDuTotal', args: { a: 'Montant' } });
    const lire = format => {
      const buf = XLSX.write(buildWorkbook(), { bookType: format, type: 'array' });
      const relu = XLSX.read(buf, { type: 'array', cellFormula: true });
      const ws = relu.Sheets[Object.keys(relu.Sheets)[0]];
      const out = {};
      Object.keys(ws).forEach(ref => { if (ws[ref] && ws[ref].f) out[ref] = ws[ref].f; });
      return out;
    };
    const col = k => sh.columns.findIndex(c => c.key === k);
    const lettre = i => { let s = '', n = i; while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } return s; };
    return {
      xlsx: lire('xlsx'),
      ods: lire('ods'),
      refDuree: lettre(col('Duree')) + '2',
      refAnnee: lettre(col('Annee fin')) + '2',
      refPoids: lettre(col('Poids')) + '2',
      affichee: formuleAffichee(sh, sh.columns.find(c => c.key === 'Duree'), 2),
      sansFormules: (() => {
        document.getElementById('keepFormulas').checked = false;
        const buf = XLSX.write(buildWorkbook(), { bookType: 'xlsx', type: 'array' });
        document.getElementById('keepFormulas').checked = true;
        const relu = XLSX.read(buf, { type: 'array', cellFormula: true });
        const ws = relu.Sheets[Object.keys(relu.Sheets)[0]];
        return Object.keys(ws).filter(ref => ws[ref] && ws[ref].f).length;
      })()
    };
  });
  console.log('  xlsx : ' + JSON.stringify(formules.xlsx[formules.refDuree]) + ' / ' +
    JSON.stringify(formules.xlsx[formules.refPoids]));
  console.log('  ods  : ' + JSON.stringify(formules.ods[formules.refDuree]));
  console.log('  affichee : ' + formules.affichee);
  check('xlsx : soustraction de dates ecrite en formule',
    /^[A-Z]+2-[A-Z]+2$/.test(formules.xlsx[formules.refDuree] || ''), formules.xlsx[formules.refDuree]);
  check('xlsx : fonction avec garde sur cellule vide',
    /^IF\([A-Z]+2="","",YEAR\([A-Z]+2\)\)$/.test(formules.xlsx[formules.refAnnee] || ''), formules.xlsx[formules.refAnnee]);
  check('xlsx : plage figee pour la repartition',
    /SUM\(\$[A-Z]+\$2:\$[A-Z]+\$6\)/.test(formules.xlsx[formules.refPoids] || ''), formules.xlsx[formules.refPoids]);
  const nbFormules = Object.keys(formules.xlsx).length;
  check('xlsx : une formule par ligne et par colonne calculee',
    nbFormules >= 15 && nbFormules % 5 === 0, nbFormules);
  check('ods : les memes formules sont ecrites',
    formules.ods[formules.refDuree] === formules.xlsx[formules.refDuree], formules.ods[formules.refDuree]);
  check('case decochee : aucune formule, seulement les valeurs', formules.sansFormules === 0, formules.sansFormules);
  check('formule affichee avec des points-virgules et un signe egal',
    /^=[A-Z]+2-[A-Z]+2$/.test(formules.affichee), formules.affichee);

  console.log('\n== M. pas de requete reseau externe ==');
  const page3 = await ctx.newPage();
  const ext = [];
  page3.on('request', r => { if (!r.url().startsWith(SITE.replace('/index.html', ''))) ext.push(r.url()); });
  await page3.goto(SITE);
  await page3.waitForTimeout(500);
  check('aucune requete hors du dossier local', ext.length === 0, ext);
  const empty = await page3.evaluate(() => document.getElementById('tabBanner').style.display);
  check('un onglet vide n alerte pas sur la concurrence', empty !== 'flex', empty);

  console.log('\ndialogues systeme vus: ' + JSON.stringify(dialogs.slice(0, 6)));
  console.log('\n' + pass + ' verifications ok, ' + fail + ' echecs');
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
})();
