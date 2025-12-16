const { ipcRenderer, clipboard } = require('electron');
const { useState, useEffect, useMemo, useRef } = React;
const { createRoot } = ReactDOM;

// Since we are using CDN for lucide, we need to create Icon components manually or use a wrapper
// Simulating Lucide icons for React
const Icon = ({ name, size = 18, color = "currentColor", className = "" }) => {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return <i data-lucide={name} width={size} height={size} style={{color, width: size, height: size}} className={className}></i>;
};

// --- Helpers ---
const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const flipPath = (str) => {
  // Windows -> Unix
  if (/^[a-zA-Z]:\\/.test(str)) {
    return str.replace(/^([a-zA-Z]):/, (mV, m1) => `/${m1.toLowerCase()}`).replace(/\\/g, '/');
  }
  // Unix -> Windows
  if (/^\/[a-zA-Z]\//.test(str)) {
     return str.replace(/^\/([a-zA-Z])\//, (m, m1) => `${m1.toUpperCase()}:\\`).replace(/\//g, '\\');
  }
  return str;
};

// --- Components ---

const Sidebar = ({ activeFilter, setFilter }) => {
  const filters = [
    { id: 'all', icon: 'layers', label: 'All' },
    { id: 'text', icon: 'type', label: 'Text' },
    { id: 'image', icon: 'image', label: 'Images' },
    { id: 'link', icon: 'link', label: 'Links' },
    { id: 'code', icon: 'code', label: 'Code' },
  ];

  return (
    <div style={{
      width: '200px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem 0'
    }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon name="clipboard-check" size={24} color="var(--accent)" />
        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>ClipSync</span>
      </div>
      
      {filters.map(f => (
        <div 
          key={f.id}
          onClick={() => setFilter(f.id)}
          style={{
            padding: '10px 1.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: activeFilter === f.id ? '#37373d' : 'transparent',
            borderLeft: activeFilter === f.id ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeFilter === f.id ? 'white' : 'var(--text-muted)',
            transition: 'all 0.2s'
          }}
        >
          <Icon name={f.icon} size={18} />
          <span style={{ fontSize: '0.95rem' }}>{f.label}</span>
        </div>
      ))}
    </div>
  );
};

const TopBar = ({ search, setSearch, onClear }) => {
  return (
    <div style={{
      height: '60px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      justifyContent: 'space-between',
      backgroundColor: 'var(--bg-dark)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#252526', 
        padding: '6px 12px', 
        borderRadius: '4px',
        width: '300px',
        border: '1px solid var(--border)'
      }}>
        <Icon name="search" size={16} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Search clipboard history..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            marginLeft: '8px',
            outline: 'none',
            width: '100%',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <button 
        onClick={onClear}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f55'; e.currentTarget.style.color = '#f55'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        <Icon name="trash-2" size={14} /> Clear History
      </button>
    </div>
  );
};

const MagicWand = ({ item, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const actions = [
    { label: 'To Uppercase', icon: 'arrow-up', fn: (t) => t.toUpperCase() },
    { label: 'To Lowercase', icon: 'arrow-down', fn: (t) => t.toLowerCase() },
    { label: 'Flip Slashes (Win/Unix)', icon: 'refresh-cw', fn: (t) => flipPath(t) },
    { label: 'Strip HTML Tags', icon: 'code-2', fn: (t) => t.replace(/<[^>]*>?/gm, '') },
    { label: 'Remove Extra Spaces', icon: 'align-left', fn: (t) => t.replace(/\s+/g, ' ').trim() }
  ];

  const handleAction = (fn) => {
    const newContent = fn(item.content);
    // In a real app we might update the history in DB, here we just copy new transformed text
    ipcRenderer.send('copy-item', { ...item, content: newContent });
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title="Magic Transform"
        style={{
          background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '4px'
        }}
      >
        <Icon name="wand-2" size={16} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '4px',
          width: '180px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100
        }}>
          {actions.map((act, i) => (
            <div 
              key={i}
              onClick={() => handleAction(act.fn)}
              style={{
                padding: '6px 10px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-item-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
               {act.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HistoryItem = ({ item, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    ipcRenderer.send('copy-item', item);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getIconForType = (type) => {
    switch(type) {
      case 'image': return 'image';
      case 'link': return 'link';
      case 'code': return 'code';
      default: return 'type';
    }
  };

  return (
    <div className="animate-in" style={{
      backgroundColor: 'var(--bg-item)',
      borderRadius: '6px',
      marginBottom: '10px',
      padding: '12px',
      border: '1px solid transparent',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            backgroundColor: 'var(--bg-sidebar)', 
            padding: '4px', 
            borderRadius: '4px',
            display: 'flex'
          }}>
            <Icon name={getIconForType(item.type)} size={14} color="var(--accent)" />
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {formatDate(item.timestamp)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {item.type !== 'image' && <MagicWand item={item} />}
          <button onClick={handleCopy} title="Copy" style={{ background: 'transparent', border: 'none', color: copied ? 'var(--success)' : 'var(--text-main)', cursor: 'pointer' }}>
             <Icon name={copied ? "check" : "copy"} size={16} />
          </button>
          <button onClick={() => onDelete(item.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
             <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      <div style={{ 
        fontSize: '0.9rem', 
        color: '#e0e0e0', 
        maxHeight: '100px', 
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontFamily: item.type === 'code' ? 'monospace' : 'inherit',
        backgroundColor: item.type === 'code' ? '#111' : 'transparent',
        padding: item.type === 'code' ? '6px' : '0',
        borderRadius: '4px'
      }}>
        {item.type === 'image' ? (
          <img src={item.content} alt="Clipboard Image" style={{ maxHeight: '150px', maxWidth: '100%', borderRadius: '4px' }} />
        ) : (
          item.content
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Initial fetch
    ipcRenderer.invoke('get-history').then(setHistory);

    // Listen for updates
    const removeListener = ipcRenderer.on('history-updated', (event, newHistory) => {
      setHistory(newHistory);
    });

    return () => {
      // Cleanup if needed, though removeListener is not standard in Electron ipcRenderer (it returns undefined usually), 
      // but we can use removeAllListeners in cleanup
      ipcRenderer.removeAllListeners('history-updated');
    };
  }, []);

  const handleDelete = (id) => {
    ipcRenderer.send('delete-item', id);
  };

  const handleClear = () => {
    if(confirm('Are you sure you want to clear all history?')) {
      ipcRenderer.send('clear-history');
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Type Filter
      if (filter !== 'all' && item.type !== filter) return false;
      // Search Filter
      if (search && item.type !== 'image') {
        if (!item.content.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [history, filter, search]);

  return (
    <div className="flex h-full">
      <Sidebar activeFilter={filter} setFilter={setFilter} />
      
      <div className="flex-col w-full h-full">
        <TopBar search={search} setSearch={setSearch} onClear={handleClear} />
        
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.5rem',
          height: 'calc(100% - 60px)'
        }}>
          {filteredHistory.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              color: 'var(--text-muted)' 
            }}>
              <Icon name="inbox" size={48} />
              <p style={{ marginTop: '1rem' }}>No clips found</p>
            </div>
          ) : (
            filteredHistory.map(item => (
              <HistoryItem key={item.id} item={item} onDelete={handleDelete} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
