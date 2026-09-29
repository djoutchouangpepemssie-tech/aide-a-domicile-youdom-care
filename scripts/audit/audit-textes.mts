/*
 * Audit des textes du site rendu (demande d'Arcel, 29/09/2026).
 *
 * Ce que cet outil cherche vraiment, et ce qu'il ne cherche pas : Google n'a pas de liste de
 * mots qui empêcheraient d'indexer une page. Une page n'est jamais désindexée parce qu'elle
 * contient un mot. Ce qui coûte réellement le référencement, c'est :
 *   1. un blocage technique (noindex, canonique qui pointe ailleurs, robots.txt, absence du plan
 *      de site) — c'est la seule chose qui empêche littéralement l'indexation ;
 *   2. les règles anti-spam (bourrage de mots-clés, pages quasi identiques fabriquées en série) ;
 *   3. les allégations trompeuses ou médicales, qui relèvent du droit de la consommation et de
 *      la qualité attendue d'un site de santé — elles ne désindexent pas, elles déclassent et
 *      elles exposent juridiquement.
 *
 * L'outil lit les pages HTML produites par `next build` — donc tout ce qu'un lecteur voit
 * réellement, y compris les 131 pages locales de `data/local/`, que `check-copy` ne regarde pas
 * puisqu'il ne scanne que `content/`.
 *
 * Il ne corrige rien et n'écrit que son rapport : `docs/AUDIT_TEXTES.md`.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { decodeEntities, routeOf } from "../validate/check-seo";
import { findForbiddenWords } from "../validate/check-copy";

const RACINE = process.cwd();
const RENDU = path.join(RACINE, ".next", "server", "app");

/** Frontières de mot qui respectent les lettres accentuées (`\b` ne le fait pas). */
const mot = (motif: string) => new RegExp(`(?<!\\p{L})(?:${motif})(?!\\p{L})`, "giu");

interface Risque {
  /** Famille affichée dans le rapport. */
  famille: string;
  /** Ce que l'expression coûte réellement, en une ligne. */
  motif: string;
  regex: RegExp;
  /** Expressions légitimes qui contiennent le motif et ne doivent pas être signalées. */
  exceptions?: readonly string[];
}

const risques: readonly Risque[] = [
  {
    famille: "Allégation médicale",
    motif:
      "Youdom Care accompagne, il ne soigne pas : une formulation de soin expose juridiquement et abîme la crédibilité attendue d'un site de santé.",
    regex: mot(
      "soigner|soignons|thérapies?|thérapeutiques?|diagnostiquer|prescrire|guérison|rémission",
    ),
  },
  {
    famille: "Allégation médicale",
    motif: "Affirmer un effet sur la maladie ou sur la santé demande une preuve clinique.",
    regex:
      /(?:améliore|préserve|protège|prévient|retarde|ralentit|réduit|diminue)\s+(?:la|le|les|leur|votre|son)\s+(?:santé|maladie|risques?|déclin|aggravation|évolution)/giu,
  },
  {
    famille: "Superlatif invérifiable",
    motif:
      "Une supériorité qu'on ne peut pas prouver est une pratique commerciale trompeuse (article L121-2 du code de la consommation).",
    regex: mot(
      "incontournables?|inégalée?s?|inégalables?|imbattables?|sans\\s+équivalent|référence\\s+(?:du|de\\s+la)\\s+secteur|le\\s+plus\\s+grand|la\\s+plus\\s+grande",
    ),
  },
  {
    famille: "Promesse absolue",
    motif: "Une promesse sans réserve engage sur un résultat qui ne dépend pas que de nous.",
    regex: mot(
      // « sans risque » seul n'est pas une promesse : « ne peut pas rester seule sans risque »
      // est du français juste, et le signaler ferait crier au loup (relevé du 29/09/2026).
      "à\\s+coup\\s+sûr|sans\\s+aucun\\s+risque|sans\\s+le\\s+moindre\\s+risque|zéro\\s+(?:défaut|souci|imprévu)|nous\\s+(?:garantissons|assurons\\s+que)|100\\s*%\\s*(?:satisfait|satisfaction|réussite)",
    ),
  },
  {
    famille: "Urgence artificielle",
    motif:
      "La pression commerciale n'a pas sa place face à une famille qui cherche de l'aide, et elle est repérée comme un signal de spam.",
    regex: mot(
      "offres?\\s+limitées?|dernière\\s+chance|ne\\s+tardez\\s+pas|profitez-en\\s+vite|places?\\s+limitées?|réservez\\s+vite|plus\\s+que\\s+quelques",
    ),
  },
  {
    famille: "Prix",
    motif:
      "Un prix présenté comme bas ou gratuit doit être exact et complet, sinon il est trompeur.",
    regex: mot("pas\\s+chers?|moins\\s+chers?|prix\\s+cassés?|tarifs?\\s+imbattables?|gratuité"),
  },
  {
    famille: "Avis et notation",
    motif:
      "Le site ne publie aucun avis ni aucune note : en afficher une sans collecte réelle est interdit, et Google sanctionne les balises d'avis auto-attribuées.",
    regex: mot(
      "avis\\s+clients?|notes?\\s+moyennes?|étoiles?|noté\\s+\\d|satisfaction\\s+de\\s+\\d+\\s*%|\\d+\\s*%\\s+de\\s+(?:clients|familles)\\s+satisfaits",
    ),
  },
];

