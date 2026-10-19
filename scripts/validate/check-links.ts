import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { result, type Check, type CheckContext, type CheckResult } from "./types";

/*
 * Point de validation 4 (docs/PLAN.md) : aucun lien interne cassé dans `content/`. Le contrôle
 * relève tous les chemins internes (« /… / ») des JSON (toute valeur de chaîne, `href`,
 * `chemin`, `pilier`, `soeurs`…) et des MDX (en-tête et liens Markdown du corps), puis vérifie
 * que chaque page existe dans le rendu produit par `next build` (.next/server/app/**\/*.html),
 * ce qui couvre les routes statiques, les routes dynamiques prérendues et les pages MDX.
 *
 * Les pages prévues par le plan mais pas encore livrées (navigation, pied de page) sont
 * listées ci-dessous avec leur phase : elles produisent un avertissement, pas une erreur, et
 * chaque entrée est retirée quand la page est construite. Toute autre cible absente est une
 * erreur. Les liens externes cités comme sources (`sources[].href`, docs/07 §7) sont ouverts
 * une fois chacun (GET, 10 s, redirections suivies) : une réponse 4xx/5xx est une erreur ; une
 * connexion refusée ou un délai dépassé (site qui bloque les robots, réseau) est un
 * avertissement à vérifier à la main. `YC_LINKS_OFFLINE=1` saute cette partie.
 */

/** Pages annoncées par docs/PLAN.md et pas encore construites (phase entre parenthèses). */
export const plannedRoutes: Readonly<Record<string, string>> = {};

const internalHref = /^\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+\/?)?(?:[?#].*)?$/;

export interface LinkRef {
  file: string;
  pointer: string;
  href: string;
}

/** Normalise un chemin interne : sans requête ni fragment, avec barre finale. */
export function normalizeInternal(href: string): string {
  const bare = href.split(/[?#]/)[0] ?? "";
  if (bare === "" || bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

export function isInternalHref(value: string): boolean {
  return internalHref.test(value) && !value.startsWith("//");
}

function walkJson(
  value: unknown,
  pointer: string,
  onString: (text: string, pointer: string) => void,
) {
  if (typeof value === "string") {
    onString(value, pointer);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => walkJson(item, `${pointer}[${index}]`, onString));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key.startsWith("_")) continue;
      walkJson(item, pointer ? `${pointer}.${key}` : key, onString);
    }
  }
}

const markdownLink = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/** Adresses externes citées comme sources (`sources[].href`, `lien_officiel.href` du lexique) d'un JSON ou d'un MDX. */
export function extractSourceUrls(raw: string, isJson: boolean): string[] {
  const data: unknown = isJson ? JSON.parse(raw) : matter(raw).data;
  const urls: string[] = [];
  const walk = (value: unknown, underSources: boolean) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, underSources));
    } else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (key.startsWith("_")) continue;
        if (
          underSources &&
          key === "href" &&
          typeof item === "string" &&
          /^https?:\/\//.test(item)
        ) {
          urls.push(item);
        } else {
          walk(item, underSources || key === "sources" || key === "lien_officiel");
        }
      }
    }
  };
  walk(data, false);
  return urls;
}

export interface ExternalReport {
  /** 404 et 410 : la source n'existe plus à cette adresse, le lien est à corriger. */
  errors: string[];
  /**
   * Adresses à vérifier à la main sans que le contrôle échoue : connexion refusée, délai dépassé,
   * et réponses qui disent « filtré » plutôt que « disparu » (401, 403, 429, 5xx).
   */
  warnings: string[];
  /** Adresses qui ont vraiment répondu (quel que soit le code), sur le total d'adresses distinctes. */
  reached: number;
  total: number;
}

