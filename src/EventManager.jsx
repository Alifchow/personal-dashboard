async function fetchGoogleEvents(token) {
  setIsLoading(true);
  try {
    const startDate = new Date(weekStart);
    startDate.setDate(startDate.getDate() - 7); // week before
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 6); // week after

    const start = startDate.toISOString();
    const end = endDate.toISOString();

    console.log(`Fetching events for the week: ${start} to ${end}`); // Log the date range

    const ids = [
      "primary", 
      "family05116003889426727376@group.calendar.google.com", 
      "qp60mj35k3g66hp4jf92opmivcacde9s@import.calendar.google.com", 
    ];

    let evts = [];
    
    for (const id of ids) {
      console.log(`Fetching events from calendar ID: ${id}`); 
      
      try {
        const { data } = await axios.get(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events`,
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

        if (data.items && data.items.length > 0) {
          console.log(`Fetched ${data.items.length} events from calendar ID: ${id}`); 

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

              const startDhaka = start.clone().tz(DHAKA_TZ);
              const endDhaka = end.clone().tz(DHAKA_TZ);

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
        } else {
          console.log(`No events found in calendar ID: ${id}`);
        }
      } catch (error) {
        console.error(`Error fetching events for calendar ID: ${id}`, error);
      }
    }

    evts.sort((a, b) => a.start - b.start);
    setGoogleEvents(evts); // Set events to state
  } catch (e) {
    console.error("Google events fetch error", e);
  } finally {
    setIsLoading(false);
  }
}