import { useContext } from "react";
import ControlAllInputsContext from "../context/ControlAllInputsContext";
export default function RenderInformationTable({th_table}) {
    const { handleInputChange , control_all_inputs } = useContext(ControlAllInputsContext);
    return (
            <div className="information-inputs">
                <div className='information-table-container'>
                    <table className='information-table'>
                    <thead>
                        <tr>
                            {th_table.map((item, index) => (
                                <th key={index} className={index === 0 ? 'radius_t_r' : index === th_table.length - 1 ? 'radius_t_l' : ''}>{item}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {th_table.map((item, index) => (
                                <td key={index} className={index === 0 ? 'radius_b_r' : index === th_table.length - 1 ? 'radius_b_l' : ''}><input onChange={(e) => handleInputChange(e, item)} value={control_all_inputs[item] || ""} id={item} type="number" className='information-input' /></td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                </div>
            </div>
    );
}