/**
 * Codes de réponse qui prouvent la disparition d'une page. Tout le reste (401, 403, 429, 5xx) est
 * un refus de nous répondre, pas un lien mort : plusieurs sources publiques (service-public.gouv.fr,
 * santepubliquefrance.fr, pour-les-personnes-agees.gouv.fr) filtrent les agents non-navigateurs et
 * répondent 403 à ce contrôle alors que leurs pages sont en ligne. Les traiter en erreur rendrait
 * la CI rouge au hasard de l'adresse du poste qui l'exécute.
 *
 * Attention : 404 ne prouve la disparition que si l'on interroge comme un visiteur. Mesuré le
 * 13/10/2026, pour-les-personnes-agees.gouv.fr répond **404** — et non 403 — aux agents qui
 * s'annoncent comme des robots, pour des pages qui renvoient 200 depuis un navigateur. D'où
 * `BROWSER_USER_AGENT` ci-dessous : sans lui, trois sources vivantes étaient déclarées mortes
 * (D-080).
 */
const goneStatuses = new Set([404, 410]);

/**
 * Agent annoncé aux sources externes. Volontairement celui d'un navigateur, sans jeton de robot :
 * la question posée est « cette page répond-elle à un visiteur ? », et c'est la seule chaîne dont
 * on ait la preuve qu'elle obtient 200 sur les trois pages que la CI déclarait 404 (mesure du
 * 13/10/2026 depuis un poste avec réseau). Y rajouter « compatible; YoudomCare-check-links/1.0 »
 * suffit à faire répondre 404 au portail : ne pas le remettre sans refaire la mesure.
 */
const BROWSER_USER_AGENT = "Mozilla/5.0";

/**
 * Répartit les adresses en tour de rôle entre les hôtes, pour que deux appels au même service ne
 * partent pas en même temps. Avec six requêtes simultanées et une file groupée par hôte, six
 * adresses d'un même service partaient ensemble : c'est précisément ce qui fait répondre « refus »
 * — et, sur pour-les-personnes-agees.gouv.fr, ce refus prend la forme d'un 404 (D-080, D-084).
 * Espacer les appels d'un même hôte ne ralentit rien : le nombre total de requêtes est le même.
 */
export function spreadByHost(urls: readonly string[]): string[] {
  const parHote = new Map<string, string[]>();
  for (const url of urls) {
    let hote = url;
    try {
      hote = new URL(url).host;
    } catch {
      /* adresse non analysable : son propre groupe, elle sera ouverte comme les autres */
    }
    const groupe = parHote.get(hote);
    if (groupe) groupe.push(url);
    else parHote.set(hote, [url]);
  }
  const groupes = [...parHote.values()];
  const out: string[] = [];
  for (let rang = 0; out.length < urls.length; rang += 1) {
    for (const groupe of groupes) {
      const url = groupe[rang];
      if (url !== undefined) out.push(url);
    }
  }
  return out;
}

/**
 * Ouvre chaque adresse (GET, 10 s, redirections suivies) et **confirme toute disparition par un
 * second appel**, après une pause et hors de la rafale.
 *
 * Pourquoi la confirmation. Mesuré les 13/10/2026 sur deux runs de CI :
 * pour-les-personnes-agees.gouv.fr répond 404 à une partie des requêtes quand on lui en envoie six
 * à la fois, et **l'adresse qui échoue change d'un run à l'autre** — trois pages au premier run,
 * une quatrième au suivant, dont le parent répond 200. Ce n'est pas la page qui manque, c'est
 * l'hôte qui refuse sous charge, en se présentant comme une page disparue. Une page vraiment
 * disparue, elle, répond 404 deux fois : le contrôle ne perd donc rien, il cesse seulement de
 * rendre la CI rouge au hasard de l'ordre des requêtes (D-080).
 */
