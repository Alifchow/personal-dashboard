const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || "";
const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || "http://127.0.0.1:8888/callback";
const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming", // Added for Web Playback SDK
];

// Utility to generate a random string for code verifier
function generateRandomString(length) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => ("0" + byte.toString(16)).slice(-2)).join("");
}

// Utility to generate code challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Function to initiate login with PKCE
export const loginToSpotify = async () => {
  if (!CLIENT_ID) {
    console.error("Spotify Client ID is missing. Please set REACT_APP_SPOTIFY_CLIENT_ID in your .env file.");
    return;
  }

  // Generate code verifier and challenge
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const scope = SCOPES.join(" ");
  const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&show_dialog=true&code_challenge_method=S256&code_challenge=${codeChallenge}`;
  console.log("Spotify Auth URL:", authUrl);
  window.location = authUrl;
};

// Function to exchange code for access token
export const exchangeCodeForToken = async (code) => {
  const codeVerifier = localStorage.getItem("spotify_code_verifier");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to exchange code for token");
    }

    console.log("Spotify Token Response:", data);
    localStorage.removeItem("spotify_code_verifier");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return null;
  }
};

// Function to refresh access token
export const refreshAccessToken = async (refreshToken) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to refresh token");
    }

    console.log("Spotify Refresh Token Response:", data);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

// Function to get code from URL search params
export const getCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const error = params.get("error");
  if (error) {
    console.error("Spotify Auth Error:", error);
    return null;
  }
  console.log("Extracted Spotify Code:", code);
  return code;
};