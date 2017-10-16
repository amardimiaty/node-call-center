import {combineReducers} from 'redux'
import {routerReducer as router} from 'react-router-redux'
import auth from './auth'

export default combineReducers({router, auth})
