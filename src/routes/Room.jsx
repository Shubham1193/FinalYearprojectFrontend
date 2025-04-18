import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Navbar from "./Navbar";
import { useSocket } from "../context/SocketProvider";
import Videos from "./Videos";
import { useSelector } from "react-redux";
import Friends from "../components/Friends";
import * as Diff from "diff";
import "./Room.css";
import Hints from "../components/Hints";

const Room = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { roomId: id } = useSelector((state) => state.room);

  const ques = location.state?.question;
  const [userLang, setUserLang] = useState("python");
  const [userTheme, setUserTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(15);
  const [code, setCode] = useState("");
  const [result, setResult] = useState([]);
  const [question, setQuestion] = useState(null);
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const lastCodeRef = useRef(""); // Track the last code state
  const editorRef = useRef(null); // Ref to Monaco Editor instance
  const isRemoteUpdateRef = useRef(false); // Flag to track remote updates
  const [remoteCursor, setRemoteCursor] = useState(null);
  const cursorWidgetRef = useRef(null);
  const [hintDesc , setHintdesc] = useState("")

  const options = { fontSize };


  // Function to set default code based on language and question
  const setDefaultCode = (lang, q) => {
    console.log("setDefaultCode called with:", { lang, question: q });
    if (q) {
      const defaultCode = lang === "python"
        ? q.defaultcode.python.user.join("\n")
        : q.defaultcode.java.user.join("\n");
      console.log("Setting code to:", defaultCode);
      setCode(defaultCode);
      lastCodeRef.current = defaultCode; // Update the lastCodeRef when setting default code
    } else {
      console.log("No question provided, code not updated");
    }
  };

  const handleRemoteCodeUpdate = ({ delta }) => {
    try {
      // Set flag to prevent emitting another update
      isRemoteUpdateRef.current = true;
      
      const newCode = Diff.applyPatch(lastCodeRef.current, delta);
      
      if (newCode !== false && newCode !== lastCodeRef.current) {
        console.log("Applying remote code update");
        
        // Update the state and refs
        setCode(newCode);
        lastCodeRef.current = newCode;
        
        // Update editor content if editor is available
        if (editorRef.current) {
          const editor = editorRef.current;
          const selection = editor.getSelection(); // Preserve cursor/selection
          editor.setValue(newCode); // Update editor without full refresh
          editor.setSelection(selection); // Restore cursor/selection
        }
      }
    } catch (error) {
      console.error("Error applying remote code update:", error);
    } finally {
      // Reset the flag after a short delay to allow state updates to complete
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 0);
    }
  };

  // Mount editor and store reference
 // Handle editor mount and attach cursor listeners
 const handleEditorDidMount = (editor, monaco) => {
  editorRef.current = editor;

  // Listen to cursor position changes
  editor.onDidChangeCursorPosition((e) => {
    const position = editor.getPosition();
    const selection = editor.getSelection();
    socket.emit("cursor-update", { id, position, selection });
  });
};

  // Single useEffect for initialization and socket setup
  useEffect(() => {
    setQuestion(ques);
    setHintdesc(ques?.description || "");
    setDefaultCode(userLang, ques);
    socket.emit("question", { id, ques });

    const handleCodeResult = (data) => {
      setResult(JSON.parse(data));
    };

    socket.on("updated-code", handleRemoteCodeUpdate);
    socket.on("code-result", handleCodeResult);
    socket.on("syncQuestion", handleQuestionId);
    socket.on("clear-res", () => setResult([]));
    socket.on("submission-results", (results) => setResult(results));
    socket.on("languageChangeSync", handleLanguageChange);

    return () => {
      socket.off("updated-code", handleRemoteCodeUpdate);
      socket.off("code-result", handleCodeResult);
      socket.off("syncQuestion", handleQuestionId);
      socket.off("clear-res");
      socket.off("submission-results");
      socket.off("languageChangeSync", handleLanguageChange);
    };
  }, [id, ques, socket]);

  useEffect(() => {
    setDefaultCode(userLang, question);
  }, [userLang, question]);

  const handleLanguageChange = ({ language }) => {
    console.log("received language change");
    setUserLang(language);
  };

  const handleQuestionId = (newQues) => {
    setQuestion(newQues);
    setHintdesc(newQues.description)
    console.log("question received");
    setDefaultCode(userLang, newQues);
  };

  // Sync language change with other users
  const handleLanguageChangeLocal = (newLang) => {
    console.log("language changed locally");
    setUserLang(newLang);
    socket.emit("languageChange", { id, language: newLang, question: question });
    console.log("called emit to change language");
  };

  // Handle code changes from editor
  const handleCodeChange = (newCode) => {
    // Only emit updates for local changes, not remote ones
    if (!isRemoteUpdateRef.current) {
      const delta = Diff.createPatch("code", lastCodeRef.current, newCode);
      setCode(newCode);
      lastCodeRef.current = newCode;
      socket.emit("update-code", { delta, id });
    }
  };

  const handleSubmit = async () => {
    socket.emit("clear-res", { id });

    const hiddenCode = userLang === "python"
      ? question.defaultcode.python.hidden.join("\n") || ""
      : question.defaultcode.java.hidden.join("\n") || "";

    const fullCode = `${code}\n${hiddenCode}`.trim();
    const data = { fullCode, userLang, id, question };

    try {
      await axios.post("https://finalyearprojectbackend-2lbw.onrender.com/submit", data);
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const searchQuestion = () => {
    navigate("/problems");
  };

  const handleEditorChange = (newCode, event) => {
    handleCodeChange(newCode); // Existing diff or OT logic
    const position = editorRef.current.getPosition();
    const selection = editorRef.current.getSelection();
    socket.emit("cursor-update", { id, position, selection });
  };

 // Modified function to handle incoming cursor updates
const handleRemoteCursorUpdate = ({ position, selection }) => {
  console.log( position)
  if (position) {
    setRemoteCursor({ position, selection });
  }
};

  useEffect(() => {
    socket.on("cursor-update", handleRemoteCursorUpdate);
    return () => socket.off("cursor-update");
  }, [socket]);

  // Render cursors in editor (custom overlay or Monaco decorations)
 // In your useEffect for rendering the cursor
// Modify your cursor rendering useEffect
const updateCursorWidget = (position) => {
  const editor = editorRef.current;
  if (!editor || !position) return;

  // Remove existing widget
  if (cursorWidgetRef.current) {
    editor.removeContentWidget(cursorWidgetRef.current);
  }

  // Create a new cursor element
  const cursorElement = document.createElement('div');
  cursorElement.className = 'remote-cursor-widget';
  
  // Create the widget
  cursorWidgetRef.current = {
    getId: () => 'remote-cursor',
    getDomNode: () => cursorElement,
    getPosition: () => ({
      position: {
        lineNumber: position.lineNumber,
        column: position.column
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
    })
  };

  // Add the widget to the editor
  editor.addContentWidget(cursorWidgetRef.current);
};

// Update widget when remote cursor changes
useEffect(() => {
  if (remoteCursor?.position) {
    updateCursorWidget(remoteCursor.position);
  }
  
  // Clean up when unmounting
  return () => {
    const editor = editorRef.current;
    if (editor && cursorWidgetRef.current) {
      editor.removeContentWidget(cursorWidgetRef.current);
    }
  };
}, [remoteCursor]);
  return (
    <div className="min-h-screen overflow-hidden bg-[#1A1A2E]">
      <div className="h-[8vh] w-full">
        <Navbar
          userLang={userLang}
          setUserLangCustom={handleLanguageChangeLocal} // Use custom handler
          userTheme={userTheme}
          setUserTheme={setUserTheme}
          fontSize={fontSize}
          setFontSize={setFontSize}
          submit={handleSubmit}
          searchQuestion={searchQuestion}
          roomId={id}
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
                        <strong>Output:</strong>
                        <pre className="mt-1 p-2 bg-[#4A4A4A] rounded">{ex.output}</pre>
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
              height="100%"
              width="100%"
              theme={userTheme}
              language={userLang}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={options}
            />
          </div>

          {/* Test Case Results with Tabs */}
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
      <Hints  description={hintDesc} code = {code} />
      <Friends />
    </div>
  );
};

export default Room;