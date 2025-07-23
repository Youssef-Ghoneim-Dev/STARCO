import Navbar from '../components/navbar';
import Footer from '../components/footer';
import PricingHeader from '../components/pricing_header';
import RenderInformationTable from '../components/information_table';
import RenderSagPrice from '../components/sag_price';
import RenderPricingTable from '../components/pricing_table';
import RenderWeightTable from '../components/weight_table';
import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
import RenderPdfInformation from '../components/pdf_information';
export default function Price_page() {
    const { piece,setpiece,th_table } = useContext(ControlAllInputsContext);
    return (
        <div className="Price_page">
            <Navbar text="STARCO Company" />
            <PricingHeader piece={piece} setpiece={setpiece} />
            <hr className='divider' />
            <RenderSagPrice />
            <hr className='divider' />
            <RenderWeightTable />
            <hr className='divider' />
            <RenderInformationTable th_table={th_table} />
            <hr className='divider' />
            <RenderPricingTable />
            <hr className='divider' />
            <RenderPdfInformation />
            <Footer />
        </div>
    );
}
