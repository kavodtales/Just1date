import Link from "next/link";
import { ManagedPhoto } from "./managed-photo";
import {
  ArrowUpRight,
  ArrowRight,
  Heart,
  MessageCircle,
  CalendarHeart,
  ShieldCheck,
  Compass,
  Sparkles,
} from "lucide-react";
import { Brand } from "./brand";
const people = [
  { name: "Amara", age: 28, profession: "Product designer", city: "Lagos" },
  { name: "Tomi", age: 31, profession: "Architect", city: "Abuja" },
  { name: "Zara", age: 27, profession: "Creative strategist", city: "Lagos" },
  {
    name: "Daniel",
    age: 30,
    profession: "Software engineer",
    city: "Port Harcourt",
  },
];
export function EditorialLanding() {
  return (
    <div className="editorial-landing">
      <header className="editorial-nav">
        <Brand />
        <nav aria-label="Welcome navigation">
          <a href="#approach">Our approach</a>
          <a href="#one-date">Just One Date</a>
          <Link href="/auth/login">Sign in</Link>
          <Link href="/auth/register" className="button">
            Find your connection <ArrowUpRight size={17} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="editorial-hero">
          <ManagedPhoto slot="landing_hero" hero />
          <div className="editorial-hero-copy">
            <span className="editorial-kicker">
              <Sparkles size={15} /> A LITTLE MORE INTENTIONAL
            </span>
            <h1>
              Good chemistry.
              <br />
              Great conversation.
              <br />
              <em>Just one date.</em>
            </h1>
            <p>
              For the person you want to know a little more.
              <br />
              And the moments you’ll want to remember.
            </p>
            <div className="editorial-hero-actions">
              <Link href="/auth/register" className="button">
                Start something real <ArrowUpRight size={18} />
              </Link>
              <Link href="/demo" className="hero-preview">
                Explore the app <ArrowRight size={18} />
              </Link>
            </div>
            <small>21+ illustrative adults · Fictional preview available</small>
          </div>
          <div className="hero-caption">
            <span>THE START OF A GOOD STORY</span>
            <Heart size={18} />
          </div>
        </section>
        <div className="editorial-values">
          <span>
            <Heart size={18} /> Mutual interest
          </span>
          <span>
            <MessageCircle size={18} /> Meaningful conversations
          </span>
          <span>
            <CalendarHeart size={18} /> A plan worth making
          </span>
          <span>
            <ShieldCheck size={18} /> Your pace. Your choice.
          </span>
        </div>
        <section className="editorial-intro" id="approach">
          <div>
            <span className="editorial-kicker">NOT JUST ANOTHER HELLO</span>
            <h2>
              There’s more to a spark.
              <br />
              <em>Meet the person behind it.</em>
            </h2>
          </div>
          <p>
            Shared interests. A similar outlook. That easy kind of conversation.
            Just1Date gives a connection room to become something more.
          </p>
        </section>
        <section
          className="editorial-people"
          aria-label="Fictional profile preview"
        >
          {people.map((p) => (
            <Link
              href="/demo"
              className="editorial-person"
              key={p.name}
              aria-label={`Explore the fictional ${p.name} demo`}
            >
              <img
                src={`/images/editorial/${p.name.toLowerCase()}.webp`}
                alt={`${p.name}, a fictional AI-created demo adult aged ${p.age}`}
                loading="lazy"
                width={750}
                height={1000}
              />
              <span className="editorial-demo-tag">AI-created · Demo</span>
              <div>
                <span>{p.city}</span>
                <h3>
                  {p.name}, {p.age}
                </h3>
                <p>{p.profession}</p>
              </div>
              <span className="editorial-person-heart" aria-hidden="true">
                <Heart size={20} />
              </span>
            </Link>
          ))}
        </section>
        <p className="editorial-image-disclosure">
          These are fictional AI-created demo profiles, never verified or
          presented as real members.
        </p>
        <section className="editorial-steps">
          {[
            {
              Icon: Compass,
              no: "01",
              title: "A little curiosity.",
              text: "Discover through shared intentions, interests and the things that make you, you.",
            },
            {
              Icon: MessageCircle,
              no: "02",
              title: "A better hello.",
              text: "Choose each other, then start with something worth talking about.",
            },
            {
              Icon: CalendarHeart,
              no: "03",
              title: "One beautiful date.",
              text: "Propose a plan you’ll both enjoy. Agree on the details, together.",
            },
          ].map(({ Icon, no, title, text }) => (
            <article key={no}>
              <span>{no}</span>
              <Icon size={27} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section className="editorial-one-date" id="one-date">
          <div className="editorial-date-photo">
            <ManagedPhoto slot="date_venue" loading="lazy" />
            <span>Illustrative setting · No venue booking</span>
          </div>
          <div>
            <span className="editorial-kicker">FROM A SPARK TO A STORY</span>
            <h2>
              A hello is lovely.
              <br />
              <em>A plan is better.</em>
            </h2>
            <p>
              Coffee that turns into hours. A gallery you’ve both wanted to see.
              Dinner with someone who makes you forget to check your phone.
            </p>
            <p>
              With Just One Date, choose an activity, propose a time and find a
              plan that feels right for both of you.
            </p>
            <div className="editorial-date-pills">
              <span>Coffee & conversation</span>
              <span>Art & curiosity</span>
              <span>Dinner for two</span>
            </div>
            <Link href="/demo?view=dates" className="button">
              Try a fictional date plan <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
        <section className="editorial-trust">
          <ShieldCheck size={32} />
          <div>
            <span className="editorial-kicker">
              CONNECTION, WITH CONSIDERATION
            </span>
            <h2>Your comfort is part of the chemistry.</h2>
            <p>
              Privacy controls, blocking, reporting and clear consent. Meet at
              your own pace and choose what you share.
            </p>
          </div>
          <Link href="/safety" className="quiet-link">
            Explore our Safety Center <ArrowUpRight size={17} />
          </Link>
        </section>
        <section className="editorial-closing">
          <span className="editorial-kicker">
            SOMETHING GOOD COULD START HERE
          </span>
          <h2>
            Make a little room
            <br />
            for <em>possibility.</em>
          </h2>
          <Link href="/auth/register" className="button">
            Join Just1Date <ArrowUpRight size={18} />
          </Link>
          <Link href="/download" className="quiet-link">
            Get the app <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <footer className="editorial-footer">
        <Brand />
        <span>Meet someone worth making plans for.</span>
        <nav aria-label="Footer navigation">
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/safety">Safety</Link>
          <Link href="/download">Get the app</Link>
        </nav>
        <small>
          Original AI-created illustrative photography. Real member profiles
          remain separate.
        </small>
      </footer>
    </div>
  );
}
