import Navbar from '../components/navbar';
import Footer from '../components/footer';
import PricingHeader from '../components/pricing_header';
import RenderInformationTable from '../components/information_table';
import RenderSagPrice from '../components/sag_price';
import RenderPricingTable from '../components/pricing_table';
import RenderWeightTable from '../components/weight_table';
import { useContext } from "react";
import { AppContext } from '../context/AppContext';
import RenderPdfInformation from '../components/pdf_information';
import price from '../pricing/price';

export default function PricePage() {
  const { piece, setpiece, th_table } = useContext(AppContext);
    price({ piece, th_table });
  return (
    <div className="Price_page">
      <Navbar text="STARCO Company" />

      <PricingHeader piece={piece} setpiece={setpiece} />

      <div className="divider_div">
        <hr className='divider' />
      </div>

      <RenderSagPrice />

      <div className="divider_div">
        <hr className='divider' />
      </div>

      <RenderWeightTable />

      <div className="divider_div">
        <hr className='divider' />
      </div>

      <RenderInformationTable th_table={th_table} piece={piece} />

      <div className="divider_div">
        <hr className='divider' />
      </div>

      <RenderPricingTable />

      <div className="divider_div">
        <hr className='divider' />
      </div>

      <RenderPdfInformation />

      <Footer />
    </div>
  );
}
