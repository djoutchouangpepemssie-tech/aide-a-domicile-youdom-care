/**
 * Clé de mémorisation du mode confort de lecture sur l'appareil (localStorage).
 * Module sans directive « use client » : partagé par le script de restauration (serveur) et
 * le bouton (client). Une valeur importée d'un module client dans un composant serveur ne
 * serait qu'une référence, pas la chaîne.
 */
export const COMFORT_STORAGE_KEY = "yc-confort";
