import {INCREMENT_VERSION} from '../actions/database';

export type databaseStateType = {
  +counter: number
};

type actionType = {
  +type: string
};

export default function database(state: number = 0, action: actionType) {
  switch (action.type) {
    case INCREMENT_VERSION:
      return state + 1;
    default:
      return state;
  }
}
