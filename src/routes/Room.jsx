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
// Import the awareness protocol explicitly
import { Awareness } from 'y-protocols/awareness';

/**
 * Room Component - Handles collaborative code editing with shared cursors, video calls,
 * and code execution capabilities
 */
const Room = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { roomId: id } = useSelector((state) => state.room);
  const editorRef = useRef(null);
  const editorBindingRef = useRef(null);
  const providerRef = useRef(null);
  const yDocRef = useRef(null);
  const yTextRef = useRef(null);
  const awarenessRef = useRef(null);
  const isInitialSetupDone = useRef(false);

  // Get question from location state if available
  let ques = location.state?.question;
  const [userLang, setUserLang] = useState("python");
  const [userTheme, setUserTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(15);
  const [code, setCode] = useState("");
  const [result, setResult] = useState([]);
  const [question, setQuestion] = useState();
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [description, setDescription] = useState("");
  const [isEditorReady, setIsEditorReady] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const options = {
    fontSize,
    // Add cursor styling options for better visibility of remote cursors
    renderLineHighlight: "all",
    cursorBlinking: "blink",
    cursorSmoothCaretAnimation: true
  };

  /**
   * Initialize Yjs document and WebRTC provider for real-time collaboration
   * This sets up the shared document that all users will interact with
   */
  useEffect(() => {
    if (!yDocRef.current && id) {
      console.log("Initializing Yjs document for room:", id);
      console.log(currentUser.username)

      try {
        // Create a new Yjs document
        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        // Create shared text for collaborative editing
        const yText = yDoc.getText("shared-code");
        yTextRef.current = yText;

        // Create awareness instance BEFORE the provider
        // This fixes the "awareness.on is not a function" error
        const awareness = new Awareness(yDoc);
        awarenessRef.current = awareness;

        // Set up the WebRTC provider with the existing awareness
        const provider = new WebrtcProvider(id, yDoc
          , {
            signaling: ["wss://codesycnsignal.onrender.com"],
            maxConns: 20,
            awareness: awareness // Use the awareness instance we created
          }
        );

        providerRef.current = provider;

        // Debug - log connection status changes
        provider.on('status', status => {
          console.log('WebRTC connection status:', status);
        });

        // Debug - log when document is synced with peers
        provider.on('synced', () => {
          console.log('Document synced with peers, content length:', yText.toString().length);

          // If we have a question but haven't set up initial code yet, do it now
          if (ques && !isInitialSetupDone.current) {
            setupInitialCode(ques);
          }
        });

        // Setup initial awareness state with random user info
        const userName = currentUser.username
        const userColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        // Set awareness fields separately instead of using setLocalState
        awareness.setLocalStateField('user', {
          name: userName,
          color: userColor
        });

        // Set cursor data for highlighting
        awareness.setLocalStateField('cursor', {
          name: userName,
          color: userColor
        });

        console.log("Yjs document and awareness initialized successfully");
      } catch (error) {
        console.error("Error initializing Yjs:", error);
      }
    }

    // Cleanup function to destroy resources when component unmounts
    return () => {
      if (awarenessRef.current) {
        awarenessRef.current.destroy();
        awarenessRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
        yDocRef.current = null;
      }
    };
  }, [id]);

  /**
   * Helper function to set up initial code based on the question
   * Extracted to its own function for clarity and reuse
   */
  const setupInitialCode = (questionData) => {
    if (!yTextRef.current) return;

    const yText = yTextRef.current;
    console.log("Setting up code for question:", questionData.title);

    try {
      const initialCode = userLang === "python"
        ? questionData.defaultcode.python.user.join("\n")
        : questionData.defaultcode.java.user.join("\n");

      if (!initialCode || typeof initialCode !== 'string') {
        console.error("Invalid initial code format:", initialCode);
        return;
      }

      // Always clear and set new code for the new question
      console.log("Clearing old code and setting new code, length:", initialCode.length);
      yText.delete(0, yText.length); // Clear existing content
      yText.insert(0, initialCode);  // Insert new code
      console.log("Code updated successfully for new question");
    } catch (error) {
      console.error("Error setting code for new question:", error);
    }
  };

  /**
   * Setup Yjs observer to update local code state when document changes
   * This ensures our React state stays in sync with the shared document
   */
  useEffect(() => {
    if (!yTextRef.current) return;

    const yText = yTextRef.current;

    // Observer function to update the code state when Yjs document changes
    const observer = () => {
      const newText = yText.toString();
      setCode(newText);
      console.log("Document changed by Yjs. New length:", newText.length);
    };

    // Subscribe to changes
    yText.observe(observer);

    // Initial code value
    setCode(yText.toString());

    // Cleanup observer
    return () => {
      yText.unobserve(observer);
    };
  }, []);

  /**
   * Handle question initialization and code setup
   * This sets up the initial code when a question is loaded
   */
  useEffect(() => {
    if (!ques) return;

    console.log("Question changed to:", ques.title);
    setQuestion(ques);
    setDescription(ques.description);

    // Broadcast the question change to all clients
    socket.emit("question", { id, ques });

    // If Yjs is ready, set up the new code locally
    if (yTextRef.current && providerRef.current) {
      if (providerRef.current.connected) {
        setupInitialCode(ques);
      } else {
        console.log("Waiting for WebRTC connection before setting code...");
        providerRef.current.once('synced', () => setupInitialCode(ques));
      }
    }

    // Listen for question changes from other clients
    socket.on("syncQuestion", (receivedQuestion) => {
      setQuestion(receivedQuestion);
      setDescription(receivedQuestion.description);
      if (yTextRef.current && providerRef.current) {
        setupInitialCode(receivedQuestion); // Update code when question is received
      }
    });

    return () => {
      socket.off("syncQuestion");
    };
  }, [id, ques, socket]);

  /**
   * Handle language changes to update code template
   * This updates the editor with language-specific starter code
   */
  useEffect(() => {
    if (!yTextRef.current || !question || !isEditorReady) return;

    const handleLanguageChange = () => {
      // Skip if we're just initializing or document has meaningful content
      if (!isInitialSetupDone.current || !editorRef.current) return;

      const yText = yTextRef.current;
      const currentCode = yText.toString();

      // Only change template if current code is minimal/empty or matches previous template
      const isPythonTemplate = currentCode.includes("def ") && !currentCode.includes("class ");
      const isJavaTemplate = currentCode.includes("class ") && currentCode.includes("public");

      // If we're switching languages and have default template or near-empty code
      if ((userLang === "python" && isJavaTemplate) ||
        (userLang === "java" && isPythonTemplate) ||
        currentCode.trim().length < 10) {

        // Get new template based on language
        const newCode = userLang === "python"
          ? question.defaultcode.python.user.join("\n")
          : question.defaultcode.java.user.join("\n");

        // Clear and set new code based on language
        try {
          yText.delete(0, yText.length);
          yText.insert(0, newCode);
          console.log("Language changed to", userLang, "- setting new template code");
        } catch (error) {
          console.error("Error updating code for language change:", error);
        }
      }
    };

    handleLanguageChange();
  }, [userLang, question, isEditorReady]);

  /**
   * Set up socket event listeners for code execution and question sync
   */
  useEffect(() => {
    socket.on("code-result", handleCodeResult);
    socket.on("syncQuestion", handleQuestionId);
    socket.on("clear-res", clearResult);
    socket.on("submission-results", handleResult);

    return () => {
      socket.off("clear-res", clearResult);
      socket.off("syncQuestion", handleQuestionId);
      socket.off("code-result", handleCodeResult);
      socket.off("submission-results", handleResult);
    };
  }, [socket]);

  /**
   * Initialize Monaco editor and bind it to Yjs document
   * This is where cursor highlighting gets set up
   */
  /**
 * Initialize Monaco editor and bind it to Yjs document
 * This is where cursor highlighting with names gets set up
 */
  const handleEditorDidMount = (editor, monaco) => {
    console.log("Editor mounting...");

    // Store editor reference for later use
    editorRef.current = editor;

    if (!yTextRef.current || !awarenessRef.current) {
      console.error("Yjs setup not ready yet, cannot bind editor");
      return;
    }

    try {
      // Configure monaco for cursor highlighting
      monaco.editor.defineTheme('collaboration', {
        base: userTheme === 'vs-dark' ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.lineHighlightBackground': '#1073cf2d',
          'editor.lineHighlightBorder': '#1073cf2d'
        }
      });

      editor.updateOptions({
        theme: 'collaboration'
      });

      console.log("Binding Monaco editor to Yjs text...");

      // Bind Yjs to Monaco Editor with cursor awareness
      const binding = new MonacoBinding(
        yTextRef.current,
        editor.getModel(),
        new Set([editor]),
        awarenessRef.current
      );

      editorBindingRef.current = binding;

      // Add cursor decorations with names
      let decorations = [];
      awarenessRef.current.on('update', () => {
        const states = awarenessRef.current.getStates();
        const newDecorations = [];

        states.forEach((state, clientId) => {
          if (clientId === awarenessRef.current.clientID) return; // Skip local user

          const cursor = state.cursor;
          if (cursor && cursor.name && cursor.color) {
            const position = editor.getPosition();
            if (!position) return;

            // Get cursor position from editor if available
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
                  className: 'remote-cursor',
                  hoverMessage: { value: cursor.name },
                  afterContentClassName: `remote-cursor-name-${clientId}`,
                  stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                }
              });

              // Add CSS for the cursor name
              const styleId = `cursor-style-${clientId}`;
              if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                .remote-cursor {
                  background: ${cursor.color}80 !important;
                  width: 2px !important;
                }
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

        // Update decorations
        decorations = editor.deltaDecorations(decorations, newDecorations);
      });

      // Update cursor position in awareness
      editor.onDidChangeCursorPosition((e) => {
        const model = editor.getModel();
        const offset = model.getOffsetAt(e.position);
        awarenessRef.current.setLocalStateField('cursor', {
          name: awarenessRef.current.getLocalState().user.name,
          color: awarenessRef.current.getLocalState().user.color,
          offset: offset
        });
      });

      console.log("Monaco binding established with cursor awareness and names");
      setIsEditorReady(true);

      // If we have a question and initial setup hasn't been done, do it now
      if (question && !isInitialSetupDone.current) {
        console.log("Setting up initial code after editor mount");
        setupInitialCode(question);
      }

      // Debug: Log when editor content changes
      editor.onDidChangeModelContent(() => {
        const editorValue = editor.getValue();
        console.log("Editor content changed, length:", editorValue.length);
      });
    } catch (error) {
      console.error("Error creating Monaco binding:", error);
    }
  };

  /**
   * Handle test results from server
   */
  const handleResult = (results) => {
    setResult(results);
  };

  /**
   * Clear test results
   */
  const clearResult = () => {
    setResult([]);
  };

  /**
   * Handle question data from server
   */
  const handleQuestionId = (receivedQuestion) => {
    setQuestion(receivedQuestion);
    setDescription(receivedQuestion.description);

    // If we receive a question via socket and initial setup not done, do it now
    if (yTextRef.current && providerRef.current && !isInitialSetupDone.current) {
      setupInitialCode(receivedQuestion);
    }
  };

  /**
   * Handle code execution results
   */
  const handleCodeResult = (data) => {
    setResult(JSON.parse(data));
    console.log(data);
  };

  /**
   * Submit code for execution
   */
  const handleSubmit = async () => {
    socket.emit("clear-res", { id });

    // Get the current code directly from the editor if available
    // or fall back to the state which should be in sync with yText
    const currentCode = editorRef.current
      ? editorRef.current.getValue()
      : code;

    let hiddenCode =
      userLang === "python"
        ? question?.defaultcode.python.hidden.join("\n") || ""
        : question?.defaultcode.java.hidden.join("\n") || "";

    let fullCode = `${currentCode}\n${hiddenCode}`.trim();
    const data = { fullCode, userLang, id, question };

    try {
      await axios.post("https://finalyearprojectbackend-2lbw.onrender.com/submit", data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  /**
   * Navigate to problems page
   */
  const searchQuestion = () => {
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
        {/* Left Sidebar: Problem Details */}
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
              <div className="mb-4 px-4 py-3 rounded-xl bg-[#3A3A3A] text-lg">
                {question.description}
              </div>
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
                        <strong>Output:</strong> <pre className="mt-1 p-2 bg-[#4A4A4A] rounded">{ex.output}</pre>
                      </div>
                      <div className="mt-1">
                        <strong>Explanation:</strong>
                        {(() => {
                          const [text, imageUrl] = ex.explanation.split("Image: ");
                          return (
                            <>
                              {text && (<div className="mt-1 p-2 bg-[#4A4A4A] rounded w-auto">{text}</div>)}
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
            <div className="flex items-center justify-center h-full text-xl">
              Select a problem
            </div>
          )}
        </div>

        {/* Center: Editor and Code Results */}
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
              value={code} // This ensures the editor updates when code state changes
            />
          </div>

          {/* Test Case Results with Tabs */}
          <div className="overflow-auto text-white p-1">
            {/* Test Case Tabs */}
            {result?.testCase && result.testCase.length > 0 ? (
              <div className="flex mb-2 overflow-x-auto py-1">
                {result.testCase.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedTestCase(index)}
                    className={`px-3 py-1 mr-2 rounded-lg flex-shrink-0 ${selectedTestCase === index
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

            {/* Selected Test Case Details */}
            {result?.testCase && result.testCase.length > 0 ? (
              <div
                className={`border rounded-xl p-3 mb-2 ${result.testCase[selectedTestCase].expectedOutput ===
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
                  <pre className="whitespace-pre-wrap">
                    {result.testCase[selectedTestCase].input}
                  </pre>
                </div>
                <div>
                  <span className="font-semibold">Expected Output:</span>{" "}
                  <span className="text-green-400">
                    {result.testCase[selectedTestCase].expectedOutput}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Your Output:</span>{" "}
                  <span className="text-yellow-400">
                    {result.testCase[selectedTestCase].output}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 font-bold">
                Run your code to see test results
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Videos */}
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