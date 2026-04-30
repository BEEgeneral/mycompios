'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = {
  dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3',
  muted: '#9CA3AF', white: '#FFFFFF', green: '#22C55E', red: '#DC2626',
  laura: ['#f472b6', '#e11d48'], enzo: ['#60a5fa', '#4f46e5'],
  carlos: ['#4ade80', '#059669'], elena: ['#fb923c', '#ea580c'],
  diana: ['#a78bfa', '#7c3aed'], marcos: ['#22d3ee', '#0891b2'],
  daniel: ['#2d3261', '#2d326180'], pelayo: ['#64748b', '#475569'],
}

const AGENTS = [
  { name: 'Laura', role: 'Atención al Cliente', gradient: C.laura, stat: 'Respuestas instantáneas', desc: 'Responde a las 2am. Cero esperas, cero frustraciones.', initials: 'L' },
  { name: 'Enzo', role: 'Marketing', gradient: C.enzo, stat: '+25% leads en 30 días', desc: 'Crea campañas que atraen leads reales y convierten.', initials: 'E' },
  { name: 'Carlos', role: 'Ventas', gradient: C.carlos, stat: '3x más cierres', desc: 'Follow-up automático de cada lead. Se acabaron los "les escribo mañana".', initials: 'C' },
  { name: 'Elena', role: 'Operaciones', gradient: C.elena, stat: '80% tiempo ahorrado', desc: 'Conecta herramientas y elimina tareas manuales.', initials: 'E' },
  { name: 'Marcos', role: 'Tech & Development', gradient: C.marcos, stat: 'Desde 1 día', desc: 'Páginas, e-commerce, integraciones — sin llamadas.', initials: 'M' },
]

const TESTIMONIALS = [
  { quote: 'Laura respondía a nuestros clientes a las 2am cuando dormíamos. Nunca HubSpot hizo eso por nosotros.', name: 'David Ruiz', role: 'CEO, TiendaFarma', result: '−60% tickets de soporte', initials: 'DR', gradient: C.laura },
  { quote: 'Carlos recuperó 3 ventas que habían caído en el olvido. Ningún CRM lo habría hecho tan automáticamente.', name: 'María Vega', role: 'Comercial, Asesoría Contable', result: '+€8.400 ventas/mes', initials: 'MV', gradient: C.carlos },
  { quote: 'Elena automatizó el envío de reportes semanales. Antes lo hacíamos entre 2 personas en 4 horas. Ahora, 0.', name: 'Jordi Serra', role: 'COO, LogiFast', result: '4h → 0h/semana', initials: 'JS', gradient: C.elena },
  { quote: 'Enzo encontró que nuestros posts del martes convertían 3x más. Cambió la estrategia en una semana.', name: 'Lucía Torres', role: 'CMO, ModaPaTi', result: '3x CTR en contenido', initials: 'LT', gradient: C.enzo },
]

