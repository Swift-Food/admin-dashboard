import axios from "axios";
import { BASE_URL } from "../constants";

axios.defaults.baseURL = BASE_URL;

export default {
    get: axios.get,
    post: axios.post,
    put: axios.put,
    delete: axios.delete,
    patch: axios.patch
}