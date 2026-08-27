import { bootstrapApplication, NestedMap } from "../micro/index.js";
import { AppModule } from "./modules/index.js";

const application = bootstrapApplication(AppModule);
application.start()
