import { bootstrapApplication, defineModule, inject } from "../micro/index.js";

class MyProvider {
  myFunc() {
    console.log("Heyyyya");
  }
}

class MyProvider2 {
  private readonly myProvider = inject(MyProvider)
  constructor() {
    this.myProvider.myFunc();
  }
}

const AppModule = defineModule({
  name: "AppModule",
  provide: [MyProvider2, MyProvider],
})

const application = bootstrapApplication(AppModule);
