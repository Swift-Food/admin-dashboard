import type { Driver } from "../types/driver.types";
import React from "react";

type DriverPickerProps = {
  drivers: Driver[];
  value?: string;
  onChange: (driverId: string) => void;
  disabled?: boolean;
};

const DriverPicker: React.FC<DriverPickerProps> = ({
  drivers,
  value,
  onChange,
  disabled,
}) => {
  const selectedDriver = drivers.find((d) => d.id === value);

  return (
    <div className="outer-div">
      {selectedDriver ? <div className="selected-driver-display">
          <strong>Selected Driver:</strong>{" "}
          {selectedDriver.user?.username ||
            `Driver ${selectedDriver.id.slice(0, 8)}…`}
          <br />
          <small>ID: {selectedDriver.id}</small>
        </div> : null}

      <label className="driver_picker__label">Driver:</label>
      <select
        className="driver_picker__border"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>
          Select a driver.
        </option>
        {drivers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.user?.username
              ? `${d.user?.username} (${d.id.slice(0, 8)}…)`
              : d.id}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DriverPicker;
