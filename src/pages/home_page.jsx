import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import { Link } from 'react-router-dom';


export default function HomePage() {
    function handle3D() {
        const lock = document.querySelector(".lockdiv");
        lock.style.display = "flex";
        lock.innerHTML = `<div class="lock2">This feature is coming soon!</div>`;
        setTimeout(() => {
            lock.style.display = "none";
        }, 3000);
    }
    return (
        <div className="HomePage">
            <Navbar text="Welcome in STARCO Company " />
            <div className="lockdiv">
                
            </div>
            <div className="button-div">
                <Link to="/sign-in">
                    <Button class_pram="btn_price" text="Create a new price offer file"  />
                </Link>
                <Button class_pram="btn_3d" text="Create a new 3D file" onClick={handle3D} >
                <span className="btn_3d_span">(coming soon)</span>
                </Button>
            </div>
            <Footer />
        </div>
    );
}