/** Formulations exactes qui contiennent un motif à risque et sont pourtant justes. */
const exceptions: readonly string[] = [
  // Dispositif officiel de l'Urssaf, nommé tel quel.
  "avance immédiate",
  // Matériel, pas une promesse de soin.
  "lit médicalisé",
  // Services réellement rendus, nommés par leur nom.
  "soins infirmiers à domicile",
  "sortie d'hospitalisation",
];

/** Mots vides français, pour que la densité mesure des mots porteurs de sens. */
const motsVides = new Set(
  (
    "le la les un une des du de d au aux à et ou où ni mais donc or car que qui quoi dont " +
    "ce cet cette ces se sa son ses leur leurs notre nos votre vos mon ma mes ton ta tes " +
    "je tu il elle on nous vous ils elles me te lui y en " +
    "est sont être suis es sommes êtes était étaient sera seront soit " +
    "a ai as avons avez ont avait avaient aura auront " +
    "pas ne plus moins très trop peu bien aussi tout toute tous toutes même " +
    "pour par avec sans sous sur dans entre vers chez depuis pendant après avant " +
    "si comme quand alors ainsi cela ça c l n s t d qu jusqu lorsqu " +
    "faire fait font peut peuvent pouvez doit doivent va vont " +
    "y a-t-il elle-même lui-même"
  ).split(/\s+/),
);

interface Page {
  route: string;
  texte: string;
  mots: string[];
  noindex: boolean;
  canonique: string | null;
}

async function listerHtml(dossier: string): Promise<string[]> {
  const out: string[] = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) out.push(...(await listerHtml(complet)));
    else if (entree.name.endsWith(".html") && !entree.name.startsWith("_")) out.push(complet);
  }
  return out.sort();
}

/**
 * Texte réellement lu sur la page : le contenu du `<main>` s'il existe, sinon le corps entier,
 * débarrassé des scripts, des styles et des balises. L'en-tête et le pied de page sont écartés
 * quand `<main>` est présent : leur texte est le même partout et fausserait aussi bien la
 * densité que la détection de doublons.
 */
