import { useState } from 'react'
import './App.css'
import React from 'react'
import { Route, Routes } from 'react-router-dom'
import UserRegistrationPage from './Pages/users/UserAuthPage'
import ExamPage from './Pages/users/ExamPage'
import Home from './Pages/Home'
import UserAuthPage from './Pages/users/UserAuthPage'
import ResultPage from './Pages/ResultPage'
import Precheck from './Pages/users/Precheck'
import LoginForm from './Component/Auth/LoginForm'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route path="/user" element={<UserAuthPage />} />
        <Route path="/precheck" element={<Precheck /> } />
        <Route path="/exam" element={<ExamPage />} /> {/* ✅ fixed */}
        <Route path="/student/result" element={<ResultPage /> } />
        <Route path="/auth/login" element={<UserAuthPage isLoginDefault={true} />} />
        <Route path="/auth/register" element={<UserAuthPage isLoginDefault={false} />} />
      </Routes>
    </>
  )
}

export default App
