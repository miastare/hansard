
import React from 'react';

export default function Modal({ children, onClose, depth = 0 }) {
  // Base z-index of 10000, with 100 added for each level of depth
  const zIndex = 10000 + (depth * 100);
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: zIndex
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          maxHeight: '90vh',
          maxWidth: '90vw',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          right: 0,
          padding: '10px',
          textAlign: 'right',
          backgroundColor: 'white',
          borderBottom: '1px solid #eee'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