const FAQ = [
  { q: '¿Qué es exactamente un Profesional de MyCompi?', a: 'Es un profesional especializado — Marketing, Ventas, Atención al Cliente, etc. No es un chatbot genérico. Tiene memoria, conoce tu negocio y ejecuta tareas concretas.', cat: 'General' },
  { q: '¿Necesito conocimientos técnicos para usarlo?', a: 'No. Configuras todo desde tu panel en minutos.', cat: 'General' },
  { q: '¿Cuánto tarda en estar operativo?', a: 'Tu primer Compi está operativo en menos de 30 minutos. Un equipo completo, en 24 horas.', cat: 'General' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin contratos, sin permanencia. Cancelas desde tu panel cuando quieras.', cat: 'Pagos' },
  { q: '¿Mis datos están seguros?', a: 'Tus datos se almacenan en servidores seguros. No compartimos información con terceros. Cumple con GDPR.', cat: 'Técnico' },
  { q: '¿Cómo funciona el pago?', a: 'Pago mensual con tarjeta a través de Stripe. Datos 100% seguros.', cat: 'Pagos' },
]

const HOW_STEPS = [
  { num: '1', title: 'Cuéntanos tu negocio', desc: 'Describe qué necesitas o pásanos tu URL. Investigamos tu sector y competencia.' },
  { num: '2', title: 'Nosotros montamos el equipo', desc: 'En 24h tienes Compis especializados listos para trabajar.' },
  { num: '3', title: 'Escalas sin límites', desc: 'Mientras duermes, responden clientes, cierran ventas y generan informes.' },
]

const SOCIAL_PROOF = [
  { quote: 'Pasé de perder 3 horas al día en soporte a cero. Mis clientes esperan menos de 2 minutos respuesta. Y no he contratado a nadie.', name: 'Alberto Montoya', role: 'Fundador, Consultora Montoya', result: '−3h/día en tareas administrativas', initials: 'AM', gradient: [C.dark, C.dark] },
  { quote: 'Cerramos el primer mes con 14 leads nuevos directamente atribuidos a Carlos. Eso nunca había pasado con ningún comercial.', name: 'Patricia Castejón', role: 'CEO, Legaltech Sevilla', result: '+€12.000 facturación mensual', initials: 'PC', gradient: C.carlos },
  { quote: 'Tengo un equipo de 6 Compis que trabaja desde las 8am hasta medianoche. Nunca tuve un asistente que trabajara 24/7 — hasta ahora.', name: 'Sergi Marquès', role: 'Director, Inmobiliaria Costa Brava', result: '24/7 atención sin coste de personal', initials: 'SM', gradient: C.elena },
]

function AgentAvatar({ name, size = 80, initials, gradient }: { name?: string; size?: number; initials?: string; gradient?: string[] }) {
  // Map agent names to their photos
  const agentPhotos: Record<string, string> = {
    'Laura': '/assets/agent-laura.jpg',
    'Enzo': '/assets/agent-enzo.jpg',
    'Carlos': '/assets/agent-carlos.jpg',
    'Elena': '/assets/agent-elena.jpg',
    'Marcos': '/assets/agent-marcos.jpg',
    'Paco': '/assets/agent-paco.jpg',
    'Pelayo': '/assets/agent-pelayo.jpg',
    'Daniel': '/assets/agent-daniel.jpg',
    'Diana': '/assets/agent-diana.jpg',
    'Lucía': '/assets/agent-lucia.jpg',
  }
  
  const photoPath = name ? agentPhotos[name] : null
  const [f, t] = gradient || [C.dark, C.dark]
  const displayInitials = initials || (name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??')
  
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: photoPath ? 'transparent' : `linear-gradient(135deg, ${f}, ${t})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.white, fontWeight: 700, fontSize: size * 0.3,
      border: `2px solid ${C.yellow}`,
    }}>
      {photoPath ? (
        <img 
          src={photoPath} 
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      ) : displayInitials}
    </div>
  )
}

const s = {
  page: { fontFamily: "'Poppins', 'Montserrat', 'Inter', system-ui, sans-serif", background: C.cream, color: C.dark, WebkitFontSmoothing: 'antialiased', overflowX: 'hidden' as const },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: `1px solid ${C.pastel}`, background: C.dark, position: 'sticky' as const, top: 0, zIndex: 100 },
  brand: { fontSize: '1.5rem', fontWeight: 800, color: C.white },
  navLinks: { display: 'flex', gap: '1.5rem', alignItems: 'center' as const },
  navLink: { color: C.pastel, fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' },
  navCta: { background: C.yellow, color: C.dark, padding: '0.45rem 1.1rem', borderRadius: 8, textDecoration: 'none', fontWeight: 700, minHeight: 44, minWidth: 44, display: 'inline-flex', alignItems: 'center' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 1rem', width: '100%', boxSizing: 'border-box' as const },
  section: { padding: '3rem 0' },
  badge: { display: 'inline-block', padding: '0.35rem 1rem', background: C.dark, color: C.yellow, borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' },
  h1: { fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem', color: C.dark },
  h2: { fontSize: 'clamp(1.6rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: C.dark },
  h3: { fontSize: '1.2rem', fontWeight: 700, color: C.dark },
  p: { color: '#4B5563', lineHeight: 1.7, fontSize: '1rem' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem 2rem', borderRadius: 10, background: C.dark, color: C.white, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', minHeight: 48, minWidth: 48 },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.85rem 2rem', borderRadius: 10, background: 'transparent', color: C.dark, border: `2px solid ${C.pastel}`, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', minHeight: 48, minWidth: 48 },
}

export default function Landing() {
  const [isMobile, setIsMobile] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [faqFilter, setFaqFilter] = useState('Todas')
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const [billing, setBilling] = useState<'month' | 'year'>('year')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const heroEl = document.getElementById('hero')
    if (!heroEl) return
    const observer = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting), { threshold: 0 })
    observer.observe(heroEl)
    return () => observer.disconnect()
  }, [])

  const cats = ['Todas', 'General', 'Pagos', 'Técnico']
  const filteredFaq = faqFilter === 'Todas' ? FAQ : FAQ.filter(f => f.cat === faqFilter)
  const monthlyPrice = 49
  const annualPrice = 486
  const annualMonthly = 40.5

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactSent(true)
  }

  return (
    <div style={s.page}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        a:hover { text-decoration: none; }
        .agent-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px #2d326120; }
        input:focus, textarea:focus { outline: none; border-color: #FFD054 !important; box-shadow: 0 0 0 3px #FFD05430; }
        .sticky-cta { transition: transform 0.3s ease, opacity 0.3s ease; }
        @media (max-width: 767px) {
          .agents-grid, .team-grid { grid-template-columns: 1fr !important; }
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={s.nav}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={s.brand}><span style={{ color: C.yellow }}>My</span>Compi</span>
        </Link>
        <div className="desktop-nav" style={s.navLinks}>
          <a href="#servicios" style={s.navLink}>Servicios</a>
          <a href="#equipo" style={s.navLink}>Equipo</a>
          <a href="#precios" style={s.navLink}>Precios</a>
          <a href="#faq" style={s.navLink}>FAQ</a>
          <Link href="/login" style={{ ...s.navLink, color: C.white }}>Acceder</Link>
          <Link href="/registro" style={s.navCta}>Empezar gratis →</Link>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', flexDirection: 'column', gap: '5px', minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 24, height: 2, background: C.yellow, borderRadius: 2 }} />
          <div style={{ width: 24, height: 2, background: C.yellow, borderRadius: 2 }} />
          <div style={{ width: 24, height: 2, background: C.yellow, borderRadius: 2 }} />
        </button>
      </nav>

      {menuOpen && (
        <div style={{ position: 'fixed', top: 60, left: 0, right: 0, bottom: 0, background: C.dark, zIndex: 99, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', gap: '1.25rem' }}>
          <a href="#servicios" style={{ color: C.white, fontSize: '1.3rem', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Servicios</a>
          <a href="#equipo" style={{ color: C.white, fontSize: '1.3rem', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Equipo</a>
          <a href="#precios" style={{ color: C.white, fontSize: '1.3rem', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Precios</a>
          <a href="#faq" style={{ color: C.white, fontSize: '1.3rem', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>FAQ</a>
          <Link href="/login" style={{ color: C.white, fontSize: '1.3rem', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Acceder</Link>
          <Link href="/registro" style={{ ...s.navCta, textAlign: 'center', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>Empezar gratis →</Link>
        </div>
      )}

      <main id="main">
        {/* HERO */}
        <section id="hero" style={{ ...s.section, paddingTop: '5rem', textAlign: 'center' as const }}>
          <div style={s.container}>
            <div style={s.badge}>3 días gratis · Sin compromiso · Cancela cuando quieras</div>
            <h1 style={s.h1}>Tu equipo de IA trabaja 24/7<br />por €49/mes</h1>
            <p style={{ ...s.p, fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 2.5rem', color: '#4B5563' }}>Sin permanencias. Sin técnicos. En 5 minutos tienes tu primer Compi.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <Link href="/registro" style={{ ...s.btnPrimary, background: C.yellow, color: C.dark }}>Empezar gratis →</Link>
              <a href="#como-funciona" style={s.btnOutline}>Ver cómo funciona</a>
            </div>
            <p style={{ marginTop: '1.5rem', color: C.muted, fontSize: '0.85rem' }}>🔒 Pago seguro con Stripe · Sin permanencia · Cancela cuando quieras</p>
          </div>
        </section>

        {/* STATS */}
        <section style={{ background: C.pastel, padding: '2rem 0' }}>
          <div style={s.container}>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
              {[{ num: '500+', label: 'empresas' }, { num: '4.8/5', label: 'valoración media' }, { num: '10M+', label: 'mensajes contestados' }].map(stat => (
                <div key={stat.num}>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: C.dark }}>{stat.num}</div>
                  <div style={{ color: C.dark, fontSize: '0.85rem', fontWeight: 500, opacity: 0.7 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" style={{ ...s.section, background: C.white }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Proceso</p>
              <h2 style={s.h2}>Listo en 3 pasos</h2>
            </div>
            <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
              {HOW_STEPS.map((step, idx) => (
                <div key={step.num} style={{ textAlign: 'center', position: 'relative' }}>
                  {!isMobile && idx < HOW_STEPS.length - 1 && <div style={{ position: 'absolute', top: '36px', right: '-1rem', color: C.pastel, fontSize: '1.5rem', fontWeight: 700 }}>→</div>}
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: C.dark, color: C.yellow, borderRadius: 9999, fontSize: '1.1rem', fontWeight: 800, width: 48, height: 48, marginBottom: '0.75rem' }}>{step.num}</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: C.dark, marginBottom: '0.6rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: C.muted, lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICIOS */}
        <section id="servicios" style={{ ...s.section, background: C.cream }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Servicios</p>
              <h2 style={s.h2}>Cada profesional es un experto en su área</h2>
              <p style={{ ...s.p, maxWidth: 600, margin: '0 auto' }}>No son herramientas. Son profesionales con nombre, memoria y objetivos. Encajan en tu equipo.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {AGENTS.map(a => (
                <div key={a.name} style={{ background: C.white, border: `1px solid ${C.pastel}`, borderRadius: 16, padding: '1.5rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <AgentAvatar initials={a.initials} gradient={a.gradient} size={56} name={a.name} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: C.dark }}>{a.name}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, background: `${a.gradient[0]}20`, color: a.gradient[0], padding: '0.15rem 0.5rem', borderRadius: 9999, display: 'inline-block', marginTop: '0.2rem' }}>{a.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: a.gradient[0], marginBottom: '0.5rem' }}>{a.stat}</div>
                  <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6 }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section style={{ ...s.section, background: C.white }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Resultados reales</p>
              <h2 style={s.h2}>Lo que dicen de nosotros</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {SOCIAL_PROOF.map(t => (
                <div key={t.name} style={{ background: C.cream, border: `2px solid ${C.pastel}`, borderRadius: 16, padding: '1.75rem', cursor: 'default' }}>
                  <p style={{ fontSize: '0.9rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '1.25rem' }}>"{t.quote}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <AgentAvatar initials={t.initials} gradient={t.gradient} size={44} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.dark }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: C.muted }}>{t.role}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', background: `${t.gradient[0]}15`, color: t.gradient[0], fontWeight: 700, fontSize: '0.78rem', padding: '0.3rem 0.7rem', borderRadius: 9999, display: 'inline-block' }}>{t.result}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRECIOS */}
        <section id="precios" style={{ ...s.section, background: C.cream }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Precios</p>
              <h2 style={s.h2}>Sin sorpresas. Sin permanencia.</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
              <div style={{ background: C.white, borderRadius: 16, padding: '0.35rem', display: 'inline-flex', border: `2px solid ${C.pastel}`, fontSize: '0.9rem' }}>
                <button onClick={() => setBilling('month')} style={{ padding: '0.5rem 1.5rem', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', background: billing === 'month' ? C.dark : 'transparent', color: billing === 'month' ? C.white : C.muted }}>Mensual</button>
                <button onClick={() => setBilling('year')} style={{ padding: '0.5rem 1.5rem', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', background: billing === 'year' ? C.green : 'transparent', color: billing === 'year' ? C.white : C.muted }}>Anual · −33%</button>
              </div>
            </div>
            <div style={{ maxWidth: 540, margin: '0 auto' }}>
              {billing === 'year' ? (
                <div style={{ background: C.dark, borderRadius: 24, padding: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 40px rgba(45,50,97,0.25)' }}>
                  <div style={{ position: 'absolute', top: 16, right: 16, background: C.yellow, color: C.dark, fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: 9999, textTransform: 'uppercase' }}>⭐ MEJOR VALOR</div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: C.yellow, marginBottom: '0.5rem' }}>Anual</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 900, color: C.white }}>€{annualMonthly}</span>
                      <span style={{ color: C.pastel, fontSize: '0.9rem' }}>/mes</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: C.pastel, marginTop: '0.25rem' }}>€{annualPrice}/año — ahórrate €98 al año</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {['7 Compis agentes especializados', 'Marketing, ventas, atención al cliente', 'Reporting continuo', 'Chat con Paco, tu orquestador 24/7', '3 días gratis para probar', 'Prioridad en soporte'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: C.pastel }}><span style={{ color: C.green, fontWeight: 700 }}>✓</span> {f}</div>
                    ))}
                  </div>
                  <Link href="/registro" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, background: C.yellow, color: C.dark, border: 'none', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', minHeight: 48 }}>Empezar gratis →</Link>
                </div>
              ) : (
                <div style={{ background: C.white, border: `2px solid ${C.pastel}`, borderRadius: 24, padding: '1.5rem', position: 'relative' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: C.dark, marginBottom: '0.5rem' }}>Mensual</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span style={{ fontSize: '3rem', fontWeight: 900, color: C.dark }}>€{monthlyPrice}</span>
                      <span style={{ color: C.muted, fontSize: '0.9rem' }}>/mes</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {['7 Compis agentes especializados', 'Marketing, ventas, atención al cliente', 'Reporting continuo', 'Chat con Paco, tu orquestador 24/7', '3 días gratis para probar'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#374151' }}><span style={{ color: C.green, fontWeight: 700 }}>✓</span> {f}</div>
                    ))}
                  </div>
                  <Link href="/registro" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.85rem', borderRadius: 12, background: C.dark, color: C.white, border: 'none', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none', minHeight: 48 }}>Empezar gratis →</Link>
                </div>
              )}
            </div>
            <p style={{ textAlign: 'center', marginTop: '2rem', color: C.muted, fontSize: '0.82rem' }}>🔒 Pago seguro con Stripe · Sin permanencia</p>
          </div>
        </section>

        {/* EQUIPO */}
        <section id="equipo" style={{ ...s.section, background: C.cream }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Tu equipo de profesionales</p>
              <h2 style={s.h2}>No trabajan para ti. Trabajan contigo.</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: C.white, border: `2px solid ${C.dark}`, borderRadius: 20, padding: isMobile ? '1.5rem' : '2rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', maxWidth: 480, width: '100%', boxSizing: 'border-box', flexDirection: isMobile ? 'column' : 'row' }}>
                <AgentAvatar initials="DH" gradient={C.daniel} size={72} name="Daniel Herrera" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: C.dark }}>Daniel Herrera</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.5rem' }}>Director General</div>
                  <p style={{ fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.6, marginBottom: '0.75rem' }}>Coordina todo tu equipo. Toma decisiones estratégicas contigo. Cada lunes te envía un resumen semanal con resultados.</p>
                  <div style={{ fontSize: '0.8rem', color: C.dark, fontWeight: 600, background: `${C.yellow}30`, padding: '0.25rem 0.6rem', borderRadius: 6, display: 'inline-block' }}>Coordina todo tu equipo</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}><div style={{ width: 2, height: 32, background: C.pastel }} /></div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: C.white, border: `1px solid ${C.pastel}`, borderRadius: 20, padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start', maxWidth: 420, width: '100%', boxSizing: 'border-box', flexDirection: isMobile ? 'column' : 'row' }}>
                <AgentAvatar initials="P" gradient={C.pelayo} size={56} name="Pelayo" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: C.dark }}>Pelayo</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.4rem' }}>Compis Director</div>
                  <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>Coordina tu agenda, gestiona emails, prepara reuniones y anticipa lo que necesitas.</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}><div style={{ width: 2, height: 32, background: C.pastel }} /></div>
            <div className="agents-grid team-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {AGENTS.map(a => (
                <div key={a.name} style={{ background: C.white, border: `1px solid ${C.pastel}`, borderRadius: 16, padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><AgentAvatar initials={a.initials} gradient={a.gradient} size={64} name={a.name} /></div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: C.dark, marginTop: '0.75rem' }}>{a.name}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: a.gradient[0], marginBottom: '0.5rem' }}>{a.role}</div>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{ ...s.section, background: C.white }}>
          <div style={s.container}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>Casos reales</p>
              <h2 style={s.h2}>Resultados que puedes verificar</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {TESTIMONIALS.map(t => (
                <div key={t.name} style={{ background: C.cream, border: `2px solid ${C.pastel}`, borderRadius: 16, padding: '1.5rem', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <AgentAvatar initials={t.initials} gradient={t.gradient} size={48} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.dark }}>{t.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{t.role}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#374151', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '1rem' }}>"{t.quote}"</p>
                  <div style={{ background: `${t.gradient[0]}15`, color: t.gradient[0], fontWeight: 700, fontSize: '0.8rem', padding: '0.3rem 0.7rem', borderRadius: 9999, display: 'inline-block' }}>{t.result}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ ...s.section, background: C.cream }}>
          <div style={{ ...s.container, maxWidth: 760 }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ color: C.dark, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6 }}>FAQ</p>
              <h2 style={s.h2}>Preguntas antes de empezar</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', justifyContent: 'center' }}>
              {cats.map(cat => (
                <button key={cat} onClick={() => setFaqFilter(cat)} style={{ padding: '0.4rem 0.9rem', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${faqFilter === cat ? C.dark : C.pastel}`, background: faqFilter === cat ? C.dark : 'transparent', color: faqFilter === cat ? C.white : C.dark, minHeight: 40, minWidth: 40 }}>{cat}</button>
              ))}
            </div>
            <div>
              {filteredFaq.map((item) => {
                const globalIdx = FAQ.indexOf(item)
                return (
                  <div key={item.q} style={{ borderBottom: `1px solid ${C.pastel}`, padding: '1.25rem 0' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: C.dark, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setOpenFaq(openFaq === globalIdx ? null : globalIdx)}>
                      {item.q}
                      <span style={{ color: C.yellow, fontSize: '1.4rem', fontWeight: 700, flexShrink: 0, lineHeight: 1, transition: 'transform 0.2s', transform: openFaq === globalIdx ? 'rotate(45deg)' : 'none', minWidth: 44, minHeight: 44, textAlign: 'center' as const }}>+</span>
                    </div>
                    {openFaq === globalIdx && <p style={{ marginTop: '1rem', color: '#6B7280', fontSize: '0.95rem', lineHeight: 1.75 }}>{item.a}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CONTACTO */}
        <section id="contacto" style={{ ...s.section, background: C.dark }}>
          <div style={{ ...s.container, maxWidth: 600, textAlign: 'center' }}>
            <h2 style={{ ...s.h2, color: C.white }}>¿Hablamos de tu proyecto?</h2>
            <p style={{ color: C.pastel, marginBottom: '2.5rem' }}>Profesionales que elevan el potencial de tu negocio. Empieza hoy.</p>
            {contactSent ? (
              <div style={{ background: `${C.yellow}20`, border: `1px solid ${C.yellow}`, borderRadius: 12, padding: '2rem', color: C.yellow }}>¡Mensaje enviado! Te respondemos en menos de 24h.</div>
            ) : (
              <form onSubmit={handleContact} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <input required placeholder="Tu nombre" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.pastel}40`, borderRadius: 8, color: C.white, fontSize: '1rem', boxSizing: 'border-box' }} />
                <input required type="email" placeholder="tu@empresa.com" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.pastel}40`, borderRadius: 8, color: C.white, fontSize: '1rem', boxSizing: 'border-box' }} />
                <textarea required rows={4} placeholder="Cuéntanos tu proyecto..." value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.pastel}40`, borderRadius: 8, color: C.white, fontSize: '1rem', boxSizing: 'border-box', resize: 'vertical' as const }} />
                <button type="submit" style={{ ...s.btnPrimary, background: C.yellow, color: C.dark, justifyContent: 'center', minHeight: 50, width: '100%' }}>Enviar mensaje →</button>
              </form>
            )}
            <p style={{ marginTop: '1.5rem', color: C.pastel, fontSize: '0.9rem' }}>hola@mycompi.com</p>
          </div>
        </section>
      </main>

      {/* STICKY CTA */}
      <div className="sticky-cta" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.dark, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', zIndex: 200, transform: stickyVisible ? 'translateY(0)' : 'translateY(100%)', opacity: stickyVisible ? 1 : 0, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
        <span style={{ color: C.white, fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap' as const }}>3 días gratis — sin tarjeta</span>
        <Link href="/registro" style={{ background: C.yellow, color: C.dark, padding: '0.7rem 1.5rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>Empezar ahora →</Link>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1f1f2e', borderTop: `1px solid ${C.pastel}30`, padding: '2rem 0' }}>
        <div style={{ ...s.container, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: C.white, marginBottom: '0.5rem' }}><span style={{ color: C.yellow }}>My</span>Compi</div>
            <p style={{ color: C.pastel, fontSize: '0.85rem', opacity: 0.6 }}>Mi futuro es Hoy.</p>
          </div>
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.white, marginBottom: '0.75rem' }}>Producto</div>
              {[['Equipo', '#equipo'], ['Precios', '#precios'], ['FAQ', '#faq']].map(([label, href]) => (
                <a key={label} href={href} style={{ color: C.pastel, fontSize: '0.85rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>{label}</a>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.white, marginBottom: '0.75rem' }}>Legal</div>
              {[['Privacidad', '/privacidad'], ['Términos', '/terminos'], ['Cookies', '/cookies']].map(([label, href]) => (
                <Link key={label} href={href} style={{ color: C.pastel, fontSize: '0.85rem', opacity: 0.7, display: 'block', marginBottom: '0.4rem' }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div style={{ ...s.container, marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.pastel}20` }}>
          <p style={{ color: C.pastel, fontSize: '0.8rem', opacity: 0.4 }}>© 2026 Mycompi LLC — Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
