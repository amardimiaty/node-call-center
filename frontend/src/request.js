import {history} from './store/createStore'

export default function request(action, path, method='GET', stateName='', options={}) {
	return async function(dispatch, getState) {
		dispatch({type: `${action}_START`})
		options.credentials = 'same-origin'
		if (stateName) {
			let state = getState()
			stateName.split('.').forEach(name => {
				const s = state[name]
				if (s) {
					state = s
				}
			})
			if (state) {
				options.body = JSON.stringify(state);
				options.headers = options.headers || {}
				options.headers['Content-Type'] = 'application/json'
			}
		}
		try {
			const r = await fetch(path, {method, ...options})
			dispatch({type: `${action}_SUCCESS`, result: await checkResponse(r)})
		} catch (err) {
			dispatch({type: `${action}_ERROR`, error: err.message})
			throw err
		}
	}
}

async function checkResponse(r) {
	if (r.status === 401) {
		location.href = '/login'
		return
	}
	if((r.headers.get('Content-Type') || '').indexOf('/json') >= 0) {
			const json = await r.json();
			if (json.error) {
					throw new Error(json.error);
			}
			return json;
	}
	if(!r.ok) {
			const message = await r.text();
			throw new Error(message || r.statusText);
	}
}
