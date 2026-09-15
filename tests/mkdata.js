const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Ecrit les fichiers d'essai dans le dossier passe en argument.
const out = process.argv[2] || path.join(__dirname, '.tmp', 'site');
fs.mkdirSync(out, { recursive: true });
const at = name => path.join(out, name);

function d(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }

// « CP livraison » n'a aucun zero initial : seul son intitule dit que ce n'est
// pas une quantite. « Ville brute » porte les espaces superflus a nettoyer.
const header = ['Nom', 'Code postal', 'Telephone', 'Identifiant', 'Date de debut', 'Date de fin', 'Montant', 'Ville', 'Email', '__proto__', 'CP livraison', 'Ville brute'];
const rows = [
  ['Durand', 1234, 612345678, 12345678901234567890, d('2025-01-10'), d('2025-03-15'), 120.5, 'Paris', 'a@exemple.fr', 'x1', 75001, '  Paris '],
  ['Martin', 75001, 698765432, 22345678901234567890, d('2024-02-01'), d('2025-02-01'), 80, 'Lyon', 'b@exemple.fr', 'x2', 69003, 'Lyon  Centre'],
  ['Petit', 69003, 611223344, 32345678901234567890, d('2023-05-20'), d('2026-06-30'), 240, 'Paris', 'c@autre.com', 'x3', 44000, 'Paris'],
  ['Robert', 44000, 655443322, 42345678901234567890, d('2025-07-01'), d('2025-07-20'), 15.75, 'Lyon', 'd@exemple.fr', 'x4', 75001, ' Lyon'],
  ['Simon', 1234, 600000000, 52345678901234567890, d('2022-12-31'), d('2025-12-31'), 999.99, 'Nantes', 'e@autre.com', 'x5', 69003, 'Nantes ']
];

const ws = XLSX.utils.aoa_to_sheet([header].concat(rows), { cellDates: true });
// code postal et telephone : nombres avec un format a zeros initiaux, comme dans un vrai fichier
for (let r = 2; r <= rows.length + 1; r++) {
  const cp = ws['B' + r]; if (cp) { cp.z = '00000'; cp.w = String(cp.v).padStart(5, '0'); }
  const tel = ws['C' + r]; if (tel) { tel.z = '0000000000'; tel.w = String(tel.v).padStart(10, '0'); }
  const id = ws['D' + r]; if (id) { id.z = '0'; id.w = String(id.v); }
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Clients');

const ws2 = XLSX.utils.aoa_to_sheet([['Produit', 'Annee de sortie', 'Annee de fin'], ['Alpha', 2019, 2024], ['Beta', 2021, 2025]]);
XLSX.utils.book_append_sheet(wb, ws2, 'Produits');
XLSX.writeFile(wb, at('clients.xlsx'));

// second fichier, meme nom de base mais contenu different
const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([['Article', 'Stock'], ['Vis', 12], ['Ecrou', 30]]), 'Stock');
XLSX.writeFile(wb2, at('autre.xlsx'));

// CSV latin-1 avec injection de formule et zeros initiaux
const latin = Buffer.from('Nom;Ville;CP;Note\r\n"Crème brûlée";Paris;01234;=SUM(A1:A9)\r\nPâté;Lyon;69003;+33 1\r\n', 'latin1');
fs.writeFileSync(at('latin1.csv'), latin);
// un modele vierge : des en-tetes, pas une seule ligne de donnees
fs.writeFileSync(at('entetes-seules.csv'), '\ufeffNom;Ville;Montant\r\n', 'utf8');

console.log('fichiers d essai ecrits dans ' + out);
