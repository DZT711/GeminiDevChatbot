import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class CerebrasProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }
}
