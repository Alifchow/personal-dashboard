import React, { useState, useEffect } from "react";
import axios from "axios";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Auth from "./Auth";
import TimeDisplay from "./TimeDisplay";
import WeatherDisplay from "./WeatherDisplay";
import Calendar from "./Calendar";
import SpotifyPlayerComponent from "./SpotifyPlayerComponent";
import { loginToSpotify, getCodeFromUrl, exchangeCodeForToken, refreshAccessToken } from "./SpotifyAPI";

const GOOGLE_CLIENT_ID = "1039570474106-dmkij0nlkp9m7f5n20jf34q62l34nr14.apps.googleusercontent.com";

export default function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  );
}

export function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [accessToken, setAccessToken] = useState(() => {
    return localStorage.getItem("accessToken") || null;
  });

  const [spotifyAccessToken, setSpotifyAccessToken] = useState(null);
  const [spotifyRefreshToken, setSpotifyRefreshToken] = useState(null);
  const [spotifyExpiresIn, setSpotifyExpiresIn] = useState(null);

  const [googleEvents, setGoogleEvents] = useState([]);
  const [outlookEvents, setOutlookEvents] = useState([]);
  const [outlookError, setOutlookError] = useState(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date("2025-04-27T00:00:00Z");
    return d;
  });

  // Check for Spotify code in URL search params on mount
  useEffect(() => {
    const code = getCodeFromUrl();
    if (code) {
      // Exchange code for access token
      exchangeCodeForToken(code).then(tokenData => {
        if (tokenData) {
          setSpotifyAccessToken(tokenData.accessToken);
          setSpotifyRefreshToken(tokenData.refreshToken);
          setSpotifyExpiresIn(tokenData.expiresIn);
          // Clear the search params and redirect to root path
          if (window.location.pathname === "/callback") {
            window.history.replaceState({}, document.title, "/");
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      });
    }
  }, []);

  // Refresh Spotify token before it expires
  useEffect(() => {
    if (!spotifyRefreshToken || !spotifyExpiresIn) return;

    const refreshInterval = setTimeout(() => {
      refreshAccessToken(spotifyRefreshToken).then(tokenData => {
        if (tokenData) {
          setSpotifyAccessToken(tokenData.accessToken);
          setSpotifyRefreshToken(tokenData.refreshToken);
          setSpotifyExpiresIn(tokenData.expiresIn);
        } else {
          // If refresh fails, force re-authentication
          setSpotifyAccessToken(null);
          setSpotifyRefreshToken(null);
          setSpotifyExpiresIn(null);
        }
      });
    }, (spotifyExpiresIn - 300) * 1000); // Refresh 5 minutes before expiry

    return () => clearTimeout(refreshInterval);
  }, [spotifyRefreshToken, spotifyExpiresIn]);

  // Fetch Google Calendar events
  useEffect(() => {
    if (accessToken) {
      const fetchEvents = async () => {
        try {
          const start = new Date("2025-04-27T00:00:00Z").toISOString();
          const end = new Date("2025-05-03T23:59:59Z").toISOString();

          const calendarIds = [
            "primary",
            "family05116003889426727376@group.calendar.google.com",
            "qp60mj35k3g66hp4jf92opmivcacde9s@import.calendar.google.com",
          ];

          let allEvents = [];
          for (const calendarId of calendarIds) {
            const response = await axios.get(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
                calendarId
              )}/events`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                params: {
                  timeMin: start,
                  timeMax: end,
                  singleEvents: true,
                  orderBy: "startTime",
                },
              }
            );

            console.log(`Fetched events from calendar ${calendarId}:`, response.data.items);

            const events = (response.data.items || []).map(event => ({
              ...event,
              calendarId: calendarId,
              isAllDay: event.start.date && event.start.date !== event.end.date,
            }));

            allEvents = allEvents.concat(events);
          }

          allEvents.sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
          setGoogleEvents(allEvents);
        } catch (error) {
          console.error("Failed to fetch Google Calendar events:", error.response?.data || error.message);
          if (error.response?.status === 401) {
            setAccessToken(null);
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("accessToken");
          }
        }
      };

      fetchEvents();
    }
  }, [accessToken]);

  console.log("🧠 App state:", { googleEvents, outlookEvents, accessToken, user, spotifyAccessToken, spotifyRefreshToken, spotifyExpiresIn });

  return (
    <div className="w-full min-h-screen font-sans text-white bg-gradient-to-br from-gray-900 to-blue-900 p-4 sm:p-6">
      <div className="flex flex-col md:flex-row gap-6 max-w-screen-2xl mx-auto">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-6 w-full md:w-[250px]">
          {/* User Info Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center text-sm">
            <div>
              Welcome, <span className="text-blue-300 font-medium">{user?.name || "Guest"}</span>
            </div>
            {user?.email && (
              <div className="text-xs text-gray-400 mt-1">
                ({user.email}) ·{" "}
                <button
                  onClick={() => {
                    setUser(null);
                    setAccessToken(null);
                    localStorage.removeItem("user");
                    localStorage.removeItem("accessToken");
                    // Also clear Spotify tokens on logout
                    setSpotifyAccessToken(null);
                    setSpotifyRefreshToken(null);
                    setSpotifyExpiresIn(null);
                  }}
                  className="text-red-300 hover:text-red-400 underline"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Time Display Section */}
          <div className="flex flex-col items-center">
            <TimeDisplay />
          </div>

          {/* Spotify Player Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
            {spotifyAccessToken ? (
              <SpotifyPlayerComponent accessToken={spotifyAccessToken} />
            ) : (
              <button
                onClick={loginToSpotify}
                className="bg-green-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-600 transition"
              >
                Login to Spotify
              </button>
            )}
          </div>

          {/* Weather Display Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
            <WeatherDisplay />
          </div>

          {/* Auth Section (if not logged in) */}
          {!user?.email && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
              <Auth
                setAccessToken={(token) => {
                  setAccessToken(token);
                  localStorage.setItem("accessToken", token);
                }}
                setUser={(userData) => {
                  setUser(userData);
                  localStorage.setItem("user", JSON.stringify(userData));
                }}
              />
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700">
          <div className="text-xs sm:text-sm text-gray-300 mb-3">
            Week Calendar ({weekStart.toLocaleDateString()})
          </div>
          <div className="rounded-md">
            <Calendar
              googleEvents={googleEvents}
              outlookEvents={outlookEvents}
              outlookError={outlookError}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
            />
          </div>
        </div>
      </div>
    </div>
  );
}