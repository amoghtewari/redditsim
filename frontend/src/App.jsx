import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ClonePage from './pages/ClonePage';
import AboutPage from './pages/AboutPage';
import DesignPage from './pages/DesignPage';
import HowToUsePage from './pages/HowToUsePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/clone/:sessionId" element={<ClonePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/how-to-use" element={<HowToUsePage />} />
      </Routes>
    </BrowserRouter>
  );
}
