import { useState, useEffect, useRef } from 'react'
import VisualEditor, { VisualEditorRefHandle } from './pages/VisualEditor'
import FigmaTest from './pages/FigmaTest'
import './App.scss'
import figmaConfig from './utils/figmaConfig'
import Button from './ui/Button'

// Create space options array for the selector
const spaceOptions = [
  { value: figmaConfig.SPACES.TEST, label: 'Test' },
  { value: figmaConfig.SPACES.NEURON, label: 'Neuron' },
  { value: figmaConfig.SPACES.HMH, label: 'HMH' }
];

function App() {
  const [currentPage, setCurrentPage] = useState<'editor' | 'figmaTest'>('editor');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [themeFigmaFileId, setThemeFigmaFileId] = useState('');
  const [allColorsFigmaFileId, setAllColorsFigmaFileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState(figmaConfig.getSelectedSpace());
  const [isManualInputAllowed, setIsManualInputAllowed] = useState(figmaConfig.isManualFileIdAllowed());
  const [forceReloadKey, setForceReloadKey] = useState(0);
  
  // Create a ref to pass to the VisualEditor for tracking API calls
  const editorApiCallRef = useRef<VisualEditorRefHandle>(null);

  useEffect(() => {
    // Initialize with Figma file IDs and manual input state
    setIsManualInputAllowed(figmaConfig.isManualFileIdAllowed());
    
    // Initialize file IDs
    setFigmaFileId(figmaConfig.getStoredFigmaFileId());
    setThemeFigmaFileId(figmaConfig.getStoredThemeFigmaFileId());
    setAllColorsFigmaFileId(figmaConfig.getStoredAllColorsFigmaFileId());
  }, []);

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpace = e.target.value;
    setSelectedSpace(newSpace);
    figmaConfig.setSelectedSpace(newSpace);

    // Update manual input allowed state
    const manualAllowed = newSpace === figmaConfig.SPACES.TEST;
    setIsManualInputAllowed(manualAllowed);
    
    // Load space-specific file IDs
    setFigmaFileId(figmaConfig.getDefaultMappedFileId());
    setThemeFigmaFileId(figmaConfig.getDefaultThemeFileId());
    
    // Reset all colors file ID when changing space
    if (newSpace !== figmaConfig.getSelectedSpace()) {
      setAllColorsFigmaFileId('');
      localStorage.removeItem(figmaConfig.STORAGE_KEYS.ALL_COLORS_FIGMA_FILE_ID);
    }
    
    // Force VisualEditor to reload by triggering a key change
    setForceReloadKey(prevKey => prevKey + 1);
  };

  const handleSetFigmaFileId = () => {
    if (!figmaFileId.trim()) return;
    
    setIsSubmitting(true);
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

  const handlePageChange = (page: 'editor' | 'figmaTest') => {
    // If switching from FigmaTest back to editor, we don't want to trigger a new API call
    if (currentPage === 'figmaTest' && page === 'editor') {
      // Ensure the editor won't make duplicate API calls when switching back
      if (editorApiCallRef.current) {
        editorApiCallRef.current.resetApiCallState();
      }
    }
    
    setCurrentPage(page);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-nav">
          <button 
            onClick={() => handlePageChange('editor')}
            className={currentPage === 'editor' ? 'active' : ''}
          >
            Visual Editor
          </button>
          <button 
            onClick={() => handlePageChange('figmaTest')}
            className={currentPage === 'figmaTest' ? 'active' : ''}
          >
            Figma API Test
          </button>
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

      <main>
        {currentPage === 'editor' ? (
          <VisualEditor 
            key={`visual-editor-${forceReloadKey}`}
            selectedSpace={selectedSpace} 
            ref={editorApiCallRef}
          />
        ) : (
          <FigmaTest />
        )}
      </main>
    </div>
  )
}

export default App
