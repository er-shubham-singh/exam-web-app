import { configureStore } from "@reduxjs/toolkit";
import { questionReducer, } from "./Question/Reducer";
import { domainReducer } from "./Domain/reducer";
import { paperReducer } from "./Paper/Reducer";
import { mentorReducer } from "./Mentor/reduser";
import evaluationReducer from "./EvaluationResult/reducer";
import { employeeReducer } from "./adminPermession/reducer";
import authReducer from "./login/reducer";
import { paperSetReducer } from "./paperSet/reducer";
import { paperTemplateReducer } from "./papertemplate/reducer";



const store = configureStore({
    reducer:{
        question:questionReducer,
        domain:domainReducer,
        paper:paperReducer,
        mentor:mentorReducer,
        evaluation:evaluationReducer,
        employee:employeeReducer,
        auth:authReducer,
          paperSets: paperSetReducer,
  paperTemplates: paperTemplateReducer,
    }
})

export default store