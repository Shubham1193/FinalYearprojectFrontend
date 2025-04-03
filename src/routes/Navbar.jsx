import React from 'react';
import Select from 'react-select';

const Navbar = ({
  id,
  userLang,
  setUserLang,
  userTheme,
  setUserTheme,
  fontSize,
  setFontSize,
  submit,
  searchQuestion,
  roomid
}) => {
  const languages = [
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
  ];

  const themes = [
    { value: "vs-dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  return (
    <div className="flex justify-between items-center p-4 h-[10vh] bg-[#1A1A2E] shadow-md">
      {/* Left Section: Language, Theme & Font Size */}
      <div className="flex items-center space-x-4">
        <Select
          value={{ value: userLang, label: userLang }}
          onChange={(option) => setUserLang(option.value)}
          options={languages}
          classNamePrefix="select"
          isSearchable={false}
        />
        <Select
          value={themes.find(theme => theme.value === userTheme)}
          onChange={(option) => setUserTheme(option.value)}
          options={themes}
          classNamePrefix="select"
          isSearchable={false}
        />
        <div className="flex items-center space-x-2">
          <label className="text-white">Font Size</label>
          <input
            type="range"
            min="15"
            max="30"
            value={fontSize}
            step="2"
            onChange={(e) => setFontSize(e.target.value)}
          />
        </div>
      </div>

      {/* Center Section: Run & Search Buttons */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={submit} 
          className="text-white px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          Run
        </button>
        <button 
          onClick={searchQuestion} 
          className="text-white px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          Search Problems
        </button>
      </div>

    
      <div className="flex items-center space-x-4">
        <div className="flex justify-center items-center bg-gray-800 text-white px-4 py-2 rounded-lg">
          <p>Room Id : {roomid}</p>
        </div>
      </div>
    </div>
  );
}

export default Navbar;


// the proxy verision worked why 




// The proxy version worked because it addresses the root causes of the intermittent image loading issue you were experiencing with the Google-hosted profile picture URL (https://lh3.googleusercontent.com/...). Let’s break down why this solution succeeded where the direct URL approach failed.

// Why the Direct URL Failed Intermittently
// CORS Restrictions:
// Google’s servers (e.g., lh3.googleusercontent.com) often enforce strict Cross-Origin Resource Sharing (CORS) policies. When your frontend (e.g., https://myapp.example.com) tries to load the image directly in an <img> tag, the browser sends a request with an Origin header. If Google’s server doesn’t include an Access-Control-Allow-Origin header matching your domain (or *), the browser blocks the request, leading to intermittent failures.
// This behavior can vary based on Google’s server configuration, load balancing, or your browser’s session state (e.g., logged into Google or not).
// Referrer Policy:
// Google may use a Referrer-Policy that restricts image loading when the referrer (your app’s URL) isn’t recognized or authorized. This can cause the image to load when tested in a browser tab (no referrer or a trusted one) but fail when embedded in your app.
// Authentication Requirements:
// The URL might require an active Google session or OAuth token. When you paste it into your browser, your logged-in Google account provides the necessary credentials, but your app’s <img> request doesn’t, resulting in a 403 Forbidden error sporadically.
// Network or Rate Limiting:
// Google could impose rate limits or temporary blocks on repeated requests from an unrecognized source (your app), causing intermittent failures.
// How the Proxy Version Fixes This
// By routing the image request through your backend (e.g., /proxy-image?url=...), you bypass these issues. Here’s why it works:

// Bypasses CORS:
// When your frontend requests /proxy-image from your own backend (e.g., https://myapp.example.com/proxy-image), it’s a same-origin request. Your backend then fetches the image from Google’s server (lh3.googleusercontent.com) using a server-side HTTP client (like Axios), which isn’t subject to browser CORS restrictions.
// Your backend serves the image data directly to the frontend, and since it’s from the same domain, the browser accepts it without CORS issues.
// Hides the Referrer:
// The request to Google comes from your backend server, not the browser. Servers typically don’t send a Referer header (or it’s your backend’s URL), which Google is less likely to block compared to a browser request from an unknown frontend domain.
// No Authentication Dependency:
// Google profile picture URLs are often publicly accessible when fetched directly (e.g., via a server or browser with a session). Your backend can retrieve the image without needing to pass client-side credentials, making it more reliable than the browser’s direct request.
// Control Over Retries and Caching:
// Your backend can implement retries, caching, or error handling (e.g., falling back to a default image) if Google’s server temporarily fails. This ensures consistency, unlike the browser’s single-shot <img> request.
// Simplified Frontend Logic:
// The frontend only needs to request a URL from your own domain (/proxy-image?url=...), which is always available as long as your backend is running. This eliminates the variability of Google’s server responses.
// Technical Breakdown
// Here’s how the proxy flow works:

// Frontend Request:
// The <img> tag requests:
// javascript

// Collapse

// Wrap

// Copy
// src="/proxy-image?url=https%3A%2F%2Flh3.googleusercontent.com%2F..."
// This is a relative URL to your backend (e.g., https://myapp.example.com/proxy-image).
// Backend Proxy Route:
// Your Express server handles the request:
// javascript

// Collapse

// Wrap

// Copy
// app.get('/proxy-image', async (req, res) => {
//   const imageUrl = req.query.url; // Decoded Google URL
//   const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//   res.set('Content-Type', response.headers['content-type']);
//   res.send(response.data);
// });
// Axios fetches the raw image data from Google and sends it back as the response.
// Browser Display:
// The browser receives the image data from your backend and renders it in the <img> tag. Since the request is same-origin, there are no CORS or referrer issues.
// Why It’s Consistent
// Server-to-Server Communication: Your backend’s request to Google is treated as a standard HTTP request, not a browser-initiated cross-origin request, avoiding browser security policies.
// Stable Source: The frontend always gets the image from your backend, which you control, rather than relying on Google’s variable behavior.
// Error Handling: The onError fallback (e.target.src = profile) ensures that even if the proxy fails (e.g., backend down), a default image is shown.
// Additional Benefits
// Scalability: You can extend the proxy to cache images (e.g., in Redis or on disk) to reduce requests to Google.
// Security: You can add validation to ensure only trusted URLs are proxied.
// Flexibility: If Google changes its URL format or policies, you can adapt the backend logic without touching the frontend.
// Why the Direct URL Was Inconsistent
// The direct approach (src={currentUser.profilePicture}) relied on the browser fetching the image from Google, which introduced variability:

// Sometimes it worked if Google allowed the request (e.g., cached response or lenient server).
// Sometimes it failed due to CORS, referrer checks, or missing authentication, depending on timing, network, or Google’s server state.
// The proxy eliminates this dependency by shifting the fetch responsibility to your backend, which has fewer restrictions and more control.

// Conclusion
// The proxy version worked because it sidesteps browser security constraints (CORS, referrer policies) and Google’s intermittent restrictions, providing a stable, controlled way to serve the image. If you ever need to debug further, you can log the proxy requests (console.log('Fetching:', imageUrl)) to ensure it’s always hitting Google successfully. Let me know if you’d like to optimize this further!