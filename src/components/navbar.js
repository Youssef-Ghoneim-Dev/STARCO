import { useState, useEffect } from "react";
import {
  enable as enableDarkMode,
  disable as disableDarkMode,
    setFetchMethod,
} from 'darkreader';
export default function Navbar({text}) {
    let localDarkMode =localStorage.getItem("darkMode");
    localDarkMode = JSON.parse(localDarkMode);
    const [darkMode, setDarkMode] = useState(localDarkMode);
    useEffect(() => {
        if (!sessionStorage.getItem("reload")) {
            sessionStorage.setItem("reload", "true");
            window.location.reload();
        }
    }, []);
    const toggleDarkMode = () => {
        let reload = JSON.parse(sessionStorage.getItem("reload"));
        setDarkMode(!darkMode);
        if (reload) {
            sessionStorage.setItem("reload", JSON.stringify(false));
      window.location.reload();
    }
};
useEffect(() => {
    setFetchMethod(window.fetch);
    if (darkMode) {
        enableDarkMode({
            brightness: 100,
            contrast: 90,
            sepia: 10,
        });
    } else {
        disableDarkMode();
    }
    localStorage.setItem("darkMode", darkMode);
}, [darkMode]);

    return(
        <nav className="navbar">
            <img src="../starco_logo.jpg" alt="starco logo" ></img>
            <h1>{text}</h1>
            <i id="dark-mode-toggle" className={darkMode ? "bx bx-sun" : "bx bx-moon"} onClick={toggleDarkMode} title={darkMode ? "light mode" : "dark mode"}></i>
        </nav>
    )
}