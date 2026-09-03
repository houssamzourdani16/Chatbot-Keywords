import Link from "next/link";
import ChatPreview from "@/components/ChatPreview";

const FEATURES = [
  {
    icon: "🤖",
    title: "Agent IA avancé",
    desc: "Un assistant intelligent qui comprend le darija, l'arabe et le français, et répond avec la personnalité de votre marque.",
  },
  {
    icon: "⚡",
    title: "Réponse en 2 secondes",
    desc: "Chaque message arrive sur Messenger et reçoit une réponse instantanée, tout en gardant le contexte complet de la conversation.",
  },
  {
    icon: "🔌",
    title: "Intégration n8n",
    desc: "Connectez votre workflow n8n en un clic. L'agent déclenche des scénarios, envoie à votre CRM et centralise tout.",
  },
  {
    icon: "🏷️",
    title: "Détection de mots-clés",
    desc: "Reconnaît automatiquement vos mots-clés depuis Google Sheets et envoie l'intention du client à votre équipe.",
  },
  {
    icon: "📊",
    title: "Scoring de leads",
    desc: "Détecte nom, téléphone, budget et intérêt dans chaque conversation pour qualifier vos prospects automatiquement.",
  },
  {
    icon: "🌐",
    title: "Multilingue",
    desc: "Darija, arabe, français, anglais : l'agent comprend et répond dans la langue de votre client, naturellement.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connectez Messenger",
    desc: "Créez votre produit et collez votre webhook. La vérification Meta se configure en quelques secondes.",
  },
  {
    num: "02",
    title: "Paramétrez votre agent",
    desc: "Choisissez votre modèle IA, vos mots-clés, votre Google Sheet et la personnalité de votre assistant.",
  },
  {
    num: "03",
    title: "Laissez l'IA répondre",
    desc: "Chaque message est analysé, joint au bon contexte et envoyé à n8n. Vos clients sont servis 24/7.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Nos clients étaient servis en quelques secondes au lieu de minutes. L'agent comprend le darija à la perfection.",
    name: "Yassine El Amrani",
    role: "Fondateur, Boutique en ligne — Casablanca",
  },
  {
    quote:
      "La détection de mots-clés et le scoring de leads nous ont fait gagner un temps colossal. C'est notre meilleure vendeuse.",
    name: "Sara Benali",
    role: "Responsable e-commerce — Fès",
  },
  {
    quote:
      "Integration n8n ultra simple. Tout circule vers notre CRM sans aucune intervention manuelle.",
    name: "Mehdi Tazi",
    role: "CTO, Agence digitale — Rabat",
  },
];