export function texteVisible(html: string): string {
  const principal = /<main[\s>][\s\S]*?<\/main>/i.exec(html);
  const source = principal ? principal[0] : html;
  return decodeEntities(
    source
      // Les libellés de sources citent des titres officiels (« … le traitement de la demande par
      // la MDPH ») que le site n'écrit pas lui-même : `check-copy` les ignore déjà, l'audit aussi.
      .replace(/<div class="sources-list[\s\S]*?<\/div>\s*<\/div>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Retire les formulations justes avant de chercher les motifs à risque. */
function sansExceptions(texte: string): string {
  let out = texte;
  for (const phrase of exceptions) out = out.split(phrase).join(" ");
  return out;
}

export function motsPorteurs(texte: string): string[] {
  return texte
    .toLocaleLowerCase("fr-FR")
    .split(/[^\p{L}\p{N}'’-]+/u)
    .map((m) => m.replace(/^['’-]+|['’-]+$/g, ""))
    .filter((m) => m.length > 2 && !motsVides.has(m));
}

/** Phrases d'au moins `minMots` mots, normalisées pour la comparaison entre pages. */
export function phrases(texte: string, minMots = 12): string[] {
  return texte
    .split(/(?<=[.!?…])\s+/)
    .map((p) => p.trim().toLocaleLowerCase("fr-FR").replace(/\s+/g, " "))
    .filter((p) => p.split(" ").length >= minMots);
}

function ligne(n: number, total: number): string {
  return `${n} (${((n / total) * 100).toFixed(1)} %)`;
}

async function main(): Promise<void> {
  let fichiers: string[];
  try {
    fichiers = await listerHtml(RENDU);
  } catch {
    console.error("Aucun rendu à auditer : lancez `pnpm build` avant `pnpm audit:textes`.");
    process.exitCode = 1;
    return;
  }

  const pages: Page[] = [];
  for (const fichier of fichiers) {
    const html = await readFile(fichier, "utf8");
    const relatif = path.relative(RENDU, fichier).split(path.sep).join("/");
    const texte = texteVisible(html);
    const canonique = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(html);
    pages.push({
      route: routeOf(relatif),
      texte,
      mots: motsPorteurs(texte),
      noindex: /<meta[^>]+name="robots"[^>]*content="[^"]*noindex/i.test(html),
      canonique: canonique ? canonique[1] : null,
    });
  }

  const lignes: string[] = [];
  const dire = (s = "") => lignes.push(s);

  dire("# Audit des textes du site");
  dire();
  dire(
    "Rapport produit par `pnpm audit:textes` sur les " +
      `${pages.length} pages rendues par \`next build\`. Il ne corrige rien : il signale.`,
  );
  dire();
  dire(
    "**Ce qu'il faut savoir d'abord** : Google n'a pas de liste de mots interdits qui " +
      "empêcherait d'indexer une page. Aucune page n'est retirée de l'index parce qu'elle " +
      "contient un mot. Ce qui empêche réellement l'indexation est technique (§1). Ce qui fait " +
      "reculer une page dans les résultats, ce sont les règles anti-spam (§2). Ce qui expose " +
      "juridiquement, ce sont les allégations (§3) — elles ne désindexent pas, elles coûtent " +
      "autrement.",
  );
  dire();

  /* ---------- §1 Indexabilité technique ---------- */
  dire("## 1. Ce qui empêche réellement l'indexation");
  dire();
  const noindex = pages.filter((p) => p.noindex);
  const sansCanonique = pages.filter((p) => !p.canonique);
  dire(`- Pages rendues : **${pages.length}**`);
  dire(`- Pages en \`noindex\` : **${ligne(noindex.length, pages.length)}**`);
  dire(`- Pages sans canonique : **${ligne(sansCanonique.length, pages.length)}**`);
  if (noindex.length > 0) {
    dire();
    dire("Pages en `noindex` :");
    dire();
    for (const p of noindex.slice(0, 40)) dire(`- \`${p.route}\``);
    if (noindex.length > 40) dire(`- … et ${noindex.length - 40} autres`);
  }
  if (sansCanonique.length > 0) {
    dire();
    for (const p of sansCanonique.slice(0, 20)) dire(`- sans canonique : \`${p.route}\``);
  }
  dire();

  /* ---------- §2 Règles anti-spam ---------- */
  dire("## 2. Règles anti-spam : bourrage de mots-clés et textes répétés");
  dire();
  const densites = pages
    .filter((p) => p.mots.length >= 200)
    .map((p) => {
      const compte = new Map<string, number>();
      for (const m of p.mots) compte.set(m, (compte.get(m) ?? 0) + 1);
      const [motTop, n] = [...compte.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
      return { route: p.route, mot: motTop, n, densite: (n / p.mots.length) * 100 };
    })
    .sort((a, b) => b.densite - a.densite);
  dire(
    "Densité du mot porteur le plus répété, sur les pages d'au moins 200 mots porteurs. " +
      "Au-delà d'environ 4 %, un texte commence à se lire comme écrit pour un moteur.",
  );
  dire();
  dire("| Page | Mot | Occurrences | Densité |");
  dire("| --- | --- | ---: | ---: |");
  for (const d of densites.slice(0, 15)) {
    dire(`| \`${d.route}\` | ${d.mot} | ${d.n} | ${d.densite.toFixed(2)} % |`);
  }
  dire();
  const auDela = densites.filter((d) => d.densite > 4);
  dire(
    auDela.length === 0
      ? "**Aucune page ne dépasse 4 %.**"
      : `**${auDela.length} page(s) dépassent 4 %** et méritent une relecture.`,
  );
  dire();
  dire(
    "Une densité élevée n'est pas une faute en soi : une page de lexique qui définit le CESU " +
      "répète « CESU », et la page des mentions légales aligne autant de liens « photo N » " +
      "qu'elle crédite de photographies. Le bourrage commence quand le mot est répété **sans " +
      "que la phrase en ait besoin**. C'est la lecture des extraits, pas le chiffre, qui tranche.",
  );
  dire();

  const compteurPhrases = new Map<string, string[]>();
  for (const p of pages) {
    for (const ph of new Set(phrases(p.texte))) {
      const liste = compteurPhrases.get(ph) ?? [];
      liste.push(p.route);
      compteurPhrases.set(ph, liste);
    }
  }
  const repetees = [...compteurPhrases.entries()]
    .filter(([, routes]) => routes.length >= 5 && routes.length < pages.length * 0.9)
    .sort((a, b) => b[1].length - a[1].length);
  dire(
    "Phrases d'au moins douze mots qui reviennent sur cinq pages ou plus, hors gabarit commun " +
      "à presque tout le site. Une famille de pages qui partagent leurs phrases est ce que " +
      "Google appelle une page satellite.",
  );
  dire();
  if (repetees.length === 0) {
    dire("**Aucune phrase longue n'est partagée par cinq pages ou plus.**");
  } else {
    dire("| Pages | Phrase |");
    dire("| ---: | --- |");
    for (const [ph, routes] of repetees.slice(0, 20)) {
      const extrait = ph.length > 120 ? `${ph.slice(0, 117)}…` : ph;
      dire(`| ${routes.length} | ${extrait} |`);
    }
    if (repetees.length > 20) {
      dire();
      dire(`… et ${repetees.length - 20} autres phrases partagées.`);
    }
    dire();
    dire(
      "**Comment lire ce tableau.** Les phrases partagées par une centaine de pages viennent du " +
        "gabarit des pages locales — rail de conversion, cartes d'aides, ligne d'auteur — et non " +
        "du texte propre à chaque commune. Ce texte-là est mesuré à part par " +
        "`check-local-uniqueness`, qui compare des suites de mots entre pages voisines : la " +
        "similarité la plus haute relevée est de 0,141 pour un seuil d'alerte à 0,30. Autrement " +
        "dit, le corps éditorial est bien propre à chaque ville. Ce qu'il faut surveiller, c'est " +
        "le **rapport** entre ce gabarit et le texte unique : plus le gabarit pèse, plus la " +
        "famille de pages ressemble à une série fabriquée.",
    );
  }
  dire();

  /* ---------- §3 Allégations ---------- */
  dire("## 3. Mots et tournures à risque");
  dire();
  const parFamille = new Map<
    string,
    { route: string; extrait: string; motif: string; contexte: string }[]
  >();
  const ajouter = (
    famille: string,
    motif: string,
    route: string,
    extrait: string,
    contexte: string,
  ) => {
    const liste = parFamille.get(famille) ?? [];
    liste.push({ route, extrait, motif, contexte });
    parFamille.set(famille, liste);
  };
  /*
   * Une négation retourne le sens : « nous ne soignons pas » est justement la phrase que le
   * cahier demande d'écrire, et « sans la présenter comme une activité thérapeutique, ce qu'elle
   * n'est pas » dit le contraire de ce que le motif cherche. Signaler ces phrases ferait crier
   * au loup et noierait les vrais défauts (relevé du 29/09/2026).
   */
  const niee = (avant: string) => /(?:\bne\b|\bn'|jamais|\bpas\b|\bsans\b)\s+\S*\s*$/iu.test(avant);
  for (const p of pages) {
    const propre = sansExceptions(p.texte);
    for (const label of findForbiddenWords(propre)) {
      ajouter("Mot déjà interdit par le cahier", "Liste de `check-copy`.", p.route, label, "");
    }
    for (const risque of risques) {
      risque.regex.lastIndex = 0;
      for (const trouve of propre.matchAll(risque.regex)) {
        const debut = trouve.index ?? 0;
        if (niee(propre.slice(Math.max(0, debut - 30), debut))) continue;
        const contexte = propre.slice(Math.max(0, debut - 70), debut + trouve[0].length + 70);
        ajouter(risque.famille, risque.motif, p.route, trouve[0].toLowerCase(), contexte);
      }
    }
  }
  if (parFamille.size === 0) {
    dire("**Aucune tournure à risque trouvée sur les pages rendues.**");
  } else {
    for (const [famille, hits] of parFamille) {
      dire(`### ${famille}`);
      dire();
      dire(`_${hits[0].motif}_`);
      dire();
      const parExtrait = new Map<string, { routes: string[]; contexte: string }>();
      for (const h of hits) {
        const entree = parExtrait.get(h.extrait) ?? { routes: [], contexte: h.contexte };
        entree.routes.push(h.route);
        parExtrait.set(h.extrait, entree);
      }
      // La phrase autour du mot est ce qui permet de juger : le mot seul ne dit rien.
      dire("| Expression | Pages | Exemple | Dans la phrase |");
      dire("| --- | ---: | --- | --- |");
      for (const [extrait, { routes, contexte }] of [...parExtrait.entries()].sort(
        (a, b) => b[1].routes.length - a[1].routes.length,
      )) {
        const phrase = contexte.replace(/\|/g, "/");
        dire(`| ${extrait} | ${routes.length} | \`${routes[0]}\` | …${phrase}… |`);
      }
      dire();
    }
  }

  /* ---------- §4 Ce qui a été jugé ---------- */
  dire("## 4. Ce qui a été examiné et retenu comme juste");
  dire();
  dire(
    "Relevés du 29 septembre 2026. Ces formulations reviennent dans le tableau ci-dessus et " +
      "ont été lues en contexte : elles sont justes et ne doivent pas être corrigées.",
  );
  dire();
  dire("| Formulation | Pourquoi elle reste |");
  dire("| --- | --- |");
  for (const [quoi, pourquoi] of [
    [
      "« Accueil de jour thérapeutique », « appartement thérapeutique »",
      "Noms propres d'établissements repris des données ouvertes, pas une activité que Youdom Care revendique.",
    ],
    [
      "« vous soigner, vous reposer » (/aidants/)",
      "S'adresse au proche aidant qui prend soin de lui-même. Aucune prestation de soin n'est promise.",
    ],
    ["« prescrire ce qui relève du soin »", "Décrit ce que fait le médecin, pas Youdom Care."],
    [
      "« le plus grand établissement recensé dans la commune »",
      "Fait vérifiable tiré des données ouvertes, sur un tiers, avec le nombre de places à côté.",
    ],
    [
      "« la plus grande superficie des Hauts-de-Seine »",
      "Fait géographique vérifiable, chiffre à l'appui.",
    ],
    [
      "« Aucun conseil sur un traitement : parlez-en à votre médecin »",
      "Avertissement de santé exigé par le cahier. Il contient le mot qu'il sert à écarter.",
    ],
    [
      "Densité forte sur /mentions-legales/, /plan-du-site/ et le lexique",
      "Listes de crédits, d'arrondissements ou définition d'un sigle : la répétition est structurelle, pas rédactionnelle.",
    ],
  ]) {
    dire(`| ${quoi} | ${pourquoi} |`);
  }
  dire();

  const rapport = path.join(RACINE, "docs", "AUDIT_TEXTES.md");
  await writeFile(rapport, `${lignes.join("\n")}\n`, "utf8");
  console.log(`${pages.length} pages auditées → docs/AUDIT_TEXTES.md`);
  console.log(`  noindex : ${noindex.length} · sans canonique : ${sansCanonique.length}`);
  console.log(`  densité > 4 % : ${auDela.length} page(s)`);
  console.log(`  phrases partagées par 5 pages ou plus : ${repetees.length}`);
  console.log(`  familles de tournures à risque : ${parFamille.size}`);
}

await main();
