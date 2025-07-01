
/**
 * Common styles used across all editors
 */

export const editorStyles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '60vh'
  },

  header: {
    margin: '0 0 24px 0',
    color: '#2d3748',
    fontSize: '18px'
  },

  inputRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '24px',
    flexShrink: 0
  },

  inputContainer: {
    flex: '0 0 300px'
  },

  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151'
  },

  scrollableContent: {
    flex: '1',
    overflowY: 'auto',
    marginBottom: '20px',
    paddingRight: '8px'
  },

  card: {
    marginBottom: '20px',
    border: '2px solid rgba(102, 126, 234, 0.1)',
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)'
  },

  errorCard: {
    border: '2px solid #ef4444'
  },

  input: {
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'rgba(255, 255, 255, 0.8)'
  },

  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },

  disabledButton: {
    background: '#cbd5e1',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },

  removeButton: {
    padding: '12px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },

  footer: {
    flexShrink: 0,
    borderTop: '1px solid rgba(203, 213, 225, 0.3)',
    paddingTop: '16px',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)'
  },

  warningMessage: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: 'rgba(251, 211, 141, 0.1)',
    border: '1px solid rgba(251, 211, 141, 0.3)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

export const getInputStyle = (hasError) => ({
  ...editorStyles.input,
  ...(hasError ? { border: '2px solid #ef4444' } : {})
});

export const getButtonStyle = (disabled) => ({
  ...editorStyles.button,
  ...(disabled ? editorStyles.disabledButton : {})
});
