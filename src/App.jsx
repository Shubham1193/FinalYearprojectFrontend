import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import Room from "./routes/Room";
import Signin from "./routes/Singnin";
import PrivateRoute from "./components/PrivateRoute";
import Problems from "./routes/Problems";
import Home from "./routes/Home";
import Submission from "./routes/Submission";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path = "/" element={<Home/>}/>
        <Route element={<PrivateRoute />}>
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/room" element={<Room />} />
          <Route path='/problems' element={<Problems/>} />
          <Route path='/submission' element={<Submission/>} />
        </Route>

        <Route path="/sign-in" element={<Signin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
