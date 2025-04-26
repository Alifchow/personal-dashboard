// src/App.jsx
import React, { useEffect, useState, Fragment } from "react";
import axios from "axios";
import {
  GoogleOAuthProvider,
  googleLogout,
  useGoogleLogin,
} from "@react-oauth/google";
import ical from "ical.js";
import {
  WiDayCloudy,
  WiRain,
  WiSnow,
  WiStormShowers,
} from "react-icons/wi";

const GOOGLE_CLIENT_ID =
  "1039570474106-dmkij0nlkp9m7f5n20jf34q62l34nr14.apps.googleusercontent.com";
const ZURICH_TZ = "Europe/Zurich";
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7);
const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

export default function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  );
}

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecastMessage, setForecastMessage] = useState("");
  const [forecastType, setForecastType] = useState("");
  const [localTime, setLocalTime] = useState(new Date());
  const [dhakaTime, setDhakaTime] = useState(
    new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }))
  );
  const [googleEvents, setGoogleEvents] = useState([]);
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTime(new Date());
      setDhakaTime(
        new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.readonly profile email",
    onSuccess: async (tok) => {
      setAccessToken(tok.access_token);
      try {
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tok.access_token}` } }
        );
        setUser(data);
      } catch {}
      fetchGoogleEvents(tok.access_token);
    },
    onError: (err) => console.error("Login error", err),
  });

  async function fetchGoogleEvents(token) {
    try {
      const now = new Date().toISOString();
      const end = addDays(new Date(), 30).toISOString();
      const ids = ["primary", "family05116003889426727376@group.calendar.google.com"];
      let evts = [];
      for (const id of ids) {
        const { data } = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeMin: now,
              timeMax: end,
              singleEvents: true,
              orderBy: "startTime",
            },
          }
        );
        evts = evts.concat(
          data.items.map((e) => ({
            summary: e.summary,
            start: new Date(
              new Date(e.start.dateTime || e.start.date).toLocaleString("en-US", {
                timeZone: ZURICH_TZ,
              })
            ),
            end: new Date(
              new Date(e.end?.dateTime || e.end?.date || e.start.dateTime).toLocaleString("en-US", {
                timeZone: ZURICH_TZ,
              })
            ),
            source: "Google",
          }))
        );
      }
      evts.sort((a, b) => a.start - b.start);
      setGoogleEvents(evts);
    } catch (e) {
      console.error("Google events fetch error", e);
    }
  }

  useEffect(() => {
    async function fetchOutlook() {
      try {
        const { data } = await axios.get(
          "https://cors-anywhere.herokuapp.com/https://outlook.office365.com/owa/calendar/f134bf87313446008f80c2ed0f8ccdf4@selisegroup.com/b941e567ed50404a80632b6e6a5711ce16597366540435049623/calendar.ics"
        );
        const comp = new ical.Component(ical.parse(data));
        const events = comp.getAllSubcomponents("vevent").map((v) => {
          const ev = new ical.Event(v);
          // Convert any BST/Zulu timestamps to CET (Zurich)
          const startUtc = ev.startDate.toJSDate();
          const endUtc = ev.endDate.toJSDate();
          const startCet = new Date(
            startUtc.toLocaleString('en-US', { timeZone: ZURICH_TZ })
          );
          const endCet = new Date(
            endUtc.toLocaleString('en-US', { timeZone: ZURICH_TZ })
          );
          return {
            summary: ev.summary,
            start: startCet,
            end: endCet,
            source: "Outlook",
          };
        });
        setOutlookEvents(events);
      } catch (e) {
        console.error("Outlook ICS fetch error", e);
      }
    }
    fetchOutlook();
    const id = setInterval(fetchOutlook, 300000);
    return () => clearInterval(id);
  }, []);

  const allEvents = [...googleEvents, ...outlookEvents];
  const isAuthed = Boolean(accessToken);

  return (
    <div className="p-4 sm:p-6 font-sans text-white bg-gradient-to-br from-gray-900 to-blue-900 min-h-screen">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6">
        Welcome to the Family Week 💙
      </h1>

      {!isAuthed ? (
        <div className="flex justify-center mb-6">
          <button
            onClick={login}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg shadow"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="flex justify-center items-center gap-4 mb-6 text-sm">
          <span className="text-gray-300">
            Signed in as{' '}
            <strong className="text-white">{user?.email || user?.name}</strong>
          </span>
          <button
            onClick={() => {
              googleLogout();
              setAccessToken(null);
              setUser(null);
              setGoogleEvents([]);
            }}
            className="text-red-400 hover:text-red-300 underline"
          >
            Logout
          </button>
        </div>
      )}

      <section className="p-4 md:p-6 bg-gray-800 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6">
  {/* Combined Time + Weather + Forecast */}
  <div className="flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
    <div className="text-center sm:text-left">
      <div className="text-xs text-gray-400">Local Time</div>
      <div className="text-2xl font-bold">{localTime.toLocaleTimeString()}</div>
    </div>
    <div className="text-center sm:text-left">
      <div className="text-xs text-gray-400">Dhaka Time</div>
      <div className="text-2xl font-bold">{dhakaTime.toLocaleTimeString()}</div>
    </div>
  </div>

  <div className="flex-1 flex items-center justify-center">
    {weather ? (
      <div className="flex items-center gap-3">
        <WiDayCloudy size={48} className="animate-pulse text-blue-300" />
        <div>
          <div className="text-xs text-gray-400">Zurich Weather</div>
          <div className="text-xl font-semibold">
            {weather.main.temp}°C
          </div>
          <div className="capitalize text-sm text-gray-200">
            {weather.weather[0].description}
          </div>
        </div>
      </div>
    ) : (
      <div className="text-gray-400">Loading weather…</div>
    )}
  </div>

  {forecastMessage && (
    <div className="flex-1">
      <div className="bg-blue-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 animate-fade-in">
        {forecastType === 'rain' && <WiRain size={24} className="text-white animate-bounce" />}
        {forecastType === 'snow' && <WiSnow size={24} className="text-white animate-bounce" />}
        {forecastType === 'storm' && <WiStormShowers size={24} className="text-white animate-bounce" />}
        <span className="text-sm font-medium truncate text-white">
          {forecastMessage}
        </span>
      </div>
    </div>
  )}
</section>

      <section className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Week Calendar (07–22)</h2>
          <div className="space-x-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
              ◀︎ Prev
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
              Next ▶︎
            </button>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-scroll max-h-[600px]">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border border-gray-700">
            <div className="bg-gray-900"></div>
            {WEEK_DAYS.map((dayName, idx) => {
              const day = addDays(weekStart, idx);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={dayName} className={`text-center py-2 font-semibold border-l border-gray-700 ${isToday ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-200'}`}>
                  {dayName}<br />{day.toLocaleDateString('en-GB')}
                </div>
              );
            })}
            {HOURS.map((hour) => {
              const nowHour = new Date().getHours() === hour;
              return (
                <Fragment key={hour}>
                  <div className={`text-xs text-right px-2 py-1 border-t border-gray-700 ${nowHour ? 'bg-blue-950 text-blue-400' : 'bg-gray-900 text-gray-400'}`}>{hour}:00</div>
                  {WEEK_DAYS.map((_, dayIdx) => {
                    const day = addDays(weekStart, dayIdx);
                    const cellEvents = allEvents.filter(
                      (ev) => ev.start.getHours() === hour && ev.start.toDateString() === day.toDateString()
                    );
                    const highlight = nowHour && day.toDateString() === new Date().toDateString();
                    return (
                      <div key={dayIdx} className={`border-t border-l border-gray-700 px-2 py-1 min-h-[40px] text-sm ${highlight ? 'bg-blue-700/50' : 'bg-gray-800'}`}>
                        {cellEvents.map((ev, i) => (
                          <div key={i} className={`truncate ${ev.source === 'Google' ? 'text-blue-400' : 'text-green-400'}`}>
                            {'\u2022'} {ev.summary}<br />
                            <span className="text-xs text-gray-300">
                              {ev.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}- {ev.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
