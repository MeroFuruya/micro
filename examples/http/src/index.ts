import { bootstrapApplication, setupApplicationSignals } from "@micro/core";
import { AppModule } from "./modules/index.js";

const application = bootstrapApplication(AppModule);
setupApplicationSignals(application);
application.start()



