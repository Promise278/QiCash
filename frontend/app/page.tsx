import Image from "next/image";

const features = [
  {
    title: "Private by default",
    description:
      "Keep transaction details protected while still proving payment intent, ownership, and settlement status to the right parties.",
  },
  {
    title: "Built for campuses",
    description:
      "Designed for students, student unions, cafeterias, bookstores, and vendors that need faster daily settlement without friction.",
  },
  {
    title: "Trust without friction",
    description:
      "Verify identity, attestation, and order status in one flow so customers can pay with confidence and merchants can move faster.",
  },
  {
    title: "Low-cost settlement",
    description:
      "Optimized for repeat campus spending, with a simpler path from checkout to settlement than traditional banking lanes.",
  },
  {
    title: "Auditable records",
    description:
      "Create a verifiable trail for dispute handling, merchants, and internal finance teams without exposing unnecessary data.",
  },
  {
    title: "Scales with communities",
    description:
      "From one campus to a multi-venue ecosystem, the system supports more merchants and more payment flows without growing complexity.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create intent",
    text: "A student or merchant defines a payment request with a verified commitment and clear amount details.",
  },
  {
    number: "02",
    title: "Verify & approve",
    text: "The system checks the vendor, attestation, and settlement conditions before the payment is accepted.",
  },
  {
    number: "03",
    title: "Settle & reconcile",
    text: "Once confirmed, funds are recorded, receipts are generated, and the audit trail is maintained for review.",
  },
];

