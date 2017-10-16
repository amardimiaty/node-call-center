import {applyMiddleware, compose, createStore as createReduxStore} from 'redux'
import {routerMiddleware} from 'react-router-redux'
import thunk from 'redux-thunk'
import createHistory from 'history/createBrowserHistory'
import rootReducer from './reducers'
import logger from 'redux-logger'

// Create a history of your choosing (we're using a browser history in this case)
export const history = createHistory()

// Build the middleware for intercepting and dispatching navigation actions

const createStore = (initialState = {}) => {
	// ======================================================
	// Middleware Configuration
	// ======================================================
	const middleware = [routerMiddleware(history), thunk]

	// ======================================================
	// Store Enhancers
	// ======================================================
	const enhancers = []
	let composeEnhancers = compose

	if (process.env.NODE_ENV !== 'production') {
		if (typeof window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ === 'function') {
			composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
		}
		middleware.push(logger)
	}


	// ======================================================
	// Store Instantiation and HMR Setup
	// ======================================================
	const store = createReduxStore(
		rootReducer,
		initialState,
		composeEnhancers(
			applyMiddleware(...middleware),
			...enhancers
		)
	)
	store.asyncReducers = {}


	if (module.hot) {
		module.hot.accept('./reducers', () => {
			const reducers = require('./reducers').default
			store.replaceReducer(reducers)
		})
	}
	return store
}


export default createStore
