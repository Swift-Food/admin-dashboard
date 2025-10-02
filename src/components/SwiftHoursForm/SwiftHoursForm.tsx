import { useState } from "react";
import {
  startSwiftHour,
  endSwiftHour,
  setHappyHour,
  getHappyHour,
  //   getHappyHourTimeRemaining,
} from "../../services/promotions.service";

import type {
  GetHappyHourResponse,
  SetHappyHourResponse,
  //   HappyHourTimeRemainingResponse,
} from "../../services/promotions.service";
import "./SwiftHoursForm.css";

export function SwiftHoursForm({ restaurantId }: { restaurantId: string }) {
  const [swiftHour, setSwiftHour] = useState({
    isHappyHourActive: false,
    happyHour: {
      discount: 0,
      freeDrink: false,
      durationMinutes: 0,
    },
    startTime: "",
    endTime: "",
  });

  const handleStartSwiftHour = async () => {
    const startResponse: { message: string } = await startSwiftHour(
      restaurantId,
      swiftHour.happyHour.durationMinutes,
      swiftHour.happyHour.discount
    );
    console.log(startResponse.message);
  };

  const handleEndSwiftHour = async () => {
    const endResponse: { message: string } = await endSwiftHour(restaurantId);
    console.log(endResponse.message);
  };

  const handleSetHappyHour = async () => {
    const setResponse: SetHappyHourResponse = await setHappyHour(
      restaurantId,
      swiftHour.happyHour
    );
    console.log(setResponse.message);
  };

  const handleGetHappyHour = async () => {
    const data: GetHappyHourResponse = await getHappyHour(restaurantId);
    setSwiftHour((prev) => ({
      ...prev,
      happyHour: data.happyHour,
      isHappyHourActive: data.isHappyHourActive,
      startTime: data.happyHour.startTime?.toString() || "",
      endTime: data.happyHour.endTime?.toString() || "",
    }));
  };

  //   const handleGetHappyHourTimeRemaining = async () => {
  //     const data: HappyHourTimeRemainingResponse =
  //       await getHappyHourTimeRemaining(restaurantId);
  //     return data;
  //   };

  return (
    <div>
      <form className="swift-hours-form" onSubmit={(e) => e.preventDefault()}>
        {!swiftHour.isHappyHourActive ? (
          <>
            <div className="swift-hours-form-group">
              <label htmlFor="duration" className="swift-hours-form-label">
                Duration (minutes):
              </label>
              <input
                id="duration"
                type="number"
                className="swift-hours-form-input"
                value={swiftHour.happyHour.durationMinutes}
                onChange={(e) =>
                  setSwiftHour((prev) => ({
                    ...prev,
                    happyHour: {
                      ...prev.happyHour,
                      durationMinutes: Number(e.target.value),
                    },
                  }))
                }
                min={1}
              />
            </div>
            <div className="swift-hours-form-group">
              <label htmlFor="discount" className="swift-hours-form-label">
                Discount (%):
              </label>
              <input
                id="discount"
                type="number"
                className="swift-hours-form-input"
                value={swiftHour.happyHour.discount}
                onChange={(e) =>
                  setSwiftHour((prev) => ({
                    ...prev,
                    happyHour: {
                      ...prev.happyHour,
                      discount: Number(e.target.value),
                    },
                  }))
                }
                min={0}
                max={100}
              />
            </div>
            <div className="swift-hours-form-group">
              <label className="swift-hours-form-label">
                <input
                  type="checkbox"
                  className="swift-hours-form-checkbox"
                  checked={swiftHour.happyHour.freeDrink}
                  onChange={(e) =>
                    setSwiftHour((prev) => ({
                      ...prev,
                      happyHour: {
                        ...prev.happyHour,
                        freeDrink: e.target.checked,
                      },
                    }))
                  }
                />
                Free Drink
              </label>
            </div>
            <div className="swift-hours-form-actions">
              <button
                type="button"
                className="btn btn-start"
                onClick={handleStartSwiftHour}
              >
                Start Swift Hour
              </button>
              <button
                type="button"
                className="btn btn-set"
                onClick={handleSetHappyHour}
              >
                Set Happy Hour
              </button>
              <button
                type="button"
                className="btn btn-get"
                onClick={handleGetHappyHour}
              >
                Get Happy Hour
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="swift-hours-status">
              <p>
                Status: <span className="swift-hours-active">Active</span>
              </p>
              <p>Start Time: {swiftHour.startTime}</p>
              <p>End Time: {swiftHour.endTime}</p>
            </div>
            <div className="swift-hours-form-actions">
              <button
                type="button"
                className="btn btn-end"
                onClick={handleEndSwiftHour}
              >
                End Swift Hour
              </button>
              <button
                type="button"
                className="btn btn-get"
                onClick={handleGetHappyHour}
              >
                Refresh Status
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
