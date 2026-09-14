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

Le dépôt livre déjà `tableur-autonome.html`, et la page sait le fabriquer elle-même
(voir ci-dessus). Ces outils ne servent donc qu'à le **régénérer en lot** : nouvelle
version de SheetJS, ou modification de `tableur.html`.

Depuis le dossier du projet, la librairie est recopiée **dans** la page. Deux
outils équivalents, selon ce qui est installé :

```sh
# avec Node.js (Windows, macOS, Linux)
node outils/integrer-xlsx.js                       # attend ./xlsx.full.min.js
node outils/integrer-xlsx.js --lib ~/xlsx.full.min.js --sortie tableur-autonome.html
```

```powershell
# sans Node.js, avec PowerShell seul (Windows)
.\outils\integrer-xlsx.ps1
.\outils\integrer-xlsx.ps1 -Lib "$HOME\Downloads\xlsx.full.min.js" -Sortie tableur-autonome.html
```

Le script `.js` demande [Node.js](https://nodejs.org) (`winget install OpenJS.NodeJS.LTS`
sous Windows, puis rouvrir le terminal). Le `.ps1` n'a besoin de rien d'autre que
Windows ; si l'exécution est refusée, autorisez-la pour la session en cours avec
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`. Les deux produisent
le même fichier — le `.ps1` n'a pas pu être exécuté lors de son écriture, faute de
PowerShell sur la machine de développement : signalez tout écart.

Le résultat s'ouvre seul, depuis une clé USB ou une pièce jointe, sans fichier
voisin ni réseau. Contreparties : environ **1 Mo** (126 Ko pour la page, 930 Ko
pour la librairie en 0.20.3), et il faut refabriquer le fichier à chaque mise à
jour de SheetJS. L'outil échappe les séquences `</script` et refuse d'écrire si la
librairie contient une ligne débutant par `-->`, qui serait lue comme un
commentaire une fois intégrée.

Le fichier produit passe la même suite de tests :

```sh
TABLEUR=tableur-autonome.html node tests/test.js
```

`tableur-autonome.html` est versionné dans le dépôt, contrairement à l'usage pour un
fichier fabriqué de 1 Mo : c'est le prix à payer pour qu'un débutant n'ait qu'un fichier à
télécharger. Pour éviter qu'il ne prenne du retard sur `tableur.html` sans que personne ne
le voie, `tests/test-sans-librairie.js` compare les deux et échoue si la page livrée n'est
plus à jour — après toute modification de `tableur.html`, relancez
`node outils/integrer-xlsx.js`.

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
- une date → année, mois (AAAA-MM), trimestre, ancienneté en jours ;
- deux nombres → différence, pourcentage, et produit quand les intitulés ressemblent
  à une quantité et à un prix ;
- un nombre → part dans le total de la feuille ;
- du texte → domaine d'une adresse e-mail, concaténation de deux colonnes.

Une colonne calculée **se recalcule automatiquement** à chaque modification de ses
sources, suit les renommages, et se fige en valeurs si sa source disparaît ou sur
demande depuis le menu « ⋮ ».

## Feuilles proposées (bouton « + Feuille »)

Même principe pour les feuilles, dès que **deux lignes partagent une même valeur** :

- une feuille par valeur d'une colonne catégorielle (la feuille d'origine est conservée) ;
- une feuille de synthèse : une ligne par valeur, nombre de lignes et somme des colonnes
  numériques ;
- une synthèse par année ou par mois d'une colonne de date ;
- la fusion des feuilles de structure identique, avec une colonne « Feuille d'origine ».

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
regroupements proposés — 53 vérifications.

`tests/test-sans-librairie.js` rejoue le parcours du débutant : page ouverte sans la
librairie, fichier désigné à la main, page tout-en-un enregistrée depuis le navigateur,
puis rouverte seule pour vérifier qu'elle se suffit — 19 vérifications, dont le contrôle
que la page livrée n'est pas en retard sur la source.

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

The repository already ships `tableur-autonome.html`, and the page can build one itself
(see above). These tools only **regenerate it in bulk**: a new SheetJS release, or a change
to `tableur.html`.

From the project folder, the library is copied **into** the page. Two equivalent tools,
depending on what is installed:

```sh
# with Node.js (Windows, macOS, Linux)
node outils/integrer-xlsx.js                       # expects ./xlsx.full.min.js
node outils/integrer-xlsx.js --lib ~/xlsx.full.min.js --sortie tableur-autonome.html
```

```powershell
# without Node.js, PowerShell only (Windows)
.\outils\integrer-xlsx.ps1
.\outils\integrer-xlsx.ps1 -Lib "$HOME\Downloads\xlsx.full.min.js" -Sortie tableur-autonome.html
```

`tableur-autonome.html` is tracked in the repository, against the usual rule for a 1 MB
build product: that is the price of a beginner having a single file to download.
`tests/test-sans-librairie.js` compares it against `tableur.html` and fails when the
shipped page falls behind — after any change to `tableur.html`, run
`node outils/integrer-xlsx.js` again.

The `.js` script needs [Node.js](https://nodejs.org); the `.ps1` needs nothing but
Windows (if execution is blocked, allow it for the current session with
`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`). Both produce the same
file — the `.ps1` could not be executed as it was written, for lack of PowerShell on
the development machine: please report any discrepancy.

The result opens on its own — from a USB stick or an email attachment — with no
neighbouring file and no network. The trade-off is about **1 MB** (126 KB page, 930 KB
library at 0.20.3) and a rebuild on every SheetJS update. The tool escapes `</script` sequences and
refuses to write if the library contains a line starting with `-->`, which would be read
as a comment once inlined. The generated file passes the same test suite:
`TABLEUR=tableur-autonome.html node tests/test.js`.

### What was fixed

**Data loss on import — the main one.** Import now asks before touching an open session and
offers *replace* or *add the sheets alongside* (merge, nothing overwritten). The undo stack
is no longer cleared: **Ctrl+Z brings the previous session back**, document label included.
The previous document's saved copy is no longer overwritten either.

**Local save.** One entry per document (`tableur.session.v4::<name>|<size>|<date>`) instead
of a single key, so working on file B no longer erases file A's session; the old
`tableur.session.v3` key is migrated on first start. A *saved sessions* list shows each
backup with the **size and date of the source file**, which finally tells two `clients.xlsx`
from different folders apart; each row restores or deletes on its own. **Concurrent tabs**
are detected through a timestamped lock plus a `BroadcastChannel`: the second tab suspends
its autosave, says so, and offers to take over — same warning when two tabs link the same
file on disk. When the **quota is reached**, a permanent red banner, a red dot, a
`NON ENREGISTRÉ` status and an explicit alert replace the old line tucked into a corner of
the status bar, after one automatic retry without the change log.

**Closing the tab.** The warning now covers **pending writes** (500 ms locally, 1.2 s to
disk), including when a file is linked — precisely the case that used to lose the last
entry silently. `pagehide` and going to the background force an immediate local save.

**Numeric conversion.** Columns with a **leading zero** (postcode `01234`, phone number
`0612345678`) and those beyond **fifteen significant digits** stay text, and the import
reports it column by column; the file is read twice (native values plus displayed text) to
recover the `01234` of a formatted numeric cell. Typing a leading-zero value into a number
column offers to switch the column to text instead of damaging the value, and turning a
column into numbers warns how many values would be damaged.

**Details.** Off-schema columns are **re-attached** (import, restore, export) instead of
being dropped at export time. Sheet names are truncated to 31 characters **and then made
unique** (case-insensitive, like Excel), so near-identical names no longer break the export.
Latin-1 CSV files are **detected** (strict UTF-8, otherwise Windows-1252) and the encoding
used is announced; the separator (`;` `,` tab `|`) is guessed. **CSV injection**: cells
starting with `=`, `+`, `-` or `@` are prefixed with an apostrophe on export (a checkbox in
the export dialog turns it off), headers included. A `__proto__`, `constructor` or
`prototype` column is renamed on import (`proto_`, …) so its values no longer vanish, and no
cell read goes through the prototype chain. Exported files carry the document name and a
timestamp (`clients_2026-09-14_1530.xlsx`), and CSVs of one batch are numbered, so
`Ventes/2025` and `Ventes_2025` no longer produce the same file. The linked file shows its
size, and *Situer le dossier…* resolves the **full path** once you point at the parent
folder — the browser never gives it away on its own.

#### The CDN

The `cdn.sheetjs.com` fallback was **removed**. Without an `integrity` attribute, a
compromised CDN would get access to every piece of data on the page and, in linked mode,
write access to the file on disk. The header of `tableur.html` documents how to restore the
fallback with an SRI hash. On top of that, the library is checked at runtime
(`xlsxReady()`), which catches a local file that is present but corrupt — something
`onerror` let through — and **export checks the library just like import does**.

### Suggested computed columns (the “+ Colonne” button)

The button opens a dialog suggesting calculations based on detected column types, each with
a preview over the first rows:

- two date columns → number of **days**, **months** or **years** between them (the “start”
  column is recognised by its label, otherwise by the direction of the gaps);
- two **year** columns (integers 1900–2100) → difference in years;
- one date → year, month (YYYY-MM), quarter, age in days;
- two numbers → difference, percentage, and product when the labels look like a quantity and
  a price;
- one number → share of the sheet total;
- text → e-mail domain, concatenation of two columns.

A computed column **recalculates itself** whenever its sources change, follows renames, and
freezes into plain values if a source disappears or on request from the “⋮” menu.

### Suggested sheets (the “+ Feuille” button)

Same idea for sheets, as soon as **two rows share a value**:

- one sheet per value of a categorical column (the source sheet is kept);
- a summary sheet: one row per value, with row counts and sums of the numeric columns;
- a summary by year or by month of a date column;
- merging sheets that share the same structure, with an added “source sheet” column.

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
encoding, CSV injection, sheet names, computed columns and suggested groupings — 53 checks.

```sh
npm install playwright xlsx     # xlsx only builds the test fixtures
node tests/test.js
```

`tests/test-sans-librairie.js` replays the beginner's route: page opened without the
library, file picked by hand, all-in-one page saved from the browser, then reopened on its
own to prove it stands alone — 19 checks, including a guard against the shipped page
falling behind the source.

Both scripts build their own fixtures, serve the page on a local port, and exit non-zero on
the first failure.
