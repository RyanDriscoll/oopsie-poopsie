import { CSSTransitionGroup } from "react-transition-group";
import { Spinner } from "reactstrap";

export default ({ loading }) => {
  return loading ? (
    <div className="spinner-container">
      <Spinner className="spinner" style={{ width: "3rem", height: "3rem" }} />
    </div>
  ) : null;
};
