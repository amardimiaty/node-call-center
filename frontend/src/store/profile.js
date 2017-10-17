import request from '../request'

export const GET_PROFILE = 'PROFILE/GET_PROFILE'

let source = null

export function getProfile() {
	return (dispatch, getState) => dispatch(request(GET_PROFILE, '/profile'))
}

export default (state = {}, action) => {
	switch (action.type) {
		case `${GET_PROFILE}_SUCCESS`: {
			return {...action.result, loaded: true}
		}
		default: {
			return {...state}
		}
	}
}
