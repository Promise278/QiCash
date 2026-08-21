'use client';

import Image from 'next/image';

const features = [
  {
    icon: '🔒',
    title: 'Private by default',
    description: 'Transaction details stay protected while proving payment intent to the right parties.',
  },
  {
    icon: '🎓',
    title: 'Built for campuses',
    description: 'Designed for students, cafeterias, bookstores, and vendors needing fast daily settlement.',
  },
  {
    icon: '✓',
    title: 'Trust without friction',
    description: 'Verify vendor identity, attestation, and order status in one seamless flow.',
  },
  {
    icon: '⚡',
    title: 'Low-cost settlement',
    description: 'Optimized for repeat campus spending with lower friction than traditional banking.',
  },
  {
    icon: '📋',
    title: 'Auditable records',
    description: 'Verifiable trail for disputes, merchants, and finance teams without exposing data.',
  },
  {
    icon: '📈',
    title: 'Scales with communities',
    description: 'From one campus to a multi-venue ecosystem without growing complexity.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Scan & Pay',
    text: 'Open QiCash, scan the vendor\'s QR code, confirm the amount, and send QUAI in seconds.',
  },
  {
    number: '02',
    title: 'Verify & Settle',
    text: 'The system checks vendor attestation and settlement conditions before confirming on-chain.',
  },
  {
    number: '03',
    title: 'Track & Manage',
    text: 'View your transaction history, balances, and receipts — all in one place.',
  },
];

const stats = [
  { value: '< 15s', label: 'Transaction time' },
  { value: '$0.00', label: 'Platform fees' },
  { value: '100%', label: 'Self-custody' },
  { value: '24/7', label: 'Always on' },
];

