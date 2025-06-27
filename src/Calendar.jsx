import React, { Fragment } from "react";
import moment from "moment-timezone";

const ZURICH_TZ = "Europe/Zurich";
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // Hours 7, 8, ..., 18 (7 AM to 6 PM)
const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function Calendar({
  googleEvents,
  outlookEvents,
  outlookError,
  weekStart,
  setWeekStart,
}) {
  console.log("📆 Calendar rendering with Google events:", googleEvents);
  const addDays = (date, days) => {
    return new Date(date.getTime() + days * 86400000);
  };

  const allEvents = [...googleEvents, ...outlookEvents];

  // Separate all-day events from time-specific events
  const getAllDayEvents = (day) => {
    return allEvents.filter((ev) => {
      const eventStart = moment.tz(ev.start.dateTime || ev.start.date, ZURICH_TZ);
      const isSameDay = eventStart.toDate().toDateString() === day.toDateString();
      const isAllDay = !ev.start.dateTime;
      return isSameDay && isAllDay;
    });
  };

  return (
    <section className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">
          Week Calendar (07:00–18:00, Zurich Time)
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
          >
            ◀︎ Prev
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
          >
            Next ▶︎
          </button>
        </div>
      </div>

      {outlookError && (
        <div className="bg-red-800 text-white p-2 rounded text-xs mb-2 text-center">
          {outlookError}
        </div>
      )}

      {/* All-Day Events Section */}
      <div className="mb-2">
        <div className="grid grid-cols-[50px_repeat(7,minmax(0,1fr))] border border-gray-700">
          <div className="bg-gray-800 text-xs text-center py-2 font-semibold border-r border-gray-700">
            All Day
          </div>
          {WEEK_DAYS.map((dayName, idx) => {
            const day = addDays(weekStart, idx);
            const isToday = day.toDateString() === new Date().toDateString();
            const dayEvents = getAllDayEvents(day);
            
            return (
              <div
                key={dayName}
                className={`border-r border-gray-700 px-1 py-2 text-xs min-h-[40px] ${
                  isToday ? "bg-blue-800/50" : "bg-gray-800"
                }`}
              >
                {dayEvents.map((ev, i) => (
                  <div
                    key={i}
                    className={`truncate mb-1 ${
                      ev.calendarId === "primary"
                        ? "text-green-400"
                        : ev.calendarId === "family05116003889426727376@group.calendar.google.com"
                        ? "text-blue-400"
                        : "text-purple-400"
                    }`}
                  >
                    {"\u2022"} {ev.summary}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Time Grid Section */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[50px_repeat(7,minmax(0,1fr))] border border-gray-700">
          <div className="bg-gray-900"></div>
          {WEEK_DAYS.map((dayName, idx) => {
            const day = addDays(weekStart, idx);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={dayName}
                className={`text-center py-2 font-semibold border-l border-gray-700 text-xs ${
                  isToday ? "bg-blue-800 text-white" : "bg-gray-800 text-gray-200"
                }`}
              >
                {dayName}
                <br />
                {day.toLocaleDateString("en-GB")}
              </div>
            );
          })}
          {HOURS.map((hour) => {
            const nowHour = new Date().getHours() === hour;
            const displayHour = hour < 10 ? `0${hour}` : hour;
            
            return (
              <Fragment key={hour}>
                <div
                  className={`text-xs text-right px-2 py-1 border-t border-gray-700 ${
                    nowHour ? "bg-blue-950 text-blue-400" : "bg-gray-900 text-gray-400"
                  }`}
                >
                  {displayHour}:00
                </div>

                {WEEK_DAYS.map((_, dayIdx) => {
                  const day = addDays(weekStart, dayIdx);
                  const cellEvents = allEvents.filter((ev) => {
                    const eventStart = moment.tz(ev.start.dateTime || ev.start.date, ZURICH_TZ);
                    const isSameDay = eventStart.toDate().toDateString() === day.toDateString();
                    const isSameHour = ev.start.dateTime && eventStart.hour() === hour;
                    const isAllDay = !ev.start.dateTime;
                    // Only show time-specific events in the grid, not all-day events
                    return isSameDay && isSameHour && !isAllDay;
                  });

                  const highlight =
                    nowHour && day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={dayIdx}
                      className={`border-t border-l border-gray-700 px-1 py-1 text-xs min-h-[30px] ${
                        highlight ? "bg-blue-700/50" : "bg-gray-800"
                      }`}
                    >
                      {cellEvents.map((ev, i) => {
                        const eventStart = moment.tz(ev.start.dateTime || ev.start.date, ZURICH_TZ);
                        const eventEnd = moment.tz(ev.end?.dateTime || ev.end?.date, ZURICH_TZ);

                        return (
                          <div
                            key={i}
                            className={`truncate ${
                              ev.calendarId === "primary"
                                ? "text-green-400"
                                : ev.calendarId === "family05116003889426727376@group.calendar.google.com"
                                ? "text-blue-400"
                                : "text-purple-400"
                            }`}
                          >
                            {"\u2022"} {ev.summary}
                            <br />
                            <span className="text-xs text-gray-300">
                              {eventStart.format("HH:mm")}-{eventEnd.format("HH:mm")}
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
  );
}
