import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

export default function Auth({ setAccessToken, setUser }) {
  const login = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      try {
        const res = await axios.post(
          "https://oauth2.googleapis.com/token",
          new URLSearchParams({
            code: codeResponse.code,
            client_id: "1039570474106-dmkij0nlkp9m7f5n20jf34q62l34nr14.apps.googleusercontent.com",
            client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET || "",
            redirect_uri: "http://localhost:8888",
            grant_type: "authorization_code",
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        const { access_token } = res.data;
        setAccessToken(access_token);
        localStorage.setItem("accessToken", access_token);

        // Fetch user info
        const userInfo = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        setUser(userInfo.data);
        localStorage.setItem("user", JSON.stringify(userInfo.data));
      } catch (error) {
        console.error("Token exchange or user fetch failed:", error.response?.data || error.message);
        if (error.response?.status === 400) {
          console.error("This might be due to missing client secret. Please check your .env file.");
        }
      }
    },
    onError: (err) => console.error("Google Login Failed", err),
  });

  return (
    <div>
      <button
        onClick={() => login()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
      >
        Sign in with Google
      </button>
    </div>
  );
}