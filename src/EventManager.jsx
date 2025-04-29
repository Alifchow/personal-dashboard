import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment-timezone";

const ZURICH_TZ = "Europe/Zurich";
const DHAKA_TZ = "Asia/Dhaka";

export default function EventManager({
  accessToken,
  googleEvents,
  setGoogleEvents,
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function fetchGoogleEvents(token) {
    setIsLoading(true);
    try {
      // Fetch events for the week of April 27 to May 3, 2025
      const start = new Date("2025-04-27T00:00:00Z").toISOString();
      const end = new Date("2025-05-03T23:59:59Z").toISOString();
      const ids = [
        "primary",
        "family05116003889426727376@group.calendar.google.com",
        "qp60mj35k3g66hp4jf92opmivcacde9s@import.calendar.google.com", // Synced Outlook calendar
      ];
      let evts = [];
      for (const id of ids) {
        const { data } = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            id
          )}/events`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeMin: start,
              timeMax: end,
              singleEvents: true,
              orderBy: "startTime",
            },
          }
        );
        evts = evts.concat(
          data.items.map((e) => {
            const start = moment.tz(
              e.start.dateTime || e.start.date,
              e.start.timeZone || ZURICH_TZ
            );
            const end = moment.tz(
              e.end?.dateTime || e.end?.date || e.start.dateTime,
              e.end?.timeZone || ZURICH_TZ
            );

            // Convert to Dhaka time
            const startDhaka = start.clone().tz(DHAKA_TZ);
            const endDhaka = end.clone().tz(DHAKA_TZ);

            console.log(
              `Google Event (Calendar: ${id}): ${e.summary}, Start (Zurich): ${start.format()}, End (Zurich): ${end.format()}, Start (Dhaka): ${startDhaka.format()}, End (Dhaka): ${endDhaka.format()}`
            );

            return {
              summary: e.summary || "Untitled Event",
              start: start.toDate(),
              end: end.toDate(),
              startDhaka: startDhaka.toDate(),
              endDhaka: endDhaka.toDate(),
              source: id === "primary" ? "Google Calendar" : id === "qp60mj35k3g66hp4jf92opmivcacde9s@import.calendar.google.com" ? "Outlook (via Google)" : "Family Calendar",
            };
          })
        );
      }
      evts.sort((a, b) => a.start - b.start);
      setGoogleEvents(evts);
    } catch (e) {
      console.error("Google events fetch error", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchGoogleEvents(accessToken);
    }
  }, [accessToken]);

  // Render nothing (removed the event list and fetch button)
  return (
    <div className="p-4">
      {/* No content to render */}
    </div>
  );
}