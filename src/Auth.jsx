import React from "react";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

export default function Auth({
  accessToken,
  setAccessToken,
  user,
  setUser,
  setGoogleEvents,
}) {
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.readonly profile email",
    onSuccess: async (tok) => {
      setAccessToken(tok.access_token);
      try {
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${tok.access_token}` } }
        );
        setUser(data);
      } catch (e) {
        console.error("User info fetch error", e);
      }
    },
    onError: (err) => console.error("Login error", err),
  });

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setUser(null);
    setGoogleEvents([]);
  };

  return (
    <div className="flex justify-center mb-6">
      {!accessToken ? (
        <button
          onClick={login}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg shadow"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="flex justify-center items-center gap-4 text-sm">
          <span className="text-gray-300">
            Signed in as{" "}
            <strong className="text-white">{user?.email || user?.name}</strong>
          </span>
          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 underline"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}