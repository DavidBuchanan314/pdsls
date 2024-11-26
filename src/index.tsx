/* @refresh reload */
import { render } from "solid-js/web";
import "virtual:uno.css";
import "./styles/tailwind-compat.css";
import "./styles/index.css";
import { Route, Router } from "@solidjs/router";
import { Layout, Home } from "./main.tsx";
import { Login } from "./components/login.tsx";
import { PdsView } from "./views/pds.tsx";
import { RepoView } from "./views/repo.tsx";
import { CollectionView } from "./views/collection.tsx";
import { RecordView } from "./views/record.tsx";

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/:pds" component={PdsView} />
      <Route path="/:pds/:repo" component={RepoView} />
      <Route path="/:pds/:repo/:collection" component={CollectionView} />
      <Route path="/:pds/:repo/:collection/:rkey" component={RecordView} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);
