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
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', genre:'', bio:'' })
  const [formMsg, setFormMsg] = useState('')

  useEffect(() => {
    if (tab === 'queue') loadQueue()
    if (tab === 'artists') loadArtists()
    if (tab === 'fans') loadFans()
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
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: form.email,
      password: tempPassword,
      email_confirm: true
    })
    if (authError) { setFormMsg('Error: ' + authError.message); setLoading(false); return }
    const { error: artistError } = await supabase.from('artists').insert({
      user_id: authData.user.id,
      name: form.name,
      genre: form.genre,
      bio: form.bio,
      points: 0,
      verified: false,
      paid: false,
      status: 'active'
    })
    if (artistError) { setFormMsg('Error: ' + artistError.message); setLoading(false); return }
    setFormMsg(`Artist created! They can log in with ${form.email} and reset their password.`)
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
        {[['queue','IMAGE QUEUE'],['create','CREATE ARTIST'],['artists','ARTISTS'],['fans','FANS']].map(([id,label])=>(
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

      </div>
    </div>
  )
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
    const { error } = await supabase.from('chart_entries').insert({ artist_id: artist.id, chart_name: chartForm.chart_name, project_name: chartForm.project_name, peak_position: parseInt(chartForm.peak_position) })
    if (error) { setChartMsg('Error: ' + error.message); return }
    setChartForm({ chart_name:'', project_name:'', peak_position:'' })
    setChartMsg('Chart entry added!')
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
    const { error } = await supabase.from('awards').insert({ artist_id: artist.id, ...awardForm, year: parseInt(awardForm.year) })
    if (error) { setAwardMsg('Error: ' + error.message); return }
    setAwardForm({ award_name:'', category:'', type:'win', year: new Date().getFullYear() })
    setAwardMsg('Award added!')
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
    const { error } = await supabase.from('festival_bookings').insert({ artist_id: artist.id, ...festivalForm })
    if (error) { setFestivalMsg('Error: ' + error.message); return }
    setFestivalForm({ festival_name:'', location:'', festival_date:'', headlining:false })
    setFestivalMsg('Festival booking added!')
    loadFestivals()
  }

  async function deleteFestival(id) {
    await supabase.from('festival_bookings').delete().eq('id', id)
    loadFestivals()
  }

  const T = {
    root:{ minHeight:'100vh', background:'#05070a', fontFamily:'monospace', color:'#fff' },
    header:{ borderBottom:'1px solid #111', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' },
    logo:{ fontSize:11, letterSpacing:3, color:'#b4ff3c' },
    nav:{ display:'flex', gap:0, borderBottom:'1px solid #111', flexWrap:'wrap' },
    navBtn:{ background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#444', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace', padding:'12px 20px' },
    navActive:{ color:'#b4ff3c', borderBottom:'2px solid #b4ff3c' },
    body:{ padding:'24px', maxWidth:640 },
    label:{ fontSize:9, letterSpacing:2, color:'#333', marginBottom:4, display:'block' },
    input:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, boxSizing:'border-box' },
    select:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, boxSizing:'border-box' },
    textarea:{ background:'#0a0a0a', border:'1px solid #222', color:'#fff', padding:'8px 12px', fontSize:11, fontFamily:'monospace', width:'100%', marginBottom:12, height:100, boxSizing:'border-box' },
    btn:{ background:'transparent', border:'1px solid rgba(180,255,60,0.4)', color:'#b4ff3c', padding:'10px 24px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    delBtn:{ background:'transparent', border:'none', color:'#333', fontSize:10, cursor:'pointer', fontFamily:'monospace', padding:'4px 8px' },
    signout:{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#555', padding:'8px 20px', fontSize:10, letterSpacing:2, cursor:'pointer', fontFamily:'monospace' },
    card:{ border:'1px solid #111', borderRadius:4, padding:'14px 16px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
    cardTitle:{ fontSize:12, color:'#fff', marginBottom:4 },
    cardSub:{ fontSize:10, color:'#444' },
    badge:{ fontSize:9, letterSpacing:1, padding:'3px 8px', borderRadius:2 },
    msg:{ fontSize:11, marginBottom:12 },
    divider:{ borderTop:'1px solid #111', margin:'24px 0' },
    sectionTitle:{ fontSize:9, letterSpacing:3, color:'#333', marginBottom:16 },
    uploadBox:{ border:'1px dashed #222', borderRadius:4, padding:'16px', textAlign:'center', marginBottom:12, cursor:'pointer', display:'block' },
    avatar:{ width:72, height:72, borderRadius:4, objectFit:'cover', border:'1px solid #222', marginBottom:10 },
    cover:{ width:48, height:48, borderRadius:3, objectFit:'cover', border:'1px solid #222', marginRight:12, flexShrink:0 },
  }

  return (
    <div style={T.root}>
      <div style={T.header}>
        <div>
          <div style={T.logo}>MUSIC INDUSTRY LEAGUE — ARTIST</div>
          <div style={{fontSize:10,color:'#333'}}>{artist?.name || session.user.email}</div>
        </div>
        <button style={T.signout} onClick={onSignOut}>SIGN OUT</button>
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
            {chartMsg && <div style={{...T.msg,color:chartMsg.startsWith('Error')?'#ff2d78':'#b4ff3c'}}>{chartMsg}</div>}
            <button style={T.btn} onClick={addChart}>ADD CHART ENTRY →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR CHART ENTRIES — {charts.length}</div>
            {charts.length===0 && <div style={{fontSize:11,color:'#333'}}>No chart entries yet</div>}
            {charts.map(c=>(
              <div key={c.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>#{c.peak_position} — {c.chart_name}</div>
                  <div style={T.cardSub}>{c.project_name}</div>
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
            {awardMsg && <div style={{...T.msg,color:awardMsg.startsWith('Error')?'#ff2d78':'#b4ff3c'}}>{awardMsg}</div>}
            <button style={T.btn} onClick={addAward}>ADD AWARD →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR AWARDS — {awards.length}</div>
            {awards.length===0 && <div style={{fontSize:11,color:'#333'}}>No awards yet</div>}
            {awards.map(a=>(
              <div key={a.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>{a.award_name}</div>
                  <div style={T.cardSub}>{a.category} · {a.year}</div>
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
            {festivalMsg && <div style={{...T.msg,color:festivalMsg.startsWith('Error')?'#ff2d78':'#b4ff3c'}}>{festivalMsg}</div>}
            <button style={T.btn} onClick={addFestival}>ADD FESTIVAL →</button>

            <div style={T.divider} />
            <div style={T.sectionTitle}>YOUR FESTIVAL BOOKINGS — {festivals.length}</div>
            {festivals.length===0 && <div style={{fontSize:11,color:'#333'}}>No festival bookings yet</div>}
            {festivals.map(f=>(
              <div key={f.id} style={T.card}>
                <div>
                  <div style={T.cardTitle}>{f.festival_name}</div>
                  <div style={T.cardSub}>{f.location} · {f.festival_date}</div>
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
            {[['NEWCOMER','×1','0 pts'],['EMERGING','×2','500 pts'],['RISING','×5','2,000 pts'],['BREAKTHROUGH','×10','5,000 pts'],['ICON','×20','15,000 pts']].map(([tier,mult,threshold])=>(
              <div key={tier} style={{...T.card,marginBottom:6}}>
                <div style={{fontSize:11,color:'#fff',letterSpacing:2}}>{tier}</div>
                <div style={{display:'flex',gap:16,alignItems:'center'}}>
                  <span style={{fontSize:10,color:'#444'}}>{threshold}</span>
                  <span style={{fontSize:14,color:'#b4ff3c',fontWeight:700}}>{mult}</span>
                </div>
              </div>
            ))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>CHARTS</div>
            {[['Chart Entry','Any chart appearance','75 pts'],['Chart Top 10','Top 10 on any major chart','150 pts'],['Chart #1','Number one position','300 pts']].map(([name,desc,pts])=>(
              <div key={name} style={{...T.card,marginBottom:6}}>
                <div>
                  <div style={{fontSize:11,color:'#fff'}}>{name}</div>
                  <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
                </div>
                <div style={{fontSize:12,color:'#b4ff3c'}}>{pts}</div>
              </div>
            ))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>AWARDS</div>
            {[['Award Nomination','Any major award nomination','100 pts'],['Award Win','Any major award win','250 pts']].map(([name,desc,pts])=>(
              <div key={name} style={{...T.card,marginBottom:6}}>
                <div>
                  <div style={{fontSize:11,color:'#fff'}}>{name}</div>
                  <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
                </div>
                <div style={{fontSize:12,color:'#b4ff3c'}}>{pts}</div>
              </div>
            ))}

            <div style={T.divider} />
            <div style={T.sectionTitle}>FESTIVAL BOOKINGS</div>
            {[['Supporting Act','Any festival appearance','80 pts'],['Headlining','Headlining a festival','200 pts']].map(([name,desc,pts])=>(
              <div key={name} style={{...T.card,marginBottom:6}}>
                <div>
                  <div style={{fontSize:11,color:'#fff'}}>{name}</div>
                  <div style={{fontSize:9,color:'#444',marginTop:2}}>{desc}</div>
                </div>
                <div style={{fontSize:12,color:'#b4ff3c'}}>{pts}</div>
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