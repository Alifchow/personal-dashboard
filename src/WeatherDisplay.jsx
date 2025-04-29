import React, { useEffect, useState } from "react";
import axios from "axios";
import { WiDayCloudy, WiRain, WiSnow, WiStormShowers } from "react-icons/wi";

export default function WeatherDisplay() {
  const [weather, setWeather] = useState(null);
  const [forecastMessage, setForecastMessage] = useState("");
  const [forecastType, setForecastType] = useState("");

  useEffect(() => {
    async function loadWeather() {
      try {
        const { data } = await axios.get(
          "https://api.openweathermap.org/data/2.5/weather",
          {
            params: {
              q: "Zurich",
              appid: "634f899e64adc7abeaa3ab4ca6075424",
              units: "metric",
            },
          }
        );
        setWeather(data);
        const { coord } = data;
        const { data: fc } = await axios.get(
          "https://api.openweathermap.org/data/2.5/forecast",
          {
            params: {
              lat: coord.lat,
              lon: coord.lon,
              appid: "634f899e64adc7abeaa3ab4ca6075424",
              units: "metric",
            },
          }
        );
        const now = Date.now();
        const slot = fc.list.find((s) => {
          const t = s.dt * 1000;
          const main = s.weather[0].main.toLowerCase();
          return (
            t > now &&
            t <= now + 12 * 3600000 &&
            (main.includes("rain") || main.includes("snow") || main.includes("storm"))
          );
        });
        if (slot) {
          const desc = slot.weather[0].description;
          const ts = new Date(slot.dt * 1000).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setForecastMessage(`Expect ${desc} at ${ts}`);
          const main = slot.weather[0].main.toLowerCase();
          if (main.includes("rain")) setForecastType("rain");
          else if (main.includes("snow")) setForecastType("snow");
          else setForecastType("storm");
        } else {
          setForecastMessage("No rain expected in next 12h");
          setForecastType("");
        }
      } catch (e) {
        console.error("Weather fetch error", e);
      }
    }
    loadWeather();
  }, []);

  return (
    <div className="weather-display-wrapper flex flex-col items-center md:items-start gap-2">
      <div className="flex items-center gap-3">
        {weather ? (
          <>
            <WiDayCloudy size={36} className="animate-pulse text-blue-300" />
            <div>
              <div className="text-xs text-gray-400">Zurich Weather</div>
              <div className="text-xl font-semibold">{weather.main.temp}°C</div>
              <div className="capitalize text-sm text-gray-200">
                {weather.weather[0].description}
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-400">Loading weather…</div>
        )}
      </div>

      {forecastMessage && (
        <div className="bg-blue-700 px-3 py-1 rounded-lg flex items-center gap-2 animate-fade-in">
          {forecastType === "rain" && (
            <WiRain size={20} className="text-white animate-bounce" />
          )}
          {forecastType === "snow" && (
            <WiSnow size={20} className="text-white animate-bounce" />
          )}
          {forecastType === "storm" && (
            <WiStormShowers size={20} className="text-white animate-bounce" />
          )}
          <span className="text-xs font-medium truncate text-white">
            {forecastMessage}
          </span>
        </div>
      )}
    </div>
  );
}