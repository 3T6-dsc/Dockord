// @ts-nocheck
// Access global React/ReactDOM injected by scripts in index.html
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
  });
  return <i data-lucide={name} style={{ width: size, height: size, ...style }} className={className}></i>;
};

// --- Utils ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Components ---

const Sidebar = ({ setView, activeView }: any) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Icon name="chef-hat" size={32} style={{ color: "var(--accent)" }} />
        <span className="logo-text">CodeChef</span>
      </div>
      
      <div className="nav-group">
        <div className={`nav-item ${activeView === 'library' ? 'active' : ''}`} onClick={() => setView('library')}>
          <Icon name="book-open" size={20} />
          <span>Recipe Book</span>
        </div>
        <div className={`nav-item ${activeView === 'new' ? 'active' : ''}`} onClick={() => setView('new')}>
          <Icon name="plus-square" size={20} />
          <span>New Recipe</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
          <Icon name="settings" size={20} />
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
};

const Terminal = ({ output, isRunning, onClear, fontSize = 14 }: any) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="terminal-panel" style={{ fontSize: `${fontSize}px` }}>
      <div className="terminal-bar">
        <span><Icon name="terminal-square" size={14} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}/> Console Output</span>
        <button onClick={onClear} className="action-btn-mini" title="Clear Console">
          <Icon name="trash-2" size={14} />
        </button>
      </div>
      <div className="terminal-content">
        {output.length === 0 && !isRunning && (
            <div style={{ color: '#52525b', fontStyle: 'italic' }}>Ready to execute...</div>
        )}
        {output.map((line: any, i: number) => (
          <div key={i} className="log-entry animate-in" style={{ animationDelay: `${i*0.02}s` }}>
            <span className="log-time">[{new Date(line.ts).toLocaleTimeString()}]</span>
            <span className={`log-text ${line.type === 'stderr' ? 'log-stderr' : line.type === 'info' ? 'log-cmd' : ''}`}>
                {line.text}
            </span>
          </div>
        ))}
        {isRunning && <div className="log-entry"><span className="log-text log-info">... Executing script ...</span></div>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

interface Recipe {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string[] | string;
}

const RecipeCard = ({ recipe, onClick, onDelete }: { recipe: Recipe, onClick: () => void, onDelete: (id: string) => void }) => {
  return (
    <div className="recipe-card animate-in" onClick={onClick}>
      <div className="card-header">
        <span className="recipe-title">{recipe.title}</span>
        <span className="lang-badge">{recipe.language}</span>
      </div>
      <p className="recipe-desc">{recipe.description || "No description provided."}</p>
      
      <div className="card-footer">
        <div className="tags">
          {Array.isArray(recipe.tags) && recipe.tags.slice(0, 3).map(t => <span key={t} className="tag">#{t}</span>)}
          {Array.isArray(recipe.tags) && recipe.tags.length > 3 && <span className="tag" style={{background: 'transparent', color: 'var(--text-secondary)'}}>+{recipe.tags.length - 3}</span>}
        </div>
        <div className="card-actions">
            <button className="action-btn-mini delete" onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }} title="Delete Recipe">
              <Icon name="trash" size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};

const RecipeEditor = ({ recipe, onSave, onCancel, defaultLanguage = 'bash', fontSize = 14 }: { recipe?: any, onSave: (r: any) => void, onCancel: () => void, defaultLanguage?: string, fontSize?: number }) => {
  const [formData, setFormData] = useState(recipe || {
    id: null,
    title: '',
    description: '',
    language: defaultLanguage,
    code: '',
    tags: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if(!formData.title) return alert("Title is required");
    const tagsArray = typeof formData.tags === 'string' 
      ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : formData.tags;

    onSave({
      ...formData,
      id: formData.id || generateId(),
      tags: tagsArray
    });
  };

  return (
    <div className="editor-container animate-in">
      <div className="editor-header">
         <h2>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
      </div>
      
      <div className="form-group">
        <label>Recipe Title</label>
        <input 
          type="text" 
          className="form-input"
          value={formData.title} 
          onChange={(e) => handleChange('title', e.target.value)} 
          placeholder="e.g., Git Commit & Push Workflow"
          autoFocus
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Language / Shell</label>
          <select className="form-select" value={formData.language} onChange={(e) => handleChange('language', e.target.value)}>
            <option value="bash">Bash / Sh</option>
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
            <option value="node">Node.js Script</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div className="form-group">
          <label>Tags (comma separated)</label>
          <input 
            type="text" 
            className="form-input"
            value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags} 
            onChange={(e) => handleChange('tags', e.target.value)} 
            placeholder="git, workflow, setup"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <input 
          type="text" 
          className="form-input"
          value={formData.description} 
          onChange={(e) => handleChange('description', e.target.value)} 
          placeholder="Briefly describe what this recipe does..."
        />
      </div>

      <div className="form-group" style={{ flex: 1 }}>
        <label>Code Snippet <span style={{fontWeight:'normal', color:'var(--text-secondary)', marginLeft:'8px'}}>(Use {"{{variable}}"} for dynamic inputs)</span></label>
        <textarea 
          value={formData.code} 
          onChange={(e) => handleChange('code', e.target.value)} 
          placeholder={`echo "Hello {{name}}!"`}
          className="form-textarea code-editor"
          style={{ fontSize: `${fontSize}px` }}
        />
      </div>

      <div className="editor-actions">
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit}>
            <Icon name="save" size={18} /> Save Recipe
        </button>
      </div>
    </div>
  );
};

const ExecutionView = ({ recipe, onEdit, onBack, autoClear = false, fontSize = 14 }: any) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Parse variables from code
  const variableNames = useMemo(() => {
    const regex = /\{\{(.*?)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(recipe.code)) !== null) {
      matches.add(match[1].trim());
    }
    return Array.from(matches);
  }, [recipe.code]);

  useEffect(() => {
    // Listen for execution events
    const handleOutput = (e: any, data: string) => setLogs(prev => [...prev, { text: data, type: 'stdout', ts: Date.now() }]);
    const handleError = (e: any, data: string) => setLogs(prev => [...prev, { text: data, type: 'stderr', ts: Date.now() }]);
    const handleEnd = () => setIsRunning(false);

    ipcRenderer.on('execution-output', handleOutput);
    ipcRenderer.on('execution-error', handleError);
    ipcRenderer.on('execution-end', handleEnd);

    return () => {
      ipcRenderer.removeAllListeners('execution-output');
      ipcRenderer.removeAllListeners('execution-error');
      ipcRenderer.removeAllListeners('execution-end');
    };
  }, []);

  const handleRun = () => {
    setIsRunning(true);
    if(autoClear) setLogs([]); 
    
    // Substitute variables
    let commandToRun = recipe.code;
    variableNames.forEach(v => {
      constVal = variables[v] || '';
      commandToRun = commandToRun.split(`{{${v}}}`).join(constVal);
      commandToRun = commandToRun.split(`{{ ${v} }}`).join(constVal);
    });

    setLogs(prev => [...(autoClear ? [] : prev), { text: `> ${commandToRun}`, type: 'info', ts: Date.now() }]);
    ipcRenderer.send('execute-command', { command: commandToRun });
  };

  return (
    <div className="execution-container animate-in">
      <div className="execution-header">
        <div className="execution-meta">
            <button className="btn ghost" onClick={onBack} title="Back to Library"><Icon name="arrow-left" size={20} /></button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="execution-title">{recipe.title}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{recipe.language} script</span>
            </div>
        </div>
        <button className="btn secondary" onClick={onEdit}><Icon name="pencil" size={16} /> Edit</button>
      </div>

      <div className="execution-body">
        <div className="execution-panel">
           <div className="code-preview" style={{ fontSize: `${fontSize}px` }}>
             {recipe.code}
           </div>
           
           {variableNames.length > 0 && (
             <div className="var-input-group">
               <h3 style={{margin: '0 0 1rem 0', fontSize:'0.9rem', textTransform:'uppercase', color:'var(--accent)'}}>Input Variables</h3>
               <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
               {variableNames.map(v => (
                 <div key={v} className="form-group">
                   <label>{v}</label>
                   <input 
                     type="text" 
                     className="form-input"
                     value={variables[v] || ''} 
                     onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                     placeholder={`Value for ${v}`}
                   />
                 </div>
               ))}
               </div>
             </div>
           )}

           <div className="action-area" style={{marginTop:'auto'}}>
             <button 
                className={`btn primary ${isRunning ? 'disabled' : ''}`} 
                style={{width: '100%'}}
                onClick={handleRun} 
                disabled={isRunning}
             >
               <Icon name="play" size={20} /> {isRunning ? 'Running...' : 'Run Recipe'}
             </button>
           </div>
        </div>

        <Terminal output={logs} isRunning={isRunning} onClear={() => setLogs([])} fontSize={fontSize} />
      </div>
    </div>
  );
};

