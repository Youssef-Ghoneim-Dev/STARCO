import { useEffect , useState , useMemo } from 'react';
import HomePage from './pages/home_page.jsx';
import SignInPage from './pages/sign_in_page.jsx';
import PricePage from './pages/price_page.jsx';
import { BrowserRouter, Route, Routes } from "react-router-dom";   
import  ControlAllInputsContext  from './context/ControlAllInputsContext.js';
import price from './pricing/price.js';
function App() {
    useEffect(() => {
        if (!localStorage.getItem('information')) {
            localStorage.setItem('information', JSON.stringify({
                sag_price: 43,
                paint_price: 150,
                مصنعية: 150,
                كوالين: 80,  
                مفصلات: 60,
                نقل: 25,
                مسامير: 10,
                استرتش: 10,
                نحاس: "",
                فيبر: "",
                ريكام: "",
                فيوز: "",
            }));
        }
    }, []);
    function handleInputChange(e, item) {
        let currentData = JSON.parse(localStorage.getItem('information'));
        localStorage.setItem('information', JSON.stringify({
            ...currentData,
            [item]: e.target.value
        }));
        setcontrol_all_inputs({
            ...control_all_inputs,
            [item]: e.target.value
        });
    }
    let [piece, setpiece] = useState(["العلبة", "الجنب", "المراية", "الجلسة", "الجريدة","باب1", "باب2","إضافي1"]);
    const th_table = useMemo(() => (
    ["مصنعية", "كوالين", "مفصلات", "نقل", "مسامير", "استرتش", "نحاس", "فيبر", "ريكام", "فيوز"]
    ), []);
    function handleInputsControlChange(e, id) {
        setcontrol_all_inputs({
            ...control_all_inputs,
            [id]: e.target.value
        });
    }
    let [control_all_inputs, setcontrol_all_inputs] = useState(() => {
    if (!localStorage.getItem('information')) {
        localStorage.setItem('information', JSON.stringify({
            sag_price: 43,
            paint_price: 150,
            مصنعية: 150,
            كوالين: 80,  
            مفصلات: 60,
            نقل: 25,
            مسامير: 10,
            استرتش: 10,
            نحاس: "",
            فيبر: "",
            ريكام: "",
            فيوز: "",
        }));
    }

    const local_veruble = JSON.parse(localStorage.getItem('information')) || {};
    
    let initial = {};
    for (let i = 0; i < piece.length; i++) {
        initial[`width${i}`] = "";
        initial[`length${i}`] = "";
    }

    Object.assign(initial, local_veruble);

    initial['sag_price'] = initial['sag_price'] || 0;
    initial['paint_price'] = initial['paint_price'] || 0;

    return initial;
    });

    useEffect(() => {
        price({ control_all_inputs, piece ,th_table });
    }, [control_all_inputs,piece ,th_table ]);
    return (
        <ControlAllInputsContext.Provider value={{handleInputChange,piece,setpiece,th_table,control_all_inputs,setcontrol_all_inputs,handleInputsControlChange}}>
      <div className="App">
        <BrowserRouter>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/price_page" element={<PricePage />} />
            </Routes>
        </BrowserRouter>
    </div>
    </ControlAllInputsContext.Provider>
  );
}

export default App;
