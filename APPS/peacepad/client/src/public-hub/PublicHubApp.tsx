import { useEffect, useState, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { ArrowRight, Check, ExternalLink, Heart, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import "./publicHub.css";

const HUB_ORIGIN = "https://peacepad.ca";
const APP_STORE_URL = "https://apps.apple.com/ca/app/peacepad/id6793350735";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=ca.peacepad.family";
const SAFETY_HELP_URL = "https://www.canada.ca/en/public-health/services/health-promotion/stop-family-violence/services.html";
const SHELTER_SAFETY_URL = "https://sheltersafe.ca/about/safety-planning/";

type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Communication" | "Routines" | "Child-first" | "Safety";
  readTime: string;
  status: "published" | "review";
  body: string[];
};

const articles: Article[] = [
  {
    slug: "keep-children-out-of-the-middle",
    title: "Keeping children out of the middle",
    excerpt: "A few practical boundaries can help make adult logistics feel less heavy for children.",
    category: "Child-first", readTime: "4 min read", status: "published",
    body: ["Children do best when they are not asked to carry adult messages, choose sides, or explain one parent to the other.", "Try sending practical details directly to the other parent, even when it would be faster to pass them through a child. A short message about the next handoff, school item, or appointment is usually enough.", "When a child asks a difficult question, it can help to respond with reassurance and a simple next step rather than details they do not need to manage."],
  },
  {
    slug: "a-calmer-way-to-send-difficult-messages",
    title: "A calmer way to send difficult messages",
    excerpt: "Pause, name the practical request, and keep the next action easy to find.",
    category: "Communication", readTime: "3 min read", status: "published",
    body: ["A message can be clear without trying to settle every feeling at once. Before sending, identify the one practical outcome you need.", "Lead with the relevant detail, make one request, and include a time only when it matters. If the conversation becomes heated, it is okay to pause and return to the logistics later.", "PeacePad is designed to support communication; it cannot replace emergency, legal, or professional support."],
  },
  {
    slug: "predictable-routines-after-change",
    title: "Making routines more predictable after change",
    excerpt: "Small, repeatable details can make transitions easier to anticipate.",
    category: "Routines", readTime: "4 min read", status: "published",
    body: ["A predictable routine does not have to be perfect. It can be as simple as confirming pickup details, school items, and the next date in the same place.", "Choose a shared rhythm for updates that fits your family. Keeping the information brief and consistent can reduce last-minute searching.", "If a plan changes, say what changed, what stays the same, and what needs a response."],
  },
  {
    slug: "when-schedules-change",
    title: "When schedules change: make the next step visible",
    excerpt: "A useful schedule update answers what changed, what happens next, and whether a reply is needed.",
    category: "Routines", readTime: "3 min read", status: "published",
    body: ["Unexpected changes happen. A practical update can reduce confusion when it gives the new time, place, and any item a child needs.", "Avoid turning a schedule note into a longer disagreement. If there is more to discuss, keep the immediate plan separate from the broader conversation.", "A shared record of the current plan gives both adults one place to check before the next handoff."],
  },
  {
    slug: "supporting-children-without-taking-sides",
    title: "Supporting children without taking sides",
    excerpt: "Children can have big feelings without being made responsible for adult decisions.",
    category: "Child-first", readTime: "4 min read", status: "published",
    body: ["Listening does not require asking a child to report on another household. You can make space for their feelings with simple, open questions and steady reassurance.", "Keep adult conflict out of earshot where possible. A child should not need to manage a parent’s reaction or deliver information between adults.", "If you are worried about a child’s safety or wellbeing, seek appropriate professional or emergency support for your situation."],
  },
  {
    slug: "small-habits-for-a-steady-week",
    title: "Small habits for a steadier week",
    excerpt: "A short weekly check can help both parents spot practical gaps before they become urgent.",
    category: "Communication", readTime: "3 min read", status: "published",
    body: ["Set aside a few minutes to look ahead at school, activities, appointments, and handoffs. The aim is not to solve everything; it is to make the next few days easier to see.", "Write only the details that need an action. This keeps the record useful when either parent needs to check it later.", "A calm, regular process is often more sustainable than trying to resolve every issue in one conversation."],
  },
  {
    slug: "digital-safety-and-co-parenting", title: "Digital safety and co-parenting", excerpt: "Under editorial review with specialist resources.", category: "Safety", readTime: "In review", status: "review", body: [],
  },
];

function pageTitle(title: string, description: string) {
  return (
    <Helmet>
      <title>{title} | PeacePad</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`${HUB_ORIGIN}${typeof window === "undefined" ? "/" : window.location.pathname}`} />
    </Helmet>
  );
}

