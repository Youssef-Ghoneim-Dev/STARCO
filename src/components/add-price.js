import { useNavigate } from 'react-router-dom';
export default function AddPrice() {
      const navigate = useNavigate();
    return (
        <div className="AddPrice" onClick={() => {
            navigate("/price_page");
        }}>
            <i className='bx bx-plus'></i>
        </div>
    );
}