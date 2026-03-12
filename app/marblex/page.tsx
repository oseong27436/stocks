'use client'
import Link from 'next/link'

const EXCHANGES = [
  { name: 'bithumb',   icon: '🅱' },
  { name: 'HTX',       icon: '🔥' },
  { name: 'BYBIT',     icon: '⬛' },
  { name: 'MEXC Global', icon: '🏔' },
  { name: 'INDODAX',   icon: '🇮🇩' },
  { name: 'coinone',   icon: '🔵' },
  { name: 'korbit',    icon: '🟣' },
  { name: 'bitkub',    icon: '🟢' },
]

/* 마스코트 SVG — 초록 동그란 캐릭터 */
function Mascot({ size = 200 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 220" fill="none">
      {/* 몸통 */}
      <ellipse cx="100" cy="130" rx="65" ry="70" fill="#00FF00" />
      {/* 머리 */}
      <circle cx="100" cy="75" r="55" fill="#00FF00" />
      {/* 눈 왼쪽 */}
      <circle cx="82" cy="68" r="18" fill="white" />
      <circle cx="86" cy="70" r="10" fill="#111" />
      <circle cx="90" cy="66" r="3" fill="white" />
      {/* 눈 오른쪽 */}
      <circle cx="118" cy="68" r="18" fill="white" />
      <circle cx="122" cy="70" r="10" fill="#111" />
      <circle cx="126" cy="66" r="3" fill="white" />
      {/* 입 */}
      <path d="M85 90 Q100 104 115 90" stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* 팔 왼쪽 */}
      <ellipse cx="32" cy="125" rx="16" ry="28" fill="#00FF00" transform="rotate(-15 32 125)" />
      {/* 팔 오른쪽 */}
      <ellipse cx="168" cy="125" rx="16" ry="28" fill="#00FF00" transform="rotate(15 168 125)" />
      {/* 다리 왼쪽 */}
      <ellipse cx="78" cy="195" rx="18" ry="22" fill="#00FF00" />
      {/* 다리 오른쪽 */}
      <ellipse cx="122" cy="195" rx="18" ry="22" fill="#00FF00" />
      {/* 배 무늬 */}
      <ellipse cx="100" cy="138" rx="30" ry="35" fill="#00e600" opacity="0.5" />
    </svg>
  )
}

/* 동전 SVG */
function CoinStack() {
  return (
    <svg width="120" height="140" viewBox="0 0 120 140" fill="none">
      {[100, 80, 60, 40, 20].map((y, i) => (
        <g key={i}>
          <ellipse cx="60" cy={y + 10} rx="50" ry="14" fill="#00cc00" />
          <ellipse cx="60" cy={y} rx="50" ry="14" fill="#00FF00" />
          <ellipse cx="60" cy={y} rx="38" ry="10" fill="#00e600" />
          <text x="60" y={y + 5} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#006600">M</text>
        </g>
      ))}
    </svg>
  )
}

