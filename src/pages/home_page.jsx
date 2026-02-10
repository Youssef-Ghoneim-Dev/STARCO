import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import { Link } from 'react-router-dom';
import { useContext } from "react";
import { AppContext } from '../context/AppContext';
export default function HomePage() {
    const { handle3D } = useContext(AppContext);
    const password = JSON.parse(localStorage.getItem("password")) || {};
    const isLoggedIn = password.setpassword && !password.passwordchenge;

    return (
        <div className="HomePage">
            <Navbar text="Welcome in STARCO Company " />
            <div className="lockdiv"></div>
            <div className="button-div">
                <Link to={isLoggedIn ? "/price_page" : "/sign-in"}>
                    <Button class_pram="btn_price" text="Create a new price offer file" />
                </Link>
                <Button class_pram="btn_3d" text="Create a new 3D file" onClick={handle3D} >
                    <span className="btn_3d_span">(coming soon)</span>
                </Button>
            </div>
            <Footer />
        </div>
    );
}
