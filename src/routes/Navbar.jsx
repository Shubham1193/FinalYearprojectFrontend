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
