import StateOfAccount from "./components/StateOfAccount";
import { seedObligations } from "./model/seed";

export default function App() {
  return <StateOfAccount obligations={seedObligations} />;
}
