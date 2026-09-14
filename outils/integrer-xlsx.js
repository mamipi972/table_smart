#!/usr/bin/env node
/*
  Fabrique une page autonome : la librairie SheetJS est recopiée dans le HTML,
  à la place de la balise <script src="xlsx.full.min.js">.

    node outils/integrer-xlsx.js
    node outils/integrer-xlsx.js --lib ~/Téléchargements/xlsx.full.min.js --sortie tableur-autonome.html

  Le fichier produit ne dépend plus d'aucun fichier voisin ni d'aucun réseau :
  il s'ouvre seul, depuis une clé USB ou une pièce jointe. Il pèse en revanche
  environ 1 Mo, et changer de version de SheetJS demande de le refabriquer.

  Aucune dépendance : Node seul suffit.
*/
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(nom);
  return (i !== -1 && args[i + 1]) ? args[i + 1] : defaut;
}
if (args.includes('--aide') || args.includes('-h')) {
  console.log('usage : node outils/integrer-xlsx.js [--source tableur.html] [--lib xlsx.full.min.js] [--sortie tableur-autonome.html]');
  process.exit(0);
}

const source = path.resolve(option('--source', path.join(racine, 'tableur.html')));
const lib = path.resolve(option('--lib', path.join(racine, 'xlsx.full.min.js')));
const sortie = path.resolve(option('--sortie', path.join(racine, 'tableur-autonome.html')));

const DEBUT = '<!-- DEBUT chargement de la librairie -->';
const FIN = '<!-- FIN chargement de la librairie -->';

function echec(message) { console.error('Échec : ' + message); process.exit(1); }

if (!fs.existsSync(source)) echec('page introuvable : ' + source);
if (!fs.existsSync(lib)) {
  echec('librairie introuvable : ' + lib + '\n' +
    'Téléchargez xlsx.full.min.js (SheetJS) et indiquez son chemin avec --lib.');
}

const html = fs.readFileSync(source, 'utf8');
const debut = html.indexOf(DEBUT);
const fin = html.indexOf(FIN);
if (debut === -1 || fin === -1 || fin < debut) {
  echec('les repères de chargement sont absents de ' + path.basename(source) + '.\n' +
    'Cette page a-t-elle déjà été fabriquée par cet outil ?');
}

let code = fs.readFileSync(lib, 'utf8');
if (code.charCodeAt(0) === 0xFEFF) code = code.slice(1);

/* Une occurrence de « </script » fermerait la balise par accident. Dans du
   code minifié elle ne peut apparaître qu'à l'intérieur d'une chaîne ou d'une
   expression régulière, où « <\/script » est strictement équivalent. */
const fermetures = (code.match(/<\/script/gi) || []).length;
if (fermetures) code = code.replace(/<\/script/gi, '<\\/script');

/* « <!-- » et « --> » ouvrent un commentaire dans un script classique. Dans
   SheetJS ils n'apparaissent qu'au sein d'expressions régulières (nettoyage de
   fragments HTML), où ils sont inoffensifs — mais on le vérifie. */
const commentaires = (code.match(/<!--/g) || []).length;
const suspects = code.split('\n').filter(l => /^\s*-->/.test(l)).length;
if (suspects) {
  echec('la librairie contient une ligne commençant par « --> », qui serait lue comme\n' +
    'un commentaire une fois intégrée. Intégration abandonnée.');
}

const version = (code.match(/version\s*=\s*['"](\d+\.\d+\.\d+)['"]/) || [])[1] ||
                (code.match(/XLSX\.version\s*=\s*['"]([^'"]+)['"]/) || [])[1] || 'version inconnue';

const remplacement = DEBUT + '\n' +
  '<script>\n' +
  '  /* Librairie SheetJS ' + version + ' intégrée le ' + new Date().toISOString().slice(0, 10) + '\n' +
  '     par outils/integrer-xlsx.js. Cette page ne charge aucun fichier extérieur. */\n' +
  '  window.__xlsxInline = true;\n' +
  '  window.__xlsxLoadError = false;\n' +
  '  function xlsxMissing() { window.__xlsxLoadError = true; }\n' +
  '</script>\n' +
  '<script>\n' + code + '\n</script>\n' +
  FIN;

const resultat = html.slice(0, debut) + remplacement + html.slice(fin + FIN.length);
fs.writeFileSync(sortie, resultat, 'utf8');

const ko = n => (n / 1024).toFixed(0) + ' Ko';
console.log('SheetJS ' + version + ' intégré dans ' + path.relative(process.cwd(), sortie));
console.log('  page seule      : ' + ko(Buffer.byteLength(html)));
console.log('  librairie       : ' + ko(Buffer.byteLength(code)));
console.log('  page autonome   : ' + ko(Buffer.byteLength(resultat)));
if (fermetures) console.log('  ' + fermetures + ' occurrence(s) de « </script » échappée(s)');
if (commentaires) console.log('  ' + commentaires + ' occurrence(s) de « <!-- » laissée(s) telles quelles (dans des expressions régulières)');
console.log('\nVérifiez la page une fois dans le navigateur : import, export, puis rechargement.');
