import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

export default function Hints({ description, code }) {
  const [hints, setHints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState(localStorage.getItem("GEMINI_API_KEY") || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("GEMINI_API_KEY");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleKeyChange = (e) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem("GEMINI_API_KEY", newKey);
  };

  const fetchHints = async () => {
    console.log(description)
    console.log(code)
    if (!apiKey) {
      setError("Please enter an API key");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const prompt = `You are an AI assistant helping students solve DSA questions. Based on the following description and code, give 3 concise helpful hints (not answers):

Question:
${description}

Current Code:
${code}

Hints (as a list):`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No hints generated";

      const parsedHints = text
        .split("\n")
        .filter((line) => line.trim() && line.match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, "").trim())
        .slice(0, 3);

      setHints(parsedHints.length > 0 ? parsedHints : ["No useful hints could be generated"]);
    } catch (err) {
      console.error("Error fetching hints:", err);
      setError("Failed to fetch hints. Check your API key and network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(true);
        }}
        className="fixed bottom-6 right-24 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Get AI Hints"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Bottom-Right Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            right: "24px",
            backgroundColor: "#1f2937", // Dark gray background
            width: "350px",
            maxHeight: "80vh",
            overflowY: "auto",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setIsOpen(false);
            }}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "none",
              border: "none",
              fontSize: "12px",
              cursor: "pointer",
              color: "#9ca3af", // Light gray
            }}
          >
            ✕
          </button>

          {/* Hints Content */}
          <div className="flex flex-col gap-4 mt-4">
            <h2 className="text-lg font-semibold text-white">AI Hints</h2>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={apiKey}
                onChange={handleKeyChange}
                placeholder="Enter Gemini API Key"
                className="w-full p-2 border rounded bg-gray-800 text-white border-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={fetchHints}
                className="flex items-center justify-center gap-2 p-2 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                disabled={loading}
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Loading..." : "Get Hints"}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {hints.length > 0 && !loading && !error && (
              <div>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-200">
                  {hints.map((hint, idx) => (
                    <li key={idx}>{hint}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}