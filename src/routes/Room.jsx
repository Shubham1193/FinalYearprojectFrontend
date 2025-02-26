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
  let ques = location.state?.question;
  const { roomId: id } = useSelector((state) => state.room);

  const navigate = useNavigate();
  const [userLang, setUserLang] = useState("python");
  const [userTheme, setUserTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(15);
  const [userInput, setUserInput] = useState("");
  const options = { fontSize };
  const [code, setCode] = useState("hello world");
  const [result, setResult] = useState();
  const socket = useSocket();
  const [question, setQuestion] = useState();

  useEffect(() => {
    if (ques) {
      setQuestion(ques);
      if (userLang === "python") {
        setCode(ques.defaultcode.python[1]);
      } else {
        setCode(ques.defaultcode.java[1]);
      }
      socket.emit("question", { id, ques });
    }

    socket.on("updated-code", handleUpdatedCode);
    socket.on("code-result", handleCodeResult);
    socket.on("syncQuestion", handleQuestionId);
    socket.on("clear-res", clearResult);

    return () => {
      socket.off("clear-res", clearResult);
      socket.off("syncQuestion", handleQuestionId);
      socket.off("code-result", handleCodeResult);
      socket.off("updated-code", handleUpdatedCode);
    };
  }, [id, ques, userLang]);

  const clearResult = () => {
    setResult();
  };

  const handleQuestionId = (ques) => {
    setQuestion(ques);
  };

  const handleUpdatedCode = (code) => {
    setCode(code);
  };

  const handleCodeResult = (result) => {
    setResult(JSON.parse(result));
  };

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit("update-code", { code: value, id });
  };

  const handleSubmit = async () => {
    socket.emit("clear-res", { id });
    const data = { code, userLang, id, question };
    try {
      await axios.post("http://localhost:8000/submit", data);
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
                  <p key={index}>= {data}</p>
                ))}
              </div>
              <div className="px-4 py-3 rounded-xl bg-[#3A3A3A] text-lg">
                <div className="mb-2 font-semibold">Test Cases:</div>
                {question.testCases.map((testCase, tcIndex) => (
                  <div key={tcIndex} className="mb-3">
                    <div className="underline">Test Case {tcIndex + 1}</div>
                    {Object.keys(testCase.input).map((key) => (
                      <div key={key}>
                        - {key}: {JSON.stringify(testCase.input[key])}
                      </div>
                    ))}
                    <div>- Output: {JSON.stringify(testCase.output)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xl">
              Select a problem
            </div>
          )}
        </div>

        {/* Center: Editor and Code Results */}
        <div className="w-1/2 h-full bg-black flex flex-col">
          <div className="h-3/4">
            <Editor
              options={options}
              height="100%"
              width="100%"
              theme={userTheme}
              language={userLang}
              defaultLanguage="python"
              defaultValue=""
              onChange={handleCodeChange}
              value={code}
            />
          </div>
          <div className="h-1/4 overflow-auto text-white flex flex-wrap justify-around items-start p-2">
            {result &&
              result.map((res, index) => (
                <div
                  key={index}
                  className="m-2 border border-white rounded-xl bg-[#2A2A2A] p-4 w-80"
                >
                  <div
                    className={`mb-2 rounded-xl px-3 py-2 text-center ${
                      res.passed ? "bg-green-500" : "bg-red-500"
                    }`}
                  >
                    Test Case {index + 1}
                  </div>
                  <div className="mb-1">
                    {Object.keys(res.testCase.input).map((key) => (
                      <div key={key}>
                        <span className="font-semibold">{key}:</span>{" "}
                        {JSON.stringify(res.testCase.input[key])}
                      </div>
                    ))}
                  </div>
                  <div className="mb-1">
                    <span className="font-semibold">Expected:</span>{" "}
                    {JSON.stringify(res.testCase.output)}
                  </div>
                  <div>
                    <span className="font-semibold">Your Output:</span>{" "}
                    {res.youroutput}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Sidebar: Videos */}
        <div className="w-1/4 h-full p-2">
          <Videos id={id} />
        </div>
      </div>
      <Friends />
    </div>
  );
};

export default Room;