function QuickExit() {
  return <button className="pp-quick-exit" type="button" onClick={() => window.location.replace("https://www.google.com/search?q=weather")} aria-label="Quick Exit: leave PeacePad now">Quick Exit</button>;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const go = (path: string) => { setOpen(false); navigate(path); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <header className="pp-header"><div className="pp-shell pp-header-row">
    <Link href="/" className="pp-brand" aria-label="PeacePad home"><span className="pp-brand-mark"><Heart size={16} fill="currentColor" /></span><span>PeacePad</span></Link>
    <nav className="pp-nav" aria-label="Main navigation"><button onClick={() => go("/how-it-works")}>How it works</button><button onClick={() => go("/features")}>Features</button><button onClick={() => go("/journal")}>Journal</button><button onClick={() => go("/safety")}>Safety</button></nav>
    <div className="pp-header-actions"><QuickExit /><a className="pp-button pp-button-small" href="https://peacepad.ca/account-access">Open app <ArrowRight size={15}/></a><button className="pp-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open navigation">{open ? <X/> : <Menu/>}</button></div>
  </div>{open && <nav className="pp-mobile-nav" aria-label="Mobile navigation"><button onClick={() => go("/how-it-works")}>How it works</button><button onClick={() => go("/features")}>Features</button><button onClick={() => go("/journal")}>Journal</button><button onClick={() => go("/safety")}>Safety</button><a href="https://peacepad.ca/account-access">Open app</a></nav>}</header>;
}

function Footer() { return <footer className="pp-footer"><div className="pp-shell pp-footer-grid"><div><div className="pp-brand"><span className="pp-brand-mark"><Heart size={16} fill="currentColor" /></span><span>PeacePad</span></div><p>A calmer place for co-parenting logistics.</p><p className="pp-muted">PeacePad is not emergency, legal, medical, or mental-health advice.</p></div><div><h2>Explore</h2><Link href="/features">Features</Link><Link href="/how-it-works">How it works</Link><Link href="/journal">Journal</Link><Link href="/download">Download</Link></div><div><h2>Support</h2><Link href="/safety">Safety & support</Link><Link href="/browse-safely">Browse safely</Link><Link href="/trust">Trust</Link><a href="https://peacepad.ca/support">App support</a></div><div><h2>Company</h2><Link href="/about">About</Link><a href="https://peacepad.ca/privacy">Privacy</a><a href="https://peacepad.ca/terms">Terms</a></div></div><div className="pp-shell pp-footer-bottom">© {new Date().getFullYear()} PeacePad. Built for practical, child-first coordination.</div></footer>; }

function Layout({ children }: { children: ReactNode }) { return <><Header/><main>{children}</main><Footer/></>; }

function Home() { return <Layout>{pageTitle("A calmer way through co-parenting", "PeacePad helps parents keep the practical things clear, child-first, and in one place.")}<section className="pp-hero"><div className="pp-shell pp-hero-grid"><div><span className="pp-eyebrow"><Sparkles size={15}/> Designed for the practical next step</span><h1>A calmer way through co-parenting.</h1><p className="pp-lede">Keep messages, schedules, and everyday details easier to find—so there is more room for what matters to your child.</p><div className="pp-actions"><Link href="/start-here" className="pp-button">Start here <ArrowRight size={17}/></Link><Link href="/how-it-works" className="pp-text-link">See how it works</Link></div><p className="pp-fine">For everyday coordination. Not a substitute for emergency, legal, medical, or mental-health support.</p></div><div className="pp-hero-card" aria-label="Illustration of a calm weekly plan"><div className="pp-card-top"><span>Tuesday</span><span className="pp-status">All set</span></div><div className="pp-mini-item"><span className="pp-dot pp-dot-lilac"></span><div><b>School pickup</b><small>3:15 PM · Backpack packed</small></div></div><div className="pp-mini-item"><span className="pp-dot pp-dot-coral"></span><div><b>One clear update</b><small>“Thursday works for me.”</small></div></div><div className="pp-card-note">A small shared plan can make the day feel lighter.</div></div></div></section><section className="pp-section pp-soft"><div className="pp-shell"><div className="pp-section-heading"><span className="pp-kicker">Built for real life</span><h2>Less back-and-forth. More clarity.</h2></div><div className="pp-feature-grid"><Feature icon="01" title="Keep the practical things together" text="Messages, plans, and the details you both need can live in one calmer place."/><Feature icon="02" title="Make the next step obvious" text="Use shared routines and clear updates to reduce last-minute searching."/><Feature icon="03" title="Put children first" text="Keep adult logistics between adults, with a steady focus on what helps children feel supported."/></div></div></section><section className="pp-section"><div className="pp-shell pp-quote"><p>“The goal is not perfect co-parenting. It is a clearer next step.”</p><Link href="/start-here" className="pp-text-link">Find your starting point <ArrowRight size={16}/></Link></div></section><section className="pp-section pp-download-callout"><div className="pp-shell"><div><span className="pp-kicker">Take PeacePad with you</span><h2>Ready when the day gets busy.</h2><p>Download PeacePad for iPhone or Android, or open the web companion on desktop.</p></div><Link href="/download" className="pp-button pp-button-light">Download PeacePad <ArrowRight size={17}/></Link></div></section></Layout>; }

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) { return <article className="pp-feature"><span className="pp-feature-number">{icon}</span><h3>{title}</h3><p>{text}</p></article>; }

function StandardPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) { return <Layout><section className="pp-page-hero"><div className="pp-shell"><span className="pp-kicker">{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div></section>{children}</Layout>; }

function Features() { return <StandardPage eyebrow="PeacePad features" title="For the practical parts of parenting apart." intro="A focused place for the conversations and plans that need to stay clear.">{pageTitle("Features", "Explore PeacePad’s practical tools for calmer co-parenting coordination.")}<section className="pp-section"><div className="pp-shell pp-detail-grid"><Detail title="Messages with a purpose" text="Keep a practical request, answer, and next step in one conversation. Use the app when a calm pause and a clear message help."/><Detail title="Shared planning" text="Use schedules and updates to make handoffs, appointments, and school routines easier to check."/><Detail title="A child-first record" text="Keep relevant household coordination easy to find, without asking children to carry adult messages."/><Detail title="Your space, your pace" text="Open PeacePad on the device that works for you. You decide what practical detail to add next."/></div></section></StandardPage>; }
function Detail({ title, text }: { title:string; text:string }) { return <article className="pp-detail"><Check size={20}/><h2>{title}</h2><p>{text}</p></article>; }

function HowItWorks() { return <StandardPage eyebrow="How it works" title="Start with one useful next step." intro="There is no perfect script. PeacePad makes the practical work easier to see and share.">{pageTitle("How it works", "See a simple, child-first way to begin with PeacePad.")}<section className="pp-section"><div className="pp-shell pp-steps"><Step n="1" title="Choose what needs clarity" text="A pickup time, school item, appointment, or one practical question is a good place to begin."/><Step n="2" title="Keep it direct and useful" text="Write the detail the other parent needs, then make the next action easy to spot."/><Step n="3" title="Check the shared plan" text="Return to the current schedule and message thread when you need to confirm what is next."/></div></section><section className="pp-section pp-soft"><div className="pp-shell pp-center"><h2>Need a gentler starting point?</h2><p>Choose the path that best matches today.</p><Link href="/start-here" className="pp-button">Start here <ArrowRight size={16}/></Link></div></section></StandardPage>; }
function Step({n,title,text}:{n:string;title:string;text:string}) { return <article className="pp-step"><span>{n}</span><div><h2>{title}</h2><p>{text}</p></div></article>; }

function StartHere() { return <StandardPage eyebrow="Start here" title="What would help today?" intro="Choose a practical starting point. This page does not ask you to share personal details.">{pageTitle("Start here", "Choose a practical, child-first starting point with PeacePad.")}<section className="pp-section"><div className="pp-shell pp-choice-grid"><Link href="/how-it-works" className="pp-choice"><span>01</span><h2>I want to understand the basics</h2><p>See a simple, child-first way to use PeacePad.</p><ArrowRight/></Link><a href="https://peacepad.ca/compose" className="pp-choice"><span>02</span><h2>I need to write a practical update</h2><p>Open PeacePad’s message support.</p><ArrowRight/></a><Link href="/safety" className="pp-choice"><span>03</span><h2>I need safety or support information</h2><p>Find Canadian support resources and browsing guidance.</p><ArrowRight/></Link></div></section></StandardPage>; }

type JournalProps = { category?: Article["category"]; params?: Record<string, string | undefined> };
function Journal({ category }: JournalProps = {}) { const published = articles.filter(a => a.status === "published" && (!category || a.category === category)); return <StandardPage eyebrow="PeacePad journal" title={category ? `${category} notes for calmer coordination.` : "Practical notes for calmer coordination."} intro="Original, child-first guidance for the everyday work of co-parenting.">{pageTitle(category ? `${category} journal` : "Journal", "Practical, child-first co-parenting guidance from PeacePad.")}<section className="pp-section"><div className="pp-shell"><div className="pp-article-grid">{published.map(article => <ArticleCard key={article.slug} article={article}/>)}</div><div className="pp-editorial-note"><ShieldCheck size={22}/><div><h2>Careful by design</h2><p>Topics involving safety, abuse, legal process, or high-conflict situations stay under editorial review until they can be responsibly sourced and reviewed.</p></div></div></div></section></StandardPage>; }
function ArticleCard({article}:{article:Article}) { return <Link href={`/journal/${article.slug}`} className="pp-article-card"><span className="pp-kicker">{article.category} · {article.readTime}</span><h2>{article.title}</h2><p>{article.excerpt}</p><span className="pp-text-link">Read article <ArrowRight size={15}/></span></Link>; }
function ArticlePage({ slug }: { slug: string }) { const article = articles.find(a => a.slug === slug && a.status === "published"); if (!article) return <NotFoundPage/>; return <Layout>{pageTitle(article.title, article.excerpt)}<article className="pp-article"><div className="pp-shell pp-article-shell"><Link href="/journal" className="pp-back">← Back to journal</Link><span className="pp-kicker">{article.category} · {article.readTime}</span><h1>{article.title}</h1><p className="pp-lede">{article.excerpt}</p><div className="pp-prose">{article.body.map((p,i)=><p key={i}>{p}</p>)}</div><aside><ShieldCheck size={20}/><p>This is general information, not legal, emergency, medical, or mental-health advice.</p></aside></div></article></Layout>; }
function JournalRoute() { const [location] = useLocation(); return <ArticlePage slug={location.split("/").pop() || ""}/>; }
function JournalCategoryRoute() { const [location] = useLocation(); const slug = location.split("/").pop() || ""; const category = (["communication", "routines", "child-first", "safety"] as const).find(value => value === slug); const labels: Record<string, Article["category"]> = { communication: "Communication", routines: "Routines", "child-first": "Child-first", safety: "Safety" }; return category ? <Journal category={labels[category]}/> : <NotFoundPage/>; }

function Safety() { return <StandardPage eyebrow="Safety & support" title="Your safety comes first." intro="PeacePad is for everyday coordination. If you are in immediate danger in Canada, call 9-1-1 or your local emergency number.">{pageTitle("Safety and support", "Canadian safety and support resources for people who need them.")}<section className="pp-section"><div className="pp-shell pp-safety-grid"><div><h2>Find support that fits your situation</h2><p>Government of Canada resources can help you find provincial and territorial helplines, services, and support.</p><a className="pp-button" href={SAFETY_HELP_URL} target="_blank" rel="noreferrer">Find Canadian support <ExternalLink size={16}/></a></div><div className="pp-safety-card"><ShieldCheck size={28}/><h2>Plan for safety, your way</h2><p>A safety plan is personal. ShelterSafe explains how a local shelter or transition house can help you make one that fits your circumstances.</p><a className="pp-text-link" href={SHELTER_SAFETY_URL} target="_blank" rel="noreferrer">Read safety-planning guidance <ExternalLink size={15}/></a></div></div></section><section className="pp-section pp-soft"><div className="pp-shell pp-center"><h2>Using a shared device?</h2><p>Our browsing-safely page explains what a quick exit can and cannot do.</p><Link href="/browse-safely" className="pp-text-link">Browse safely <ArrowRight size={16}/></Link></div></section></StandardPage>; }
function BrowseSafely() { return <StandardPage eyebrow="Browse safely" title="A quick exit is not a complete privacy tool." intro="Use the options that are safest for your situation. PeacePad cannot clear your device or browser history.">{pageTitle("Browse safely", "Practical browsing-safety guidance from PeacePad.")}<section className="pp-section"><div className="pp-shell pp-prose pp-safe-copy"><h2>What Quick Exit does</h2><p>The Quick Exit button takes you away from this site immediately. It does not erase browser history, downloads, saved passwords, notifications, or other activity on your device.</p><h2>Consider your device and account access</h2><p>If it is safe to do so, use a device and account that only you can access. Review browser history, saved links, and notifications according to what is safe for you.</p><h2>Need support?</h2><p>Canadian family-violence support and helplines are available through the Government of Canada. If you are in immediate danger, call 9-1-1 or your local emergency number.</p><a className="pp-button" href={SAFETY_HELP_URL} target="_blank" rel="noreferrer">Find support <ExternalLink size={16}/></a></div></section></StandardPage>; }

function Download() { return <StandardPage eyebrow="Download PeacePad" title="Keep the practical plan close." intro="PeacePad is available on iPhone and Android. You can also use the existing web companion on desktop.">{pageTitle("Download", "Download PeacePad on iPhone or Android, or open the web companion.")}<section className="pp-section"><div className="pp-shell pp-download-grid"><a className="pp-store-card" href={APP_STORE_URL} target="_blank" rel="noreferrer"><span>iPhone</span><h2>Download on the App Store</h2><ExternalLink size={18}/></a><a className="pp-store-card" href={PLAY_STORE_URL} target="_blank" rel="noreferrer"><span>Android</span><h2>Get it on Google Play</h2><ExternalLink size={18}/></a><a className="pp-store-card" href="https://peacepad.ca/account-access"><span>Desktop</span><h2>Open the web companion</h2><ArrowRight size={18}/></a></div></section></StandardPage>; }

type SimplePageName = "parents" | "professionals" | "trust" | "support" | "about" | "open" | "privacy" | "terms";
function SimplePage({page}:{page:SimplePageName}) { const copy = { parents:["For parents", "Practical coordination, with children kept out of adult logistics."], professionals:["For professionals", "A clear companion for families doing everyday coordination."], trust:["Trust", "PeacePad is designed around practical clarity, consent, and honest safety boundaries."], support:["Support", "Need help using PeacePad? Open the app support centre."], about:["About PeacePad", "We are building a calmer, more practical way through co-parenting."], open:["Open PeacePad", "Open the existing PeacePad companion when you are ready."], privacy:["Privacy", "Read the current PeacePad privacy policy on the product site."], terms:["Terms", "Read the current PeacePad terms on the product site."] } as const; const [title,intro] = copy[page]; const legacyLink = page === "open" ? "https://peacepad.ca/account-access" : page === "support" ? "https://peacepad.ca/support" : page === "privacy" ? "https://peacepad.ca/privacy" : page === "terms" ? "https://peacepad.ca/terms" : null; return <StandardPage eyebrow="PeacePad" title={title} intro={intro}>{pageTitle(title, intro)}<section className="pp-section"><div className="pp-shell pp-center pp-prose"><p>We are keeping this public page deliberately simple while the product continues to evolve. It does not make legal, clinical, emergency, or outcome guarantees.</p>{legacyLink ? <a className="pp-button" href={legacyLink}>{page === "open" ? "Open PeacePad" : page === "support" ? "Open support" : `Read ${title}`} <ArrowRight size={16}/></a> : <Link href="/start-here" className="pp-button">Start here <ArrowRight size={16}/></Link>}</div></section></StandardPage>; }

const ParentsPage = () => <SimplePage page="parents"/>;
const ProfessionalsPage = () => <SimplePage page="professionals"/>;
const TrustPage = () => <SimplePage page="trust"/>;
const SupportPage = () => <SimplePage page="support"/>;
const AboutPage = () => <SimplePage page="about"/>;
const OpenPage = () => <SimplePage page="open"/>;
const PrivacyPage = () => <SimplePage page="privacy"/>;
const TermsPage = () => <SimplePage page="terms"/>;

function NotFoundPage() { return <StandardPage eyebrow="PeacePad" title="That page is not here." intro="Try the journal, safety resources, or the main PeacePad page.">{pageTitle("Page not found", "The requested PeacePad public page was not found.")}<section className="pp-section"><div className="pp-shell pp-center"><Link href="/" className="pp-button">Go to PeacePad <ArrowRight size={16}/></Link></div></section></StandardPage>; }

function PublicHubRoutes() { return <Switch><Route path="/" component={Home}/><Route path="/download" component={Download}/><Route path="/features" component={Features}/><Route path="/how-it-works" component={HowItWorks}/><Route path="/start-here" component={StartHere}/><Route path="/journal" component={Journal}/><Route path="/journal/category/:slug" component={JournalCategoryRoute}/><Route path="/journal/:slug" component={JournalRoute}/><Route path="/safety" component={Safety}/><Route path="/browse-safely" component={BrowseSafely}/><Route path="/parents" component={ParentsPage}/><Route path="/professionals" component={ProfessionalsPage}/><Route path="/trust" component={TrustPage}/><Route path="/support" component={SupportPage}/><Route path="/about" component={AboutPage}/><Route path="/privacy" component={PrivacyPage}/><Route path="/terms" component={TermsPage}/><Route path="/open" component={OpenPage}/><Route component={NotFoundPage}/></Switch>; }

export default function PublicHubApp() { useEffect(() => { document.documentElement.classList.add("peacepad-public-host"); document.body.classList.add("peacepad-public-host"); return () => { document.documentElement.classList.remove("peacepad-public-host"); document.body.classList.remove("peacepad-public-host"); }; }, []); return <HelmetProvider><div className="peacepad-public-hub"><PublicHubRoutes/></div></HelmetProvider>; }
