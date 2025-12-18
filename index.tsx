
// @ts-nocheck
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useMemo, useRef } = React;
const { createRoot } = ReactDOM;

// Access Node.js require via Electron
const { ipcRenderer } = require('electron');

// --- Icons Helper ---
const Icon = ({ name, size = 18, className = "", style = {} }: any) => {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [name]);
  return <i data-lucide={name} style={{ width: size, height: size, ...style }} className={className}></i>;
};

// --- Utils ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const parseDiscordLink = (url: string) => {
  const regex = /channels\/(\d+)\/(\d+)\/(\d+)/;
  const match = url.match(regex);
  if (match) {
    return {
      serverId: match[1],
      channelId: match[2],
      messageId: match[3]
    };
  }
  return null;
};

// --- Components ---

const Sidebar = ({ setView, activeView, items, collections }: any) => {
  const allCount = items.length;
  const reminderCount = items.filter(i => i.reminderDate && new Date(i.reminderDate) > new Date()).length;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Icon name="layout-dashboard" size={24} style={{ color: "var(--accent)" }} />
        <span className="logo-text">Dockord</span>
      </div>
      
      <div className="nav-group">
        <div className={`nav-item ${activeView === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>
          <div className="nav-item-content">
            <Icon name="message-square" size={18} />
            <span>All Messages</span>
          </div>
          <span className="nav-badge">{allCount}</span>
        </div>
        <div className={`nav-item ${activeView === 'reminders' ? 'active' : ''}`} onClick={() => setView('reminders')}>
          <div className="nav-item-content">
            <Icon name="bell" size={18} />
            <span>Reminders</span>
          </div>
          <span className="nav-badge">{reminderCount}</span>
        </div>
        <div className={`nav-item ${activeView === 'capture' ? 'active' : ''}`} onClick={() => setView('capture')}>
          <div className="nav-item-content">
            <Icon name="plus-circle" size={18} />
            <span>Capture Link</span>
          </div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Collections</div>
        <div className="nav-group">
          {collections.map(c => (
             <div 
               key={c} 
               className={`nav-item ${activeView === `collection-${c}` ? 'active' : ''}`} 
               onClick={() => setView(`collection-${c}`)}
             >
               <div className="nav-item-content">
                 <Icon name="folder" size={16} />
                 <span>{c}</span>
               </div>
               <span className="nav-badge">{items.filter(i => i.collection === c).length}</span>
             </div>
          ))}
          {collections.length === 0 && (
            <div style={{padding: '0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>No collections yet</div>
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <div className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
          <div className="nav-item-content">
            <Icon name="settings" size={18} />
            <span>Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageCard = ({ item, onClick, onDelete }: any) => {
  const meta = parseDiscordLink(item.url);
  const isReminderActive = item.reminderDate && new Date(item.reminderDate) > new Date();

  return (
    <div className="message-card animate-in" onClick={onClick}>
      <div className="card-top">
        <div className="message-title">{item.title || "Untitled Message"}</div>
        <button 
          className="btn ghost icon-only" 
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        >
          <Icon name="trash-2" size={14} />
        </button>
      </div>
      
      <div className="card-meta">
        <span className="source-pill">#{meta?.channelId.slice(-4) || "link"}</span>
        <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="message-content">
        {item.description || item.url}
      </div>

      <div className="card-footer">
        <div className="tag-list">
          {item.tags?.map(t => <span key={t} className="tag-pill">#{t}</span>)}
          {item.collection && <span className="tag-pill" style={{background: 'var(--accent-soft)', color: 'var(--accent)'}}>{item.collection}</span>}
        </div>
        {isReminderActive && (
          <div className="reminder-indicator">
            <Icon name="bell" size={12} />
            <span>{new Date(item.reminderDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CaptureView = ({ onSave, onCancel, initialData = null }: any) => {
  const [formData, setFormData] = useState(initialData || {
    url: '',
    title: '',
    description: '',
    tags: '',
    collection: '',
    reminderDate: ''
  });

  const handleSave = () => {
    if (!formData.url) return alert("URL is required");
    const tagsArray = typeof formData.tags === 'string' 
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : formData.tags;

    onSave({
      ...formData,
      id: formData.id || generateId(),
      tags: tagsArray
    });
  };

  return (
    <div className="dockord-form animate-in">
      <div className="form-section">
        <h2 style={{margin: 0}}>{initialData ? 'Edit Message' : 'Save Discord Link'}</h2>
      </div>

      <div className="form-section">
        <label className="form-label">Discord Message URL</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="https://discord.com/channels/..." 
          value={formData.url}
          onChange={e => setFormData({...formData, url: e.target.value})}
          autoFocus
        />
      </div>

      <div className="form-section">
        <label className="form-label">Title / Note</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="What is this about?" 
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
        />
      </div>

      <div className="form-section">
        <label className="form-label">Tags (comma separated)</label>
        <input 
          type="text" 
          className="form-input" 
          placeholder="dev, urgent, personal" 
          value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
          onChange={e => setFormData({...formData, tags: e.target.value})}
        />
      </div>

      <div style={{display: 'flex', gap: '1rem'}}>
        <div className="form-section" style={{flex: 1}}>
          <label className="form-label">Collection</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Work, Gaming, etc." 
            value={formData.collection}
            onChange={e => setFormData({...formData, collection: e.target.value})}
          />
        </div>
        <div className="form-section" style={{flex: 1}}>
          <label className="form-label">Reminder Date</label>
          <input 
            type="date" 
            className="form-input" 
            value={formData.reminderDate}
            onChange={e => setFormData({...formData, reminderDate: e.target.value})}
          />
        </div>
      </div>

      <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem'}}>
        <button className="btn ghost" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={handleSave}>Save To Dockord</button>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [view, setView] = useState('all');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    ipcRenderer.invoke('get-recipes').then(setItems); // Note: keeping legacy IPC name for simplicity or updated if needed
    ipcRenderer.on('recipes-updated', (e, data) => setItems(data));
    return () => ipcRenderer.removeAllListeners('recipes-updated');
  }, []);

  const handleSave = (item) => {
    ipcRenderer.send('save-recipe', item);
    setView('all');
    setEditingItem(null);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this entry?")) {
      ipcRenderer.send('delete-recipe', id);
    }
  };

  const filteredItems = useMemo(() => {
    let result = items;
    
    // View filtering
    if (view === 'reminders') {
      result = result.filter(i => i.reminderDate && new Date(i.reminderDate) > new Date());
    } else if (view.startsWith('collection-')) {
      const colName = view.replace('collection-', '');
      result = result.filter(i => i.collection === colName);
    }

    // Search filtering
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => 
        i.title?.toLowerCase().includes(s) || 
        i.description?.toLowerCase().includes(s) ||
        i.tags?.some(t => t.toLowerCase().includes(s)) ||
        i.url?.includes(s)
      );
    }

    return result;
  }, [items, view, search]);

  const collections = useMemo(() => {
    const set = new Set(items.map(i => i.collection).filter(Boolean));
    return Array.from(set);
  }, [items]);

  return (
    <div className="app-shell">
      <Sidebar 
        setView={setView} 
        activeView={view} 
        items={items} 
        collections={collections}
      />
      
      <div className="main-content">
        <div className="top-bar">
          <div className="view-title-mini">
            {view === 'all' && <><Icon name="message-square" size={16} /> All Messages</>}
            {view === 'reminders' && <><Icon name="bell" size={16} /> Reminders</>}
            {view === 'capture' && <><Icon name="plus-circle" size={16} /> Capture</>}
            {view.startsWith('collection-') && <><Icon name="folder" size={16} /> {view.replace('collection-', '')}</>}
          </div>
          
          <div className="search-container">
            <Icon name="search" size={14} className="search-icon-abs" />
            <input 
              type="text" 
              placeholder="Search links, tags, notes..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="content-scrollable">
          {(view === 'all' || view === 'reminders' || view.startsWith('collection-')) && (
            <>
              {filteredItems.length === 0 ? (
                <div className="empty-state animate-in">
                  <Icon name="inbox" size={48} />
                  <div>
                    <h3>No items found</h3>
                    <p>Try clearing your search or capture a new link.</p>
                  </div>
                  <button className="btn primary" onClick={() => setView('capture')}>
                    Capture Link
                  </button>
                </div>
              ) : (
                <div className="items-grid">
                  {filteredItems.map(item => (
                    <MessageCard 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDelete}
                      onClick={() => { setEditingItem(item); setView('capture'); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'capture' && (
            <CaptureView 
              initialData={editingItem}
              onSave={handleSave} 
              onCancel={() => { setView('all'); setEditingItem(null); }}
            />
          )}

          {view === 'settings' && (
            <div className="dockord-form animate-in">
               <h2>Settings</h2>
               <div className="form-section">
                 <p style={{color: 'var(--text-secondary)'}}>Dockord Version 1.0.0</p>
                 <button className="btn secondary" onClick={() => {
                   const data = JSON.stringify(items, null, 2);
                   const blob = new Blob([data], {type: 'application/json'});
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `dockord_backup_${new Date().toISOString().slice(0,10)}.json`;
                   a.click();
                 }}>Export Data</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