const useCases = [
  {
    icon: '☕',
    title: 'Food Court',
    text: 'Students scan a QR code at the cafeteria and pay with QUAI instantly.',
  },
  {
    icon: '📚',
    title: 'Bookstore',
    text: 'Buy textbooks and supplies without carrying cash or cards.',
  },
  {
    icon: '🖨️',
    title: 'Print Shop',
    text: 'Quick micropayments for printing, copying, and scanning services.',
  },
  {
    icon: '🧊',
    title: 'Vending Machines',
    text: 'Tap-to-pay with QR for snacks, drinks, and campus essentials.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f3f0eb] text-[#16352f]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between rounded-full border border-[#d9e4df] bg-[#f3f0eb]/80 px-4 py-3 backdrop-blur-xl shadow-[0_10px_30px_rgba(20,35,30,0.04)]">
          <div className="flex items-center gap-3">
            <Image src="/qicash-logo.png" alt="QiCash logo" className="rounded-full" width={34} height={34} priority />
            <span className="text-base font-semibold tracking-[0.12em] text-[#1f413a] uppercase">QiCash</span>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#325b53] md:flex">
            <a href="#features" className="transition hover:text-[#173f37]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#173f37]">How it works</a>
            <a href="#use-cases" className="transition hover:text-[#173f37]">Use cases</a>
            <a href="#network" className="transition hover:text-[#173f37]">Network</a>
            <a href="https://docs.qu.ai/build/introduction" target="_blank" rel="noopener noreferrer" className="transition hover:text-[#173f37]">Docs</a>
          </nav>

          <a
            href="https://apps.apple.com/us/app/blippay/id6740288541"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#1d4f45] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(29,79,69,0.22)] transition hover:bg-[#173d36]"
          >
            Get the App
          </a>
        </header>

        {/* Hero */}
        <section className="pt-10 pb-8 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#d4e2dc] bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2f564e]">
                Privacy-first campus payments on Quai Network
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.02] tracking-[-0.06em] text-[#173b35] sm:text-5xl lg:text-6xl">
                Pay smarter.
                <span className="block text-[#1d4f45]">Stay private.</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-[#4f655f] sm:text-lg">
                QiCash gives students and campus merchants a secure payment experience built for privacy, trust, and instant verification on Quai Network.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="https://apps.apple.com/us/app/blippay/id6740288541"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#1d4f45] px-7 py-3.5 text-center text-sm font-semibold text-white shadow-[0_20px_35px_rgba(29,79,69,0.22)] transition hover:bg-[#173d36]"
                >
                  Download on App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=me.blippay.blippay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#1d4f45]/20 bg-white/60 px-7 py-3.5 text-center text-sm font-semibold text-[#1d4f45] backdrop-blur-sm transition hover:border-[#1d4f45]/35 hover:bg-white"
                >
                  Get on Google Play
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-[#45645d]">
                <div className="rounded-full border border-[#d9e5df] bg-white/50 px-3 py-2">
                  <span className="mr-1 text-[#1d413a]">Quai</span>
                  Mainnet
                </div>
                <div className="rounded-full border border-[#d9e5df] bg-white/50 px-3 py-2">
                  <span className="mr-1 text-[#1d413a]">Chain 9</span>
                </div>
                <div className="rounded-full border border-[#d9e5df] bg-white/50 px-3 py-2">
                  <span className="mr-1 text-[#1d413a]">QUAI</span>
                  Native Token
                </div>
              </div>
            </div>

            {/* Stats card */}
            <div className="relative">
              <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-[#d8f0e4] blur-3xl" />
              <div className="absolute -right-8 bottom-4 h-32 w-32 rounded-full bg-[#f0d9c8] blur-3xl" />

              <div className="relative overflow-hidden rounded-[32px] border border-[#dfe7e1] bg-[#fdfaf7] p-4 shadow-[0_30px_80px_rgba(22,37,31,0.12)]">
                <div className="rounded-[25px] bg-[#183d36] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#d9ece2]">Live on</p>
                      <p className="mt-3 text-2xl font-bold">Quai Network</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-[#dfeee6]">Mainnet</div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {stats.map((s) => (
                      <div key={s.label} className="rounded-2xl bg-white/6 px-4 py-3 text-center">
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="mt-1 text-[10px] text-[#b8d4c8]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a
                    href="https://quaiscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-[#e5e1db] bg-[#f5f1ed] p-4 transition hover:bg-[#eae6e0]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#57736b]">Explorer</p>
                    <p className="mt-2 text-sm font-bold text-[#183d36]">Quaiscan</p>
                  </a>
                  <a
                    href="https://blippay.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-[#e5e1db] bg-[#f5f1ed] p-4 transition hover:bg-[#eae6e0]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#57736b]">Wallet</p>
                    <p className="mt-2 text-sm font-bold text-[#183d36]">BlipPay</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="pt-16">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#496b62]">Why QiCash</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#173b35] sm:text-4xl">
              Designed for modern campus life.
            </h2>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="rounded-[28px] border border-[#dae5df] bg-white/60 p-6 shadow-[0_20px_35px_rgba(25,41,36,0.04)] backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f0eb] text-2xl">
                  {f.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#1a372f]">{f.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#527067]">{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="pt-20">
          <div className="rounded-[32px] border border-[#dfe7e2] bg-[#f9f6f2] p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#496b62]">How it works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#173b35] sm:text-4xl">Simple flow. Strong trust.</h2>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {steps.map((s) => (
                <div key={s.number} className="rounded-[24px] border border-[#e1ddd6] bg-white p-5 shadow-[0_18px_30px_rgba(24,36,31,0.03)]">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#55716a]">{s.number}</div>
                  <h3 className="mt-4 text-xl font-semibold text-[#173b35]">{s.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#547169]">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section id="use-cases" className="pt-20">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#496b62]">Use cases</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#173b35] sm:text-4xl">
              One app. Every campus moment.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#57736b]">
              From your morning coffee to late-night study snacks, QiCash handles it all.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((uc) => (
              <div key={uc.title} className="rounded-[24px] border border-[#dae5df] bg-white/60 p-5 shadow-[0_14px_28px_rgba(22,37,31,0.03)]">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f0eb] text-xl">
                  {uc.icon}
                </div>
                <h3 className="text-lg font-semibold text-[#173b35]">{uc.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#57736b]">{uc.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section id="network" className="pt-20">
          <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] bg-[#173d36] p-7 text-white shadow-[0_25px_55px_rgba(18,40,34,0.15)] sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d9ece2]">On Quai Network</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white sm:text-4xl">Privacy-preserving trust built in.</h2>
              <p className="mt-5 text-base leading-8 text-[#dfeee7]">
                Built on Quai Network&apos;s energy-backed QUAI token with fast finality and low fees, giving campus payments instant, reliable settlement.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://docs.qu.ai/build/introduction" target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                  Build on Quai
                </a>
                <a href="https://quaiscan.io" target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
                  Quaiscan Explorer
                </a>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['QR Code Payments', 'Scan and pay instantly with any Quai wallet — BlipPay, Pelagus, or QiCash.'],
                ['Real-Time Balance', 'Your QUAI balance and USD value update live as the market moves.'],
                ['Transaction History', 'Every payment is recorded on-chain with a link to Quaiscan for full transparency.'],
                ['Cross-Wallet Compatible', 'Works with any Quai address. Send to BlipPay users, receive from Pelagus — it all connects.'],
              ].map(([t, d]) => (
                <div key={t} className="rounded-[26px] border border-[#dfe8e2] bg-white/70 p-5 shadow-[0_14px_28px_rgba(22,37,31,0.03)]">
                  <h3 className="text-lg font-semibold text-[#173b35]">{t}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#57736b]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-8 pt-20">
          <div className="rounded-[34px] bg-[#183d36] px-6 py-10 text-center text-white shadow-[0_25px_55px_rgba(18,40,34,0.18)] sm:px-8 lg:px-10">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d8ece2]">Ready when you are</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">Start paying smarter today.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#dfeee7]">
              Download QiCash, connect your Quai wallet, and experience privacy-first campus payments.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="https://apps.apple.com/us/app/blippay/id6740288541"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#183d36] transition hover:bg-[#eef9f3]"
              >
                Download on App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=me.blippay.blippay"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 bg-transparent px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Get on Google Play
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-5 border-t border-[#d7e2dd] py-8 text-sm text-[#4b665f] sm:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/qicash-logo.png" alt="QiCash logo" className="rounded-full" width={32} height={32} priority />
            <span className="font-semibold uppercase tracking-[0.12em] text-[#1f413a]">QiCash</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="transition hover:text-[#173f37]">Features</a>
            <a href="#how-it-works" className="transition hover:text-[#173f37]">How it works</a>
            <a href="#use-cases" className="transition hover:text-[#173f37]">Use cases</a>
            <a href="#network" className="transition hover:text-[#173f37]">Network</a>
            <a href="https://docs.qu.ai/build/introduction" target="_blank" rel="noopener noreferrer" className="transition hover:text-[#173f37]">Quai Docs</a>
          </div>
          <p className="text-xs text-[#7a8c85]">&copy; {new Date().getFullYear()} QiCash. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
