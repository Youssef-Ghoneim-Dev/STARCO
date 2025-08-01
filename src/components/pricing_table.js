import price from "../pricing/price";
import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
export default function RenderPricingTable() {
    const { control_all_inputs, piece ,th_table } = useContext(ControlAllInputsContext);
    function handleAdditionalPriceChange() {
        price({ control_all_inputs, piece ,th_table });
    }
    return (
        <div className="RenderPricingTable">
            <div className="pricing-input-div">
                <div className="piece-div">
                    <span className="piece">سعر إضافي</span>
                </div>
                <div className="line"></div>
                <input id="additional_price" onChange={handleAdditionalPriceChange} className="input" type="number" />
            </div>
            <div className="pricing-table-container">
                <table className='pricing-table'>
                    <thead>
                        <tr>
                            <th className="radius_t_r" rowSpan={3}>السعر :</th>
                        </tr>
                        <tr>
                            <th className="border_t">السمك</th>
                            <td className="border_t">0.6</td>
                            <td className="border_t">0.7</td>
                            <td className="border_t">0.8</td>
                            <td className="border_t">0.9</td>
                            <td className="border_t">1</td>
                            <td className="border_t">1.25</td>
                            <td className="border_t">1.5</td>
                            <td className="border_t">1.8</td>
                            <td className="border_t">2</td>
                            <td className="border_t">2.5</td>
                            <td className="radius_t_l">3</td>
                        </tr>
                        <tr>
                            <th>السعر</th>
                            <td id="all_0.6_sagprice_with"></td>
                            <td id="all_0.7_sagprice_with"></td>
                            <td id="all_0.8_sagprice_with"></td>
                            <td id="all_0.9_sagprice_with"></td>
                            <td id="all_1_sagprice_with"></td>
                            <td id="all_1.25_sagprice_with"></td>
                            <td id="all_1.5_sagprice_with"></td>
                            <td id="all_1.8_sagprice_with"></td>
                            <td id="all_2_sagprice_with"></td>
                            <td id="all_2.5_sagprice_with"></td>
                            <td id="all_3_sagprice_with" className="border_l"></td>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <th rowSpan={11} className="radius_b_r space">السعر 
                                بالنسبة :</th>
                        </tr>
                        <tr className="active">
                            <th>15%</th>
                            <td id="all_0.6_sagprice_with_15%"></td>
                            <td id="all_0.7_sagprice_with_15%"></td>
                            <td id="all_0.8_sagprice_with_15%"></td>
                            <td id="all_0.9_sagprice_with_15%"></td>
                            <td id="all_1_sagprice_with_15%"></td>
                            <td id="all_1.25_sagprice_with_15%"></td>
                            <td id="all_1.5_sagprice_with_15%"></td>
                            <td id="all_1.8_sagprice_with_15%"></td>
                            <td id="all_2_sagprice_with_15%"></td>
                            <td id="all_2.5_sagprice_with_15%"></td>
                            <td id="all_3_sagprice_with_15%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th>20%</th>
                            <td id="all_0.6_sagprice_with_20%"></td>
                            <td id="all_0.7_sagprice_with_20%"></td>
                            <td id="all_0.8_sagprice_with_20%"></td>
                            <td id="all_0.9_sagprice_with_20%"></td>
                            <td id="all_1_sagprice_with_20%"></td>
                            <td id="all_1.25_sagprice_with_20%"></td>
                            <td id="all_1.5_sagprice_with_20%"></td>
                            <td id="all_1.8_sagprice_with_20%"></td>
                            <td id="all_2_sagprice_with_20%"></td>
                            <td id="all_2.5_sagprice_with_20%"></td>
                            <td id="all_3_sagprice_with_20%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th>25%</th>
                            <td id="all_0.6_sagprice_with_25%"></td>
                            <td id="all_0.7_sagprice_with_25%"></td>
                            <td id="all_0.8_sagprice_with_25%"></td>
                            <td id="all_0.9_sagprice_with_25%"></td>
                            <td id="all_1_sagprice_with_25%"></td>
                            <td id="all_1.25_sagprice_with_25%"></td>
                            <td id="all_1.5_sagprice_with_25%"></td>
                            <td id="all_1.8_sagprice_with_25%"></td>
                            <td id="all_2_sagprice_with_25%"></td>
                            <td id="all_2.5_sagprice_with_25%"></td>
                            <td id="all_3_sagprice_with_25%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th>30%</th>
                            <td id="all_0.6_sagprice_with_30%"></td>
                            <td id="all_0.7_sagprice_with_30%"></td>
                            <td id="all_0.8_sagprice_with_30%"></td>
                            <td id="all_0.9_sagprice_with_30%"></td>
                            <td id="all_1_sagprice_with_30%"></td>
                            <td id="all_1.25_sagprice_with_30%"></td>
                            <td id="all_1.5_sagprice_with_30%"></td>
                            <td id="all_1.8_sagprice_with_30%"></td>
                            <td id="all_2_sagprice_with_30%"></td>
                            <td id="all_2.5_sagprice_with_30%"></td>
                            <td id="all_3_sagprice_with_30%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th>35%</th>
                            <td id="all_0.6_sagprice_with_35%"></td>
                            <td id="all_0.7_sagprice_with_35%"></td>
                            <td id="all_0.8_sagprice_with_35%"></td>
                            <td id="all_0.9_sagprice_with_35%"></td>
                            <td id="all_1_sagprice_with_35%"></td>
                            <td id="all_1.25_sagprice_with_35%"></td>
                            <td id="all_1.5_sagprice_with_35%"></td>
                            <td id="all_1.8_sagprice_with_35%"></td>
                            <td id="all_2_sagprice_with_35%"></td>
                            <td id="all_2.5_sagprice_with_35%"></td>
                            <td id="all_3_sagprice_with_35%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th>40%</th>
                            <td id="all_0.6_sagprice_with_40%"></td>
                            <td id="all_0.7_sagprice_with_40%"></td>
                            <td id="all_0.8_sagprice_with_40%"></td>
                            <td id="all_0.9_sagprice_with_40%"></td>
                            <td id="all_1_sagprice_with_40%"></td>
                            <td id="all_1.25_sagprice_with_40%"></td>
                            <td id="all_1.5_sagprice_with_40%"></td>
                            <td id="all_1.8_sagprice_with_40%"></td>
                            <td id="all_2_sagprice_with_40%"></td>
                            <td id="all_2.5_sagprice_with_40%"></td>
                            <td id="all_3_sagprice_with_40%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th className="border_b">45%</th>
                            <td id="all_0.6_sagprice_with_45%" className="border_b"></td>
                            <td id="all_0.7_sagprice_with_45%" className="border_b"></td>
                            <td id="all_0.8_sagprice_with_45%" className="border_b"></td>
                            <td id="all_0.9_sagprice_with_45%" className="border_b"></td>
                            <td id="all_1_sagprice_with_45%" className="border_b"></td>
                            <td id="all_1.25_sagprice_with_45%" className="border_b"></td>
                            <td id="all_1.5_sagprice_with_45%" className="border_b"></td>
                            <td id="all_1.8_sagprice_with_45%" className="border_b"></td>
                            <td id="all_2_sagprice_with_45%" className="border_b"></td>
                            <td id="all_2.5_sagprice_with_45%" className="border_b"></td>
                            <td id="all_3_sagprice_with_45%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th className="border_b">50%</th>
                            <td id="all_0.6_sagprice_with_50%" className="border_b"></td>
                            <td id="all_0.7_sagprice_with_50%" className="border_b"></td>
                            <td id="all_0.8_sagprice_with_50%" className="border_b"></td>
                            <td id="all_0.9_sagprice_with_50%" className="border_b"></td>
                            <td id="all_1_sagprice_with_50%" className="border_b"></td>
                            <td id="all_1.25_sagprice_with_50%" className="border_b"></td>
                            <td id="all_1.5_sagprice_with_50%" className="border_b"></td>
                            <td id="all_1.8_sagprice_with_50%" className="border_b"></td>
                            <td id="all_2_sagprice_with_50%" className="border_b"></td>
                            <td id="all_2.5_sagprice_with_50%" className="border_b"></td>
                            <td id="all_3_sagprice_with_50%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th className="border_b">55%</th>
                            <td id="all_0.6_sagprice_with_55%" className="border_b"></td>
                            <td id="all_0.7_sagprice_with_55%" className="border_b"></td>
                            <td id="all_0.8_sagprice_with_55%" className="border_b"></td>
                            <td id="all_0.9_sagprice_with_55%" className="border_b"></td>
                            <td id="all_1_sagprice_with_55%" className="border_b"></td>
                            <td id="all_1.25_sagprice_with_55%" className="border_b"></td>
                            <td id="all_1.5_sagprice_with_55%" className="border_b"></td>
                            <td id="all_1.8_sagprice_with_55%" className="border_b"></td>
                            <td id="all_2_sagprice_with_55%" className="border_b"></td>
                            <td id="all_2.5_sagprice_with_55%" className="border_b"></td>
                            <td id="all_3_sagprice_with_55%" className="border_l"></td>
                        </tr>
                        <tr className="active">
                            <th className="border_b">60%</th>
                            <td id="all_0.6_sagprice_with_60%" className="border_b"></td>
                            <td id="all_0.7_sagprice_with_60%" className="border_b"></td>
                            <td id="all_0.8_sagprice_with_60%" className="border_b"></td>
                            <td id="all_0.9_sagprice_with_60%" className="border_b"></td>
                            <td id="all_1_sagprice_with_60%" className="border_b"></td>
                            <td id="all_1.25_sagprice_with_60%" className="border_b"></td>
                            <td id="all_1.5_sagprice_with_60%" className="border_b"></td>
                            <td id="all_1.8_sagprice_with_60%" className="border_b"></td>
                            <td id="all_2_sagprice_with_60%" className="border_b"></td>
                            <td id="all_2.5_sagprice_with_60%" className="border_b"></td>
                            <td id="all_3_sagprice_with_60%" className="radius_b_l"></td>
                        </tr>
                        </tbody>
                </table>
            </div>
        </div>
    );
}
