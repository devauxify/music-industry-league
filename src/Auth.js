import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Auth({ role, onBack }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [selectedRole, setSelectedRole] = useState(role || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setError('')
    alert('Password reset email sent — check your inbox')
    setLoading(false)
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!selectedRole) { setError('Please select Artist or Fan'); setLoading(false); return }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      if (selectedRole === 'fan') {
        await supabase.from('fans').insert({
          user_id: data.user.id,
          username: username || email.split('@')[0],
          coins: 6,
        })
      }
      if (selectedRole === 'artist') {
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .is('user_id', null)
    .ilike('name', username || email.split('@')[0])
    .single()
  if (existing) {
    await supabase.from('artists').update({ user_id: data.user.id }).eq('id', existing.id)
  } else {
    await supabase.from('artists').insert({
      user_id: data.user.id,
      name: username || email.split('@')[0],
      points: 0,
      verified: false,
      paid: false,
      tier: 'rising',
      salary: 10,
    })
  }
}
      setMessage('Account created! Check your email to confirm, then log in.')
    }
    setLoading(false)
  }

  return (
    <div style={S.root}>
      <div style={S.box}>
  {onBack && (
    <button style={S.backBtn} onClick={onBack}>← BACK</button>
  )}
  <div style={S.logo}>MUSIC INDUSTRY LEAGUE</div>
  <div style={S.tagline}>The Official Artist Ranking Platform</div>
        
        

        <div style={S.tabs}>
          <button style={{...S.tab,...(mode==='login'?S.tabActive:{})}} onClick={()=>{setMode('login');setError('');setMessage('')}}>LOG IN</button>
          <button style={{...S.tab,...(mode==='signup'?S.tabActive:{})}} onClick={()=>{setMode('signup');setError('');setMessage('')}}>SIGN UP</button>
        </div>

        {message && <div style={S.success}>{message}</div>}
        {error && <div style={S.error}>{error}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin} style={S.form}>
            <label style={S.label}>EMAIL</label>
            <input style={S.input} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <label style={S.label}>PASSWORD</label>
            <input style={S.input} type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required/>
           <button style={S.btn} type="submit" disabled={loading}>
              {loading ? 'LOGGING IN...' : 'LOG IN →'}
            </button>
            <button type="button" onClick={handleForgotPassword} style={S.forgotBtn}>
              FORGOT PASSWORD?
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} style={S.form}>
            <label style={S.label}>I AM A</label>
            <div style={S.roleRow}>
              <button type="button" style={{...S.roleBtn,...(role==='artist'?S.roleBtnActive:{})}} onClick={()=>setSelectedRole('artist')}>🎵 ARTIST</button>
              <button type="button" style={{...S.roleBtn,...(role==='fan'?S.roleBtnActive:{})}} onClick={()=>setSelectedRole('fan')}>🎧 FAN</button>
            </div>
            <label style={S.label}>{role==='artist'?'ARTIST NAME':'USERNAME'}</label>
            <input style={S.input} type="text" placeholder={role==='artist'?'Your artist name...':'Your username...'} value={username} onChange={e=>setUsername(e.target.value)}/>
            <label style={S.label}>EMAIL</label>
            <input style={S.input} type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/>
            <label style={S.label}>PASSWORD</label>
            <input style={S.input} type="password" placeholder="min 6 characters" value={password} onChange={e=>setPassword(e.target.value)} required/>
            <button style={S.btn} type="submit" disabled={loading}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const S = {
  root:{minHeight:'100vh',background:'#05070a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Mono',monospace",padding:20},
  box:{width:'100%',maxWidth:420,border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:32,background:'rgba(255,255,255,0.02)'},
  logo:{fontFamily:'Georgia,serif',fontSize:18,fontWeight:700,color:'#fff',letterSpacing:3,textAlign:'center',marginBottom:6},
  tagline:{fontSize:10,color:'#444',letterSpacing:2,textAlign:'center',marginBottom:28},
  tabs:{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:24},
  tab:{flex:1,background:'transparent',border:'none',color:'#444',fontSize:11,letterSpacing:2,padding:'10px 0',cursor:'pointer',fontFamily:'inherit',borderBottom:'2px solid transparent'},
  tabActive:{color:'#fff',borderBottomColor:'#b4ff3c'},
  form:{display:'flex',flexDirection:'column',gap:8},
  label:{fontSize:9,letterSpacing:2,color:'#444',marginTop:6},
  input:{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#fff',padding:'10px 12px',fontSize:13,fontFamily:'inherit',borderRadius:2,outline:'none'},
  btn:{background:'#b4ff3c',color:'#000',border:'none',padding:'12px',fontSize:11,letterSpacing:2,fontWeight:800,cursor:'pointer',fontFamily:'inherit',borderRadius:2,marginTop:8},
  roleRow:{display:'flex',gap:10,marginBottom:4},
  roleBtn:{flex:1,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#555',padding:'10px',fontSize:12,cursor:'pointer',fontFamily:'inherit',borderRadius:2},
  roleBtnActive:{borderColor:'#b4ff3c',color:'#b4ff3c',background:'rgba(180,255,60,0.05)'},
  success:{background:'rgba(180,255,60,0.08)',border:'1px solid rgba(180,255,60,0.2)',color:'#b4ff3c',padding:'10px 14px',fontSize:11,borderRadius:2,marginBottom:12},
  error:{background:'rgba(255,45,120,0.08)',border:'1px solid rgba(255,45,120,0.2)',color:'#ff2d78',padding:'10px 14px',fontSize:11,borderRadius:2,marginBottom:12},
  backBtn:{background:'transparent',border:'none',color:'#444',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',padding:'0 0 16px 0',display:'block'},
  forgotBtn:{background:'transparent',border:'none',color:'#444',fontSize:10,letterSpacing:2,cursor:'pointer',fontFamily:'inherit',padding:'8px 0 0 0',display:'block',width:'100%',textAlign:'center'},
}