const SettingsView = ({ settings, onUpdate, onExport }: any) => {
  const handleChange = (key: string, val: any) => {
    onUpdate({ ...settings, [key]: val });
  };

  return (
    <div className="library-view animate-in">
      <div className="top-bar">
        <div className="view-title">
          <h1>Settings</h1>
          <p>Configure your environment</p>
        </div>
      </div>
      
      <div className="editor-container" style={{maxWidth: '800px', margin: '0'}}>
        
        {/* Appearance Section */}
        <div className="recipe-card" style={{cursor: 'default', flexDirection: 'column', gap: '1.5rem'}}>
            <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>
                <h3 style={{margin:0, fontSize: '1.1rem'}}>Appearance</h3>
            </div>
            
            <div className="form-row">
                <div className="form-group">
                    <label>Editor & Console Font Size (px)</label>
                    <input 
                        type="number" 
                        className="form-input" 
                        value={settings.fontSize} 
                        onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                        min={10} max={32}
                    />
                </div>
            </div>
        </div>

        {/* Behavior Section */}
        <div className="recipe-card" style={{cursor: 'default', flexDirection: 'column', gap: '1.5rem'}}>
            <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>
                <h3 style={{margin:0, fontSize: '1.1rem'}}>Behavior</h3>
            </div>
            
            <div className="form-row" style={{alignItems: 'center', justifyContent: 'space-between'}}>
                <div className="form-group">
                    <label>Default Language for New Recipes</label>
                    <select 
                        className="form-select" 
                        value={settings.defaultLanguage}
                        onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                    >
                        <option value="bash">Bash / Sh</option>
                        <option value="powershell">PowerShell</option>
                        <option value="cmd">CMD</option>
                        <option value="node">Node.js</option>
                        <option value="python">Python</option>
                    </select>
                </div>
            </div>

            <div className="form-row" style={{alignItems: 'center', marginTop: '1rem'}}>
                <input 
                    type="checkbox" 
                    id="autoClear"
                    style={{width: '18px', height: '18px', accentColor: 'var(--accent)'}}
                    checked={settings.autoClear}
                    onChange={(e) => handleChange('autoClear', e.target.checked)}
                />
                <label htmlFor="autoClear" style={{marginLeft: '10px', fontSize: '0.95rem', cursor:'pointer', color: 'var(--text-main)', textTransform: 'none', fontWeight: 500}}>
                    Clear console before running recipe
                </label>
            </div>
        </div>

        {/* Data Section */}
        <div className="recipe-card" style={{cursor: 'default', flexDirection: 'column', gap: '1.5rem'}}>
            <div style={{borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>
                <h3 style={{margin:0, fontSize: '1.1rem'}}>Data Management</h3>
            </div>
            
            <div className="form-row">
                <button className="btn secondary" onClick={onExport}>
                    <Icon name="download" size={18} /> Export All Recipes (JSON)
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [view, setView] = useState('library'); // library, new, execute, edit, settings
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [search, setSearch] = useState('');
  
  // Settings State with LocalStorage persistence
  const [settings, setSettings] = useState(() => {
    try {
        const saved = localStorage.getItem('codechef-settings');
        return saved ? JSON.parse(saved) : { fontSize: 14, autoClear: true, defaultLanguage: 'bash' };
    } catch(e) {
        return { fontSize: 14, autoClear: true, defaultLanguage: 'bash' };
    }
  });

  const updateSettings = (newSettings: any) => {
    setSettings(newSettings);
    localStorage.setItem('codechef-settings', JSON.stringify(newSettings));
  };

  useEffect(() => {
    ipcRenderer.invoke('get-recipes').then(setRecipes);
    ipcRenderer.on('recipes-updated', (e: any, data: any[]) => setRecipes(data));
    return () => {
      ipcRenderer.removeAllListeners('recipes-updated');
    };
  }, []);

  const handleSave = (recipe: any) => {
    ipcRenderer.send('save-recipe', recipe);
    setView('library');
  };

  const handleDelete = (id: string) => {
    if(confirm('Are you sure you want to delete this recipe?')) {
      ipcRenderer.send('delete-recipe', id);
      if (selectedRecipe && selectedRecipe.id === id) {
        setSelectedRecipe(null);
        setView('library');
      }
    }
  };

  const handleSelectRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setView('execute');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipes, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `codechef_export_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredRecipes = useMemo(() => {
    if (!search) return recipes;
    const s = search.toLowerCase();
    return recipes.filter(r => 
      r.title.toLowerCase().includes(s) || 
      (r.tags && r.tags.some((t: string) => t.toLowerCase().includes(s)))
    );
  }, [recipes, search]);

  return (
    <div className="app-shell">
      <Sidebar activeView={view} setView={(v: string) => { setView(v); if(v==='library') setSelectedRecipe(null); }} />
      
      <div className="main-content">
        {view === 'library' && (
          <div className="library-view animate-in">
            <div className="top-bar">
              <div className="view-title">
                  <h1>Library</h1>
                  <p>{recipes.length} recipes available</p>
              </div>
              <div className="search-box-container">
                <Icon name="search" size={16} className="search-icon-abs"/>
                <input 
                  type="text" 
                  placeholder="Search recipes..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>
            
            {filteredRecipes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Icon name="chef-hat" size={64} style={{color: 'var(--text-secondary)'}} />
                  </div>
                  <h3>No recipes found</h3>
                  <p style={{marginBottom: '1.5rem'}}>Get cooking by creating your first code recipe.</p>
                  <button className="btn primary" onClick={() => setView('new')}>
                    <Icon name="plus" size={18} /> Create Recipe
                  </button>
                </div>
              ) : (
                <div className="recipes-grid">
                {filteredRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} onClick={() => handleSelectRecipe(r)} onDelete={handleDelete} />
                ))}
                </div>
              )}
          </div>
        )}

        {view === 'new' && (
          <RecipeEditor 
            onSave={handleSave} 
            onCancel={() => setView('library')} 
            defaultLanguage={settings.defaultLanguage}
            fontSize={settings.fontSize}
          />
        )}

        {view === 'edit' && selectedRecipe && (
          <RecipeEditor 
            recipe={selectedRecipe} 
            onSave={(r: any) => { handleSave(r); setSelectedRecipe(r); setView('execute'); }} 
            onCancel={() => setView('execute')}
            fontSize={settings.fontSize}
          />
        )}

        {view === 'execute' && selectedRecipe && (
          <ExecutionView 
            recipe={selectedRecipe} 
            onEdit={() => setView('edit')} 
            onBack={() => setView('library')} 
            autoClear={settings.autoClear}
            fontSize={settings.fontSize}
          />
        )}

        {view === 'settings' && (
          <SettingsView 
            settings={settings} 
            onUpdate={updateSettings} 
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);