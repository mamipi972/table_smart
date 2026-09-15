# Gestionnaire multi-feuilles

> Tableur local en un fichier HTML : import Excel et CSV, saisie, colonnes calculées
> proposées, sauvegarde par document, aucune requête réseau.

*[English version below](#english).*

Tableur de poche en un seul fichier HTML : import `.xlsx` / `.xls` / `.ods` / `.csv`,
saisie, recherche, tri, journal des modifications, export, et sauvegarde automatique
dans le navigateur ou directement dans un fichier du disque.

Tout se passe en local : aucun serveur, aucune requête réseau, rien ne sort de la machine.

Le texte en exergue ci-dessus est celui du champ « About » du dépôt. Sujets suggérés :
`spreadsheet`, `xlsx`, `csv`, `sheetjs`, `single-file`, `offline-first`, `vanilla-js`, `french`.

## Mise en route

**Un seul fichier, rien à installer.** Ouvrez [`tableur-autonome.html`](tableur-autonome.html)
puis, en haut à droite de la page GitHub, le bouton de téléchargement (⤓ *Download raw
file*). Double-cliquez sur le fichier obtenu : il s'ouvre dans votre navigateur et tout
fonctionne — Excel compris. Pas de terminal, pas de librairie à poser à côté, aucune
connexion.

C'est la voie recommandée. Le reste de cette section ne sert que si vous préférez
travailler avec la page seule.

<details>
<summary>Les deux formes de la page (pour les curieux)</summary>

| Fichier | Librairie SheetJS | Poids | Pour l'ouvrir |
|---|---|---|---|
| `tableur-autonome.html` | **dedans** | ~1 Mo | double-clic, rien d'autre |
| `tableur.html` | **à côté** | 132 Ko | avec `xlsx.full.min.js` dans le même dossier |

`tableur-autonome.html` est fabriqué à partir de `tableur.html` : même application, la
librairie en plus. Pour savoir laquelle vous avez en main, cherchez `__xlsxInline = true`
dans le fichier HTML.

</details>

### Si vous ouvrez `tableur.html` sans la librairie

La page ne reste pas muette : un bandeau rouge apparaît avec un bouton
**« Choisir le fichier xlsx.full.min.js… »**. Désignez le fichier où qu'il soit sur votre
disque, il est chargé sur-le-champ — sans installation, sans rechargement. Le bouton
**« Où le trouver ? »** donne l'adresse de téléchargement.

La page propose ensuite d'**enregistrer la version tout-en-un** : un clic, et vous obtenez
votre propre `tableur-autonome.html`, librairie comprise. Vous n'aurez plus jamais à
recommencer. Cette fabrication se fait entièrement dans le navigateur, sans outil.

Sans la librairie, l'import CSV, la saisie et la sauvegarde dans le navigateur continuent
de fonctionner ; seuls `.xlsx`, `.xls` et `.ods` attendent.

Prenez de préférence **SheetJS 0.20.2 ou plus récent** : les versions antérieures, 0.20.1
comprise, sont visées par l'avis ReDoS [CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
— un fichier fabriqué pour l'occasion peut y faire tourner une expression régulière sans
fin et figer l'onglet. La page a été vérifiée avec 0.20.3, 0.20.1 et 0.18.5 ;
`tableur-autonome.html` embarque la **0.20.3**, redistribuée sous licence Apache 2.0 avec
son en-tête de copyright ([SheetJS](https://sheetjs.com)).

Ouvrir la page depuis un petit serveur local (`npx http-server`) plutôt qu'en `file://`
isole proprement le stockage du navigateur : en `file://`, selon le navigateur, tous les
fichiers HTML locaux se partagent le même espace.

### Fabriquer la version autonome

> **Rien ici n'est nécessaire pour se servir du tableur.** Si vous voulez juste
> l'utiliser, téléchargez `tableur-autonome.html` et passez à la suite. Cette
> section s'adresse à qui modifie l'application ou change de version de SheetJS.

**De quoi parle-t-on ?** `tableur-autonome.html` n'est pas écrit à la main : c'est
`tableur.html` dans lequel on a recopié la librairie, d'un seul tenant. Ce collage,
c'est ce qu'on appelle « fabriquer » le fichier. Le dépôt en livre déjà un tout prêt ;
les outils ci-dessous ne servent qu'à en refaire un.

**Quand faut-il le refaire ?** Deux cas, et deux seulement :

1. une nouvelle version de SheetJS est sortie et vous voulez l'embarquer ;
2. vous avez modifié `tableur.html` — sinon le fichier livré resterait sur l'ancienne version.

**Trois façons de le faire, de la plus simple à la plus technique.**

*Depuis la page elle-même, sans rien installer.* Ouvrez `tableur.html`, cliquez sur
« Choisir le fichier xlsx.full.min.js… » dans le bandeau rouge, puis sur « Enregistrer la
page tout-en-un ». Le fichier arrive dans vos téléchargements. C'est la méthode à retenir
si les deux suivantes vous parlent peu.

*Avec Node.js.* [Node.js](https://nodejs.org) est un programme qui exécute du JavaScript
hors du navigateur (`winget install OpenJS.NodeJS.LTS` sous Windows, puis rouvrir le
terminal). Ouvrez un terminal **dans le dossier du projet**, placez-y `xlsx.full.min.js`,
et tapez :

```sh
node outils/integrer-xlsx.js
```

Pour désigner une librairie rangée ailleurs, ou choisir le nom du fichier produit :

```sh
node outils/integrer-xlsx.js --lib ~/xlsx.full.min.js --sortie tableur-autonome.html
```

*Avec PowerShell, sous Windows, sans rien installer.* Toujours depuis le dossier du projet :

```powershell
.\outils\integrer-xlsx.ps1
```

```powershell
.\outils\integrer-xlsx.ps1 -Lib "$HOME\Downloads\xlsx.full.min.js" -Sortie tableur-autonome.html
```

Si Windows refuse d'exécuter le script, autorisez-le pour la fenêtre en cours :
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. Les deux scripts produisent
le même fichier ; le `.ps1` n'a pas pu être exécuté lors de son écriture, faute de
PowerShell sur la machine de développement, donc signalez tout écart.

**Ce que font ces outils, en clair.** Ils recopient la librairie dans la page en évitant
deux pièges : une suite `</script` dans le code refermerait la balise trop tôt et couperait
la page en deux, donc elle est neutralisée ; une ligne débutant par `-->` serait prise pour
la fin d'un commentaire, donc l'outil refuse plutôt que de produire un fichier cassé.

**Ce que ça coûte.** Environ 1 Mo au total : 132 Ko pour la page, 930 Ko pour la librairie
en 0.20.3.

**Deux précautions pour qui reprend le projet.** Le fichier fabriqué est enregistré dans le
dépôt, ce qui ne se fait pas d'habitude pour 1 Mo produit par un outil : c'est le prix à
payer pour qu'un débutant n'ait qu'un fichier à télécharger. Et comme il peut rester en
arrière quand `tableur.html` change, `tests/test-sans-librairie.js` compare les deux et
signale l'écart. Après toute modification de `tableur.html`, relancez donc
`node outils/integrer-xlsx.js`. Le fichier produit se contrôle avec la suite habituelle :

```sh
TABLEUR=tableur-autonome.html node tests/test.js
```

## Ce qui a été corrigé

### Perte de données à l'import — le point noir

- L'import **demande confirmation** quand une session est ouverte, et propose
  « Remplacer la session » ou « Ajouter les feuilles au classeur » (fusion sans écrasement).
- La pile d'annulation n'est plus vidée : **Ctrl+Z ramène la session précédente**,
  libellé du document compris.
- La sauvegarde de la session précédente n'est plus écrasée : chaque document a sa propre entrée.

### Sauvegarde locale

- Une entrée par document (`tableur.session.v4::<nom>|<taille>|<date>`) au lieu d'une clé
  unique : une session sur le fichier B n'efface plus celle du fichier A. L'ancienne clé
  `tableur.session.v3` est reprise automatiquement au premier démarrage.
- « Sessions enregistrées » liste toutes les sauvegardes avec le nom, **la taille et la date
  du fichier d'origine**, ce qui distingue deux `clients.xlsx` venus de dossiers différents.
  Chaque ligne se restaure ou se supprime individuellement.
- **Onglets concurrents détectés** par un verrou daté partagé (et un `BroadcastChannel`) :
  le second onglet suspend sa sauvegarde automatique, l'annonce, et propose de prendre la main.
  Lier deux onglets au même fichier du disque déclenche le même avertissement.
- **Quota atteint** : bandeau rouge permanent, pastille rouge, statut « NON ENREGISTRÉ »
  et alerte explicite, au lieu d'une phrase dans un coin du bandeau d'état.
  Deuxième essai automatique sans le journal avant de déclarer l'échec.

### Fermeture de l'onglet

- L'avertissement couvre désormais **les écritures en attente** (locale à 500 ms,
  disque à 1,2 s), y compris quand un fichier est lié — exactement le cas qui perdait
  la dernière saisie en silence.
- `pagehide` et le passage en arrière-plan forcent l'enregistrement local immédiat.

### Conversion numérique

- Les colonnes à **zéro initial** (code postal `01234`, téléphone `0612345678`) et
  celles dépassant **quinze chiffres significatifs** restent en type texte, et
  l'import le signale colonne par colonne.
- L'**intitulé** suffit désormais : `CP`, `Code postal`, `Tél`, `Téléphone`, `SIRET`,
  `IBAN`, `Référence`, `Matricule`, `N°`… restent du texte même quand aucune valeur
  n'a de zéro initial. Les colonnes à décimales en sont exclues, pour qu'un
  « Montant TVA » reste un nombre.
- Le fichier est lu deux fois (valeurs natives + texte affiché) pour récupérer le
  `01234` d'une cellule numérique formatée.
- Une saisie à zéro initial dans une colonne nombre propose de basculer la colonne
  en texte plutôt que d'abîmer la valeur ; passer une colonne en nombre prévient
  du nombre de valeurs qui seraient abîmées.

### Détails

- Les colonnes hors schéma sont **réintégrées** (import, restauration, export) au lieu
  d'être perdues au moment de l'export.
- Les noms de feuille sont tronqués à 31 caractères **puis rendus uniques**
  (comparaison insensible à la casse, comme Excel) : deux noms proches ne font plus
  échouer l'export.
- Les CSV en **Latin-1 sont détectés** (UTF-8 strict, sinon Windows-1252) et l'encodage
  retenu est annoncé. Le séparateur (`;` `,` tabulation `|`) est deviné.
- **Injection CSV** : les cellules commençant par `=`, `+`, `-` ou `@` sont préfixées
  d'une apostrophe à l'export (case décochable dans la modale d'export), en-têtes compris.
- Une colonne `__proto__`, `constructor` ou `prototype` est renommée à l'import
  (`proto_`, …) : ses valeurs ne disparaissent plus. Aucune lecture de cellule ne
  passe par le prototype.
- Les fichiers exportés portent le nom du document et un horodatage
  (`clients_2026-09-14_1530.xlsx`), et les CSV d'un même lot sont numérotés :
  `Ventes/2025` et `Ventes_2025` ne produisent plus le même fichier.
- Le fichier lié affiche sa taille, et « Situer le dossier… » résout le **chemin complet**
  quand on désigne le dossier parent (le navigateur ne le donne jamais spontanément).

### Le CDN

Le repli vers `cdn.sheetjs.com` a été **supprimé**. Sans attribut `integrity`, un CDN
compromis obtiendrait l'accès à toutes les données de la page et, en mode lié, au droit
d'écriture sur le fichier du disque. L'en-tête de `tableur.html` indique comment
rétablir le repli avec un hash SRI si on y tient.

En complément : la présence réelle de la librairie est vérifiée à l'exécution
(`xlsxReady()`), ce qui attrape le fichier local présent mais corrompu — que `onerror`
laissait passer — et **l'export vérifie la librairie comme l'import**.

## Colonnes calculées (bouton « + Colonne »)

Le bouton ouvre une fenêtre qui propose des calculs d'après les types de colonnes
détectés, chacun avec un aperçu sur les premières lignes :

- deux colonnes de date → nombre de **jours**, de **mois** ou d'**années** entre les deux
  (la colonne « début » est reconnue par son intitulé, sinon par le sens des écarts) ;
- deux colonnes d'**années** (entiers 1900–2100) → écart en années ;
- une date → année, **mois en toutes lettres** (« août »), mois et année en lettres
  (« août 2025 »), mois au format AAAA-MM qui se trie correctement, trimestre,
  ancienneté en jours ;
- deux nombres → différence, pourcentage, et produit quand les intitulés ressemblent
  à une quantité et à un prix ;
- une colonne de chiffres → **répartition en %** (les parts totalisent 100), et
  **classement** : 1 pour la plus grande valeur, les ex æquo partageant leur rang ;
- une colonne de chiffres et une colonne catégorielle → **classement par groupe**,
  qui repart de 1 dans chaque ville, chaque service, chaque catégorie ;
- du texte → domaine d'une adresse e-mail, concaténation de deux colonnes.

Les suggestions sont servies **une par famille à tour de rôle** : sans cela, deux
colonnes de date suffisent à remplir la liste et masquent tout le reste. Chacune affiche
la formule tableur correspondante (voir ci-dessous).

Une colonne calculée **se recalcule automatiquement** à chaque modification de ses
sources, suit les renommages, et se fige en valeurs si sa source disparaît ou sur
demande depuis le menu « ⋮ ».

### La formule est toujours rappelée

Chaque proposition affiche la **formule tableur** correspondante, telle qu'elle
s'écrirait pour la ligne 2 : `=F2-E2`, `=IF(E2="";"";YEAR(E2))`,
`=IF(SUM($G$2:$G$6)=0;"";G2/SUM($G$2:$G$6)*100)`. On la retrouve dans l'infobulle de
l'en-tête, dans celle de chaque cellule calculée, et en entier par « Voir la formule »
dans le menu « ⋮ » — avec le nom des colonnes sources.

Les points-virgules correspondent à ce qu'affiche un Excel français : la formule se
recopie telle quelle dans une cellule. Le fichier, lui, stocke la virgule et les noms de
fonctions anglais, qu'Excel et LibreOffice traduisent à l'ouverture.

### Exportées comme formules, pas comme valeurs

À l'export **.xlsx** et **.ods**, les colonnes calculées partent en **vraies formules** :
le classeur se recalcule tout seul à l'ouverture, et continue de vivre si on y ajoute des
lignes. La valeur figée reste écrite à côté, pour les lecteurs qui n'évaluent rien. Une
case de la fenêtre d'export permet de n'exporter que les valeurs.

Le CSV ne connaît pas les formules : il reçoit toujours les valeurs, et les cellules
commençant par `=` y sont neutralisées comme les autres.

Trois réserves honnêtes. `TEXT(…;"mmmm")` rend le mois dans la langue de l'application :
« août » en français, « August » sur un Excel anglais. Le domaine d'une adresse e-mail est
pris après le **premier** `@` par la formule, après le dernier par la page — sans
différence sur une adresse normale. Et `DATEDIF`, utilisée pour les écarts en mois et en
années, existe dans Excel comme dans LibreOffice mais reste absente de leur liste de
fonctions : elle fonctionne sans être proposée à la saisie.

## Feuilles proposées (bouton « + Feuille »)

Même principe pour les feuilles, dès que **deux lignes partagent une même valeur** :

- une feuille par valeur d'une colonne catégorielle (la feuille d'origine est conservée) ;
- une feuille de synthèse : une ligne par valeur, nombre de lignes et somme des colonnes
  numériques ;
- une synthèse par année ou par mois d'une colonne de date ;
- la fusion des feuilles de structure identique, avec une colonne « Feuille d'origine ».

## Nettoyage des espaces

Un espace au bord d'une cellule ou doublé entre deux mots ne se voit pas, mais sépare
« Paris » de « Paris  » dans les tris, les recherches et les regroupements — deux villes
là où il n'y en a qu'une.

La page les repère toute seule après un import ou une restauration, et propose de les
supprimer : nombre de cellules concernées, feuille par feuille, avec un **aperçu avant /
après** des douze premières. Le bouton **« Nettoyer »** de la barre des feuilles relance
l'examen à la demande sur la feuille affichée. Le nettoyage passe par l'historique, donc
**Ctrl+Z le défait**.

Deux règles, et deux seulement : les espaces de début et de fin sont supprimés, les suites
de deux espaces ou plus deviennent un espace simple. Les retours à la ligne à l'intérieur
d'une cellule sont laissés intacts, et les nombres comme les dates ne sont pas touchés.

## Limites connues

- Le navigateur ne communique pas le chemin d'un fichier choisi : le dossier ne
  s'affiche qu'après l'avoir désigné via « Situer le dossier… ».
- Un identifiant de plus de quinze chiffres déjà stocké comme **nombre** dans le fichier
  d'origine est arrivé abîmé avant d'atteindre la page ; la colonne est protégée en texte,
  mais les chiffres perdus le sont en amont.
- La neutralisation des formules s'applique aussi au fichier CSV lié : une cellule
  `=A1` y est écrite `'=A1`. La case à décocher dans la modale d'export permet de s'en passer.
- La sauvegarde directe sur le disque n'existe que sur Chrome et Edge
  (File System Access API).

## Tests

`tests/test.js` pilote un Chromium réel : import, typage, annulation, concurrence entre
onglets, quota, encodage, injection CSV, noms de feuille, colonnes calculées et
regroupements proposés, mois en lettres, classements, nettoyage des espaces —
78 vérifications.

`tests/test-sans-librairie.js` rejoue le parcours du débutant : page ouverte sans la
librairie, fichier désigné à la main, page tout-en-un enregistrée depuis le navigateur,
puis rouverte seule pour vérifier qu'elle se suffit — 22 vérifications, dont le contrôle
que la page livrée n'est pas en retard sur la source et que le bouton de la page injecte
exactement ce qu'injecte `outils/integrer-xlsx.js`.

```sh
npm install playwright xlsx     # xlsx sert à fabriquer les fichiers d'essai
node tests/test.js
```

Le script fabrique ses fichiers d'essai, sert la page sur un port local et rend la main
avec un code de sortie non nul au premier échec.


---

## English

> Local single-file HTML spreadsheet: Excel and CSV import, data entry, suggested
> computed columns, per-document autosave, no network requests.

A pocket spreadsheet in one HTML file: import `.xlsx` / `.xls` / `.ods` / `.csv`, enter
and edit rows, search, sort, keep a change log, export, and autosave either into the
browser or straight into a file on disk. Everything runs locally — no server, no network
request, nothing leaves the machine. The interface itself is in French.

### Getting started

**One file, nothing to install.** Open [`tableur-autonome.html`](tableur-autonome.html)
and use the download button (⤓ *Download raw file*) at the top right of the GitHub page.
Double-click the file you get: it opens in your browser and everything works, Excel
included. No terminal, no library to drop next to it, no connection.

That is the recommended route. The rest of this section only matters if you would rather
work with the page on its own.

<details>
<summary>The two shapes of the page (for the curious)</summary>

| File | SheetJS library | Size | How to open it |
|---|---|---|---|
| `tableur-autonome.html` | **inside** | ~1 MB | double-click, nothing else |
| `tableur.html` | **alongside** | 132 KB | with `xlsx.full.min.js` in the same folder |

`tableur-autonome.html` is built from `tableur.html`: same application, plus the library.
To tell which one you have, search the HTML for `__xlsxInline = true`.

</details>

#### If you open `tableur.html` without the library

The page does not stay silent: a red banner appears with a **“Choisir le fichier
xlsx.full.min.js…”** button. Point it at the file wherever it sits on your disk and it is
loaded on the spot — no install, no reload. The **“Où le trouver ?”** button gives the
download address.

The page then offers to **save the all-in-one version**: one click and you get your own
`tableur-autonome.html`, library included, never to repeat the exercise. That build runs
entirely in the browser, with no tooling.

Without the library, CSV import, data entry and browser autosave still work; only `.xlsx`,
`.xls` and `.ods` wait.

Prefer **SheetJS 0.20.2 or newer**: earlier releases, 0.20.1 included, are covered by the
ReDoS advisory [CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) — a
crafted file can send a regular expression spinning and freeze the tab. The page has been
checked against 0.20.3, 0.20.1 and 0.18.5; `tableur-autonome.html` bundles **0.20.3**,
redistributed under the Apache 2.0 licence with its copyright header
([SheetJS](https://sheetjs.com)). `XLSX_LIB=path/to/xlsx.full.min.js node tests/test.js`
replays the suite with the version of your choice.

Serving the page from a small local server (`npx http-server`) rather than opening it as
`file://` properly isolates browser storage: under `file://`, depending on the browser,
every local HTML file shares the same storage area.

#### Single-file build

> **None of this is needed to use the spreadsheet.** To simply use it, download
> `tableur-autonome.html` and skip ahead. This part is for whoever changes the
> application or the SheetJS version.

`tableur-autonome.html` is not hand-written: it is `tableur.html` with the library copied
inside it. The repository ships one ready to use; the tools below only rebuild it — after
a new SheetJS release, or after a change to `tableur.html` (otherwise the shipped file
stays on the old version).

*From the page itself, nothing to install.* Open `tableur.html`, click “Choisir le fichier
xlsx.full.min.js…” in the red banner, then “Enregistrer la page tout-en-un”. The file lands
in your downloads.

*With [Node.js](https://nodejs.org).* In a terminal, from the project folder, with
`xlsx.full.min.js` sitting there:

```sh
node outils/integrer-xlsx.js
node outils/integrer-xlsx.js --lib ~/xlsx.full.min.js --sortie tableur-autonome.html
```

*With PowerShell on Windows, nothing to install.* From the project folder:

```powershell
.\outils\integrer-xlsx.ps1
.\outils\integrer-xlsx.ps1 -Lib "$HOME\Downloads\xlsx.full.min.js" -Sortie tableur-autonome.html
```

If Windows blocks the script, allow it for the current window with
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. Both scripts produce the same
file; the `.ps1` could not be executed as it was written, for lack of PowerShell on the
development machine, so please report any discrepancy.

The tools dodge two traps while copying: a `</script` sequence inside the code would close
the tag too early and cut the page in half, so it is escaped; a line starting with `-->`
would be read as the end of a comment, so the tool refuses rather than write a broken file.
The result weighs about 1 MB (132 KB page, 930 KB library at 0.20.3).

Two notes for whoever picks the project up. The built file is tracked in the repository,
which is not how a 1 MB build product is usually handled: that is the price of a beginner
having a single file to download. And since it can fall behind `tableur.html`,
`tests/test-sans-librairie.js` compares the two and reports the gap — so run
`node outils/integrer-xlsx.js` again after any change to `tableur.html`. The result is
checked with the usual suite:

```sh
TABLEUR=tableur-autonome.html node tests/test.js
```

### Suggested computed columns (the “+ Colonne” button)

The button opens a dialog suggesting calculations based on detected column types, each with
a preview over the first rows:

- two date columns → number of **days**, **months** or **years** between them (the “start”
  column is recognised by its label, otherwise by the direction of the gaps);
- two **year** columns (integers 1900–2100) → difference in years;
- one date → year, **month spelled out** (“août”), month and year spelled out
  (“août 2025”), month as YYYY-MM for correct sorting, quarter, age in days;
- two numbers → difference, percentage, and product when the labels look like a quantity and
  a price;
- a number column → **share in %** (the parts add up to 100) and a **ranking**: 1 for the
  largest value, ties sharing their rank;
- a number column plus a categorical one → **ranking within each group**, restarting at 1
  for each city, team or category;
- text → e-mail domain, concatenation of two columns.

A computed column **recalculates itself** whenever its sources change, follows renames, and
freezes into plain values if a source disappears or on request from the “⋮” menu.

#### The formula is always shown

Every suggestion displays the matching **spreadsheet formula** as it would be written for
row 2 — `=F2-E2`, `=IF(E2="";"";YEAR(E2))` — and so do the header and cell tooltips, with
“Voir la formule” in the “⋮” menu giving the full picture. Semicolons match what a French
Excel displays; the file itself stores commas and English function names, which Excel and
LibreOffice translate on opening.

#### Exported as formulas, not as values

In **.xlsx** and **.ods** exports, computed columns are written as **real formulas**: the
workbook recalculates on opening and keeps working when rows are added, with the frozen
value stored alongside for readers that evaluate nothing. A checkbox in the export dialog
falls back to values only. CSV has no formulas and always receives values.

Three honest caveats: `TEXT(…,"mmmm")` renders the month in the application's language;
the e-mail domain formula splits on the **first** `@` where the page uses the last; and
`DATEDIF`, used for month and year gaps, works in both Excel and LibreOffice but is absent
from their function lists.

### Suggested sheets (the “+ Feuille” button)

Same idea for sheets, as soon as **two rows share a value**:

- one sheet per value of a categorical column (the source sheet is kept);
- a summary sheet: one row per value, with row counts and sums of the numeric columns;
- a summary by year or by month of a date column;
- merging sheets that share the same structure, with an added “source sheet” column.

### Whitespace cleanup

A space at the edge of a cell, or doubled between two words, is invisible yet splits
“Paris” from “Paris  ” in sorts, searches and groupings. The page spots them on its own
after an import or a restore and offers to remove them, with a count per sheet and a
before/after preview of the first twelve. The **“Nettoyer”** button in the sheet bar runs
the check again on demand. The cleanup goes through the history, so **Ctrl+Z undoes it**.

Two rules only: leading and trailing spaces go, runs of two or more spaces become one.
Line breaks inside a cell are left alone, and numbers and dates are never touched.

### Known limits

- The browser does not hand out the path of a chosen file: the folder only shows up after
  pointing at it through *Situer le dossier…*.
- An identifier longer than fifteen digits already stored as a **number** in the source file
  arrived damaged before reaching the page; the column is protected as text, but the lost
  digits were lost upstream.
- Formula neutralisation also applies to a linked CSV file: a cell `=A1` is written `'=A1`
  there. The checkbox in the export dialog turns it off.
- Saving straight to disk only exists on Chrome and Edge (File System Access API).

### Tests

`tests/test.js` drives a real Chromium: import, typing, undo, concurrent tabs, quota,
encoding, CSV injection, sheet names, computed columns, suggested groupings, spelled-out months, rankings and whitespace
cleanup — 78 checks.

```sh
npm install playwright xlsx     # xlsx only builds the test fixtures
node tests/test.js
```

`tests/test-sans-librairie.js` replays the beginner's route: page opened without the
library, file picked by hand, all-in-one page saved from the browser, then reopened on its
own to prove it stands alone — 22 checks, including guards against the shipped page falling
behind the source and against the browser build drifting from the Node tool.

Both scripts build their own fixtures, serve the page on a local port, and exit non-zero on
the first failure.
