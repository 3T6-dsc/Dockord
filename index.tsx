// @ts-nocheck
// Access global React/ReactDOM injected by scripts in index.html
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useMemo, useRef } = React;
const { createRoot } = ReactDOM;

// Access Node.js require via Electron
const { ipcRenderer } = require('electron');

// --- Icons Helper ---
const Icon = ({ name, size = 18, color = "currentColor", className = "", style = {} }: { name: string, size?: number, color?: string, className?: string, style?: any }) => {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return <i data-lucide={name} style={{ width: size, height: size, color, ...style }} className={className}></i>;
};

// --- Utils ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- Components ---

const Sidebar = ({ setView, activeView }: any) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Icon name="chef-hat" size={28} color="var(--accent)" />
        <span className="logo-text">CodeChef</span>
      </div>
      
      <div className="nav-group">
        <div className={`nav-item ${activeView === 'library' ? 'active' : ''}`} onClick={() => setView('library')}>
          <Icon name="book" size={20} />
          <span>Recipe Book</span>
        </div>
        <div className={`nav-item ${activeView === 'new' ? 'active' : ''}`} onClick={() => setView('new')}>
          <Icon name="plus-circle" size={20} />
          <span>New Recipe</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="nav-item">
          <Icon name="settings" size={20} />
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
};

const Terminal = ({ output, isRunning, onClear }: any) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-title">
          <Icon name="terminal" size={14} />
          <span>Output Console</span>
        </div>
        <div className="terminal-actions">
           <button onClick={onClear} className="icon-btn" title="Clear Console">
            <Icon name="trash-2" size={14} />
           </button>
        </div>
      </div>
      <div className="terminal-body">
        {output.map((line: any, i: number) => (
          <div key={i} className={`log-line ${line.type}`}>
            <span className="timestamp">[{new Date(line.ts).toLocaleTimeString()}]</span>
            <span className="content">{line.text}</span>
          </div>
        ))}
        {isRunning && <div className="log-line info">... Executing ...</div>}
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
    <div className="recipe-card" onClick={onClick}>
      <div className="card-header">
        <span className="recipe-title">{recipe.title}</span>
        <span className="lang-badge">{recipe.language}</span>
      </div>
      <p className="recipe-desc">{recipe.description || "No description provided."}</p>
      <div className="card-footer">
        <div className="tags">
          {Array.isArray(recipe.tags) && recipe.tags.map(t => <span key={t} className="tag">#{t}</span>)}
        </div>
        <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}>
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
};

const RecipeEditor = ({ recipe, onSave, onCancel }: { recipe?: any, onSave: (r: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState(recipe || {
    id: null,
    title: '',
    description: '',
    language: 'bash',
    code: '',
    tags: ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
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
    <div className="editor-container">
      <h2>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
      
      <div className="form-group">
        <label>Title</label>
        <input 
          type="text" 
          value={formData.title} 
          onChange={(e) => handleChange('title', e.target.value)} 
          placeholder="e.g., Git Commit & Push"
        />
      </div>

      <div className="form-row">
        <div className="form-group half">
          <label>Language / Shell</label>
          <select value={formData.language} onChange={(e) => handleChange('language', e.target.value)}>
            <option value="bash">Bash / Sh</option>
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
            <option value="node">Node.js Script</option>
            <option value="python">Python</option>
          </select>
        </div>
        <div className="form-group half">
          <label>Tags (comma separated)</label>
          <input 
            type="text" 
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
          value={formData.description} 
          onChange={(e) => handleChange('description', e.target.value)} 
          placeholder="What does this recipe do?"
        />
      </div>

      <div className="form-group full-height">
        <label>Code (Use {"{{variable}}"} for dynamic inputs)</label>
        <textarea 
          value={formData.code} 
          onChange={(e) => handleChange('code', e.target.value)} 
          placeholder="git commit -m '{{message}}'"
          className="code-input"
        />
      </div>

      <div className="form-actions">
        <button className="btn secondary" onClick={onCancel}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit}>Save Recipe</button>
      </div>
    </div>
  );
};

const ExecutionView = ({ recipe, onEdit, onBack }: any) => {
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
    setLogs([]); // Clear previous logs
    
    // Substitute variables
    let commandToRun = recipe.code;
    variableNames.forEach(v => {
      const val = variables[v] || '';
      // Simple replace - in production use a more robust parser to avoid injection if not desired
      commandToRun = commandToRun.split(`{{${v}}}`).join(val);
      commandToRun = commandToRun.split(`{{ ${v} }}`).join(val);
    });

    setLogs([{ text: `> ${commandToRun}`, type: 'info', ts: Date.now() }]);
    ipcRenderer.send('execute-command', { command: commandToRun });
  };

  return (
    <div className="execution-container">
      <div className="execution-header">
        <button className="icon-btn" onClick={onBack}><Icon name="arrow-left" /></button>
        <div className="header-info">
          <h1>{recipe.title}</h1>
          <span className="lang-badge">{recipe.language}</span>
        </div>
        <button className="btn secondary small" onClick={onEdit}><Icon name="edit" size={14} /> Edit</button>
      </div>

      <div className="execution-grid">
        <div className="left-pane">
           <div className="code-display">
             <pre>{recipe.code}</pre>
           </div>
           
           {variableNames.length > 0 && (
             <div className="variables-form">
               <h3>Variables</h3>
               {variableNames.map(v => (
                 <div key={v} className="var-field">
                   <label>{v}</label>
                   <input 
                     type="text" 
                     value={variables[v] || ''} 
                     onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                     placeholder={`Enter value for ${v}`}
                   />
                 </div>
               ))}
             </div>
           )}

           <div className="action-area">
             <button 
                className={`btn primary large ${isRunning ? 'disabled' : ''}`} 
                onClick={handleRun} 
                disabled={isRunning}
             >
               <Icon name="play" /> {isRunning ? 'Running...' : 'Execute Recipe'}
             </button>
           </div>
        </div>

        <div className="right-pane">
          <Terminal output={logs} isRunning={isRunning} onClear={() => setLogs([])} />
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [view, setView] = useState('library'); // library, new, execute, edit
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [search, setSearch] = useState('');

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
    if(confirm('Delete this recipe?')) {
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
          <div className="library-view">
            <div className="top-bar">
              <div className="search-box">
                <Icon name="search" size={16} className="search-icon"/>
                <input 
                  type="text" 
                  placeholder="Search recipes..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
            </div>
            <div className="recipes-grid">
              {filteredRecipes.length === 0 ? (
                <div className="empty-state">
                  <Icon name="chef-hat" size={48} color="#444" />
                  <p>No recipes found. Create your first one!</p>
                  <button className="btn primary" onClick={() => setView('new')}>Create Recipe</button>
                </div>
              ) : (
                filteredRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} onClick={() => handleSelectRecipe(r)} onDelete={handleDelete} />
                ))
              )}
            </div>
          </div>
        )}

        {view === 'new' && (
          <RecipeEditor onSave={handleSave} onCancel={() => setView('library')} />
        )}

        {view === 'edit' && selectedRecipe && (
          <RecipeEditor recipe={selectedRecipe} onSave={(r: any) => { handleSave(r); setSelectedRecipe(r); setView('execute'); }} onCancel={() => setView('execute')} />
        )}

        {view === 'execute' && selectedRecipe && (
          <ExecutionView recipe={selectedRecipe} onEdit={() => setView('edit')} onBack={() => setView('library')} />
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);