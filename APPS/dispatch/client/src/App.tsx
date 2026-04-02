import { Route, Switch, Redirect } from 'wouter';
import RequestPage from './pages/Request';
import OperatorPage from './pages/Operator';
import AdminPage from './pages/Admin';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/request" component={RequestPage} />
      <Route path="/operator" component={OperatorPage} />
      <Route path="/admin" component={AdminPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
