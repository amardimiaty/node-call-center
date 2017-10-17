import React from 'react'
import {Route, Redirect} from 'react-router'
import {ConnectedRouter} from 'react-router-redux'
import {BandwidthThemeProvider, Navigation, Page, Spacing} from '@bandwidth/shared-components'

import {history} from '../store/createStore'
import {connect} from 'react-redux'

import {login, logout} from '../store/auth'

import Auth from '../auth'

class Auth0Callback extends React.Component {
	render() {
		const auth = new Auth()
		auth.handleAuthentication();
		return <div>Wait ...</div>
	}
}

class App extends React.Component {
	render() {
		const auth = new Auth()
		const links = []
		links.push({to: '#', content: 'Logout', onClick: ev => {
			this.props.logout()
			ev.preventDefault()
		}})
		return (
			<BandwidthThemeProvider>
				<ConnectedRouter history={history}>
					<div>
						<Navigation
								title="Call center"
								links={links}
							/>
						<Page>
							<Spacing>
							<Route path="/auth0/callback" component={Auth0Callback}/>
							</Spacing>
						</Page>
					</div>
				</ConnectedRouter>
			</BandwidthThemeProvider>
		)
	}
}

export default connect(
	state => ({
		router: state.router
	}),
	dispatch => ({
		login: () => dispatch(login()),
		logout: () => dispatch(logout())
	})
)(App)
