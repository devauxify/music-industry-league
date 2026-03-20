import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Auth from './Auth'

async function createCheckout(priceId, userId, role) {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId, userId, role }
    })
    if (error) throw error
    if (data?.url) {
      window.location.href = data.url
    } else {
      alert('No checkout URL returned: ' + JSON.stringify(data))
    }
  } catch (err) {
    if (err.context) {
      const body = await err.context.json()
      console.log('Error body:', body)
      alert('Error: ' + JSON.stringify(body))
    } else {
      console.log('Checkout error:', err)
      alert('Checkout error: ' + err.message)
    }
  }
}

const BRAND = "MUSIC INDUSTRY LEAGUE"

export default function App() {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [userRole, setUserRole] = useState(null)
  const [authMode, setAuthMode] = useState(null) // 'artist' | 'fan'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role')
    const userId = params.get('user_id')
    const sessionId = params.get('session_id')
    if (sessionId && role && userId) {
     async function handleSuccess() {
        if (role === 'artist') {
          await supabase.from('artists').update({ paid: true }).eq('user_id', userId)
          const now = new Date()
          const { data: pool } = await supabase.from('prize_pools').select('*').eq('status','active').eq('month', now.getMonth()+1).eq('year', now.getFullYear()).single()
          if (pool) {
            await supabase.from('prize_pools').update({ artist_sub_count: (pool.artist_sub_count||0)+1, total_amount: (pool.total_amount||0)+6 }).eq('id', pool.id)
          } else {
            await supabase.from('prize_pools').insert({ month: now.getMonth()+1, year: now.getFullYear(), artist_sub_count:1, total_amount:6, status:'active' })
          }
        }
        if (role === 'fan') {
          await supabase.from('fans').update({ subscribed: true }).eq('user_id', userId)
          const now = new Date()
          const { data: pool } = await supabase.from('prize_pools').select('*').eq('status','active').eq('month', now.getMonth()+1).eq('year', now.getFullYear()).single()
          if (pool) {
            await supabase.from('prize_pools').update({ fan_sub_count: (pool.fan_sub_count||0)+1, total_amount: (pool.total_amount||0)+0.50 }).eq('id', pool.id)
          } else {
            await supabase.from('prize_pools').insert({ month: now.getMonth()+1, year: now.getFullYear(), fan_sub_count:1, total_amount:0.50, status:'active' })
          }
        }
        if (role === 'coins_6') {
          const { data: fanData } = await supabase.from('fans').select('coins').eq('id', userId).single()
          await supabase.from('fans').update({ coins: (fanData?.coins||0) + 6 }).eq('id', userId)
        }
        if (role === 'coins_30') {
          const { data: fanData } = await supabase.from('fans').select('coins').eq('id', userId).single()
          await supabase.from('fans').update({ coins: (fanData?.coins||0) + 30 }).eq('id', userId)
        }
        if (role === 'coins_50') {
          const { data: fanData } = await supabase.from('fans').select('coins').eq('id', userId).single()
          await supabase.from('fans').update({ coins: (fanData?.coins||0) + 50 }).eq('id', userId)
        }
        window.history.replaceState({}, '', '/')
      }
      handleSuccess()
    }
  }, [])

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
  const [playoffSeries, setPlayoffSeries] = useState([])
  const [catalog, setCatalog] = useState([])
  const [catalogForm, setCatalogForm] = useState({ title:'', artist_name:'', type:'song', cover_url:'', coin_cost:1 })
  const [catalogMsg, setCatalogMsg] = useState('')
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
    if (tab === 'league') { loadArtists(); loadSeasons(); loadLeagueGames(0, gamesFilter); loadPlayoffs(); }
    if (tab === 'shootout') loadCatalog() 
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

  async function generatePlayoffs() {
    if (!activeSeason) { alert('No active season'); return }
    const { data: stats } = await supabase
      .from('artist_season_stats')
      .select('*, artists(name)')
      .eq('season_id', activeSeason.id)
      .order('wins', { ascending: false })
      .limit(16)
    if (!stats || stats.length < 2) { alert('Need at least 2 artists with season stats'); return }
    const top16 = stats.slice(0, 16)
    const series = []
    for (let i = 0; i < Math.floor(top16.length / 2); i++) {
      series.push({
        season_id: activeSeason.id,
        round: 1,
        series_number: i + 1,
        artist1_id: top16[i].artist_id,
        artist2_id: top16[top16.length - 1 - i].artist_id,
        status: 'active'
      })
    }
    const { error } = await supabase.from('playoffs').insert(series)
    if (error) { alert('Error: ' + error.message); return }
    alert(`Playoffs generated! ${series.length} first round series created.`)
    loadPlayoffs()
  }

  async function loadPlayoffs() {
    if (!activeSeason) return
    const { data } = await supabase
      .from('playoffs')
      .select('*, artist1:artist1_id(name), artist2:artist2_id(name), winner:winner_id(name)')
      .eq('season_id', activeSeason.id)
      .order('round')
      .order('series_number')
    setPlayoffSeries(data || [])
  }

  async function loadCatalog() {
    const { data } = await supabase.from('shootout_catalog').select('*').order('created_at', { ascending: false })
    setCatalog(data || [])
  }

  async function recordPlayoffWin(seriesId, artistId) {
    const { data: series } = await supabase.from('playoffs').select('*').eq('id', seriesId).single()
    if (!series) return
    const isArtist1 = artistId === series.artist1_id
    const field = isArtist1 ? 'artist1_wins' : 'artist2_wins'
    const current = isArtist1 ? series.artist1_wins : series.artist2_wins
    const newWins = current + 1
    if (newWins >= 4) {
      await supabase.from('playoffs').update({ [field]: newWins, winner_id: artistId, status: 'finished' }).eq('id', seriesId)
      alert(`${isArtist1 ? series.artist1_id : series.artist2_id} wins the series 4-${isArtist1 ? series.artist2_wins : series.artist1_wins}!`)
      checkAdvanceRound(series.round, series.season_id)
    } else {
      await supabase.from('playoffs').update({ [field]: newWins }).eq('id', seriesId)
    }
    loadPlayoffs()
  }

  async function checkAdvanceRound(round, seasonId) {
    const { data: allSeries } = await supabase.from('playoffs').select('*').eq('season_id', seasonId).eq('round', round)
    if (!allSeries) return
    const allDone = allSeries.every(s => s.status === 'finished')
    if (!allDone) return
    const winners = allSeries.map(s => s.winner_id).filter(Boolean)
    if (winners.length === 1) {
      alert('🏆 CHAMPION CROWNED!')
      await supabase.from('seasons').update({ status: 'completed', champion_id: winners[0] }).eq('id', seasonId)
      return
    }
    const nextSeries = []
    for (let i = 0; i < Math.floor(winners.length / 2); i++) {
      nextSeries.push({
        season_id: seasonId,
        round: round + 1,
        series_number: i + 1,
        artist1_id: winners[i * 2],
        artist2_id: winners[i * 2 + 1],
        status: 'active'
      })
    }
    await supabase.from('playoffs').insert(nextSeries)
    alert(`Round ${round + 1} generated!`)
    loadPlayoffs()
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
    const loserId = winnerId === game.home_artist_id ? game.away_artist_id : game.home_artist_id
    const { data: winnerStats } = await supabase.from('artist_season_stats').select('*').eq('artist_id', winnerId).eq('season_id', game.season_id).single()
    const { data: loserStats } = await supabase.from('artist_season_stats').select('*').eq('artist_id', loserId).eq('season_id', game.season_id).single()
    if (winnerStats) {
      await supabase.from('artist_season_stats').update({ wins: (winnerStats.wins||0) + 1 }).eq('id', winnerStats.id)
    } else {
      await supabase.from('artist_season_stats').insert({ artist_id: winnerId, season_id: game.season_id, wins: 1, losses: 0, tier: 'rising', salary: 10 })
    }
    if (loserStats) {
      await supabase.from('artist_season_stats').update({ losses: (loserStats.losses||0) + 1 }).eq('id', loserStats.id)
    } else {
      await supabase.from('artist_season_stats').insert({ artist_id: loserId, season_id: game.season_id, wins: 0, losses: 1, tier: 'rising', salary: 10 })
    }
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
        {[['queue','IMAGE QUEUE'],['create','CREATE ARTIST'],['artists','ARTISTS'],['fans','FANS'],['league','LEAGUE MANAGER'],['shootout','SHOOTOUT CATALOG']].map(([id,label])=>(
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

            <div style={{marginTop:32}}>
              <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>PLAYOFFS</div>
              <button style={{...T.submitBtn,marginBottom:16}} onClick={generatePlayoffs}>GENERATE PLAYOFFS →</button>
              {playoffSeries.length===0 && <div style={{fontSize:11,color:'#222'}}>No playoffs yet</div>}
              {[1,2,3,4].map(round=>{
                const roundSeries = playoffSeries.filter(s=>s.round===round)
                if (roundSeries.length===0) return null
                const roundNames = {1:'FIRST ROUND',2:'SEMIFINALS',3:'CONFERENCE FINALS',4:'CHAMPIONSHIP'}
                return (
                  <div key={round} style={{marginBottom:20}}>
                    <div style={{fontSize:9,color:'#ff2d78',letterSpacing:2,marginBottom:8}}>{roundNames[round]||`ROUND ${round}`}</div>
                    {roundSeries.map(s=>(
                      <div key={s.id} style={{...T.row,marginBottom:8,flexWrap:'wrap',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,color:'#fff'}}>{s.artist1?.name} <span style={{color:'#ff2d78',fontWeight:700}}>{s.artist1_wins}</span> — <span style={{color:'#b4ff3c',fontWeight:700}}>{s.artist2_wins}</span> {s.artist2?.name}</div>
                          {s.winner && <div style={{fontSize:9,color:'#ffd60a',marginTop:4}}>🏆 {s.winner?.name} wins series</div>}
                        </div>
                        {s.status==='active' && (
                          <div style={{display:'flex',gap:6}}>
                            <button style={{...T.approve,padding:'4px 10px',fontSize:9}} onClick={()=>recordPlayoffWin(s.id,s.artist1_id)}>+W {s.artist1?.name?.split(' ')[0]}</button>
                            <button style={{...T.approve,padding:'4px 10px',fontSize:9}} onClick={()=>recordPlayoffWin(s.id,s.artist2_id)}>+W {s.artist2?.name?.split(' ')[0]}</button>
                          </div>
                        )}
                        <span style={{fontSize:9,padding:'3px 8px',background:s.status==='finished'?'rgba(255,255,255,0.05)':'rgba(180,255,60,0.1)',color:s.status==='finished'?'#444':'#b4ff3c'}}>{s.status.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

          </div>
        )}

        {tab==='shootout' && (
          <div>
            <div style={{fontSize:10,color:'#333',marginBottom:20,letterSpacing:2}}>SHOOTOUT CATALOG</div>
            
            <div style={{maxWidth:480,marginBottom:32}}>
              <div style={T.label}>TITLE</div>
              <input style={T.input} value={catalogForm.title} onChange={e=>setCatalogForm({...catalogForm,title:e.target.value})} placeholder="Song or album title" />
              <div style={T.label}>ARTIST NAME</div>
              <input style={T.input} value={catalogForm.artist_name} onChange={e=>setCatalogForm({...catalogForm,artist_name:e.target.value})} placeholder="Artist name" />
              <div style={T.label}>TYPE</div>
              <select style={{...T.input,marginBottom:12}} value={catalogForm.type} onChange={e=>setCatalogForm({...catalogForm,type:e.target.value,coin_cost:e.target.value==='song'?1:2})}>
                <option value="song">Song — 1 coin</option>
                <option value="album">Album — 2 coins</option>
              </select>
              <div style={T.label}>COVER IMAGE</div>
              <label style={{...T.uploadBox, marginBottom:12}}>
                <div style={{fontSize:10,color:'#444',marginBottom:4}}>
                  {catalogForm.cover_url ? '✓ Image uploaded' : 'Click to upload cover art'}
                </div>
                <div style={{fontSize:9,color:'#333'}}>JPG or PNG · Max 5MB</div>
                <input type="file" accept="image/*" style={{display:'none'}} onChange={async(e)=>{
                  const file = e.target.files[0]
                  if (!file) return
                  const ext = file.name.split('.').pop()
                  const path = `shootout/${Date.now()}.${ext}`
                  const { error } = await supabase.storage.from('album-images').upload(path, file)
                  if (error) { setCatalogMsg('Upload error: '+error.message); return }
                  const { data } = supabase.storage.from('album-images').getPublicUrl(path)
                  setCatalogForm(f=>({...f, cover_url: data.publicUrl}))
                  setCatalogMsg('Image uploaded!')
                }} />
              </label>
              {catalogForm.cover_url && <img src={catalogForm.cover_url} alt="preview" style={{width:80,height:80,objectFit:'cover',borderRadius:4,marginBottom:12,border:'1px solid #222'}} />}
              {catalogMsg && <div style={{fontSize:11,color:catalogMsg.startsWith('Error')?'#ff2d78':'#b4ff3c',marginBottom:12}}>{catalogMsg}</div>}
              <button style={T.submitBtn} onClick={async()=>{
                if (!catalogForm.title||!catalogForm.artist_name) { setCatalogMsg('Title and artist required'); return }
                const {error} = await supabase.from('shootout_catalog').insert(catalogForm)
                if (error) { setCatalogMsg('Error: '+error.message); return }
                setCatalogMsg('Added to catalog!')
                setCatalogForm({ title:'', artist_name:'', type:'song', cover_url:'', coin_cost:1 })
                loadCatalog()
              }}>ADD TO CATALOG →</button>
            </div>

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>CATALOG — {catalog.length} items</div>
            {catalog.map(item=>(
              <div key={item.id} style={{...T.row,marginBottom:8,gap:12}}>
                {item.cover_url
                  ? <img src={item.cover_url} alt="cover" style={{width:40,height:40,objectFit:'cover',borderRadius:3,border:'1px solid #222',flexShrink:0}} />
                  : <div style={{width:40,height:40,background:'#111',borderRadius:3,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#333',fontSize:8}}>NO ART</div>
                }
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:'#fff'}}>{item.title}</div>
                  <div style={{fontSize:10,color:'#444'}}>{item.artist_name} · {item.type.toUpperCase()} · {item.coin_cost} coin{item.coin_cost>1?'s':''}</div>
                </div>
                <button style={{...T.reject,padding:'4px 10px',fontSize:9}} onClick={async()=>{
                  await supabase.from('shootout_catalog').delete().eq('id',item.id)
                  loadCatalog()
                }}>REMOVE</button>
              </div>
            ))}
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
                <button style={T.btn} onClick={()=>createCheckout(process.env.REACT_APP_STRIPE_ARTIST_PRICE, session.user.id, 'artist')}>
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
  const [playoffBracket, setPlayoffBracket] = useState([])
  const [profileStats, setProfileStats] = useState(null)
  const [prizePool, setPrizePool] = useState(null)
  const [groups, setGroups] = useState([])
  const [groupForm, setGroupForm] = useState({ name:'' })
  const [joinCode, setJoinCode] = useState('')
  const [groupMsg, setGroupMsg] = useState('')
  const [prizeLeaderboard, setPrizeLeaderboard] = useState([])
  const [pastWinners, setPastWinners] = useState([])

  const SALARY_CAP = 100
  const COLORS = ['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD','#1D9E75','#378ADD','#D85A30']

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    if (tab === 'profile') loadProfileStats()
    if (tab === 'prizes') loadPrizes()
    if (tab === 'groups') loadGroups()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

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
      const { data: statsData } = await supabase.from('artist_season_stats').select('*, artists(name,tier,salary)').eq('season_id', seasonData.id).order('wins', { ascending: false }).order('losses', { ascending: true })
      setStandings(statsData || [])
    }
    if (seasonData) {
      const { data: bracket } = await supabase.from('playoffs').select('*, artist1:artist1_id(name,tier), artist2:artist2_id(name,tier), winner:winner_id(name)').eq('season_id', seasonData.id).order('round').order('series_number')
      setPlayoffBracket(bracket || [])
    }
    setLoading(false)
  }

  async function loadProfileStats() {
    if (!fan) return
    const { data: seasonPts } = await supabase.from('fan_season_points').select('*, seasons(name,status)').eq('fan_id', fan.id).order('created_at', { ascending: false })
    const { data: shots } = await supabase.from('album_shots').select('net').eq('fan_id', fan.id)
    const { data: backed } = await supabase.from('backed_artists').select('*, artists(name,tier,points)').eq('fan_id', fan.id).limit(5)
    const { data: votes } = await supabase.from('fan_votes').select('id').eq('fan_id', fan.id) // eslint-disable-line no-unused-vars
    const fireShots = shots?.filter(s=>s.net==='fire').length || 0
    const trashShots = shots?.filter(s=>s.net==='trash').length || 0
    setProfileStats({
      seasonPts: seasonPts || [],
      fireShots,
      trashShots,
      totalShots: shots?.length || 0,
      backed: backed || [],
      totalVotes: votes?.length || 0,
    })
  }

  async function loadPrizes() {
    const now = new Date()
    const { data: pool } = await supabase.from('prize_pools').select('*').eq('status','active').eq('month', now.getMonth()+1).eq('year', now.getFullYear()).single()
    setPrizePool(pool || null)
    const { data: fans } = await supabase.from('fans').select('id, username, coins, shootout_points').order('shootout_points', { ascending: false }).limit(10)
    setPrizeLeaderboard(fans || [])
    const { data: past } = await supabase.from('prize_winners').select('*, fans(username)').order('created_at', { ascending: false }).limit(12)
    setPastWinners(past || [])
  }

  async function loadGroups() {
    if (!fan) return
    const { data } = await supabase
      .from('group_members')
      .select('*, groups(id, name, invite_code, created_by, created_at)')
      .eq('fan_id', fan.id)
    const groupIds = (data||[]).map(m=>m.groups?.id).filter(Boolean)
    if (groupIds.length === 0) { setGroups([]); return }
    const groupsWithMembers = await Promise.all(groupIds.map(async(gid)=>{
      const { data: members } = await supabase
        .from('group_members')
        .select('*, fans(username)')
        .eq('group_id', gid)
      const group = data.find(d=>d.groups?.id===gid)?.groups
      return { ...group, members: members||[] }
    }))
    setGroups(groupsWithMembers)
  }

  async function createGroup() {
    if (!groupForm.name.trim()) { setGroupMsg('Enter a group name'); return }
    const { data, error } = await supabase.from('groups').insert({ name: groupForm.name.trim(), created_by: fan.id }).select().single()
    if (error) { setGroupMsg('Error: '+error.message); return }
    await supabase.from('group_members').insert({ group_id: data.id, fan_id: fan.id, role: 'admin' })
    setGroupForm({ name:'' })
    setGroupMsg('Group created!')
    loadGroups()
  }

  async function joinGroup() {
    if (!joinCode.trim()) { setGroupMsg('Enter an invite code'); return }
    const { data: group, error } = await supabase.from('groups').select('*').eq('invite_code', joinCode.trim()).single()
    if (error||!group) { setGroupMsg('Group not found — check the code'); return }
    const { data: existing } = await supabase.from('group_members').select('id').eq('group_id', group.id).eq('fan_id', fan.id).single()
    if (existing) { setGroupMsg('Already in this group'); return }
    await supabase.from('group_members').insert({ group_id: group.id, fan_id: fan.id, role: 'member' })
    setJoinCode('')
    setGroupMsg(`Joined ${group.name}!`)
    loadGroups()
  }

  async function leaveGroup(groupId) {
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('fan_id', fan.id)
    loadGroups()
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

  async function draftArtistToSlot(artist, slot) {
    if (!season || !fan) return
    if (draftPicks.find(p=>p.artist_id===artist.id)) { return }
    const isStarter = slot !== 'bench'
    const slotName = isStarter ? 'starter' : 'bench'
    if (isStarter && draftPicks.filter(p=>p.slot==='starter').length >= 5) return
    if (!isStarter && draftPicks.find(p=>p.slot==='bench')) return
    const cost = 1
    if ((fan.coins||0) < cost) { alert('Not enough coins'); return }
    let currentDraft = draft
    if (!currentDraft) {
      const { data } = await supabase.from('drafts').insert({ fan_id: fan.id, season_id: season.id, salary_used: 0 }).select().single()
      currentDraft = data
      setDraft(data)
    }
    await supabase.from('draft_picks').insert({ draft_id: currentDraft.id, artist_id: artist.id, slot: slotName, salary: artist.salary||10 })
    await supabase.from('fans').update({ coins: (fan.coins||0) - cost }).eq('id', fan.id)
    setFan(f=>({...f, coins:(f.coins||0)-cost}))
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

{!fan?.subscribed && (
        <div style={{background:'rgba(255,215,0,0.05)',borderBottom:'1px solid rgba(255,215,0,0.15)',padding:'10px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:11,color:'#ffd60a'}}>Subscribe to unlock all features — $5/month</div>
          <button style={{background:'transparent',border:'1px solid rgba(255,215,0,0.4)',color:'#ffd60a',padding:'6px 16px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={()=>createCheckout(process.env.REACT_APP_STRIPE_FAN_PRICE, session.user.id, 'fan')}>
            SUBSCRIBE →
          </button>
        </div>
      )}
      <div style={T.nav}>
        {[['league','THE LEAGUE'],['roster','MY ROSTER'],['games','GAMES'],['standings','STANDINGS'],['playoffs','PLAYOFFS'],['shootout','SHOOTOUT'],['prizes','PRIZES'],['groups','GROUPS'],['profile','MY PROFILE']].map(([id,label])=>(
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

        {/* ── MY ROSTER ── */}
        {tab==='roster' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:9,color:'#333',letterSpacing:3}}>MY ROSTERS</div>
              <div style={{fontSize:10,color:'#444'}}>1 roster · {draftPicks.filter(p=>p.slot!=='bench').length}/5 starters · {draftPicks.filter(p=>p.slot==='bench').length}/1 bench</div>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
              <div style={{padding:'6px 16px',background:'rgba(180,255,60,0.1)',border:'1px solid #b4ff3c',borderRadius:4,fontSize:11,color:'#b4ff3c',cursor:'pointer'}}>Main Roster</div>
            </div>

            <div style={{border:'1px solid #111',borderRadius:6,padding:16,marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:13,color:'#fff',fontWeight:500}}>Main Roster</div>
                <div style={{fontSize:10,color:'#444'}}>5 STARTERS + 1 BENCH · 1 coin to add · free to remove</div>
              </div>

              {[1,2,3,4,5].map(slot=>{
                const pick = draftPicks.find((p,i)=>p.slot==='starter'&&draftPicks.filter(x=>x.slot==='starter').indexOf(p)===slot-1)
                return (
                  <div key={slot} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid #111',borderRadius:4,marginBottom:8}}>
                    {pick ? (
                      <>
                        <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][slot-1]},${['#7F77DD','#378ADD','#ff2d78','#b4ff3c','#ffd60a'][slot-1]})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>
                          {pick.artists?.name?.slice(0,2).toUpperCase()}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:'#fff'}}>{pick.artists?.name}</div>
                          <div style={{fontSize:9,letterSpacing:1,color:pick.artists?.tier==='superstar'?'#ffd60a':'#b4ff3c'}}>{pick.artists?.tier?.toUpperCase()} · {pick.artists?.points||0}pts</div>
                        </div>
                        <button style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontSize:16,fontFamily:'monospace'}} onClick={()=>removePick(pick.id,pick.salary)}>✕</button>
                      </>
                    ) : (
                      <div style={{flex:1,textAlign:'center',fontSize:10,color:'#333',letterSpacing:2}}>SLOT {slot} — SELECT BELOW</div>
                    )}
                  </div>
                )
              })}

              <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,45,120,0.15)',borderRadius:4,marginTop:4}}>
                {draftPicks.find(p=>p.slot==='bench') ? (
                  <>
                    <div style={{fontSize:9,color:'#ff2d78',letterSpacing:2,minWidth:40}}>BENCH</div>
                    <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#ff2d78,#ff9500)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0}}>
                      {draftPicks.find(p=>p.slot==='bench')?.artists?.name?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,color:'#fff'}}>{draftPicks.find(p=>p.slot==='bench')?.artists?.name}</div>
                      <div style={{fontSize:9,color:'#444'}}>{draftPicks.find(p=>p.slot==='bench')?.artists?.tier?.toUpperCase()}</div>
                    </div>
                    <button style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontSize:16}} onClick={()=>{ const b=draftPicks.find(p=>p.slot==='bench'); removePick(b.id,b.salary) }}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:9,color:'#ff2d78',letterSpacing:2,minWidth:40}}>BENCH</div>
                    <div style={{flex:1,textAlign:'center',fontSize:10,color:'#333',letterSpacing:2}}>BENCH SLOT — SELECT BELOW</div>
                  </>
                )}
              </div>
            </div>

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:14}}>ADD TO ROSTER (1 coin per slot)</div>

            {artists.map((a,i)=>{
              const picked = draftPicks.find(p=>p.artist_id===a.id)
              const TIER_COLORS = {superstar:'#ffd60a', rising:'#b4ff3c', newcomer:'#888'}
              const tierColor = TIER_COLORS[a.tier]||'#888'
              const AV_COLORS = ['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD','#1D9E75','#378ADD','#D85A30']
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',border:'1px solid #111',borderRadius:6,marginBottom:8,opacity:picked?0.5:1}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`linear-gradient(135deg,${AV_COLORS[i%AV_COLORS.length]},${AV_COLORS[(i+3)%AV_COLORS.length]})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>
                    {a.name?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:'#fff',marginBottom:3}}>{a.name}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontSize:9,color:tierColor,letterSpacing:1}}>{(a.tier||'rising').toUpperCase()}</span>
                      <span style={{fontSize:9,color:'#333'}}>·</span>
                      <span style={{fontSize:9,color:'#444'}}>{a.points||0}pts</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    {picked ? (
                      <span style={{fontSize:9,color:'#b4ff3c',border:'1px solid rgba(180,255,60,0.3)',padding:'4px 10px',borderRadius:3}}>ADDED</span>
                    ) : (
                      <>
                        {[1,2,3,4,5].map(s=>{
                          const slotTaken = draftPicks.filter(p=>p.slot==='starter')[s-1]
                          return (
                            <button key={s} style={{background:slotTaken?'rgba(255,255,255,0.05)':'rgba(180,255,60,0.08)',border:`1px solid ${slotTaken?'#222':'rgba(180,255,60,0.2)'}`,color:slotTaken?'#333':'#b4ff3c',padding:'4px 7px',fontSize:9,cursor:slotTaken?'default':'pointer',fontFamily:'monospace',borderRadius:3}} onClick={()=>!slotTaken&&draftArtistToSlot(a,s)}>S{s}</button>
                          )
                        })}
                        <button style={{background:'rgba(255,45,120,0.08)',border:'1px solid rgba(255,45,120,0.2)',color:'#ff2d78',padding:'4px 7px',fontSize:9,cursor:'pointer',fontFamily:'monospace',borderRadius:3}} onClick={()=>draftArtistToSlot(a,'bench')}>BN</button>
                      </>
                    )}
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
                   <div style={{fontSize:9,color:'#333',marginTop:2}}>{s.wins+s.losses > 0 ? `${((s.wins/(s.wins+s.losses))*100).toFixed(0)}% WIN RATE · ${s.wins+s.losses} GP` : 'NO GAMES'}</div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PLAYOFFS ── */}
        {tab==='playoffs' && (
          <div>
            <div style={T.sectionTitle}>PLAYOFF BRACKET</div>
            {playoffBracket.length===0 && (
              <div style={{...T.card,textAlign:'center',padding:40}}>
                <div style={{fontSize:14,color:'#333',marginBottom:8}}>Playoffs not started</div>
                <div style={{fontSize:11,color:'#222'}}>Top 16 artists advance after the regular season</div>
              </div>
            )}
            {[1,2,3,4].map(round=>{
              const roundSeries = playoffBracket.filter(s=>s.round===round)
              if (roundSeries.length===0) return null
              const roundNames = {1:'FIRST ROUND',2:'SEMIFINALS',3:'CONFERENCE FINALS',4:'CHAMPIONSHIP'}
              return (
                <div key={round} style={{marginBottom:24}}>
                  <div style={{fontSize:9,color:'#ff2d78',letterSpacing:3,marginBottom:12}}>{roundNames[round]||`ROUND ${round}`}</div>
                  {roundSeries.map((s,i)=>(
                    <div key={s.id} style={{...T.card,borderLeft:`3px solid ${s.status==='finished'?'#333':'#ff2d78'}`,marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <span style={{...T.tag,background:s.status==='finished'?'rgba(255,255,255,0.03)':'rgba(255,45,120,0.1)',color:s.status==='finished'?'#444':'#ff2d78'}}>{s.status==='finished'?'FINISHED':'ACTIVE'}</span>
                        <span style={{fontSize:9,color:'#333'}}>SERIES {i+1} · BEST OF 7</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{flex:1}}>
                         <div style={{fontSize:13,color:s.winner_id===s.artist1_id?'#ffd60a':'#fff',marginBottom:3}}>{s.artist1?.name} {s.winner_id===s.artist1_id&&'🏆'}</div>
                          <div style={{fontSize:9,color:'#444',letterSpacing:1}}>
                            {s.artist1?.tier?.toUpperCase()}
                            {standings.findIndex(x=>x.artist_id===s.artist1_id)>=0 && ` · #${standings.findIndex(x=>x.artist_id===s.artist1_id)+1} SEED`}
                          </div>
                        </div>
                        <div style={{textAlign:'center',padding:'0 12px'}}>
                          <div style={{display:'flex',gap:8,alignItems:'center'}}>
                            <span style={{fontSize:24,color:'#ff2d78',fontWeight:700}}>{s.artist1_wins}</span>
                            <span style={{fontSize:12,color:'#333'}}>—</span>
                            <span style={{fontSize:24,color:'#b4ff3c',fontWeight:700}}>{s.artist2_wins}</span>
                          </div>
                          <div style={{fontSize:9,color:'#333',marginTop:4}}>WINS</div>
                        </div>
                        <div style={{flex:1,textAlign:'right'}}>
                         <div style={{fontSize:13,color:s.winner_id===s.artist2_id?'#ffd60a':'#fff',marginBottom:3}}>{s.winner_id===s.artist2_id&&'🏆'} {s.artist2?.name}</div>
                          <div style={{fontSize:9,color:'#444',letterSpacing:1}}>
                            {s.artist2?.tier?.toUpperCase()}
                            {standings.findIndex(x=>x.artist_id===s.artist2_id)>=0 && ` · #${standings.findIndex(x=>x.artist_id===s.artist2_id)+1} SEED`}
                          </div>
                        </div>
                      </div>
                      {s.winner && (
                        <div style={{marginTop:12,textAlign:'center',fontSize:10,color:'#ffd60a',letterSpacing:2}}>
                          🏆 {s.winner?.name} WINS THE SERIES
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* ── SHOOTOUT ── */}
       {tab==='shootout' && (
          <AlbumShootout fan={fan} supabase={supabase} onCoinsUpdate={(newCoins)=>setFan(f=>({...f,coins:newCoins}))} />
        )}

        {/* ── PRIZES ── */}
        {tab==='prizes' && (
          <div>
            <div style={{...T.card,background:'linear-gradient(135deg,rgba(255,215,0,0.06),rgba(255,45,120,0.04))',borderColor:'rgba(255,215,0,0.2)',marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{fontSize:9,color:'#333',letterSpacing:3,marginBottom:6}}>MONTHLY PRIZE POOL</div>
                  <div style={{fontSize:36,color:'#ffd60a',fontWeight:700}}>${(prizePool?.total_amount||0).toFixed(2)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:4}}>RESETS</div>
                  <div style={{fontSize:11,color:'#fff'}}>1st of every month</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {[['1st','50%','#ffd60a'],['2nd','30%','#b4ff3c'],['3rd','15%','#ff9500'],['4th','5%','#ff2d78']].map(([pos,pct,color])=>(
                  <div key={pos} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:4,padding:'10px 8px',textAlign:'center'}}>
                    <div style={{fontSize:16,color,fontWeight:700}}>{pos}</div>
                    <div style={{fontSize:11,color:'#fff',marginTop:4}}>${((prizePool?.total_amount||0)*(parseInt(pct)/100)).toFixed(2)}</div>
                    <div style={{fontSize:9,color:'#444',marginTop:2}}>{pct}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>THIS MONTH — TOP FANS</div>
            {prizeLeaderboard.map((f,i)=>(
              <div key={f.id} style={{...T.card,marginBottom:8,borderLeft:`3px solid ${['#ffd60a','#b4ff3c','#ff9500','#ff2d78','#7F77DD','#378ADD','#1D9E75','#D85A30','#888','#555'][i]}`}}>
                <div style={{display:'flex',gap:14,alignItems:'center'}}>
                  <div style={{fontSize:20,color:i<4?['#ffd60a','#b4ff3c','#ff9500','#ff2d78'][i]:'#333',fontWeight:700,minWidth:28}}>#{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:'#fff'}}>{f.username}</div>
                    <div style={{fontSize:9,color:'#444',marginTop:2}}>{f.shootout_points||0} shootout pts</div>
                  </div>
                  {i < 4 && <div style={{fontSize:11,color:'#ffd60a'}}>${((prizePool?.total_amount||0)*[0.5,0.3,0.15,0.05][i]).toFixed(2)}</div>}
                </div>
              </div>
            ))}

            {pastWinners.length > 0 && (
              <div style={{marginTop:24}}>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>PAST WINNERS</div>
                {pastWinners.map(w=>(
                  <div key={w.id} style={{...T.card,marginBottom:6}}>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{fontSize:14,color:'#ffd60a',fontWeight:700}}>#{w.position}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,color:'#fff'}}>{w.fans?.username||w.fan_username}</div>
                      </div>
                      <div style={{fontSize:12,color:'#ffd60a',fontWeight:700}}>${w.amount}</div>
                      <span style={{fontSize:9,padding:'2px 7px',background:w.paid?'rgba(180,255,60,0.1)':'rgba(255,45,120,0.1)',color:w.paid?'#b4ff3c':'#ff2d78'}}>{w.paid?'PAID':'PENDING'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GROUPS ── */}
        {tab==='groups' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{fontSize:9,color:'#333',letterSpacing:3}}>MY GROUPS</div>
              <button style={{...T.greenBtn,fontSize:9,padding:'6px 14px'}} onClick={()=>setGroupMsg('')}>+ CREATE</button>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              <input
                style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px 12px',fontSize:11,fontFamily:'monospace',flex:1,minWidth:160}}
                placeholder="Group name..."
                value={groupForm.name}
                onChange={e=>setGroupForm({name:e.target.value})}
                onKeyDown={e=>e.key==='Enter'&&createGroup()}
              />
              <button style={{...T.greenBtn,fontSize:9,padding:'8px 16px'}} onClick={createGroup}>CREATE →</button>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
              <input
                style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'8px 12px',fontSize:11,fontFamily:'monospace',flex:1,minWidth:160}}
                placeholder="Enter invite code..."
                value={joinCode}
                onChange={e=>setJoinCode(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&joinGroup()}
              />
              <button style={{...T.btn,fontSize:9,padding:'8px 16px'}} onClick={joinGroup}>JOIN →</button>
            </div>

            {groupMsg && <div style={{fontSize:11,color:groupMsg.startsWith('Error')?'#ff2d78':'#b4ff3c',marginBottom:16}}>{groupMsg}</div>}

            {groups.length===0 && <div style={{fontSize:11,color:'#222'}}>No groups yet — create one or join with an invite code</div>}

            {groups.map(g=>(
              <div key={g.id} style={{...T.card,marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                  <div>
                    <div style={{fontSize:14,color:'#fff',fontWeight:500,marginBottom:4}}>{g.name}</div>
                    <div style={{fontSize:10,color:'#444'}}>{g.members?.length||0} members</div>
                  </div>
                  <button style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontFamily:'monospace',fontSize:10}} onClick={()=>leaveGroup(g.id)}>LEAVE</button>
                </div>

                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                  {g.members?.map(m=>(
                    <span key={m.id} style={{fontSize:10,color:m.fan_id===fan.id?'#b4ff3c':'#555',padding:'4px 10px',border:`1px solid ${m.fan_id===fan.id?'rgba(180,255,60,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:99}}>
                      {m.fan_id===fan.id?'@you':`@${m.fans?.username||'fan'}`}
                    </span>
                  ))}
                </div>

                <div style={{borderTop:'1px solid #111',paddingTop:12,marginBottom:12}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>ROSTERS IN GROUP</div>
                  {g.members?.map((m,mi)=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:4,marginBottom:6}}>
                      <div style={{fontSize:10,color:m.fan_id===fan.id?'#b4ff3c':'#555',minWidth:80}}>
                        {m.fan_id===fan.id?'@you':`@${m.fans?.username||'fan'}`}
                      </div>
                      <div style={{flex:1,display:'flex',gap:4}}>
                        {[0,1,2,3,4].map(si=>(
                          <div key={si} style={{width:22,height:22,borderRadius:'50%',background:`${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}33`,border:`1px solid ${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}}>
                            S{si+1}
                          </div>
                        ))}
                        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,45,120,0.1)',border:'1px solid rgba(255,45,120,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#ff2d78'}}>BN</div>
                      </div>
                    </div>
                  ))}
                </div>

               <div style={{borderTop:'1px solid #111',paddingTop:12,marginBottom:12}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>ROSTERS IN GROUP</div>
                  {g.members?.map((m,mi)=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:4,marginBottom:6}}>
                      <div style={{fontSize:10,color:m.fan_id===fan.id?'#b4ff3c':'#555',minWidth:80}}>
                        {m.fan_id===fan.id?'@you':`@${m.fans?.username||'fan'}`}
                      </div>
                      <div style={{flex:1,display:'flex',gap:4}}>
                        {[0,1,2,3,4].map(si=>(
                          <div key={si} style={{width:22,height:22,borderRadius:'50%',background:`${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}33`,border:`1px solid ${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}}>
                            S{si+1}
                          </div>
                        ))}
                        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,45,120,0.1)',border:'1px solid rgba(255,45,120,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#ff2d78'}}>BN</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{borderTop:'1px solid #111',paddingTop:12,marginBottom:12}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>ROSTERS IN GROUP</div>
                  {g.members?.map((m,mi)=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:4,marginBottom:6}}>
                      <div style={{fontSize:10,color:m.fan_id===fan.id?'#b4ff3c':'#555',minWidth:80}}>
                        {m.fan_id===fan.id?'@you':`@${m.fans?.username||'fan'}`}
                      </div>
                      <div style={{flex:1,display:'flex',gap:4}}>
                        {[0,1,2,3,4].map(si=>(
                          <div key={si} style={{width:22,height:22,borderRadius:'50%',background:`${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}33`,border:`1px solid ${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}}>
                            S{si+1}
                          </div>
                        ))}
                        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,45,120,0.1)',border:'1px solid rgba(255,45,120,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#ff2d78'}}>BN</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{borderTop:'1px solid #111',paddingTop:12,marginBottom:12}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>ROSTERS IN GROUP</div>
                  {g.members?.map((m,mi)=>(
                    <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.02)',borderRadius:4,marginBottom:6}}>
                      <div style={{fontSize:10,color:m.fan_id===fan.id?'#b4ff3c':'#555',minWidth:80}}>
                        {m.fan_id===fan.id?'@you':`@${m.fans?.username||'fan'}`}
                      </div>
                      <div style={{flex:1,display:'flex',gap:4}}>
                        {[0,1,2,3,4].map(si=>(
                          <div key={si} style={{width:22,height:22,borderRadius:'50%',background:`${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}33`,border:`1px solid ${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][si]}}>
                            S{si+1}
                          </div>
                        ))}
                        <div style={{width:22,height:22,borderRadius:'50%',background:'rgba(255,45,120,0.1)',border:'1px solid rgba(255,45,120,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#ff2d78'}}>BN</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{borderTop:'1px solid #111',paddingTop:12}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:8}}>INVITE CODE</div>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <code style={{fontSize:12,color:'#ff2d78',letterSpacing:3,background:'rgba(255,45,120,0.08)',padding:'4px 10px',borderRadius:4}}>{g.invite_code}</code>
                    <button style={{background:'transparent',border:'1px solid #222',color:'#444',padding:'4px 10px',fontSize:9,cursor:'pointer',fontFamily:'monospace'}} onClick={()=>{navigator.clipboard.writeText(g.invite_code);setGroupMsg('Invite code copied!')}}>COPY</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab==='profile' && (
          <div>
            <div style={{...T.card,background:'linear-gradient(135deg,rgba(255,45,120,0.05),rgba(180,255,60,0.05))',borderColor:'rgba(255,45,120,0.2)',marginBottom:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#ff2d78,#7F77DD)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#fff',marginBottom:10}}>
                    {(fan?.username||'F').charAt(0).toUpperCase()}
                  </div>
                  <div style={{fontSize:14,color:'#fff',fontWeight:500}}>{fan?.username}</div>
                  <div style={{fontSize:10,color:'#444',marginTop:2}}>{fan?.subscribed?'✓ SUBSCRIBED':'FREE ACCOUNT'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:4}}>COINS</div>
                  <div style={{fontSize:24,color:'#ffd60a',fontWeight:700}}>{fan?.coins||0}</div>
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
              <div style={{...T.card,textAlign:'center',padding:'14px 8px'}}>
                <div style={{fontSize:22,color:'#EF9F27',fontWeight:500}}>{profileStats?.fireShots||0}</div>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginTop:4}}>FIRE SHOTS</div>
              </div>
              <div style={{...T.card,textAlign:'center',padding:'14px 8px'}}>
                <div style={{fontSize:22,color:'#888',fontWeight:500}}>{profileStats?.trashShots||0}</div>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginTop:4}}>TRASH SHOTS</div>
              </div>
              <div style={{...T.card,textAlign:'center',padding:'14px 8px'}}>
                <div style={{fontSize:22,color:'#ff2d78',fontWeight:500}}>{profileStats?.totalVotes||0}</div>
                <div style={{fontSize:9,color:'#333',letterSpacing:2,marginTop:4}}>GAME VOTES</div>
              </div>
            </div>

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12}}>SEASON HISTORY</div>
            {!profileStats?.seasonPts?.length && <div style={{fontSize:11,color:'#222',marginBottom:20}}>No season history yet</div>}
            {profileStats?.seasonPts?.map(s=>(
              <div key={s.id} style={{...T.card,marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:'#fff',marginBottom:3}}>{s.seasons?.name||'Season'}</div>
                  <span style={{fontSize:9,padding:'2px 7px',background:s.seasons?.status==='active'?'rgba(180,255,60,0.1)':'rgba(255,255,255,0.05)',color:s.seasons?.status==='active'?'#b4ff3c':'#444'}}>{s.seasons?.status?.toUpperCase()}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:18,color:'#ffd60a',fontWeight:700}}>{s.points}</div>
                  <div style={{fontSize:9,color:'#333',marginTop:2}}>PTS</div>
                </div>
              </div>
            ))}

            <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:12,marginTop:8}}>BACKED ARTISTS</div>
            {!profileStats?.backed?.length && <div style={{fontSize:11,color:'#222'}}>No backed artists yet</div>}
            {profileStats?.backed?.map((b,i)=>(
              <div key={b.id} style={{...T.card,marginBottom:8,borderLeft:`3px solid ${['#ff2d78','#b4ff3c','#ffd60a','#ff9500','#7F77DD'][i%5]}`}}>
                <div>
                  <div style={{fontSize:11,color:'#fff',marginBottom:3}}>{b.artists?.name}</div>
                  <div style={{fontSize:9,color:'#444'}}>{b.artists?.tier?.toUpperCase()} · {b.artists?.points||0} pts</div>
                </div>
              </div>
            ))}
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

function AlbumShootout({ fan, supabase, onCoinsUpdate }) {
  const [catalog, setCatalog] = useState([])
  const [coins, setCoins] = useState(fan?.coins || 0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('free')
  const [stats, setStats] = useState({ pts:0, fire:0, trash:0, shots:0, streak:0 })
  const [sentiment, setSentiment] = useState({})
  const [weekSentiment, setWeekSentiment] = useState({})
  const [instr, setInstr] = useState('Search for a song or album, then click a net to shoot')
  const [msg, setMsg] = useState('')
  const canvasRef = React.useRef(null)
  const stateRef = React.useRef({ balls:[], particles:[], selected:null, stats:{ pts:0, fire:0, trash:0, shots:0, streak:0 }, imgCache:{}, fireStack:[], trashStack:[] })

  const W=680, H=430
  const FIRE={x:572, y:90, r:22}
  const TRASH={x:108, y:90, r:22}
  const PAD={x:340, y:382}
  const COLORS=['#D4537E','#378ADD','#BA7517','#1D9E75','#7F77DD','#D85A30','#ff2d78','#b4ff3c']

  const filtered = catalog.filter(c =>
    search.length < 2 ? false :
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.artist_name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => { loadCatalogData() }, [])

  async function loadCatalogData() {
    const { data } = await supabase.from('shootout_catalog').select('*').eq('active', true).order('created_at', { ascending: false })
    setCatalog(data || [])
    const sent = {}
    const weekSent = {}
    if (data) data.forEach(c => { sent[c.id]={fire:0,trash:0}; weekSent[c.id]={fire:0,trash:0} })
    const now = new Date()
    const weekNum = getWeekNumber(now)
    const { data: shots } = await supabase.from('album_shots').select('catalog_id, net, week_number, year')
    if (shots) {
      shots.forEach(s => {
        if (sent[s.catalog_id]) sent[s.catalog_id][s.net]++
        if (weekSent[s.catalog_id] && s.week_number===weekNum && s.year===now.getFullYear()) weekSent[s.catalog_id][s.net]++
      })
    }
    setSentiment(sent)
    setWeekSentiment(weekSent)
  }

  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1))
    return Math.ceil((((date - yearStart) / 86400000) + 1)/7)
  }

  async function shoot(net) {
    if (!stateRef.current.selected) { setInstr('Pick a song or album first!'); return }
    const item = stateRef.current.selected
    const cost = item.coin_cost || 1
    if (!fan || coins < cost) { setMsg(`Not enough coins — need ${cost} coin${cost>1?'s':''}. Buy more coins!`); return }
    const mult = mode==='event' ? 2 : 1
    const earned = 10 * mult
    const newStats = {
      ...stateRef.current.stats,
      pts: stateRef.current.stats.pts + earned,
      shots: stateRef.current.stats.shots + 1,
      [net]: stateRef.current.stats[net] + 1,
      streak: net==='fire' ? stateRef.current.stats.streak + 1 : 0
    }
    stateRef.current.stats = newStats
    setStats({...newStats})
    const now = new Date()
    const weekNum = getWeekNumber(now)
    await supabase.from('album_shots').insert({ fan_id: fan.id, catalog_id: item.id, artist_name: item.artist_name, net, points: earned, week_number: weekNum, year: now.getFullYear() })
    const newCoins = coins - cost
    setCoins(newCoins)
    if (onCoinsUpdate) onCoinsUpdate(newCoins)
    await supabase.from('fans').update({ 
      coins: newCoins,
      shootout_points: (fan.shootout_points||0) + 0.25
    }).eq('id', fan.id)
    setSentiment(s=>({ ...s, [item.id]:{ ...s[item.id], [net]:(s[item.id]?.[net]||0)+1 } }))
    setWeekSentiment(s=>({ ...s, [item.id]:{ ...s[item.id], [net]:(s[item.id]?.[net]||0)+1 } }))
    const idx = catalog.findIndex(c=>c.id===item.id)
    const color = COLORS[idx%COLORS.length]
    const tgt = net==='fire' ? FIRE : TRASH
    const ball = { item, net, tx:tgt.x, ty:tgt.y, t:0, color }
    stateRef.current.balls = [...stateRef.current.balls, ball]
    if (net === 'fire') {
      stateRef.current.fireStack = [...(stateRef.current.fireStack||[]), { ...selected, color: COLORS[catalog.findIndex(c=>c.id===selected.id)%COLORS.length] }].slice(-8)
    } else {
      stateRef.current.trashStack = [...(stateRef.current.trashStack||[]), { ...selected, color: COLORS[catalog.findIndex(c=>c.id===selected.id)%COLORS.length] }].slice(-8)
    }
    const sm = net==='fire' && newStats.streak>=3 ? ` streak ${newStats.streak}!` : ''
    setInstr(net==='fire' ? `+${earned} pts — fire!${sm}` : `+${earned} pts — trashed`)
    setMsg(`-${cost} coin${cost>1?'s':''}`)
    const iv = setInterval(()=>{
      ball.t += 0.038
      if (ball.t>=1) {
        ball.t=1; clearInterval(iv)
        spawnParticles(tgt.x, tgt.y, net)
        setTimeout(()=>{ stateRef.current.balls = stateRef.current.balls.filter(b=>b!==ball) },400)
      }
    },16)
  }

  function spawnParticles(x,y,net) {
    const color = net==='fire'?'#EF9F27':'#5aaa5a'
    const newP = Array.from({length:12},()=>{
      const a=Math.random()*Math.PI*2, sp=1.5+Math.random()*3.5
      return {x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,color,r:2+Math.random()*4}
    })
    stateRef.current.particles = [...stateRef.current.particles, ...newP]
  }

  function easeInOut(t){return t<0.5?2*t*t:-1+(4-2*t)*t}
  function arcPos(t,sx,sy,tx,ty){
    const cx=(sx+tx)/2,cy=Math.min(sy,ty)-190,u=1-t
    return{x:u*u*sx+2*u*t*cx+t*t*tx,y:u*u*sy+2*u*t*cy+t*t*ty}
  }
  function loadImg(url) {
    if (!url) return null
    if (stateRef.current.imgCache[url]) return stateRef.current.imgCache[url]
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    img.onload = () => { stateRef.current.imgCache[url] = img }
    stateRef.current.imgCache[url] = img
    return img
  }

  useEffect(()=>{
    const cv=canvasRef.current
    if(!cv) return
    const ctx=cv.getContext('2d')
    let animId

    function drawCourt(){
      ctx.fillStyle='#C9A86B';ctx.fillRect(0,0,W,H)
      ctx.strokeStyle='rgba(175,135,75,0.5)';ctx.lineWidth=1
      for(let y=0;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      for(let x=0;x<W;x+=22){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      ctx.strokeStyle='rgba(255,248,220,0.58)';ctx.lineWidth=2.5
      ctx.beginPath();ctx.arc(W/2,H/2,62,0,Math.PI*2);ctx.stroke()
      ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke()
      ctx.strokeRect(0,H*0.28,165,H*0.57)
      ctx.strokeRect(W-165,H*0.28,165,H*0.57)
      ctx.beginPath();ctx.arc(0,H/2,200,-Math.PI*0.45,Math.PI*0.45);ctx.stroke()
      ctx.beginPath();ctx.arc(W,H/2,200,Math.PI*0.55,Math.PI*1.45);ctx.stroke()
    }

    function drawBoard(bx){
      ctx.fillStyle='rgba(100,100,120,0.7)'
      ctx.fillRect(bx-20,10,12,6);ctx.fillRect(bx+8,10,12,6)
      ctx.fillStyle='rgba(0,0,0,0.14)';ctx.fillRect(bx-32+3,17,64,52)
      ctx.fillStyle='rgba(232,238,255,0.94)';ctx.strokeStyle='rgba(55,55,90,0.75)';ctx.lineWidth=2
      ctx.fillRect(bx-32,17,64,52);ctx.strokeRect(bx-32,17,64,52)
      ctx.strokeStyle='rgba(200,35,35,0.6)';ctx.lineWidth=1.5
      ctx.strokeRect(bx-13,17+52*0.3,26,52*0.45)
    }

    function drawRim(cx,col,ry){
      ctx.strokeStyle='rgba(0,0,0,0.2)';ctx.lineWidth=5
      ctx.beginPath();ctx.arc(cx,ry+2,22,0,Math.PI*2);ctx.stroke()
      ctx.strokeStyle=col;ctx.lineWidth=4
      ctx.beginPath();ctx.arc(cx,ry,22,0,Math.PI*2);ctx.stroke()
    }

    function drawFireNet(){
      const x=FIRE.x,y=FIRE.y,tick=Date.now()
      drawBoard(x);drawRim(x,'#c05010',y)
      const nb=y+40
      ctx.strokeStyle='rgba(205,125,25,0.72)';ctx.lineWidth=1
      for(let i=0;i<12;i++){
        const a=(i/12)*Math.PI*2
        ctx.beginPath();ctx.moveTo(x+Math.cos(a)*22,y+Math.sin(a)*3)
        ctx.quadraticCurveTo(x+Math.cos(a)*8,y+20,x+Math.cos(a)*3,nb);ctx.stroke()
      }
      for(let f=0;f<10;f++){
        const fl=Math.sin(tick/115+f*1.05)*0.28+0.72;ctx.globalAlpha=fl
        const fx=x-22+3+f*(44/9)+Math.sin(tick/175+f)*2
        const fh=13+Math.abs(Math.sin(tick/225+f*0.85))*26
        const fy=y-9-fh
        const gr=ctx.createRadialGradient(fx,fy+fh*.55,0,fx,fy+fh*.55,fh*.8)
        gr.addColorStop(0,'#fff5a0');gr.addColorStop(0.25,'#FAC775')
        gr.addColorStop(0.65,'#EF9F27');gr.addColorStop(1,'rgba(186,117,23,0)')
        ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(fx,fy+fh*.5,5,fh*.5,0,0,Math.PI*2);ctx.fill()
      }
      ctx.globalAlpha=1
      ctx.fillStyle='#b04010';ctx.font='500 11px sans-serif';ctx.textAlign='center'
      ctx.fillText('fire net  +10 pts',x,y+58)
    }

   function drawTrashCan(){
      const x=TRASH.x, y=TRASH.y
      const ct=y+11, cb=ct+80, tw=52, bw=42
      drawBoard(x); drawRim(x,'#888780',y)

      // Stacked balls inside
      const stack = stateRef.current.trashStack || []
      const maxV = 6
      const visible = stack.slice(-maxV)
      const slotH = (cb - ct - 8) / maxV
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x-tw/2+2,ct+2);ctx.lineTo(x+tw/2-2,ct+2)
      ctx.lineTo(x+bw/2-2,cb-2);ctx.lineTo(x-bw/2+2,cb-2)
      ctx.closePath(); ctx.clip()
      visible.forEach((item,i)=>{
        const ry = cb - 4 - (i+0.5)*slotH
        const sw = bw - 6
        if (item.cover_url) {
          const img = loadImg(item.cover_url)
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save()
            ctx.beginPath(); ctx.ellipse(x, ry, sw*0.4, slotH*0.35, 0, 0, Math.PI*2); ctx.clip()
            ctx.drawImage(img, x-sw*0.4, ry-slotH*0.35, sw*0.8, slotH*0.7)
            ctx.restore()
          } else {
            ctx.fillStyle = item.color
            ctx.beginPath(); ctx.ellipse(x, ry, sw*0.4, slotH*0.35, 0, 0, Math.PI*2); ctx.fill()
          }
        } else {
          ctx.fillStyle = item.color
          ctx.beginPath(); ctx.ellipse(x, ry, sw*0.4, slotH*0.35, 0, 0, Math.PI*2); ctx.fill()
        }
      })
      ctx.restore()

      // Can body — silver/grey metallic transparent
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x-tw/2,ct);ctx.lineTo(x+tw/2,ct)
      ctx.lineTo(x+bw/2,cb);ctx.lineTo(x-bw/2,cb)
      ctx.closePath()
      ctx.fillStyle='rgba(180,180,185,0.12)'; ctx.fill()
      ctx.strokeStyle='rgba(160,160,168,0.85)'; ctx.lineWidth=2; ctx.stroke()

      // Vertical center line
      ctx.strokeStyle='rgba(160,160,168,0.4)'; ctx.lineWidth=1.2
      ctx.beginPath(); ctx.moveTo(x,ct); ctx.lineTo(x,cb); ctx.stroke()

      // Horizontal ridges
      for(let r=1;r<=4;r++){
        const ry=ct+80*(r/5), prog=r/5
        const lx=x-tw/2+(tw-bw)/2*prog, rx=x+tw/2-(tw-bw)/2*prog
        ctx.strokeStyle='rgba(160,160,168,0.3)'; ctx.lineWidth=0.8
        ctx.beginPath(); ctx.moveTo(lx,ry); ctx.lineTo(rx,ry); ctx.stroke()
      }

      // Bottom oval
      ctx.strokeStyle='rgba(160,160,168,0.7)'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.ellipse(x,cb,bw/2,4,0,0,Math.PI*2); ctx.stroke()
      ctx.fillStyle='rgba(160,160,168,0.15)'
      ctx.beginPath(); ctx.ellipse(x,cb,bw/2,4,0,0,Math.PI*2); ctx.fill()

      
      // Count badge
      if (stack.length > 0) {
        ctx.fillStyle='rgba(100,100,108,0.9)'
        ctx.beginPath(); ctx.arc(x+tw/2+8,ct-6,10,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#fff'; ctx.font='500 9px sans-serif'; ctx.textAlign='center'
        ctx.fillText(stack.length, x+tw/2+8, ct-3)
      }
      ctx.restore()

      ctx.fillStyle='rgba(140,140,148,0.85)'; ctx.font='500 11px sans-serif'; ctx.textAlign='center'
      ctx.fillText('trash  +10 pts',x,cb+18)
    }

    function drawFireStack(){
      const x=FIRE.x, y=FIRE.y
      const stack = stateRef.current.fireStack || []
      if (stack.length === 0) return
      const maxV = 6
      const visible = stack.slice(-maxV)
      visible.forEach((item,i)=>{
        const angle = (i/maxV)*Math.PI*2
        const r = 28 + i*4
        const bx = x + Math.cos(angle)*r*0.3
        const by = y + 40 + i*8
        const img = item.cover_url ? loadImg(item.cover_url) : null
        ctx.save()
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2)
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.clip(); ctx.drawImage(img, bx-10, by-10, 20, 20)
        } else {
          ctx.fillStyle = item.color; ctx.fill()
        }
        ctx.restore()
        ctx.strokeStyle='rgba(239,159,39,0.5)'; ctx.lineWidth=1
        ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI*2); ctx.stroke()
      })
      // Count badge
      if (stack.length > 0) {
        ctx.fillStyle='rgba(186,117,23,0.9)'
        ctx.beginPath(); ctx.arc(x+28,y-28,10,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#fff'; ctx.font='500 9px sans-serif'; ctx.textAlign='center'
        ctx.fillText(stack.length, x+28, y-25)
      }
    }

    function drawPad(){
      const sel = stateRef.current.selected
      ctx.fillStyle='rgba(99,153,34,0.16)'
      ctx.beginPath();ctx.arc(PAD.x,PAD.y,26,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#639922';ctx.lineWidth=1.5
      ctx.beginPath();ctx.arc(PAD.x,PAD.y,26,0,Math.PI*2);ctx.stroke()
      if(sel){
        if (sel.cover_url) {
          const img = loadImg(sel.cover_url)
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save()
            ctx.beginPath();ctx.arc(PAD.x,PAD.y,17,0,Math.PI*2);ctx.clip()
            ctx.drawImage(img,PAD.x-17,PAD.y-17,34,34)
            ctx.restore()
          } else {
            const idx = catalog.findIndex(c=>c.id===sel.id)
            ctx.fillStyle=COLORS[idx%COLORS.length]
            ctx.beginPath();ctx.arc(PAD.x,PAD.y,17,0,Math.PI*2);ctx.fill()
            ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center'
            ctx.fillText(sel.title?.slice(0,2).toUpperCase(),PAD.x,PAD.y+3)
          }
        } else {
          const idx = catalog.findIndex(c=>c.id===sel.id)
          ctx.fillStyle=COLORS[idx%COLORS.length]
          ctx.beginPath();ctx.arc(PAD.x,PAD.y,17,0,Math.PI*2);ctx.fill()
          ctx.fillStyle='#fff';ctx.font='bold 8px sans-serif';ctx.textAlign='center'
          ctx.fillText(sel.title?.slice(0,2).toUpperCase(),PAD.x,PAD.y+3)
        }
      } else {
        ctx.fillStyle='#3B6D11';ctx.font='500 10px sans-serif';ctx.textAlign='center'
        ctx.fillText('select',PAD.x,PAD.y-2);ctx.fillText('album',PAD.x,PAD.y+10)
      }
    }

    function drawBalls(){
      stateRef.current.balls.forEach(b=>{
        const t=easeInOut(Math.min(b.t,1))
        const pos=arcPos(t,PAD.x,PAD.y,b.tx,b.ty)
        ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(b.t*Math.PI*8)
        if (b.item.cover_url) {
          const img = loadImg(b.item.cover_url)
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.save()
            ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.clip()
            ctx.drawImage(img,-15,-15,30,30)
            ctx.restore()
            ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1
            ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.stroke()
          } else {
            ctx.shadowColor='rgba(0,0,0,0.28)';ctx.shadowBlur=6
            ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2)
            ctx.fillStyle=b.color;ctx.fill()
            ctx.shadowBlur=0
            ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center'
            ctx.fillText(b.item.title?.slice(0,2).toUpperCase(),0,3)
          }
        } else {
          ctx.shadowColor='rgba(0,0,0,0.28)';ctx.shadowBlur=6
          ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2)
          ctx.fillStyle=b.color;ctx.fill()
          ctx.shadowBlur=0
          ctx.fillStyle='#fff';ctx.font='bold 7px sans-serif';ctx.textAlign='center'
          ctx.fillText(b.item.title?.slice(0,2).toUpperCase(),0,3)
        }
        ctx.restore()
      })
    }

    function drawParticles(){
      stateRef.current.particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.18;p.life-=0.05
        ctx.globalAlpha=Math.max(0,p.life)
        ctx.fillStyle=p.color
        const radius = p.r*p.life
        if (radius > 0) { ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill() }
      })
      ctx.globalAlpha=1
      stateRef.current.particles=stateRef.current.particles.filter(p=>p.life>0)
    }

    function loop(){
      drawCourt();drawFireNet();drawTrashCan();drawFireStack();drawPad();drawBalls();drawParticles()
      animId=requestAnimationFrame(loop)
    }
    loop()
    return ()=>cancelAnimationFrame(animId)
  },[catalog])

  const handleCanvasClick = (e) => {
    if (!stateRef.current.selected) { setInstr('Pick a song or album first!'); return }
    const cv = canvasRef.current
    const rect = cv.getBoundingClientRect()
    const mx = (e.clientX-rect.left)*(W/rect.width)
    const my = (e.clientY-rect.top)*(H/rect.height)
    const inFire = mx>=FIRE.x-FIRE.r-30&&mx<=FIRE.x+FIRE.r+30&&my<=FIRE.y+60&&my>=0
    const inTrash = mx>=TRASH.x-30&&mx<=TRASH.x+30&&my>=0&&my<=TRASH.y+100
    if (inFire) shoot('fire')
    else if (inTrash) shoot('trash')
    else setInstr('Click on fire net or trash can to shoot')
  }

  const allTimeTop = Object.entries(sentiment)
    .map(([id,s])=>({ item: catalog.find(c=>c.id===id), fire:s.fire, trash:s.trash, total:s.fire+s.trash }))
    .filter(x=>x.item&&x.total>0)
    .sort((a,b)=>b.total-a.total)
    .slice(0,5)

  const weekTop = Object.entries(weekSentiment)
    .map(([id,s])=>({ item: catalog.find(c=>c.id===id), fire:s.fire, trash:s.trash, total:s.fire+s.trash }))
    .filter(x=>x.item&&x.total>0)
    .sort((a,b)=>b.total-a.total)
    .slice(0,5)

  return (
    <div style={{fontFamily:'monospace'}}>
      <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        {[['pts','PTS'],['fire','🔥'],['trash','🗑'],['shots','SHOTS'],['streak','STREAK']].map(([k,l])=>(
          <div key={k} style={{background:'rgba(255,255,255,0.03)',border:'1px solid #111',borderRadius:6,padding:'8px 14px',textAlign:'center',minWidth:60}}>
            <div style={{fontSize:20,color:k==='pts'?'#ffd60a':k==='fire'?'#EF9F27':k==='trash'?'#5aaa5a':k==='streak'?'#ff2d78':'#fff',fontWeight:500}}>{stats[k]}</div>
            <div style={{fontSize:9,color:'#333',letterSpacing:2}}>{l}</div>
          </div>
        ))}
        <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:'auto'}}>
          <div style={{fontSize:10,color:'#ffd60a'}}>{coins} coins</div>
          <button style={{background:mode==='event'?'rgba(255,215,0,0.1)':'transparent',border:'1px solid rgba(255,215,0,0.3)',color:'#ffd60a',padding:'6px 14px',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'monospace',borderRadius:99}} onClick={()=>setMode(m=>m==='free'?'event':'free')}>{mode==='event'?'EVENT 2X':'FREE PLAY'}</button>
        </div>
      </div>

      <div style={{position:'relative',marginBottom:10}}>
        <input
          style={{background:'#0a0a0a',border:'1px solid #222',color:'#fff',padding:'10px 14px',fontSize:11,fontFamily:'monospace',width:'100%',boxSizing:'border-box'}}
          placeholder="Search songs and albums..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        {filtered.length>0 && (
          <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#0d0d0d',border:'1px solid #222',zIndex:10,maxHeight:200,overflowY:'auto'}}>
            {filtered.map((item,i)=>(
              <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',cursor:'pointer',borderBottom:'1px solid #111'}}
                onClick={()=>{ setSelected(item); stateRef.current.selected=item; setSearch(''); setInstr(`${item.title} selected — click fire net or trash can (costs ${item.coin_cost} coin${item.coin_cost>1?'s':''})`); setMsg('') }}>
                {item.cover_url
                  ? <img src={item.cover_url} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:3,flexShrink:0}} />
                  : <div style={{width:36,height:36,background:COLORS[i%COLORS.length],borderRadius:3,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,fontWeight:700}}>{item.title.slice(0,2).toUpperCase()}</div>
                }
                <div>
                  <div style={{fontSize:11,color:'#fff'}}>{item.title}</div>
                  <div style={{fontSize:9,color:'#444'}}>{item.artist_name} · {item.type.toUpperCase()} · {item.coin_cost} coin{item.coin_cost>1?'s':''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,0.03)',border:'1px solid #222',borderRadius:6,marginBottom:10}}>
          {selected.cover_url
            ? <img src={selected.cover_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:3,flexShrink:0}} />
            : <div style={{width:40,height:40,background:'#222',borderRadius:3,flexShrink:0}} />
          }
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#fff'}}>{selected.title}</div>
            <div style={{fontSize:9,color:'#444'}}>{selected.artist_name} · {selected.coin_cost} coin{selected.coin_cost>1?'s':''} per shot</div>
          </div>
          <button style={{background:'transparent',border:'none',color:'#333',cursor:'pointer',fontSize:16}} onClick={()=>{ setSelected(null); stateRef.current.selected=null; setInstr('Search for a song or album, then click a net to shoot') }}>✕</button>
        </div>
      )}

      <canvas ref={canvasRef} width={W} height={H} onClick={handleCanvasClick}
        style={{display:'block',borderRadius:8,border:'1px solid #111',cursor:'crosshair',width:'100%'}} />

      <div style={{fontSize:11,color:'#444',marginTop:6,minHeight:16}}>{instr}</div>
      {msg && (
        <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
          <div style={{fontSize:10,color:'#ffd60a'}}>{msg}</div>
          {coins === 0 && (
            <div style={{display:'flex',gap:6}}>
             <button style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',color:'#ffd60a',padding:'4px 12px',fontSize:9,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={()=>createCheckout(process.env.REACT_APP_STRIPE_COINS_6, fan?.id, 'coins_6')}>6 COINS $.50</button>
              <button style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',color:'#ffd60a',padding:'4px 12px',fontSize:9,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={()=>createCheckout(process.env.REACT_APP_STRIPE_COINS_30, fan?.id, 'coins_30')}>30 COINS $1.00</button>
              <button style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.3)',color:'#ffd60a',padding:'4px 12px',fontSize:9,letterSpacing:2,cursor:'pointer',fontFamily:'monospace'}} onClick={()=>createCheckout(process.env.REACT_APP_STRIPE_COINS_50, fan?.id, 'coins_50')}>50 COINS $1.25</button>

            </div>
          )}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:20}}>
        <div>
          <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:10}}>THIS WEEK</div>
          {weekTop.length===0 && <div style={{fontSize:11,color:'#222'}}>No shots this week</div>}
          {weekTop.map((x,i)=>(
            <div key={x.item.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'6px 10px',background:'rgba(255,255,255,0.02)',borderRadius:4}}>
              <span style={{fontSize:12,color:COLORS[i%COLORS.length],fontWeight:700,minWidth:20}}>#{i+1}</span>
              {x.item.cover_url && <img src={x.item.cover_url} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:2,flexShrink:0}} />}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{x.item.title}</div>
                <div style={{fontSize:9,color:'#444'}}>{x.fire}🔥 {x.trash}🗑</div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{fontSize:9,color:'#333',letterSpacing:2,marginBottom:10}}>ALL TIME</div>
          {allTimeTop.length===0 && <div style={{fontSize:11,color:'#222'}}>No shots yet</div>}
          {allTimeTop.map((x,i)=>(
            <div key={x.item.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'6px 10px',background:'rgba(255,255,255,0.02)',borderRadius:4}}>
              <span style={{fontSize:12,color:COLORS[i%COLORS.length],fontWeight:700,minWidth:20}}>#{i+1}</span>
              {x.item.cover_url && <img src={x.item.cover_url} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:2,flexShrink:0}} />}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{x.item.title}</div>
                <div style={{fontSize:9,color:'#444'}}>{x.fire}🔥 {x.trash}🗑</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}