import moment from 'moment'
import React from 'react'
import {connect} from 'react-redux'
import {push} from 'react-router-redux'

import {Spacing, Table, Button, Alert} from '@bandwidth/shared-components'
import {getCalls, getPool, CLEAR_POOL} from '../store/calls'

function getQueryString(search) {
	return (search || '?').substr(1)
}

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
		const reloadData = queryString => {
			this.props.getCalls(getQueryString(queryString), 1)
		}
		this.props.history.listen(location => {
			if (location.pathname === '/pool-calls'){
				reloadData(location.search)
			}
		})
		reloadData(this.props.location.search)
	}

	renderRow(item) {
		return (<Table.Row key={item.id}>
			<Table.Cell>{moment(item.started).format('lll')}</Table.Cell>
			<Table.Cell>{moment(item.answered).format('lll')}</Table.Cell>
			<Table.Cell>{moment(item.ended).format('lll')}</Table.Cell>
			<Table.Cell>{item.answeredBy}</Table.Cell>
			<Table.Cell>{`wait ${item.holdingDuration}s / call ${item.callDuration}s`}</Table.Cell>
			<Table.Cell>{`${(item.status || '')[0].toUpperCase()}${(item.status || '').substr(1)}`}</Table.Cell>
		</Table.Row>)
	}

	render() {
		const {error, loading, calls, pool, agent, poolId, hasMoreCalls, reload} = this.props
		const renderRow = this.renderRow.bind(this)
		const loadMoreCalls = ev => {
			ev.preventDefault()
			ev.stopPropagation()
			if (hasMoreCalls) {
				const query = (this.props.queryString || '').replace(/&page=\d+/, '').replace(/page=\d+/, '')
				return this.props.getCalls(query, this.props.page + 1)
			}
		}
		return (
			<Spacing>
				{error && <Alert type="error">{error}</Alert>}
				<h3>Calls</h3>
				{pool && <Alert type="info" className="clickable" onClick={() => reload({answeredBy: agent})}>Filtered calls for pool {pool.phoneNumber}</Alert>}
				{agent && <Alert type="info" className="clickable"  onClick={() => reload({pool: poolId})}>Filtered calls for agent {agent}</Alert>}
				<div className="messages">
				{calls.length > 0 ? (<Table.Simple items={calls} columns={this.columns} renderRow={renderRow} loading={loading}>
				</Table.Simple>) : (loading ? (null) : (<p>No calls</p>))}
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
		const queryString = getQueryString(state.router.location.search)
		const query = {}
		queryString.split('&').map(v => {
			const values = v.split('=')
			return {name: values[0], value: decodeURIComponent(values[1])}
		}).filter(v => v.name).forEach(v => {
			query[v.name] = v.value
		})
		return {
			calls: shownCalls,
			hasMoreCalls: (typeof lastCall.isLastPage === 'undefined') ? false : !lastCall.isLastPage,
			error: state.calls.error,
			loading: state.calls.loading,
			poolId: query.pool,
			agent: query.answeredBy,
			pool: state.calls.pool,
			page: lastCall.page || 1,
			queryString
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
			const m = /pool=(\w+)/gi.exec(queryString)
			if(m) {
				dispatch(getPool(m[1]))
			}
			return dispatch(getCalls(queryString))
		},
		reload: query => {
			const queryString = Object.keys(query).filter(k => query[k]).map(k => `${k}=${query[k]}`).join('&')
			let path = '/pool-calls'
			if (queryString) {
				path = `${path}?${queryString}`
			}
			dispatch({type: CLEAR_POOL})
			dispatch(push(path))
		}
	})
)(Calls)
