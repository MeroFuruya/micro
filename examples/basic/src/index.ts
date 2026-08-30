import { bootstrapApplication, NestedMap } from "@micro/core";
import { AppModule } from "./modules/index.js";

const application = bootstrapApplication(AppModule);
application.start()
