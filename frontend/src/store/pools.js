import request from '../request'

export const GET_POOLS = 'PROFILE/GET_POOLS'
export const CREATE_POOL = 'PROFILE/CREATE_POOL'
export const UPDATE_POOL = 'PROFILE/UPDATE_POOL'
export const REMOVE_POOL = 'PROFILE/REMOVE_POOL'

export const SET_POOL_ID = 'POOLS/SET_POOL_ID'

export const CREATE_POOL_SET_AREA_CODE = 'POOLS/CREATE_POOL_SET_AREA_CODE'
export const CREATE_POOL_SET_FORWARDS = 'POOLS/CREATE_POOL_SET_FORWARDS'
export const CREATE_POOL_SET_GREETING = 'POOLS/CREATE_POOL_SET_GREETING'

export const UPDATE_POOL_SET_FORWARDS = 'POOLS/UPDATE_POOL_SET_FORWARDS'
export const UPDATE_POOL_SET_GREETING = 'POOLS/UPDATE_POOL_SET_GREETING'

export function getPools() {
	return (dispatch, getState) => dispatch(request(GET_POOLS, '/pools'))
}

export function createPool() {
	return (dispatch, getState) => dispatch(request(CREATE_POOL, '/pools', 'POST', 'pools.createPool'))
}

export function updatePool(id) {
	return (dispatch, getState) => dispatch(request(UPDATE_POOL, `/pools/${id}`, 'POST', 'pools.updatePool'))
}

export function removePool(id) {
	return (dispatch, getState) => dispatch(request(REMOVE_POOL, `/pools/${id}`, 'DELETE'))
}


export default (state = {}, action) => {
	switch (action.type) {
		case CREATE_POOL_SET_AREA_CODE: {
			const createPool = state.createPool || {};
			createPool.areaCode = action.areaCode;
			return {...state, createPool}
		}
		case CREATE_POOL_SET_GREETING: {
			const createPool = state.createPool || {};
			createPool.greeting = action.greeting;
			return {...state, createPool}
		}
		case CREATE_POOL_SET_FORWARDS: {
			const createPool = state.createPool || {};
			createPool.forwards = action.forwards.split(',').map(f => f.trim()).filter(f => f);
			return {...state, createPool}
		}
		case UPDATE_POOL_SET_GREETING: {
			const updatePool = state.updatePool || {};
			updatePool.greeting = action.greeting;
			return {...state, updatePool}
		}
		case UPDATE_POOL_SET_FORWARDS: {
			const updatePool = state.updatePool || {};
			updatePool.forwards = action.forwards.split(',').map(f => f.trim()).filter(f => f);
			return {...state, updatePool}
		}
		case `${CREATE_POOL}_ERROR`: {
			return {...state, error: action.error, creating: false}
		}
		case `${CREATE_POOL}_SUCCESS`: {
			const {pools} = state
			action.result.isNew = true
			pools.unshift(action.result)
			return {...state, error: null, creating: false, success: true, pools, createPool: {}}
		}
		case `${GET_POOLS}_ERROR`: {
			return {...state, error: action.error, loading: false}
		}
		case `${GET_POOLS}_START`: {
			return {...state, error: null, loading: true, createPool: {}, pools: []}
		}
		case `${GET_POOLS}_SUCCESS`: {
			return {...state, error: null, loading: false, pools: action.result || []}
		}
		case `${UPDATE_POOL}_START`:
		case `${REMOVE_POOL}_START`: {
			return {...state, error: null, updating: true}
		}
		case `${UPDATE_POOL}_ERROR`:
		case `${REMOVE_POOL}_ERROR`: {
			return {...state, id: null, error: action.error, updating: false}
		}
		case `${REMOVE_POOL}_SUCCESS`: {
			const {id, pools} = state
			const pool = pools.filter(b => b.id === id)[0]
			if (pool) {
				pools.splice(pools.indexOf(pool), 1)
			}
			return {...state, error: null, id: null, pools, updating: false}
		}
		case `${UPDATE_POOL}_SUCCESS`: {
			const {id, pools, updatePool} = state
			const pool = pools.filter(b => b.id === id)[0]
			if (pool) {
				pools[pools.indexOf(pool)] = Object.assign({}, pool, updatePool)
			}
			return {...state, error: null, id: null, pools, updatePool: {}, updating: false}
		}
		case SET_POOL_ID: {
			return {...state, id: action.id}
		}
		default: {
			return {...state}
		}
	}
}
