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
import SwitchDomain from './Pages/SwitchDomain'
import SubmissionSuccess from './Pages/users/SubmissionSuccess'
import RequireAuth from './Component/Auth/RequireAuth'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
<Routes>
  {/* Public */}
  <Route path="/" element={<LoginForm />} />
  <Route path="/switch-domain" element={<SwitchDomain />} />
  <Route path="/auth/login" element={<UserAuthPage isLoginDefault={true} />} />
  <Route path="/auth/register" element={<UserAuthPage isLoginDefault={false} />} />

  {/* Protected */}
  <Route element={<RequireAuth />}>
    <Route path="/precheck" element={<Precheck />} />
    <Route path="/exam" element={<ExamPage />} />
    <Route path="/student/result" element={<ResultPage />} />
    <Route path="/exam/submitted" element={<SubmissionSuccess />} />
  </Route>
</Routes>
    </>
  )
}

export default App
