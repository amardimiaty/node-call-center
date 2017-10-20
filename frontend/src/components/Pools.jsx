import React from 'react'
import {connect} from 'react-redux'
import {push} from 'react-router-redux'

import {Spacing, Table, Button, Form, FormBox, TextField, SubmitButton, Alert} from '@bandwidth/shared-components'
import {getPools, savePool, removePool, START_EDIT, SET_AREA_CODE, SET_FORWARDS, SET_GREETING} from '../store/pools'

class Pools extends React.Component {
	columns = [
    {name: 'phoneNumber', displayName: 'Number'},
		{name: 'forwards', displayName: 'Agent Numbers'},
		{name: 'greeting', displayName: 'Greeting'},
		{name: 'actions', displayName: ''}
	]

	componentWillMount() {
		this.props.getPools()
	}

	renderRow(item) {
		return (<Table.Row key={item.id}>
			<Table.Cell>{item.phoneNumber}</Table.Cell>
			<Table.Cell>{(item.forwards || []).join(', ')}</Table.Cell>
			<Table.Cell>{item.greeting || '(default)'}</Table.Cell>
			<Table.Cell><Button onClick={ev => this.props.startEdit(ev, item.id)}>Edit</Button><Button onClick={ev => this.props.removePool(ev, item.id)}>Remove</Button><Button className="messages-button" onClick={ev => this.props.showCalls(ev, item.id)}>Calls</Button></Table.Cell>
		</Table.Row>)
	}

	render() {
		const {error, loading, saving, changes, pools, savePool, setAreaCode, setForwards, setGreeting} = this.props
		const renderRow = this.renderRow.bind(this)
		const isNewPool = !changes.id
		const areaCodeInput = {
			value: changes.areaCode || '',
			onChange: ev => setAreaCode(ev.target.value)
		}
		const forwardsInput = {
			value: changes.forwardsString || '',
			onChange: ev => setForwards(ev.target.value)
		}
		const greetingInput = {
			value: changes.greeting || '',
			onChange: ev => setGreeting(ev.target.value)
		}
		return (
			<Spacing>
				{error && <Alert type="error">{error}</Alert>}
				<FormBox>
					<Form onSubmit={ev => savePool(ev)}>
						{isNewPool && (<TextField
							label="Area code"
							name="areaCode"
							input={areaCodeInput}
							helpText="Area code of phone number to reserve. All calls to this number will be redirected to agents."
							required
						/>)}
						<TextField
							label="Agents phone numbers"
							name="forwards"
							input={forwardsInput}
							helpText="Agents phone numbers to forward calls (comma separated)"
							required
						/>
						<TextField
							label="Greeting"
							name="greeting"
							input={greetingInput}
							helpText="Greeting message to caller. If empty default message will be used."
						/>
						<div className="submit-button">
							<SubmitButton loading={saving}>{isNewPool ? "Create Pool" : "Save"}</SubmitButton>
						</div>
					</Form>
				</FormBox>
				<Spacing/>
				<Table.Simple items={pools} columns={this.columns} renderRow={renderRow} loading={loading}>
				</Table.Simple>
			</Spacing>
		)
	}
}

export default connect(
	state => ({
		pools: state.pools.pools || [],
		changes: state.pools.changes || {},
		error: state.pools.error,
		loading: state.pools.loading,
		saving: state.pools.saving
	}),
	dispatch => ({
		savePool: ev => {
			ev.preventDefault()
			ev.stopPropagation()
			dispatch(savePool())
		},
		removePool: (ev, id) => {
			ev.preventDefault()
			ev.stopPropagation()
			if (window.confirm('Are you sure?')) {
				dispatch(removePool(id))
			}
		},
		setAreaCode: areaCode => {
			dispatch({type: SET_AREA_CODE, areaCode})
		},
		setGreeting: greeting => {
			dispatch({type: SET_GREETING, greeting})
		},
		setForwards: forwards => {
			dispatch({type: SET_FORWARDS, forwards})
		},
		getPools: () => dispatch(getPools()),
		showCalls: (ev, id) => {
			dispatch(push(`/pool-calls?pool=${id}`))
			ev.preventDefault()
		},
		startEdit: (ev, id) => {
			ev.preventDefault()
			ev.stopPropagation()
			dispatch({type: START_EDIT, id})
		}
	})
)(Pools)
