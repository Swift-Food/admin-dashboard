import { useState, useEffect } from "react";
import {
  startSwiftHour,
  endSwiftHour,
  //   getHappyHourTimeRemaining,
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
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Format date/time for digital clock display
  const formatDateTime = (iso: string) => {
    if (!iso) return { date: "—", time: "—" };
    const date = new Date(iso);
    const dateStr = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { date: dateStr, time: timeStr };
  };

  // Countdown logic with formatted display
  useEffect(() => {
    if (!swiftHour.isHappyHourActive || !swiftHour.endTime) {
      setTimeRemaining("");
      return;
    }
    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(swiftHour.endTime).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setTimeRemaining(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [swiftHour.isHappyHourActive, swiftHour.endTime]);

  const handleStartSwiftHour = async () => {
    if (
      swiftHour.happyHour.durationMinutes <= 0 ||
      swiftHour.happyHour.discount < 0 ||
      swiftHour.happyHour.discount > 100
    ) {
      alert("Please enter a valid duration and discount.");
      return;
    }
    setIsLoading(true);
    try {
      const startResponse : any = await startSwiftHour(
        restaurantId,
        swiftHour.happyHour.durationMinutes,
        swiftHour.happyHour.discount,
        true, // isHappyHour
        swiftHour.happyHour.freeDrink
      );

      console.log(startResponse.data);
      setSwiftHour((prev) => ({
        ...prev,
        isHappyHourActive: true,
        startTime: startResponse.data.startTime,
        endTime: startResponse.data.endTime,
      }));
    } catch (error : any) {
      console.error("Failed to start Swift Hour:", error);
      alert(error?.response?.data?.message?.join(", ") || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSwiftHour = async () => {
    try {
      const endResponse: { message: string } = await endSwiftHour(restaurantId);
      if (endResponse && endResponse.message) {
        console.log(endResponse.message);
      }
      setSwiftHour((prev) => ({
        ...prev,
        isHappyHourActive: false,
        startTime: "",
        endTime: "",
      }));
      setTimeRemaining("");
    } catch (error) {
      console.error("Failed to end Swift Hour:", error);
    }
  };

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
                disabled={isLoading}
              >
                {isLoading ? "Starting..." : "Start Swift Hour"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="swift-hours-status">
              <p>
                Status: <span className="swift-hours-active">Active</span>
              </p>
              <p>
                <strong>Discount:</strong>{" "}
                <span className="swift-hours-discount">
                  {swiftHour.happyHour.discount}% OFF
                </span>
              </p>
              {swiftHour.happyHour.freeDrink && (
                <p>
                  <strong>Bonus:</strong>{" "}
                  <span className="swift-hours-discount">Free Drink</span>
                </p>
              )}
            </div>

            <div className="swift-hours-timer-group">
              <div className="swift-hours-timer-item">
                <label className="swift-hours-timer-label">Start Time</label>
                <div className="swift-hours-digital-clock">
                  <div className="swift-hours-clock-time">
                    {formatDateTime(swiftHour.startTime).time}
                  </div>
                  <div className="swift-hours-clock-date">
                    {formatDateTime(swiftHour.startTime).date}
                  </div>
                </div>
              </div>

              <div className="swift-hours-timer-item">
                <label className="swift-hours-timer-label">End Time</label>
                <div className="swift-hours-digital-clock">
                  <div className="swift-hours-clock-time">
                    {formatDateTime(swiftHour.endTime).time}
                  </div>
                  <div className="swift-hours-clock-date">
                    {formatDateTime(swiftHour.endTime).date}
                  </div>
                </div>
              </div>

              <div className="swift-hours-timer-item swift-hours-timer-countdown">
                <label className="swift-hours-timer-label">
                  Time Remaining
                </label>
                <div className="swift-hours-digital-clock swift-hours-countdown-clock">
                  <div className="swift-hours-clock-time">
                    {timeRemaining || "00:00:00"}
                  </div>
                </div>
              </div>
            </div>

            <div className="swift-hours-form-actions">
              <button
                type="button"
                className="btn btn-end"
                onClick={handleEndSwiftHour}
              >
                End Swift Hour
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
