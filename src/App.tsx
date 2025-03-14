import { useState, useEffect } from 'react'
import VisualEditor from './pages/VisualEditor'
import FigmaTest from './pages/FigmaTest'
import './App.scss'
import figmaConfig from './utils/figmaConfig'

function App() {
  const [currentPage, setCurrentPage] = useState<'editor' | 'figmaTest'>('editor');
  const [figmaFileId, setFigmaFileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize with the stored Figma file ID
    setFigmaFileId(figmaConfig.getStoredFigmaFileId());
  }, []);

  const handleSetFigmaFileId = () => {
    if (!figmaFileId.trim()) return;
    
    setIsSubmitting(true);
    figmaConfig.storeFigmaFileId(figmaFileId.trim());
    
    // Show a brief visual feedback
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-nav">
          <button 
            onClick={() => setCurrentPage('editor')}
            className={currentPage === 'editor' ? 'active' : ''}
          >
            Visual Editor
          </button>
          <button 
            onClick={() => setCurrentPage('figmaTest')}
            className={currentPage === 'figmaTest' ? 'active' : ''}
          >
            Figma API Test
          </button>
        </div>
        <div className="file-id-control">
          <label>
            Default Figma File ID:
            <input 
              type="text" 
              value={figmaFileId} 
              onChange={(e) => setFigmaFileId(e.target.value)}
              placeholder="Enter Figma File ID"
            />
          </label>
          <button 
            onClick={handleSetFigmaFileId}
            disabled={isSubmitting}
            className="use-button"
          >
            {isSubmitting ? (
              <>
                <span className="spinner dark"></span>
                Saving...
              </>
            ) : 'Use'}
          </button>
        </div>
      </header>

      <main>
        {currentPage === 'editor' ? (
          <VisualEditor />
        ) : (
          <FigmaTest />
        )}
      </main>
    </div>
  )
}

export default App
