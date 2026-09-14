# Tests

`test.js` ouvre un Chromium (Playwright) sur une copie de `../tableur.html` servie en
http, et vérifie les correctifs de bout en bout : import et typage, confirmation et
annulation d'import, sauvegardes indexées par document, onglets concurrents, quota
localStorage, encodage Latin-1, injection CSV, noms de feuille à l'export, colonnes
calculées et feuilles proposées.

```sh
npm install playwright xlsx
node tests/test.js
```

`xlsx` ne sert qu'à fabriquer les fichiers d'essai (`mkdata.js`) et à fournir
`xlsx.full.min.js` à la page ; l'application elle-même attend simplement ce fichier
à côté de `tableur.html`.

Les fichiers temporaires sont écrits dans `tests/.tmp/site/`, ignoré par git.
