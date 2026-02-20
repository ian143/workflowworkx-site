import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-sage-50">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-sage-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-black">
            Glue<span className="text-sage-600">OS</span>
          </span>
          <div className="flex gap-4 items-center">
            <Link
              href="/login"
              className="text-sm text-sage-700 hover:text-black transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/login?register=true"
              className="text-sm bg-sage-600 hover:bg-sage-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-serif font-bold leading-tight mb-6 text-black">
            Move Beyond Social Silence.{" "}
            <span className="text-sage-600">Architect Your Authority.</span>
          </h1>
          <p className="text-lg md:text-xl text-sage-700 max-w-2xl mx-auto mb-10">
            GlueOS transforms your project wins into high-authority LinkedIn
            content. No templates. No generic advice. Just your real work,
            strategically positioned.
          </p>
          <Link
            href="/login?register=true"
            className="inline-block bg-sage-600 hover:bg-sage-700 text-white px-8 py-4 rounded-xl text-lg font-medium transition-colors"
          >
            Start Building Authority
          </Link>
        </div>
      </section>

      {/* The Engine */}
      <section className="py-20 px-6 border-t border-sage-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center mb-16 text-black">
            The Steel Loop
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                phase: "01",
                title: "Scout",
                desc: "Upload your project files. Our forensic engine extracts Data Bombs and Secret Math.",
              },
              {
                phase: "02",
                title: "Architect",
                desc: "Five strategic sparks generated from your real results. Max 10 words. Maximum impact.",
              },
              {
                phase: "03",
                title: "Ghostwriter",
                desc: "Three draft variations per spark. Validated by the Polyester Test quality gate.",
              },
              {
                phase: "04",
                title: "Sweeper",
                desc: "One tap to publish directly to LinkedIn. No webhooks. No middlemen.",
              },
            ].map((item) => (
              <div key={item.phase} className="glass rounded-xl p-6">
                <span className="text-sage-600 font-mono text-sm">
                  {item.phase}
                </span>
                <h3 className="text-xl font-bold mt-2 mb-3 text-black">{item.title}</h3>
                <p className="text-sage-700 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-20 px-6 border-t border-sage-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-6 text-black">
            The Thinking First Approach
          </h2>
          <p className="text-sage-700 leading-relaxed">
            Most LinkedIn content fails because it starts with the post. GlueOS
            starts with your actual expertise. We forensically analyze your
            project wins, extract the mechanisms that made them work, and build
            authority-grade content from real commercial logic. The result reads
            like you wrote it — because it came from your work.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-sage-200">
        <div className="max-w-6xl mx-auto text-center text-sage-600 text-sm">
          &copy; {new Date().getFullYear()} WorkflowWorkx. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
