import { configureStore } from "@reduxjs/toolkit";
import { domainReducer } from "./Domain/reducer";
import { userReducer } from "./User/reducer";
import { examReducer } from "./ExamLog/reducer";
import { resultReducer } from "./view result/reducer";
// import { examReducer } from "./Exam/reducer";  // ✅ merged reducer

const store = configureStore({
  reducer: {
    user: userReducer,
    domain: domainReducer,
    exam: examReducer,
    result:resultReducer,
  },
});

export default store;
