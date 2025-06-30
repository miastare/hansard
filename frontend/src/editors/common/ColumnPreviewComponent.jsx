
import React from 'react';
import ColumnsPreview from '../../components/ColumnsPreview';
import { useColumnWindowing, useModal } from './EditorHooks';

/**
 * Reusable component for displaying column previews with windowing and modal
 */
export default function ColumnPreviewComponent({ 
  columns, 
  title, 
  showViewAll = true,
  columnsPerWindow = 4 
}) {
  const {
    windowedColumns,
    totalWindows,
    currentWindow,
    nextWindow,
    prevWindow,
    canGoNext,
    canGoPrev
  } = useColumnWindowing(columns, columnsPerWindow);

  const { isOpen: showAllModal, openModal, closeModal } = useModal();

  if (columns.length === 0) return null;

  return (
    <div style={{ flex: '1', minWidth: '300px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '8px' 
      }}>
        <span style={{ 
          fontWeight: '600', 
          fontSize: '14px', 
          color: '#374151' 
        }}>
          📊 {title} ({columns.length})
        </span>
        {showViewAll && (
          <button
            onClick={openModal}
            style={{
              padding: '4px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            View All
          </button>
        )}
      </div>

      {/* Windowed Column Display */}
      <div style={{
        background: 'rgba(248, 250, 252, 0.8)',
        border: '1px solid rgba(203, 213, 225, 0.4)',
        borderRadius: '8px',
        padding: '12px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px',
          marginBottom: windowedColumns.length > 0 ? '12px' : '0'
        }}>
          {windowedColumns.map(col => (
            <div key={col.name} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid rgba(203, 213, 225, 0.3)',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <span style={{ fontWeight: '500', color: '#374151' }}>{col.name}</span>
              <span style={{ 
                color: col.dtype === 'str' ? '#10b981' : 
                       col.dtype === 'numeric' || col.dtype === 'int64' ? '#3b82f6' : 
                       col.dtype === 'bool' ? '#f59e0b' : '#6b7280',
                fontSize: '11px'
              }}>
                {col.dtype}
              </span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        {totalWindows > 1 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <button
              onClick={prevWindow}
              disabled={!canGoPrev}
              style={{
                padding: '4px 8px',
                background: !canGoPrev ? '#f3f4f6' : '#e5e7eb',
                border: 'none',
                borderRadius: '4px',
                cursor: !canGoPrev ? 'not-allowed' : 'pointer',
                fontSize: '11px'
              }}
            >
              ← Prev
            </button>
            <span>
              {currentWindow} of {totalWindows}
            </span>
            <button
              onClick={nextWindow}
              disabled={!canGoNext}
              style={{
                padding: '4px 8px',
                background: !canGoNext ? '#f3f4f6' : '#e5e7eb',
                border: 'none',
                borderRadius: '4px',
                cursor: !canGoNext ? 'not-allowed' : 'pointer',
                fontSize: '11px'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* All Columns Modal */}
      {showAllModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80%',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#374151' }}>
                {title} ({columns.length})
              </h3>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>
            <ColumnsPreview 
              columns={columns} 
              title={title}
              isVisible={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
