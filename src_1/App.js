import React, { useEffect, useState, Fragment } from "react";
import axios from "axios";
import {
  GoogleOAuthProvider,
  googleLogout,
  useGoogleLogin,
} from "@react-oauth/google";
import ical from "ical.js";
import moment from 'moment-timezone';
import {
  WiDayCloudy,
  WiRain,
  WiSnow,
  WiStormShowers,
} from "react-icons/wi";

const GOOGLE_CLIENT_ID =
  "1039570474106-dmkij0nlkp9m7f5n20jf34q62l34nr14.apps.googleusercontent.com";
const ZURICH_TZ = "Europe/Zurich";
// Show hours from 07:00 to 18:00 (7 to 18 inclusive)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // Hours 7, 8, ..., 18
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
  const [outlookError, setOutlookError] = useState(null);

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
          data.items.map((e) => {
            const start = moment.tz(e.start.dateTime || e.start.date, e.start.timeZone || ZURICH_TZ);
            const end = moment.tz(e.end?.dateTime || e.end?.date || e.start.dateTime, e.end?.timeZone || ZURICH_TZ);
            console.log(`Google Event: ${e.summary}, Start: ${start.format()}, End: ${end.format()}`);
            return {
              summary: e.summary,
              start: start.toDate(),
              end: end.toDate(),
              source: "Google",
            };
          })
        );
      }
      evts.sort((a, b) => a.start - b.start);
      setGoogleEvents(evts);
    } catch (e) {
      console.error("Google events fetch error", e);
    }
  }

  async function parseICSEvents(data) {
    try {
      const comp = new ical.Component(ical.parse(data));
      const events = comp.getAllSubcomponents("vevent").map((v, index) => {
        const ev = new ical.Event(v);
        const startDate = ev.startDate;
        const endDate = ev.endDate;

        // Get raw DTSTART and DTEND properties
        const dtstartProp = v.getFirstProperty('dtstart');
        const dtendProp = v.getFirstProperty('dtend');
        let tzid = dtstartProp?.getParameter('tzid') || (startDate.isUTC ? 'UTC' : null);

        // Map non-IANA TZID to IANA equivalent
        const tzidMap = {
          'Bangladesh Standard Time': 'Asia/Dhaka',
        };
        const mappedTzid = tzidMap[tzid] || tzid;

        // Extract raw date strings (e.g., "20250428T173000")
        const startRaw = startDate.toString(); // YYYYMMDDTHHMMSS
        const endRaw = endDate.toString();

        // Parse raw date strings into moment objects
        const startMomentRaw = moment(startRaw, 'YYYYMMDDTHHmmss');
        const endMomentRaw = moment(endRaw, 'YYYYMMDDTHHmmss');

        // Log raw ICS data
        console.log(`Outlook Event ${index}: ${ev.summary}, Raw DTSTART: ${dtstartProp?.toICALString()}, Raw DTEND: ${dtendProp?.toICALString()}, TZID: ${tzid || 'None'}, Mapped TZID: ${mappedTzid || 'None'}`);

        let startMoment, endMoment;
        if (mappedTzid && moment.tz.zone(mappedTzid)) {
          // Valid IANA TZID (e.g., Asia/Dhaka), parse in source time zone and convert to Zurich
          startMoment = moment.tz(startRaw, 'YYYYMMDDTHHmmss', mappedTzid).tz(ZURICH_TZ);
          endMoment = moment.tz(endRaw, 'YYYYMMDDTHHmmss', mappedTzid).tz(ZURICH_TZ);
          console.log(`Parsed with TZID ${mappedTzid}: Start: ${startMomentRaw.format()} in ${mappedTzid}, Converted to ${ZURICH_TZ}: ${startMoment.format()}`);
          console.log(`Parsed with TZID ${mappedTzid}: End: ${endMomentRaw.format()} in ${mappedTzid}, Converted to ${ZURICH_TZ}: ${endMoment.format()}`);
        } else if (startDate.isUTC) {
          // UTC time (Z suffix), treat as UTC
          startMoment = moment.utc(startRaw, 'YYYYMMDDTHHmmss').tz(ZURICH_TZ);
          endMoment = moment.utc(endRaw, 'YYYYMMDDTHHmmss').tz(ZURICH_TZ);
          console.log(`Parsed as UTC: Start: ${startMomentRaw.format()} in UTC, Converted to ${ZURICH_TZ}: ${startMoment.format()}`);
          console.log(`Parsed as UTC: End: ${endMomentRaw.format()} in UTC, Converted to ${ZURICH_TZ}: ${endMoment.format()}`);
        } else {
          // No TZID or invalid, assume Asia/Dhaka (since events are from Bangladesh)
          startMoment = moment.tz(startRaw, 'YYYYMMDDTHHmmss', 'Asia/Dhaka').tz(ZURICH_TZ);
          endMoment = moment.tz(endRaw, 'YYYYMMDDTHHmmss', 'Asia/Dhaka').tz(ZURICH_TZ);
          console.log(`Parsed with fallback Asia/Dhaka: Start: ${startMomentRaw.format()} in Asia/Dhaka, Converted to ${ZURICH_TZ}: ${startMoment.format()}`);
          console.log(`Parsed with fallback Asia/Dhaka: End: ${endMomentRaw.format()} in Asia/Dhaka, Converted to ${ZURICH_TZ}: ${endMoment.format()}`);
        }

        return {
          summary: ev.summary || 'No Title',
          start: startMoment.toDate(),
          end: endMoment.toDate(),
          source: "Outlook",
        };
      });
      console.log('Parsed Outlook events:', events.length);
      return events;
    } catch (e) {
      console.error('ICS parsing error:', e);
      throw new Error('Failed to parse ICS file.');
    }
  }

  useEffect(() => {
    async function fetchOutlookWithRetry(attempts = 3) {
      const urls = [
        "https://cors-anywhere.herokuapp.com/https://outlook.office365.com/owa/calendar/f134bf87313446008f80c2ed0f8ccdf4@selisegroup.com/b941e567ed50404a80632b6e6a5711ce16597366540435049623/calendar.ics",
        "https://api.allorigins.win/raw?url=https://outlook.office365.com/owa/calendar/f134bf87313446008f80c2ed0f8ccdf4@selisegroup.com/b941e567ed50404a80632b6e6a5711ce16597366540435049623/calendar.ics",
      ];

      for (let url of urls) {
        for (let i = 1; i <= attempts; i++) {
          const delay = Math.pow(2, i) * 1000;
          try {
            console.log(`Fetching Outlook ICS from ${url} (Attempt ${i}/${attempts})...`);
            const response = await axios.get(url, {
              timeout: 15000,
              headers: url.includes('cors-anywhere') ? { 'X-Requested-With': 'XMLHttpRequest' } : {},
            });
            const data = response.data;
            console.log('ICS data received:', data.substring(0, 200));

            if (!data.trim().startsWith('BEGIN:VCALENDAR')) {
              throw new Error('Response is not a valid ICS file. Received HTML or other content.');
            }

            const events = await parseICSEvents(data);
            setOutlookEvents(events);
            setOutlookError(null);
            return;
          } catch (e) {
            console.error(`Outlook ICS fetch error from ${url} (Attempt ${i}/${attempts}):`, {
              message: e.message,
              status: e.response?.status,
              data: e.response?.data?.substring?.(0, 200) || e.response?.data,
              code: e.code,
              headers: e.response?.headers,
              stack: e.stack,
            });
            if (i < attempts) {
              console.log(`Retrying ${url} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else if (url === urls[urls.length - 1]) {
              const errorMessage = e.message.includes('not a valid ICS file')
                ? 'Invalid calendar data received from Outlook. Please check the ICS URL.'
                : e.response?.status === 429
                ? 'Too many requests to Outlook server. Please try again later.'
                : e.response?.status === 408
                ? 'Request to Outlook server timed out. Please try again later.'
                : 'Failed to load Outlook events. Check the ICS URL or try again later.';
              setOutlookError(errorMessage);
            }
          }
        }
      }
    }
    fetchOutlookWithRetry();
    const id = setInterval(() => fetchOutlookWithRetry(), 300000);
    return () => clearInterval(id);
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const text = await file.text();
        const events = await parseICSEvents(text);
        setOutlookEvents(events);
        setOutlookError(null);
      } catch (e) {
        setOutlookError('Failed to parse uploaded ICS file.');
      }
    }
  };

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

      <div className="flex justify-center mb-6">
        <label className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg shadow cursor-pointer">
          Upload ICS File
          <input
            type="file"
            accept=".ics"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <section className="p-4 md:p-6 bg-gray-800 rounded-xl shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6">
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
          <div className="text-center sm:text-left">
            <div className="text-xs text-gray-400">Local Time (Zurich)</div>
            <div className="text-2xl font-bold">{localTime.toLocaleTimeString('en-GB', { timeZone: ZURICH_TZ })}</div>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-xs text-gray-400">Dhaka Time</div>
            <div className="text-2xl font-bold">{localTime.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' })}</div>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Week Calendar (07–18, Zurich Time)</h2>
          <div className="space-x-2">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
              ◀︎ Prev
            </button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
              Next ▶︎
            </button>
          </div>
        </div>
        {outlookError && (
          <div className="bg-red-800 text-white p-4 rounded-lg mb-4 text-center">
            {outlookError}
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border border-gray-700 min-w-[800px]">
            <div className="bg-gray-900"></div>
            {WEEK_DAYS.map((dayName, idx) => {
              const day = addDays(weekStart, idx);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={dayName} className={`text-center py-3 font-semibold border-l border-gray-700 text-sm ${isToday ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-200'}`}>
                  {dayName}<br />{day.toLocaleDateString('en-GB')}
                </div>
              );
            })}
            {HOURS.map((hour) => {
              const nowHour = new Date().getHours() === hour;
              return (
                <Fragment key={hour}>
                  <div className={`text-sm text-right px-3 py-3 border-t border-gray-700 ${nowHour ? 'bg-blue-950 text-blue-400' : 'bg-gray-900 text-gray-400'}`}>{hour}:00</div>
                  {WEEK_DAYS.map((_, dayIdx) => {
                    const day = addDays(weekStart, dayIdx);
                    const cellEvents = allEvents.filter(
                      (ev) => {
                        const eventStart = moment.tz(ev.start, ZURICH_TZ);
                        return eventStart.hour() === hour && eventStart.toDate().toDateString() === day.toDateString();
                      }
                    );
                    const highlight = nowHour && day.toDateString() === new Date().toDateString();
                    return (
                      <div key={dayIdx} className={`border-t border-l border-gray-700 px-2 py-2 min-h-[60px] text-sm ${highlight ? 'bg-blue-700/50' : 'bg-gray-800'}`}>
                        {cellEvents.map((ev, i) => {
                          const eventStart = moment.tz(ev.start, ZURICH_TZ);
                          const eventEnd = moment.tz(ev.end, ZURICH_TZ);
                          console.log(`Rendering Event ${ev.summary}: ${eventStart.format()} to ${eventEnd.format()} (Zurich)`);
                          return (
                            <div key={i} className={`truncate ${ev.source === 'Google' ? 'text-blue-400' : 'text-green-400'}`}>
                              {'\u2022'} {ev.summary}<br />
                              <span className="text-xs text-gray-300">
                                {eventStart.format('HH:mm')}-{eventEnd.format('HH:mm')}
                              </span>
                            </div>
                          );
                        })}
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