export async function checkExternal(
  urls: readonly string[],
  fetchImpl: typeof fetch = fetch,
  concurrency = 6,
  recheckDelayMs = 4_000,
  /** Pause avant la **troisième** tentative, plus longue : l'hôte doit avoir le temps de souffler. */
  thirdTryDelayMs = 20_000,
): Promise<ExternalReport> {
  const unique = spreadByHost([...new Set(urls)]);
  const failures: string[] = [];
  const unreachable: string[] = [];
  let reached = 0;
  let index = 0;
  /** Adresses qui ont répondu « disparue » pendant la rafale, à confirmer hors rafale. */
  const candidates: [string, number][] = [];
  const open = (url: string) =>
    fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
  const worker = async () => {
    while (index < unique.length) {
      const url = unique[index];
      index += 1;
      if (!url) continue;
      try {
        const response = await open(url);
        reached += 1;
        if (goneStatuses.has(response.status)) {
          // Rien n'est conclu ici : la confirmation a lieu après la rafale, une à la fois.
          candidates.push([url, response.status]);
        } else if (response.status >= 400) {
          unreachable.push(
            `${url} → HTTP ${response.status} (refus de répondre, pas une page disparue), à vérifier à la main`,
          );
        }
      } catch (error) {
        const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
        const reason = cause?.message ?? (error instanceof Error ? error.name : "erreur");
        unreachable.push(`${url} → injoignable depuis ce poste (${reason}), à vérifier à la main`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));

  /*
   * Confirmation des disparitions, **après** la rafale et **une adresse à la fois**. La première
   * version rappelait l'adresse sur place, après une pause : inutile, puisque cinq autres requêtes
   * continuaient pendant ce temps de marteler le même hôte — la vérification se faisait dans la
   * rafale qu'elle devait écarter. Mesuré sur quatre runs de CI : à chacun, un sous-ensemble
   * différent d'adresses de pour-les-personnes-agees.gouv.fr répondait 404, y compris des adresses
   * vertes au run précédent, et l'une s'est blanchie au second appel. Une page disparue ne
   * ressuscite pas : c'est l'hôte qui refuse sous charge (D-084).
   */
  for (const [url, first] of candidates) {
    await new Promise((resolve) => setTimeout(resolve, recheckDelayMs));
    try {
      const second = await open(url);
      if (!goneStatuses.has(second.status)) {
        unreachable.push(
          `${url} → HTTP ${first} pendant la rafale, ${second.status} hors rafale : hôte qui refuse sous charge, pas une page disparue`,
        );
        continue;
      }
      /*
       * **Troisième tentative, après vingt secondes.** Mesuré le 19/10/2026, exécution 54 de la
       * CI : `pour-les-personnes-agees.gouv.fr` a déclaré disparues deux de ses pages, deux fois
       * chacune. Interrogées depuis un autre poste, l'une répond 404 puis 200 à quelques secondes
       * d'intervalle — elle est vivante — et l'autre répond 404 quatre fois de suite : celle-là
       * avait vraiment changé d'adresse, et le contrôle avait raison.
       *
       * Deux refus consécutifs ne suffisent donc pas à distinguer les deux cas sur cet hôte, et
       * une CI rouge au hasard finit par ne plus être lue. Rien n'est relâché : une page vraiment
       * disparue répond 404 aux trois appels, à vingt secondes d'écart — c'est ce qui s'est passé
       * pour celle qui l'était.
       */
      await new Promise((resolve) => setTimeout(resolve, thirdTryDelayMs));
      const third = await open(url);
      if (goneStatuses.has(third.status)) {
        failures.push(`${url} → HTTP ${third.status}`);
      } else {
        unreachable.push(
          `${url} → HTTP ${first} puis ${second.status}, enfin ${third.status} : hôte qui refuse sous charge, pas une page disparue`,
        );
      }
    } catch (error) {
      const cause = error instanceof Error && error.cause instanceof Error ? error.cause : null;
      const reason = cause?.message ?? (error instanceof Error ? error.name : "erreur");
      unreachable.push(
        `${url} → HTTP ${first} pendant la rafale, puis injoignable (${reason}) : à vérifier à la main`,
      );
    }
  }
  return {
    errors: failures.sort(),
    warnings: unreachable.sort(),
    reached,
    total: unique.length,
  };
}

/** Liens internes d'un fichier JSON ou MDX de `content/`. */
export function extractLinks(file: string, raw: string): LinkRef[] {
  const refs: LinkRef[] = [];
  const push = (href: string, pointer: string) => {
    if (isInternalHref(href)) refs.push({ file, pointer, href });
  };
  if (file.endsWith(".json")) {
    walkJson(JSON.parse(raw), "", push);
    return refs;
  }
  const { data, content } = matter(raw);
  walkJson(data, "", push);
  for (const match of content.matchAll(markdownLink)) {
    push(match[1] ?? "", "corps");
  }
  return refs;
}

async function listContentFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listContentFiles(full)));
    else if (/\.(json|mdx)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

/** Chemins des pages construites, d'après les fichiers HTML de `.next/server/app`. */
export async function builtRoutes(outputDir: string): Promise<Set<string>> {
  const routes = new Set<string>();
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) {
        const rel = path
          .relative(outputDir, full)
          .replace(/\\/g, "/")
          .replace(/\.html$/, "");
        routes.add(rel === "index" ? "/" : `/${rel}/`);
      }
    }
  };
  await walk(outputDir);
  return routes;
}

