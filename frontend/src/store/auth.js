import Auth from '../auth'

export const LOGIN = 'LOGIN/LOGIN'

export function login() {
	return async function(dispatch) {
		const auth = new Auth()
		dispatch({type: `${LOGIN}_START`})
		return auth.login().then(profile => dispatch({type: `${LOGIN}_SUCCESS`, profile}), err => dispatch({type: `${LOGIN}_ERROR`}, {error: err.message}))
	}
}

export function logout() {
	return async function(dispatch) {
		const auth = new Auth()
		auth.logout()
		dispatch({type: 'CLEAR_PROFILE'})
	}
}

export default (state = {}, action) => {
	switch (action.type) {
		case `${LOGIN}_ERROR`: {
			return {...state, error: action.error, loading: false}
		}
		case `${LOGIN}_START`: {
			return {...state, error: null, loading: true, profile: null}
		}
		case `${LOGIN}_SUCCESS`: {
			return {...state, error: null, loading: false, profile: action.profile}
		}
		case 'CLEAR_PROFILE': {
			return {...state, profile: null}
		}
		default: {
			return {...state}
		}
	}
}
