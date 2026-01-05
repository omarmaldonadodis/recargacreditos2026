import React from 'react';

const SaldoDisplay = ({ saldo }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#ffffff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '10px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
    }}>
      {saldo === null ? (
        <p>Cargando saldo...</p>
      ) : (
        <>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#333' }}>Saldo</p>
          <p style={{ margin: 0, fontSize: '1.2em', color: '#0A74DA' }}>${saldo.toFixed(2)}</p>
        </>
      )}
    </div>
  );
};

export default SaldoDisplay;
