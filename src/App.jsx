import React, { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Auth from "./Auth";
import TimeDisplay from "./TimeDisplay";
import WeatherDisplay from "./WeatherDisplay";
import EventManager from "./EventManager";
import Calendar from "./Calendar";

const GOOGLE_CLIENT_ID =
  "1039570474106-dmkij0nlkp9m7f5n20jf34q62l34nr14.apps.googleusercontent.com";

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
  const [googleEvents, setGoogleEvents] = useState([]);
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [outlookError, setOutlookError] = useState(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 font-sans text-white bg-gradient-to-br from-gray-900 to-blue-900">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
        Welcome to the Family Week 💙
      </h1>

      <div className="mb-4">
        <Auth
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          user={user}
          setUser={setUser}
          setGoogleEvents={setGoogleEvents}
        />
      </div>

      <div className="w-full bg-gray-800 rounded-xl shadow-lg p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <TimeDisplay />
        <WeatherDisplay />
      </div>

      <div className="mb-4">
        <EventManager
          accessToken={accessToken}
          googleEvents={googleEvents}
          setGoogleEvents={setGoogleEvents}
          outlookEvents={outlookEvents}
          setOutlookEvents={setOutlookEvents}
          outlookError={outlookError}
          setOutlookError={setOutlookError}
        />
      </div>

      <div>
        <Calendar
          googleEvents={googleEvents}
          outlookEvents={outlookEvents}
          outlookError={outlookError}
          weekStart={weekStart}
          setWeekStart={setWeekStart}
        />
      </div>
    </div>
  );
}
