import moment from 'moment'
import React from 'react'
import {connect} from 'react-redux'
import {push} from 'react-router-redux'

import {Spacing, Table, Button, Alert} from '@bandwidth/shared-components'
import {getCalls, getPool} from '../store/calls'

class Calls extends React.Component {
	columns = [
    {name: 'started', displayName: 'Started At'},
		{name: 'answered', displayName: 'Answered At'},
		{name: 'ended', displayName: 'Ended At'},
		{name: 'answeredBy', displayName: 'Answered By'},
		{name: 'duration', displayName: 'Duration'},
		{name: 'status', displayName: 'Status'}
	]

	componentWillMount() {
		if (this.props.poolId) {
			this.props.getPool(this.props.poolId)
		}
		this.props.getCalls(this.props.queryString, this.props.page)
	}

	renderRow(item) {
		return (<Table.Row key={item.id}>
			<Table.Cell>{moment(item.started).format('lll')}</Table.Cell>
			<Table.Cell>{moment(item.answered).format('lll')}</Table.Cell>
			<Table.Cell>{moment(item.ended).format('lll')}</Table.Cell>
			<Table.Cell>{item.answeredBy}</Table.Cell>
			<Table.Cell>{`wait ${item.holdingDuration}s / call ${item.callDuration}s`}</Table.Cell>
			<Table.Cell>{`${item.status[0].toupperCase()}${item.status.substr(1)}`}</Table.Cell>
		</Table.Row>)
	}

	render() {
		const {error, loading, calls, pool, agent, poolId, hasMoreCalls, reload} = this.props
		const renderRow = this.renderRow.bind(this)
		const loadMoreCalls = ev => {
			ev.preventDefault()
			ev.stopPropagation()
			if (hasMoreCalls) {
				return this.props.getCalls(this.props.queryString, this.props.page + 1)
			}
		}
		return (
			<Spacing>
				{error && <Alert type="error">{error}</Alert>}
				<h3>Calls</h3>
				{pool && <Alert type="info" className="clickable" onClick={reload({answeredBy: agent})}>Filtered calls for pool {pool.phoneNumber}</Alert>}
				{agent && <Alert type="info" className="clickable"  onClick={reload({pool: poolId})}>Filtered calls for agent {agent}</Alert>}
				<div className="messages">
				{calls.length > 0 ? (<Table.Simple items={calls} columns={this.columns} renderRow={renderRow} loading={loading}>
				</Table.Simple>) : (<p>No calls</p>)}
				{hasMoreCalls && <Spacing>
					<Button loading={loading} onClick={loadMoreCalls}>More</Button>
				</Spacing>}
				</div>
			</Spacing>
		)
	}
}

export default connect(
	state => {
		const calls = state.calls.calls || []
		const shownCalls = Array.prototype.concat.apply([], calls.map(c => c.calls))
		const lastCall = calls[calls.length - 1] || {}
		const queryString = (state.router.location.search || '?').substr(1)
		const query = {}
		queryString.split('&').map(v => {
			const values = v.split('=')
			return {name: values[0], value: decodeURIComponent(values[1])}
		}).forEach(v => {
			query[v.name] = v.value
		})
		return {
			calls: shownCalls,
			hasMoreCalls: (typeof lastCall.isLastPage === 'undefined') ? false : !lastCall.isLastPage,
			error: state.calls.error,
			loading: state.calls.loading,
			queryString,
			poolId: query.pool,
			agent: query.answeredBy,
			pool: state.calls.pool,
			page: lastCall.page && 1
		}
	},
	dispatch => ({
		getCalls: (queryString, page) => {
			page = page || 1
			if(queryString) {
				queryString = `${queryString}&page=${page}`
			} else {
				queryString = `page=${page}`
			}
			return dispatch(getCalls(queryString))
		},
		getPool: id => dispatch(getPool(id)),
		reload: query => {
			const queryString = Object.keys(query).filter(k => query[k]).map(k => `${k}=${query[k]}`).join('&')
			let path = '/pool-calls'
			if (queryString) {
				path = `${path}?${queryString}`
			}
			dispatch(push(path))
		}
	})
)(Calls)
