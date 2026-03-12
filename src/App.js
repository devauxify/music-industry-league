import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

const BRAND = "MUSIC INDUSTRY LEAGUE"

export default function App() {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [authMode, setAuthMode] = useState(null) // 'artist' | 'fan'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) detectRole(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) detectRole(session.user.id)
      else { setUserRole(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function detectRole(userId) {
    setLoading(true)
    const { data: artist } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (artist) { setUserRole('artist'); setLoading(false); return }
    const { data: fan } = await supabase
      .from('fans')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (fan) { setUserRole('fan'); setLoading(false); return }
    setUserRole(null)
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUserRole(null)
    setAuthMode(null)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontFamily:'monospace',letterSpacing:3,fontSize:11}}>
      LOADING...
    </div>
  )

  // Not logged in — show landing or auth
  if (!session) {
    if (authMode) return <Auth role={authMode} onBack={() => setAuthMode(null)} />
    return <Landing onArtist={() => setAuthMode('artist')} onFan={() => setAuthMode('fan')} />
  }

  // Logged in — route by role
  if (userRole === 'artist') return <ArtistDashboard session={session} onSignOut={handleSignOut} />
  if (userRole === 'fan')    return <FanDashboard session={session} onSignOut={handleSignOut} />

  // Logged in but no role yet — pick one
  return <PickRole session={session} onPicked={() => detectRole(session.user.id)} onSignOut={handleSignOut} />
}

