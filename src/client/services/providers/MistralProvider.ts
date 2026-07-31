import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider";

export class MistralProvider extends OpenAICompatibleProvider {
  constructor(name: string, baseUrl: string) {
    super(name, baseUrl);
  }
}
