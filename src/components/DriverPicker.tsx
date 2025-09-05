import type { Driver } from "../types/driver.types";
import React from "react";

type DriverPickerProps = {
    drivers: Driver[];
    value?: string;
    onChange: (driverId: string) => void;
    disabled?: boolean;
}

const DriverPicker: React.FC<DriverPickerProps> = ({drivers, value, onChange, disabled}) => {
    return (
        <div className = "outer-div">
            <label className = "driver_picker__label">Driver:</label>
            <select className = "driver_picker__border"
                value={value ?? ""}
                onChange = {(e) => onChange(e.target.value)}
                disabled = {disabled}
            >
            <option value = "" disabled>
                Select a driver.
            </option>    
            {drivers.map(d => (
                <option key={d.id} value={d.id}>
                {d.user?.username ? `${d.user?.id} (${d.id.slice(0,8)}…)` : d.id}
                </option>
            ))}
            </select>

        </div>
    )
}

export default DriverPicker;