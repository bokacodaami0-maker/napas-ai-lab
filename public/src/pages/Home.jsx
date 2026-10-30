import { Link } from "react-router-dom";
import { useSettings } from "../utils";

export default function Home() {
  const s = useSettings();
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="tag">{s.siteName} · {s.tagline}</p>
          <h1>Learn Web Development From Zero to Professional.</h1>
          <p className="mini" style={{ fontSize: 16 }}><b style={{ color: "#fff" }}>NAPAS</b> — Web Developer &amp; Instructor</p>
          <div className="row">
            <Link className="btn" to="/course/html-css">View Course</Link>
            <a className="btn ghost" href={s.telegram} target="_blank" rel="noreferrer">Join Telegram</a>
            <a className="btn ghost" href={s.whatsappLink} target="_blank" rel="noreferrer">Contact on WhatsApp</a>
          </div>
        </div>
        <img src="/napas.png" alt="NAPAS — Web Developer & Instructor" />
      </section>
      <section className="grid">
        {[["HTML5", "Semantic, forms, multimedia"], ["CSS3", "Flexbox, Grid, Animation"], ["Responsive", "Mobile-first design"], ["Live Projects", "Portfolio, Landing page, E-commerce"]].map(([a, b]) => (
          <div className="card" key={a}><h3>{a}</h3><p className="mini">{b}</p></div>
        ))}
      </section>
    </main>
  );
}
