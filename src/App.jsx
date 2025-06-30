import React, { useState, useEffect } from "react";
import axios from "axios";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Auth from "./Auth";
import LoginPage from "./LoginPage";
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already authenticated
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("accessToken");
    const authenticated = !!(savedUser && savedToken);
    console.log("🔐 Authentication check:", { savedUser: !!savedUser, savedToken: !!savedToken, authenticated });
    return authenticated;
  });

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
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust for Monday start
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  // Handle successful login
  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    setAccessToken(token);
    setIsAuthenticated(true);
    
    // Store in localStorage
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("accessToken", token);
    
    // Clear temporary storage
    localStorage.removeItem("tempUser");
    localStorage.removeItem("tempAccessToken");
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setSpotifyAccessToken(null);
    setSpotifyRefreshToken(null);
    setSpotifyExpiresIn(null);
    setIsAuthenticated(false);
    
    // Clear all localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem('cachedCalendarEvents');
    localStorage.removeItem('lastCalendarFetch');
    localStorage.removeItem("tempUser");
    localStorage.removeItem("tempAccessToken");
  };

  // Check for Spotify code in URL search params on mount
  useEffect(() => {
    const code = getCodeFromUrl();
    if (code) {
      console.log("Spotify callback detected, processing...");
      // Exchange code for access token
      exchangeCodeForToken(code).then(tokenData => {
        if (tokenData) {
          setSpotifyAccessToken(tokenData.accessToken);
          setSpotifyRefreshToken(tokenData.refreshToken);
          setSpotifyExpiresIn(tokenData.expiresIn);
          console.log("Spotify authentication successful");
          // Clear the search params and redirect to root path
          const currentPath = window.location.pathname;
          const newPath = currentPath === "/callback" ? "/" : currentPath;
          window.history.replaceState({}, document.title, newPath);
        } else {
          console.error("Spotify token exchange failed");
        }
      }).catch(error => {
        console.error("Spotify authentication error:", error);
        // Clear URL params on error too
        const currentPath = window.location.pathname;
        const newPath = currentPath === "/callback" ? "/" : currentPath;
        window.history.replaceState({}, document.title, newPath);
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

  // Fetch Google Calendar events with caching
  useEffect(() => {
    console.log("Calendar useEffect triggered, accessToken:", !!accessToken);
    if (accessToken) {
      console.log("Starting calendar fetch process...");
      const fetchAndCacheEvents = async () => {
        try {
          // Check if we have cached data and if it's less than 1 hour old
          const cachedData = localStorage.getItem('cachedCalendarEvents');
          const lastFetchTime = localStorage.getItem('lastCalendarFetch');
          const now = Date.now();
          const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

          if (cachedData && lastFetchTime && (now - parseInt(lastFetchTime)) < oneHour) {
            // Use cached data
            const parsedEvents = JSON.parse(cachedData);
            setGoogleEvents(parsedEvents);
            console.log('Using cached calendar events');
            return;
          }

          // Calculate date range: 1 week past, current week, 3 weeks future (5 weeks total)
          const currentDate = new Date();
          const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust for Monday start
          
          const currentWeekStart = new Date(currentDate);
          currentWeekStart.setDate(currentDate.getDate() - daysFromMonday);
          currentWeekStart.setHours(0, 0, 0, 0);
          
          // Start date: 1 week before current week
          const startDate = new Date(currentWeekStart);
          startDate.setDate(currentWeekStart.getDate() - 7);
          
          // End date: 3 weeks after current week
          const endDate = new Date(currentWeekStart);
          endDate.setDate(currentWeekStart.getDate() + 28); // 4 weeks (current + 3 future)
          endDate.setHours(23, 59, 59, 999);
          
          const start = startDate.toISOString();
          const end = endDate.toISOString();

          console.log("Fetching events for extended range:", { start, end });

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
          
          // Cache the events and timestamp
          localStorage.setItem('cachedCalendarEvents', JSON.stringify(allEvents));
          localStorage.setItem('lastCalendarFetch', now.toString());
          
          setGoogleEvents(allEvents);
          console.log('Calendar events cached successfully');
        } catch (error) {
          console.error("Failed to fetch Google Calendar events:", error.response?.data || error.message);
          if (error.response?.status === 401) {
            setAccessToken(null);
            setUser(null);
            localStorage.removeItem("user");
            localStorage.removeItem("accessToken");
            // Also clear cached calendar data on auth error
            localStorage.removeItem('cachedCalendarEvents');
            localStorage.removeItem('lastCalendarFetch');
          }
        }
      };

      console.log("About to call fetchAndCacheEvents...");
      fetchAndCacheEvents();

      // Set up hourly refresh timer
      const refreshInterval = setInterval(() => {
        console.log('Refreshing calendar cache...');
        fetchAndCacheEvents();
      }, 60 * 60 * 1000); // 1 hour

      return () => clearInterval(refreshInterval);
    }
  }, [accessToken]);

  console.log("🧠 App state:", { googleEvents, outlookEvents, accessToken, user, spotifyAccessToken, spotifyRefreshToken, spotifyExpiresIn });

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (accessToken) {
      // Clear cache to force fresh fetch
      localStorage.removeItem('cachedCalendarEvents');
      localStorage.removeItem('lastCalendarFetch');
      
      // Re-fetch events
      const fetchAndCacheEvents = async () => {
        try {
          // Calculate date range: 1 week past, current week, 3 weeks future (5 weeks total)
          const currentDate = new Date();
          const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Adjust for Monday start
          
          const currentWeekStart = new Date(currentDate);
          currentWeekStart.setDate(currentDate.getDate() - daysFromMonday);
          currentWeekStart.setHours(0, 0, 0, 0);
          
          // Start date: 1 week before current week
          const startDate = new Date(currentWeekStart);
          startDate.setDate(currentWeekStart.getDate() - 7);
          
          // End date: 3 weeks after current week
          const endDate = new Date(currentWeekStart);
          endDate.setDate(currentWeekStart.getDate() + 28); // 4 weeks (current + 3 future)
          endDate.setHours(23, 59, 59, 999);
          
          const start = startDate.toISOString();
          const end = endDate.toISOString();

          console.log("Manual refresh - fetching events for extended range:", { start, end });

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

            console.log(`Manual refresh - fetched events from calendar ${calendarId}:`, response.data.items);

            const events = (response.data.items || []).map(event => ({
              ...event,
              calendarId: calendarId,
              isAllDay: event.start.date && event.start.date !== event.end.date,
            }));

            allEvents = allEvents.concat(events);
          }

          allEvents.sort((a, b) => new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date));
          
          // Cache the events and timestamp
          localStorage.setItem('cachedCalendarEvents', JSON.stringify(allEvents));
          localStorage.setItem('lastCalendarFetch', Date.now().toString());
          
          setGoogleEvents(allEvents);
          console.log('Manual refresh - calendar events cached successfully');
        } catch (error) {
          console.error("Manual refresh failed:", error.response?.data || error.message);
        }
      };

      await fetchAndCacheEvents();
    }
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    console.log("🔐 Showing login page");
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  console.log("🔐 Showing dashboard - user is authenticated");

  // Show dashboard if authenticated
  return (
    <div className="w-full h-screen font-sans text-white bg-gradient-to-br from-gray-900 to-blue-900 p-2 sm:p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 max-w-screen-2xl mx-auto h-full">
        {/* LEFT SIDE */}
        <div className="flex flex-col gap-3 sm:gap-4 w-full md:w-[220px] lg:w-[250px]">
          {/* User Info Section */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center text-sm">
            <div>
              Welcome, <span className="text-blue-300 font-medium">{user?.name || "Guest"}</span>
            </div>
            {user?.email && (
              <div className="text-xs text-gray-400 mt-1">
                ({user.email}) ·{" "}
                <button
                  onClick={handleLogout}
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
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
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
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
            <WeatherDisplay />
          </div>

          {/* Auth Section (if not logged in to Google) */}
          {!accessToken && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 text-center">
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
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 p-3 sm:p-4 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-80 border border-gray-700 overflow-hidden">
          <div className="flex justify-between items-center text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3">
            <div>
              Week Calendar ({weekStart.toLocaleDateString()})
              {localStorage.getItem('cachedCalendarEvents') && (
                <span className="ml-2 text-green-400 text-xs">
                  • Cached
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {localStorage.getItem('lastCalendarFetch') && (
                <span className="text-xs text-gray-500">
                  Updated: {new Date(parseInt(localStorage.getItem('lastCalendarFetch'))).toLocaleTimeString()}
                </span>
              )}
              {user?.email && (
                <button
                  onClick={handleManualRefresh}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition"
                  title="Refresh calendar data"
                >
                  ↻ Refresh
                </button>
              )}
            </div>
          </div>
          <div className="rounded-md h-[calc(100%-3rem)] overflow-auto">
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
}// trigger deploy
