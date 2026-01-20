import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from './pages/home_page.jsx';
import SignInPage from './pages/sign_in_page.jsx';
import PricePage from './pages/price_page.jsx';
import HomePricePage from './pages/home_price_page.jsx';
import DashboardPage from './pages/dashboard.jsx';
import { AppProvider } from './context/AppContext.js';

function App() {
  return (
    <AppProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/home_price" element={<HomePricePage />} />
            <Route path="/price_page/:id" element={<PricePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AppProvider>
  )
}

export default App;
