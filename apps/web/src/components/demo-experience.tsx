"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Heart,
  MessageCircle,
  SlidersHorizontal,
  X,
  MapPin,
  Send,
  RotateCcw,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./brand";
type Profile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  city: string;
  profession: string;
  bio: string;
  interests: string[];
  values_list: string[];
  prompt: string;
  answer: string;
  image: string;
};
type Message = {
  id: string;
  body: string;
  sender: "you" | "sample";
  at: string;
};
type Data = {
  profiles: Profile[];
  state: {
    likes: string[];
    passes: string[];
    messages: Record<string, Message[]>;
    gender: string;
  };
};
const tabs = [
  ["discover", "Discover", Compass],
  ["matches", "Connections", Heart],
  ["messages", "Messages", MessageCircle],
] as const;
async function request(input: Record<string, string>): Promise<Data> {
  const response = await fetch("/api/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error?.message || "Please try again.");
  return result.data;
}
export function DemoExperience() {
  const [data, setData] = useState<Data>(),
    [view, setView] = useState("discover"),
    [selected, setSelected] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filters, setFilters] = useState(false),
    [details, setDetails] = useState<Profile>(),
    [match, setMatch] = useState<Profile>(),
    [body, setBody] = useState("");
  const initialized = useRef(false),
    pendingMessage = useRef<{
      profile: string;
      body: string;
      id: string;
    } | null>(null),
    chatEnd = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  async function start() {
    setError("");
    setBusy(true);
    try {
      setData(await request({ action: "start" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void start();
    }
  }, []);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [data, selected, view]);
  useEffect(() => {
    if (details || match || filters) dialog.current?.showModal();
    else dialog.current?.close();
  }, [details, match, filters]);
  async function act(input: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const next = await request(input);
      setData(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openChat(id: string) {
    if (id !== selected) setBody("");
    setSelected(id);
    setView("messages");
    setMatch(undefined);
    setDetails(undefined);
  }
  async function like(p: Profile) {
    if (await act({ action: "like", profile_id: p.id })) {
      setDetails(undefined);
      setMatch(p);
    }
  }
  function closeDialog() {
    setDetails(undefined);
    setMatch(undefined);
    setFilters(false);
  }
  const connections =
    data?.profiles.filter((p) => data.state.likes.includes(p.id)) ?? [];
  const profiles =
    data?.profiles.filter(
      (p) =>
        (data.state.gender === "everyone" || p.gender === data.state.gender) &&
        !data.state.likes.includes(p.id) &&
        !data.state.passes.includes(p.id),
    ) ?? [];
  const currentChat = connections.find((p) => p.id === selected);
  return (
    <div className="premium-app">
      <aside className="premium-sidebar">
        <Brand />
        <p className="sidebar-caption">YOUR NEXT CHAPTER</p>
        <nav aria-label="Demo navigation">
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={view === key ? "active" : ""}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
              {key === "matches" && connections.length > 0 && (
                <span className="nav-count">{connections.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-preview">
          <Sparkles size={22} />
          <h3>
            A little preview.
            <br />A lot of possibility.
          </h3>
          <p>Meet real people when you’re ready to take the next step.</p>
          <Link href="/auth/register">
            Create an account <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="sidebar-bottom-links">
          <Link href="/">About Just1date</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </aside>
      <div className="premium-workspace">
        <header className="premium-app-header">
          <div className="mobile-brand">
            <Brand />
          </div>
          <p>
            <span className="status-dot" /> A MORE THOUGHTFUL CONNECTION
          </p>
          <Link href="/auth/register" className="header-join">
            Join Just1date <ArrowUpRight size={16} />
          </Link>
        </header>
        <div className="demo-banner">
          <span className="demo-label">INTERACTIVE PREVIEW</span>
          <span>
            4 fictional profiles · Sample matches & scripted replies · Changes
            saved for 24 hours
          </span>
          <button
            onClick={async () => {
              if (await act({ action: "reset" })) {
                setSelected(undefined);
                setView("discover");
              }
            }}
            disabled={busy || !data}
            aria-label="Reset demo"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
        <main className="premium-main">
          <div className="premium-page-heading">
            <div>
              <p className="premium-kicker">
                {view === "discover"
                  ? "A LITTLE POSSIBILITY"
                  : view === "matches"
                    ? "YOU CHOSE EACH OTHER"
                    : "SOMETHING TO TALK ABOUT"}
              </p>
              <h1>
                {view === "discover"
                  ? "Meet someone interesting."
                  : view === "matches"
                    ? "Your connections."
                    : "Good conversations start here."}
              </h1>
              <p>
                {view === "discover"
                  ? "Look a little closer. There’s a person behind every picture."
                  : view === "matches"
                    ? "A mutual like is just the beginning. Say something thoughtful."
                    : "Try a conversation. Replies in this preview are scripted."}
              </p>
            </div>
            {view === "discover" && (
              <button
                className="filter-button"
                onClick={() => setFilters(true)}
                disabled={!data}
              >
                <SlidersHorizontal size={17} /> Preferences
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="premium-error">
              <p>{error}</p>
              <button onClick={start} disabled={busy}>
                Try again
              </button>
              <Link href="/auth/register">Create an account</Link>
            </div>
          )}
          {!data && !error && (
            <div className="demo-loading" role="status">
              <Heart size={30} />
              <h2>Making room for possibility…</h2>
              <p>Loading your four demo profiles.</p>
            </div>
          )}
          {data && view === "discover" && (
            <>
              {profiles.length > 0 ? (
                <div className="demo-profile-grid">
                  {profiles.map((p) => (
                    <article className="demo-profile-card" key={p.id}>
                      <button
                        className="demo-photo-button"
                        onClick={() => setDetails(p)}
                        aria-label={`View ${p.name}’s profile`}
                      >
                        <Image
                          sizes="(max-width: 767px) 90vw, 35vw"
                          width={1024}
                          height={1536}
                          src={p.image}
                          alt={`${p.name}, fictional demo profile`}
                          loading="eager"
                        />
                        <span className="demo-photo-tag">DEMO</span>
                        <div className="demo-photo-caption">
                          <h2>
                            {p.name}
                            <span>, {p.age}</span>
                          </h2>
                          <p>
                            <MapPin size={13} />
                            {p.city} · {p.profession}
                          </p>
                        </div>
                      </button>
                      <div className="demo-card-body">
                        <p className="intention-label">
                          <Heart size={13} /> Looking for something meaningful
                        </p>
                        <p className="demo-card-bio">{p.bio}</p>
                        <div className="premium-tags">
                          {p.interests.map((i) => (
                            <span key={i}>{i}</span>
                          ))}
                        </div>
                        <div className="demo-card-actions">
                          <button
                            className="pass-button"
                            aria-label={`Pass on ${p.name}`}
                            onClick={() =>
                              act({ action: "pass", profile_id: p.id })
                            }
                            disabled={busy}
                          >
                            <X size={18} />
                          </button>
                          <button
                            className="like-button"
                            onClick={() => like(p)}
                            disabled={busy}
                            aria-label={`Like ${p.name}`}
                          >
                            <Heart size={17} /> Like profile
                          </button>
                          <button
                            className="detail-button"
                            onClick={() => setDetails(p)}
                            aria-label={`More about ${p.name}`}
                          >
                            <ArrowUpRight size={19} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="premium-empty">
                  <Compass size={32} />
                  <h2>You’ve explored this little world.</h2>
                  <p>
                    {data.state.gender !== "everyone"
                      ? "Change your preferences to see other demo profiles, or "
                      : ""}
                    Reset the preview to explore again, or create an account for
                    real connections.
                  </p>
                  <button
                    className="premium-button"
                    disabled={busy}
                    onClick={() => act({ action: "reset" })}
                  >
                    Explore again <RotateCcw size={17} />
                  </button>
                  <Link href="/auth/register" className="quiet-link">
                    Create an account <ArrowRight size={16} />
                  </Link>
                </div>
              )}
              <div className="demo-bottom-note">
                <ShieldCheck size={19} />
                <p>
                  Only four fictional profiles. Demo activity stays separate
                  from real members.
                </p>
              </div>
            </>
          )}
          {data &&
            view === "matches" &&
            (connections.length ? (
              <div className="demo-connections">
                {connections.map((p) => (
                  <article key={p.id}>
                    <Image
                      sizes="(max-width: 767px) 90vw, 35vw"
                      width={1024}
                      height={1536}
                      src={p.image}
                      alt={`${p.name}, demo connection`}
                    />
                    <div>
                      <span className="premium-kicker">DEMO CONNECTION</span>
                      <h2>
                        {p.name}, {p.age}
                      </h2>
                      <p>
                        {p.city} · {p.profession}
                      </p>
                      <button
                        className="premium-button"
                        onClick={() => openChat(p.id)}
                      >
                        Say hello <MessageCircle size={17} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="premium-empty">
                <Heart size={32} />
                <h2>A good beginning is waiting.</h2>
                <p>Like a demo profile to see a sample mutual match.</p>
                <button
                  className="premium-button"
                  onClick={() => setView("discover")}
                >
                  Explore profiles <ArrowRight size={17} />
                </button>
              </div>
            ))}
          {data &&
            view === "messages" &&
            (connections.length ? (
              <div
                className={`demo-chat-layout ${currentChat ? "chat-open" : ""}`}
              >
                <aside className="demo-inbox">
                  <h2>Your conversations</h2>
                  {connections.map((p) => (
                    <button
                      key={p.id}
                      className={selected === p.id ? "selected" : ""}
                      onClick={() => setSelected(p.id)}
                    >
                      <Image
                        sizes="(max-width: 767px) 90vw, 35vw"
                        width={1024}
                        height={1536}
                        src={p.image}
                        alt=""
                      />
                      <div>
                        <strong>
                          {p.name}
                          <span>DEMO</span>
                        </strong>
                        <p>{data.state.messages[p.id]?.at(-1)?.body}</p>
                      </div>
                    </button>
                  ))}
                </aside>
                {currentChat ? (
                  <section className="demo-conversation">
                    <header>
                      <button
                        aria-label="Back to conversations"
                        className="chat-back"
                        onClick={() => setSelected(undefined)}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <Image
                        sizes="(max-width: 767px) 90vw, 35vw"
                        width={1024}
                        height={1536}
                        src={currentChat.image}
                        alt=""
                      />
                      <div>
                        <h2>{currentChat.name}</h2>
                        <p>Fictional profile · Scripted sample replies</p>
                      </div>
                    </header>
                    <div
                      className="demo-messages"
                      role="log"
                      aria-label={`Conversation with ${currentChat.name}`}
                    >
                      <p className="chat-sample-notice">
                        This is a demo conversation. No messages are sent to a
                        real person.
                      </p>
                      {data.state.messages[currentChat.id]?.map((m) => (
                        <article
                          key={m.id}
                          className={`demo-message ${m.sender}`}
                        >
                          <p>{m.body}</p>
                          <time dateTime={m.at}>
                            {new Date(m.at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </article>
                      ))}
                      <div ref={chatEnd} />
                    </div>
                    <form
                      className="demo-composer"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!body.trim() || busy) return;
                        const sent = body.trim();
                        if (
                          pendingMessage.current?.profile !== currentChat.id ||
                          pendingMessage.current?.body !== sent
                        )
                          pendingMessage.current = {
                            profile: currentChat.id,
                            body: sent,
                            id: crypto.randomUUID(),
                          };
                        if (
                          await act({
                            action: "message",
                            profile_id: currentChat.id,
                            client_id: pendingMessage.current.id,
                            body: sent,
                          })
                        ) {
                          setBody("");
                          pendingMessage.current = null;
                        }
                      }}
                    >
                      <input
                        aria-label="Your demo message"
                        placeholder="Start with something thoughtful…"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={1000}
                        autoComplete="off"
                        required
                      />
                      <button
                        disabled={busy || !body.trim()}
                        aria-label="Send demo message"
                      >
                        <Send size={19} />
                      </button>
                    </form>
                  </section>
                ) : (
                  <div className="chat-placeholder">
                    <MessageCircle size={35} />
                    <h2>A little hello goes a long way.</h2>
                    <p>Choose a conversation to get started.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="premium-empty">
                <MessageCircle size={32} />
                <h2>Make your first connection.</h2>
                <p>A mutual like opens a private conversation.</p>
                <button
                  className="premium-button"
                  onClick={() => setView("discover")}
                >
                  Discover profiles <ArrowRight size={17} />
                </button>
              </div>
            ))}
        </main>
      </div>
      <nav className="premium-mobile-nav" aria-label="Demo mobile navigation">
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-current={view === key ? "page" : undefined}
            className={view === key ? "active" : ""}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
        <Link href="/auth/register">
          <ArrowUpRight size={22} />
          <span>Join</span>
        </Link>
      </nav>
      <dialog
        ref={dialog}
        className="premium-dialog"
        onCancel={closeDialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeDialog();
        }}
      >
        <button
          className="dialog-close"
          aria-label="Close dialog"
          onClick={closeDialog}
        >
          <X size={19} />
        </button>
        {filters && (
          <div className="demo-preferences">
            <p className="premium-kicker">YOUR KIND OF CONNECTION</p>
            <h2>Who would you like to meet?</h2>
            <p>Explore the four demo profiles at your pace.</p>
            <div>
              {[
                ["everyone", "Everyone"],
                ["woman", "Women"],
                ["man", "Men"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={data?.state.gender === value ? "selected" : ""}
                  disabled={busy}
                  onClick={async () => {
                    if (await act({ action: "filter", gender: value }))
                      setFilters(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="muted">Preferences are saved in your demo session.</p>
          </div>
        )}
        {details && (
          <div className="demo-profile-details">
            <Image
              sizes="(max-width: 767px) 90vw, 35vw"
              width={1024}
              height={1536}
              src={details.image}
              alt={`${details.name}, fictional profile`}
            />
            <div>
              <span className="premium-kicker">FICTIONAL DEMO PROFILE</span>
              <h2>
                {details.name}, {details.age}
              </h2>
              <p className="muted">
                {details.city} · {details.profession}
              </p>
              <p>{details.bio}</p>
              <h3>A little more about me</h3>
              <div className="profile-prompt">
                <p>{details.prompt}</p>
                <h3>{details.answer}</h3>
              </div>
              <h3>What matters to me</h3>
              <div className="premium-tags">
                {details.values_list.map((v) => (
                  <span key={v}>{v}</span>
                ))}
              </div>
              <button
                className="premium-button"
                disabled={busy}
                onClick={() => like(details)}
              >
                <Heart size={17} /> Like {details.name}
              </button>
            </div>
          </div>
        )}
        {match && (
          <div className="demo-match">
            <span className="premium-kicker">A LITTLE SPARK</span>
            <Image
              sizes="(max-width: 767px) 90vw, 35vw"
              width={1024}
              height={1536}
              src={match.image}
              alt={`${match.name}, demo match`}
            />
            <h2>You chose each other.</h2>
            <p>
              You and {match.name} are a demo match. Try a conversation to see
              how it feels.
            </p>
            <button
              className="premium-button"
              onClick={() => openChat(match.id)}
            >
              Say hello <MessageCircle size={18} />
            </button>
            <button className="quiet-link" onClick={closeDialog}>
              Keep exploring <ArrowRight size={17} />
            </button>
            <small>Sample match · No real person is contacted</small>
          </div>
        )}
      </dialog>
    </div>
  );
}
