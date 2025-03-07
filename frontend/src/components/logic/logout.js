import { remove_user_and_jwt } from "./users";
import history from './history'


function Logout(){

    remove_user_and_jwt()
}

export default Logout