const FAQS = [
  {
    q: "Quel modèle IA utilise votre agent ?",
    a: "Vous choisissez votre meilleur modèle via votre webhook n8n. L'agent envoie le contexte complet de la conversation à votre workflow, qui renvoie la réponse intelligente.",
  },
  {
    q: "Est-il compatible avec Messenger / Facebook ?",
    a: "Oui. Notre webhook gère nativement le format Meta (verification + messages), donc la connexion à votre page Messenger est directe et fiable.",
  },
  {
    q: "Le darija est-il vraiment pris en charge ?",
    a: "Absolument. L'agent détecte vos mots-clés en darija, arabe et français depuis votre Google Sheet et répond dans la langue du client.",
  },
  {
    q: "Puis-je connecter mon propre n8n ?",
    a: "Oui, chaque produit possède sa propre webhook n8n. Vous gardez le contrôle total de vos scénarios, votre CRM et vos accessoires.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06070d] text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#06070d]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-fuchsia-500 to-blue-600 text-lg shadow-lg shadow-blue-600/30">
              IA
            </span>
            <span className="text-lg font-bold tracking-tight">
              Mes<span className="text-blue-400">sage</span>IA
            </span>
          </div>
          <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Fonctionnalités
            </a>
            <a href="#how" className="transition-colors hover:text-white">
              Comment ça marche
            </a>
            <a
              href="#testimonials"
              className="transition-colors hover:text-white"
            >
              Témoignages
            </a>
            <a href="#faq" className="transition-colors hover:text-white">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-gray-300 transition-colors hover:text-white sm:block"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-linear-to-r from-fuchsia-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform hover:scale-[1.03]"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-128 w-3xl -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute -left-32 top-64 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -right-32 top-40 h-80 w-80 rounded-full bg-indigo-600/20 blur-[100px]" />

        <div className="relative mx-auto grid max-w-7xl gap-16 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-8 lg:py-28">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              IA pour Messenger · 4.9/5
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              L'assistant{" "}
              <span className="bg-linear-to-r from-fuchsia-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                IA
              </span>{" "}
              qui répond à vos clients Messenger
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400 lg:mx-0">
              Répondez en 2 secondes, comprenez le darija, détectez les
              intentions et qualifiez vos leads automatiquement grâce à un agent
              avancé piloté par n8n.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="w-full rounded-xl bg-linear-to-r from-fuchsia-600 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-transform hover:scale-[1.03] sm:w-auto"
              >
                Essayer gratuitement
              </Link>
              <Link
                href="#how"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-8 py-3.5 text-base font-semibold text-gray-200 transition-colors hover:bg-white/10 sm:w-auto"
              >
                Voir la démo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 lg:justify-start">
              <span>✓ Sans carte bancaire</span>
              <span>✓ Installation en 2 min</span>
              <span>✓ 24/7</span>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <ChatPreview />
          </div>
        </div>

        {/* Social proof strip */}
        <div className="relative border-t border-white/5 bg-white/2">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 text-center sm:grid-cols-4 sm:px-8">
            {[
              ["50K+", "Conversations servies"],
              ["3s", "Délai moyen de réponse"],
              ["98%", "Taux de satisfaction"],
              ["24/7", "Disponibilité"],
            ].map(([stat, label]) => (
              <div key={label}>
                <p className="text-2xl font-extrabold text-white">{stat}</p>
                <p className="mt-1 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-fuchsia-400">
            Fonctionnalités
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tout ce qu'il faut pour un service client 5 étoiles
          </h2>
          <p className="mt-4 text-gray-400">
            Un agent pensé pour les commerces qui vendent sur Messenger,
            WhatsApp et les réseaux au Maroc et dans le monde.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/5 bg-white/3 p-6 transition-all hover:border-fuchsia-500/30 hover:bg-white/6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-fuchsia-600/20 to-blue-600/20 text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-y border-white/5 bg-white/2">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">
              Comment ça marche
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              En 3 étapes, votre agent est en ligne
            </h2>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                <div className="rounded-2xl border border-white/5 bg-[#0b0f1a] p-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-600 to-blue-600 text-sm font-bold text-white">
                    {s.num}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {s.desc}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-2xl text-gray-600 lg:block">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        id="testimonials"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Témoignages
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Ils font confiance à MessageIA
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-white/5 bg-white/3 p-6"
            >
              <div className="text-sm text-amber-400">★★★★★</div>
              <p className="mt-4 text-sm leading-relaxed text-gray-300">
                “{t.quote}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-500 to-blue-600 font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/5 bg-white/2">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-fuchsia-400">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/5 bg-white/3 p-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {item.q}
                  <span className="ml-4 text-gray-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-r from-fuchsia-600 via-purple-600 to-blue-600 px-6 py-16 text-center shadow-2xl shadow-blue-600/20">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-white/20 blur-[80px]" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Prêt à répondre à vos clients 24/7 ?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-white/90">
            Rejoignez des centaines de commerces qui automatisent leur service
            client sur Messenger grâce à un agent IA avancé.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-fuchsia-700 transition-transform hover:scale-[1.03] sm:w-auto"
            >
              Créer mon compte gratuit
            </Link>
            <Link
              href="/login"
              className="w-full rounded-xl border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-fuchsia-500 to-blue-600 text-xs">
              IA
            </span>
            <span className="font-semibold text-gray-300">MessageIA</span>
          </div>
          <p>© 2026 MessageIA. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
