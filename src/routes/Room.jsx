import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Navbar from "./Navbar";
import { useSocket } from "../context/SocketProvider";
import Videos from "./Videos";
import { useSelector } from "react-redux";
import Friends from "../components/Friends";
import Hints from "../components/Hints";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";

const Room = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { roomId: id } = useSelector((state) => state.room);
  const { currentUser } = useSelector((state) => state.user);

  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const yDocRef = useRef(null);
  const yTextRef = useRef(null);
  const awarenessRef = useRef(null);
  const previousLangRef = useRef(null);

  let ques = location.state?.question;
  const [userLang, setUserLang] = useState("python");
  const [userTheme, setUserTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(15);
  const [code, setCode] = useState("");
  const [result, setResult] = useState([]);
  const [question, setQuestion] = useState(null);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [description, setDescription] = useState("");
  const [isEditorReady, setIsEditorReady] = useState(false);

  const options = {
    fontSize,
    renderLineHighlight: "all",
    cursorBlinking: "blink",
    cursorSmoothCaretAnimation: true,
  };

  useEffect(() => {
    if (!id || yDocRef.current) return;

    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    const yText = yDoc.getText("shared-code");
    yTextRef.current = yText;
    const awareness = new Awareness(yDoc);
    awarenessRef.current = awareness;

    const provider = new WebrtcProvider(id, yDoc, {
      signaling: ["wss://codesycnsignal.onrender.com"],
      maxConns: 20,
      awareness: awareness,
    });
    providerRef.current = provider;

    provider.on("status", (status) => console.log("WebRTC status:", status));
    provider.on("synced", () => console.log("Yjs synced with peers, content:", yText.toString()));

    const userName = currentUser.username;
    const userColor = `#b44de0`;
    awareness.setLocalStateField("user", { name: userName, color: userColor });
    awareness.setLocalStateField("cursor", { name: userName, color: userColor });

    return () => {
      if (awarenessRef.current) awarenessRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (yDocRef.current) yDocRef.current.destroy();
      awarenessRef.current = null;
      providerRef.current = null;
      yDocRef.current = null;
    };
  }, [id, currentUser.username]);

  useEffect(() => {
    if (!yTextRef.current || !ques) return;

    const yText = yTextRef.current;
    yText.delete(0, yText.length);
    if (yText.toString().length === 0) {
      const initialCode =
        userLang === "python"
          ? ques.defaultcode.python.user.join("\n")
          : ques.defaultcode.java.user.join("\n");
      yText.insert(0, initialCode);
      console.log("Initial code set:", initialCode);
    }

    const observer = () => {
      const newText = yText.toString();
      setCode(newText);
      console.log("Yjs document updated:", newText);
    };
    yText.observe(observer);
    setCode(yText.toString());

    return () => yText.unobserve(observer);
  }, [ques, userLang]);

  // Handle question broadcast
 // Handle question broadcast
useEffect(() => {
  if (!ques || !socket || !yTextRef.current) return;
  
  // Clear existing code completely before setting new question
  const yText = yTextRef.current;
  yText.delete(0, yText.length);
  
  // Set new question data
  setQuestion(ques);
  setDescription(ques.description);
  
  // Insert appropriate template code based on current language
  const templateCode = userLang === "python"
    ? ques.defaultcode.python.user.join("\n")
    : ques.defaultcode.java.user.join("\n");
  yText.insert(0, templateCode);
  
  // Broadcast question to other users
  socket.emit("question", { id, ques });
  
  console.log("New problem selected, template code set:", templateCode);

}, [id, ques, socket]);

  // Handle socket listeners
  useEffect(() => {
    if (!socket) return;
  
    socket.on("syncQuestion", (receivedQuestion) => {
      setQuestion(receivedQuestion);
      setDescription(receivedQuestion.description);
      console.log("Question synced from another user:", receivedQuestion.title);
  
      if (yTextRef.current) {
        const yText = yTextRef.current;
        // Clear document completely
        yText.delete(0, yText.length);
        
       
        console.log("Code reset to new question's default:", newCode);
      }
    });
  
    socket.emit("requestCurrentQuestion", { id });
  
    return () => socket.off("syncQuestion");
  }, [socket, id, userLang]);

  // Handle language switching
  useEffect(() => {
    if (!question || !isEditorReady || !yTextRef.current) return;

    // Track language changes
    if (previousLangRef.current !== userLang && previousLangRef.current !== null) {
      const yText = yTextRef.current;
      
      // Always reset when language changes to prevent code duplication
      yText.delete(0, yText.length);
      
      const newCode = userLang === "python" 
        ? question.defaultcode.python.user.join("\n")
        : question.defaultcode.java.user.join("\n");
        
      yText.insert(0, newCode);
      console.log(`Language changed from ${previousLangRef.current} to ${userLang}, reset code to:`, newCode);
    }
    
    // Update previous language reference
    previousLangRef.current = userLang;
    
  }, [userLang, question, isEditorReady]);

  useEffect(() => {
    if (!socket) return;

    socket.on("code-result", (data) => setResult(JSON.parse(data)));
    socket.on("clear-res", () => setResult([]));
    socket.on("submission-results", (results) => setResult(results));

    return () => {
      socket.off("code-result");
      socket.off("clear-res");
      socket.off("submission-results");
    };
  }, [socket]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    if (!yTextRef.current || !awarenessRef.current) return;

    monaco.editor.defineTheme("collaboration", {
      base: userTheme === "vs-dark" ? "vs-dark" : "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.lineHighlightBackground": "#1073cf2d",
        "editor.lineHighlightBorder": "#1073cf2d",
      },
    });
    editor.updateOptions({ theme: "collaboration" });

    new MonacoBinding(yTextRef.current, editor.getModel(), new Set([editor]), awarenessRef.current);
    console.log("Monaco editor bound to Yjs");

    let decorations = [];
    awarenessRef.current.on("update", () => {
      const states = awarenessRef.current.getStates();
      const newDecorations = [];
      states.forEach((state, clientId) => {
        if (clientId === awarenessRef.current.clientID) return;
        const cursor = state.cursor;
        if (cursor && cursor.name && cursor.color) {
          const model = editor.getModel();
          const cursorPosition = model.getPositionAt(state.cursor.offset || 0);
          if (cursorPosition) {
            newDecorations.push({
              range: new monaco.Range(
                cursorPosition.lineNumber,
                cursorPosition.column,
                cursorPosition.lineNumber,
                cursorPosition.column
              ),
              options: {
                isWholeLine: false,
                className: "remote-cursor",
                hoverMessage: { value: cursor.name },
                afterContentClassName: `remote-cursor-name-${clientId}`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              },
            });
            const styleId = `cursor-style-${clientId}`;
            if (!document.getElementById(styleId)) {
              const style = document.createElement("style");
              style.id = styleId;
              style.textContent = `
                .remote-cursor { background: ${cursor.color}80 !important; width: 2px !important; }
                .remote-cursor-name-${clientId}:after {
                  content: "${cursor.name}";
                  position: absolute;
                  background: ${cursor.color};
                  color: white;
                  padding: 2px 4px;
                  font-size: 12px;
                  border-radius: 3px;
                  margin-left: 2px;
                  z-index: 1000;
                }
              `;
              document.head.appendChild(style);
            }
          }
        }
      });
      decorations = editor.deltaDecorations(decorations, newDecorations);
    });

    editor.onDidChangeCursorPosition((e) => {
      const model = editor.getModel();
      const offset = model.getOffsetAt(e.position);
      awarenessRef.current.setLocalStateField("cursor", {
        name: awarenessRef.current.getLocalState().user.name,
        color: awarenessRef.current.getLocalState().user.color,
        offset,
      });
    });

    setIsEditorReady(true);
  };

  const handleSubmit = async () => {
    socket.emit("clear-res", { id });
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;
    const hiddenCode =
      userLang === "python"
        ? question?.defaultcode.python.hidden.join("\n") || ""
        : question?.defaultcode.java.hidden.join("\n") || "";
    const fullCode = `${currentCode}\n${hiddenCode}`.trim();
    const data = { fullCode, userLang, id, question };

    try {
      await axios.post("https://finalyearprojectbackend-2lbw.onrender.com/submit", data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const searchQuestion = () => {
    if (yTextRef.current) {
      yTextRef.current.delete(0, yTextRef.current.length);
      console.log("Shared code cleared to prevent duplication on rejoin");
    } else {
      console.warn("yText not initialized, skipping clear before navigation");
    }
    navigate("/problems");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#1A1A2E]">
      <div className="h-[8vh] w-full">
        <Navbar
          userLang={userLang}
          setUserLang={setUserLang}
          userTheme={userTheme}
          setUserTheme={setUserTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          submit={handleSubmit}
          searchQuestion={searchQuestion}
          roomid={id}
        />
      </div>
      <div className="flex h-[92vh] w-full mt-2">
        <div className="w-1/4 h-full p-4 bg-[#2A2A2A] text-white overflow-auto">
          {question ? (
            <>
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#3A3A3A] text-2xl font-bold">
                {question.title}
              </div>
              <div className="flex items-center mb-4 space-x-4">
                <span className="px-3 py-2 rounded-xl bg-[#3A3A3A] text-blue-400 text-lg">
                  {question.category}
                </span>
                <span className="px-3 py-2 rounded-xl bg-[#3A3A3A] text-blue-400 text-lg">
                  {question.difficulty}
                </span>
              </div>
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#3A3A3A] text-lg">{question.description}</div>
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#3A3A3A] text-lg">
                <strong>Constraints:</strong>
                {question.constraints.map((data, index) => (
                  <p key={index}>{data}</p>
                ))}
              </div>
              {question.example && question.example.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-[#3A3A3A] text-lg">
                  <strong>Examples:</strong>
                  {question.example.map((ex, index) => (
                    <div key={index} className="mt-4">
                      <div className="font-semibold">Example {index + 1}:</div>
                      <div className="mt-1">
                        <strong>Input:</strong>
                        <pre className="mt-1 p-2 bg-[#4A4A4A] rounded">{ex.input}</pre>
                      </div>
                      <div className="mt-1">
                        <strong>Output:</strong>
                        <pre className="mt-1 p-2 bg-[#4A4A4A] rounded">{ex.output}</pre>
                      </div>
                      <div className="mt-1">
                        <strong>Explanation:</strong>
                        {(() => {
                          const [text, imageUrl] = ex.explanation.split("Image: ");
                          return (
                            <>
                              {text && <div className="mt-1 p-2 bg-[#4A4A4A] rounded w-auto">{text}</div>}
                              {imageUrl && (
                                <img
                                  src={imageUrl.trim()}
                                  alt={`Example ${index + 1}`}
                                  className="mt-2 max-w-full rounded"
                                />
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xl">Select a problem</div>
          )}
        </div>
        <div className="w-1/2 h-full bg-black flex flex-col">
          <div className="h-3/5">
            <Editor
              options={options}
              height="100%"
              width="100%"
              theme={userTheme}
              language={userLang}
              defaultLanguage="python"
              onMount={handleEditorDidMount}
              value={code}
            />
          </div>
          <div className="overflow-auto text-white p-1">
            {result?.testCase && result.testCase.length > 0 ? (
              <div className="flex mb-2 overflow-x-auto py-1">
                {result.testCase.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTestCase(index)}
                    className={`px-3 py-1 mr-2 rounded-lg flex-shrink-0 ${
                      selectedTestCase === index
                        ? "bg-blue-600 text-white"
                        : result.testCase[index].expectedOutput === result.testCase[index].output
                        ? "bg-green-900 text-white"
                        : "bg-red-900 text-white"
                    }`}
                  >
                    Test {index + 1}
                  </button>
                ))}
              </div>
            ) : null}
            {result?.testCase && result.testCase.length > 0 ? (
              <div
                className={`border rounded-xl p-3 mb-2 ${
                  result.testCase[selectedTestCase].expectedOutput ===
                  result.testCase[selectedTestCase].output
                    ? "border-green-500 bg-[#1f2d1f]"
                    : "border-red-500 bg-[#2d1f1f]"
                }`}
              >
                <div className="text-m">
                  Test Case {selectedTestCase + 1}:{" "}
                  <span
                    className={
                      result.testCase[selectedTestCase].expectedOutput ===
                      result.testCase[selectedTestCase].output
                        ? "text-green-500"
                        : "text-red-500"
                    }
                  >
                    {result.testCase[selectedTestCase].expectedOutput ===
                    result.testCase[selectedTestCase].output
                      ? "Passed"
                      : "Failed"}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-semibold">Input:</span>{" "}
                  <pre className="whitespace-pre-wrap">{result.testCase[selectedTestCase].input}</pre>
                </div>
                <div>
                  <span className="font-semibold">Expected Output:</span>{" "}
                  <span className="text-green-400">
                    {result.testCase[selectedTestCase].expectedOutput}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Your Output:</span>{" "}
                  <span className="text-yellow-400">{result.testCase[selectedTestCase].output}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 font-bold">Run your code to see test results</div>
            )}
          </div>
        </div>
        <div className="w-1/4 h-full p-2">
          <Videos />
        </div>
      </div>
      <Hints description={description} code={code} />
      <Friends />
    </div>
  );
};

export default Room;