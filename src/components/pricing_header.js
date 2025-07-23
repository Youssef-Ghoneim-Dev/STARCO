import PricingInput from './pricing_input';
import Button from './button';
export default function PricingHeader({ piece, setpiece }) {
    function add_field() {
        setpiece([...piece, `إضافي${(piece.length - 7) + 1}`]);
    }
    return (
        <div className='pricing-header'>
            <h2 className='pricing-title'>التسعير :</h2>
            <div className="pricing-inputs">
                {piece.map((item,index) => (
                    <PricingInput length={index} key={index} piece={item} information={true}/>
                ))}
            </div>
            <Button onClick={add_field} text="إضافة خانة" class_pram="add-field" />
        </div>
    );
}