export interface LinksReport {
  errors: string[];
  warnings: string[];
}

export function checkRefs(refs: LinkRef[], routes: Set<string>, rootDir: string): LinksReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const target = normalizeInternal(ref.href);
    if (routes.has(target)) continue;
    const key = `${ref.file}|${ref.pointer}|${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const where = `${path.relative(rootDir, ref.file).replace(/\\/g, "/")} › ${ref.pointer}`;
    const planned = plannedRoutes[target];
    if (planned) warnings.push(`${where} : ${target} prévu en ${planned}, pas encore construit`);
    else errors.push(`${where} : lien interne cassé → ${target}`);
  }
  return { errors, warnings };
}

export async function runLinksCheck(ctx: CheckContext): Promise<CheckResult> {
  const outputDir = path.join(ctx.rootDir, ".next", "server", "app");
  try {
    await stat(outputDir);
  } catch {
    return result([
      "aucun rendu à contrôler : lancez `pnpm build` avant `pnpm validate` (.next/server/app absent).",
    ]);
  }
  const routes = await builtRoutes(outputDir);
  const refs: LinkRef[] = [];
  const sourceUrls: string[] = [];
  for (const file of await listContentFiles(path.join(ctx.rootDir, "content"))) {
    const raw = await readFile(file, "utf8");
    refs.push(...extractLinks(file, raw));
    sourceUrls.push(...extractSourceUrls(raw, file.endsWith(".json")));
  }
  const report = checkRefs(refs, routes, ctx.rootDir);
  if (process.env.YC_LINKS_OFFLINE) {
    report.warnings.push(
      `${new Set(sourceUrls).size} source(s) externe(s) non ouvertes (YC_LINKS_OFFLINE)`,
    );
  } else {
    const external = await checkExternal(sourceUrls);
    for (const failure of external.errors) report.errors.push(`source externe : ${failure}`);
    for (const warning of external.warnings) report.warnings.push(`source externe : ${warning}`);
    // Sans réseau, aucune adresse ne répond et toutes deviennent des avertissements : le contrôle
    // passe au vert sans avoir rien éprouvé. Le dire, pour qu'un « validate vert » depuis un poste
    // fermé ne soit pas lu comme « les sources répondent » (D-080).
    if (external.total > 0 && external.reached === 0) {
      report.warnings.push(
        `source externe : 0 des ${external.total} adresses n'a répondu depuis ce poste — les liens externes ne sont pas éprouvés ici, seule la CI les vérifie`,
      );
    }
  }
  for (const route of Object.keys(plannedRoutes)) {
    if (routes.has(route)) {
      report.errors.push(
        `${route} est construit : retirer l'entrée de plannedRoutes (check-links)`,
      );
    }
  }
  return result(report.errors, report.warnings);
}

export const checkLinks: Check = {
  id: "check-links",
  description:
    "un lien interne de content/ vise une page absente du rendu (hors pages prévues par le plan, signalées) ; une source externe ne répond pas",
  run: runLinksCheck,
};
