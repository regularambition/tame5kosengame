import {setGlobalOptions} from "firebase-functions/v2";
import {BACKEND_REGION} from "./taskQueue";

setGlobalOptions({
  region: BACKEND_REGION,
  maxInstances: 10,
});
