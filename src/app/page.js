"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [mode, setMode] = useState("en-check");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");

  const [responseIds, setResponseIds] = useState({
    "en-tr": null,
    "tr-en": null,
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("heeelp-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = prefersDark ? "dark" : "light";

    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("heeelp-theme", theme);
  }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, error]);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  function getEndpoint(value) {
    if (value === "en-check") return "/api/check-en";
    if (value === "en-tr") return "/api/translate/en-tr";
    return "/api/translate/tr-en";
  }

  async function handleSend() {
    if (loading) return;

    setError("");

    const cleanText = text.trim();

    if (!cleanText) return;

    setLoading(true);

    try {
      const endpoint = getEndpoint(mode);
      const canUseContext = mode !== "en-check";

      const userMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: cleanText,
      };

      setMessages((prev) => [...prev, userMessage]);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          previousResponseId: canUseContext ? responseIds[mode] : null,
          continueContext: canUseContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bir hata oluştu.");
      }

      const botMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.text,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (canUseContext && data.responseId) {
        setResponseIds((prev) => ({
          ...prev,
          [mode]: data.responseId,
        }));
      }

      setText("");
    } catch (err) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function resetChat() {
    setMessages([]);
    setText("");
    setError("");
    setResponseIds({
      "en-tr": null,
      "tr-en": null,
    });
  }

  return (
    <main className="page">
      <div className="appShell">
        <div className="topBar">
          <button
            className={mode === "en-check" ? "modeBtn active" : "modeBtn"}
            onClick={() => setMode("en-check")}
          >
            Sentence Control
          </button>

          <button
            className={mode === "en-tr" ? "modeBtn active" : "modeBtn"}
            onClick={() => setMode("en-tr")}
          >
            ENG to TUR
          </button>

          <button
            className={mode === "tr-en" ? "modeBtn active" : "modeBtn"}
            onClick={() => setMode("tr-en")}
          >
            TUR to ENG
          </button>

          <button className="resetBtn resetBtnSpaced" onClick={resetChat}>
            Reset
          </button>

          <button className="themeBtn" onClick={toggleTheme}>
            {theme === "light" ? "☾" : "☀"}
          </button>
        </div>

        <div className="chatBox">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === "user" ? "bubble userBubble" : "bubble botBubble"}
            >
            <>
  {msg.text.split("\n").map((line, index) => {
    if (line.startsWith("Alternative 1:")) {
      return (
        <div key={index}>
          <span className="altLabel">Alternative 1:</span>
          <span> {line.replace("Alternative 1:", "").trim()}</span>
        </div>
      );
    }

    if (line.startsWith("Alternative 2:")) {
      return (
        <div key={index}>
          <span className="altLabel">Alternative 2:</span>
          <span> {line.replace("Alternative 2:", "").trim()}</span>
        </div>
      );
    }

    if (line.startsWith("Alternative:")) {
      return (
        <div key={index}>
          <span className="altLabel">Alternative:</span>
          <span> {line.replace("Alternative:", "").trim()}</span>
        </div>
      );
    }

    return <div key={index}>{line}</div>;
  })}
</>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="composer">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
          />

          <button className="sendBtn" onClick={handleSend} disabled={loading}>
            SEND
          </button>
        </div>

        {error ? <div className="errorBox">{error}</div> : null}
      </div>
      
       <div className="footerLogo">
    <img src="/icon.svg" alt="heeelp." className="footerLogoImage" />
  </div>
    </main>
  );
}