const stats = [
  { value: "2.4x", label: "faster checkout" },
  { value: "89%", label: "less payment friction" },
  { value: "24/7", label: "merchant clarity" },
  { value: "100%", label: "privacy-first design" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f0eb] text-[#16352f]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="sticky top-0 z-20 rounded-full border border-[#d9e4df] bg-[#f3f0eb]/80 px-4 py-3 backdrop-blur-xl shadow-[0_10px_30px_rgba(20,35,30,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <Image src="/qicash-logo.png" alt="QiCash logo" className="rounded-full" width={34} height={34} priority />
              </div>
              <span className="text-base font-semibold tracking-[0.12em] text-[#1f413a] uppercase">
                QiCash
              </span>
            </div>

            <nav className="hidden items-center gap-7 text-sm font-medium text-[#325b53] md:flex">
              <a href="#product" className="transition hover:text-[#173f37]">Product</a>
              <a href="#security" className="transition hover:text-[#173f37]">Security</a>
              <a href="#how-it-works" className="transition hover:text-[#173f37]">How it works</a>
              <a href="#about" className="transition hover:text-[#173f37]">About</a>
            </nav>

            <button className="rounded-full bg-[#1d4f45] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(29,79,69,0.22)] transition hover:bg-[#173d36]">
              Launch app
            </button>
          </div>
        </header>

        <section className="pt-10 pb-8 sm:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#d4e2dc] bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2f564e]">
                Private campus payments
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.06em] text-[#173b35] sm:text-5xl lg:text-6xl">
                Pay smarter.
                <span className="block text-[#1d4f45]">Stay private.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-[#4f655f] sm:text-lg">
                QiCash gives students and campus merchants a secure payment experience built for privacy, trust, and instant verification without the usual banking friction.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button className="rounded-full bg-[#1d4f45] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_35px_rgba(29,79,69,0.22)] transition hover:bg-[#173d36]">
                  Join waitlist
                </button>
                <button className="rounded-full border border-[#1d4f45]/20 bg-white/60 px-7 py-3.5 text-sm font-semibold text-[#1d4f45] backdrop-blur-sm transition hover:border-[#1d4f45]/35 hover:bg-white">
                  Explore product
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-[#45645d]">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-full border border-[#d9e5df] bg-white/50 px-3 py-2">
                    <span className="mr-1 text-[#1d413a]">{stat.value}</span>
                    {stat.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-[#d8f0e4] blur-3xl" />
              <div className="absolute -right-8 bottom-4 h-32 w-32 rounded-full bg-[#f0d9c8] blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-[#dfe7e1] bg-[#fdfaf7] p-4 shadow-[0_30px_80px_rgba(22,37,31,0.12)]">
                <div className="rounded-[25px] bg-[#183d36] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#d9ece2]">Wallet</p>
                      <p className="mt-3 text-3xl font-bold">$28.63</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-[#dfeee6]">Live</div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      ["Campus café", "$6.50", "Paid"],
                      ["Student union", "$18.00", "Pending"],
                      ["Bookstore", "$4.13", "Paid"],
                    ].map(([name, amount, status]) => (
                      <div key={name} className="flex items-center justify-between rounded-2xl bg-white/6 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#d5e7de]">{status}</p>
                        </div>
                        <p className="text-sm font-semibold">{amount}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#e5e1db] bg-[#f5f1ed] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#57736b]">Spend</p>
                    <p className="mt-2 text-lg font-bold text-[#183d36]">$64.40</p>
                  </div>
                  <div className="rounded-2xl border border-[#e5e1db] bg-[#f5f1ed] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#57736b]">Saved</p>
                    <p className="mt-2 text-lg font-bold text-[#183d36]">$12.25</p>
                  </div>
                  <div className="rounded-2xl border border-[#e5e1db] bg-[#f5f1ed] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#57736b]">Shield</p>
                    <p className="mt-2 text-lg font-bold text-[#183d36]">Secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="pt-16">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#496b62]">Why QiCash</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#173b35] sm:text-4xl">
              Designed for modern campus life.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[28px] border border-[#dae5df] bg-white/60 p-6 shadow-[0_20px_35px_rgba(25,41,36,0.04)] backdrop-blur-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f0eb]">
                  <div className="h-5 w-5 rounded-lg border border-[#1d4f45]/30 bg-[#1d4f45]/10" />
                </div>
                <h3 className="text-xl font-semibold text-[#1a372f]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#527067]">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="pt-20">
          <div className="rounded-[32px] border border-[#dfe7e2] bg-[#f9f6f2] p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#496b62]">How it works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#173b35] sm:text-4xl">
                Simple flow. Strong trust.
              </h2>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-[24px] border border-[#e1ddd6] bg-white p-5 shadow-[0_18px_30px_rgba(24,36,31,0.03)]">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#55716a]">{step.number}</div>
                  <h3 className="mt-4 text-xl font-semibold text-[#173b35]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#547169]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="pt-20">
          <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] bg-[#173d36] p-7 text-white shadow-[0_25px_55px_rgba(18,40,34,0.15)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d9ece2]">Security first</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white sm:text-4xl">
                Privacy-preserving trust built in.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#dfeee7]">
                QiCash is designed to verify intent and settlement without exposing unnecessary details. That means stronger accountability for merchants and more confidence for students.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Verification-first", "Authentic payment intent and merchant checks without exposing sensitive fields."],
                ["Attestation model", "Settlement status is confirmed with a trusted, auditable chain of evidence."],
                ["Dispute-ready", "Clear accountability structures support resolution when questions arise."],
                ["Campus scale", "Made for repeated, everyday campus flows that need consistency and trust."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[26px] border border-[#dfe8e2] bg-white/70 p-5 shadow-[0_14px_28px_rgba(22,37,31,0.03)]">
                  <h3 className="text-lg font-semibold text-[#173b35]">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#57736b]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-20">
          <div className="rounded-[32px] border border-[#dfe7e2] bg-[#f7f4ef] p-6 sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#496b62]">Customer voice</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#173b35] sm:text-3xl">
                  “A payment experience that feels clear, safe, and built for real student life.”
                </h2>
              </div>

              <div className="min-w-[220px] rounded-[24px] bg-[#173d36] px-5 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-[#dfeee7]">Community feedback</p>
                <p className="mt-2 text-xl font-semibold">4.9/5</p>
                <p className="text-xs text-[#d5ebe1]">Average trust score</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-8 pt-20">
          <div className="rounded-[34px] bg-[#183d36] px-6 py-10 text-center text-white shadow-[0_25px_55px_rgba(18,40,34,0.18)] sm:px-8 lg:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d8ece2]">Ready when you are</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
              Launch a better payment flow for your campus.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#dfeee7]">
              Bring secure transactions, clearer verification, and a smoother campus payment experience to the people who need it most.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <button className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#183d36] transition hover:bg-[#eef9f3]">
                Start free
              </button>
              <button className="rounded-full border border-white/20 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5">
                Book a demo
              </button>
            </div>
          </div>
        </section>

        <footer id="about" className="flex flex-col items-center justify-between gap-5 border-t border-[#d7e2dd] py-8 text-sm text-[#4b665f] sm:flex-row">
          <div className="flex items-center gap-3">
            <div>
              <Image src="/qicash-logo.png" alt="QiCash logo" className="rounded-full" width={32} height={32} priority />
            </div>
            <span className="font-semibold uppercase tracking-[0.12em] text-[#1f413a]">QiCash</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#product" className="transition hover:text-[#173f37]">Product</a>
            <a href="#security" className="transition hover:text-[#173f37]">Security</a>
            <a href="#how-it-works" className="transition hover:text-[#173f37]">How it works</a>
            <a href="#about" className="transition hover:text-[#173f37]">About</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
