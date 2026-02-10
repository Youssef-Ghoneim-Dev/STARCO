import { useState , useEffect } from "react";
import price from "../pricing/price";
import { useContext } from "react";
import { AppContext } from '../context/AppContext';
export default function RenderWeightTable() {
    const { controlAllInputs,piece ,th_table } = useContext(AppContext);
    let [weight, setweight] = useState(false);
    function handleWeightChange(e) {
        setweight(e.target.checked);
    }
     useEffect(() => {
        if (weight) {
            setTimeout(() => {
                price({ controlAllInputs, piece ,th_table});
            }, 0);
        }
    }, [weight, controlAllInputs, piece ,th_table]);
    function renderWeightTable() {
            return (
                <table className='weight-table'>
                    <thead>
                        <tr>
                            <th className='radius_t_r'>0.6</th>
                            <th>0.7</th>
                            <th>0.8</th>
                            <th>0.9</th>
                            <th>1</th>
                            <th>1.25</th>
                            <th>1.5</th>
                            <th>1.8</th>
                            <th>2</th>
                            <th>2.5</th>
                            <th className='radius_t_l'>3</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td id="all_0.6_sagprice_without" className='c_r'></td>
                            <td id="all_0.7_sagprice_without"></td>
                            <td id="all_0.8_sagprice_without"></td>
                            <td id="all_0.9_sagprice_without"></td>
                            <td id="all_1_sagprice_without"></td>
                            <td id="all_1.25_sagprice_without"></td>
                            <td id="all_1.5_sagprice_without"></td>
                            <td id="all_1.8_sagprice_without"></td>
                            <td id="all_2_sagprice_without"></td>
                            <td id="all_2.5_sagprice_without"></td>
                            <td id="all_3_sagprice_without" className='c_l'></td>
                        </tr>
                        <tr>
                            <td id="all_0.6_wheight" className='radius_b_r'></td>
                            <td id="all_0.7_wheight"></td>
                            <td id="all_0.8_wheight"></td>
                            <td id="all_0.9_wheight"></td>
                            <td id="all_1_wheight"></td>
                            <td id="all_1.25_wheight"></td>
                            <td id="all_1.5_wheight"></td>
                            <td id="all_1.8_wheight"></td>
                            <td id="all_2_wheight"></td>
                            <td id="all_2.5_wheight"></td>
                            <td id="all_3_wheight" className='radius_b_l'></td>
                        </tr>
                    </tbody>
                </table>
            );
    }
    return (
            <div className="weight-inputs">
                <div className='weight-checkbox'>
                    <label className='weight-checkbox-label'>
                        <input id='weight_show' type="checkbox" className='weight-checkbox-input' value={weight} onChange={handleWeightChange}/> 
                        <span className='checkmark'></span>
                        إظهار الوزن
                    </label>
                    <div className='weight-table-container'>
                        {weight && renderWeightTable()}
                    </div>
                </div>
            </div>
    );
}
