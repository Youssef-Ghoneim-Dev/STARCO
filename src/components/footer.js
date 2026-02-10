export default function Footer() {
  return (
    <div className="footer">
        <div className="flex_space_between">
            <h1>STARCO</h1>
            <img src="../starco_logo.jpg" alt="starco logo"></img>
        </div>
        <div className="flex_space_between_bottom">
            <div className="footer_left">
                <p>
                    <span>Address:</span>{` Egypt - Menoufia -Sadat City - Fifth Industrial Zone -
                    behind the CocaCola Factory`}
                </p>
                <p><span>Phone:</span> +201050156113,+20112 500 5017</p>
                <p><span>Hours:</span> 9:00 AM - 4:00 PM /Sat to Thu</p>
            </div>
            <div className="footer_right">
                <p>Follow Us</p>
                <div className="social_media">
                    <a href="https://www.facebook.com/starcofactory/?_rdr" target="_blank" rel="noopener noreferrer">
                        <i className='bx bxl-facebook'></i>
                    </a>
                    <a href="mailto:starco.egypt1@gmail.com" target="_blank" rel="noopener noreferrer">
                        <i className='bx bx-envelope'></i>
                     </a>
                    <a href="http://wa.me/+201050156113" target="_blank" rel="noopener noreferrer">
                        <i className='bx bxl-whatsapp'></i>
                    </a>
                </div>        
            </div>
        </div>
    </div>
  );
}