# Gestionnaire multi-feuilles

Tableur de poche en un seul fichier HTML : import `.xlsx` / `.xls` / `.ods` / `.csv`,
saisie, recherche, tri, journal des modifications, export, et sauvegarde automatique
dans le navigateur ou directement dans un fichier du disque.

Tout se passe en local : aucun serveur, aucune requête réseau, rien ne sort de la machine.

## Mise en route

1. Placez `xlsx.full.min.js` (SheetJS 0.20.3) **à côté** de `tableur.html`.
2. Ouvrez `tableur.html`.

La librairie n'est plus chargée depuis un CDN en cas d'absence du fichier local
(voir « Le CDN » plus bas). Sans elle, l'import CSV, la saisie et la sauvegarde
dans le navigateur continuent de fonctionner ; les formats `.xlsx`, `.xls` et
`.ods` sont désactivés et un bandeau rouge le dit.

Ouvrir la page depuis un petit serveur local (`npx http-server`) plutôt qu'en
`file://` isole proprement le stockage du navigateur : en `file://`, selon le
navigateur, tous les fichiers HTML locaux se partagent le même espace.

### Variante en un seul fichier

Pour n'avoir plus qu'un fichier à transporter, la librairie peut être recopiée
**dans** la page :

```sh
node outils/integrer-xlsx.js                       # attend ./xlsx.full.min.js
node outils/integrer-xlsx.js --lib ~/xlsx.full.min.js --sortie tableur-autonome.html
```

Le résultat s'ouvre seul, depuis une clé USB ou une pièce jointe, sans fichier
voisin ni réseau. Contreparties : environ **1 Mo** (126 Ko pour la page, 860 Ko
pour la librairie), et il faut refabriquer le fichier à chaque mise à jour de
SheetJS. L'outil échappe les séquences `</script` et refuse d'écrire si la
librairie contient une ligne débutant par `-->`, qui serait lue comme un
commentaire une fois intégrée.

Le fichier produit passe la même suite de tests :

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

```sh
npm install playwright xlsx     # xlsx sert à fabriquer les fichiers d'essai
node tests/test.js
```

Le script fabrique ses fichiers d'essai, sert la page sur un port local et rend la main
avec un code de sortie non nul au premier échec.