export default function MarblexClone() {
  return (
    <div style={{ fontFamily: "'Fredoka One', 'Nunito', -apple-system, sans-serif", background: '#111', color: 'white', minHeight: '100vh', overflowX: 'hidden' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;900&display=swap" />

      {/* ── Navbar ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: "'Fredoka One'", fontSize: '28px', letterSpacing: '-1px', color: 'white', textShadow: '3px 3px 0 #000, -1px -1px 0 #333' }}>
          MARBLEX
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['HOME', 'ABOUT', 'BURN', 'CONNECT'].map((item, i) => (
            <button key={item} style={{
              padding: '8px 20px',
              borderRadius: '999px',
              border: i === 0 ? 'none' : '2px solid rgba(255,255,255,0.3)',
              background: i === 0 ? 'transparent' : 'transparent',
              color: i === 0 ? '#f5d020' : 'white',
              fontFamily: "'Fredoka One'",
              fontSize: '14px',
              cursor: 'pointer',
              letterSpacing: '1px',
            }}>
              {item} {i === 1 ? '▾' : ''}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 60% 40%, #1a2a1a 0%, #111 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 도트 패턴 */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'radial-gradient(#00FF00 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        {/* 빅 타이틀 */}
        <div style={{
          fontFamily: "'Fredoka One'",
          fontSize: 'clamp(80px, 15vw, 180px)',
          lineHeight: 0.9,
          textAlign: 'center',
          color: 'white',
          letterSpacing: '-4px',
          textShadow: '6px 6px 0 #000',
          zIndex: 1,
          userSelect: 'none',
        }}>
          MARBLEX
        </div>

        {/* 캐릭터 + 코인 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '32px', marginTop: '-20px', zIndex: 1 }}>
          <div style={{ animation: 'float 3s ease-in-out infinite' }}>
            <CoinStack />
          </div>
          <div style={{ animation: 'float 3s ease-in-out infinite', animationDelay: '0.5s' }}>
            <Mascot size={180} />
          </div>
        </div>

        {/* CTA 버튼 */}
        <button style={{
          marginTop: '32px',
          background: '#00FF00',
          color: '#111',
          border: 'none',
          borderRadius: '999px',
          padding: '16px 48px',
          fontFamily: "'Fredoka One'",
          fontSize: '22px',
          letterSpacing: '2px',
          cursor: 'pointer',
          boxShadow: '0 0 40px #00FF0066, 4px 4px 0 #006600',
          zIndex: 1,
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          FUN COMES FIRST
        </button>

        {/* 서브 텍스트 */}
        <p style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '16px', letterSpacing: '1px', zIndex: 1 }}>
          MARBLEX, Where Fun Comes First!
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', zIndex: 1, marginTop: '8px', textAlign: 'center', maxWidth: '400px', lineHeight: 1.6 }}>
          MARBLEX is building a next-generation blockchain ecosystem.<br />
          We aspire to form both the gaming and cultural metaverse for users.
        </p>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section style={{
        background: '#00FF00',
        color: '#111',
        padding: '80px 48px',
        display: 'flex',
        alignItems: 'center',
        gap: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Fredoka One'",
            fontSize: 'clamp(60px, 10vw, 120px)',
            lineHeight: 1,
            letterSpacing: '-3px',
            textShadow: '4px 4px 0 rgba(0,0,0,0.15)',
          }}>
            HOW TO<br />PLAY
          </div>
          <p style={{ marginTop: '24px', fontSize: '16px', color: 'rgba(0,0,0,0.7)', maxWidth: '400px', lineHeight: 1.8, fontFamily: 'Nunito' }}>
            Discover the thrill of gaming — experience strategy and the excitement of collecting characters in our fun-to-earn world.<br /><br />
            Which one will you choose?
          </p>
          <button style={{
            marginTop: '32px',
            background: '#111',
            color: '#00FF00',
            border: 'none',
            borderRadius: '999px',
            padding: '14px 40px',
            fontFamily: "'Fredoka One'",
            fontSize: '18px',
            cursor: 'pointer',
            letterSpacing: '1px',
          }}>
            EXPLORE GAMES →
          </button>
        </div>
        <div style={{ flexShrink: 0, animation: 'bounce 2s ease-in-out infinite' }}>
          <Mascot size={220} />
        </div>
      </section>

      {/* ── GATEWAY ── */}
      <section style={{
        background: '#1a1a1a',
        padding: '80px 48px',
        textAlign: 'center',
      }}>
        {/* 흘러가는 텍스트 */}
        <div style={{ overflow: 'hidden', marginBottom: '48px', borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '16px 0' }}>
          <div style={{
            display: 'flex',
            gap: '48px',
            whiteSpace: 'nowrap',
            animation: 'marquee 12s linear infinite',
            fontFamily: "'Fredoka One'",
            fontSize: '36px',
            color: 'white',
            letterSpacing: '2px',
          }}>
            {[...Array(4)].map((_, i) => (
              <span key={i} style={{ display: 'flex', gap: '48px' }}>
                <span>YOUR GATEWAY TO $MBX</span>
                <span style={{ color: '#00FF00' }}>✦</span>
                <span>YOUR GATEWAY TO $MBX</span>
                <span style={{ color: '#00FF00' }}>✦</span>
              </span>
            ))}
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', letterSpacing: '3px', marginBottom: '40px', fontFamily: 'Nunito' }}>
          MARBLEX OFFICIALLY LISTED EXCHANGES
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          {EXCHANGES.map(ex => (
            <div key={ex.name} style={{
              border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: '999px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: 'rgba(255,255,255,0.03)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,255,0,0.1)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#00FF00' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
            >
              <span style={{ fontSize: '16px' }}>{ex.icon}</span>
              <span style={{ fontSize: '13px', fontFamily: 'Nunito', fontWeight: 700, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{ex.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#000', padding: '48px', borderTop: '1px solid #222' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            fontFamily: "'Fredoka One'",
            fontSize: '32px',
            color: 'white',
            marginBottom: '24px',
            letterSpacing: '-1px',
          }}>
            MARBLEX
          </div>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            {['Twitter', 'Telegram', 'Medium', 'Discord', 'YouTube'].map(s => (
              <span key={s} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Nunito' }}>{s}</span>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #222', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              {['Terms of Use', 'Privacy Policy', 'Customer service'].map(l => (
                <span key={l} style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Nunito' }}>{l}</span>
              ))}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontFamily: 'Nunito' }}>Copyright © MARBLEX Corp. All Rights Reserved.</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-16px) rotate(3deg); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 40px #00FF0066, 4px 4px 0 #006600; }
          50% { box-shadow: 0 0 70px #00FF0099, 4px 4px 0 #006600; }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
