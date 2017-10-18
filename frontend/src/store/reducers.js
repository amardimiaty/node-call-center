import {combineReducers} from 'redux'
import {routerReducer as router} from 'react-router-redux'
import login from './login'
import profile from './profile'
import pools from './pools'

export default combineReducers({router, login, profile, pools})
