import React from 'react'
import {Route, Redirect} from 'react-router'
import {ConnectedRouter} from 'react-router-redux'
import {BandwidthThemeProvider, Navigation, Page, Spacing} from '@bandwidth/shared-components'

import {history} from '../store/createStore'
import {connect} from 'react-redux'

class App extends React.Component {
	render() {
		const links = []
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
							</Spacing>
						</Page>
					</div>
				</ConnectedRouter>
			</BandwidthThemeProvider>
		)
	}
}

export default connect()(App)
