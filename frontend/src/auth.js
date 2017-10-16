import {WebAuth} from 'auth0-js'
import {history} from './store/createStore'

export default class Auth {
	getAuth0() {
		return fetch('/auth0')
			.then(r => r.json())
			.then(data => {
				return new WebAuth({
					domain: data.domain,
					clientID: data.clientId,
					redirectUri: `${location.origin}${data.callbackPath}`,
					audience: `https://${data.domain}/userinfo`,
					responseType: 'token id_token',
					scope: 'openid profile'
				})
			})
	}

	login() {
		return this.getAuth0().then(a => a.authorize()).then(() => this.getProfile());
	}

	handleAuthentication() {
		return new Promise((resolve, reject) => {
			return this.getAuth0().then(a => a.parseHash((err, authResult) => {
				if (err) {
					return reject(err);
				}
				this.setSession(authResult)
				resolve(authResult)
			}))
		})
	}

	setSession(authResult) {
		const expiresAt = JSON.stringify((authResult.expiresIn * 1000) + new Date().getTime())
		localStorage.setItem('access_token', authResult.accessToken)
		localStorage.setItem('id_token', authResult.idToken)
		localStorage.setItem('expires_at', expiresAt)
		history.replace('/')
	}

	logout() {
		localStorage.removeItem('access_token')
		localStorage.removeItem('id_token')
		localStorage.removeItem('expires_at')
		history.replace('/')
	}

	isAuthenticated() {
		const expiresAt = JSON.parse(localStorage.getItem('expires_at'))
		return new Date().getTime() < expiresAt
	}

	getAccessToken() {
		const accessToken = localStorage.getItem('access_token');
		if (!accessToken) {
			throw new Error('No access token found');
		}
		return accessToken;
	}

	getProfile() {
		const accessToken = this.getAccessToken()
		return this.getAuth0().then(auth => {
			return new Promise((resolve, reject) => {
				auth.client.userInfo(accessToken, (err, profile) => {
					if (err) {
						return reject(err)
					}
					resolve(profile)
				})
			})
		})
	}
}
