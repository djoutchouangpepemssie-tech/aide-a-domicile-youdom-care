import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide de styles — Youdom Care",
  robots: { index: false, follow: false },
};

// Les valeurs viennent de src/styles/tokens.css : ici on ne liste que les noms de jetons.
const swatches = [
  { group: "Encre", tokens: ["ink", "ink-soft"] },
  {
    group: "Bleu canard",
    tokens: ["teal-50", "teal-500", "teal-600", "teal-700", "teal-800", "teal-900"],
  },
  { group: "Vert", tokens: ["green-50", "green-500", "green-700"] },
  {
    group: "Framboise",
    tokens: ["raspberry-50", "raspberry-500", "raspberry-600", "raspberry-700"],
  },
  { group: "Azur", tokens: ["azure-50", "azure-600", "azure-700"] },
  { group: "Fonds et filets", tokens: ["paper", "sand", "white", "line", "field-border"] },
  { group: "États", tokens: ["danger", "danger-bg", "warning", "warning-bg"] },
] as const;

export default function StyleguidePage() {
  return (
    <main className="container-site py-12">
      <p className="text-small text-text-soft">Page de travail, non indexée.</p>
      <h1>Guide de styles « Le Fil »</h1>
      <p className="text-lead mt-4">Vous, chez vous. Nous, à vos côtés.</p>

      <section aria-labelledby="typo" className="mt-12">
        <h2 id="typo">Typographie</h2>
        <p className="mt-4">
          Titres en Fraunces, texte et interface en Atkinson Hyperlegible Next. Le texte courant
          fait 17 px sur mobile et 18 px sur ordinateur, avec un interligne de 1,65.
        </p>
        <h3 className="mt-6">Un titre de niveau trois, en Fraunces 600</h3>
        <h4 className="mt-4">Un titre de niveau quatre, en Atkinson 700</h4>
        <p className="mt-4">
          Lettres différenciées : Il1 O0 rn m — la police a été dessinée pour la basse vision.
        </p>
        <p className="mt-4">
          <span className="figure text-h2">1 234,56 €</span>{" "}
          <span className="text-small text-text-soft">chiffre important en Fraunces 560</span>
        </p>
        <p className="tabular-figures mt-2">Chiffres tabulaires : 11 111 · 22 222 · 33 333</p>
        <p className="mt-4">
          <a href="#typo">Un lien en teal-700</a>
        </p>
      </section>

      <section aria-labelledby="couleurs" className="mt-12">
        <h2 id="couleurs">Couleurs</h2>
        {swatches.map((group) => (
          <div key={group.group} className="mt-6">
            <h3 className="text-h4">{group.group}</h3>
            <ul className="mt-3 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-6">
              {group.tokens.map((token) => (
                <li key={token} className="rounded-card border border-line bg-white p-2 shadow-1">
                  <div
                    aria-hidden="true"
                    className="h-12 rounded-field border border-line"
                    style={{ backgroundColor: `var(--color-${token})` }}
                  />
                  <code className="text-small mt-2 block">{token}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="formes" className="mt-12">
        <h2 id="formes">Formes et profondeur</h2>
        <div className="mt-6 flex flex-wrap gap-6">
          <div className="rounded-field border border-field-border bg-white px-4 py-3">
            Champ, 10 px
          </div>
          <div className="rounded-button bg-action px-6 py-4 font-bold text-white">
            Bouton, 14 px
          </div>
          <div className="rounded-card border border-line bg-white p-6 shadow-1">
            Carte, 20 px, ombre 1
          </div>
          <div className="rounded-block bg-tint-teal p-8 shadow-2">Grand bloc, 28 px, ombre 2</div>
        </div>
      </section>
    </main>
  );
}
