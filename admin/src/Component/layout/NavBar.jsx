import React from "react";
import { NavLink } from "react-router-dom";
import menu from "../../config/Menu";
 // import menu array

const linkBase =
  "px-3 py-2 rounded-md text-sm font-medium transition-colors";
const active =
  "bg-blue-600 text-white";
const idle =
  "text-gray-200 hover:bg-gray-800 hover:text-white";

const NavBar = () => {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="text-blue-400 font-extrabold tracking-wide">
          Web Exam App
        </div>
        <div className="flex items-center gap-2">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? active : idle}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
