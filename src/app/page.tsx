import { getSiteConfig } from "@/content/loader";

export default function Home() {
  const { marque } = getSiteConfig();
  return (
    <main id="contenu" className="container-site py-12">
      <h1>{marque.nom}</h1>
      <p className="text-lead mt-4">{marque.signature}</p>
    </main>
  );
}