// ─── LANDING ────────────────────────────────────────────────────────────────
function Landing({ onArtist, onFan }) {
  return (
    <div style={L.root}>
      <style>{GCSS}</style>
      <div style={L.gridBg} />
      <div style={L.glowA} />
      <div style={L.glowB} />
      <div style={L.center}>
        <div style={L.eyebrow}>THE OFFICIAL</div>
        <div style={L.logo}>{BRAND}</div>
        <div style={L.tagline}>Real-time artist rankings · Fan-powered · Cash prizes</div>
        <div style={L.cards}>
          <div style={L.card} onClick={onArtist}>
            <div style={L.cardEmoji}>🎵</div>
            <div style={L.cardTitle}>ARTIST PORTAL</div>
            <div style={L.cardBody}>Create your profile, log your activity across 15 categories, go live with a $60/yr subscription</div>
            <div style={L.cardCta}>ENTER PORTAL →</div>
          </div>
          <div style={{...L.card, borderColor:'rgba(180,255,60,0.25)', background:'rgba(180,255,60,0.03)'}} onClick={onFan}>
            <div style={L.cardEmoji}>🎧</div>
            <div style={L.cardTitle}>FAN DASHBOARD</div>
            <div style={L.cardBody}>Back artists, build rosters, earn multiplied points when artists tier up — and win cash prizes</div>
            <div style={{...L.cardCta, color:'#b4ff3c'}}>JOIN THE LEAGUE →</div>
          </div>
        </div>
        <div style={L.prizeBanner}>
          <span style={{color:'#ffd60a',fontWeight:800}}>💰 CURRENT PRIZE POOL: $2,400</span>
          <span style={{color:'#444',fontSize:11}}>·</span>
          <span style={{color:'#555',fontSize:11}}>Resets weekly · Top 4 fans win cash</span>
        </div>
        <div style={L.statRow}>
          {[['8','ARTISTS'],['5','TIERS'],['15','ACTIVITIES'],['×20','MAX MULT'],['$1,200','TOP PRIZE']].map(([n,l],i) => (
            <div key={i} style={L.stat}>
              <span style={{...L.statN, color:i===4?'#ffd60a':i===3?'#ff2d78':'#fff'}}>{n}</span>
              <span style={L.statL}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PICK ROLE (fallback if role not detected) ───────────────────────────────
function PickRole({ session, onPicked, onSignOut }) {
  const [loading, setLoading] = useState(false)

  async function pick(role) {
    setLoading(true)
    if (role === 'fan') {
      await supabase.from('fans').insert({
        user_id: session.user.id,
        username: session.user.email.split('@')[0],
        coins: 6,
      })
    }
    if (role === 'artist') {
      await supabase.from('artists').insert({
        user_id: session.user.id,
        name: session.user.email.split('@')[0],
        points: 0,
        verified: false,
        paid: false,
      })
    }
    onPicked()
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',padding:20}}>
      <div style={{maxWidth:400,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:11,letterSpacing:3,color:'#555',marginBottom:24}}>WELCOME — SELECT YOUR ROLE</div>
        <div style={{display:'flex',gap:12,marginBottom:20}}>
          <button style={{...PR.btn, borderColor:'rgba(255,45,120,0.3)'}} onClick={() => pick('artist')} disabled={loading}>
            <div style={{fontSize:28,marginBottom:8}}>🎵</div>
            <div style={{color:'#fff',fontWeight:700,letterSpacing:2}}>ARTIST</div>
          </button>
          <button style={{...PR.btn, borderColor:'rgba(180,255,60,0.3)'}} onClick={() => pick('fan')} disabled={loading}>
            <div style={{fontSize:28,marginBottom:8}}>🎧</div>
            <div style={{color:'#fff',fontWeight:700,letterSpacing:2}}>FAN</div>
          </button>
        </div>
        <button style={{background:'transparent',border:'none',color:'#333',fontSize:10,cursor:'pointer',fontFamily:'monospace',letterSpacing:2}} onClick={onSignOut}>
          SIGN OUT
        </button>
      </div>
    </div>
  )
}

// ─── ARTIST DASHBOARD (placeholder) ─────────────────────────────────────────
function ArtistDashboard({ session, onSignOut }) {
  return (
    <div style={{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',color:'#fff'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:11,letterSpacing:3,color:'#b4ff3c',marginBottom:8}}>ARTIST PORTAL</div>
        <div style={{fontSize:11,color:'#444',marginBottom:24}}>{session.user.email}</div>
        <div style={{color:'#333',fontSize:11,marginBottom:24}}>Artist dashboard coming next session</div>
        <button style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#555',padding:'8px 20px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={onSignOut}>
          SIGN OUT
        </button>
      </div>
    </div>
  )
}

// ─── FAN DASHBOARD (placeholder) ────────────────────────────────────────────
function FanDashboard({ session, onSignOut }) {
  return (
    <div style={{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'monospace',color:'#fff'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:11,letterSpacing:3,color:'#b4ff3c',marginBottom:8}}>FAN DASHBOARD</div>
        <div style={{fontSize:11,color:'#444',marginBottom:24}}>{session.user.email}</div>
        <div style={{color:'#333',fontSize:11,marginBottom:24}}>Fan dashboard coming next session</div>
        <button style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#555',padding:'8px 20px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={onSignOut}>
          SIGN OUT
        </button>
      </div>
    </div>
  )
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
const GCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap');
  * { box-sizing: border-box; }
`

const L = {
  root:{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",position:'relative',overflow:'hidden'},
  gridBg:{position:'fixed',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',backgroundSize:'48px 48px'},
  glowA:{position:'fixed',top:'20%',left:'15%',width:300,height:300,background:'radial-gradient(circle,rgba(180,255,60,0.05) 0%,transparent 70%)',pointerEvents:'none'},
  glowB:{position:'fixed',bottom:'20%',right:'15%',width:300,height:300,background:'radial-gradient(circle,rgba(255,45,120,0.05) 0%,transparent 70%)',pointerEvents:'none'},
  center:{position:'relative',zIndex:10,textAlign:'center',padding:'24px 20px',maxWidth:720,width:'100%'},
  eyebrow:{fontSize:10,letterSpacing:5,color:'#333',marginBottom:6},
  logo:{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(32px,6vw,64px)',letterSpacing:6,color:'#fff',lineHeight:1,marginBottom:8},
  tagline:{fontSize:12,color:'#b4ff3c',letterSpacing:3,marginBottom:32},
  cards:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24},
  card:{border:'1px solid rgba(255,45,120,0.2)',borderRadius:6,padding:'24px 20px',cursor:'pointer',background:'rgba(255,255,255,0.02)',textAlign:'left',transition:'all 0.2s'},
  cardEmoji:{fontSize:28,marginBottom:10},
  cardTitle:{fontSize:14,fontWeight:700,color:'#fff',letterSpacing:2,marginBottom:8},
  cardBody:{fontSize:11,color:'#555',lineHeight:1.6,marginBottom:14},
  cardCta:{fontSize:11,color:'#ff2d78',letterSpacing:2,fontWeight:700},
  prizeBanner:{display:'flex',gap:12,alignItems:'center',justifyContent:'center',padding:'10px 20px',border:'1px solid rgba(255,215,0,0.15)',borderRadius:4,background:'rgba(255,215,0,0.03)',marginBottom:24,flexWrap:'wrap'},
  statRow:{display:'flex',justifyContent:'center',alignItems:'center',gap:'clamp(12px,3vw,32px)',flexWrap:'wrap'},
  stat:{display:'flex',flexDirection:'column',alignItems:'center',gap:4},
  statN:{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2},
  statL:{fontSize:8,letterSpacing:3,color:'#333'},
}

const PR = {
  btn:{flex:1,background:'rgba(255,255,255,0.02)',border:'1px solid',borderRadius:6,padding:'24px 16px',cursor:'pointer',fontFamily:'monospace'},
}