import React, { Fragment } from "react";
import moment from "moment-timezone";

const ZURICH_TZ = "Europe/Zurich";
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

export default function Calendar({
  googleEvents,
  outlookEvents,
  outlookError,
  weekStart,
  setWeekStart,
}) {
  const addDays = (date, days) => {
    return new Date(date.getTime() + days * 86400000);
  };

  const allEvents = [...googleEvents, ...outlookEvents];

  return (
    <section className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">
          Week Calendar (07–18, Zurich Time)
        </h2>
        <div className="space-x-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
            ◀︎ Prev
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
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
              <div
                key={dayName}
                className={`text-center py-3 font-semibold border-l border-gray-700 text-sm ${
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
            return (
              <Fragment key={hour}>
                <div
                  className={`text-sm text-right px-3 py-3 border-t border-gray-700 ${
                    nowHour ? "bg-blue-950 text-blue-400" : "bg-gray-900 text-gray-400"
                  }`}
                >
                  {hour}:00
                </div>

                {WEEK_DAYS.map((_, dayIdx) => {
                  const day = addDays(weekStart, dayIdx);
                  const cellEvents = allEvents.filter((ev) => {
                    const eventStart = moment.tz(ev.start, ZURICH_TZ);
                    return (
                      eventStart.hour() === hour &&
                      eventStart.toDate().toDateString() === day.toDateString()
                    );
                  });

                  const highlight =
                    nowHour && day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={dayIdx}
                      className={`border-t border-l border-gray-700 px-2 py-2 min-h-[60px] text-sm ${
                        highlight ? "bg-blue-700/50" : "bg-gray-800"
                      }`}
                    >
                      {cellEvents.map((ev, i) => {
                        const eventStart = moment.tz(ev.start, ZURICH_TZ);
                        const eventEnd = moment.tz(ev.end, ZURICH_TZ);

                        console.log(
                          `Rendering Event ${ev.summary}: ${eventStart.format()} to ${eventEnd.format()} (Zurich)`
                        );

                        return (
                          <div
                            key={i}
                            className={`truncate ${
                              ev.source === "Google Calendar"
                                ? "text-green-400"
                                : ev.source === "Family Calendar"
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
