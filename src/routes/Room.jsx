import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import Navbar from "./Navbar";
import { useSocket } from "../context/SocketProvider";
import Videos from "./Videos";
import { useSelector } from "react-redux";
import Friends from "../components/Friends";

const Room = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();
  const { roomId: id } = useSelector((state) => state.room);

  let ques = location.state?.question;
  const [userLang, setUserLang] = useState("python");
  const [userTheme, setUserTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(15);
  const [code, setCode] = useState("hello world");
  const [result, setResult] = useState([]);
  const [question, setQuestion] = useState();
  const [selectedTestCase, setSelectedTestCase] = useState(0);

  const options = { fontSize };

  useEffect(() => {
    if (ques) {
      setQuestion(ques);
      setCode(
        userLang === "python"
          ? ques.defaultcode.python.user.join("\n")
          : ques.defaultcode.java.user.join("\n")
      );
      socket.emit("question", { id, ques });
    }

    socket.on("updated-code", handleUpdatedCode);
    socket.on("code-result", handleCodeResult);
    socket.on("syncQuestion", handleQuestionId);
    socket.on("clear-res", clearResult);
    socket.on("submission-results", handleResult);

    return () => {
      socket.off("clear-res", clearResult);
      socket.off("syncQuestion", handleQuestionId);
      socket.off("code-result", handleCodeResult);
      socket.off("updated-code", handleUpdatedCode);
      socket.off("submission-results", handleResult);
    };
  }, [id, ques, userLang]);

  const handleResult = (results) => {
    setResult(results);
  };

  const clearResult = () => {
    setResult([]);
  };

  const handleQuestionId = (ques) => {
    setQuestion(ques);
  };

  const handleUpdatedCode = (code) => {
    setCode(code);
    socket.emit("update-code", { code, id });
  };

  const handleCodeResult = (data) => {
    setResult(JSON.parse(data));
    console.log(data);
  };

  const handleSubmit = async () => {
    socket.emit("clear-res", { id });

    let hiddenCode =
      userLang === "python"
        ? ques.defaultcode.python.hidden.join("\n") || ""
        : ques.defaultcode.java.hidden.join("\n") || "";

    let fullCode = `${code}\n${hiddenCode}`.trim();aasidfgdfdfgdgd
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
                        <strong>Output:</strong> <pre className="mt-1 p-2 bg-[#4A4A4A] rounded">{ex.input}</pre>  
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
              onChange={handleUpdatedCode}
              value={code}
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

            {/* Selected Test Case Details */}
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
          <Videos/>
        </div>
      </div>
      <Friends />
    </div>
  );
};

export default Room;