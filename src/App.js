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
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .single()
    if (admin) { setUserRole('admin'); setLoading(false); return }
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
  if (userRole === 'admin')  return <AdminDashboard session={session} onSignOut={handleSignOut} />
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
function AdminDashboard({ session, onSignOut }) {
  const [tab, setTab] = useState('queue')
  const [uploads, setUploads] = useState([])
  const [artists, setArtists] = useState([])
  const [fans, setFans] = useState([])
  const [seasons, setSeasons] = useState([])
  const [activeSeason, setActiveSeason] = useState(null)
  const [leagueGames, setLeagueGames] = useState([])
  const [gamesPage, setGamesPage] = useState(0)
  const [gamesFilter, setGamesFilter] = useState({ artist:'', date:'' })
  const [gamesTotal, setGamesTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', genre:'', bio:'' })
  const [formMsg, setFormMsg] = useState('')

  useEffect(() => {
    if (tab === 'queue') loadQueue()
    if (tab === 'artists') loadArtists()
    if (tab === 'fans') loadFans()
    if (tab === 'league') { loadArtists(); loadSeasons(); loadLeagueGames(0, gamesFilter); }
  }, [tab])

  async function loadQueue() {
    setLoading(true)
    const { data } = await supabase
      .from('image_uploads')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setUploads(data || [])
    setLoading(false)
  }

  async function loadArtists() {
    setLoading(true)
    const { data } = await supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false })
    setArtists(data || [])
    setLoading(false)
  }

  async function loadFans() {
    setLoading(true)
    const { data } = await supabase
      .from('fans')
      .select('*')
      .order('created_at', { ascending: false })
    setFans(data || [])
    setLoading(false)
  }

  async function loadSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false })
    setSeasons(data || [])
    const active = (data || []).find(s => s.status === 'active')
    setActiveSeason(active || null)
  }

  async function loadLeagueGames(page=0, filter={}) {
    const from = page * 5
    const to = from + 4
    let query = supabase
      .from('games')
      .select('*, home:home_artist_id(name), away:away_artist_id(name)', { count: 'exact' })
      .order('scheduled_at', { ascending: false })
      .range(from, to)
    if (filter.date) query = query.gte('scheduled_at', filter.date).lte('scheduled_at', filter.date + 'T23:59:59')
    const { data, count, error } = await query
    if (error) console.log('games error:', error)
    setLeagueGames(data || [])
    setGamesTotal(count || 0)
    setGamesPage(page)
  }

  async function createSeason() {
    const name = document.getElementById('sname').value
    const start = document.getElementById('sstart').value
    const end = document.getElementById('send').value
    if (!name||!start||!end) { alert('All fields required'); return }
    const { error } = await supabase.from('seasons').insert({ name, start_date:start, end_date:end, status:'active' })
    if (error) { alert('Error: ' + error.message); return }
    await loadSeasons()
    alert('Season created!')
  }

  async function scheduleGame() {
    const home = document.getElementById('ghome').value
    const away = document.getElementById('gaway').value
    const time = document.getElementById('gtime').value
    if (!activeSeason) { alert('Create a season first'); return }
    if (home === away) { alert('Home and away must be different artists'); return }
    const { error } = await supabase.from('games').insert({ season_id: activeSeason.id, home_artist_id: home, away_artist_id: away, scheduled_at: time, status:'upcoming' })
    if (error) { alert('Error: ' + error.message); return }
    await loadLeagueGames()
    alert('Game scheduled!')
  }

  async function goLive(gameId) {
    await supabase.from('games').update({status:'live'}).eq('id', gameId)
    const now = new Date()
    for (let q=1; q<=4; q++) {
      const start = new Date(now.getTime()+(q-1)*12*60*1000)
      const end = new Date(now.getTime()+q*12*60*1000)
      const {error} = await supabase.from('game_quarters').insert({
        game_id: gameId,
        quarter_number: q,
        status: q===1?'live':'upcoming',
        starts_at: start.toISOString(),
        ends_at: end.toISOString()
      })
      if(error) console.log('quarter error:',error)
    }
    loadLeagueGames(gamesPage, gamesFilter)
  }

  async function advanceQuarter(gameId) {
    const { data: quarters } = await supabase
      .from('game_quarters')
      .select('*')
      .eq('game_id', gameId)
      .order('quarter_number')
    if (!quarters) return
    const liveQ = quarters.find(q => q.status === 'live')
    const nextQ = quarters.find(q => q.status === 'upcoming')
    if (liveQ) {
      await supabase.from('game_quarters').update({ status: 'finished' }).eq('id', liveQ.id)
    }
    if (nextQ) {
      await supabase.from('game_quarters').update({ status: 'live' }).eq('id', nextQ.id)
      alert(`Q${nextQ.quarter_number} is now live!`)
    } else {
      await endGame(gameId, quarters)
    }
    loadLeagueGames(gamesPage, gamesFilter)
  }

  async function endGame(gameId, quarters) {
    const homeTotal = quarters.reduce((s,q) => s + (q.home_points||0), 0)
    const awayTotal = quarters.reduce((s,q) => s + (q.away_points||0), 0)
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (!game) return
    const winnerId = homeTotal >= awayTotal ? game.home_artist_id : game.away_artist_id
    await supabase.from('games').update({
      status: 'finished',
      home_score: Math.round(homeTotal),
      away_score: Math.round(awayTotal),
      winner_id: winnerId
    }).eq('id', gameId)
    await supabase.from('artist_season_stats').upsert([
      { artist_id: winnerId, season_id: game.season_id, wins: 1 },
    ], { onConflict: 'artist_id,season_id', ignoreDuplicates: false })
    alert(`Game over! Winner calculated. Awarding fan points...`)
    await awardFanPoints(gameId, winnerId)
  }

  async function awardFanPoints(gameId, winnerId) {
    const { data: picks } = await supabase
      .from('draft_picks')
      .select('*, drafts(fan_id, season_id)')
      .eq('artist_id', winnerId)
    if (!picks) return
    for (const pick of picks) {
      const pts = pick.slot === 'bench' ? 5 : 10
      const fanId = pick.drafts?.fan_id
      const seasonId = pick.drafts?.season_id
      if (!fanId || !seasonId) continue
      const { data: existing } = await supabase
        .from('fan_season_points')
        .select('*')
        .eq('fan_id', fanId)
        .eq('season_id', seasonId)
        .single()
      if (existing) {
        await supabase.from('fan_season_points').update({ points: existing.points + pts }).eq('id', existing.id)
      } else {
        await supabase.from('fan_season_points').insert({ fan_id: fanId, season_id: seasonId, points: pts })
      }
    }
    alert('Fan points awarded!')
  }

  async function approveImage(upload) {
    await supabase.from('image_uploads').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id
    }).eq('id', upload.id)
    if (upload.upload_type === 'profile') {
      await supabase.from('artists').update({
        profile_image: upload.file_url,
        image_status: 'approved'
      }).eq('user_id', upload.user_id)
    }
    if (upload.upload_type === 'cover') {
      await supabase.from('projects').update({
        cover_image: upload.file_url,
        cover_image_status: 'approved'
      }).eq('artist_id', (await supabase.from('artists').select('id').eq('user_id', upload.user_id).single()).data?.id)
      .eq('cover_image', upload.file_url)
    }
    loadQueue()
  }

  async function rejectImage(upload) {
    const reason = prompt('Reason for rejection (optional):') || 'Did not meet community guidelines'
    await supabase.from('image_uploads').update({
      status: 'rejected',
      rejected_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.user.id
    }).eq('id', upload.id)
    await supabase.storage.from(upload.bucket).remove([upload.file_path])
    if (upload.upload_type === 'profile') {
      await supabase.from('artists').update({
        profile_image: null,
        image_status: 'rejected'
      }).eq('user_id', upload.user_id)
    }
    if (upload.upload_type === 'cover') {
      const { data: artistData } = await supabase.from('artists').select('id').eq('user_id', upload.user_id).single()
      if (artistData) {
        await supabase.from('projects').update({
          cover_image: null,
          cover_image_status: 'rejected'
        }).eq('artist_id', artistData.id).eq('cover_image', upload.file_url)
      }
    }
    loadQueue()
  }

  async function createArtist() {
    if (!form.name || !form.email) { setFormMsg('Name and email are required'); return }
    setLoading(true)
    setFormMsg('')
    const { error: artistError } = await supabase.from('artists').insert({
      user_id: null,
      name: form.name,
      genre: form.genre,
      bio: form.bio,
      points: 0,
      verified: false,
      paid: false,
      status: 'invited',
      tier: 'rising',
      salary: 10,
    })
    if (artistError) { setFormMsg('Error: ' + artistError.message); setLoading(false); return }
    setFormMsg(`Artist profile created! Ask ${form.name} to sign up at ${window.location.origin} using ${form.email} and select Artist role.`)
    setForm({ name:'', email:'', genre:'', bio:'' })
    setLoading(false)
  }

  async function changePassword() {
    const newPassword = prompt('Enter new admin password (min 6 characters):')
    if (!newPassword) return
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { alert('Error: ' + error.message); return }
    alert('Password updated successfully!')
  }

  const T = {
    root:{minHeight:'100vh',background:'#05070a',fontFamily:'monospace',color:'#fff'},
    header:{borderBottom:'1px solid #111',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'},
    logo:{fontSize:11,letterSpacing:3,color:'#b4ff3c'},
    email:{fontSize:10,color:'#333'},
    nav:{display:'flex',gap:0,borderBottom:'1px solid #111'},
    navBtn:{background:'transparent',border:'none',borderBottom:'2px solid transparent',color:'#444',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace',padding:'12px 20px'},
    navActive:{color:'#b4ff3c',borderBottom:'2px solid #b4ff3c'},
    body:{padding:'24px'},
    card:{border:'1px solid #111',borderRadius:4,padding:'16px',marginBottom:12,display:'flex',gap:16,alignItems:'flex-start'},
    img:{width:80,height:80,objectFit:'cover',borderRadius:4,border:'1px solid #222'},
    approve:{background:'transparent',border:'1px solid rgba(180,255,60,0.4)',color:'#b4ff3c',padding:'6px 14px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace',marginRight:8},
    reject:{background:'transparent',border:'1px solid rgba(255,45,120,0.4)',color:'#ff2d78',padding:'6px 14px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'},
    label:{fontSize:9,letterSpacing:2,color:'#333',marginBottom:4},
    input:{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px 12px',fontSize:11,fontFamily:'monospace',width:'100%',marginBottom:12,boxSizing:'border-box'},
    textarea:{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px 12px',fontSize:11,fontFamily:'monospace',width:'100%',marginBottom:12,height:80,boxSizing:'border-box'},
    submitBtn:{background:'transparent',border:'1px solid rgba(180,255,60,0.4)',color:'#b4ff3c',padding:'10px 24px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'},
    row:{border:'1px solid #111',borderRadius:4,padding:'12px 16px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'},
    badge:{fontSize:9,letterSpacing:1,padding:'3px 8px',borderRadius:2},
  }

  return (
    <div style={T.root}>
      <div style={T.header}>
        <div>
          <div style={T.logo}>MUSIC INDUSTRY LEAGUE — ADMIN</div>
          <div style={T.email}>{session.user.email}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...T.reject,fontSize:9}} onClick={changePassword}>CHANGE PASSWORD</button>
          <button style={{...T.reject,fontSize:9}} onClick={onSignOut}>SIGN OUT</button>
        </div>
      </div>

      <div style={T.nav}>
        {[['queue','IMAGE QUEUE'],['create','CREATE ARTIST'],['artists','ARTISTS'],['fans','FANS'],['league','LEAGUE MANAGER']].map(([id,label])=>(
          <button key={id} style={{...T.navBtn,...(tab===id?T.navActive:{})}} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={T.body}>

        {tab==='queue' && (
          <div>
            <div style={{fontSize:10,color:'#333',marginBottom:16,letterSpacing:2}}>PENDING IMAGE APPROVALS — {uploads.length}</div>
            {loading && <div style={{color:'#333',fontSize:11}}>Loading...</div>}
            {!loading && uploads.length===0 && <div style={{color:'#333',fontSize:11}}>No pending images</div>}
            {uploads.map(u=>(
              <div key={u.id} style={T.card}>
                <img src={u.file_url} alt="upload" style={T.img} />
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:'#555',marginBottom:4}}>{u.upload_type.toUpperCase()} — {u.bucket}</div>
                  <div style={{fontSize:10,color:'#333',marginBottom:12}}>{new Date(u.created_at).toLocaleDateString()}</div>
                  <button style={T.approve} onClick={()=>approveImage(u)}>APPROVE</button>
                  <button style={T.reject} onClick={()=>rejectImage(u)}>REJECT</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='create' && (
          <div style={{maxWidth:480}}>
            <div style={{fontSize:10,color:'#333',marginBottom:20,letterSpacing:2}}>CREATE ARTIST ACCOUNT</div>
            <div style={T.label}>ARTIST NAME *</div>
            <input style={T.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Artist name" />
            <div style={T.label}>EMAIL ADDRESS *</div>
            <input style={T.input} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="artist@email.com" />
            <div style={T.label}>GENRE</div>
            <input style={T.input} value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} placeholder="Hip-hop, R&B, Pop..." />
            <div style={T.label}>BIO</div>
            <textarea style={T.textarea} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Artist bio..." />
            {formMsg && <div style={{fontSize:11,color:formMsg.startsWith('Error')?'#ff2d78':'#b4ff3c',marginBottom:12}}>{formMsg}</div>}
            <button style={T.submitBtn} onClick={createArtist} disabled={loading}>
              {loading?'CREATING...':'CREATE ARTIST →'}
            </button>
          </div>
        )}

        {tab==='artists' && (
          <div>
            <div style={{fontSize:10,color:'#333',marginBottom:16,letterSpacing:2}}>ALL ARTISTS — {artists.length}</div>
            {loading && <div style={{color:'#333',fontSize:11}}>Loading...</div>}
            {artists.map(a=>(
              <div key={a.id} style={T.row}>
                <div>
                  <div style={{fontSize:12,color:'#fff',marginBottom:4}}>{a.name}</div>
                  <div style={{fontSize:10,color:'#444'}}>{a.genre || 'No genre'} · {a.points || 0} pts</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{...T.badge,background:a.paid?'rgba(180,255,60,0.1)':'rgba(255,45,120,0.1)',color:a.paid?'#b4ff3c':'#ff2d78'}}>{a.paid?'PAID':'UNPAID'}</span>
                  <span style={{...T.badge,background:'rgba(255,255,255,0.05)',color:'#444'}}>{a.status||'active'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='fans' && (
          <div>
            <div style={{fontSize:10,color:'#333',marginBottom:16,letterSpacing:2}}>ALL FANS — {fans.length}</div>
            {loading && <div style={{color:'#333',fontSize:11}}>Loading...</div>}
            {fans.map(f=>(
              <div key={f.id} style={T.row}>
                <div>
                  <div style={{fontSize:12,color:'#fff',marginBottom:4}}>{f.username||'No username'}</div>
                  <div style={{fontSize:10,color:'#444'}}>{f.coins||0} coins</div>
                </div>
                <span style={{...T.badge,background:'rgba(180,255,60,0.05)',color:'#333'}}>FAN</span>
              </div>
            ))}
          </div>
        )}

        {tab==='league' && (
          <div>
            <div style={{fontSize:10,color:'#333',marginBottom:20,letterSpacing:2}}>LEAGUE MANAGER</div>

            {activeSeason && (
              <div style={{...T.row,marginBottom:20,background:'rgba(180,255,60,0.03)',borderColor:'rgba(180,255,60,0.15)'}}>
                <div>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:4}}>ACTIVE SEASON</div>
                  <div style={{fontSize:13,color:'#b4ff3c'}}>{activeSeason.name}</div>
                  <div style={{fontSize:10,color:'#444',marginTop:4}}>{activeSeason.start_date} → {activeSeason.end_date}</div>
                </div>
                <button style={{...T.reject,fontSize:9}} onClick={async()=>{
                  await supabase.from('seasons').update({status:'ended'}).eq('id',activeSeason.id)
                  loadSeasons()
                }}>END SEASON</button>
              </div>
            )}

            {seasons.length > 0 && (
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>ALL SEASONS</div>
                {seasons.map(s=>(
                  <div key={s.id} style={{...T.row,marginBottom:6}}>
                    <div style={{fontSize:11,color:'#fff'}}>{s.name}</div>
                    <span style={{fontSize:9,padding:'3px 8px',background:s.status==='active'?'rgba(180,255,60,0.1)':'rgba(255,255,255,0.05)',color:s.status==='active'?'#b4ff3c':'#444'}}>{s.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{...T.row,marginBottom:20,flexDirection:'column',alignItems:'flex-start',gap:16}}>
              <div style={{fontSize:9,color:'#333',letterSpacing:2}}>CREATE SEASON</div>
              <input style={T.input} id="sname" placeholder="Season name e.g. Season 1 — 2026" />
              <div style={{display:'flex',gap:12}}>
                <div>
                  <div style={{...T.label,marginBottom:4}}>START DATE</div>
                  <input style={{...T.input,marginBottom:0}} type="date" id="sstart" />
                </div>
                <div>
                  <div style={{...T.label,marginBottom:4}}>END DATE</div>
                  <input style={{...T.input,marginBottom:0}} type="date" id="send" />
                </div>
              </div>
              <button style={T.submitBtn} onClick={createSeason}>CREATE SEASON →</button>
            </div>

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>SET ARTIST TIERS & SALARY</div>
            <ArtistTierSearch supabase={supabase} />

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12,marginTop:24}}>SCHEDULE A GAME</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
              <div>
                <div style={T.label}>HOME ARTIST</div>
                <select id="ghome" style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px',fontSize:10,fontFamily:'monospace',minWidth:160}}>
                  {artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div style={T.label}>AWAY ARTIST</div>
                <select id="gaway" style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px',fontSize:10,fontFamily:'monospace',minWidth:160}}>
                  {artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <div style={T.label}>DATE & TIME</div>
                <input type="datetime-local" id="gtime" style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px',fontSize:10,fontFamily:'monospace'}} />
              </div>
            </div>
            <button style={T.submitBtn} onClick={scheduleGame}>SCHEDULE GAME →</button>
            {true && (
              <div style={{marginTop:24}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>SCHEDULED GAMES — {gamesTotal} total</div>
                <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                  <input type="date" style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'6px 10px',fontSize:10,fontFamily:'monospace'}} value={gamesFilter.date} onChange={e=>{const f={...gamesFilter,date:e.target.value};setGamesFilter(f);loadLeagueGames(0,f);}} />
                  <input placeholder="Filter by artist..." style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'6px 10px',fontSize:10,fontFamily:'monospace',minWidth:180}} value={gamesFilter.artist} onChange={e=>{const f={...gamesFilter,artist:e.target.value};setGamesFilter(f);loadLeagueGames(0,f);}} />
                  {(gamesFilter.date||gamesFilter.artist) && <button style={{background:'transparent',border:'1px solid #222',color:'#444',padding:'6px 10px',fontSize:10,fontFamily:'monospace',cursor:'pointer'}} onClick={()=>{setGamesFilter({artist:'',date:''});loadLeagueGames(0,{});}}>CLEAR</button>}
                </div>
                {leagueGames.map(g=>(
                  <div key={g.id} style={{...T.row,marginBottom:8,flexWrap:'wrap',gap:8}}>
                    <div style={{fontSize:11,color:'#fff',flex:1}}>{g.home?.name} <span style={{color:'#333'}}>vs</span> {g.away?.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{g.scheduled_at ? new Date(g.scheduled_at).toLocaleString() : 'TBD'}</div>
                    <span style={{fontSize:9,padding:'3px 8px',background:g.status==='live'?'rgba(255,45,120,0.1)':g.status==='finished'?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.03)',color:g.status==='live'?'#ff2d78':g.status==='finished'?'#555':'#444'}}>{g.status.toUpperCase()}</span>
                    {g.status==='upcoming' && <button style={{...T.approve,padding:'4px 10px',fontSize:9}} onClick={()=>goLive(g.id)}>GO LIVE</button>}
                  {g.status==='live' && <button style={{...T.approve,padding:'4px 10px',fontSize:9}} onClick={()=>advanceQuarter(g.id)}>NEXT QUARTER →</button>}
                    <button style={{...T.reject,padding:'4px 10px',fontSize:9}} onClick={async()=>{
                      await supabase.from('games').delete().eq('id',g.id)
                      loadLeagueGames()
                    }}>DELETE</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )

  function ArtistTierSearch({ supabase }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [tier, setTier] = useState('rising')
  const [salary, setSalary] = useState(10)
  const [msg, setMsg] = useState('')

  async function search(q) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase.from('artists').select('*').ilike('name', `%${q}%`).limit(5)
    setResults(data || [])
  }

  function select(a) {
    setSelected(a)
    setTier(a.tier || 'rising')
    setSalary(a.salary || 10)
    setResults([])
    setQuery(a.name)
    setMsg('')
  }

  async function save() {
    if (!selected) return
    const { error } = await supabase.from('artists').update({ tier, salary }).eq('id', selected.id)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg(`${selected.name} updated — ${tier}, $${salary}`)
    setSelected(null)
    setQuery('')
  }

  const S = {
    input:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', boxSizing:'border-box' },
    select:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', boxSizing:'border-box', marginTop:8 },
    result:{ padding:'8px 12px', borderBottom:'1px solid #111', cursor:'pointer', fontSize:11, color:'#fff' },
    btn:{ background:'transparent', border:'1px solid rgba(180,255,60,0.4)', color:'#b4ff3c', padding:'8px 20px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace', marginTop:8 },
  }

  return (
    <div style={{marginBottom:24}}>
      <div style={{position:'relative'}}>
        <input style={S.input} value={query} onChange={e=>search(e.target.value)} placeholder="Search artist name..." />
        {results.length > 0 && (
          <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#0d0d0d',border:'1px solid #222',zIndex:10}}>
            {results.map(a=>(
              <div key={a.id} style={S.result} onClick={()=>select(a)}>
                {a.name} <span style={{color:'#444',fontSize:10}}>· {a.tier||'rising'} · ${a.salary||10}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div style={{marginTop:12,border:'1px solid #111',padding:16,borderRadius:4}}>
          <div style={{fontSize:11,color:'#fff',marginBottom:8}}>{selected.name}</div>
          <select style={S.select} value={tier} onChange={e=>setTier(e.target.value)}>
            <option value="rising">Rising Star</option>
            <option value="superstar">Superstar</option>
          </select>
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
            <div style={{fontSize:10,color:'#444'}}>SALARY $</div>
            <input type="number" min="1" max="50" value={salary} onChange={e=>setSalary(parseInt(e.target.value))} style={{...S.input,width:80}} />
          </div>
          <button style={S.btn} onClick={save}>SAVE CHANGES →</button>
          {msg && <div style={{fontSize:11,color:'#b4ff3c',marginTop:8}}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
}

function ArtistDashboard({ session, onSignOut }) {
  const [tab, setTab] = useState('profile')
  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name:'', genre:'', bio:'' })
  const [uploading, setUploading] = useState(false)

  // Charts
  const [charts, setCharts] = useState([])
  const [chartForm, setChartForm] = useState({ chart_name:'', project_name:'', peak_position:'' })
  const [chartMsg, setChartMsg] = useState('')

  // Awards
  const [awards, setAwards] = useState([])
  const [awardForm, setAwardForm] = useState({ award_name:'', category:'', type:'win', year: new Date().getFullYear() })
  const [awardMsg, setAwardMsg] = useState('')

  // Projects
  // Festivals
  const [festivals, setFestivals] = useState([])
  const [festivalForm, setFestivalForm] = useState({ festival_name:'', location:'', festival_date:'', headlining:false })
  const [festivalMsg, setFestivalMsg] = useState('')
  const [projects, setProjects] = useState([])
  const [projectForm, setProjectForm] = useState({ title:'', release_type:'album', release_date:'' })
  const [projectMsg, setProjectMsg] = useState('')
  const [projectFile, setProjectFile] = useState(null)

  useEffect(() => { loadArtist() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!artist) return
    if (tab === 'charts') loadCharts()
    if (tab === 'awards') loadAwards()
    if (tab === 'projects') loadProjects()
    if (tab === 'festivals') loadFestivals()
    
    
  }, [tab, artist]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadArtist() {
    const { data } = await supabase.from('artists').select('*').eq('user_id', session.user.id).single()
    if (data) { setArtist(data); setForm({ name: data.name||'', genre: data.genre||'', bio: data.bio||'' }) }
  }

  useEffect(() => {
    const channel = supabase
      .channel('artist-image-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'artists',
        filter: `user_id=eq.${session.user.id}`
      }, () => { loadArtist() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'projects'
      }, (payload) => { if (artist) loadProjects() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile() {
    setLoading(true); setMessage('')
    const { error } = await supabase.from('artists').update({ name: form.name, genre: form.genre, bio: form.bio }).eq('user_id', session.user.id)
    if (error) setMessage('Error: ' + error.message)
    else { setMessage('Profile saved!'); loadArtist() }
    setLoading(false)
  }

  async function uploadProfileImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('Image must be under 5MB'); return }
    setUploading(true); setMessage('')
    const ext = file.name.split('.').pop()
    const path = `${session.user.id}/profile-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file)
    if (uploadError) { setMessage('Upload error: ' + uploadError.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(path)
    await supabase.from('image_uploads').insert({ user_id: session.user.id, bucket: 'profile-images', file_path: path, file_url: urlData.publicUrl, upload_type: 'profile', status: 'pending' })
    await supabase.from('artists').update({ image_status: 'pending' }).eq('user_id', session.user.id)
    setMessage('Profile image uploaded — pending admin approval.')
    setUploading(false); loadArtist()
  }

  async function loadCharts() {
    const { data } = await supabase.from('chart_entries').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false })
    setCharts(data || [])
  }

  async function addChart() {
    if (!chartForm.chart_name || !chartForm.project_name || !chartForm.peak_position) { setChartMsg('All fields required'); return }
    setChartMsg('')
    const pos = parseInt(chartForm.peak_position)
    let pts = 75
    if (pos === 1) pts = 300
    else if (pos <= 10) pts = 150
    const { error } = await supabase.from('chart_entries').insert({ artist_id: artist.id, chart_name: chartForm.chart_name, project_name: chartForm.project_name, peak_position: pos, points: pts })
    if (error) { setChartMsg('Error: ' + error.message); return }
    await supabase.from('artists').update({ points: (artist.points || 0) + pts }).eq('user_id', session.user.id)
    setChartForm({ chart_name:'', project_name:'', peak_position:'' })
    setChartMsg(`Chart entry added! +${pts} pts`)
    loadArtist()
    loadCharts()
  }

  async function deleteChart(id) {
    await supabase.from('chart_entries').delete().eq('id', id)
    loadCharts()
  }

  async function loadAwards() {
    const { data } = await supabase.from('awards').select('*').eq('artist_id', artist.id).order('year', { ascending: false })
    setAwards(data || [])
  }

  async function addAward() {
    if (!awardForm.award_name || !awardForm.category || !awardForm.year) { setAwardMsg('All fields required'); return }
    setAwardMsg('')
    const pts = awardForm.type === 'win' ? 250 : 100
    const { error } = await supabase.from('awards').insert({ artist_id: artist.id, ...awardForm, year: parseInt(awardForm.year), points: pts })
    if (error) { setAwardMsg('Error: ' + error.message); return }
    await supabase.from('artists').update({ points: (artist.points || 0) + pts }).eq('user_id', session.user.id)
    setAwardForm({ award_name:'', category:'', type:'win', year: new Date().getFullYear() })
    setAwardMsg(`Award added! +${pts} pts`)
    loadArtist()
    loadAwards()
  }

  async function deleteAward(id) {
    await supabase.from('awards').delete().eq('id', id)
    loadAwards()
  }

  async function loadProjects() {
    const { data } = await supabase.from('projects').select('*').eq('artist_id', artist.id).order('release_date', { ascending: false })
    setProjects(data || [])
  }

  async function addProject() {
    if (!projectForm.title || !projectForm.release_date) { setProjectMsg('Title and release date required'); return }
    setProjectMsg('')
    let cover_image = null
    let cover_image_status = 'none'
    if (projectFile) {
      if (projectFile.size > 5 * 1024 * 1024) { setProjectMsg('Image must be under 5MB'); return }
      const ext = projectFile.name.split('.').pop()
      const path = `${session.user.id}/cover-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('album-images').upload(path, projectFile)
      if (uploadError) { setProjectMsg('Upload error: ' + uploadError.message); return }
      const { data: urlData } = supabase.storage.from('album-images').getPublicUrl(path)
      cover_image = urlData.publicUrl
      cover_image_status = 'pending'
      await supabase.from('image_uploads').insert({ user_id: session.user.id, bucket: 'album-images', file_path: path, file_url: urlData.publicUrl, upload_type: 'cover', status: 'pending' })
    }
    const { error } = await supabase.from('projects').insert({ artist_id: artist.id, ...projectForm, cover_image, cover_image_status })
    if (error) { setProjectMsg('Error: ' + error.message); return }
    setProjectForm({ title:'', release_type:'album', release_date:'' })
    setProjectFile(null)
    setProjectMsg('Project added!')
    loadProjects()
  }

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id)
    loadProjects()
  }

  async function loadFestivals() {
    const { data } = await supabase.from('festival_bookings').select('*').eq('artist_id', artist.id).order('festival_date', { ascending: false })
    setFestivals(data || [])
  }

  async function addFestival() {
    if (!festivalForm.festival_name || !festivalForm.festival_date) { setFestivalMsg('Festival name and date required'); return }
    setFestivalMsg('')
    const pts = festivalForm.headlining === true || festivalForm.headlining === 'true' ? 200 : 80
    const { error } = await supabase.from('festival_bookings').insert({ artist_id: artist.id, ...festivalForm })
    if (error) { setFestivalMsg('Error: ' + error.message); return }
    await supabase.from('artists').update({ points: (artist.points || 0) + pts }).eq('user_id', session.user.id)
    setFestivalForm({ festival_name:'', location:'', festival_date:'', headlining:false })
    setFestivalMsg(`Festival booking added! +${pts} pts`)
    loadArtist()
    loadFestivals()
  }

  async function deleteFestival(id) {
    await supabase.from('festival_bookings').delete().eq('id', id)
    loadFestivals()
  }

  const TIERS = [
    {name:'NEWCOMER',    min:0,    max:499,    color:'#888888'},
    {name:'EMERGING',    min:500,  max:1999,   color:'#b4ff3c'},
    {name:'RISING',      min:2000, max:4999,   color:'#ffd60a'},
    {name:'BREAKTHROUGH',min:5000, max:14999,  color:'#ff9500'},
    {name:'ICON',        min:15000,max:Infinity,color:'#ff2d78'},
  ]
  const pts = artist?.points || 0
  const tier = TIERS.filter(t => pts >= t.min).pop() || TIERS[0]
  const tierColor = tier.color
  const POINT_COLORS = ['#888888','#b4ff3c','#ffd60a','#ff9500','#ff2d78']
  function ptColor(n) { return POINT_COLORS[Math.floor(n / 100) % POINT_COLORS.length] }
  const [, forceUpdate] = useState(0)
  useEffect(() => { if (artist) forceUpdate(n => n + 1) }, [artist])

  const T = {
    root:{ minHeight:'100vh', background:'#05070a', fontFamily:'monospace', color:'#fff' },
    header:{ borderBottom:`1px solid ${tierColor}22`, padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(180deg, ${tierColor}08 0%, transparent 100%)` },
    logo:{ fontSize:11, letterSpacing:3, color:tierColor },
    nav:{ display:'flex', gap:0, borderBottom:'1px solid #111', flexWrap:'wrap' },
    navBtn:{ background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#444', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace', padding:'12px 20px' },
    navActive:{ color:tierColor, borderBottom:`2px solid ${tierColor}` },
    body:{ padding:'24px', maxWidth:640 },
    label:{ fontSize:9, letterSpacing:2, color:'#333', marginBottom:4, display:'block' },
    input:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, boxSizing:'border-box' },
    select:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, boxSizing:'border-box' },
    textarea:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, height:100, boxSizing:'border-box' },
    btn:{ background:'transparent', border:`1px solid ${tierColor}66`, color:tierColor, padding:'10px 24px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    delBtn:{ background:'transparent', border:'none', color:'#333', fontSize:10, cursor:'pointer', fontFamily:'monospace', padding:'4px 8px' },
    signout:{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#555', padding:'8px 20px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    card:{ border:'1px solid #111', borderLeft:`3px solid ${tierColor}44`, borderRadius:4, padding:'14px 16px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
    cardTitle:{ fontSize:12, color:'#fff', marginBottom:4 },
    cardSub:{ fontSize:10, color:'#444' },
    badge:{ fontSize:9, letterSpacing:1, padding:'3px 8px', borderRadius:2 },
    msg:{ fontSize:11, marginBottom:12 },
    divider:{ borderTop:'1px solid #111', margin:'24px 0' },
    sectionTitle:{ fontSize:9, letterSpacing:3, color:'#333', marginBottom:16 },
    uploadBox:{ border:`1px dashed ${tierColor}33`, borderRadius:4, padding:'16px', textAlign:'center', marginBottom:12, cursor:'pointer', display:'block' },
    avatar:{ width:72, height:72, borderRadius:4, objectFit:'cover', border:`1px solid ${tierColor}44`, marginBottom:10 },
    cover:{ width:48, height:48, borderRadius:3, objectFit:'cover', border:'1px solid #222', marginRight:12, flexShrink:0 },
  }

  return (
    <div style={T.root}>
      <div style={T.header}>
  <div>
    <div style={T.logo}>MUSIC INDUSTRY LEAGUE — ARTIST</div>
    <div style={{fontSize:10,color:'#333'}}>{artist?.name || session.user.email}</div>
  </div>
  <div style={{display:'flex',gap:16,alignItems:'center'}}>
    <div style={{textAlign:'right'}}>
  {(() => {
    const pts = artist?.points || 0
    const TIERS = [
  {name:'NEWCOMER',    min:0,    max:499,    next:'EMERGING',     mult:'×20', color:'#888888'},
  {name:'EMERGING',    min:500,  max:1999,   next:'RISING',       mult:'×10', color:'#b4ff3c'},
  {name:'RISING',      min:2000, max:4999,   next:'BREAKTHROUGH', mult:'×5',  color:'#ffd60a'},
  {name:'BREAKTHROUGH',min:5000, max:14999,  next:'ICON',         mult:'×2',  color:'#ff9500'},
  {name:'ICON',        min:15000,max:Infinity,next:null,          mult:null,  color:'#ff2d78'},
]
    const tier = TIERS.filter(t => pts >= t.min).pop()
    const progress = tier.max === Infinity ? 100 : Math.round(((pts - tier.min) / (tier.max - tier.min + 1)) * 100)
    return (
      <div style={{minWidth:220}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <span style={{fontSize:10,color:tier.color,letterSpacing:2}}>{tier.name}</span>
          {tier.next && <span style={{fontSize:9,color:'#333'}}>{tier.next} {tier.mult}</span>}
          <span style={{fontSize:18,color:ptColor(pts),fontWeight:700,marginLeft:12}}>{pts.toLocaleString()}</span>
        </div>
        <div style={{background:'#111',borderRadius:2,height:3,width:'100%'}}>
          <div style={{background:tier.color,height:3,borderRadius:2,width:`${progress}%`,transition:'width 0.5s'}} />
        </div>
        {tier.next && (
          <div style={{fontSize:9,color:'#333',marginTop:3,textAlign:'right'}}>
            {(tier.max + 1 - pts).toLocaleString()} pts to {tier.next}
          </div>
        )}
      </div>
    )
  })()}
</div>
    <button style={T.signout} onClick={onSignOut}>SIGN OUT</button>
  </div>
</div>

      <div style={T.nav}>
        {[['profile','PROFILE'],['projects','PROJECTS'],['charts','CHARTS'],['awards','AWARDS'],['festivals','FESTIVALS'],['points','POINTS GUIDE'],['subscription','SUBSCRIPTION']].map(([id,label])=>(
          <button key={id} style={{...T.navBtn,...(tab===id?T.navActive:{})}} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={T.body}>

        {/* ── PROFILE ── */}
        {tab==='profile' && (
          <div>
            <div style={T.sectionTitle}>YOUR PROFILE</div>
            {artist?.profile_image
              ? <img src={artist.profile_image} alt="profile" style={T.avatar} />
              : <div style={{...T.avatar, background:'#111', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontSize:9}}>NO PHOTO</div>
            }
            <div style={{fontSize:9,color:'#333',marginBottom:16}}>
              {artist?.image_status==='approved'?'✓ Photo approved':artist?.image_status==='pending'?'⏳ Photo pending approval':artist?.image_status==='rejected'?'✗ Photo rejected — upload a new one':'No photo uploaded'}
            </div>
            <label style={T.label}>ARTIST NAME</label>
            <input style={T.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your artist name" />
            <label style={T.label}>GENRE</label>
            <input style={T.input} value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} placeholder="Hip-hop, R&B, Pop..." />
            <label style={T.label}>BIO</label>
            <textarea style={T.textarea} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Tell fans about yourself..." />
            {message && <div style={{...T.msg,color:message.startsWith('Error')?'#ff2d78':'#b4ff3c'}}>{message}</div>}
            <button style={T.btn} onClick={saveProfile} disabled={loading}>{loading?'SAVING...':'SAVE PROFILE →'}</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>PROFILE PHOTO</div>
            <label style={T.uploadBox}>
              <div style={{fontSize:10,color:'#444',marginBottom:4}}>{uploading?'Uploading...':'Click to upload profile photo'}</div>
              <div style={{fontSize:9,color:'#333'}}>JPG, PNG or WEBP · Max 5MB · Reviewed before going live</div>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadProfileImage} disabled={uploading} />
            </label>
          </div>
        )}

        {/* ── PROJECTS ── */}
        {tab==='projects' && (
          <div>
            <div style={T.sectionTitle}>DROP A PROJECT</div>
            <label style={T.label}>TITLE</label>
            <input style={T.input} value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})} placeholder="Project title" />
            <label style={T.label}>RELEASE TYPE</label>
            <select style={T.select} value={projectForm.release_type} onChange={e=>setProjectForm({...projectForm,release_type:e.target.value})}>
              <option value="album">Album</option>
              <option value="ep">EP</option>
              <option value="single">Single</option>
              <option value="mixtape">Mixtape</option>
            </select>
            <label style={T.label}>RELEASE DATE</label>
            <input style={T.input} type="date" value={projectForm.release_date} onChange={e=>setProjectForm({...projectForm,release_date:e.target.value})} />
            <label style={T.label}>COVER IMAGE</label>
            <label style={T.uploadBox}>
              <div style={{fontSize:10,color:'#444',marginBottom:4}}>{projectFile?projectFile.name:'Click to upload cover image'}</div>
              <div style={{fontSize:9,color:'#333'}}>JPG, PNG or WEBP · Max 5MB · Reviewed before going live</div>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>setProjectFile(e.target.files[0])} />
            </label>
            {projectMsg && <div style={{...T.msg,color:projectMsg.startsWith('Error')?'#ff2d78':'#b4ff3c'}}>{projectMsg}</div>}
            <button style={T.btn} onClick={addProject}>ADD PROJECT →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR PROJECTS — {projects.length}</div>
            {projects.length===0 && <div style={{fontSize:11,color:'#333'}}>No projects yet</div>}
            {projects.map(p=>(
              <div key={p.id} style={{...T.card, alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center'}}>
                  {p.cover_image
                    ? <img src={p.cover_image} alt="cover" style={T.cover} />
                    : <div style={{...T.cover, background:'#111', display:'flex', alignItems:'center', justifyContent:'center', color:'#333', fontSize:8}}>NO ART</div>
                  }
                  <div>
                    <div style={T.cardTitle}>{p.title}</div>
                    <div style={T.cardSub}>{p.release_type.toUpperCase()} · {p.release_date}</div>
                    {p.cover_image_status==='pending' && <div style={{fontSize:9,color:'#888',marginTop:3}}>⏳ Cover pending approval</div>}
{p.cover_image_status==='rejected' && <div style={{fontSize:9,color:'#ff2d78',marginTop:3}}>✗ Cover rejected — upload a new one</div>}
{p.cover_image_status==='approved' && <div style={{fontSize:9,color:'#b4ff3c',marginTop:3}}>✓ Cover approved</div>}
                  </div>
                </div>
                <button style={T.delBtn} onClick={()=>deleteProject(p.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── CHARTS ── */}
        {tab==='charts' && (
          <div>
            <div style={T.sectionTitle}>ADD CHART ENTRY</div>
            <label style={T.label}>CHART NAME</label>
            <input style={T.input} value={chartForm.chart_name} onChange={e=>setChartForm({...chartForm,chart_name:e.target.value})} placeholder="Billboard Hot 100, Apple Music..." />
            <label style={T.label}>PROJECT NAME</label>
            <input style={T.input} value={chartForm.project_name} onChange={e=>setChartForm({...chartForm,project_name:e.target.value})} placeholder="Song or album name" />
            <label style={T.label}>PEAK POSITION</label>
            <input style={T.input} type="number" min="1" max="200" value={chartForm.peak_position} onChange={e=>setChartForm({...chartForm,peak_position:e.target.value})} placeholder="e.g. 1" />
            {chartMsg && <div style={{...T.msg,color:chartMsg.startsWith('Error')?'#ff2d78':ptColor(pts)}}>{chartMsg}</div>}
            <button style={T.btn} onClick={addChart}>ADD CHART ENTRY →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR CHART ENTRIES — {charts.length}</div>
            {charts.length===0 && <div style={{fontSize:11,color:'#333'}}>No chart entries yet</div>}
            {charts.map(c=>(
              <div key={c.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>#{c.peak_position} — {c.chart_name}</div>
<div style={T.cardSub}>{c.project_name}</div>
<div style={{fontSize:10,color:ptColor(c.points||75),marginTop:4}}>+{c.points||75} pts</div>
                  
                </div>
                <button style={T.delBtn} onClick={()=>deleteChart(c.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── AWARDS ── */}
        {tab==='awards' && (
          <div>
            <div style={T.sectionTitle}>ADD AWARD</div>
            <label style={T.label}>AWARD NAME</label>
            <input style={T.input} value={awardForm.award_name} onChange={e=>setAwardForm({...awardForm,award_name:e.target.value})} placeholder="Grammy, BET Awards..." />
            <label style={T.label}>CATEGORY</label>
            <input style={T.input} value={awardForm.category} onChange={e=>setAwardForm({...awardForm,category:e.target.value})} placeholder="Best New Artist, Album of the Year..." />
            <label style={T.label}>TYPE</label>
            <select style={T.select} value={awardForm.type} onChange={e=>setAwardForm({...awardForm,type:e.target.value})}>
              <option value="win">Win</option>
              <option value="nomination">Nomination</option>
            </select>
            <label style={T.label}>YEAR</label>
            <input style={T.input} type="number" min="2000" max="2030" value={awardForm.year} onChange={e=>setAwardForm({...awardForm,year:e.target.value})} />
            {awardMsg && <div style={{...T.msg,color:awardMsg.startsWith('Error')?'#ff2d78':ptColor(pts)}}>{awardMsg}</div>}
            <button style={T.btn} onClick={addAward}>ADD AWARD →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR AWARDS — {awards.length}</div>
            {awards.length===0 && <div style={{fontSize:11,color:'#333'}}>No awards yet</div>}
            {awards.map(a=>(
              <div key={a.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>{a.award_name}</div>
<div style={T.cardSub}>{a.category} · {a.year}</div>
<div style={{fontSize:10,color:ptColor(a.points||100),marginTop:4}}>+{a.points||100} pts</div>
                  
                  <span style={{...T.badge,marginTop:6,display:'inline-block',background:a.type==='win'?'rgba(180,255,60,0.1)':'rgba(255,255,255,0.05)',color:a.type==='win'?'#b4ff3c':'#555'}}>
                    {a.type.toUpperCase()}
                  </span>
                </div>
                <button style={T.delBtn} onClick={()=>deleteAward(a.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── FESTIVALS ── */}
        {tab==='festivals' && (
          <div>
            <div style={T.sectionTitle}>ADD FESTIVAL BOOKING</div>
            <label style={T.label}>FESTIVAL NAME</label>
            <input style={T.input} value={festivalForm.festival_name} onChange={e=>setFestivalForm({...festivalForm,festival_name:e.target.value})} placeholder="Coachella, Rolling Loud, SXSW..." />
            <label style={T.label}>LOCATION</label>
            <input style={T.input} value={festivalForm.location} onChange={e=>setFestivalForm({...festivalForm,location:e.target.value})} placeholder="City, Country" />
            <label style={T.label}>DATE</label>
            <input style={T.input} type="date" value={festivalForm.festival_date} onChange={e=>setFestivalForm({...festivalForm,festival_date:e.target.value})} />
            <label style={T.label}>HEADLINING?</label>
            <select style={T.select} value={festivalForm.headlining} onChange={e=>setFestivalForm({...festivalForm,headlining:e.target.value==='true'})}>
              <option value="false">No — Supporting act</option>
              <option value="true">Yes — Headlining</option>
            </select>
            {festivalMsg && <div style={{...T.msg,color:festivalMsg.startsWith('Error')?'#ff2d78':ptColor(pts)}}>{festivalMsg}</div>}
            <button style={T.btn} onClick={addFestival}>ADD FESTIVAL →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR FESTIVAL BOOKINGS — {festivals.length}</div>
            {festivals.length===0 && <div style={{fontSize:11,color:'#333'}}>No festival bookings yet</div>}
            {festivals.map(f=>(
              <div key={f.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>{f.festival_name}</div>
<div style={T.cardSub}>{f.location} · {f.festival_date}</div>
<div style={{fontSize:10,color:f.headlining?ptColor(200):ptColor(80),marginTop:4}}>{f.headlining?'+200 pts':'+80 pts'}</div>
                  
                  <span style={{...T.badge,marginTop:6,display:'inline-block',background:f.headlining?'rgba(180,255,60,0.1)':'rgba(255,255,255,0.05)',color:f.headlining?'#b4ff3c':'#555'}}>
                    {f.headlining?'HEADLINING':'SUPPORTING'}
                  </span>
                </div>
                <button style={T.delBtn} onClick={()=>deleteFestival(f.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── POINTS GUIDE ── */}
        {tab==='points' && (
          <div>
            <div style={T.sectionTitle}>HOW POINTS WORK</div>
            <div style={{fontSize:11,color:'#444',lineHeight:1.8,marginBottom:20}}>
              Points are earned through verified activity across 3 categories. Fan backing multiplies your points based on your tier.
            </div>

           <div style={T.sectionTitle}>TIER MULTIPLIERS</div>
{[
  ['NEWCOMER',    '0 pts',     'Starting tier',                              '#888888'],
  ['EMERGING',    '500 pts',   'Fans who backed you as NEWCOMER earn ×20',   '#b4ff3c'],
  ['RISING',      '2,000 pts', 'Fans who backed you as EMERGING earn ×10',   '#ffd60a'],
  ['BREAKTHROUGH','5,000 pts', 'Fans who backed you as RISING earn ×5',      '#ff9500'],
  ['ICON',        '15,000 pts','Fans who backed you as BREAKTHROUGH earn ×2', '#ff2d78'],
].map(([tier,threshold,desc,color])=>(
  <div key={tier} style={{...T.card, marginBottom:6, borderLeft:`3px solid ${color}`}}>
    <div style={{flex:1}}>
      <div style={{fontSize:11,color:color,letterSpacing:2,marginBottom:3}}>{tier}</div>
      <div style={{fontSize:9,color:'#444'}}>{desc}</div>
    </div>
    <div style={{fontSize:12,color:color,fontWeight:700}}>{threshold}</div>
  </div>
))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>CHARTS</div>
            {[['Chart Entry','Any chart appearance','75 pts',75],['Chart Top 10','Top 10 on any major chart','150 pts',150],['Chart #1','Number one position','300 pts',300]].map(([name,desc,label,n])=>(
  <div key={name} style={{...T.card,marginBottom:6}}>
    <div>
      <div style={{fontSize:11,color:'#fff'}}>{name}</div>
      <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
    </div>
    <div style={{fontSize:12,color:ptColor(n)}}>{label}</div>
  </div>
))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>AWARDS</div>
            {[['Award Nomination','Any major award nomination','100 pts',100],['Award Win','Any major award win','250 pts',250]].map(([name,desc,label,n])=>(
  <div key={name} style={{...T.card,marginBottom:6}}>
    <div>
      <div style={{fontSize:11,color:'#fff'}}>{name}</div>
      <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
    </div>
    <div style={{fontSize:12,color:ptColor(n)}}>{label}</div>
  </div>
))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>FESTIVAL BOOKINGS</div>
            {[['Supporting Act','Any festival appearance','80 pts',80],['Headlining','Headlining a festival','200 pts',200]].map(([name,desc,label,n])=>(
  <div key={name} style={{...T.card,marginBottom:6}}>
    <div>
      <div style={{fontSize:11,color:'#fff'}}>{name}</div>
      <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
    </div>
    <div style={{fontSize:12,color:ptColor(n)}}>{label}</div>
  </div>
))}

            <div style={T.divider} />
            <div style={{fontSize:9,color:'#333',lineHeight:1.8}}>
              Points are verified by admin before being added to your total.<br/>
              Fan backing multipliers apply to all points earned while fans are backing you.
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION ── */}
        {tab==='subscription' && (
          <div>
            <div style={T.sectionTitle}>SUBSCRIPTION</div>
            <div style={{border:'1px solid #111',borderRadius:4,padding:20,marginBottom:20}}>
              <div style={{fontSize:10,color:'#555',marginBottom:8}}>CURRENT STATUS</div>
              <div style={{fontSize:14,color:artist?.paid?'#b4ff3c':'#ff2d78',marginBottom:16,letterSpacing:2}}>
                {artist?.paid?'✓ ACTIVE':'✗ INACTIVE'}
              </div>
              {!artist?.paid && (
                <div style={{fontSize:11,color:'#444',lineHeight:1.8,marginBottom:16}}>
                  Your profile is not live yet.<br/>
                  Subscribe for $60/yr to go live on the platform<br/>
                  and appear in fan rankings.
                </div>
              )}
              {artist?.paid && (
                <div style={{fontSize:11,color:'#444',lineHeight:1.8}}>
                  Your profile is live and visible to fans.<br/>
                  You are active in the weekly ranking.
                </div>
              )}
            </div>
            {!artist?.paid && (
              <button style={T.btn} onClick={()=>alert('Stripe payment coming soon!')}>
                SUBSCRIBE $60/YR →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── FAN DASHBOARD (placeholder) ────────────────────────────────────────────
function FanDashboard({ session, onSignOut }) {
  const [tab, setTab] = useState('league')
  const [fan, setFan] = useState(null)
  const [season, setSeason] = useState(null)
  const [games, setGames] = useState([])
  const [artists, setArtists] = useState([])
  const [draft, setDraft] = useState(null)
  const [draftPicks, setDraftPicks] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [votes, setVotes] = useState({})
  const [activeGame, setActiveGame] = useState(null)
  const [quarters, setQuarters] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [pointsFeed, setPointsFeed] = useState([])
  const [voteCounts, setVoteCounts] = useState({})

  const SALARY_CAP = 100
  const COLORS = ['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD','#1D9E75','#378ADD','#D85A30']

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: fanData } = await supabase.from('fans').select('*').eq('user_id', session.user.id).single()
    setFan(fanData)
    const { data: seasonData } = await supabase.from('seasons').select('*').eq('status', 'active').single()
    setSeason(seasonData)
    const { data: artistData } = await supabase.from('artists').select('*').eq('paid', true).order('points', { ascending: false })
    setArtists(artistData || [])
    if (seasonData && fanData) {
      const { data: draftData } = await supabase.from('drafts').select('*').eq('fan_id', fanData.id).eq('season_id', seasonData.id).single()
      setDraft(draftData)
      if (draftData) {
        const { data: picks } = await supabase.from('draft_picks').select('*, artists(*)').eq('draft_id', draftData.id)
        setDraftPicks(picks || [])
      }
      const { data: gamesData } = await supabase.from('games').select('*, home:home_artist_id(name,points,tier), away:away_artist_id(name,points,tier)').eq('season_id', seasonData.id).order('scheduled_at', { ascending: false }).limit(20)
      setGames(gamesData || [])
      const { data: statsData } = await supabase.from('artist_season_stats').select('*, artists(name,tier,salary)').eq('season_id', seasonData.id).order('wins', { ascending: false })
      setStandings(statsData || [])
    }
    setLoading(false)
  }

  async function castVote(quarterId, gameId, artistId, artistName) {
    if (!fan) return
    const { error } = await supabase.from('fan_votes').insert({ fan_id: fan.id, game_id: gameId, quarter_id: quarterId, voted_for: artistId })
    if (!error) {
      setVotes(v => ({ ...v, [quarterId]: artistId }))
      setPointsFeed(f => [{ id: Date.now(), fan: fan.username, artist: artistName, pts: 10, time: new Date().toLocaleTimeString() }, ...f].slice(0, 50))
      const isHome = artistId === activeGame.home_artist_id
      const quarter = quarters.find(q=>q.id===quarterId)
      if (quarter) {
        const field = isHome ? 'home_points' : 'away_points'
        const current = isHome ? (quarter.home_points||0) : (quarter.away_points||0)
        const {error: qErr} = await supabase.from('game_quarters').update({ [field]: current + 10 }).eq('id', quarterId)
        if(qErr) console.log('quarter update error:', qErr)
        setQuarters(qs => qs.map(q => q.id===quarterId ? {...q, [field]: current+10} : q))
      }
      await supabase.from('fans').update({ coins: (fan.coins||0) + 10 }).eq('id', fan.id)
      loadVoteCounts(gameId)
    }
  }

  async function loadVoteCounts(gameId) {
    const { data } = await supabase.from('fan_votes').select('quarter_id, voted_for').eq('game_id', gameId)
    const counts = {}
    if (data) {
      data.forEach(v => {
        if (!counts[v.quarter_id]) counts[v.quarter_id] = {}
        counts[v.quarter_id][v.voted_for] = (counts[v.quarter_id][v.voted_for] || 0) + 1
      })
    }
    setVoteCounts(counts)
  }

  async function openGame(game) {
    setActiveGame(game)
    const { data: qs } = await supabase.from('game_quarters').select('*').eq('game_id', game.id).order('quarter_number')
    setQuarters(qs || [])
    const { data: chat } = await supabase.from('game_chat').select('*, fans(username)').eq('game_id', game.id).order('created_at', { ascending: false }).limit(50)
    setChatMessages(chat || [])
    loadVoteCounts(game.id)
    const channel = supabase.channel(`game-${game.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_chat', filter: `game_id=eq.${game.id}` }, payload => {
        setChatMessages(m => [payload.new, ...m].slice(0, 50))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fan_votes', filter: `game_id=eq.${game.id}` }, () => {
        loadVoteCounts(game.id)
      })
      .subscribe()
    const { data: existingVotes } = await supabase.from('fan_votes').select('quarter_id, voted_for').eq('fan_id', fan.id).eq('game_id', game.id)
    if (existingVotes) {
      const voteMap = {}
      existingVotes.forEach(v => { voteMap[v.quarter_id] = v.voted_for })
      setVotes(voteMap)
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || !fan || !activeGame) return
    const msg = chatInput.trim()
    if (msg.length < 5) { setChatInput(''); return }
    const activeQuarter = quarters.find(q=>q.status==='live')
    const backedArtist = activeQuarter ? votes[activeQuarter.id] : null
    const now = Date.now()
    const lastComment = fan._lastComment || 0
    const cooldownPassed = now - lastComment > 60000
    const isDuplicate = fan._lastMessage === msg
    const earnPoints = cooldownPassed && !isDuplicate && msg.length >= 5
    const pts = earnPoints ? 0.25 : 0
    await supabase.from('game_chat').insert({
      game_id: activeGame.id,
      fan_id: fan.id,
      message: msg,
      points_earned: pts,
      voted_for_artist: backedArtist || null
    })
    setChatMessages(m => [{
      id: Date.now(),
      game_id: activeGame.id,
      fan_id: fan.id,
      message: msg,
      points_earned: pts,
      voted_for_artist: backedArtist || null,
      fans: { username: fan.username }
    }, ...m].slice(0, 50))
    if (earnPoints) {
      fan._lastComment = now
      fan._lastMessage = msg
      setPointsFeed(f => [{
        id: Date.now(),
        fan: fan.username,
        artist: 'comment',
        pts: 0.25,
        time: new Date().toLocaleTimeString()
      }, ...f].slice(0, 50))
      if (backedArtist && activeQuarter) {
        const isHome = backedArtist === activeGame.home_artist_id
        const field = isHome ? 'home_points' : 'away_points'
        const quarter = quarters.find(q=>q.id===activeQuarter.id)
        const current = quarter ? (isHome ? (quarter.home_points||0) : (quarter.away_points||0)) : 0
        await supabase.from('game_quarters').update({ [field]: current + 0.25 }).eq('id', activeQuarter.id)
        setQuarters(qs => qs.map(q => q.id===activeQuarter.id ? {...q, [field]: current+0.25} : q))
      }
    }
    setChatInput('')
  }

  async function draftArtist(artist, slot) {
    if (!season || !fan) return
    const used = draftPicks.reduce((sum, p) => sum + p.salary, 0)
    if (used + artist.salary > SALARY_CAP) { alert(`Over salary cap! ${SALARY_CAP - used} remaining`); return }
    if (draftPicks.length >= 6) { alert('Roster full — 5 starters + 1 bench'); return }
    if (draftPicks.find(p => p.artist_id === artist.id)) { alert('Already on your roster'); return }
    let currentDraft = draft
    if (!currentDraft) {
      const { data } = await supabase.from('drafts').insert({ fan_id: fan.id, season_id: season.id, salary_used: 0 }).select().single()
      currentDraft = data
      setDraft(data)
    }
    const isStarter = draftPicks.filter(p => p.slot !== 'bench').length < 5
    await supabase.from('draft_picks').insert({ draft_id: currentDraft.id, artist_id: artist.id, slot: isStarter ? 'starter' : 'bench', salary: artist.salary })
    await supabase.from('drafts').update({ salary_used: used + artist.salary }).eq('id', currentDraft.id)
    loadAll()
  }

  async function removePick(pickId, salary) {
    await supabase.from('draft_picks').delete().eq('id', pickId)
    if (draft) await supabase.from('drafts').update({ salary_used: (draft.salary_used || 0) - salary }).eq('id', draft.id)
    loadAll()
  }

  const salaryUsed = draftPicks.reduce((sum, p) => sum + (p.salary || 0), 0)
  const salaryLeft = SALARY_CAP - salaryUsed

  const T = {
    root: { minHeight:'100vh', background:'#05070a', fontFamily:'monospace', color:'#fff' },
    header: { borderBottom:'1px solid #111', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(180deg, rgba(255,45,120,0.06) 0%, transparent 100%)' },
    nav: { display:'flex', gap:0, borderBottom:'1px solid #111', flexWrap:'wrap', overflowX:'auto' },
    navBtn: { background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#444', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace', padding:'12px 16px', whiteSpace:'nowrap' },
    navActive: { color:'#ff2d78', borderBottom:'2px solid #ff2d78' },
    body: { padding:'24px', maxWidth:720 },
    card: { border:'1px solid #111', borderRadius:6, padding:'16px', marginBottom:12 },
    sectionTitle: { fontSize:9, letterSpacing:3, color:'#333', marginBottom:16 },
    btn: { background:'transparent', border:'1px solid rgba(255,45,120,0.4)', color:'#ff2d78', padding:'8px 18px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    greenBtn: { background:'transparent', border:'1px solid rgba(180,255,60,0.4)', color:'#b4ff3c', padding:'8px 18px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    tag: { fontSize:9, letterSpacing:1, padding:'3px 8px', borderRadius:2, display:'inline-block' },
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontFamily:'monospace',letterSpacing:3,fontSize:11}}>
      LOADING...
    </div>
  )

  return (
    <div style={T.root}>
      <div style={T.header}>
        <div>
          <div style={{fontSize:11,letterSpacing:3,color:'#ff2d78'}}>MUSIC INDUSTRY LEAGUE</div>
          <div style={{fontSize:10,color:'#333',marginTop:2}}>{fan?.username || session.user.email}</div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:2}}>COINS</div>
            <div style={{fontSize:18,color:'#ffd60a',fontWeight:700}}>{fan?.coins || 0}</div>
          </div>
          <button style={{background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#555',padding:'8px 16px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={onSignOut}>SIGN OUT</button>
        </div>
      </div>

      <div style={T.nav}>
        {[['league','THE LEAGUE'],['draft','MY DRAFT'],['games','GAMES'],['standings','STANDINGS'],['shootout','SHOOTOUT']].map(([id,label])=>(
          <button key={id} style={{...T.navBtn,...(tab===id?T.navActive:{})}} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={T.body}>

        {/* ── THE LEAGUE ── */}
        {tab==='league' && (
          <div>
            <div style={T.sectionTitle}>SEASON STATUS</div>
            {!season ? (
              <div style={{...T.card,textAlign:'center',padding:40}}>
                <div style={{fontSize:14,color:'#333',marginBottom:8}}>No active season</div>
                <div style={{fontSize:11,color:'#222'}}>Check back when the next season is scheduled</div>
              </div>
            ) : (
              <div style={T.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,color:'#fff',letterSpacing:2}}>{season.name}</div>
                  <span style={{...T.tag,background:'rgba(180,255,60,0.1)',color:'#b4ff3c'}}>ACTIVE</span>
                </div>
                <div style={{display:'flex',gap:24}}>
                  <div><div style={{fontSize:9,color:'#333',letterSpacing:2}}>START</div><div style={{fontSize:11,color:'#fff',marginTop:2}}>{season.start_date}</div></div>
                  <div><div style={{fontSize:9,color:'#333',letterSpacing:2}}>END</div><div style={{fontSize:11,color:'#fff',marginTop:2}}>{season.end_date}</div></div>
                  <div><div style={{fontSize:9,color:'#333',letterSpacing:2}}>ARTISTS</div><div style={{fontSize:11,color:'#fff',marginTop:2}}>{artists.length}</div></div>
                  <div><div style={{fontSize:9,color:'#333',letterSpacing:2}}>GAMES</div><div style={{fontSize:11,color:'#fff',marginTop:2}}>{games.length}</div></div>
                </div>
              </div>
            )}

            <div style={{...T.sectionTitle,marginTop:24}}>SUPERSTARS</div>
            {artists.filter(a=>a.tier==='superstar').map((a,i)=>(
              <div key={a.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{a.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{a.genre || 'No genre'} · {a.points||0} pts</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,color:'#ffd60a',fontWeight:700}}>${a.salary}</div>
                    <div style={{fontSize:9,color:'#444',marginTop:2}}>SALARY</div>
                  </div>
                </div>
              </div>
            ))}
            {artists.filter(a=>a.tier==='superstar').length===0 && <div style={{fontSize:11,color:'#222',marginBottom:24}}>No superstars yet — admin assigns tiers</div>}

            <div style={{...T.sectionTitle,marginTop:8}}>RISING STARS</div>
            {artists.filter(a=>a.tier==='rising').map((a,i)=>(
              <div key={a.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}66`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{a.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{a.genre || 'No genre'} · {a.points||0} pts</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,color:'#b4ff3c',fontWeight:700}}>${a.salary}</div>
                    <div style={{fontSize:9,color:'#444',marginTop:2}}>SALARY</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MY DRAFT ── */}
        {tab==='draft' && (
          <div>
            <div style={{...T.card,background:'rgba(255,215,0,0.03)',borderColor:'rgba(255,215,0,0.15)',marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:4}}>SALARY CAP</div>
                  <div style={{fontSize:20,color:'#ffd60a',fontWeight:700}}>${salaryLeft} <span style={{fontSize:11,color:'#444'}}>remaining of ${SALARY_CAP}</span></div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:4}}>ROSTER</div>
                  <div style={{fontSize:20,color:'#fff',fontWeight:700}}>{draftPicks.length}<span style={{fontSize:11,color:'#444'}}>/6</span></div>
                </div>
              </div>
              <div style={{background:'#111',borderRadius:2,height:3,marginTop:12}}>
                <div style={{background:'#ffd60a',height:3,borderRadius:2,width:`${(salaryUsed/SALARY_CAP)*100}%`,transition:'width 0.4s'}} />
              </div>
            </div>

            {draftPicks.length > 0 && (
              <div style={{marginBottom:24}}>
                <div style={T.sectionTitle}>YOUR ROSTER</div>
                {draftPicks.map((p,i)=>(
                  <div key={p.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{p.artists?.name}</div>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <span style={{...T.tag,background:p.slot==='bench'?'rgba(255,255,255,0.05)':'rgba(255,45,120,0.1)',color:p.slot==='bench'?'#444':'#ff2d78'}}>{p.slot.toUpperCase()}</span>
                          <span style={{fontSize:10,color:'#444'}}>${p.salary} salary</span>
                        </div>
                      </div>
                      <button style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontFamily:'monospace',fontSize:16}} onClick={()=>removePick(p.id,p.salary)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={T.sectionTitle}>DRAFT SUPERSTARS</div>
            {artists.filter(a=>a.tier==='superstar').map((a,i)=>{
              const picked = draftPicks.find(p=>p.artist_id===a.id)
              const canAfford = salaryLeft >= a.salary
              return (
                <div key={a.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}`,opacity:picked?0.5:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{a.name}</div>
                      <div style={{fontSize:10,color:'#444'}}>{a.genre||'No genre'} · {a.points||0} pts</div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <div style={{fontSize:16,color:'#ffd60a',fontWeight:700}}>${a.salary}</div>
                      {picked ? <span style={{...T.tag,background:'rgba(180,255,60,0.1)',color:'#b4ff3c'}}>DRAFTED</span>
                        : <button style={{...T.btn,opacity:canAfford?1:0.3}} onClick={()=>canAfford&&draftArtist(a,'starter')} disabled={!canAfford}>DRAFT</button>}
                    </div>
                  </div>
                </div>
              )
            })}

            <div style={{...T.sectionTitle,marginTop:16}}>DRAFT RISING STARS</div>
            {artists.filter(a=>a.tier==='rising').map((a,i)=>{
              const picked = draftPicks.find(p=>p.artist_id===a.id)
              const canAfford = salaryLeft >= a.salary
              return (
                <div key={a.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}66`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{a.name}</div>
                      <div style={{fontSize:10,color:'#444'}}>{a.genre||'No genre'} · {a.points||0} pts</div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <div style={{fontSize:16,color:'#b4ff3c',fontWeight:700}}>${a.salary}</div>
                      {picked ? <span style={{...T.tag,background:'rgba(180,255,60,0.1)',color:'#b4ff3c'}}>DRAFTED</span>
                        : <button style={{...T.greenBtn,opacity:canAfford?1:0.3}} onClick={()=>canAfford&&draftArtist(a,'starter')} disabled={!canAfford}>DRAFT</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

       {/* ── GAMES ── */}
        {tab==='games' && !activeGame && (
          <div>
            <div style={T.sectionTitle}>RECENT & UPCOMING GAMES</div>
            {games.length===0 && <div style={{fontSize:11,color:'#222'}}>No games scheduled yet</div>}
            {games.map(g=>(
              <div key={g.id} style={{...T.card,borderLeft:`3px solid ${g.status==='live'?'#ff2d78':g.status==='finished'?'#444':'#333'}`,cursor:g.status==='live'?'pointer':'default'}} onClick={()=>g.status==='live'&&openGame(g)}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{...T.tag,background:g.status==='live'?'rgba(255,45,120,0.15)':g.status==='finished'?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.03)',color:g.status==='live'?'#ff2d78':g.status==='finished'?'#555':'#333'}}>
                    {g.status==='live'?'🔴 LIVE':g.status.toUpperCase()}
                  </span>
                  <div style={{fontSize:10,color:'#333'}}>{g.scheduled_at?new Date(g.scheduled_at).toLocaleDateString():'TBD'}</div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{flex:1,textAlign:'left'}}>
                    <div style={{fontSize:13,color:'#fff',marginBottom:3}}>{g.home?.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{g.home?.tier?.toUpperCase()}</div>
                    {g.status==='finished'&&<div style={{fontSize:18,color:g.winner_id===g.home_artist_id?'#b4ff3c':'#444',fontWeight:700,marginTop:4}}>{g.home_score}</div>}
                  </div>
                  <div style={{padding:'0 16px',color:'#333',fontSize:12,letterSpacing:2}}>VS</div>
                  <div style={{flex:1,textAlign:'right'}}>
                    <div style={{fontSize:13,color:'#fff',marginBottom:3}}>{g.away?.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{g.away?.tier?.toUpperCase()}</div>
                    {g.status==='finished'&&<div style={{fontSize:18,color:g.winner_id===g.away_artist_id?'#b4ff3c':'#444',fontWeight:700,marginTop:4}}>{g.away_score}</div>}
                  </div>
                </div>
                {g.status==='live'&&<button style={{background:'rgba(255,45,120,0.1)',border:'1px solid #ff2d78',color:'#ff2d78',padding:'10px',width:'100%',marginTop:12,fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={(e)=>{e.stopPropagation();openGame(g)}}>ENTER ARENA →</button>}
              </div>
            ))}
          </div>
        )}

        {/* ── ARENA ── */}
        {tab==='games' && activeGame && (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'#02030a',zIndex:100,overflowY:'auto',fontFamily:'monospace'}}>
            
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',borderBottom:'1px solid #111'}}>
              <button style={{background:'transparent',border:'none',color:'#444',cursor:'pointer',fontFamily:'monospace',fontSize:11,letterSpacing:2}} onClick={()=>setActiveGame(null)}>← BACK</button>
              <div style={{fontSize:10,color:'#ff2d78',letterSpacing:3}}>🔴 LIVE</div>
              <div style={{fontSize:10,color:'#333',letterSpacing:2}}>48 MINS</div>
            </div>

            {/* Arena */}
            <div style={{background:'linear-gradient(180deg,#0a0a1a 0%,#02030a 100%)',padding:'24px 16px',position:'relative'}}>
              
              {/* Spotlight effect */}
              <div style={{position:'absolute',top:0,left:'20%',width:'30%',height:'100%',background:'radial-gradient(ellipse,rgba(255,45,120,0.06) 0%,transparent 70%)',pointerEvents:'none'}} />
              <div style={{position:'absolute',top:0,right:'20%',width:'30%',height:'100%',background:'radial-gradient(ellipse,rgba(180,255,60,0.06) 0%,transparent 70%)',pointerEvents:'none'}} />

              {/* Artists */}
              <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:16}}>
                
                {/* Home */}
                <div style={{flex:1,textAlign:'center'}}>
                  <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#ff2d78,#ff9500)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',fontSize:24,fontWeight:700,color:'#fff',border:'3px solid #ff2d78'}}>
                    {activeGame.home?.name?.charAt(0)}
                  </div>
                  <div style={{fontSize:13,color:'#fff',fontWeight:700,marginBottom:4}}>{activeGame.home?.name}</div>
                  <div style={{fontSize:9,color:'#ff2d78',letterSpacing:2}}>{activeGame.home?.tier?.toUpperCase()}</div>
                </div>

                {/* Scoreboard */}
                <div style={{textAlign:'center',padding:'0 8px',minWidth:120}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>SCOREBOARD</div>
                  {[1,2,3,4].map(q=>{
                    const quarter = quarters.find(x=>x.quarter_number===q)
                    const homePoints = quarter ? Math.round((quarter.home_points||0)*100)/100 : 0
                    const awayPoints = quarter ? Math.round((quarter.away_points||0)*100)/100 : 0
                    return (
                      <div key={q} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6,background:'rgba(255,255,255,0.03)',padding:'4px 8px',borderRadius:3}}>
                        <span style={{fontSize:14,color:homePoints>awayPoints?'#ff2d78':'#444',fontWeight:700,minWidth:28}}>{homePoints}</span>
                        <span style={{fontSize:9,color:quarter?.status==='live'?'#ff2d78':'#333',letterSpacing:1}}>Q{q}{quarter?.status==='live'?' 🔴':''}</span>
                        <span style={{fontSize:14,color:awayPoints>homePoints?'#b4ff3c':'#444',fontWeight:700,minWidth:28,textAlign:'right'}}>{awayPoints}</span>
                      </div>
                    )
                  })}
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:8,borderTop:'1px solid #111',paddingTop:8}}>
                    <span style={{fontSize:20,color:'#ff2d78',fontWeight:700}}>
                      {quarters.reduce((s,q)=>s+((q.home_points||0)>(q.away_points||0)?1:0),0)}
                    </span>
                    <span style={{fontSize:9,color:'#333',letterSpacing:1,alignSelf:'center'}}>QW</span>
                    <span style={{fontSize:20,color:'#b4ff3c',fontWeight:700}}>
                      {quarters.reduce((s,q)=>s+((q.away_points||0)>(q.home_points||0)?1:0),0)}
                    </span>
                  </div>
                </div>

                {/* Away */}
                <div style={{flex:1,textAlign:'center'}}>
                  <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#b4ff3c,#1D9E75)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',fontSize:24,fontWeight:700,color:'#05070a',border:'3px solid #b4ff3c'}}>
                    {activeGame.away?.name?.charAt(0)}
                  </div>
                  <div style={{fontSize:13,color:'#fff',fontWeight:700,marginBottom:4}}>{activeGame.away?.name}</div>
                  <div style={{fontSize:9,color:'#b4ff3c',letterSpacing:2}}>{activeGame.away?.tier?.toUpperCase()}</div>
                </div>
              </div>

              {/* Vote buttons */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:10,textAlign:'center'}}>VOTE FOR YOUR ARTIST — ACTIVE QUARTER</div>
                {quarters.filter(q=>q.status==='live').slice(0,1).map(q=>(
                  <div key={q.id} style={{display:'flex',gap:8,marginBottom:8}}>
                    <button
                      style={{flex:1,padding:'14px 8px',background:votes[q.id]===activeGame.home_artist_id?'rgba(255,45,120,0.2)':'rgba(255,45,120,0.05)',border:`1px solid ${votes[q.id]===activeGame.home_artist_id?'#ff2d78':'rgba(255,45,120,0.2)'}`,color:'#ff2d78',fontFamily:'monospace',fontSize:11,cursor:'pointer',letterSpacing:1,borderRadius:4}}
                      onClick={()=>!votes[q.id]&&castVote(q.id,activeGame.id,activeGame.home_artist_id,activeGame.home?.name)}
                      disabled={!!votes[q.id]}
                    >
                      {votes[q.id]===activeGame.home_artist_id?'✓ BACKED':'BACK THIS TEAM'}<br/>
                      <span style={{fontSize:9,opacity:0.6}}>{activeGame.home?.name}</span>
                    </button>
                    <button
                      style={{flex:1,padding:'14px 8px',background:votes[q.id]===activeGame.away_artist_id?'rgba(180,255,60,0.2)':'rgba(180,255,60,0.05)',border:`1px solid ${votes[q.id]===activeGame.away_artist_id?'#b4ff3c':'rgba(180,255,60,0.2)'}`,color:'#b4ff3c',fontFamily:'monospace',fontSize:11,cursor:'pointer',letterSpacing:1,borderRadius:4}}
                      onClick={()=>!votes[q.id]&&castVote(q.id,activeGame.id,activeGame.away_artist_id,activeGame.away?.name)}
                      disabled={!!votes[q.id]}
                    >
                      {votes[q.id]===activeGame.away_artist_id?'✓ BACKED':'BACK THIS TEAM'}<br/>
                      <span style={{fontSize:9,opacity:0.6}}>{activeGame.away?.name}</span>
                    </button>
                  </div>
                ))}
                {quarters.filter(q=>q.status==='live').length===0 && (
                  <div style={{textAlign:'center',fontSize:11,color:'#333',padding:16}}>Waiting for next quarter...</div>
                )}
              </div>
            </div>

            {/* Bottom section — chat + points feed */}
            <div style={{display:'flex',gap:0,borderTop:'1px solid #111',minHeight:300}}>
              
              {/* Live chat */}
              <div style={{flex:1,borderRight:'1px solid #111',display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,padding:'10px 14px',borderBottom:'1px solid #111'}}>LIVE CHAT</div>
                <div style={{flex:1,overflowY:'auto',padding:'10px 14px',maxHeight:220,display:'flex',flexDirection:'column-reverse'}}>
                  {chatMessages.length===0&&<div style={{fontSize:11,color:'#222'}}>No messages yet</div>}
                 {chatMessages.map((m,i)=>{
                    const backedHome = m.voted_for_artist === activeGame.home_artist_id
                    const backedAway = m.voted_for_artist === activeGame.away_artist_id
                    const teamColor = backedHome ? '#ff2d78' : backedAway ? '#b4ff3c' : '#555'
                    const teamDot = backedHome ? '🔴' : backedAway ? '🟢' : '⚪'
                    return (
                      <div key={m.id||i} style={{marginBottom:8}}>
                        <span style={{fontSize:10,color:teamColor}}>{teamDot} {m.fans?.username||'fan'} </span>
                        <span style={{fontSize:11,color:'#888'}}>{m.message}</span>
                        {m.points_earned > 0 && <span style={{fontSize:9,color:'#ffd60a',marginLeft:6}}>+{m.points_earned}pts</span>}
                      </div>
                    )
                  })}
                </div>
                <div style={{display:'flex',gap:0,borderTop:'1px solid #111'}}>
                  <input
                    style={{flex:1,background:'transparent',border:'none',color:'#fff',padding:'10px 14px',fontSize:11,fontFamily:'monospace',outline:'none'}}
                    placeholder="Say something..."
                    value={chatInput}
                    onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&sendChat()}
                  />
                  <button style={{background:'transparent',border:'none',borderLeft:'1px solid #111',color:'#ff2d78',padding:'10px 14px',cursor:'pointer',fontFamily:'monospace',fontSize:10}} onClick={sendChat}>SEND</button>
                </div>
              </div>

              {/* Points feed */}
              <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,padding:'10px 14px',borderBottom:'1px solid #111'}}>POINTS FEED</div>
                <div style={{flex:1,overflowY:'auto',padding:'10px 14px',maxHeight:220,display:'flex',flexDirection:'column'}}>
                  {pointsFeed.length===0&&<div style={{fontSize:11,color:'#222'}}>No points yet</div>}
                  {pointsFeed.map(p=>(
                    <div key={p.id} style={{marginBottom:8,borderBottom:'1px solid #0a0a0a',paddingBottom:8}}>
                      <div style={{fontSize:10,color:'#b4ff3c'}}>{p.fan} <span style={{color:'#333'}}>voted</span> {p.artist}</div>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:9,color:'#333'}}>{p.time}</span>
                        <span style={{fontSize:10,color:'#ffd60a',fontWeight:700}}>+{p.pts} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
          

        {/* ── STANDINGS ── */}
        {tab==='standings' && (
          <div>
            <div style={T.sectionTitle}>SEASON STANDINGS</div>
            {standings.length===0 && <div style={{fontSize:11,color:'#222'}}>No standings yet — season hasn't started</div>}
            {standings.map((s,i)=>(
              <div key={s.id} style={{...T.card,borderLeft:`3px solid ${COLORS[i%COLORS.length]}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    <div style={{fontSize:18,color:COLORS[i%COLORS.length],fontWeight:700,minWidth:28}}>#{i+1}</div>
                    <div>
                      <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{s.artists?.name}</div>
                      <span style={{...T.tag,background:s.artists?.tier==='superstar'?'rgba(255,215,0,0.1)':'rgba(180,255,60,0.1)',color:s.artists?.tier==='superstar'?'#ffd60a':'#b4ff3c'}}>{s.artists?.tier?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,color:'#fff',fontWeight:700}}>{s.wins}W <span style={{color:'#444'}}>{s.losses}L</span></div>
                    <div style={{fontSize:9,color:'#333',marginTop:2}}>{s.wins+s.losses > 0 ? ((s.wins/(s.wins+s.losses))*100).toFixed(0)+'% WIN RATE' : 'NO GAMES'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SHOOTOUT ── */}
        {tab==='shootout' && (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{fontSize:11,color:'#ff2d78',letterSpacing:3,marginBottom:8}}>ALBUM SHOOTOUT</div>
            <div style={{fontSize:11,color:'#333',marginBottom:24}}>Coming soon — shoot albums into fire net or trash can to earn points</div>
          </div>
        )}

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
