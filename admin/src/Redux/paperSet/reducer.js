// Redux/PaperSet/reducer.js
import {
  CREATE_SET_REQUEST,
  CREATE_SET_SUCCESS,
  CREATE_SET_FAIL,
  FETCH_SETS_REQUEST,
  FETCH_SETS_SUCCESS,
  FETCH_SETS_FAIL,
  GET_SET_REQUEST,
  GET_SET_SUCCESS,
  GET_SET_FAIL,
  UPDATE_SET_REQUEST,
  UPDATE_SET_SUCCESS,
  UPDATE_SET_FAIL,
  DELETE_SET_REQUEST,
  DELETE_SET_SUCCESS,
  DELETE_SET_FAIL,
  ADD_QUESTIONS_TO_SET_REQUEST,
  ADD_QUESTIONS_TO_SET_SUCCESS,
  ADD_QUESTIONS_TO_SET_FAIL,
  REMOVE_QUESTION_FROM_SET_REQUEST,
  REMOVE_QUESTION_FROM_SET_SUCCESS,
  REMOVE_QUESTION_FROM_SET_FAIL,
} from "./actionType";

const initialState = {
  loading: false,
  error: null,
  message: "",
  sets: [],
  currentSet: null,
};

const normalizeListPayload = (payload) => {
  // accepts array or object with items/data/sets keys
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.sets)) return payload.sets;
  return [];
};

const extractSetFromPayload = (payload) => {
  // payload might be the set itself or { set: ... } or { data: set } or { tpl: { ... } }
  if (!payload) return null;
  if (payload.set) return payload.set;
  if (payload.data && (payload.data._id || payload.data.id)) return payload.data;
  if (payload._id || payload.id) return payload;
  // fallback common nested shapes
  if (payload.tpl && (payload.tpl._id || payload.tpl.id)) return payload.tpl;
  if (payload.result && (payload.result._id || payload.result.id)) return payload.result;
  return null;
};

export const paperSetReducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATE_SET_REQUEST:
    case FETCH_SETS_REQUEST:
    case GET_SET_REQUEST:
    case UPDATE_SET_REQUEST:
    case DELETE_SET_REQUEST:
    case ADD_QUESTIONS_TO_SET_REQUEST:
    case REMOVE_QUESTION_FROM_SET_REQUEST:
      return { ...state, loading: true, error: null, message: "" };

    case CREATE_SET_SUCCESS: {
      const newSet = extractSetFromPayload(action.payload) || action.payload;
      // if we somehow got wrapped payload return newSet, else fallback to payload
      return {
        ...state,
        loading: false,
        message: "Set created successfully",
        sets: newSet ? [newSet, ...state.sets] : [action.payload, ...state.sets],
      };
    }

    case FETCH_SETS_SUCCESS: {
      const list = normalizeListPayload(action.payload);
      return { ...state, loading: false, sets: list };
    }

    case GET_SET_SUCCESS: {
      // action.payload expected to be a populated set
      return { ...state, loading: false, currentSet: action.payload };
    }

    case UPDATE_SET_SUCCESS: {
      const updated = extractSetFromPayload(action.payload) || action.payload;
      if (!updated) return { ...state, loading: false };
      const nextSets = state.sets.map((s) => (String(s._id || s.id) === String(updated._id || updated.id) ? updated : s));
      // insert if not present
      const found = nextSets.some((s) => String(s._id || s.id) === String(updated._id || updated.id));
      return {
        ...state,
        loading: false,
        message: "Set updated successfully",
        sets: found ? nextSets : [updated, ...state.sets],
        currentSet: state.currentSet && String(state.currentSet._id || state.currentSet.id) === String(updated._id || updated.id) ? updated : state.currentSet,
      };
    }

    case DELETE_SET_SUCCESS: {
      // payload may be id or { id }
      const id = action.payload && (action.payload.setId || action.payload._id || action.payload.id) ? (action.payload.setId || action.payload._id || action.payload.id) : action.payload;
      return { ...state, loading: false, message: "Set deleted", sets: state.sets.filter((s) => String(s._id || s.id) !== String(id)) };
    }

case ADD_QUESTIONS_TO_SET_SUCCESS: {
  const updatedSet = action.payload; // expect populated set object
  return {
    ...state,
    loading: false,
    message: "Questions added to set",
    sets: state.sets.map(s => String(s._id) === String(updatedSet._id) ? updatedSet : s),
    currentSet: state.currentSet && String(state.currentSet._id) === String(updatedSet._id) ? updatedSet : state.currentSet,
  };
}


    case REMOVE_QUESTION_FROM_SET_SUCCESS: {
      const { setId, questionId } = action.payload || {};
      return {
        ...state,
        loading: false,
        message: "Question removed from set",
        sets: state.sets.map((s) =>
          String(s._id || s.id) === String(setId)
            ? { ...s, questions: (s.questions || []).filter((q) => String(q.question || q._id || q) !== String(questionId)) }
            : s
        ),
        currentSet:
          state.currentSet && String(state.currentSet._id || state.currentSet.id) === String(setId)
            ? { ...state.currentSet, questions: (state.currentSet.questions || []).filter((q) => String(q.question?._id || q._id || q) !== String(questionId)) }
            : state.currentSet,
      };
    }

    case CREATE_SET_FAIL:
    case FETCH_SETS_FAIL:
    case GET_SET_FAIL:
    case UPDATE_SET_FAIL:
    case DELETE_SET_FAIL:
    case ADD_QUESTIONS_TO_SET_FAIL:
    case REMOVE_QUESTION_FROM_SET_FAIL:
      return { ...state, loading: false, error: action.payload, message: "" };

    default:
      return state;
  }
};

export default paperSetReducer;
