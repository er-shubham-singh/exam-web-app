import { configureStore } from "@reduxjs/toolkit";
import { questionReducer, } from "./Question/Reducer";
import { domainReducer } from "./Domain/reducer";
import { paperReducer } from "./Paper/Reducer";
import { mentorReducer } from "./Mentor/reduser";
import evaluationReducer from "./EvaluationResult/reducer";



const store = configureStore({
    reducer:{
        question:questionReducer,
        domain:domainReducer,
        paper:paperReducer,
        mentor:mentorReducer,
        evaluation:evaluationReducer
    }
})

export default store