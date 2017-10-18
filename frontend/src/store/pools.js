import request from '../request'

export const GET_POOLS = 'POOLS/GET_POOLS'
export const SAVE_POOL = 'POOLS/SAVE_POOL'
export const REMOVE_POOL = 'POOLS/REMOVE_POOL'

export const START_EDIT = 'POOLS/START_EDIT'

export const SET_AREA_CODE = 'POOLS/SET_AREA_CODE'
export const SET_FORWARDS = 'POOLS/SET_FORWARDS'
export const SET_GREETING = 'POOLS/SET_GREETING'


export function getPools() {
	return (dispatch, getState) => dispatch(request(GET_POOLS, '/pools'))
}

export function savePool() {
	return (dispatch, getState) => {
		const state = getState()
		let path = '/pools'
		if (state.pools.changes.id) {
			path = `${path}/${state.pools.changes.id}`
		}
		dispatch(request(SAVE_POOL, path, 'POST', 'pools.changes'))
	}
}

export function removePool(id) {
	return (dispatch, getState) => dispatch(request(REMOVE_POOL, `/pools/${id}`, 'DELETE'))
}

export default (state = {}, action) => {
	switch (action.type) {
		case SET_AREA_CODE: {
			const changes = state.changes || {}
			changes.areaCode = action.areaCode
			return {...state, changes}
		}
		case SET_GREETING: {
			const changes = state.changes || {};
			changes.greeting = action.greeting
			return {...state, changes}
		}
		case SET_FORWARDS: {
			const changes = state.changes || {};
			changes.forwardsString = action.forwards
			changes.forwards = action.forwards.split(',').map(f => f.trim()).filter(f => f)
			return {...state, changes}
		}
		case `${GET_POOLS}_ERROR`: {
			return {...state, error: action.error, loading: false}
		}
		case `${GET_POOLS}_START`: {
			return {...state, error: null, loading: true, changes: {}, pools: []}
		}
		case `${GET_POOLS}_SUCCESS`: {
			return {...state, error: null, loading: false, pools: action.result || []}
		}
		case `${SAVE_POOL}_START`:
		case `${REMOVE_POOL}_START`: {
			const {changes} = state
			return {...state, error: null, saving: true, id: action.id || changes.id}
		}
		case `${SAVE_POOL}_ERROR`:
		case `${REMOVE_POOL}_ERROR`: {
			return {...state, id: null, error: action.error, saving: false, changes: {}}
		}
		case `${REMOVE_POOL}_SUCCESS`: {
			const {id, pools} = state
			const pool = pools.filter(b => b.id === id)[0]
			if (pool) {
				pools.splice(pools.indexOf(pool), 1)
			}
			return {...state, error: null, id: null, pools, saving: false}
		}
		case `${SAVE_POOL}_SUCCESS`: {
			const {id, pools, changes} = state
			const pool = pools.filter(b => b.id === id)[0]
			if (action.result && action.result.id) {
				action.result.isNew = true
				pools.unshift(action.result)
			} else {
				pools[pools.indexOf(pool)] = Object.assign({}, pool, changes)
			}
			return {...state, error: null, id: null, pools, changes: {}, saving: false}
		}
		case START_EDIT: {
			const {pools} = state
			const pool = pools.filter(b => b.id === action.id)[0]
			pool.forwardsString = (pool.forwards || []).join(', ')
			return {...state, changes: pool}
		}
		default: {
			return {...state}
		}
	}
}
