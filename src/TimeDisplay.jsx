import React, { useEffect, useState } from "react";

const ZURICH_TZ = "Europe/Zurich";
const DHAKA_TZ = "Asia/Dhaka";

export default function TimeDisplay() {
  const [localTime, setLocalTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="time-display-wrapper flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700">
      {/* Zurich Time */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-300 font-medium">Local Time (Zurich)</div>
          <div className="text-3xl font-mono font-bold text-white animate-pulse-soft">
            {localTime.toLocaleTimeString("en-GB", { timeZone: ZURICH_TZ })}
          </div>
        </div>
      </div>

      {/* Dhaka Time */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-300 font-medium">Dhaka Time</div>
          <div className="text-3xl font-mono font-bold text-white animate-pulse-soft">
            {localTime.toLocaleTimeString("en-GB", { timeZone: DHAKA_TZ })}
          </div>
        </div>
      </div>
    </div>
  );
}