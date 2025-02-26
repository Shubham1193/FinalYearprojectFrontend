import { Alert, Button, Label, TextInput, Spinner } from "flowbite-react";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInStart,
  signInSuccess,
  signInFailure,
} from "../redux/user/userSlice";
// import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import OAuth from "../components/OAuth";

const Signin = () => {
  return (
    <div className="h-[80vh] flex item-center justify-center">
      <div className="flex  item-center justify-center w-[90%] md:w-[50%] h-[50%] md:h-[80%] mt-10">
        {/* left */}
        <div className="flex-1  flex  flex-col justify-center items-center border-4 p-6 rounded-2xl">
          <Link to="/" className="font-bold dark:text-white text-4xl ">
            <span className="px-4 py-1  bg-gray-600  rounded-lg text-white">
              SyncCode
            </span>
          </Link>
          <p className="text-sm mt-10 mb-10 text-center">
            Introducing SyncCode, the ultimate collaborative coding platform.
            With SyncCode, two users can create a virtual room to solve DSA
            questions together, featuring real-time video conferencing and code
            synchronization. Perfect for coding interviews, school projects, or
            skill enhancement, SyncCode brings paired programming to the next
            level. Experience seamless collaboration with SyncCode today.
          </p>
          <OAuth />
        </div>
      </div>
    </div>
  );
};
export default Signin;
