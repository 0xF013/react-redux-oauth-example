import React, { Component, PropTypes } from 'react';
import { routeActions } from 'redux-simple-router';
import { connect } from 'react-redux';
import { checkStorage } from '../actions/auth';

@connect(
  state => ({ auth: state.auth })
)
export default class Restricted extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    children: PropTypes.element,

    location: PropTypes.shape({
      pathname: PropTypes
      .string,
    }).isRequired,

    auth: PropTypes.shape({
      isAuthorized: PropTypes.bool.isRequired,
    }).isRequired,
  };

  componentWillMount() {
    const { dispatch } = this.props;
    dispatch(checkStorage());
  }

  componentWillReceiveProps(props) {
    const { dispatch, auth: { isAuthorized } } = props;

    if (!isAuthorized) {
      dispatch(routeActions.push('/login'));
    }
  }

  render() {
    const { auth: { isAuthorized } } = this.props;
    if (!isAuthorized) {
      return null;
    }
    // ...
  }
}
