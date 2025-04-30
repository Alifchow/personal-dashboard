import React, { useState, useEffect } from "react";
import SpotifyPlayer from "react-spotify-web-playback";

const SpotifyPlayerComponent = ({ accessToken }) => {
  const [play, setPlay] = useState(false);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [trackInfo, setTrackInfo] = useState({ name: "No Track", artist: "", albumArt: "" });
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    console.log("Spotify Access Token in Player:", accessToken);
    if (accessToken) {
      setPlay(true);
    }
  }, [accessToken]);

  useEffect(() => {
    if (deviceId && accessToken) {
      fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: true,
        }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error("Failed to activate device");
          }
          console.log("Device activated successfully");
        })
        .catch(err => {
          console.error("Error activating device:", err);
          setError(`Error activating device: ${err.message}`);
        });
    }
  }, [deviceId, accessToken]);

  const handlePlayPause = () => {
    setPlay(!play);
  };

  const handleNext = () => {
    fetch("https://api.spotify.com/v1/me/player/next", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to skip to next track");
        }
        console.log("Skipped to next track");
      })
      .catch(err => {
        console.error("Error skipping to next track:", err);
        setError(`Error skipping to next track: ${err.message}`);
      });
  };

  const handlePrevious = () => {
    fetch("https://api.spotify.com/v1/me/player/previous", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to go to previous track");
        }
        console.log("Went to previous track");
      })
      .catch(err => {
        console.error("Error going to previous track:", err);
        setError(`Error going to previous track: ${err.message}`);
      });
  };

  const handleSeek = (e) => {
    const newPosition = Number(e.target.value);
    setPosition(newPosition);
    fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${newPosition}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(err => {
      console.error("Error seeking:", err);
      setError(`Error seeking: ${err.message}`);
    });
  };

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return "0:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!accessToken) {
    return <div>Error: Spotify access token is missing.</div>;
  }

  return (
    <div className="text-white">
      {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

      {/* 1st Row: Center the Track Title */}
      <div className="flex justify-center mb-2">
        <div className="text-center font-medium">
          {trackInfo.name}
        </div>
      </div>

      {/* 2nd Row: Album Art (Left), Centered Control Buttons */}
      <div className="flex items-center mb-2">
        {/* Album Art on the Left */}
        <div className="w-12 h-12 mr-4">
          {trackInfo.albumArt ? (
            <img
              src={trackInfo.albumArt}
              alt="Album Art"
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Art</span>
            </div>
          )}
        </div>

        {/* Centered Control Buttons */}
        <div className="flex-1 flex justify-center space-x-2">
          {/* Back Button (Left Arrow) */}
          <button
            onClick={handlePrevious}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
          >
            {play ? (
              // Pause Icon (Two Vertical Bars)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 9v6m4-6v6"
                />
              </svg>
            ) : (
              // Play Icon (Triangle)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7V5z"
                />
              </svg>
            )}
          </button>

          {/* Next Button (Right Arrow) */}
          <button
            onClick={handleNext}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 3rd Row: Slider */}
      <div className="flex items-center">
        <div className="flex-1 flex items-center">
          <span className="text-xs mr-2">{formatTime(position)}</span>
          <input
            type="range"
            min="0"
            max={duration || 1}
            value={position}
            onChange={handleSeek}
            className="flex-1"
            style={{ accentColor: "#1db954" }}
          />
          <span className="text-xs ml-2">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Hidden Spotify Player for Playback Control */}
      <div className="hidden">
        <SpotifyPlayer
          token={accessToken}
          uris={["spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"]} // "Today's Top Hits"
          play={play}
          autoPlay={true}
          showPlaybackControls={false}
          showTrackInfo={false}
          showSlider={false}
          callback={(state) => {
            console.log("Spotify Player State:", state);
            if (state.deviceId && !deviceId) {
              setDeviceId(state.deviceId);
            }
            if (state.error) {
              setError(`Player Error: ${state.error.message || state.error}`);
            }
            setPlay(state.isPlaying);
            if (state.track) {
              setTrackInfo({
                name: state.track.name || "Unknown Track",
                artist: state.track.artists[0]?.name || "Unknown Artist",
                albumArt: state.track.image || "",
              });
              setPosition(state.progressMs || 0);
              setDuration(state.track.durationMs || 0);
            }
          }}
        />
      </div>
    </div>
  );
};

export default SpotifyPlayerComponent;