import request from '../request'

export const LOGOUT = 'LOGIN/LOGOUT'


export function logout() {
	return request(LOGOUT, '/logout', 'POST')
}

export default (state = {}, action) => {
	switch (action.type) {
		default: {
			return {...state}
		}
	}
}
