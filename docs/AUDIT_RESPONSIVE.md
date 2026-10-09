# Audit d'adaptation aux écrans

Relevé du 2026-10-09 par `pnpm audit:responsive`, sur le build
de production. 15 gabarits × 9 largeurs = 135 mesures.

## Débordement horizontal

Aucun. À toutes les largeurs mesurées, de 320 à 1920 px, la page tient dans la fenêtre :
aucune barre de défilement horizontale, aucun contenu hors écran.

## Action principale sous la ligne de flottaison (DP.3)

| Gabarit | Largeur | Dépasse de |
| --- | --- | --- |
| Accueil | 320 px | 41 px |
| Accueil | 360 px | 153 px |
| Accueil | 390 px | 35 px |
| Service | 320 px | 70 px |
| Service | 360 px | 176 px |
| Service | 390 px | 103 px |
| Service | 414 px | 34 px |
| Pathologie | 320 px | 67 px |
| Pathologie | 360 px | 151 px |
| Pathologie | 390 px | 68 px |
| Article | 320 px | 40 px |
| Article | 360 px | 144 px |
| Article | 390 px | 58 px |
| Article | 414 px | 19 px |

