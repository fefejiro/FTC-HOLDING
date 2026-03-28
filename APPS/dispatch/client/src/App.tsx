import { Route, Switch, Redirect } from 'wouter';
import RequestPage from './pages/Request';
import OperatorPage from './pages/Operator';
import AdminPage from './pages/Admin';
import HomePage from './pages/Home';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/request" component={RequestPage} />
      <Route path="/operator" component={OperatorPage} />
      <Route path="/admin" component={AdminPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
