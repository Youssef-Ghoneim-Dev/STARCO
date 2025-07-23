import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Button from '../components/button';
import Input from '../components/input';
import Select from '../components/select';
import { useNavigate } from 'react-router-dom';


export default function SignInPage() {
    const navigate = useNavigate();
    function btn_click() {
        Input.value = document.getElementById("input").value;
        Select.value = document.getElementById("who_are_you").value;
        if (Input.value === "99661991" && Select.value !== " ") {
            navigate("/price_page")
        }
        else if (Input.value !== "99661991" && Input.value !== "" && Select.value !== " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `The password is wrong, Please enter your password again`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
            
        }
        else if (Input.value === "99661991" && Select.value === " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `Please select who are you ?`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
        }
        else if (Input.value !== "99661991"&&Input.value !== ""  && Select.value === " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `The password is wrong, Please select who are you ?`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
        }
        else if (Input.value === "" && Select.value === " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `Please enter your password and select who are you ?`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
        }
        else if (Input.value === "" && Select.value !== " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `Please enter your password`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
        }
        else if (Select.value === " ") {
            const lock = document.querySelector(".lockp");
            const lock2 = document.querySelector(".lock2");
            lock.style.display = "flex"
            lock2.textContent = `Please select who are you ?`
            setTimeout(() => {
                lock.style.display = "none";
            }, 3000);
        }
    }
    return (
        <div className="SignInPage">
            <Navbar text="STARCO Company" />
            <div className="lockp">
                <div className='lock2'>

                </div>
            </div>
            <h3 className='p_logIn'>please log in to continue</h3>
            <Input id="input" />
            <Select />
            <div className="buttonDiv">
                <Button class_pram="btn_sign_in" text="Log In" onClick={btn_click} />
            </div>
            <Footer />
        </div>
    );
}