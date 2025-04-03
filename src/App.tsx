import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import VisualEditor from './pages/VisualEditor'
import FigmaTest from './pages/FigmaTest'
import CustomVariableEditor from './pages/CustomVariableEditor'
import './App.scss'
import figmaConfig from './utils/figmaConfig'
import Button from './ui/Button'

// Base path for the application
const BASE_PATH = '/Visual-Editor/';

// Create space options array for the selector
const spaceOptions = [
  { value: figmaConfig.SPACES.TEST, label: 'Test' },
  { value: figmaConfig.SPACES.NEURON, label: 'Neuron' },
  { value: figmaConfig.SPACES.HMH, label: 'HMH' }
];

// Navigation component
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [figmaFileId, setFigmaFileId] = useState('');
  const [themeFigmaFileId, setThemeFigmaFileId] = useState('');
  const [allColorsFigmaFileId, setAllColorsFigmaFileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(figmaConfig.getSelectedSpace());
  const [isManualInputAllowed, setIsManualInputAllowed] = useState(figmaConfig.isManualFileIdAllowed());

  // Initialize with values from environment variables on first load
  useEffect(() => {
    // Start with Test space by default
    const initialSpace = figmaConfig.getSelectedSpace();
    console.log(`Initializing with space: ${initialSpace}`);
    
    // Set the UI state
    setSelectedSpace(initialSpace);
    setIsManualInputAllowed(figmaConfig.isManualFileIdAllowed());
    
    // Load file IDs for the initial space
    setFigmaFileId(figmaConfig.getStoredFigmaFileId());
    setThemeFigmaFileId(figmaConfig.getStoredThemeFigmaFileId());
    setAllColorsFigmaFileId(figmaConfig.getStoredAllColorsFigmaFileId());

    // When using Router with basename, we don't need to add BASE_PATH to these paths
    const path = location.pathname;
    if (path === '/' || path === '') {
      navigate('/', { replace: true });
    } else if (path === '/figma-test') {
      navigate('/figma-test', { replace: true });
    } else if (path === '/custom-editor') {
      navigate('/custom-editor', { replace: true });
    } else if (!location.pathname.match(/^\/(figma-test|custom-editor)?$/)) {
      // Redirect to home if path is not recognized
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpace = e.target.value;
    console.log(`Switching space to: ${newSpace}`);
    
    // Update space in state and localStorage
    setSelectedSpace(newSpace);
    figmaConfig.setSelectedSpace(newSpace);

    // Update manual input allowed state (only for Test space)
    const manualAllowed = newSpace === figmaConfig.SPACES.TEST;
    setIsManualInputAllowed(manualAllowed);
    
    // Always load fresh values from environment variables when switching spaces
    const mappedFileId = figmaConfig.getDefaultMappedFileId();
    const themeFileId = figmaConfig.getDefaultThemeFileId();
    console.log(`Loading env values for ${newSpace}:`);
    console.log(`- Mapped file ID: ${mappedFileId}`);
    console.log(`- Theme file ID: ${themeFileId}`);
    
    // Update state with the new values
    setFigmaFileId(mappedFileId);
    setThemeFigmaFileId(themeFileId);
    setAllColorsFigmaFileId(''); // Reset all colors file ID
  };

  const handleSetFigmaFileId = () => {
    // Only allow setting file IDs in Test space
    if (!isManualInputAllowed) return;
    
    if (!figmaFileId.trim()) return;
    
    setIsSubmitting(true);
    console.log(`Saving custom file IDs for Test space`);
    
    // Store in localStorage (only for Test space)
    figmaConfig.storeFigmaFileId(figmaFileId.trim());
    
    // Store theme file ID if provided
    if (themeFigmaFileId.trim()) {
      figmaConfig.storeThemeFigmaFileId(themeFigmaFileId.trim());
    }
    
    // Store all colors file ID if provided
    if (allColorsFigmaFileId.trim()) {
      figmaConfig.storeAllColorsFigmaFileId(allColorsFigmaFileId.trim());
    }
    
    // Show a brief visual feedback
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <header className="app-header">
      <div className="app-nav">
        <Link 
          to="/"
          className={location.pathname === '/' || location.pathname === '' ? 'active' : ''}
        >
          Visual Editor
        </Link>
        <Link 
          to="/figma-test"
          className={location.pathname === '/figma-test' ? 'active' : ''}
        >
          Figma API Test
        </Link>
        <Link 
          to="/custom-editor"
          className={location.pathname === '/custom-editor' ? 'active' : ''}
        >
          Custom Editor
        </Link>
      </div>
      <div className="file-id-control">
        <label>
          Space:
          <select
            value={selectedSpace}
            onChange={handleSpaceChange}
            className="space-selector"
          >
            {spaceOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        
        <label>
          Mapped Figma File ID:
          <input 
            type="text" 
            value={figmaFileId} 
            onChange={(e) => setFigmaFileId(e.target.value)}
            placeholder="Enter Mapped Figma File ID"
            disabled={!isManualInputAllowed}
          />
        </label>
        <label>
          Theme Figma File ID:
          <input 
            type="text" 
            value={themeFigmaFileId} 
            onChange={(e) => setThemeFigmaFileId(e.target.value)}
            placeholder="Enter Theme Figma File ID"
            disabled={!isManualInputAllowed}
          />
        </label>
        <label>
          All Colors Figma File ID:
          <input 
            type="text" 
            value={allColorsFigmaFileId} 
            onChange={(e) => setAllColorsFigmaFileId(e.target.value)}
            placeholder="Enter All Colors Figma File ID"
            disabled={!isManualInputAllowed}
          />
        </label>
        <Button 
          variant="primary"
          onClick={handleSetFigmaFileId}
          disabled={isSubmitting || !isManualInputAllowed}
          className="use-button"
        >
          {isSubmitting ? (
            <>
              <span className="spinner dark"></span>
              Saving...
            </>
          ) : 'Use'}
        </Button>
      </div>
    </header>
  );
};

// Main App component
function App() {
  return (
    <Router basename={BASE_PATH}>
      <div className="app">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<VisualEditor selectedSpace={figmaConfig.getSelectedSpace()} />} />
            <Route path="/figma-test" element={<FigmaTest />} />
            <Route path="/custom-editor" element={<CustomVariableEditor />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App
