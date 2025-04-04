import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom'
import VisualEditor from './pages/VisualEditor'
import AppContainer from './containers/AppContainer'
import "./App.scss"
import CustomVariableEditor from './pages/CustomVariableEditor'

// Main App component
function App() {
  return (
    <BrowserRouter basename="/Visual-Editor">
      <AppContainer>
        <Routes>
          <Route path="/" element={<VisualEditor selectedSpace="default" />} />
          <Route path="/custom-editor" element={<CustomVariableEditor />} />
          {/* Redirect any other routes to the main page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppContainer>
    </BrowserRouter>
  );
}

export default App
