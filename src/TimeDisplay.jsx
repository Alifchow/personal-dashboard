import React, { useEffect, useState } from "react";

const ZURICH_TZ = "Europe/Zurich";

export default function TimeDisplay() {
  const [localTime, setLocalTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="time-display-wrapper flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
      <div className="text-center sm:text-left">
        <div className="text-xs text-gray-400">Local Time (Zurich)</div>
        <div className="text-2xl font-bold">
          {localTime.toLocaleTimeString("en-GB", { timeZone: ZURICH_TZ })}
        </div>
      </div>
      <div className="text-center sm:text-left">
        <div className="text-xs text-gray-400">Dhaka Time</div>
        <div className="text-2xl font-bold">
          {localTime.toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka" })}
        </div>
      </div>
    </div>
  );
}