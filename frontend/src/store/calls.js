import request from '../request'

export const GET_CALLS = 'CALLS/GET_CALLS'
export const GET_POOL = 'CALLS/GET_POOL'
export const CLEAR_POOL = 'CALLS/CLEAR_POOL'

export function getCalls(queryString) {
	let path = '/calls'
	if (queryString) {
		path = `${path}?${queryString}`
	}
	return (dispatch, getState) => dispatch(request(GET_CALLS, path))
}

export function getPool(id) {
	return (dispatch, getState) => dispatch(request(GET_POOL, `/pools/${id}`))
}

export default (state = {}, action) => {
	switch (action.type) {
		case `${GET_CALLS}_ERROR`: {
			return {...state, error: action.error, loading: false}
		}
		case `${GET_CALLS}_START`: {
			return {...state, error: null, loading: true}
		}
		case `${GET_CALLS}_SUCCESS`: {
			let calls = state.calls || []
			if (action.result.page === 1) {
				calls = [action.result]
			} else {
				calls.push(action.result)
			}
			return {...state, error: null, loading: false, calls}
		}
		case `${GET_POOL}_ERROR`: {
			return {...state, error: action.error}
		}
		case `${GET_POOL}_SUCCESS`: {
			return {...state, pool: action.result}
		}
		case CLEAR_POOL: {
			return {...state, pool: null, poolId: null}
		}
		default: {
			return {...state}
		}
	}
}
