import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Heart,
  MessageCircle,
  Compass,
  ArrowRight,
} from "lucide-react";
import { Brand } from "./brand";
export function Welcome() {
  return (
    <div className="premium-landing">
      <header className="landing-header">
        <Brand />
        <nav aria-label="Welcome navigation">
          <a href="#how-it-works">Our approach</a>
          <Link href="/auth/login">Sign in</Link>
          <Link className="pill-link" href="/auth/register">
            Join Just1date <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="premium-kicker">
              <span /> A LITTLE MORE INTENTIONAL
            </p>
            <h1>
              Less swiping.
              <br />
              More{" "}
              <em>
                something
                <br className="desktop-break" /> real.
              </em>
            </h1>
            <p className="hero-description">
              Good connections start with more than a photo. Meet through shared
              values, thoughtful conversations and the things that make you,
              you.
            </p>
            <div className="hero-actions">
              <Link className="premium-button" href="/demo">
                Try the app <ArrowRight size={18} />
              </Link>
              <Link className="quiet-link" href="/auth/register">
                Create an account <ArrowUpRight size={17} />
              </Link>
            </div>
            <p className="hero-footnote">
              Explore with 4 fictional profiles. No account needed.
            </p>
            <div className="hero-values">
              <span>
                <Heart size={16} /> Shared intentions
              </span>
              <span>
                <MessageCircle size={16} /> Better conversations
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit" />
            <article className="hero-profile">
              <Image
                sizes="(max-width: 767px) 90vw, 35vw"
                width={1024}
                height={1536}
                src="/images/demo/amara.png"
                alt="Amara, a fictional demo profile"
              />
              <span className="demo-photo-tag">DEMO PROFILE</span>
              <div className="hero-profile-caption">
                <span>DESIGNER · LAGOS</span>
                <h2>Amara, 28</h2>
                <p>“Let’s find a new favourite place.”</p>
              </div>
            </article>
            <article className="hero-note">
              <span className="note-heart">
                <Heart size={18} />
              </span>
              <div>
                <strong>A little common ground.</strong>
                <p>Curiosity. Kindness. Coffee.</p>
              </div>
            </article>
            <div className="hero-mini-profile">
              <Image
                sizes="(max-width: 767px) 90vw, 35vw"
                width={1024}
                height={1536}
                src="/images/demo/tomi.png"
                alt="Tomi, a fictional demo profile"
              />
              <div>
                <span>MEET SOMEONE NEW</span>
                <strong>Tomi, 31</strong>
                <p>Architect · Abuja</p>
              </div>
              <ArrowUpRight size={20} />
            </div>
            <span className="visual-caption">THE START OF A GOOD STORY</span>
          </div>
        </section>
        <section className="approach-strip" id="how-it-works">
          <div>
            <p className="premium-kicker">A BETTER KIND OF BEGINNING</p>
            <h2>
              Make a connection.
              <br />
              <em>Not just a collection.</em>
            </h2>
          </div>
          <article>
            <Compass />
            <h3>Discover with intention</h3>
            <p>
              Get to know the person behind the picture. Explore their values,
              interests and everyday joys.
            </p>
          </article>
          <article>
            <Heart />
            <h3>Choose each other</h3>
            <p>
              A mutual like opens the conversation. Take your time and find your
              own pace.
            </p>
          </article>
          <article>
            <MessageCircle />
            <h3>Say something real</h3>
            <p>
              Start with a thoughtful prompt. A good first conversation deserves
              more than “hey”.
            </p>
          </article>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>For people. For possibility.</span>
        <div>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
