import { Routes, Route, BrowserRouter } from 'react-router-dom'
import VisualEditor from './pages/VisualEditor'
import AppContainer from './containers/AppContainer'
import "./App.scss"
import CustomVariableEditor from './pages/CustomVariableEditor'

// Main App component
function App() {
  return (
    <BrowserRouter>
      <AppContainer>
        <Routes>
          <Route path="/" element={<VisualEditor selectedSpace="default" />} />
          <Route path="/custom-editor" element={<CustomVariableEditor />} />
        </Routes>
      </AppContainer>
    </BrowserRouter>
  );
}

export default App
