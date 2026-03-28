import { Route, Switch, Redirect } from 'wouter';
import RequestPage from './pages/Request';
import OperatorPage from './pages/Operator';
import AdminPage from './pages/Admin';

export default function App() {
  return (
    <Switch>
      <Route path="/request" component={RequestPage} />
      <Route path="/operator" component={OperatorPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/">
        <Redirect to="/request" />
      </Route>
    </Switch>
  );
}
