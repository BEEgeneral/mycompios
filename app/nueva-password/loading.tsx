export default function Loading() {
  return (
    <div style={{ 
      fontFamily: 'Poppins, system-ui', 
      background: '#FCF9F1', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p style={{ color: '#9CA3AF', marginTop: '1rem' }}>Cargando...</p>
      </div>
    </div>
  )
}
