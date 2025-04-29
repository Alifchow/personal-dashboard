#!/bin/bash

# URL of the Outlook ICS file
ICS_URL="https://outlook.office365.com/owa/calendar/f134bf87313446008f80c2ed0f8ccdf4@selisegroup.com/b941e567ed50404a80632b6e6a5711ce16597366540435049623/calendar.ics"

# Path to save the ICS file
OUTPUT_PATH="/Users/alifchowdhury/Desktop/Perosnla dashboard/personal-dashboard/public/calendar.ics"

# Download the ICS file and save it
curl -o "$OUTPUT_PATH" "$ICS_URL"

# Check if the download was successful
if [ $? -eq 0 ]; then
    echo "$(date): Successfully downloaded ICS file to $OUTPUT_PATH" >> /Users/alifchowdhury/Desktop/Perosnla\ dashboard/personal-dashboard/fetch_ics.log
else
    echo "$(date): Failed to download ICS file" >> /Users/alifchowdhury/Desktop/Perosnla\ dashboard/personal-dashboard/fetch_ics.log
fi

