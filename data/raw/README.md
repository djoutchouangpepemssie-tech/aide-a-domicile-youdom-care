# Données brutes du pipeline local

Fichiers téléchargés par `pnpm data:local` (scripts/data/local). Ce dossier est ignoré par git
à l'exception de ce fichier, régénéré à chaque exécution (dernière : 2026-09-26). `--offline`
réutilise le fichier le plus récent de chaque source.

Une entrée par source : libellé (identifiant du fichier), adresse, licence, date de collecte, taille, état.

## Géocodage des faits parisiens (Base Adresse Nationale)

Les faits des arrondissements de Paris dont l'adresse est une adresse de voie (numéro puis voie) sont
soumis à l'API Adresse de la Base Adresse Nationale (`https://api-adresse.data.gouv.fr/search/?q=<adresse>&limit=1`,
Licence Ouverte / Open Licence 2.0, Etalab ; appels espacés, ~50 requêtes/s au plus). La requête est le
numéro et la voie suivis de « Paris », sans le code postal (donnée suspecte qui biaise la BAN). Si le score du
premier résultat est ≥ 0,6, que la BAN a reconnu le numéro (`type: housenumber`), que la voie renvoyée
correspond à l'adresse demandée et que `citycode` est un arrondissement (751xx), ce code remplace
`commune_insee` du fait, qui est rattaché à cet arrondissement
(retiré de l'arrondissement d'origine s'il n'est pas le bon, ajouté au bon s'il a une page de vague 1) ;
sinon le fait reste où il est. Motif : la source CNSA rattache des résidences autonomie du CASVP au
mauvais arrondissement (« 7bis rue Clauzel, 75015 » est dans le 9e). Hors Paris, le code postal et la
ville de l'adresse suffisent (`locateFacts`), la BAN n'est pas appelée. Les réponses sont mises en cache
dans `ban-<date>.json` (une entrée par adresse normalisée, réutilisée en `--offline`) ; l'entrée
`ban-adresses-paris` ci-dessous donne la date de collecte. Règle détaillée : scripts/data/local/ban.ts.

## Sources

- **Annuaire de l'administration (DILA), base de données locales — département 75** (`annuaire-administration-75`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2275%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 638 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 77** (`annuaire-administration-77`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2277%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 1.2 Mo · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 78** (`annuaire-administration-78`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2278%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 826 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 91** (`annuaire-administration-91`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2291%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 733 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 92** (`annuaire-administration-92`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2292%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 458 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 93** (`annuaire-administration-93`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2293%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 538 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 94** (`annuaire-administration-94`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2294%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 466 Ko · état : cache
- **Annuaire de l'administration (DILA), base de données locales — département 95** (`annuaire-administration-95`)
  - adresse : <https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/exports/json?where=startswith(code_insee_commune%2C%2295%22)&select=nom%2Cpivot%2Ccode_insee_commune%2Cadresse%2Ctelephone%2Csite_internet%2Curl_service_public%2Cadresse_courriel%2Cdate_modification>
  - licence : Licence Ouverte / Open Licence 2.0 (DILA)
  - date : 2026-09-26 · taille : 670 Ko · état : cache
- **Base Adresse Nationale — API Adresse (api-adresse.data.gouv.fr), géocodage des faits parisiens** (`ban-adresses-paris`)
  - adresse : <https://api-adresse.data.gouv.fr/search/>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 174 Ko · état : cache
- **CNSA — Etablissements EHPAD, ESLD, résidences autonomie, accueils de jour (data.gouv.fr)** (`cnsa-etablissements`)
  - adresse : <https://static.data.gouv.fr/resources/etablissements-ehpad-esld-residences-autonomie-accueils-de-jour/20201111-100438/base-etablissements.csv>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 9.1 Mo · état : cache
- **CNSA — Points d'informations locaux pour les personnes âgées (data.gouv.fr)** (`cnsa-points-info`)
  - adresse : <https://static.data.gouv.fr/resources/points-dinformations-locaux-pour-les-personnes-agees/20201111-100441/base-points-info.csv>
  - licence : Licence Ouverte / Open Licence (Etalab)
  - date : 2026-09-26 · taille : 465 Ko · état : cache
- **FINESS — extraction du fichier des établissements (data.gouv.fr)** (`finess-etablissements`)
  - adresse : <https://static.data.gouv.fr/resources/finess-extraction-du-fichier-des-etablissements/20260512-091152/etalab-cs1100507-stock-20260512-0339.csv>
  - licence : Licence Ouverte / Open Licence (Etalab)
  - date : 2026-09-26 · taille : 45.7 Mo · état : cache
- **API Découpage administratif — arrondissements de Paris** (`geo-arrondissements-paris`)
  - adresse : <https://geo.api.gouv.fr/communes?codeDepartement=75&type=arrondissement-municipal&fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 3 Ko · état : cache
- **API Découpage administratif — communes du 75** (`geo-communes-75`)
  - adresse : <https://geo.api.gouv.fr/departements/75/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 336 o · état : cache
- **API Découpage administratif — communes du 77** (`geo-communes-77`)
  - adresse : <https://geo.api.gouv.fr/departements/77/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 88 Ko · état : cache
- **API Découpage administratif — communes du 78** (`geo-communes-78`)
  - adresse : <https://geo.api.gouv.fr/departements/78/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 45 Ko · état : cache
- **API Découpage administratif — communes du 91** (`geo-communes-91`)
  - adresse : <https://geo.api.gouv.fr/departements/91/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 34 Ko · état : cache
- **API Découpage administratif — communes du 92** (`geo-communes-92`)
  - adresse : <https://geo.api.gouv.fr/departements/92/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 6 Ko · état : cache
- **API Découpage administratif — communes du 93** (`geo-communes-93`)
  - adresse : <https://geo.api.gouv.fr/departements/93/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 7 Ko · état : cache
- **API Découpage administratif — communes du 94** (`geo-communes-94`)
  - adresse : <https://geo.api.gouv.fr/departements/94/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 8 Ko · état : cache
- **API Découpage administratif — communes du 95** (`geo-communes-95`)
  - adresse : <https://geo.api.gouv.fr/departements/95/communes?fields=nom,code,codesPostaux,population,centre,surface,codeEpci&format=json>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 32 Ko · état : cache
- **API Découpage administratif — départements d'Île-de-France** (`geo-departements-idf`)
  - adresse : <https://geo.api.gouv.fr/departements?codeRegion=11&fields=nom,code,chefLieu>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 424 o · état : cache
- **API Découpage administratif — intercommunalités du 75** (`geo-epcis-75`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=75&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 56 o · état : cache
- **API Découpage administratif — intercommunalités du 77** (`geo-epcis-77`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=77&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 1 Ko · état : cache
- **API Découpage administratif — intercommunalités du 78** (`geo-epcis-78`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=78&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 630 o · état : cache
- **API Découpage administratif — intercommunalités du 91** (`geo-epcis-91`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=91&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 761 o · état : cache
- **API Découpage administratif — intercommunalités du 92** (`geo-epcis-92`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=92&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 56 o · état : cache
- **API Découpage administratif — intercommunalités du 93** (`geo-epcis-93`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=93&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 56 o · état : cache
- **API Découpage administratif — intercommunalités du 94** (`geo-epcis-94`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=94&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 56 o · état : cache
- **API Découpage administratif — intercommunalités du 95** (`geo-epcis-95`)
  - adresse : <https://geo.api.gouv.fr/epcis?codeDepartement=95&fields=nom,code>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 656 o · état : cache
- **API Découpage administratif — région Île-de-France** (`geo-region-idf`)
  - adresse : <https://geo.api.gouv.fr/regions/11>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 36 o · état : cache
- **Insee — Évolution et structure de la population 2022 (base communale)** (`insee-base-cc-evol-struct-pop-2022`)
  - adresse : <https://www.insee.fr/fr/statistiques/fichier/8581696/base-cc-evol-struct-pop-2022_csv.zip>
  - licence : Licence Ouverte / Open Licence 2.0 (Etalab)
  - date : 2026-09-26 · taille : 46.7 Mo · état : cache
- **Ville de Paris — espaces verts (promenades ouvertes)** (`paris-espaces-verts`)
  - adresse : <https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/espaces_verts/exports/json?select=nom_ev%2Ccategorie%2Ctype_ev%2Cadresse_numero%2Cadresse_typevoie%2Cadresse_libellevoie%2Cadresse_codepostal%2Csurface_totale_reelle&where=type_ev%3D%22Promenades+ouvertes%22>
  - licence : Open Database License (ODbL) — Ville de Paris
  - date : 2026-09-26 · taille : 147 Ko · état : cache
- **Ville de Paris — marchés découverts** (`paris-marches-decouverts`)
  - adresse : <https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/marches-decouverts/exports/json?select=nom_long%2Cproduit%2Cardt%2Clocalisation%2Cjours_tenue%2Ch_deb_sem_1%2Ch_fin_sem_1>
  - licence : Open Database License (ODbL) — Ville de Paris
  - date : 2026-09-26 · taille : 20 Ko · état : cache
- **Ville de Paris — quartiers administratifs (quartier_paris)** (`paris-quartier-paris`)
  - adresse : <https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/quartier_paris/exports/json?select=c_qu%2Cl_qu%2Cc_ar%2Cc_quinsee%2Csurface%2Cgeom_x_y>
  - licence : Open Database License (ODbL) — Ville de Paris
  - date : 2026-09-26 · taille : 13 Ko · état : cache
- **Ville de Paris — Seniors à Paris, activités de loisirs et citoyenneté** (`paris-seniors-a-paris-loisirs-et-citoyennete`)
  - adresse : <https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/seniors-a-paris-loisirs-et-citoyennete/exports/json?select=nom_structure%2Cadresse%2Ccode_postal%2Ctelephone%2Csite_internet%2Ctype_structure%2Cfrequence%2Ccout%2Cformats&where=type_structure%3D%22Structures+et+activit%C3%A9s+de+la+Ville+de+Paris%22>
  - licence : Open Database License (ODbL) — Ville de Paris
  - date : 2026-09-26 · taille : 65 Ko · état : cache
- **Unapei — carte des associations et établissements (carto.unapei.org)** (`unapei-carto`)
  - adresse : <https://carto.unapei.org/data.php>
  - licence : Site de l'Unapei, données publiques de la carte (pas de licence explicite)
  - date : 2026-09-26 · taille : 1.4 Mo · état : cache
