import { Routes, Route, NavLink, Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useSettings, Spinner } from "./utils";
import SearchBar from "./SearchBar";
import AuthPage from "./AuthPage";
import Home from "./pages/Home";
import { Courses, CourseDetail } from "./pages/Courses";
import { About, YouTube, Contact } from "./pages/Static";
import { MyOrders, MyMoney } from "./pages/Orders";
import Admin from "./pages/Admin";

function Already() { const [sp] = useSearchParams(); return <Navigate to={sp.get("next") || "/"} replace />; }

function Guard({ children, admin }) {
  const { user, isAdmin, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${loc.pathname}`} replace />;
  if (admin && !isAdmin) return <main className="page"><div className="card"><h2>⛔ Access denied</h2><p>এই পেজ শুধু অনুমোদিত অ্যাডমিনের জন্য।</p><Link to="/" className="btn">Home</Link></div></main>;
  return children;
}

export default function App() {
  const { user, profile, isAdmin, logout } = useAuth();
  const s = useSettings();
  const links = [["/", "Home"], ["/courses", "Courses"], ["/about", "About"], ["/youtube", "YouTube"], ["/contact", "Contact"]];
  if (user) links.push(["/my-orders", "My Orders"], ["/my-money", "My Money"]);
  if (isAdmin) links.push(["/admin", "Admin"]);

  return (
    <>
      <div className="bg" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.9}s` }} />)}</div>
      <header className="top">
        <div className="bar">
          <Link to="/" className="logo">{s.logoUrl ? <img src={s.logoUrl} alt="" /> : <b>N</b>}<span>{s.siteName}</span></Link>
          <div className="who">
            {user ? (<>
              <img className="av" src={user.photoURL || "/napas.png"} alt="" referrerPolicy="no-referrer" />
              <span className="nm">{user.displayName || user.email}</span>
              <button className="btn sm" onClick={logout}>Logout</button>
            </>) : <><Link to="/login" className="btn sm">Login</Link><Link to="/register" className="btn sm ghost">Register</Link></>}
          </div>
        </div>
        <nav className="links">{links.map(([to, t]) => <NavLink key={to} to={to} end={to === "/"}>{t}</NavLink>)}</nav>
        <div className="srch"><SearchBar isAdmin={isAdmin} /></div>
        {profile?.blocked && <p className="note err" style={{ margin: 8 }}>আপনার অ্যাকাউন্ট ব্লক করা আছে। সাহায্যের জন্য যোগাযোগ করুন।</p>}
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/youtube" element={<YouTube />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={user ? <Already /> : <AuthPage />} />
        <Route path="/register" element={user ? <Already /> : <AuthPage initialMode="register" />} />
        <Route path="/my-orders" element={<Guard><MyOrders /></Guard>} />
        <Route path="/my-money" element={<Guard><MyMoney /></Guard>} />
        <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
        <Route path="*" element={<main className="page"><div className="card"><h2>404 — পেজ পাওয়া যায়নি</h2><Link to="/" className="btn">Home</Link></div></main>} />
      </Routes>
      <footer className="foot">© {new Date().getFullYear()} {s.siteName} · {s.tagline}</footer>
    </>
  );
}
