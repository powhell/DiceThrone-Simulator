# Forge Master — scans

Déposer les photos ici :
- `board/` — le Hero Board (recto/verso si upgrades imprimés au dos)
- `leaflet/` — le feuillet de règles (toutes les pages, y compris le dé et les jetons)
- `cards/` — les 32 cartes, une photo par carte

## Particularité (à modéliser)

Forge Master est le seul perso avec des **cartes dupliquées** dans son deck : le
modèle de deck actuel (`buildFullDeck` — un id unique par carte) devra supporter
un champ `count` par carte. Noter sur les photos combien d'exemplaires existe
de chaque carte (ex. suffixe `_x2` dans le nom de fichier, ou une photo de la
pile).

Aucune donnée chiffrée ne sera prise d'une source web — uniquement ces photos
(convention du projet, voir hero.json `"verified"`).
